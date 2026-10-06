import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpRight, Banknote, Check, CheckCircle2, ChevronRight, Clock3, MessageSquare, Package, Phone, QrCode, Scan, ShieldAlert, Star, User } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { openExternal } from '../../lib/links';
import { outfit, tw } from '../../theme';
import { formatCurrencyAmount, formatDateTimeLabel, formatTimerClock, formatWholeMinutes } from '../utils/activeTripHelpers';

// Web: the bottom sheets of Taxi/modules/driver/pages/ActiveTrip.jsx, one per phase
// (to_pickup, otp_verification, in_trip, payment_confirm, review).

const fo = outfit;
const em = (size, v) => size * v;
const BLACK = '#000000';
const SHADOW_2XL = '0 25px 50px -12px rgba(0,0,0,0.25)';
const SHADOW_LG = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)';
const SHADOW_XL = '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)';
const SHADOW_SM = '0 1px 2px rgba(0,0,0,0.05)';

// framer-motion initial {y:'100%'} -> animate {y:0} (or an opacity fade for the review sheet).
function Sheet({ phaseKey, fade, padding = 24, extra, children }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const v = useAnimatedValue(0);
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [phaseKey, v]);
  const anim = fade ? { opacity: v } : { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [height * 0.88, 0] }) }] };
  return (
    <Animated.View style={[st.sheet, { maxHeight: height * 0.88 }, anim, extra]}>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding, paddingBottom: 32 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const Row = ({ style, children }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;

function RadiusCard({ label, value, unlocked }) {
  return (
    <View style={st.radiusCard}>
      <Row style={{ justifyContent: 'space-between', gap: 12 }}>
        <View>
          <Text style={[st.tiny9, fo(900)]}>{label}</Text>
          <Text style={[{ marginTop: 4, fontSize: 12, color: tw.slate900 }, fo(900)]}>{value}</Text>
        </View>
        <View style={[st.pill, unlocked ? { backgroundColor: tw.emerald50, borderColor: tw.emerald100 } : { backgroundColor: tw.amber50, borderColor: tw.amber100 }]}>
          <Text style={[{ fontSize: 10, textTransform: 'uppercase', letterSpacing: em(10, 0.16), color: unlocked ? tw.emerald600 : tw.amber600 }, fo(900)]}>{unlocked ? 'Unlocked' : 'Within 100 m'}</Text>
        </View>
      </Row>
    </View>
  );
}

const GuardError = ({ children }) => (
  <Text style={[{ marginTop: -4, marginBottom: 16, textAlign: 'center', fontSize: 11, color: tw.red500, textTransform: 'uppercase', letterSpacing: em(11, 0.05) }, fo(900)]}>{children}</Text>
);

function ToPickup({ t }) {
  const { isParcel, tripData, riderDistanceLabel, openTripChat, callContact, pickupContact, pickupDistanceMeters, canMarkArrived, arrivalGuardError, setArrivalGuardError, setLocalArrivedAt, setPhase, publishRideStatus, routeStrokeColor, routeAccentMuted } = t;
  return (
    <Sheet phaseKey="to_pickup" padding={20}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 24 }}>
        <Row style={{ gap: 12, flexShrink: 1 }}>
          <View style={st.avatar48}>
            {isParcel ? <Package size={22} color={tw.slate900} /> : <User size={22} color={tw.slate400} />}
          </View>
          <View style={{ gap: 2, flexShrink: 1 }}>
            <Text numberOfLines={1} style={[{ fontSize: 15, color: tw.slate900, textTransform: 'uppercase', letterSpacing: em(15, -0.025) }, fo(600)]}>
              {isParcel ? tripData.sender.name : tripData.user.name}
            </Text>
            <Row style={{ gap: 6, opacity: 0.6 }}>
              <Star size={10} fill={routeStrokeColor} color={BLACK} />
              <Text style={[{ fontSize: 9, color: tw.slate400, textTransform: 'uppercase', letterSpacing: em(9, 0.025) }, fo(600)]}>
                {isParcel ? tripData.sender.rating : tripData.user.rating} • {riderDistanceLabel}
              </Text>
            </Row>
          </View>
        </Row>
        <Row style={{ gap: 8 }}>
          <Press onPress={openTripChat} accessibilityLabel="Open trip chat" style={st.sq44}><MessageSquare size={18} strokeWidth={2.5} color={tw.slate600} /></Press>
          <Press onPress={() => callContact(pickupContact?.phone)} accessibilityLabel="Call contact" style={st.sq44}><Phone size={18} strokeWidth={2.5} color={routeStrokeColor} /></Press>
        </Row>
      </Row>
      <RadiusCard label="Arrival Radius" value={`${Math.round(pickupDistanceMeters)} m away from pickup`} unlocked={canMarkArrived} />
      {arrivalGuardError ? <GuardError>{arrivalGuardError}</GuardError> : null}
      <Press
        scale={0.98}
        onPress={() => {
          if (!canMarkArrived) {
            setArrivalGuardError('Reach within 100 meters of pickup before marking arrived.');
            return;
          }

          setArrivalGuardError('');
          setLocalArrivedAt(new Date().toISOString());
          setPhase('otp_verification');
          publishRideStatus('arriving');
        }}
        style={[st.bigBtn, { borderRadius: 16, backgroundColor: routeStrokeColor, boxShadow: `0 18px 30px ${routeAccentMuted}`, opacity: canMarkArrived ? 1 : 0.7 }]}
      >
        <Text style={[st.bigBtnText, fo(600)]}>{isParcel ? 'Arrived at Sender' : 'I Have Arrived'}</Text>
        <CheckCircle2 size={18} strokeWidth={3} color="#fff" />
      </Press>
    </Sheet>
  );
}

function OtpVerification({ t }) {
  const {
    isParcel, isWaitingForOtp, waitingElapsedSeconds, freeWaitingRemainingSeconds, freeWaitingBeforeMinutes, waitingChargePerMinute, waitingChargeableMinutes,
    otp, otpInputRefs, handleOTPChange, handleOTPKeyDown, otpError, startTripAfterOtp, setLocalArrivedAt, setArrivalGuardError, setPhase, publishRideStatus,
    openSupportChat, routeStrokeColor, routeAccentSoft, routeAccentMuted, routeAccentBorder,
  } = t;
  return (
    <Sheet phaseKey="otp_verification">
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Text style={[{ fontSize: 20, lineHeight: 20, color: tw.slate900, textTransform: 'uppercase', letterSpacing: em(20, -0.025) }, fo(600)]}>Security Pin</Text>
        <Text style={[{ fontSize: 10, color: tw.slate400, textTransform: 'uppercase', letterSpacing: em(10, 0.025), marginTop: 8 }, fo(700)]}>
          Ask <Text style={{ color: tw.slate900 }}>{isParcel ? 'Sender' : 'Passenger'}</Text> for Start PIN
        </Text>
      </View>
      {isWaitingForOtp ? (
        <View style={st.waitBox}>
          <Row style={{ justifyContent: 'space-between', gap: 12 }}>
            <Row style={{ gap: 12 }}>
              <View style={st.waitIcon}><Clock3 size={18} strokeWidth={2.5} color={tw.amber500} /></View>
              <View>
                <Text style={[st.tiny9, { color: tw.amber600, letterSpacing: em(9, 0.22) }, fo(900)]}>Waiting Clock</Text>
                <Text style={[{ marginTop: 4, fontSize: 22, color: tw.slate900, letterSpacing: em(22, -0.025) }, fo(900)]}>{formatTimerClock(waitingElapsedSeconds)}</Text>
              </View>
            </Row>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[st.tiny9, { letterSpacing: em(9, 0.18) }, fo(900)]}>Free Left</Text>
              <Text style={[{ marginTop: 4, fontSize: 13, color: tw.slate900 }, fo(900)]}>{formatTimerClock(freeWaitingRemainingSeconds)}</Text>
            </View>
          </Row>
          <Row style={{ marginTop: 16, gap: 12, alignItems: 'stretch' }}>
            <View style={st.waitCell}>
              <Text style={[st.tiny9, { letterSpacing: em(9, 0.18) }, fo(900)]}>Free Before Ride</Text>
              <Text style={[{ marginTop: 4, fontSize: 13, color: tw.slate900 }, fo(900)]}>{formatWholeMinutes(freeWaitingBeforeMinutes)}</Text>
            </View>
            <View style={st.waitCell}>
              <Text style={[st.tiny9, { letterSpacing: em(9, 0.18) }, fo(900)]}>Waiting Charge</Text>
              <Text style={[{ marginTop: 4, fontSize: 13, color: tw.slate900 }, fo(900)]}>
                Rs {waitingChargePerMinute}/min
                {waitingChargeableMinutes > 0 ? ` • ${waitingChargeableMinutes} billable` : ''}
              </Text>
            </View>
          </Row>
        </View>
      ) : null}
      <Row style={{ justifyContent: 'center', gap: 12, marginBottom: 32 }}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(node) => { otpInputRefs.current[index] = node; }}
            keyboardType="phone-pad"
            maxLength={1}
            value={digit}
            onChangeText={(value) => handleOTPChange(index, value)}
            onKeyPress={(e) => handleOTPKeyDown(index, e)}
            style={[st.otpBox, { borderColor: routeAccentBorder }, fo(600)]}
          />
        ))}
      </Row>
      {otpError ? (
        <Text style={[{ marginTop: -20, marginBottom: 20, textAlign: 'center', fontSize: 11, color: tw.red500, textTransform: 'uppercase', letterSpacing: em(11, 0.05) }, fo(900)]}>{otpError}</Text>
      ) : null}
      <Press onPress={() => startTripAfterOtp(otp.join(''))} style={[st.h52, { marginBottom: 12, backgroundColor: routeStrokeColor, boxShadow: `0 16px 28px ${routeAccentMuted}` }]}>
        <Text style={[{ fontSize: 12, color: '#fff', textTransform: 'uppercase', letterSpacing: em(12, 0.1) }, fo(900)]}>Submit PIN</Text>
      </Press>
      <Row style={{ gap: 12 }}>
        <Press
          onPress={() => {
            setLocalArrivedAt('');
            setArrivalGuardError('');
            setPhase('to_pickup');
            publishRideStatus('accepted');
          }}
          style={[st.h52, { flex: 1, borderWidth: 2, borderColor: tw.slate100 }]}
        >
          <Text style={[st.smallBtnText, { color: tw.slate400 }, fo(600)]}>Go Back</Text>
        </Press>
        <Press onPress={openSupportChat} style={[st.h52, { flex: 1, backgroundColor: routeAccentSoft }]}>
          <Text style={[st.smallBtnText, { color: routeStrokeColor }, fo(600)]}>Support</Text>
        </Press>
      </Row>
    </Sheet>
  );
}

function InTrip({ t }) {
  const {
    isParcel, tripData, triggerEmergencySos, callContact, destinationContact, dropDistanceMeters, canDeliverParcel, arrivalGuardError, setArrivalGuardError,
    publishRideStatus, setSelectedPaymentMode, setPaymentQr, setPaymentQrError, setDriverPaymentStatus, setPhase, routeStrokeColor, routeAccentSoft, routeAccentMuted, routeAccentBorder,
  } = t;
  return (
    <Sheet phaseKey="in_trip" padding={20}>
      <View style={st.destCard}>
        <Row style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[{ fontSize: 9, lineHeight: 9, textTransform: 'uppercase', letterSpacing: em(9, 0.22), marginBottom: 6, color: routeStrokeColor }, fo(600)]}>Destination</Text>
            <Text style={[{ fontSize: 15, lineHeight: 20, color: tw.slate900, letterSpacing: em(15, -0.025) }, fo(600)]}>{tripData.drop}</Text>
          </View>
          <Press
            scale={0.9}
            onPress={triggerEmergencySos}
            accessibilityLabel="Call emergency SOS"
            style={[st.sq44, { borderWidth: 1, backgroundColor: routeAccentSoft, borderColor: routeAccentBorder, boxShadow: SHADOW_SM }]}
          >
            <ShieldAlert size={22} strokeWidth={2.5} color={routeStrokeColor} />
          </Press>
        </Row>
      </View>
      <Row style={st.contactCard}>
        <Row style={{ gap: 12, flexShrink: 1 }}>
          <View style={{ width: 40, height: 40, backgroundColor: tw.slate900, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
            {isParcel ? <Package size={18} color="#fff" /> : <User size={18} color="#fff" style={{ opacity: 0.4 }} />}
          </View>
          <View style={{ gap: 2, flexShrink: 1 }}>
            <Text numberOfLines={1} style={[{ fontSize: 13, lineHeight: 13, color: tw.slate900, textTransform: 'uppercase' }, fo(600)]}>{isParcel ? tripData.receiver.name : tripData.user.name}</Text>
            <Text style={[{ fontSize: 8, color: tw.slate400, textTransform: 'uppercase', letterSpacing: em(8, 0.025) }, fo(600)]}>{isParcel ? 'Receiver' : 'Passenger'}</Text>
          </View>
        </Row>
        <Press onPress={() => callContact(destinationContact?.phone)} accessibilityLabel="Call destination contact" style={{ width: 36, height: 36, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center' }}>
          <Phone size={16} strokeWidth={2.5} color={routeStrokeColor} />
        </Press>
      </Row>
      {isParcel ? <RadiusCard label="Delivery Radius" value={`${Math.round(dropDistanceMeters)} m away from receiver`} unlocked={canDeliverParcel} /> : null}
      {isParcel && arrivalGuardError ? <GuardError>{arrivalGuardError}</GuardError> : null}
      <Press
        scale={0.96}
        onPress={() => {
          if (isParcel && !canDeliverParcel) {
            setArrivalGuardError('Reach within 100 meters of receiver before delivering parcel.');
            return;
          }

          setArrivalGuardError('');
          publishRideStatus('arrived');
          setSelectedPaymentMode('');
          setPaymentQr(null);
          setPaymentQrError('');
          setDriverPaymentStatus('pending');
          setPhase('payment_confirm');
        }}
        style={[st.bigBtn, { borderRadius: 12, backgroundColor: routeStrokeColor, boxShadow: `0 18px 30px ${routeAccentMuted}`, opacity: isParcel && !canDeliverParcel ? 0.7 : 1 }]}
      >
        <Text style={[st.bigBtnText, fo(600)]}>{isParcel ? 'Deliver Parcel' : 'Arrived at Destination'}</Text>
        <ChevronRight size={18} strokeWidth={3} color="#fff" />
      </Press>
    </Sheet>
  );
}

const SummaryCell = ({ Icon, label, value }) => (
  <View style={st.sumCell}>
    <Row style={{ gap: 8 }}>
      <Icon size={14} strokeWidth={2.5} color={tw.slate500} />
      <Text style={[{ fontSize: 9, color: tw.slate500, textTransform: 'uppercase', letterSpacing: em(9, 0.2) }, fo(900)]}>{label}</Text>
    </Row>
    <Text style={[{ marginTop: 8, fontSize: 13, lineHeight: 20, color: tw.slate900 }, fo(700)]}>{value}</Text>
  </View>
);

const MoneyCell = ({ label, value, sub, style, labelColor, valueColor }) => (
  <View style={[st.moneyCell, style]}>
    <Text style={[{ fontSize: 9, color: labelColor || tw.slate400, textTransform: 'uppercase', letterSpacing: em(9, 0.2) }, fo(900)]}>{label}</Text>
    <Text style={[{ marginTop: 8, fontSize: 14, color: valueColor || tw.slate900 }, fo(900)]}>{value}</Text>
    {sub ? <Text style={[{ marginTop: 4, fontSize: 9, color: tw.slate400, textTransform: 'uppercase', letterSpacing: em(9, 0.18) }, fo(700)]}>{sub}</Text> : null}
  </View>
);

// animate: top ['5%','95%','5%'] over 2.5s on the QR scan line.
function ScanLine({ height }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, boxShadow: '0 0 10px #34d399', transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [height * 0.05, height * 0.95] }) }] }}>
      <LinearGradient colors={['rgba(52,211,153,0)', tw.emerald400, 'rgba(52,211,153,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
    </Animated.View>
  );
}

function QrPanel({ t }) {
  const { paymentQr, displayFare, qrZoomed, setQrZoomed, setDriverPaymentStatus, routeStrokeColor } = t;
  const isInlineQrImage = String(paymentQr?.imageUrl || '').startsWith('data:image/');
  /*
   * Only Razorpay's own QR Code product produces a UPI QR a payment
   * app can read. That product, and UPI payment links, are live-mode
   * only -- on test keys both are refused and we fall back to a
   * standard payment link, whose QR encodes an https://rzp.io URL.
   * Scanning that in GPay or PhonePe just fails, so say plainly that
   * it opens a payment page instead of calling it a collection QR.
   */
  const isUpiScannableQr = String(paymentQr?.providerMode || '') === 'razorpay_qr';
  const zoom = useAnimatedValue(qrZoomed ? 1 : 0);
  useEffect(() => {
    Animated.timing(zoom, { toValue: qrZoomed ? 1 : 0, duration: 400, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }).start();
  }, [qrZoomed, zoom]);
  const toggle = () => !isInlineQrImage && setQrZoomed(!qrZoomed);
  const imgTransform = isInlineQrImage
    ? undefined
    : [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 2.85] }) }, { translateY: zoom.interpolate({ inputRange: [0, 1], outputRange: [0, -0.025 * 232] }) }];

  return (
    <View style={[st.qrCard, { backgroundColor: routeStrokeColor }]}>
      <Press scale={isInlineQrImage ? 1 : 0.98} onPress={toggle} style={[st.qrBox, !isInlineQrImage ? { boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' } : null]}>
        <Animated.Image
          source={{ uri: paymentQr?.imageUrl }}
          accessibilityLabel={`Payment QR for ${displayFare}`}
          style={[{ width: '100%', height: '100%' }, imgTransform ? { transform: imgTransform } : null]}
          resizeMode="contain"
        />
        {!isInlineQrImage ? (
          <View style={st.qrBadge}>
            <Scan size={10} strokeWidth={2.5} color={tw.emerald400} />
            <Text style={[{ fontSize: 9, color: '#fff' }, fo(700)]}>{qrZoomed ? 'ZOOMED' : 'FIT'}</Text>
          </View>
        ) : null}
        <ScanLine height={256} />
      </Press>
      <Text style={[{ color: '#fff', fontSize: 14, lineHeight: 20, textTransform: 'uppercase', letterSpacing: em(14, 0.025), textAlign: 'center' }, fo(600)]}>
        {isUpiScannableQr ? `Scan to pay ${displayFare}` : `Open to pay ${displayFare}`}
      </Text>
      <Text onPress={toggle} style={[{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 4, marginBottom: 16, textTransform: 'uppercase', letterSpacing: em(10, 0.025), textAlign: 'center' }, fo(600)]}>
        {!isUpiScannableQr
          ? 'Payment page link — scan with the camera app, not a UPI app'
          : qrZoomed
            ? 'Tap QR to see full Razorpay receipt'
            : 'Tap QR to zoom scan area'}
      </Text>
      {paymentQr?.linkUrl ? (
        <Press
          scale={1}
          onPress={() => openExternal(paymentQr.linkUrl)}
          style={isUpiScannableQr ? { marginBottom: 12, alignItems: 'center' } : { marginBottom: 12, width: '100%', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, alignItems: 'center' }}
        >
          <Text
            style={isUpiScannableQr
              ? [{ fontSize: 10, textTransform: 'uppercase', letterSpacing: em(10, 0.025), color: 'rgba(255,255,255,0.7)', textDecorationLine: 'underline' }, fo(600)]
              : [{ fontSize: 11, textTransform: 'uppercase', letterSpacing: em(11, 0.025), color: '#fff' }, fo(700)]}
          >
            Open payment link
          </Text>
        </Press>
      ) : null}
      <Press scale={1} onPress={() => setDriverPaymentStatus('success')} style={{ width: '100%', paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center' }}>
        <Text style={[{ color: '#fff', fontSize: 10, textTransform: 'uppercase', letterSpacing: em(10, 0.025) }, fo(600)]}>Confirm Received</Text>
      </Press>
    </View>
  );
}

function PaymentConfirm({ t }) {
  const {
    isParcel, driverPaymentStatus, tripSummaryTitle, tripSummarySubtitle, displayFare, paymentModeLabel, tripStartedAt, tripArrivedAt, tripDurationLabel,
    commissionSummary, fareAmount, tripData, destinationRoleLabel, destinationContact, callContact, allowedPaymentModes, handlePaymentModeSelect, isGeneratingPaymentQr,
    selectedPaymentMode, paymentQrError, paymentCollectionLabel, completeRideForUserSync, setPhase, effectiveState, liveRequest, routeStrokeColor, routeAccentSoft, routeAccentMuted,
  } = t;
  const success = driverPaymentStatus === 'success';
  const finalizeReady = success && selectedPaymentMode !== 'cash';
  const fade = useAnimatedValue(0);
  useEffect(() => {
    if (selectedPaymentMode === 'cash' && success) Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    else fade.setValue(0);
  }, [selectedPaymentMode, success, fade]);
  return (
    <Sheet phaseKey="payment_confirm">
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: success ? routeStrokeColor : '#0f172a', boxShadow: SHADOW_LG }}>
          {success ? <Check size={32} strokeWidth={4} color="#fff" /> : <QrCode size={32} strokeWidth={2} color="#fff" />}
        </View>
        <Text style={[{ fontSize: 24, lineHeight: 32, color: tw.slate900, textTransform: 'uppercase' }, fo(600)]}>{success ? 'Payment Success!' : tripSummaryTitle}</Text>
        <Text style={[{ fontSize: 12, color: tw.slate400, marginTop: 4, textTransform: 'uppercase', letterSpacing: em(12, 0.025), textAlign: 'center' }, fo(700)]}>
          {success ? 'Ready to close this trip' : tripSummarySubtitle}
        </Text>
      </View>

      <View style={{ marginBottom: 24, borderRadius: 28, boxShadow: '0 18px 45px rgba(15,23,42,0.07)' }}>
        <LinearGradient colors={['#f8fafc', '#ffffff']} style={{ borderRadius: 28, borderWidth: 1, borderColor: tw.slate100, overflow: 'hidden' }}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: tw.slate100, paddingHorizontal: 20, paddingVertical: 16 }}>
            <Row style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ minWidth: 0, flexShrink: 1 }}>
                <Text style={[{ fontSize: 10, textTransform: 'uppercase', letterSpacing: em(10, 0.24), color: routeStrokeColor }, fo(900)]}>{tripSummaryTitle}</Text>
                <Text style={[{ marginTop: 8, fontSize: 24, color: tw.slate900, letterSpacing: em(24, -0.025) }, fo(900)]}>{displayFare}</Text>
                <Text style={[{ fontSize: 11, color: tw.slate500 }, fo(600)]}>
                  {isParcel ? 'Parcel delivered and awaiting payment confirmation.' : 'Passenger reached destination and ready to complete.'}
                </Text>
              </View>
              <View style={{ borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-end', backgroundColor: routeAccentSoft }}>
                <Text style={[{ fontSize: 9, textTransform: 'uppercase', letterSpacing: em(9, 0.2), color: tw.slate500 }, fo(900)]}>Payment</Text>
                <Text style={[{ marginTop: 4, fontSize: 13, color: tw.slate900 }, fo(900)]}>{paymentModeLabel}</Text>
              </View>
            </Row>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, paddingVertical: 16 }}>
            <SummaryCell Icon={Clock3} label="Trip Started" value={formatDateTimeLabel(tripStartedAt)} />
            <SummaryCell Icon={CheckCircle2} label="Reached At" value={formatDateTimeLabel(tripArrivedAt)} />
            <SummaryCell Icon={ArrowUpRight} label="Trip Duration" value={tripDurationLabel} />
            <SummaryCell Icon={Banknote} label="Your Earnings" value={formatCurrencyAmount(commissionSummary.driverEarnings)} />
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: tw.slate100, paddingHorizontal: 20, paddingVertical: 16 }}>
            <View style={st.inner28}>
              <Row style={{ alignItems: 'flex-start', gap: 12 }}>
                <View style={{ marginTop: 4, alignItems: 'center' }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: tw.emerald500 }} />
                  <View style={{ marginVertical: 4, height: 40, width: 0, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: tw.slate200 }} />
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: tw.rose500 }} />
                </View>
                <View style={{ minWidth: 0, flex: 1, gap: 16 }}>
                  <View>
                    <Text style={[st.tiny9, { letterSpacing: em(9, 0.22) }, fo(900)]}>Pickup</Text>
                    <Text style={[{ marginTop: 4, fontSize: 13, lineHeight: 20, color: tw.slate900 }, fo(700)]}>{tripData.pickup}</Text>
                  </View>
                  <View>
                    <Text style={[st.tiny9, { letterSpacing: em(9, 0.22) }, fo(900)]}>Destination</Text>
                    <Text style={[{ marginTop: 4, fontSize: 13, lineHeight: 20, color: tw.slate900 }, fo(700)]}>{tripData.drop}</Text>
                  </View>
                </View>
              </Row>
            </View>
            <View style={[st.inner28, { marginTop: 16 }]}>
              <Row style={{ justifyContent: 'space-between', gap: 12 }}>
                <Row style={{ gap: 12, flexShrink: 1 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: tw.slate900, alignItems: 'center', justifyContent: 'center' }}>
                    {isParcel ? <Package size={18} strokeWidth={2.5} color="#fff" /> : <User size={18} strokeWidth={2.5} color="#fff" />}
                  </View>
                  <View style={{ minWidth: 0, flexShrink: 1 }}>
                    <Text style={[st.tiny9, { letterSpacing: em(9, 0.2) }, fo(900)]}>{destinationRoleLabel}</Text>
                    <Text numberOfLines={1} style={[{ marginTop: 4, fontSize: 14, color: tw.slate900 }, fo(900)]}>{destinationContact?.name || '--'}</Text>
                    <Text style={[{ fontSize: 11, color: tw.slate500 }, fo(600)]}>{destinationContact?.phone || 'Phone not available'}</Text>
                  </View>
                </Row>
                <Press onPress={() => callContact(destinationContact?.phone)} accessibilityLabel="Call destination contact" style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={16} strokeWidth={2.5} color={tw.slate700} />
                </Press>
              </Row>
            </View>
          </View>
          <Row style={{ borderTopWidth: 1, borderTopColor: tw.slate100, paddingHorizontal: 20, paddingVertical: 16, gap: 12, alignItems: 'stretch' }}>
            <MoneyCell label="Trip Fare" value={formatCurrencyAmount(fareAmount)} />
            <MoneyCell label="Admin Cut" value={formatCurrencyAmount(commissionSummary.commissionAmount)} sub={commissionSummary.commissionLabel} />
            <MoneyCell label="Driver Gets" value={formatCurrencyAmount(commissionSummary.driverEarnings)} style={{ backgroundColor: routeStrokeColor, boxShadow: '0 10px 24px rgba(15,23,42,0.12)' }} labelColor="rgba(255,255,255,0.65)" valueColor="#fff" />
          </Row>
        </LinearGradient>
      </View>

      {driverPaymentStatus === 'pending' ? (
        <Row style={{ gap: 12, marginBottom: 24 }}>
          {[
            { id: 'cash', label: 'Cash', icon: Banknote },
            { id: 'online', label: 'Online', icon: Scan },
          ].filter((mode) => allowedPaymentModes.includes(mode.id)).map((mode) => {
            const selected = selectedPaymentMode === mode.id;
            const ModeIcon = mode.icon;
            return (
              <Press
                key={mode.id}
                scale={1}
                onPress={() => handlePaymentModeSelect(mode.id)}
                disabled={isGeneratingPaymentQr}
                style={[st.modeBtn, selected ? { borderColor: routeStrokeColor, backgroundColor: routeAccentSoft } : null]}
              >
                <ModeIcon size={22} strokeWidth={2.5} color={selected ? routeStrokeColor : tw.slate400} />
                <Text style={[{ fontSize: 9, color: tw.slate900, textTransform: 'uppercase', letterSpacing: em(9, 0.025), marginTop: 8 }, fo(600)]}>
                  {mode.id === 'online' && isGeneratingPaymentQr ? 'Generating' : mode.label}
                </Text>
              </Press>
            );
          })}
        </Row>
      ) : null}

      {paymentQrError ? (
        <View style={{ marginBottom: 24, borderRadius: 16, borderWidth: 1, borderColor: tw.red100, backgroundColor: tw.red50, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={[{ fontSize: 11, color: tw.red500, textAlign: 'center' }, fo(700)]}>{paymentQrError}</Text>
        </View>
      ) : null}

      {selectedPaymentMode === 'cash' && success ? (
        <Animated.View style={[st.cashCard, { opacity: fade }]}>
          <View style={{ width: 56, height: 56, borderRadius: 16, marginBottom: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: routeStrokeColor, boxShadow: SHADOW_LG }}>
            <Banknote size={24} strokeWidth={2.5} color="#fff" />
          </View>
          <Text style={[{ fontSize: 10, textTransform: 'uppercase', letterSpacing: em(10, 0.18), color: tw.emerald700 }, fo(900)]}>Cash Selected</Text>
          <Text style={[{ marginTop: 8, fontSize: 16, color: tw.slate900, textAlign: 'center' }, fo(900)]}>Collect {displayFare} from the {paymentCollectionLabel}</Text>
          <Text style={[{ marginTop: 4, fontSize: 11, color: tw.slate500, textAlign: 'center' }, fo(700)]}>
            Once you have the cash in hand, tap below to close this {isParcel ? 'delivery' : 'ride'}.
          </Text>
          <Press
            scale={0.95}
            onPress={async () => {
              await completeRideForUserSync('cash');
              setPhase('review');
            }}
            style={{ marginTop: 16, width: '100%', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: routeStrokeColor, boxShadow: `0 16px 28px ${routeAccentMuted}` }}
          >
            <Text style={[{ fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: em(11, 0.16) }, fo(900)]}>Cash Received</Text>
          </Press>
        </Animated.View>
      ) : null}

      {driverPaymentStatus === 'qr_generated' ? <QrPanel t={t} /> : null}

      <Press
        scale={0.96}
        disabled={!success || selectedPaymentMode === 'cash'}
        onPress={async () => {
          const paymentMode = selectedPaymentMode || effectiveState?.paymentMethod || liveRequest?.payment || '';
          await completeRideForUserSync(paymentMode);
          setPhase('review');
        }}
        pointerEvents={finalizeReady ? 'auto' : 'none'}
        style={[st.bigBtn, { borderRadius: 12 }, finalizeReady ? { backgroundColor: routeStrokeColor, boxShadow: `0 18px 30px ${routeAccentMuted}` } : { backgroundColor: tw.slate100, boxShadow: SHADOW_XL }]}
      >
        <Text style={[st.bigBtnText, { color: finalizeReady ? '#fff' : tw.slate300 }, fo(600)]}>
          {selectedPaymentMode === 'cash'
            ? 'Use Cash Received Button'
            : success
              ? 'Finalize Earnings'
              : 'Waiting...'}
        </Text>
        <ChevronRight size={18} strokeWidth={3} color={finalizeReady ? '#fff' : tw.slate300} />
      </Press>
    </Sheet>
  );
}

function Review({ t }) {
  const { selectedRating, setSelectedRating, completeRideAndExit, routeStrokeColor, routeAccentMuted } = t;
  return (
    <Sheet phaseKey="review" fade extra={{ borderTopColor: tw.slate50 }}>
      <View style={{ alignItems: 'center', marginBottom: 32, gap: 16 }}>
        <View style={{ width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: routeStrokeColor, boxShadow: SHADOW_LG }}><User size={24} color="#fff" /></View>
        <Text style={[{ fontSize: 20, lineHeight: 28, color: tw.slate900, textTransform: 'uppercase', letterSpacing: em(20, -0.025) }, fo(600)]}>Rate Experience</Text>
        <Row style={{ justifyContent: 'center', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((score) => (
            <Press key={score} scale={1} onPress={() => setSelectedRating(score)}>
              <Star size={28} strokeWidth={2} color={score <= selectedRating ? routeStrokeColor : tw.slate100} fill={score <= selectedRating ? routeStrokeColor : 'transparent'} />
            </Press>
          ))}
        </Row>
      </View>
      <Press onPress={completeRideAndExit} style={[st.bigBtn, { borderRadius: 12, backgroundColor: routeStrokeColor, boxShadow: `0 18px 30px ${routeAccentMuted}` }]}>
        <Text style={[st.bigBtnText, fo(600)]}>Done</Text>
        <Check size={20} strokeWidth={4} color="#fff" />
      </Press>
    </Sheet>
  );
}

export default function TripPhaseSheets({ t }) {
  const { phase } = t;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40 }}>
      {phase === 'to_pickup' ? <ToPickup t={t} /> : null}
      {phase === 'otp_verification' ? <OtpVerification t={t} /> : null}
      {phase === 'in_trip' ? <InTrip t={t} /> : null}
      {phase === 'payment_confirm' ? <PaymentConfirm t={t} /> : null}
      {phase === 'review' ? <Review t={t} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, borderTopWidth: 1, borderTopColor: tw.slate100, boxShadow: SHADOW_2XL, overflow: 'hidden' },
  tiny9: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.98, color: tw.slate400 },
  avatar48: { width: 48, height: 48, backgroundColor: tw.slate50, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  sq44: { width: 44, height: 44, backgroundColor: tw.slate50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  radiusCard: { marginBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, backgroundColor: 'rgba(248,250,252,0.8)', paddingHorizontal: 16, paddingVertical: 12 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  bigBtn: { width: '100%', height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  bigBtnText: { fontSize: 14, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.35 },
  h52: { height: 52, width: '100%', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  smallBtnText: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 },
  waitBox: { marginBottom: 24, borderRadius: 24, borderWidth: 1, borderColor: tw.amber100, backgroundColor: 'rgba(255,251,235,0.7)', paddingHorizontal: 16, paddingVertical: 16, boxShadow: SHADOW_SM },
  waitIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW_SM },
  waitCell: { flex: 1, borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 12, boxShadow: SHADOW_SM },
  otpBox: { width: 48, height: 64, backgroundColor: tw.slate50, borderWidth: 2, borderRadius: 16, textAlign: 'center', fontSize: 30, color: tw.slate900, padding: 0, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' },
  destCard: { marginBottom: 20, borderRadius: 22, borderWidth: 1, borderColor: tw.slate100, backgroundColor: 'rgba(248,250,252,0.85)', paddingHorizontal: 16, paddingVertical: 14, boxShadow: '0 2px 10px rgba(15,23,42,0.04)' },
  contactCard: { backgroundColor: tw.slate50, borderRadius: 16, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: tw.slate100, justifyContent: 'space-between', gap: 12 },
  sumCell: { width: '47.5%', flexGrow: 1, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12 },
  inner28: { borderRadius: 24, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', padding: 16, boxShadow: '0 8px 22px rgba(15,23,42,0.04)' },
  moneyCell: { flex: 1, borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', boxShadow: '0 8px 20px rgba(15,23,42,0.04)' },
  modeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: tw.gray200, backgroundColor: 'rgba(248,250,252,0.5)' },
  cashCard: { marginBottom: 24, borderRadius: 24, borderWidth: 1, borderColor: tw.emerald100, backgroundColor: 'rgba(236,253,245,0.8)', padding: 20, alignItems: 'center', boxShadow: SHADOW_LG },
  qrCard: { borderRadius: 24, padding: 20, marginBottom: 24, alignItems: 'center', boxShadow: SHADOW_2XL },
  qrBox: { width: '100%', maxWidth: 256, height: 256, alignSelf: 'center', marginBottom: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#fff', padding: 12, overflow: 'hidden' },
  qrBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,23,43,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', boxShadow: SHADOW_LG },
});
