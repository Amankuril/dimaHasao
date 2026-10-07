import { useEffect, useState } from 'react';
import { Animated, Dimensions, Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banknote, Bike, Clock, CreditCard, Navigation, Package, Phone, Route, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { alpha, outfit, tw } from '../../theme';
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
        <Circle cx={31} cy={31} r={r} stroke="#e2e8f0" strokeWidth={5} fill="none" />
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

  // Theme: orange (parcel) / teal (intercity) / emerald (ride)
  const theme = isParcel
    ? { grad: alpha(tw.orange50, 0.9), bg: tw.orange500, text: tw.orange600, light: alpha(tw.orange50, 0.8), border: tw.orange100, ring: '#f97316', glow: '0 12px 24px rgba(249,115,22,0.3)' }
    : isIntercity
      ? { grad: alpha(tw.teal50, 0.9), bg: tw.teal500, text: tw.teal600, light: alpha(tw.teal50, 0.8), border: tw.teal100, ring: '#0d9488', glow: '0 12px 24px rgba(13,148,136,0.3)' }
      : { grad: alpha(tw.emerald50, 0.95), bg: tw.emerald500, text: tw.emerald600, light: alpha(tw.emerald50, 0.8), border: tw.emerald100, ring: '#10b981', glow: '0 12px 24px rgba(16,185,129,0.3)' };
  const isCash = payment.includes('CASH');
  const close = onClose || onDecline;
  const HeaderIcon = isParcel ? Package : isIntercity ? Navigation : Bike;

  const scheduleBox = (tone) => (
    <View style={[styles.scheduleBox, { borderColor: tone === 'blue' ? tw.blue100 : tw.emerald100, backgroundColor: alpha(tone === 'blue' ? tw.blue50 : tw.emerald50, 0.5) }]}>
      <View style={styles.scheduleRow}>
        <View style={[styles.scheduleIcon, { borderColor: alpha(tone === 'blue' ? tw.blue100 : tw.emerald100, 0.5) }]}>
          <Clock size={18} strokeWidth={2.3} color={tone === 'blue' ? tw.blue600 : tw.emerald600} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[outfit(900), styles.scheduleLabel, { color: alpha(tone === 'blue' ? tw.blue500 : tw.emerald600, 0.8) }]}>SCHEDULED TIME</Text>
          <Text style={[outfit(900), styles.scheduleTime]}>{formatScheduledDateTime(scheduledAt)}</Text>
          <Text style={[outfit(900), styles.scheduleCountdown, { color: tone === 'blue' ? tw.blue600 : tw.emerald600 }]}>{scheduledCountdown}</Text>
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
        {!isPreviewMode ? (
          <View style={styles.topBar}>
            <View style={{ height: '100%', width: `${timerProgress}%`, backgroundColor: theme.bg }} />
          </View>
        ) : null}

        <LinearGradient colors={[theme.grad, '#ffffff']} style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: theme.bg }]}>
                <HeaderIcon size={26} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={[styles.pill, { backgroundColor: theme.light }]}>
                  <Text style={[outfit(900), styles.pillText, { color: theme.text }]}>{isPreviewMode ? 'SCHEDULED TRIP' : 'RIDE OFFER'}</Text>
                </View>
                <Text style={[outfit(900), styles.title]}>{title}</Text>
                <Text numberOfLines={1} style={[outfit(600), styles.category]}>{category}</Text>
                {isPreviewMode ? (
                  <Text numberOfLines={1} style={[outfit(900), styles.subLine, { color: tw.slate400 }]}>SCHEDULED FOR {formatScheduledDateTime(scheduledAt).toUpperCase()}</Text>
                ) : isScheduledRequest ? (
                  <Text numberOfLines={1} style={[outfit(900), styles.subLine, { color: tw.emerald600 }]}>SCHEDULED FOR {formatScheduledDateTime(scheduledAt).toUpperCase()}</Text>
                ) : (
                  <Text numberOfLines={1} style={[outfit(900), styles.subLine, { color: tw.slate400 }]}>WAVE {attemptCount} OF {maxAttempts} • RADIUS {searchRadiusLabel.toUpperCase()}</Text>
                )}
                {fareWasIncreased ? (
                  <View style={styles.fareUp}>
                    <Text style={[outfit(900), styles.fareUpText]}>FARE INCREASED</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {isPreviewMode ? (
              <Press onPress={close} style={styles.previewX}>
                <X size={20} color={tw.slate600} />
              </Press>
            ) : (
              <TimerRing progress={timerProgress} color={theme.ring} timer={timer} />
            )}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.stats}>
            <View style={styles.statCell}>
              <View style={styles.statLabelRow}>
                <Route size={14} color={tw.slate400} />
                <Text style={[outfit(800), styles.statLabel, { color: tw.slate400 }]}>DISTANCE</Text>
              </View>
              <Text style={[outfit(900), styles.statValue]}>{data.distance || 'Nearby'}</Text>
            </View>
            <View style={[styles.statCell, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: tw.slate100, backgroundColor: theme.light }]}>
              <View style={styles.statLabelRow}>
                <Banknote size={14} color={theme.text} />
                <Text style={[outfit(800), styles.statLabel, { color: theme.text }]}>EARNINGS</Text>
              </View>
              <Text style={[outfit(900), styles.earnValue, { color: theme.text }]}>{data.fare || 'Rs 0'}</Text>
            </View>
            <View style={styles.statCell}>
              <View style={styles.statLabelRow}>
                {isCash ? <Banknote size={14} color={tw.slate400} /> : <CreditCard size={14} color={tw.slate400} />}
                <Text style={[outfit(800), styles.statLabel, { color: tw.slate400 }]}>PAYMENT</Text>
              </View>
              <View style={[styles.payPill, { backgroundColor: isCash ? tw.amber100 : tw.blue100 }]}>
                <Text style={[outfit(900), styles.payText, { color: isCash ? tw.amber800 : tw.blue800 }]}>{payment}</Text>
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
              <View style={styles.riderTop}>
                <Text style={[outfit(900), styles.riderLabel]}>RIDER</Text>
                {customerPhone ? (
                  <Press onPress={() => Linking.openURL(`tel:${customerPhone}`).catch(() => {})} style={[styles.callBtn, { backgroundColor: theme.light }]}>
                    <Phone size={10} strokeWidth={2.5} color={theme.text} />
                    <Text style={[outfit(700), styles.callText, { color: theme.text }]}>Call</Text>
                  </Press>
                ) : null}
              </View>
              <Text numberOfLines={1} style={[outfit(800), styles.riderName]}>{customerName}</Text>
            </View>
          </View>

          <View style={styles.route}>
            <View style={styles.routeLine} />
            <View style={styles.routeItem}>
              <View style={[styles.pin, { backgroundColor: tw.emerald100 }]}>
                <PulseDot style={[styles.pinDot, { backgroundColor: tw.emerald600, borderRadius: 5 }]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={[styles.tag, { backgroundColor: tw.emerald50 }]}>
                  <Text style={[outfit(900), styles.tagText, { color: tw.emerald700 }]}>PICKUP</Text>
                </View>
                <Text style={[outfit(700), styles.address]}>{pickupAddress}</Text>
              </View>
            </View>
            <View style={[styles.routeItem, { marginTop: 20 }]}>
              <View style={[styles.pin, { backgroundColor: tw.rose100 }]}>
                <View style={[styles.pinDot, { backgroundColor: tw.rose600, borderRadius: 4 }]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={[styles.tag, { backgroundColor: tw.rose50 }]}>
                  <Text style={[outfit(900), styles.tagText, { color: tw.rose700 }]}>DROP</Text>
                </View>
                <Text style={[outfit(700), styles.address]}>{dropAddress}</Text>
              </View>
            </View>
          </View>

          {isPreviewMode ? (
            onPreviewCancel ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Press onPress={close} disabled={isPreviewCancelling} style={[styles.previewBtn, { flex: 1, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff' }, isPreviewCancelling && styles.dim60]}>
                  <Text style={[outfit(700), styles.previewBtnText, { color: tw.slate600 }]}>CLOSE</Text>
                </Press>
                <Press
                  onPress={() => {
                    if (canPreviewCancel) onPreviewCancel(data);
                  }}
                  disabled={isPreviewCancelling || !canPreviewCancel}
                  style={[styles.previewBtn, { flex: 1, paddingHorizontal: 20, backgroundColor: tw.rose500, boxShadow: '0 8px 20px rgba(244,63,94,0.2)' }, (isPreviewCancelling || !canPreviewCancel) && styles.dim60]}
                >
                  <Text style={[outfit(700), styles.previewBtnText, { color: '#fff' }]}>
                    {(isPreviewCancelling ? 'Cancelling...' : canPreviewCancel ? 'Cancel ride' : previewCancelDisabledLabel).toUpperCase()}
                  </Text>
                </Press>
              </View>
            ) : (
              <Press onPress={close} style={[styles.previewBtn, { paddingHorizontal: 20, backgroundColor: tw.slate900, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' }]}>
                <Text style={[outfit(700), styles.previewBtnText, { color: '#fff' }]}>CLOSE DETAILS</Text>
              </Press>
            )
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
                <Press onPress={onDecline} disabled={isAccepting} style={[styles.decline, isAccepting && styles.dim60]}>
                  <X size={24} color={tw.slate500} />
                </Press>
                {isBidding ? (
                  <View style={{ flex: 1, gap: 12 }}>
                    <View style={styles.bidGrid}>
                      {bidOptions.slice(0, 6).map((bidValue) => (
                        <Press
                          key={bidValue}
                          onPress={() => onSubmitBid?.(bidValue)}
                          disabled={isAccepting}
                          scale={0.98}
                          style={[styles.bidOpt, { borderColor: theme.border, backgroundColor: theme.light }, isAccepting && styles.dim60]}
                        >
                          <Text style={[outfit(800), styles.bidText, { color: theme.text }]}>RS {bidValue}</Text>
                        </Press>
                      ))}
                    </View>
                    <Press onPress={() => onSubmitBid?.(bidBaseFare)} disabled={isAccepting} style={[styles.accept, { backgroundColor: theme.bg, boxShadow: theme.glow }, isAccepting && styles.dim70]}>
                      <Text style={[outfit(800), styles.acceptText]}>{isAccepting ? 'SUBMITTING...' : 'SEND BID'}</Text>
                    </Press>
                  </View>
                ) : (
                  <Press onPress={() => onAccept(data)} disabled={isAccepting} style={[styles.accept, { flex: 1, backgroundColor: theme.bg, boxShadow: theme.glow }, isAccepting && styles.dim70]}>
                    <Text style={[outfit(800), styles.acceptText]}>{isAccepting ? 'ACCEPTING...' : 'ACCEPT RIDE'}</Text>
                  </Press>
                )}
              </View>

              <View style={styles.footNote}>
                <Clock size={12} color={tw.slate400} />
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
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: alpha(tw.slate950, 0.4), paddingHorizontal: 12, paddingBottom: 16 },
  card: { width: CARD_W, borderRadius: 28, backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 30px 90px rgba(0,0,0,0.22)' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: tw.slate100, zIndex: 2 },
  header: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: tw.slate100 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  headerLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  pillText: { fontSize: 9, letterSpacing: 0.45 },
  title: { marginTop: 4, fontSize: 21, lineHeight: 26, letterSpacing: -0.5, color: tw.slate900 },
  category: { marginTop: 2, fontSize: 12, color: tw.slate500 },
  subLine: { marginTop: 4, fontSize: 10, letterSpacing: 1.4 },
  fareUp: { alignSelf: 'flex-start', marginTop: 4, borderRadius: 999, backgroundColor: tw.emerald50, paddingHorizontal: 8, paddingVertical: 2 },
  fareUpText: { fontSize: 9, letterSpacing: 1.26, color: tw.emerald700 },
  previewX: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  ringWrap: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  ringNumber: { fontSize: 21, lineHeight: 21, color: tw.slate900 },
  ringSec: { marginTop: -2, fontSize: 7, letterSpacing: 0.7, color: tw.slate400 },
  body: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 16, backgroundColor: '#fff' },
  stats: { flexDirection: 'row', marginBottom: 16, overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: tw.slate100, backgroundColor: alpha(tw.slate50, 0.5), boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  statLabel: { fontSize: 9, letterSpacing: 0.45 },
  statValue: { fontSize: 15, color: tw.slate800, textAlign: 'center' },
  earnValue: { fontSize: 21, lineHeight: 21 },
  payPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  payText: { fontSize: 10, letterSpacing: 0.25 },
  scheduleBox: { marginBottom: 16, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  scheduleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  scheduleIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  scheduleLabel: { fontSize: 9, letterSpacing: 0.45 },
  scheduleTime: { marginTop: 4, fontSize: 14, color: tw.slate800 },
  scheduleCountdown: { marginTop: 4, fontSize: 11 },
  scheduleHelp: { marginTop: 4, fontSize: 11, color: tw.slate500 },
  intercity: { flexDirection: 'row', gap: 8, marginBottom: 16, borderRadius: 18, borderWidth: 1, borderColor: tw.teal100, backgroundColor: alpha(tw.teal50, 0.4), paddingHorizontal: 12, paddingVertical: 12 },
  intercityLabel: { fontSize: 9, letterSpacing: 0.45, color: alpha(tw.teal700, 0.6) },
  intercityValue: { marginTop: 4, fontSize: 12, color: tw.slate800 },
  rider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, borderRadius: 20, borderWidth: 1, borderColor: tw.slate100, backgroundColor: alpha(tw.slate50, 0.3), padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.slate100, borderWidth: 1, borderColor: alpha(tw.slate200, 0.5), alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, color: tw.slate600 },
  riderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  riderLabel: { fontSize: 9, letterSpacing: 0.45, color: tw.slate400 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  callText: { fontSize: 11 },
  riderName: { fontSize: 14, color: tw.slate800 },
  route: { marginBottom: 20, borderRadius: 24, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', padding: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.02)' },
  routeLine: { position: 'absolute', left: 25, top: 30, bottom: 30, width: 2, backgroundColor: tw.slate100 },
  routeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  pin: { width: 20, height: 20, marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  pinDot: { width: 10, height: 10 },
  tag: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 9, letterSpacing: 0.45 },
  address: { marginTop: 4, fontSize: 14, lineHeight: 19, color: tw.slate800 },
  previewBtn: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  previewBtnText: { fontSize: 13, letterSpacing: 1.95 },
  decline: { width: 76, height: 56, borderRadius: 18, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  accept: { height: 56, borderRadius: 18, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  acceptText: { fontSize: 14, letterSpacing: 2.1, color: '#fff' },
  bidGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bidOpt: { width: '31.5%', flexGrow: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  bidText: { fontSize: 11, letterSpacing: 0.275 },
  footNote: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footNoteText: { fontSize: 10, color: tw.slate400 },
  dim60: { opacity: 0.6 },
  dim70: { opacity: 0.7 },
});

export default IncomingRideRequest;
