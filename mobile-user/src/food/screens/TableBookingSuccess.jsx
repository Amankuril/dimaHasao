import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect } from 'expo-router';
import { Calendar, CheckCircle2, Clock, Home, Info, List, MapPin, Users } from 'lucide-react-native';
import { diningAPI } from '../../api/food';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { events } from '../../lib/events';
import { toast } from '../../lib/notify';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import { F } from '../components/shell';
import { formatBookingAddress, formatShortDate, useNavClearance } from '../components/dining/TableShared';

const CONFIRMED_STATUSES = ['accepted', 'confirmed'];
const FINAL_STATUSES = ['accepted', 'confirmed', 'cancelled', 'rejected'];
const CONFETTI = ['#0a4d2b', '#3b82f6', '#f59e0b', '#0f6b3f', '#06381e', '#ec4899'];

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
    <View style={{ width: '50%', gap: 4, paddingVertical: 8, paddingRight: 8 }}>
      <Text style={styles.cellLabel}>{label.toUpperCase()}</Text>
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
  const statusBg = isPending ? tw.amber500 : isConfirmed ? tw.emerald500 : tw.red500;

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 96 + clearance }]} showsVerticalScrollIndicator={false}>
        <Pop key={liveStatus} style={[styles.statusIcon, { backgroundColor: isPending ? tw.amber50 : F.cream }]}>
          {isPending ? <Clock size={48} color={tw.amber500} /> : <CheckCircle2 size={48} color={tw.green500} />}
        </Pop>

        <FadeUp delay={200} style={{ alignItems: 'center', gap: 8, marginBottom: 40 }}>
          <Text style={styles.h1}>{isPending ? 'Booking Requested!' : 'Seat Confirmed!'}</Text>
          <Text style={styles.tag}>{isPending ? 'Waiting for restaurant approval' : 'Your table is ready for you'}</Text>
          <View style={{ paddingTop: 8 }}>
            <Text style={styles.idPill}>BOOKING ID: {booking.bookingId}</Text>
          </View>
          {isPending ? (
            <View style={styles.pending}>
              <View style={styles.pendingIcon}>
                <Info size={16} color={tw.amber600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Waiting for Confirmation</Text>
                <Text style={styles.pendingBody}>The restaurant will review and approve your request shortly. You&apos;ll be notified of the status.</Text>
              </View>
            </View>
          ) : null}
        </FadeUp>

        <FadeUp delay={400} y={30} style={styles.ticket}>
          <View style={{ padding: 24, gap: 24 }}>
            <View style={[styles.cutout, { left: -12 }]} />
            <View style={[styles.cutout, { right: -12 }]} />
            <View style={[styles.row, { gap: 16 }]}>
              <View style={styles.thumb}>
                <Image source={{ uri: restaurantImage }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rName} numberOfLines={1}>
                  {booking.restaurant?.name || 'The Great Indian Restaurant'}
                </Text>
                <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
                  <MapPin size={12} color={tw.gray400} />
                  <Text style={styles.rAddr} numberOfLines={1}>
                    {formatBookingAddress(booking.restaurant?.location)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.grid}>
              <Info2 label="Date">
                <View style={[styles.row, { gap: 8 }]}>
                  <Calendar size={16} color={tw.red500} />
                  <Text style={styles.cellVal}>{formattedDate}</Text>
                </View>
              </Info2>
              <Info2 label="Time">
                <View style={[styles.row, { gap: 8 }]}>
                  <Clock size={16} color={tw.red500} />
                  <Text style={styles.cellVal}>{booking.timeSlot}</Text>
                </View>
              </Info2>
              <Info2 label="Guests">
                <View style={[styles.row, { gap: 8 }]}>
                  <Users size={16} color={tw.red500} />
                  <Text style={styles.cellVal}>{booking.guests} People</Text>
                </View>
              </Info2>
              <Info2 label="Status">
                <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                  <Text style={styles.statusText}>{isPending ? 'PENDING' : isConfirmed ? 'CONFIRMED' : liveStatus.toUpperCase()}</Text>
                </View>
              </Info2>
            </View>
          </View>
        </FadeUp>

        <FadeUp delay={600} y={0} style={{ marginTop: 48, width: '100%', maxWidth: 384, gap: 12 }}>
          <Press scale={0.98} onPress={() => navigateTo('/food/user/bookings')} style={[styles.btn, { backgroundColor: tw.red500 }, shadow('0 20px 25px -5px #FFE2E2, 0 8px 10px -6px #FFE2E2')]}>
            <List size={20} color="#fff" />
            <Text style={styles.btnText}>View My Bookings</Text>
          </Press>
          <Press scale={0.98} onPress={() => navigateTo('/food/user')} style={[styles.btn, { backgroundColor: '#fff', borderWidth: 2, borderColor: tw.slate100 }]}>
            <Home size={20} color={tw.slate600} />
            <Text style={[styles.btnText, { color: tw.slate600 }]}>Go to Home</Text>
          </Press>
          <Text style={styles.foot}>SHOW THIS TICKET AT THE RESTAURANT FOR A SMOOTH ENTRY</Text>
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
  page: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  row: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  h1: { fontSize: 30, lineHeight: 36, color: tw.gray900, textAlign: 'center', ...poppins(900) },
  tag: { fontSize: 16, lineHeight: 24, color: tw.gray500, fontStyle: 'italic', letterSpacing: 0.4, textAlign: 'center', ...poppins(500) },
  idPill: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999, backgroundColor: F.cream, borderWidth: 1, borderColor: 'rgba(10,77,43,0.2)', overflow: 'hidden', fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: F.green, ...poppins(700) },
  pending: { marginTop: 24, maxWidth: 320, flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, backgroundColor: tw.amber50, borderWidth: 1, borderColor: tw.amber100, ...shadow('0 1px 3px rgba(254,243,198,0.5)') },
  pendingIcon: { alignSelf: 'flex-start', padding: 8, borderRadius: 12, backgroundColor: tw.amber100 },
  pendingTitle: { fontSize: 12, lineHeight: 16, color: tw.amber900, ...poppins(700) },
  pendingBody: { marginTop: 4, fontSize: 10, lineHeight: 16.25, color: tw.amber700, ...poppins(400) },
  ticket: { width: '100%', maxWidth: 384, overflow: 'hidden', backgroundColor: tw.slate50, borderRadius: 24, borderWidth: 1, borderColor: tw.slate100, ...shadow('0 20px 25px -5px #E2E8F0, 0 8px 10px -6px #E2E8F0') },
  cutout: { position: 'absolute', top: '50%', marginTop: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100 },
  thumb: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, padding: 4 },
  rName: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(900) },
  rAddr: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(400) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: tw.slate200, borderStyle: 'dashed' },
  cellLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, ...poppins(700) },
  cellVal: { fontSize: 16, lineHeight: 24, color: tw.gray800, ...poppins(700) },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: '#fff', ...poppins(900) },
  btn: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: 18, lineHeight: 28, color: '#fff', ...poppins(700) },
  foot: { textAlign: 'center', fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate300, marginTop: 8, ...poppins(700) },
});
