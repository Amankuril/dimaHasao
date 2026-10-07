import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect } from 'expo-router';
import { Calendar, CheckCircle2, Clock, Home, Info, List, MapPin, UtensilsCrossed, Users } from 'lucide-react-native';
import { diningAPI } from '../../api/food';
import Image from '../../components/Img';
import { events } from '../../lib/events';
import { toast } from '../../lib/notify';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { Button, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { formatBookingAddress, formatShortDate, useNavClearance } from '../components/dining/TableShared';

const CONFIRMED_STATUSES = ['accepted', 'confirmed'];
const FINAL_STATUSES = ['accepted', 'confirmed', 'cancelled', 'rejected'];
const CONFETTI = [color.primary, color.info, color.goldBright, color.success, color.primaryDeep, color.gold];

/** canvas-confetti's 3 s burst from both upper corners, as falling pieces. */
function ConfettiPiece({ index, width, height }) {
  const v = useAnimatedValue(0);
  // Deterministic scatter (render must stay pure).
  const cfg = useMemo(() => {
    const r = (n) => Math.abs(Math.sin((index + 1) * 12.9898 + n * 78.233) * 43758.5453) % 1;
    const left = index % 2 === 0 ? width * (0.1 + r(1) * 0.2) : width * (0.7 + r(1) * 0.2);
    return { left, color: CONFETTI[index % CONFETTI.length], delay: r(2) * 1500, spin: r(3) * 360, drift: (r(4) - 0.5) * 160 };
  }, [index, width]);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 1500, delay: cfg.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [v, cfg]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: cfg.left, top: 0, width: 8, height: 8, borderRadius: 2, backgroundColor: cfg.color,
        opacity: v.interpolate({ inputRange: [0, 0.01, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.drift] }) },
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-20, height * 0.55] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${cfg.spin}deg`, `${cfg.spin + 360}deg`] }) },
        ],
      }}
    />
  );
}

function FadeUp({ delay, y = 20, children, style }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }]}>{children}</Animated.View>;
}

function Pop({ children, style }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(v, { toValue: 1, stiffness: 200, damping: 18, mass: 1, useNativeDriver: true }).start();
  }, [v]);
  return <Animated.View style={[style, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>{children}</Animated.View>;
}

function Info2({ label, children }) {
  return (
    <View style={{ width: '50%', gap: space.xs, paddingVertical: space.sm, paddingRight: space.sm }}>
      <Text style={styles.cellLabel}>{label}</Text>
      {children}
    </View>
  );
}

export default function TableBookingSuccess() {
  const location = useLocation();
  const { width, height } = useWindowDimensions();
  const clearance = useNavClearance();
  const { booking } = location.state || {};
  const [liveStatus, setLiveStatus] = useState(booking?.status || 'pending');
  const prevStatusRef = useRef(booking?.status || 'pending');

  // Poll for live status updates
  useEffect(() => {
    if (!booking?._id || FINAL_STATUSES.includes(liveStatus)) return undefined;
    const fetchStatus = async () => {
      try {
        const res = await diningAPI.getBookings();
        if (res?.data?.success) {
          const all = Array.isArray(res.data.data) ? res.data.data : [];
          const found = all.find((b) => String(b._id) === String(booking._id) || String(b.bookingId) === String(booking.bookingId));
          const newStatus = found?.status;
          if (newStatus && newStatus !== prevStatusRef.current) {
            prevStatusRef.current = newStatus;
            setLiveStatus(newStatus);
            if (CONFIRMED_STATUSES.includes(newStatus)) toast.success('Your booking has been confirmed! 🎉');
            else if (newStatus === 'cancelled' || newStatus === 'rejected') toast.error('Your booking was not accepted.');
          }
        }
      } catch {
        // next poll retries
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    const off = events.on('diningBookingStatusUpdate', (e) => {
      const { bookingId, status } = e.detail || {};
      if (bookingId && String(bookingId) === String(booking._id) && status) {
        prevStatusRef.current = status;
        setLiveStatus(status);
      }
    });
    const sub = AppState.addEventListener('change', (s) => s === 'active' && fetchStatus());
    return () => {
      clearInterval(interval);
      off();
      sub.remove();
    };
  }, [booking?._id, booking?.bookingId, liveStatus]);

  const isConfirmed = CONFIRMED_STATUSES.includes(liveStatus);
  const isPending = liveStatus === 'pending';

  // Confetti once, when the page opens already confirmed (web: effect with [] deps).
  const [confettiOn] = useState(isConfirmed);
  const [pieces, setPieces] = useState(0);
  useEffect(() => {
    if (!confettiOn) return undefined;
    let n = 0;
    const t = setInterval(() => {
      n += 6;
      setPieces(n);
      if (n >= 72) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, [confettiOn]);

  if (!booking) return <Redirect href="/food/user/dining" />;

  const formattedDate = formatShortDate(booking.date, true);
  const restaurantImage = booking.restaurant?.image || booking.restaurant?.profileImage?.url || '';
  const statusLabel = isPending ? 'Pending' : isConfirmed ? 'Confirmed' : liveStatus.charAt(0).toUpperCase() + liveStatus.slice(1);
  const statusTone = isPending ? 'warning' : isConfirmed ? 'info' : 'danger';

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.xxl + clearance }]} showsVerticalScrollIndicator={false}>
        <Pop key={liveStatus} style={[styles.statusIcon, { backgroundColor: isPending ? color.warningSoft : color.successSoft }]}>
          {isPending ? <Clock size={44} color={color.warning} /> : <CheckCircle2 size={44} color={color.success} />}
        </Pop>

        <FadeUp delay={200} style={{ alignItems: 'center', gap: space.sm, marginBottom: space.xxl, width: '100%', maxWidth: 384 }}>
          <Text style={styles.h1} accessibilityRole="header">
            {isPending ? 'Booking requested!' : 'Seat confirmed!'}
          </Text>
          <Text style={styles.tag}>{isPending ? 'Waiting for restaurant approval' : 'Your table is ready for you'}</Text>
          <View style={styles.idPill}>
            <Text style={styles.idText} selectable>
              Booking ID: {booking.bookingId}
            </Text>
          </View>
          {isPending ? (
            <View style={styles.pending} accessibilityLiveRegion="polite">
              <Info size={20} color={color.warning} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.pendingTitle}>Waiting for confirmation</Text>
                <Text style={styles.pendingBody}>The restaurant will review and approve your request shortly. You&apos;ll be notified of the status.</Text>
              </View>
            </View>
          ) : null}
        </FadeUp>

        <FadeUp delay={400} y={30} style={styles.ticket}>
          <View style={{ padding: space.xl, gap: space.lg }}>
            <View style={[styles.cutout, { left: -12 }]} />
            <View style={[styles.cutout, { right: -12 }]} />
            <View style={[styles.row, { gap: space.md }]}>
              <View style={styles.thumb}>
                {restaurantImage ? (
                  <Image source={{ uri: restaurantImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <UtensilsCrossed size={24} color={color.textDisabled} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rName} numberOfLines={2}>
                  {booking.restaurant?.name || 'The Great Indian Restaurant'}
                </Text>
                <View style={[styles.row, { gap: space.xs, marginTop: space.xxs, alignItems: 'flex-start' }]}>
                  <MapPin size={14} color={color.textMuted} style={{ marginTop: 2 }} />
                  <Text style={styles.rAddr} numberOfLines={2}>
                    {formatBookingAddress(booking.restaurant?.location)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.grid}>
              <Info2 label="Date">
                <View style={[styles.row, { gap: space.sm }]}>
                  <Calendar size={16} color={color.primary} />
                  <Text style={styles.cellVal}>{formattedDate}</Text>
                </View>
              </Info2>
              <Info2 label="Time">
                <View style={[styles.row, { gap: space.sm }]}>
                  <Clock size={16} color={color.primary} />
                  <Text style={styles.cellVal}>{booking.timeSlot}</Text>
                </View>
              </Info2>
              <Info2 label="Guests">
                <View style={[styles.row, { gap: space.sm }]}>
                  <Users size={16} color={color.primary} />
                  <Text style={styles.cellVal}>{booking.guests} People</Text>
                </View>
              </Info2>
              <Info2 label="Status">
                <StatusBadge label={statusLabel} tone={statusTone} />
              </Info2>
            </View>
          </View>
        </FadeUp>

        <FadeUp delay={600} y={0} style={{ marginTop: space.xxl, width: '100%', maxWidth: 384, gap: space.md }}>
          <Button title="View my bookings" icon={List} size="lg" onPress={() => navigateTo('/food/user/bookings')} />
          <Button title="Go to home" icon={Home} variant="outline" size="lg" onPress={() => navigateTo('/food/user')} />
          <Text style={styles.foot}>Show this ticket at the restaurant for a smooth entry</Text>
        </FadeUp>
      </ScrollView>

      {confettiOn ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: pieces }, (_, i) => (
            <ConfettiPiece key={i} index={i} width={width} height={height} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl },
  h1: { ...type.heroSerif, color: color.primary, textAlign: 'center' },
  tag: { ...type.tagline, color: color.textSecondary, textAlign: 'center' },
  idPill: { marginTop: space.xs, paddingHorizontal: space.lg, paddingVertical: space.xs + 2, borderRadius: radii.pill, backgroundColor: color.goldSoft, borderWidth: 1, borderColor: color.border },
  idText: { ...type.label, color: color.goldText },
  pending: { marginTop: space.lg, width: '100%', flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radii.lg, backgroundColor: color.warningSoft },
  pendingTitle: { ...type.bodyStrong, color: color.warning },
  pendingBody: { marginTop: space.xxs, ...type.small, color: color.textSecondary },
  ticket: { width: '100%', maxWidth: 384, overflow: 'hidden', backgroundColor: color.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: color.border, ...elevation.float },
  cutout: { position: 'absolute', top: '50%', marginTop: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: color.bg, borderWidth: 1, borderColor: color.border },
  thumb: { width: 64, height: 64, borderRadius: radii.md, backgroundColor: color.surfaceMuted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  rName: { ...type.subheading, color: color.text },
  rAddr: { flex: 1, ...type.small, color: color.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: space.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.borderStrong, borderStyle: 'dashed' },
  cellLabel: { ...type.overline, color: color.textMuted },
  cellVal: { flexShrink: 1, ...type.bodyStrong, color: color.text },
  foot: { textAlign: 'center', ...type.caption, color: color.textMuted, marginTop: space.sm },
});
