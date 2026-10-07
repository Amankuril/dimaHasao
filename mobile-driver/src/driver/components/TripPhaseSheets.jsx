import { useEffect } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpRight, Banknote, Check, CheckCircle2, ChevronRight, Clock3, MessageSquare, Package, Phone, QrCode, Scan, ShieldAlert, Star, User } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { useKeyboardHeight } from '../../lib/useKeyboard';
import { openExternal } from '../../lib/links';
import { outfit, shadow } from '../../theme';
import Text from './UpperText';
import { Card, Chip, CtaButton } from '../ui/Surface';
import { DT } from '../ui/dt';
import { formatCurrencyAmount, formatDateTimeLabel, formatTimerClock, formatWholeMinutes } from '../utils/activeTripHelpers';

// Web: the bottom sheets of Taxi/modules/driver/pages/ActiveTrip.jsx, one per phase
// (to_pickup, otp_verification, in_trip, payment_confirm, review).
// Look: the user app's taxi bottom sheets: white rounded sheet, a phase chip, round action buttons,
// a route card, and one large primary button per phase.

const fo = outfit;

// framer-motion initial {y:'100%'} -> animate {y:0} (or an opacity fade for the review sheet).
function Sheet({ phaseKey, fade, padding = 20, extra, children }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Android is edge-to-edge: the keyboard does not resize the window, so the sheet is lifted by hand (the PIN boxes).
  const keyboard = useKeyboardHeight();
  const v = useAnimatedValue(0);
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [phaseKey, v]);
  const anim = fade ? { opacity: v } : { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [height * 0.88, 0] }) }] };
  return (
    <Animated.View style={[st.sheet, { maxHeight: (height - keyboard) * 0.88 }, anim, extra]}>
      <View style={st.handle} />
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding, paddingTop: 8, paddingBottom: 24 + (keyboard > 0 ? 0 : insets.bottom) }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const Row = ({ style, children }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;

const Label = ({ children, style }) => <Text style={[st.label, style]}>{children}</Text>;

// The phase title chip row at the top of every sheet; `right` holds a trailing action (the SOS pill).
const PhaseHeader = ({ label, tone = 'brand', right = null }) => (
  <Row style={{ justifyContent: 'space-between', marginBottom: 16, minHeight: 36 }}>
    <Chip label={label} tone={tone} />
    {right}
  </Row>
);

const RoundBtn = ({ onPress, label, children, tone = 'soft' }) => (
  <Press onPress={onPress} accessibilityLabel={label} scale={0.92} style={[st.round, tone === 'soft' ? { backgroundColor: DT.brandSoft } : { backgroundColor: DT.bgSoft }]}>
    {children}
  </Press>
);

function RiderRow({ name, meta, isParcel, children }) {
  return (
    <Row style={[st.riderCard, { justifyContent: 'space-between', gap: 12 }]}>
      <Row style={{ gap: 12, flexShrink: 1, minWidth: 0 }}>
        <View style={st.avatar}>{isParcel ? <Package size={22} color={DT.accent} /> : <User size={22} color={DT.accent} />}</View>
        <View style={{ gap: 2, flexShrink: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[{ fontSize: 16, color: DT.ink }, fo(700)]}>{name}</Text>
          {meta}
        </View>
      </Row>
      {children ? <Row style={{ gap: 8 }}>{children}</Row> : null}
    </Row>
  );
}

// Green pickup dot and orange drop dot, like the user app's route card.
function RouteCard({ pickup, drop, highlight }) {
  return (
    <Card style={st.routeCard}>
      <Row style={{ alignItems: 'flex-start', gap: 14 }}>
        <View style={{ alignItems: 'center', paddingTop: 3 }}>
          <View style={[st.dot, { backgroundColor: DT.success }]} />
          <View style={st.dash} />
          <View style={[st.dot, { backgroundColor: DT.warn }]} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 14 }}>
          <View>
            <Label style={{ color: DT.successInk }}>Pickup</Label>
            <Text numberOfLines={2} style={[st.addr, fo(highlight === 'pickup' ? 800 : 600)]}>{pickup}</Text>
          </View>
          <View>
            <Label style={{ color: DT.warnInk }}>Destination</Label>
            <Text numberOfLines={2} style={[st.addr, fo(highlight === 'drop' ? 800 : 600)]}>{drop}</Text>
          </View>
        </View>
      </Row>
    </Card>
  );
}

function RadiusCard({ label, value, unlocked }) {
  return (
    <View style={st.radiusCard}>
      <Row style={{ justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Label>{label}</Label>
          <Text style={[{ marginTop: 4, fontSize: 13, color: DT.ink }, fo(800)]}>{value}</Text>
        </View>
        <Chip label={unlocked ? 'Unlocked' : 'Within 100 m'} tone={unlocked ? 'success' : 'warn'} style={{ alignSelf: 'center' }} />
      </Row>
    </View>
  );
}

const GuardError = ({ children }) => (
  <Text style={[{ marginBottom: 12, textAlign: 'center', fontSize: 12, lineHeight: 17, color: DT.dangerInk }, fo(700)]}>{children}</Text>
);

function ToPickup({ t }) {
  const { isParcel, tripData, riderDistanceLabel, openTripChat, callContact, pickupContact, pickupDistanceMeters, canMarkArrived, arrivalGuardError, setArrivalGuardError, setLocalArrivedAt, setPhase, publishRideStatus } = t;
  return (
    <Sheet phaseKey="to_pickup">
      <PhaseHeader label="Heading to pickup" />
      <RiderRow
        isParcel={isParcel}
        name={isParcel ? tripData.sender.name : tripData.user.name}
        meta={(
          <Row style={{ gap: 6 }}>
            <Star size={12} fill={DT.goldBright} color={DT.goldBright} />
            <Text numberOfLines={1} style={[{ fontSize: 12, color: DT.muted }, fo(600)]}>
              {isParcel ? tripData.sender.rating : tripData.user.rating} • {riderDistanceLabel}
            </Text>
          </Row>
        )}
      >
        <RoundBtn onPress={openTripChat} label="Open trip chat" tone="neutral"><MessageSquare size={18} strokeWidth={2.5} color={DT.inkSoft} /></RoundBtn>
        <RoundBtn onPress={() => callContact(pickupContact?.phone)} label="Call contact"><Phone size={18} strokeWidth={2.5} color={DT.brand} /></RoundBtn>
      </RiderRow>
      <RouteCard pickup={tripData.pickup} drop={tripData.drop} highlight="pickup" />
      <RadiusCard label="Arrival Radius" value={`${Math.round(pickupDistanceMeters)} m away from pickup`} unlocked={canMarkArrived} />
      {arrivalGuardError ? <GuardError>{arrivalGuardError}</GuardError> : null}
      <CtaButton
        title={isParcel ? 'Arrived at Sender' : 'I Have Arrived'}
        icon={<CheckCircle2 size={18} strokeWidth={3} color={DT.ctaInk} />}
        style={[st.primary, { opacity: canMarkArrived ? 1 : 0.7 }]}
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
      />
    </Sheet>
  );
}

function OtpVerification({ t }) {
  const {
    isParcel, isWaitingForOtp, waitingElapsedSeconds, freeWaitingRemainingSeconds, freeWaitingBeforeMinutes, waitingChargePerMinute, waitingChargeableMinutes,
    otp, otpInputRefs, handleOTPChange, handleOTPKeyDown, otpError, startTripAfterOtp, setLocalArrivedAt, setArrivalGuardError, setPhase, publishRideStatus,
    openSupportChat,
  } = t;
  return (
    <Sheet phaseKey="otp_verification">
      <PhaseHeader label="Verify PIN" />
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={[{ fontSize: 22, lineHeight: 28, color: DT.ink }, fo(800)]}>Security Pin</Text>
        <Text style={[{ fontSize: 13, color: DT.muted, marginTop: 4, textAlign: 'center' }, fo(600)]}>
          Ask <Text style={{ color: DT.ink, ...fo(800) }}>{isParcel ? 'Sender' : 'Passenger'}</Text> for the Start PIN
        </Text>
      </View>
      {isWaitingForOtp ? (
        <View style={st.waitBox}>
          <Row style={{ justifyContent: 'space-between', gap: 12 }}>
            <Row style={{ gap: 12 }}>
              <View style={st.waitIcon}><Clock3 size={18} strokeWidth={2.5} color={DT.warn} /></View>
              <View>
                <Label style={{ color: DT.warnInk }}>Waiting Clock</Label>
                <Text style={[{ marginTop: 2, fontSize: 22, color: DT.ink }, fo(900)]}>{formatTimerClock(waitingElapsedSeconds)}</Text>
              </View>
            </Row>
            <View style={{ alignItems: 'flex-end' }}>
              <Label>Free Left</Label>
              <Text style={[{ marginTop: 4, fontSize: 14, color: DT.ink }, fo(800)]}>{formatTimerClock(freeWaitingRemainingSeconds)}</Text>
            </View>
          </Row>
          <Row style={{ marginTop: 14, gap: 12, alignItems: 'stretch' }}>
            <View style={st.waitCell}>
              <Label>Free Before Ride</Label>
              <Text style={[{ marginTop: 4, fontSize: 13, color: DT.ink }, fo(800)]}>{formatWholeMinutes(freeWaitingBeforeMinutes)}</Text>
            </View>
            <View style={st.waitCell}>
              <Label>Waiting Charge</Label>
              <Text style={[{ marginTop: 4, fontSize: 13, color: DT.ink }, fo(800)]}>
                Rs {waitingChargePerMinute}/min
                {waitingChargeableMinutes > 0 ? ` • ${waitingChargeableMinutes} billable` : ''}
              </Text>
            </View>
          </Row>
        </View>
      ) : null}
      <Row style={{ justifyContent: 'center', gap: 12, marginBottom: 20 }}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(node) => { otpInputRefs.current[index] = node; }}
            keyboardType="phone-pad"
            maxLength={1}
            value={digit}
            onChangeText={(value) => handleOTPChange(index, value)}
            onKeyPress={(e) => handleOTPKeyDown(index, e)}
            style={[st.otpBox, digit ? { borderColor: DT.brand, backgroundColor: DT.brandSoft } : null, fo(700)]}
          />
        ))}
      </Row>
      {otpError ? (
        <Text style={[{ marginTop: -8, marginBottom: 14, textAlign: 'center', fontSize: 12, color: DT.dangerInk }, fo(700)]}>{otpError}</Text>
      ) : null}
      <CtaButton title="Submit PIN" style={[st.primary, { marginBottom: 12 }]} onPress={() => startTripAfterOtp(otp.join(''))} />
      <Row style={{ gap: 12 }}>
        <CtaButton
          variant="outline"
          title="Go Back"
          style={st.secondary}
          onPress={() => {
            setLocalArrivedAt('');
            setArrivalGuardError('');
            setPhase('to_pickup');
            publishRideStatus('accepted');
          }}
        />
        <CtaButton variant="soft" title="Support" style={st.secondary} onPress={openSupportChat} />
      </Row>
    </Sheet>
  );
}

function InTrip({ t }) {
  const {
    isParcel, tripData, triggerEmergencySos, callContact, destinationContact, dropDistanceMeters, canDeliverParcel, arrivalGuardError, setArrivalGuardError,
    publishRideStatus, setSelectedPaymentMode, setPaymentQr, setPaymentQrError, setDriverPaymentStatus, setPhase,
  } = t;
  return (
    <Sheet phaseKey="in_trip">
      <PhaseHeader
        label="On trip"
        tone="success"
        right={(
          <Press scale={0.94} onPress={triggerEmergencySos} accessibilityLabel="Call emergency SOS" style={st.sos}>
            <ShieldAlert size={18} strokeWidth={2.5} color={DT.onBrand} />
            <Text style={[{ fontSize: 13, color: DT.onBrand, minWidth: 28 }, fo(800)]}>SOS</Text>
          </Press>
        )}
      />
      <RouteCard pickup={tripData.pickup} drop={tripData.drop} highlight="drop" />
      <RiderRow
        isParcel={isParcel}
        name={isParcel ? tripData.receiver.name : tripData.user.name}
        meta={<Text style={[{ fontSize: 12, color: DT.muted }, fo(600)]}>{isParcel ? 'Receiver' : 'Passenger'}</Text>}
      >
        <RoundBtn onPress={() => callContact(destinationContact?.phone)} label="Call destination contact"><Phone size={18} strokeWidth={2.5} color={DT.brand} /></RoundBtn>
      </RiderRow>
      {isParcel ? <RadiusCard label="Delivery Radius" value={`${Math.round(dropDistanceMeters)} m away from receiver`} unlocked={canDeliverParcel} /> : null}
      {isParcel && arrivalGuardError ? <GuardError>{arrivalGuardError}</GuardError> : null}
      <CtaButton
        title={isParcel ? 'Deliver Parcel' : 'Arrived at Destination'}
        icon={<ChevronRight size={18} strokeWidth={3} color={DT.ctaInk} />}
        style={[st.primary, { opacity: isParcel && !canDeliverParcel ? 0.7 : 1 }]}
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
      />
    </Sheet>
  );
}

const SummaryCell = ({ Icon, label, value }) => (
  <View style={st.sumCell}>
    <Row style={{ gap: 8 }}>
      <Icon size={14} strokeWidth={2.5} color={DT.muted} />
      <Label style={{ flexShrink: 1 }}>{label}</Label>
    </Row>
    <Text style={[{ marginTop: 6, fontSize: 13, lineHeight: 19, color: DT.ink }, fo(700)]}>{value}</Text>
  </View>
);

const MoneyCell = ({ label, value, sub, style, labelColor, valueColor }) => (
  <View style={[st.moneyCell, style]}>
    <Label style={{ color: labelColor || DT.muted }}>{label}</Label>
    <Text style={[{ marginTop: 6, fontSize: 14, color: valueColor || DT.ink }, fo(900)]}>{value}</Text>
    {sub ? <Text style={[{ marginTop: 2, fontSize: 10, color: labelColor || DT.muted }, fo(700)]}>{sub}</Text> : null}
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
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: DT.success, opacity: 0.8, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [height * 0.05, height * 0.95] }) }] }} />
  );
}

function QrPanel({ t }) {
  const { paymentQr, displayFare, qrZoomed, setQrZoomed, setDriverPaymentStatus } = t;
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
    <View style={st.qrCard}>
      <Press scale={isInlineQrImage ? 1 : 0.98} onPress={toggle} style={st.qrBox}>
        <Animated.Image
          source={{ uri: paymentQr?.imageUrl }}
          accessibilityLabel={`Payment QR for ${displayFare}`}
          style={[{ width: '100%', height: '100%' }, imgTransform ? { transform: imgTransform } : null]}
          resizeMode="contain"
        />
        {!isInlineQrImage ? (
          <View style={st.qrBadge}>
            <Scan size={10} strokeWidth={2.5} color={DT.accent} />
            <Text style={[{ fontSize: 10, color: DT.onBrand, minWidth: 36 }, fo(700)]}>{qrZoomed ? 'ZOOMED' : 'FIT'}</Text>
          </View>
        ) : null}
        <ScanLine height={256} />
      </Press>
      <Text style={[{ color: DT.onBrand, fontSize: 16, lineHeight: 22, textAlign: 'center' }, fo(800)]}>
        {isUpiScannableQr ? `Scan to pay ${displayFare}` : `Open to pay ${displayFare}`}
      </Text>
      <Text onPress={toggle} style={[{ color: DT.onBrandMuted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 16, textAlign: 'center' }, fo(600)]}>
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
          style={isUpiScannableQr ? { marginBottom: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' } : { marginBottom: 12, width: '100%', minHeight: 48, borderRadius: DT.radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            style={isUpiScannableQr
              ? [{ fontSize: 13, color: DT.onBrandMuted, textDecorationLine: 'underline' }, fo(600)]
              : [{ fontSize: 13, color: DT.onBrand }, fo(700)]}
          >
            Open payment link
          </Text>
        </Press>
      ) : null}
      <CtaButton title="Confirm Received" style={{ width: '100%' }} onPress={() => setDriverPaymentStatus('success')} />
    </View>
  );
}

function PaymentConfirm({ t }) {
  const {
    isParcel, driverPaymentStatus, tripSummaryTitle, tripSummarySubtitle, displayFare, paymentModeLabel, tripStartedAt, tripArrivedAt, tripDurationLabel,
    commissionSummary, fareAmount, tripData, destinationRoleLabel, destinationContact, callContact, allowedPaymentModes, handlePaymentModeSelect, isGeneratingPaymentQr,
    selectedPaymentMode, paymentQrError, paymentCollectionLabel, completeRideForUserSync, setPhase, effectiveState, liveRequest,
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
      <PhaseHeader label={success ? 'Payment done' : 'Collect payment'} tone={success ? 'success' : 'warn'} />
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View style={[st.bigIcon, { backgroundColor: success ? DT.success : DT.dark }]}>
          {success ? <Check size={30} strokeWidth={4} color={DT.onBrand} /> : <QrCode size={30} strokeWidth={2} color={DT.onBrand} />}
        </View>
        <Text style={[{ fontSize: 22, lineHeight: 30, color: DT.ink, textAlign: 'center' }, fo(800)]}>{success ? 'Payment Success!' : tripSummaryTitle}</Text>
        <Text style={[{ fontSize: 13, color: DT.muted, marginTop: 2, textAlign: 'center' }, fo(600)]}>
          {success ? 'Ready to close this trip' : tripSummarySubtitle}
        </Text>
      </View>

      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20, borderRadius: DT.radius.xl }}>
        {/* Fare header: slate-900 summary card like the user app's ride detail */}
        <View style={st.fareHead}>
          <Row style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ minWidth: 0, flexShrink: 1 }}>
              <Label style={{ color: DT.accent }}>{tripSummaryTitle}</Label>
              <Text style={[{ marginTop: 6, fontSize: 32, lineHeight: 38, color: DT.onBrand }, fo(900)]}>{displayFare}</Text>
              <Text style={[{ marginTop: 2, fontSize: 12, lineHeight: 17, color: DT.onBrandMuted }, fo(600)]}>
                {isParcel ? 'Parcel delivered and awaiting payment confirmation.' : 'Passenger reached destination and ready to complete.'}
              </Text>
            </View>
            <View style={st.payTag}>
              <Label style={{ color: DT.onBrandMuted }}>Payment</Label>
              <Text style={[{ marginTop: 2, fontSize: 13, color: DT.onBrand }, fo(800)]}>{paymentModeLabel}</Text>
            </View>
          </Row>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 }}>
          <SummaryCell Icon={Clock3} label="Trip Started" value={formatDateTimeLabel(tripStartedAt)} />
          <SummaryCell Icon={CheckCircle2} label="Reached At" value={formatDateTimeLabel(tripArrivedAt)} />
          <SummaryCell Icon={ArrowUpRight} label="Trip Duration" value={tripDurationLabel} />
          <SummaryCell Icon={Banknote} label="Your Earnings" value={formatCurrencyAmount(commissionSummary.driverEarnings)} />
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: DT.borderSoft, padding: 16, gap: 12 }}>
          <View style={st.inner}>
            <Row style={{ alignItems: 'flex-start', gap: 12 }}>
              <View style={{ marginTop: 4, alignItems: 'center' }}>
                <View style={[st.dot, { backgroundColor: DT.success }]} />
                <View style={st.dash} />
                <View style={[st.dot, { backgroundColor: DT.warn }]} />
              </View>
              <View style={{ minWidth: 0, flex: 1, gap: 14 }}>
                <View>
                  <Label style={{ color: DT.successInk }}>Pickup</Label>
                  <Text style={[st.addr, fo(600)]}>{tripData.pickup}</Text>
                </View>
                <View>
                  <Label style={{ color: DT.warnInk }}>Destination</Label>
                  <Text style={[st.addr, fo(600)]}>{tripData.drop}</Text>
                </View>
              </View>
            </Row>
          </View>
          <View style={st.inner}>
            <Row style={{ justifyContent: 'space-between', gap: 12 }}>
              <Row style={{ gap: 12, flexShrink: 1, minWidth: 0 }}>
                <View style={st.avatar}>
                  {isParcel ? <Package size={20} strokeWidth={2.5} color={DT.accent} /> : <User size={20} strokeWidth={2.5} color={DT.accent} />}
                </View>
                <View style={{ minWidth: 0, flexShrink: 1 }}>
                  <Label>{destinationRoleLabel}</Label>
                  <Text numberOfLines={1} style={[{ marginTop: 2, fontSize: 15, color: DT.ink }, fo(800)]}>{destinationContact?.name || '--'}</Text>
                  <Text style={[{ fontSize: 12, color: DT.muted }, fo(600)]}>{destinationContact?.phone || 'Phone not available'}</Text>
                </View>
              </Row>
              <RoundBtn onPress={() => callContact(destinationContact?.phone)} label="Call destination contact"><Phone size={18} strokeWidth={2.5} color={DT.brand} /></RoundBtn>
            </Row>
          </View>
        </View>
        <Row style={{ borderTopWidth: 1, borderTopColor: DT.borderSoft, padding: 16, gap: 10, alignItems: 'stretch' }}>
          <MoneyCell label="Trip Fare" value={formatCurrencyAmount(fareAmount)} />
          <MoneyCell label="Admin Cut" value={formatCurrencyAmount(commissionSummary.commissionAmount)} sub={commissionSummary.commissionLabel} />
          <MoneyCell label="Driver Gets" value={formatCurrencyAmount(commissionSummary.driverEarnings)} style={{ backgroundColor: DT.brand, borderColor: DT.brand }} labelColor={DT.onBrandMuted} valueColor={DT.accent} />
        </Row>
      </Card>

      {driverPaymentStatus === 'pending' ? (
        <Row style={{ gap: 12, marginBottom: 20 }}>
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
                accessibilityLabel={`Pay by ${mode.label}`}
                style={[st.modeBtn, selected ? { borderColor: DT.brand, backgroundColor: DT.brandSoft } : null]}
              >
                <ModeIcon size={22} strokeWidth={2.5} color={selected ? DT.brand : DT.faint} />
                <Text style={[{ fontSize: 14, color: DT.ink, marginTop: 6 }, fo(700)]}>
                  {mode.id === 'online' && isGeneratingPaymentQr ? 'Generating' : mode.label}
                </Text>
              </Press>
            );
          })}
        </Row>
      ) : null}

      {paymentQrError ? (
        <View style={{ marginBottom: 20, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.dangerSoft, backgroundColor: DT.dangerSoft, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={[{ fontSize: 12, color: DT.dangerInk, textAlign: 'center' }, fo(700)]}>{paymentQrError}</Text>
        </View>
      ) : null}

      {selectedPaymentMode === 'cash' && success ? (
        <Animated.View style={[st.cashCard, { opacity: fade }]}>
          <View style={[st.bigIcon, { width: 56, height: 56, backgroundColor: DT.success }]}>
            <Banknote size={24} strokeWidth={2.5} color={DT.onBrand} />
          </View>
          <Label style={{ color: DT.successInk }}>Cash Selected</Label>
          <Text style={[{ marginTop: 6, fontSize: 17, color: DT.ink, textAlign: 'center' }, fo(800)]}>Collect {displayFare} from the {paymentCollectionLabel}</Text>
          <Text style={[{ marginTop: 4, fontSize: 12, lineHeight: 17, color: DT.muted, textAlign: 'center' }, fo(600)]}>
            Once you have the cash in hand, tap below to close this {isParcel ? 'delivery' : 'ride'}.
          </Text>
          <CtaButton
            title="Cash Received"
            style={{ marginTop: 16, width: '100%' }}
            onPress={async () => {
              await completeRideForUserSync('cash');
              setPhase('review');
            }}
          />
        </Animated.View>
      ) : null}

      {driverPaymentStatus === 'qr_generated' ? <QrPanel t={t} /> : null}

      <CtaButton
        variant={finalizeReady ? 'cta' : 'outline'}
        disabled={!success || selectedPaymentMode === 'cash'}
        icon={<ChevronRight size={18} strokeWidth={3} color={finalizeReady ? DT.ctaInk : DT.faint} />}
        style={st.primary}
        textStyle={finalizeReady ? null : { color: DT.faint }}
        title={selectedPaymentMode === 'cash'
          ? 'Use Cash Received Button'
          : success
            ? 'Finalize Earnings'
            : 'Waiting...'}
        onPress={async () => {
          const paymentMode = selectedPaymentMode || effectiveState?.paymentMethod || liveRequest?.payment || '';
          await completeRideForUserSync(paymentMode);
          setPhase('review');
        }}
      />
    </Sheet>
  );
}

function Review({ t }) {
  const { selectedRating, setSelectedRating, completeRideAndExit } = t;
  return (
    <Sheet phaseKey="review" fade extra={{ borderTopColor: DT.borderSoft }}>
      <PhaseHeader label="Trip complete" tone="success" />
      <View style={{ alignItems: 'center', marginBottom: 24, gap: 12 }}>
        <View style={st.bigIcon}><User size={28} color={DT.accent} /></View>
        <Text style={[{ fontSize: 22, lineHeight: 28, color: DT.ink }, fo(800)]}>Rate Experience</Text>
        <Row style={{ justifyContent: 'center', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((score) => (
            <Press key={score} scale={1} onPress={() => setSelectedRating(score)} accessibilityLabel={`Rate ${score} star${score > 1 ? 's' : ''}`} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Star size={32} strokeWidth={2} color={score <= selectedRating ? DT.goldBright : DT.border} fill={score <= selectedRating ? DT.goldBright : 'transparent'} />
            </Press>
          ))}
        </Row>
      </View>
      <CtaButton title="Done" icon={<Check size={20} strokeWidth={4} color={DT.ctaInk} />} style={st.primary} onPress={completeRideAndExit} />
    </Sheet>
  );
}

export default function TripPhaseSheets({ t }) {
  const { phase } = t;
  const keyboard = useKeyboardHeight();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: keyboard, zIndex: 40 }}>
      {phase === 'to_pickup' ? <ToPickup t={t} /> : null}
      {phase === 'otp_verification' ? <OtpVerification t={t} /> : null}
      {phase === 'in_trip' ? <InTrip t={t} /> : null}
      {phase === 'payment_confirm' ? <PaymentConfirm t={t} /> : null}
      {phase === 'review' ? <Review t={t} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  sheet: { backgroundColor: DT.card, borderTopLeftRadius: DT.radius.xl, borderTopRightRadius: DT.radius.xl, borderTopWidth: 1, borderTopColor: DT.borderSoft, overflow: 'hidden', ...shadow('2xl') },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: DT.border, marginTop: 10 },
  label: { fontSize: 10, lineHeight: 14, letterSpacing: 0.4, minWidth: 40, textTransform: 'uppercase', color: DT.muted, ...fo(800) },
  addr: { marginTop: 2, fontSize: 14, lineHeight: 19, color: DT.ink },
  avatar: { width: 48, height: 48, backgroundColor: DT.brand, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  riderCard: { marginBottom: 12, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.bg, padding: 12 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sos: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: DT.radius.pill, backgroundColor: DT.danger, paddingHorizontal: 16 },
  routeCard: { padding: 16, marginBottom: 12, borderRadius: DT.radius.lg },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dash: { marginVertical: 4, height: 28, width: 0, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: DT.border },
  radiusCard: { marginBottom: 12, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.bg, paddingHorizontal: 16, paddingVertical: 12 },
  primary: { width: '100%', minHeight: 60 },
  secondary: { flex: 1, minHeight: 52 },
  waitBox: { marginBottom: 20, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.warnSoft, backgroundColor: DT.warnSoft, padding: 16 },
  waitIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.card, alignItems: 'center', justifyContent: 'center' },
  waitCell: { flex: 1, borderRadius: DT.radius.md, backgroundColor: DT.card, paddingHorizontal: 12, paddingVertical: 12 },
  otpBox: { width: 56, height: 64, backgroundColor: DT.bg, borderWidth: 2, borderColor: DT.border, borderRadius: DT.radius.md, textAlign: 'center', fontSize: 28, color: DT.ink, padding: 0 },
  bigIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: DT.brand },
  fareHead: { backgroundColor: DT.dark, paddingHorizontal: 20, paddingVertical: 18 },
  payTag: { borderRadius: DT.radius.md, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.1)' },
  sumCell: { width: '47.5%', flexGrow: 1, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, paddingHorizontal: 14, paddingVertical: 12 },
  inner: { borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.bg, padding: 14 },
  moneyCell: { flex: 1, minWidth: 0, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.bg, paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center' },
  modeBtn: { flex: 1, minHeight: 84, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: DT.radius.lg, borderWidth: 2, borderColor: DT.border, backgroundColor: DT.bg },
  cashCard: { marginBottom: 20, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.successSoft, backgroundColor: DT.successSoft, padding: 20, alignItems: 'center' },
  qrCard: { borderRadius: DT.radius.lg, padding: 20, marginBottom: 20, alignItems: 'center', backgroundColor: DT.brand, ...shadow('md') },
  qrBox: { width: '100%', maxWidth: 256, height: 256, alignSelf: 'center', marginBottom: 12, alignItems: 'center', justifyContent: 'center', borderRadius: DT.radius.md, backgroundColor: DT.card, padding: 12, overflow: 'hidden' },
  qrBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,23,43,0.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
});
