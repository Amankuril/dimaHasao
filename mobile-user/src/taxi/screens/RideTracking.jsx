import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { AlertTriangle, ChevronLeft, Clock3, MessageCircle, Phone, Share2, Shield, Star } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import { useRideTracking } from '../hooks/useRideTracking';
import { MAP_STYLE } from '../components/live/mapStyle';
import { CircleLocationMarker, toSrc } from '../components/live/parts';
import { fallbackCar } from '../components/home/homeShared';

const EMERALD = { 50: '#ECFDF5', 100: '#D0FAE5', 700: '#007A55' };
const AMBER = { 50: '#FFFBEB', 100: '#FEF3C6', 500: '#FE9A00', 600: '#E17100' };
const DRAWER_HIDDEN = 420;

function Icon({ src, style, tint }) {
  const [failed, setFailed] = useState(false);
  const source = !failed ? toSrc(src) : null;
  return <Image source={source || fallbackCar} onError={() => setFailed(true)} style={[style, tint ? { tintColor: tint } : null]} resizeMode="contain" />;
}

/** Port of Taxi/modules/user/pages/ride/RideTracking.jsx (logic: useRideTracking). */
export default function RideTracking() {
  const insets = useSafeAreaInsets();
  const t = useRideTracking();
  const {
    drawerOpen, setDrawerOpen, showCancelConfirm, setShowCancelConfirm, shareToast, shareSheetOpen, setShareSheetOpen, routePath, routeError, setMap, navigate, routeHome,
    routeSupport, routeSos, appName, driver, pickupLabel, dropLabel, driverPosition, activeDestination, tripStatus, vehicleIcon, displayDriverHeading,
    isScheduledUpcoming, isScheduledRide, scheduledDateLabel, scheduledCountdown, hasLiveDriverLocation, driverImage, setDriverImageBroken, getInitials,
    driverSubtitle, vehicleLabel, otp, isWaitingForOtp, formatTimerClock, waitingElapsedSeconds, freeWaitingRemainingSeconds, formatWholeMinutes,
    freeWaitingBeforeMinutes, waitingChargePerMinute, waitingChargeableMinutes, hasVehiclePhoto, vehicleImage, setVehicleImageBroken, vehicleDetails,
    handleCallDriver, openRideChat, handleShare, handleCopyShareText, fare, paymentMethod, handleCancelRide, buildShareLinks, buildRideShareText,
  } = t;

  const map = useRef(null);
  const toCoord = (p) => (p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) ? { latitude: Number(p.lat), longitude: Number(p.lng) } : null);
  const driverCoord = toCoord(driverPosition);
  const destCoord = toCoord(activeDestination);
  const path = useMemo(() => (Array.isArray(routePath) ? routePath.map(toCoord).filter(Boolean) : []), [routePath]);
  const [sheetHeight, setSheetHeight] = useState(420);

  const y = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(y, { toValue: drawerOpen ? 0 : Math.min(DRAWER_HIDDEN, Math.max(0, sheetHeight - 40)), stiffness: 300, damping: 30, mass: 1, useNativeDriver: true }).start();
  }, [drawerOpen, sheetHeight, y]);

  const dropPhase = ['started', 'ongoing', 'arrived', 'completed'].includes(tripStatus);
  const shareLinks = () => buildShareLinks(buildRideShareText({ appName, driverName: driver.name, vehicleNumber: driver.plate || driver.vehicleNumber, pickupLabel, dropLabel }));
  const openLink = (url) => {
    setShareSheetOpen(false);
    if (url) Linking.openURL(url).catch(() => {});
  };
  const actions = [
    { id: 'call', Icon: Phone, label: 'CALL', onPress: handleCallDriver },
    { id: 'chat', Icon: MessageCircle, label: 'CHAT', onPress: openRideChat },
    { id: 'share', Icon: Share2, label: 'SHARE', onPress: handleShare },
    { id: 'help', Icon: AlertTriangle, label: 'HELP', onPress: () => navigate(routeSupport) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: tw.slate200 }}>
      <MapView
        ref={map}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        customMapStyle={MAP_STYLE}
        toolbarEnabled={false}
        showsCompass={false}
        // The hook frames the route and follows the driver through this instance (web: GoogleMap onLoad).
        onMapReady={() => setMap(map.current)}
        initialRegion={{ latitude: driverCoord?.latitude ?? destCoord?.latitude ?? 25.17, longitude: driverCoord?.longitude ?? destCoord?.longitude ?? 93.03, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
      >
        {path.length > 1 ? <Polyline coordinates={path} strokeColor="rgba(17,24,39,0.9)" strokeWidth={5} /> : null}
        {driverCoord ? (
          <Marker coordinate={driverCoord} title="Driver" anchor={{ x: 0.5, y: 0.5 }} flat rotation={Number(displayDriverHeading) || 0} tracksViewChanges={false}>
            <Icon src={vehicleIcon} style={{ width: 40, height: 40 }} />
          </Marker>
        ) : null}
        {destCoord ? <CircleLocationMarker position={activeDestination} title={dropPhase ? 'Drop' : 'Pickup'} color={dropPhase ? '#ef4444' : '#10b981'} /> : null}
      </MapView>

      <Press scale={0.9} onPress={() => navigate(routeHome)} accessibilityLabel="Back to taxi home" style={[styles.back, { top: 32 + insets.top }]}>
        <ChevronLeft size={18} color={tw.slate900} strokeWidth={2.5} />
      </Press>
      <View style={[styles.routeBar, { top: 32 + insets.top }]}>
        <Text style={styles.routeBarText} numberOfLines={1}>
          {pickupLabel} → {dropLabel}
        </Text>
      </View>
      <Press scale={0.95} onPress={() => navigate(routeSos)} accessibilityLabel="Safety" style={[styles.safety, { top: 96 + insets.top }]}>
        <Shield size={13} color="#2B7FFF" strokeWidth={2.5} />
        <Text style={styles.safetyText}>SAFETY</Text>
      </Press>
      {routeError ? (
        <View style={[styles.routeNote, { top: 96 + insets.top }]}>
          <Text style={styles.routeNoteLabel}>ROUTE</Text>
          <Text style={styles.routeNoteText}>Using fallback path while directions load.</Text>
        </View>
      ) : null}
      {isScheduledUpcoming ? (
        <View style={[styles.scheduled, { top: 132 + insets.top }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.scheduledKicker}>SCHEDULED RIDE</Text>
            <Text style={styles.scheduledDate}>{scheduledDateLabel}</Text>
            <Text style={styles.scheduledBody}>
              {hasLiveDriverLocation ? 'Your driver has started sharing location for this pickup.' : 'Driver assigned. We will light up live movement here as pickup time gets closer.'}
            </Text>
          </View>
          <View style={styles.countdown}>
            <Text style={[styles.tiny, { color: EMERALD[700] }]}>COUNTDOWN</Text>
            <Text style={styles.countdownValue}>{scheduledCountdown || 'Ready'}</Text>
          </View>
        </View>
      ) : null}

      {shareToast ? (
        <View style={[styles.toast, { top: 16 + insets.top }]} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>Ride details copied!</Text>
        </View>
      ) : null}

      <Animated.View style={[styles.sheet, { transform: [{ translateY: y }] }]} onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}>
        <Press scale={1} onPress={() => setDrawerOpen(!drawerOpen)} accessibilityLabel={drawerOpen ? 'Collapse ride details' : 'Expand ride details'} hitSlop={12} style={{ paddingTop: 10, paddingBottom: 14 }}>
          <View style={styles.grabber} />
        </Press>

        <View style={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12, flex: 1, minWidth: 0 }}>
              <View>
                <View style={styles.driverPhoto}>
                  {driverImage ? (
                    <Image source={toSrc(driverImage)} onError={() => setDriverImageBroken(true)} style={{ width: '100%', height: '100%', opacity: 0.9 }} accessibilityLabel={driver.name || 'Driver'} />
                  ) : (
                    <Text style={styles.initials}>{getInitials(driver.name)}</Text>
                  )}
                </View>
                <View style={styles.carBadge}>
                  <Icon src={vehicleIcon} style={{ width: 14, height: 14 }} tint="#fff" />
                </View>
                <View style={styles.ratingBadge}>
                  <Star size={9} color={tw.slate900} fill={tw.slate900} />
                  <Text style={styles.ratingText}>{driver.rating || '4.9'}</Text>
                </View>
              </View>
              <View style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <Text style={styles.driverName} numberOfLines={1}>{driver.name || 'Driver'}</Text>
                <Text style={styles.driverStatus}>{tripStatus === 'arrived' ? 'Reached destination' : tripStatus === 'started' || tripStatus === 'ongoing' ? 'Trip started' : driverSubtitle}</Text>
                <Text style={styles.plate} numberOfLines={1}>
                  {String(driver.plate || '').toUpperCase()}
                  {driver.plate ? ' · ' : ''}
                  {String(vehicleLabel || '').toUpperCase()}
                </Text>
              </View>
            </View>
            {otp ? (
              <View style={styles.otp} accessibilityLabel={`OTP ${String(otp).split('').join(' ')}`}>
                <Text style={styles.otpLabel}>OTP</Text>
                <Text style={styles.otpValue} selectable>{otp}</Text>
              </View>
            ) : null}
          </View>

          {isScheduledRide ? (
            <View style={styles.plan}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.tiny, { color: EMERALD[700], letterSpacing: 2 }]}>TRIP PLAN</Text>
                <Text style={styles.scheduledDate}>{scheduledDateLabel}</Text>
                <Text style={styles.scheduledBody}>
                  {isScheduledUpcoming ? 'We will switch from booking mode to live pickup tracking automatically as your slot approaches.' : 'Your scheduled ride is now in its live service window.'}
                </Text>
              </View>
              <View style={[styles.countdown, { backgroundColor: '#fff' }]}>
                <Text style={styles.tiny}>STATUS</Text>
                <Text style={styles.countdownValue}>{isScheduledUpcoming ? scheduledCountdown || 'Ready' : 'Live now'}</Text>
              </View>
            </View>
          ) : null}

          {isWaitingForOtp ? (
            <View style={styles.waiting}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.waitingIcon}>
                    <Clock3 size={18} color={AMBER[500]} strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text style={[styles.tiny, { color: AMBER[600], letterSpacing: 2 }]}>WAITING CLOCK</Text>
                    <Text style={styles.waitingClock}>{formatTimerClock(waitingElapsedSeconds)}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.tiny}>FREE LEFT</Text>
                  <Text style={styles.countdownValue}>{formatTimerClock(freeWaitingRemainingSeconds)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <View style={styles.waitingCell}>
                  <Text style={styles.tiny}>FREE BEFORE RIDE</Text>
                  <Text style={styles.countdownValue}>{formatWholeMinutes(freeWaitingBeforeMinutes)}</Text>
                </View>
                <View style={styles.waitingCell}>
                  <Text style={styles.tiny}>WAITING CHARGE</Text>
                  <Text style={styles.countdownValue}>
                    Rs {waitingChargePerMinute}/min
                    {waitingChargeableMinutes > 0 ? ` • ${waitingChargeableMinutes} billable` : ''}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.vehicle}>
            <View style={styles.vehiclePhoto}>
              {hasVehiclePhoto ? (
                <Image source={toSrc(vehicleImage)} onError={() => setVehicleImageBroken(true)} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel={vehicleLabel} />
              ) : (
                <Icon src={vehicleIcon} style={{ width: 24, height: 24, opacity: 0.6 }} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.tiny, { marginBottom: 2 }]}>VEHICLE</Text>
              <Text style={styles.vehicleName} numberOfLines={1}>{vehicleLabel}</Text>
              {vehicleDetails ? <Text style={styles.vehicleSub} numberOfLines={1}>{vehicleDetails}</Text> : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {actions.map(({ id, Icon: ActionIcon, label, onPress }) => (
              <Press key={id} scale={0.94} onPress={onPress} accessibilityLabel={label.charAt(0) + label.slice(1).toLowerCase()} style={styles.action}>
                <ActionIcon size={18} color={tw.slate800} strokeWidth={2} />
                <Text style={styles.actionText}>{label}</Text>
              </Press>
            ))}
          </View>

          <View style={styles.footer}>
            <View>
              <Text style={[styles.tiny, { marginBottom: 4 }]}>TOTAL FARE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.fare}>Rs {fare}.00</Text>
                <Text style={styles.payMethod}>{String(paymentMethod || '').toUpperCase()}</Text>
              </View>
            </View>
            <Press scale={0.96} onPress={() => setShowCancelConfirm(true)} accessibilityLabel="Cancel ride" style={styles.cancel}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </Press>
          </View>
        </View>
      </Animated.View>

      {/* Share the ride */}
      <Dialog visible={shareSheetOpen} onClose={() => setShareSheetOpen(false)} backdrop="rgba(2,6,24,0.45)" panelStyle={styles.share}>
        <Text style={[styles.tiny, { fontSize: 11, letterSpacing: 2.4 }]}>SHARE RIDE</Text>
        <Text style={styles.shareTitle}>Send trip details</Text>
        <Text style={styles.shareBody}>Choose how you want to share this ongoing ride.</Text>
        <View style={styles.shareGrid}>
          {[
            ['System share', 'Open phone share apps', handleShare],
            ['WhatsApp', 'Share in chat', () => openLink(shareLinks().whatsapp)],
            ['SMS', 'Open messages', () => openLink(shareLinks().sms)],
            ['Copy details', 'Copy to clipboard', handleCopyShareText],
          ].map(([title, sub, onPress]) => (
            <Press key={title} scale={0.98} onPress={onPress} accessibilityLabel={`${title}. ${sub}`} style={styles.shareCell}>
              <Text style={styles.shareCellTitle}>{title}</Text>
              <Text style={styles.shareCellSub}>{sub}</Text>
            </Press>
          ))}
        </View>
        <Press scale={0.98} onPress={() => setShareSheetOpen(false)} accessibilityLabel="Close" style={styles.shareClose}>
          <Text style={styles.shareCloseText}>CLOSE</Text>
        </Press>
      </Dialog>

      {/* Cancel confirmation */}
      <Dialog visible={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.confirm}>
        <View style={styles.confirmIcon}>
          <AlertTriangle size={26} color="#FF6467" strokeWidth={2} />
        </View>
        <Text style={styles.confirmTitle}>Cancel your ride?</Text>
        <Text style={styles.confirmBody}>Your captain is already on the way.</Text>
        <Press scale={0.97} onPress={handleCancelRide} accessibilityLabel="Yes, cancel the ride" style={styles.confirmYes}>
          <Text style={styles.confirmYesText}>YES, CANCEL</Text>
        </Press>
        <Press scale={0.97} onPress={() => setShowCancelConfirm(false)} accessibilityLabel="No, go back" style={{ paddingVertical: 14, alignSelf: 'stretch' }}>
          <Text style={styles.confirmNo}>NO, GO BACK</Text>
        </Press>
      </Dialog>
    </View>
  );
}

const glass = { backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' };
const styles = StyleSheet.create({
  back: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...glass, ...shadow('0 4px 14px rgba(15,23,42,0.10)') },
  routeBar: { position: 'absolute', left: 64, right: 16, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, ...glass, ...shadow('0 4px 14px rgba(15,23,42,0.08)') },
  routeBarText: { fontSize: 11, lineHeight: 16, color: tw.slate500, ...fo(900) },
  safety: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, ...glass, ...shadow('0 4px 14px rgba(15,23,42,0.08)') },
  safetyText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: tw.slate700, ...fo(700) },
  routeNote: { position: 'absolute', left: 16, borderRadius: 12, borderWidth: 1, borderColor: AMBER[100], backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 12, paddingVertical: 8, maxWidth: '58%' },
  routeNoteLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, ...fo(700) },
  routeNoteText: { fontSize: 11, lineHeight: 16, color: tw.slate700, ...fo(700) },
  scheduled: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 18, borderWidth: 1, borderColor: EMERALD[100], backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 16, paddingVertical: 12, ...shadow('0 10px 28px rgba(16,185,129,0.12)') },
  scheduledKicker: { fontSize: 10, lineHeight: 15, letterSpacing: 2, color: EMERALD[700], ...fo(900) },
  scheduledDate: { marginTop: 4, fontSize: 15, lineHeight: 20, letterSpacing: -0.375, color: '#020618', ...fo(900) },
  scheduledBody: { marginTop: 4, fontSize: 11, lineHeight: 16, color: tw.slate500, ...fo(700) },
  countdown: { borderRadius: 16, backgroundColor: EMERALD[50], paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-end' },
  countdownValue: { marginTop: 4, fontSize: 13, lineHeight: 18, color: '#020618', ...fo(900) },
  tiny: { fontSize: 9, lineHeight: 12, letterSpacing: 1.6, color: tw.slate400, ...fo(900) },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: tw.slate900, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, zIndex: 60, ...shadow('xl') },
  toastText: { fontSize: 12, lineHeight: 16, color: '#fff', ...fo(900) },

  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: 'rgba(241,245,249,0.5)', ...shadow('0 -12px 44px rgba(15,23,42,0.12)') },
  grabber: { width: 48, height: 6, borderRadius: 3, backgroundColor: 'rgba(226,232,240,0.6)', alignSelf: 'center' },
  driverPhoto: { width: 62, height: 62, borderRadius: 20, backgroundColor: '#1d2333', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', ...shadow('0 8px 20px rgba(15,23,42,0.15)') },
  initials: { fontSize: 21, color: 'rgba(255,255,255,0.9)', ...fo(900) },
  carBadge: { position: 'absolute', top: -4, right: -4, width: 24, height: 24, borderRadius: 8, backgroundColor: '#111827', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ratingBadge: { position: 'absolute', bottom: -4, right: -4, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FDC700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 2, borderColor: '#fff' },
  ratingText: { fontSize: 9, lineHeight: 12, color: tw.slate900, ...fo(900) },
  driverName: { fontSize: 17, lineHeight: 21, letterSpacing: -0.425, color: tw.slate900, ...fo(900) },
  driverStatus: { fontSize: 13, lineHeight: 18, letterSpacing: -0.325, color: '#f97316', marginTop: 4, ...fo(900) },
  plate: { fontSize: 11, lineHeight: 16, letterSpacing: 1.5, color: tw.slate400, marginTop: 2, ...fo(700) },
  otp: { backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate200, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minWidth: 80, ...shadow('sm') },
  otpLabel: { fontSize: 9, lineHeight: 10, letterSpacing: 1.6, color: '#FF6900', marginBottom: 4, ...fo(900) },
  otpValue: { fontSize: 18, lineHeight: 20, letterSpacing: -0.9, color: tw.slate900, ...fo(900) },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, borderWidth: 1, borderColor: EMERALD[100], backgroundColor: 'rgba(236,253,245,0.7)', padding: 16 },
  waiting: { borderRadius: 24, borderWidth: 1, borderColor: AMBER[100], backgroundColor: 'rgba(255,251,235,0.7)', padding: 16 },
  waitingIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  waitingClock: { marginTop: 4, fontSize: 22, lineHeight: 26, letterSpacing: -0.55, color: tw.slate900, ...fo(900) },
  waitingCell: { flex: 1, borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 12, ...shadow('sm') },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, backgroundColor: 'rgba(248,250,252,0.4)', borderWidth: 1, borderColor: 'rgba(248,250,252,0.8)', padding: 12 },
  vehiclePhoto: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(241,245,249,0.5)', alignItems: 'center', justifyContent: 'center', padding: 8, overflow: 'hidden', ...shadow('sm') },
  vehicleName: { fontSize: 15, lineHeight: 19, color: tw.slate900, ...fo(900) },
  vehicleSub: { fontSize: 12, lineHeight: 16, color: tw.slate500, marginTop: 2, ...fo(700) },
  action: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 12, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(241,245,249,0.6)', ...shadow('0 2px 8px rgba(15,23,42,0.03)') },
  actionText: { fontSize: 9, lineHeight: 10, letterSpacing: 0.9, color: tw.slate500, ...fo(900) },
  footer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.slate50 },
  fare: { fontSize: 19, lineHeight: 22, letterSpacing: -0.475, color: '#020618', ...fo(900) },
  payMethod: { fontSize: 9, lineHeight: 12, letterSpacing: 0.45, color: tw.slate600, backgroundColor: tw.slate100, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(226,232,240,0.5)', overflow: 'hidden', ...fo(900) },
  cancel: { backgroundColor: '#fff', borderWidth: 2, borderColor: tw.slate50, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 18, ...shadow('0 8px 20px rgba(239,68,68,0.08)') },
  cancelText: { fontSize: 11, lineHeight: 16, letterSpacing: 1.76, color: tw.red500, ...fo(900) },

  share: { width: '100%', maxWidth: 448, borderRadius: 28, backgroundColor: '#fff', padding: 20, ...shadow('2xl') },
  shareTitle: { marginTop: 8, fontSize: 20, lineHeight: 28, letterSpacing: -0.5, color: tw.slate900, ...fo(900) },
  shareBody: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.slate500, ...fo(700) },
  shareGrid: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  shareCell: { width: '48%', borderRadius: 18, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, padding: 16 },
  shareCellTitle: { fontSize: 13, lineHeight: 18, color: tw.slate900, ...fo(900) },
  shareCellSub: { marginTop: 4, fontSize: 11, lineHeight: 16, color: tw.slate500, ...fo(700) },
  shareClose: { marginTop: 16, height: 48, borderRadius: 18, backgroundColor: tw.slate900, alignItems: 'center', justifyContent: 'center' },
  shareCloseText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.9, color: '#fff', ...fo(900) },

  confirm: { width: '82%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center', ...shadow('2xl') },
  confirmIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, marginBottom: 6, ...fo(700) },
  confirmBody: { fontSize: 13, lineHeight: 21, color: tw.slate400, marginBottom: 24, textAlign: 'center', ...fo(700) },
  confirmYes: { alignSelf: 'stretch', backgroundColor: tw.slate900, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  confirmYesText: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, color: '#fff', ...fo(700) },
  confirmNo: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, color: tw.slate400, textAlign: 'center', ...fo(700) },
});
