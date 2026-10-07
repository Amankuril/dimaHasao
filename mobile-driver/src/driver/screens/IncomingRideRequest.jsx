import { useEffect, useState } from 'react';
import { Animated, Dimensions, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banknote, Bike, Clock, CreditCard, Navigation, Package, Phone, Route, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { alpha, outfit, playfair, shadow } from '../../theme';
import { DT } from '../ui/dt';
import { CtaButton } from '../ui/Surface';
import { getScheduledRideCountdown } from '../utils/scheduledRideTime';
import { formatScheduledDateTime } from '../utils/driverRideJobs';

/*
 * Web: Taxi/modules/driver/pages/IncomingRideRequest.jsx (a modal used by DriverHome, the ride-request listener and the
 * scheduled-ride preview). Same props, timer logic and copy; framer-motion intro -> Animated, conic timer ring -> SVG ring.
 */
const DEFAULT_ACCEPT_REJECT_SECONDS = 15;

const normalizePayment = (value = '') => String(value || 'cash').toUpperCase();

const getRequestExpiryTime = (data, requestDurationSeconds) => {
  const safeData = data || {};
  const rawExpiryTime = safeData.requestExpiresAt || safeData.raw?.requestExpiresAt;
  const expiryTimestamp = rawExpiryTime ? new Date(rawExpiryTime).getTime() : NaN;
  if (Number.isFinite(expiryTimestamp) && expiryTimestamp > Date.now()) return expiryTimestamp;
  return Date.now() + requestDurationSeconds * 1000;
};

const getRequestDurationSeconds = (data) => {
  const safeData = data || {};
  const rawDuration = safeData.acceptRejectDurationSeconds
    || safeData.expiresInSeconds
    || safeData.raw?.acceptRejectDurationSeconds
    || safeData.raw?.expiresInSeconds;
  const duration = Number(rawDuration);
  return Number.isFinite(duration) && duration > 0 ? Math.ceil(duration) : DEFAULT_ACCEPT_REJECT_SECONDS;
};

/** `animate-pulse` */
function PulseDot({ style }) {
  const v = useAnimatedValue(1);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[style, { opacity: v }]} />;
}

/** The card's intro: backdrop fade, card rises 80px from scale .96 (spring). */
function Entrance({ children }) {
  // Android is edge-to-edge: keep the card clear of the gesture / navigation bar.
  const insets = useSafeAreaInsets();
  const fade = useAnimatedValue(0);
  const rise = useAnimatedValue(80);
  const scale = useAnimatedValue(0.96);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(rise, { toValue: 0, stiffness: 360, damping: 34, mass: 1, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, stiffness: 360, damping: 34, mass: 1, useNativeDriver: true }),
    ]).start();
  }, [fade, rise, scale]);
  return (
    <Animated.View style={[styles.backdrop, { opacity: fade, paddingBottom: 16 + insets.bottom }]}>
      <Animated.View style={[styles.card, { transform: [{ translateY: rise }, { scale }] }]}>{children}</Animated.View>
    </Animated.View>
  );
}

function TimerRing({ progress, color, timer }) {
  const r = 28.5;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.ringWrap}>
      <Svg width={62} height={62} style={StyleSheet.absoluteFill}>
        <Circle cx={31} cy={31} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={5} fill="none" />
        <Circle
          cx={31}
          cy={31}
          r={r}
          stroke={color}
          strokeWidth={5}
          fill="none"
          strokeDasharray={`${(c * progress) / 100} ${c}`}
          transform="rotate(-90 31 31)"
        />
      </Svg>
      <View style={styles.ringInner}>
        <Text style={[outfit(900), styles.ringNumber]}>{timer}</Text>
        <Text style={[outfit(900), styles.ringSec]}>SEC</Text>
      </View>
    </View>
  );
}

const IncomingRideRequest = ({
  visible,
  onAccept,
  onDecline,
  onSubmitBid,
  onClose,
  requestData,
  isAccepting = false,
  onPreviewCancel,
  isPreviewCancelling = false,
  canPreviewCancel = true,
  previewCancelDisabledLabel = 'Cancel unavailable',
  mode = 'live',
}) => {
  const isPreviewMode = mode === 'preview';
  const requestDurationSeconds = getRequestDurationSeconds(requestData);
  const [timer, setTimer] = useState(requestDurationSeconds);
  const [previewNow, setPreviewNow] = useState(() => Date.now());
  const data = requestData;

  useEffect(() => {
    if (isPreviewMode || !visible || !data?.rideId) return undefined;

    const expiresAt = getRequestExpiryTime(data, requestDurationSeconds);
    let hasExpired = false;

    const syncTimer = () => {
      const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setTimer(remainingSeconds);
      if (!hasExpired && remainingSeconds <= 0) {
        hasExpired = true;
        onDecline();
      }
    };

    syncTimer();
    const interval = setInterval(syncTimer, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, onDecline, requestDurationSeconds, data?.rideId, data?.requestExpiresAt, isPreviewMode]);

  useEffect(() => {
    if (!visible || !isPreviewMode) return undefined;
    setPreviewNow(Date.now());
    const interval = setInterval(() => setPreviewNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [visible, isPreviewMode]);

  if (!visible || !data) return null;

  const isParcel = data.type === 'parcel';
  const isIntercity = data.type === 'intercity';
  const scheduledAt = data.scheduledAt || data.raw?.scheduledAt || data.raw?.ride?.scheduledAt || null;
  const isScheduledRequest = Boolean(scheduledAt);
  const title = isPreviewMode
    ? (isParcel ? 'Scheduled delivery' : isIntercity ? 'Scheduled intercity trip' : 'Scheduled ride')
    : (isScheduledRequest
      ? (isParcel ? 'Scheduled delivery request' : isIntercity ? 'Scheduled intercity request' : 'Scheduled ride request')
      : (isParcel ? 'New delivery request' : isIntercity ? 'New intercity request' : 'New ride request'));
  const intercityRoute = [data.raw?.intercity?.fromCity, data.raw?.intercity?.toCity].filter(Boolean).join(' to ');
  const category = data.raw?.parcel?.category || data.raw?.parcel?.weight || (isParcel ? 'Parcel delivery' : isIntercity ? intercityRoute || 'Intercity trip' : 'Passenger ride');
  const payment = normalizePayment(data.payment);
  const timerProgress = Math.max(0, Math.min(100, (timer / requestDurationSeconds) * 100));
  const pickupAddress = data.raw?.pickupAddress || data.pickup || 'Pickup point';
  const dropAddress = data.raw?.dropAddress || data.drop || 'Drop point';
  const attemptCount = Number(data.attempt || data.raw?.attempt || 1);
  const maxAttempts = Number(data.maxAttempts || data.raw?.maxAttempts || 1);
  const searchRadiusMeters = Number(data.raw?.radius || data.radius || 0);
  const searchRadiusLabel = searchRadiusMeters > 0 ? `${(searchRadiusMeters / 1000).toFixed(1)} km` : 'nearby';
  const customerName = data.customer?.name || data.raw?.user?.name || 'Customer';
  const customerPhone = [data.customer?.countryCode, data.customer?.phone].filter(Boolean).join(' ').trim() || data.raw?.user?.phone || '';
  const pricingNegotiationMode = String(data.raw?.pricingNegotiationMode || 'none').toLowerCase();
  const isBidding = pricingNegotiationMode === 'driver_bid' && (Boolean(data.raw?.bidding?.enabled) || String(data.raw?.bookingMode || '').toLowerCase() === 'bidding');
  const isUserIncrementOnly = pricingNegotiationMode === 'user_increment_only';
  const fareWasIncreased = isUserIncrementOnly && Number(data.raw?.fare || 0) > Number(data.raw?.baseFare || data.raw?.fare || 0);
  const bidBaseFare = Number(data.raw?.bidding?.baseFare || data.raw?.baseFare || data.raw?.fare || 0);
  const bidFloorFare = Number(data.raw?.bidding?.bidFloorFare || bidBaseFare);
  const bidMaxFare = Number(data.raw?.bidding?.userMaxBidFare || data.raw?.userMaxBidFare || bidBaseFare);
  const bidStepAmount = Number(data.raw?.bidding?.bidStepAmount || 10);
  const scheduledCountdown = getScheduledRideCountdown(scheduledAt, previewNow);
  const bidOptions = isBidding
    ? Array.from({ length: Math.max(1, Math.floor((bidMaxFare - bidFloorFare) / bidStepAmount) + 1) }, (_, index) => bidFloorFare + index * bidStepAmount)
    : [];

  // One brand look for every request kind: the icon tells ride / parcel / intercity apart.
  const theme = { text: DT.brand, light: DT.brandSoft, border: DT.brandBorder };
  const isCash = payment.includes('CASH');
  const close = onClose || onDecline;
  const HeaderIcon = isParcel ? Package : isIntercity ? Navigation : Bike;

  const scheduleBox = (tone) => (
    <View style={[styles.scheduleBox, { borderColor: tone === 'blue' ? DT.infoSoft : DT.successSoft, backgroundColor: tone === 'blue' ? DT.infoSoft : DT.successSoft }]}>
      <View style={styles.scheduleRow}>
        <View style={styles.scheduleIcon}>
          <Clock size={18} strokeWidth={2.3} color={tone === 'blue' ? DT.info : DT.successInk} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[outfit(900), styles.scheduleLabel, { color: tone === 'blue' ? DT.info : DT.successInk }]}>SCHEDULED TIME</Text>
          <Text style={[outfit(900), styles.scheduleTime]}>{formatScheduledDateTime(scheduledAt)}</Text>
          <Text style={[outfit(900), styles.scheduleCountdown, { color: tone === 'blue' ? DT.info : DT.successInk }]}>{scheduledCountdown}</Text>
          <Text style={[outfit(700), styles.scheduleHelp]}>
            {tone === 'blue'
              ? 'This request is stored for later dispatch and shown here with full details.'
              : 'This is a scheduled request. Accept only if you can commit to this pickup slot.'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <Entrance>
        {/* Deep-green request header: kind, big earnings, countdown ring */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <HeaderIcon size={24} color={DT.ctaInk} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.pill}>
                  <Text style={[outfit(800), styles.pillText]}>{isPreviewMode ? 'SCHEDULED TRIP' : 'RIDE OFFER'}</Text>
                </View>
                <Text style={[playfair(700), styles.title]} numberOfLines={2}>{title}</Text>
                <Text numberOfLines={1} style={[outfit(600), styles.category]}>{category}</Text>
              </View>
            </View>

            {isPreviewMode ? (
              <Press onPress={close} accessibilityLabel="Close" style={styles.previewX}>
                <X size={20} color={DT.onBrand} />
              </Press>
            ) : (
              <TimerRing progress={timerProgress} color={DT.cta} timer={timer} />
            )}
          </View>

          <View style={styles.fareRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[outfit(800), styles.fareLabel]}>EARNINGS</Text>
              <Text numberOfLines={1} style={[outfit(900), styles.fareValue]}>{data.fare || 'Rs 0'}</Text>
            </View>
            {fareWasIncreased ? (
              <View style={styles.fareUp}>
                <Text style={[outfit(900), styles.fareUpText]}>FARE INCREASED</Text>
              </View>
            ) : null}
          </View>

          {isPreviewMode || isScheduledRequest ? (
            <Text numberOfLines={1} style={[outfit(700), styles.subLine]}>{`SCHEDULED FOR ${formatScheduledDateTime(scheduledAt).toUpperCase()}`}</Text>
          ) : (
            <Text numberOfLines={1} style={[outfit(700), styles.subLine]}>{`WAVE ${attemptCount} OF ${maxAttempts} • RADIUS ${searchRadiusLabel.toUpperCase()}`}</Text>
          )}

          {!isPreviewMode ? (
            <View style={styles.topBar}>
              <View style={{ height: '100%', width: `${timerProgress}%`, backgroundColor: DT.cta }} />
            </View>
          ) : null}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.body} bounces={false} showsVerticalScrollIndicator={false}>
          <View style={styles.stats}>
            <View style={styles.statCell}>
              <View style={styles.statLabelRow}>
                <Route size={14} color={DT.muted} />
                <Text style={[outfit(800), styles.statLabel]}>DISTANCE</Text>
              </View>
              <Text style={[outfit(900), styles.statValue]}>{data.distance || 'Nearby'}</Text>
            </View>
            <View style={[styles.statCell, { borderLeftWidth: 1, borderColor: DT.borderSoft }]}>
              <View style={styles.statLabelRow}>
                {isCash ? <Banknote size={14} color={DT.muted} /> : <CreditCard size={14} color={DT.muted} />}
                <Text style={[outfit(800), styles.statLabel]}>PAYMENT</Text>
              </View>
              <View style={[styles.payPill, { backgroundColor: isCash ? DT.warnSoft : DT.infoSoft }]}>
                <Text style={[outfit(900), styles.payText, { color: isCash ? DT.warnInk : DT.info }]}>{payment}</Text>
              </View>
            </View>
          </View>

          {isPreviewMode ? scheduleBox('blue') : isScheduledRequest ? scheduleBox('emerald') : null}

          {isIntercity ? (
            <View style={styles.intercity}>
              {[
                ['TRIP', data.raw?.intercity?.tripType || 'Intercity'],
                ['DATE', data.raw?.intercity?.travelDate || 'Today'],
                ['PAX', data.raw?.intercity?.passengers || 1],
              ].map(([label, value]) => (
                <View key={label} style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[outfit(700), styles.intercityLabel]}>{label}</Text>
                  <Text numberOfLines={1} style={[outfit(800), styles.intercityValue]}>{String(value)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.rider}>
            <View style={styles.avatar}>
              <Text style={[outfit(800), styles.avatarText]}>{customerName.substring(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[outfit(800), styles.riderLabel]}>RIDER</Text>
              <Text numberOfLines={1} style={[outfit(800), styles.riderName]}>{customerName}</Text>
            </View>
            {customerPhone ? (
              <Press onPress={() => Linking.openURL(`tel:${customerPhone}`).catch(() => {})} accessibilityLabel="Call rider" style={styles.callBtn}>
                <Phone size={18} strokeWidth={2.5} color={DT.brand} />
              </Press>
            ) : null}
          </View>

          <View style={styles.route}>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <View style={[styles.pin, { backgroundColor: DT.successSoft }]}>
                <PulseDot style={[styles.pinDot, { backgroundColor: DT.success, borderRadius: 5 }]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[outfit(800), styles.tagText, { color: DT.successInk }]}>PICKUP</Text>
                <Text style={[outfit(700), styles.address]}>{pickupAddress}</Text>
              </View>
            </View>
            <View style={[styles.routeItem, { marginTop: 18 }]}>
              <View style={[styles.pin, { backgroundColor: DT.warnSoft }]}>
                <View style={[styles.pinDot, { backgroundColor: DT.warn, borderRadius: 5 }]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[outfit(800), styles.tagText, { color: DT.warnInk }]}>DROP</Text>
                <Text style={[outfit(700), styles.address]}>{dropAddress}</Text>
              </View>
            </View>
          </View>

          {isBidding && !isPreviewMode ? (
            <View style={styles.bidGrid}>
              {bidOptions.slice(0, 6).map((bidValue) => (
                <Press
                  key={bidValue}
                  onPress={() => onSubmitBid?.(bidValue)}
                  disabled={isAccepting}
                  scale={0.98}
                  style={[styles.bidOpt, { borderColor: theme.border, backgroundColor: theme.light }, isAccepting && styles.dim60]}
                >
                  <Text style={[outfit(800), styles.bidText, { color: theme.text }]}>{`RS ${bidValue}`}</Text>
                </Press>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {/* Actions stay pinned under the scrolling details so Accept is always reachable */}
        <View style={styles.footer}>
          {isPreviewMode ? (
            onPreviewCancel ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <CtaButton variant="outline" title="CLOSE" onPress={close} disabled={isPreviewCancelling} style={styles.previewBtn} />
                <CtaButton
                  variant="danger"
                  title={(isPreviewCancelling ? 'Cancelling...' : canPreviewCancel ? 'Cancel ride' : previewCancelDisabledLabel).toUpperCase()}
                  onPress={() => {
                    if (canPreviewCancel) onPreviewCancel(data);
                  }}
                  disabled={isPreviewCancelling || !canPreviewCancel}
                  style={styles.previewBtn}
                />
              </View>
            ) : (
              <CtaButton variant="brand" title="CLOSE DETAILS" onPress={close} style={styles.accept} />
            )
          ) : (
            <>
              {isBidding ? (
                <CtaButton title={isAccepting ? 'SUBMITTING...' : 'SEND BID'} onPress={() => onSubmitBid?.(bidBaseFare)} disabled={isAccepting} style={styles.accept} />
              ) : (
                <CtaButton title={isAccepting ? 'ACCEPTING...' : 'ACCEPT RIDE'} onPress={() => onAccept(data)} disabled={isAccepting} style={styles.accept} />
              )}

              <Press onPress={onDecline} disabled={isAccepting} accessibilityLabel="Decline request" style={[styles.decline, isAccepting && styles.dim60]}>
                <X size={18} color={DT.muted} />
                <Text style={[outfit(700), styles.declineText]}>Decline</Text>
              </Press>

              <View style={styles.footNote}>
                <Clock size={12} color={DT.muted} />
                <Text style={[outfit(700), styles.footNoteText]}>Request auto-declines when the timer ends.</Text>
              </View>
            </>
          )}
        </View>
      </Entrance>
    </Modal>
  );
};

const CARD_W = Math.min(430, Dimensions.get('window').width - 24);

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: alpha(DT.dark, 0.55), paddingHorizontal: 12, paddingBottom: 16 },
  card: { width: CARD_W, maxHeight: '94%', borderRadius: DT.radius.xl, backgroundColor: DT.card, overflow: 'hidden', ...shadow('lg') },
  topBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.14)' },
  header: { backgroundColor: DT.brandDeep, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 52, height: 52, borderRadius: DT.radius.md, backgroundColor: DT.cta, alignItems: 'center', justifyContent: 'center' },
  pill: { alignSelf: 'flex-start', minWidth: 56, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  pillText: { fontSize: 10, lineHeight: 14, letterSpacing: 0.4, textAlign: 'center', color: DT.accent },
  title: { marginTop: 4, fontSize: 20, lineHeight: 26, color: DT.gold },
  category: { marginTop: 2, fontSize: 12, color: DT.onBrandMuted },
  subLine: { marginTop: 10, fontSize: 10, lineHeight: 14, letterSpacing: 0.4, color: DT.onBrandMuted },
  fareRow: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  fareLabel: { fontSize: 10, lineHeight: 14, letterSpacing: 0.4, minWidth: 64, color: DT.onBrandMuted },
  fareValue: { fontSize: 38, lineHeight: 46, color: DT.onBrand },
  fareUp: { borderRadius: 999, backgroundColor: DT.successSoft, paddingHorizontal: 10, paddingVertical: 4 },
  fareUpText: { fontSize: 10, lineHeight: 14, minWidth: 80, textAlign: 'center', color: DT.successInk },
  previewX: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  ringWrap: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: DT.brand, alignItems: 'center', justifyContent: 'center' },
  ringNumber: { fontSize: 20, lineHeight: 22, color: DT.onBrand },
  ringSec: { marginTop: -2, fontSize: 8, lineHeight: 10, minWidth: 20, textAlign: 'center', color: DT.accent },
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 4, paddingTop: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, backgroundColor: DT.card },
  stats: { flexDirection: 'row', marginBottom: 14, overflow: 'hidden', borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.bg },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  statLabel: { fontSize: 10, lineHeight: 14, letterSpacing: 0.4, minWidth: 56, color: DT.muted },
  statValue: { fontSize: 16, color: DT.ink, textAlign: 'center' },
  payPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3 },
  payText: { fontSize: 11, lineHeight: 15, minWidth: 40, textAlign: 'center' },
  scheduleBox: { marginBottom: 14, borderRadius: DT.radius.lg, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  scheduleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  scheduleIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: DT.card, alignItems: 'center', justifyContent: 'center' },
  scheduleLabel: { fontSize: 10, lineHeight: 14, letterSpacing: 0.4, minWidth: 80 },
  scheduleTime: { marginTop: 4, fontSize: 14, color: DT.ink },
  scheduleCountdown: { marginTop: 4, fontSize: 12 },
  scheduleHelp: { marginTop: 4, fontSize: 12, lineHeight: 17, color: DT.muted },
  intercity: { flexDirection: 'row', gap: 8, marginBottom: 14, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.brandBorder, backgroundColor: DT.brandSoft, paddingHorizontal: 12, paddingVertical: 12 },
  intercityLabel: { fontSize: 10, lineHeight: 14, letterSpacing: 0.4, minWidth: 30, color: DT.muted },
  intercityValue: { marginTop: 4, fontSize: 13, color: DT.ink },
  rider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.bg, padding: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, color: DT.accent },
  riderLabel: { fontSize: 10, lineHeight: 14, letterSpacing: 0.4, minWidth: 40, color: DT.muted },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  riderName: { fontSize: 15, color: DT.ink },
  route: { marginBottom: 14, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, padding: 16, ...shadow('sm') },
  routeLine: { position: 'absolute', left: 25, top: 34, bottom: 34, width: 2, backgroundColor: DT.border },
  routeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  pin: { width: 20, height: 20, marginTop: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 10, height: 10 },
  tagText: { fontSize: 10, lineHeight: 14, letterSpacing: 0.4, minWidth: 44 },
  address: { marginTop: 2, fontSize: 14, lineHeight: 19, color: DT.ink },
  previewBtn: { flex: 1, minHeight: 56 },
  decline: { marginTop: 8, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: DT.radius.lg },
  declineText: { fontSize: 14, color: DT.muted },
  accept: { minHeight: 60 },
  bidGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  bidOpt: { width: '31.5%', flexGrow: 1, minHeight: 44, borderRadius: DT.radius.md, borderWidth: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  bidText: { fontSize: 12, lineHeight: 16, minWidth: 40, textAlign: 'center' },
  footNote: { marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footNoteText: { fontSize: 11, color: DT.muted },
  dim60: { opacity: 0.6 },
});

export default IncomingRideRequest;
