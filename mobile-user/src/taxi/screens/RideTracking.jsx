import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { AlertTriangle, ArrowLeft, Clock3, LifeBuoy, MessageCircle, Phone, Share2, Shield, Star } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { Button, IconButton, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { useRideTracking } from '../hooks/useRideTracking';
import { MAP_STYLE } from '../components/live/mapStyle';
import { CircleLocationMarker, toSrc } from '../components/live/parts';
import { fallbackCar } from '../components/home/homeShared';

/** Pickup = brand green, drop = red, everywhere in the ride flow. */
const PICKUP = color.primary;
const DROP = color.danger;
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
    { id: 'call', Icon: Phone, label: 'Call', a11y: 'Call captain', tone: 'primary', onPress: handleCallDriver },
    { id: 'chat', Icon: MessageCircle, label: 'Chat', a11y: 'Chat with captain', tone: 'primary', onPress: openRideChat },
    { id: 'share', Icon: Share2, label: 'Share', a11y: 'Share ride', tone: 'neutral', onPress: handleShare },
    { id: 'help', Icon: LifeBuoy, label: 'Help', a11y: 'Help', tone: 'neutral', onPress: () => navigate(routeSupport) },
  ];
  // Display only: the same status line as before, now as a word + colour badge.
  const statusLabel = tripStatus === 'arrived' ? 'Reached destination' : tripStatus === 'started' || tripStatus === 'ongoing' ? 'Trip started' : driverSubtitle;
  const statusTone = tripStatus === 'arrived' ? 'success' : tripStatus === 'cancelled' ? 'danger' : 'info';

  return (
    <View style={styles.screen}>
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
        {path.length > 1 ? <Polyline coordinates={path} strokeColor={color.primaryDeep} strokeWidth={5} /> : null}
        {driverCoord ? (
          <Marker coordinate={driverCoord} title="Driver" anchor={{ x: 0.5, y: 0.5 }} flat rotation={Number(displayDriverHeading) || 0} tracksViewChanges={false}>
            <Icon src={vehicleIcon} style={{ width: 40, height: 40 }} />
          </Marker>
        ) : null}
        {destCoord ? <CircleLocationMarker position={activeDestination} title={dropPhase ? 'Drop' : 'Pickup'} color={dropPhase ? DROP : PICKUP} /> : null}
      </MapView>

      {/* Overlays over the map, stacked instead of hard-coded offsets */}
      <View style={[styles.topStack, { top: space.md + insets.top }]} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <IconButton icon={ArrowLeft} label="Back to taxi home" onPress={() => navigate(routeHome)} style={styles.back} />
          <View style={styles.routeBar}>
            <View style={styles.routeLine}>
              <View style={styles.pickupDot} />
              <Text style={styles.routeBarText} numberOfLines={1}>{pickupLabel}</Text>
            </View>
            <View style={styles.routeLine}>
              <View style={styles.dropSquare} />
              <Text style={styles.routeBarText} numberOfLines={1}>{dropLabel}</Text>
            </View>
          </View>
        </View>
        <View style={styles.topRow} pointerEvents="box-none">
          {routeError ? (
            <View style={styles.routeNote}>
              <Text style={styles.routeNoteLabel}>Route</Text>
              <Text style={styles.routeNoteText}>Using fallback path while directions load.</Text>
            </View>
          ) : null}
          <Press scale={0.95} onPress={() => navigate(routeSos)} accessibilityLabel="Safety" style={styles.safety}>
            <Shield size={16} color={color.danger} />
            <Text style={styles.safetyText}>Safety</Text>
          </Press>
        </View>
        {isScheduledUpcoming ? (
          <View style={styles.scheduled}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.kicker}>Scheduled ride</Text>
              <Text style={styles.scheduledDate}>{scheduledDateLabel}</Text>
              <Text style={styles.scheduledBody}>
                {hasLiveDriverLocation ? 'Your driver has started sharing location for this pickup.' : 'Driver assigned. We will light up live movement here as pickup time gets closer.'}
              </Text>
            </View>
            <View style={styles.countdown}>
              <Text style={styles.tiny}>Countdown</Text>
              <Text style={styles.countdownValue}>{scheduledCountdown || 'Ready'}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {shareToast ? (
        <View style={[styles.toast, { top: space.lg + insets.top }]} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>Ride details copied!</Text>
        </View>
      ) : null}

      <Animated.View style={[styles.sheet, { transform: [{ translateY: y }] }]} onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}>
        <Press scale={1} onPress={() => setDrawerOpen(!drawerOpen)} accessibilityLabel={drawerOpen ? 'Collapse ride details' : 'Expand ride details'} hitSlop={12} style={styles.grabberHit}>
          <View style={styles.grabber} />
        </Press>

        <View style={[styles.sheetBody, { paddingBottom: space.xl + insets.bottom }]}>
          <View style={styles.driverRow}>
            <View>
              <View style={styles.driverPhoto}>
                {driverImage ? (
                  <Image source={toSrc(driverImage)} onError={() => setDriverImageBroken(true)} style={{ width: '100%', height: '100%' }} accessibilityLabel={driver.name || 'Driver'} />
                ) : (
                  <Text style={styles.initials}>{getInitials(driver.name)}</Text>
                )}
              </View>
              <View style={styles.ratingBadge}>
                <Star size={11} color={color.onGold} fill={color.onGold} />
                <Text style={styles.ratingText}>{driver.rating || '4.9'}</Text>
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
              <Text style={styles.driverName} numberOfLines={1}>{driver.name || 'Driver'}</Text>
              <StatusBadge label={statusLabel} tone={statusTone} />
              {driver.plate ? <Text style={styles.plate} numberOfLines={1} accessibilityLabel={`Vehicle number ${driver.plate}`}>{String(driver.plate).toUpperCase()}</Text> : null}
              {vehicleLabel ? <Text style={styles.plateSub} numberOfLines={1}>{vehicleLabel}</Text> : null}
            </View>
            {otp ? (
              <View style={styles.otp} accessible accessibilityLabel={`OTP ${String(otp).split('').join(' ')}`}>
                <Text style={styles.otpLabel}>OTP</Text>
                <Text style={styles.otpValue} selectable>{otp}</Text>
              </View>
            ) : null}
          </View>

          {isScheduledRide ? (
            <View style={styles.plan}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.kicker}>Trip plan</Text>
                <Text style={styles.scheduledDate}>{scheduledDateLabel}</Text>
                <Text style={styles.scheduledBody}>
                  {isScheduledUpcoming ? 'We will switch from booking mode to live pickup tracking automatically as your slot approaches.' : 'Your scheduled ride is now in its live service window.'}
                </Text>
              </View>
              <View style={[styles.countdown, { backgroundColor: color.surface }]}>
                <Text style={styles.tiny}>Status</Text>
                <Text style={styles.countdownValue}>{isScheduledUpcoming ? scheduledCountdown || 'Ready' : 'Live now'}</Text>
              </View>
            </View>
          ) : null}

          {isWaitingForOtp ? (
            <View style={styles.waiting}>
              <View style={styles.waitingTop}>
                <View style={styles.waitingLeft}>
                  <View style={styles.waitingIcon}>
                    <Clock3 size={20} color={color.warning} />
                  </View>
                  <View>
                    <Text style={[styles.tiny, { color: color.warning }]}>Waiting clock</Text>
                    <Text style={styles.waitingClock}>{formatTimerClock(waitingElapsedSeconds)}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.tiny}>Free left</Text>
                  <Text style={styles.countdownValue}>{formatTimerClock(freeWaitingRemainingSeconds)}</Text>
                </View>
              </View>
              <View style={styles.waitingCells}>
                <View style={styles.waitingCell}>
                  <Text style={styles.tiny}>Free before ride</Text>
                  <Text style={styles.countdownValue}>{formatWholeMinutes(freeWaitingBeforeMinutes)}</Text>
                </View>
                <View style={styles.waitingCell}>
                  <Text style={styles.tiny}>Waiting charge</Text>
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
                <Icon src={vehicleIcon} style={{ width: 28, height: 28 }} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.tiny}>Vehicle</Text>
              <Text style={styles.vehicleName} numberOfLines={1}>{vehicleLabel}</Text>
              {vehicleDetails ? <Text style={styles.vehicleSub} numberOfLines={1}>{vehicleDetails}</Text> : null}
            </View>
          </View>

          <View style={styles.actions}>
            {actions.map(({ id, Icon: ActionIcon, label, a11y, tone: t, onPress }) => (
              <Press key={id} scale={0.94} onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={styles.action}>
                <View style={[styles.actionIcon, t === 'primary' ? { backgroundColor: color.primarySoft } : null]}>
                  <ActionIcon size={20} color={t === 'primary' ? color.primary : color.text} />
                </View>
                <Text style={styles.actionText}>{label}</Text>
              </Press>
            ))}
          </View>

          <View style={styles.footer}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.tiny}>Total fare</Text>
              <View style={styles.fareRow}>
                <Text style={styles.fare}>₹{fare}.00</Text>
                {paymentMethod ? <StatusBadge label={String(paymentMethod)} tone="neutral" style={{ alignSelf: 'center' }} /> : null}
              </View>
            </View>
            <Button title="Cancel" variant="dangerSoft" fullWidth={false} onPress={() => setShowCancelConfirm(true)} accessibilityLabel="Cancel ride" />
          </View>
        </View>
      </Animated.View>

      {/* Share the ride */}
      <Dialog visible={shareSheetOpen} onClose={() => setShareSheetOpen(false)} backdrop={color.overlay} panelStyle={styles.share}>
        <Text style={styles.kicker}>Share ride</Text>
        <Text style={styles.dialogTitle}>Send trip details</Text>
        <Text style={styles.dialogBody}>Choose how you want to share this ongoing ride.</Text>
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
        <Button title="Close" variant="outline" onPress={() => setShareSheetOpen(false)} style={{ marginTop: space.lg }} />
      </Dialog>

      {/* Cancel confirmation */}
      <Dialog visible={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} backdrop={color.overlay} panelStyle={styles.confirm}>
        <View style={styles.confirmIcon}>
          <AlertTriangle size={26} color={color.danger} />
        </View>
        <Text style={[styles.dialogTitle, { textAlign: 'center' }]} accessibilityRole="header">Cancel your ride?</Text>
        <Text style={[styles.dialogBody, { textAlign: 'center', marginBottom: space.xl }]}>Your captain is already on the way.</Text>
        <Button title="Yes, cancel" variant="danger" onPress={handleCancelRide} accessibilityLabel="Yes, cancel the ride" />
        <Button title="No, go back" variant="ghost" onPress={() => setShowCancelConfirm(false)} accessibilityLabel="No, go back" style={{ marginTop: space.sm }} />
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfaceMuted },
  topStack: { position: 'absolute', left: space.lg, right: space.lg, gap: space.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float },
  routeBar: { flex: 1, minWidth: 0, borderRadius: radii.lg, paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.xxs, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float },
  routeLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pickupDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PICKUP },
  dropSquare: { width: 10, height: 10, borderRadius: 2, backgroundColor: DROP },
  routeBarText: { ...type.label, flex: 1, minWidth: 0, color: color.text },
  safety: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.md, minHeight: 40, borderRadius: radii.pill, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float },
  safetyText: { ...type.label, color: color.danger },
  routeNote: { flexShrink: 1, borderRadius: radii.md, borderWidth: 1, borderColor: color.warningSoft, backgroundColor: color.surface, paddingHorizontal: space.md, paddingVertical: space.sm, ...elevation.card },
  routeNoteLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.warning },
  routeNoteText: { ...type.caption, color: color.text },
  scheduled: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, borderRadius: radii.lg, borderWidth: 1, borderColor: color.primaryBorder, backgroundColor: color.surface, padding: space.md, ...elevation.float },
  kicker: { ...type.overline, color: color.goldText },
  scheduledDate: { ...type.subheading, marginTop: space.xs, color: color.text },
  scheduledBody: { ...type.caption, marginTop: space.xs, color: color.textSecondary },
  countdown: { borderRadius: radii.md, backgroundColor: color.primarySoft, paddingHorizontal: space.md, paddingVertical: space.sm, alignItems: 'flex-end' },
  countdownValue: { ...type.bodyStrong, marginTop: space.xxs, color: color.text },
  tiny: { ...type.caption, color: color.textMuted },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: color.primaryDeep, paddingHorizontal: space.xl, paddingVertical: space.md, borderRadius: radii.pill, zIndex: 60, ...elevation.float },
  toastText: { ...type.label, color: color.textInverse },

  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, ...elevation.sheet },
  grabberHit: { paddingTop: space.sm + 2, paddingBottom: space.md },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: color.borderStrong, alignSelf: 'center' },
  sheetBody: { paddingHorizontal: space.lg, gap: space.md },
  driverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  driverPhoto: { width: 60, height: 60, borderRadius: radii.lg, backgroundColor: color.primaryDeep, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  initials: { ...type.heading, color: color.goldOnDark },
  ratingBadge: { position: 'absolute', bottom: -6, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: color.goldBright, paddingHorizontal: space.xs + 2, height: 20, borderRadius: radii.pill, borderWidth: 2, borderColor: color.surface },
  ratingText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.onGold },
  driverName: { ...type.subheading, color: color.text },
  plate: { ...type.price, fontSize: 20, color: color.text, marginTop: space.xxs },
  plateSub: { ...type.caption, color: color.textSecondary },
  otp: { borderWidth: 1.5, borderColor: color.gold, backgroundColor: color.goldSoft, borderRadius: radii.lg, paddingHorizontal: space.md, paddingVertical: space.sm, alignItems: 'center', justifyContent: 'center', minWidth: 88 },
  otpLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },
  otpValue: { ...type.priceLg, color: color.primary, letterSpacing: 2 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radii.lg, borderWidth: 1, borderColor: color.primaryBorder, backgroundColor: color.primarySoft, padding: space.lg },
  waiting: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.warningSoft, backgroundColor: color.warningSoft, padding: space.lg },
  waitingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  waitingLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  waitingIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  waitingClock: { ...type.priceLg, color: color.text },
  waitingCells: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  waitingCell: { flex: 1, borderRadius: radii.md, backgroundColor: color.surface, padding: space.md },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radii.lg, backgroundColor: color.bg, borderWidth: 1, borderColor: color.border, padding: space.md },
  vehiclePhoto: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center', padding: space.sm, overflow: 'hidden' },
  vehicleName: { ...type.bodyStrong, color: color.text },
  vehicleSub: { ...type.caption, color: color.textSecondary },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1, alignItems: 'center', gap: space.xs, paddingVertical: space.sm, minHeight: 72, borderRadius: radii.md },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  actionText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.text },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: color.border },
  fareRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fare: { ...type.priceLg, color: color.text },

  share: { width: '100%', maxWidth: 448, borderRadius: radii.xl, backgroundColor: color.surface, padding: space.xl, ...elevation.sheet },
  dialogTitle: { ...type.heading, marginTop: space.xs, color: color.text },
  dialogBody: { ...type.small, marginTop: space.xs, color: color.textSecondary },
  shareGrid: { marginTop: space.lg, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  shareCell: { width: '48%', minHeight: 72, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.bg, padding: space.lg },
  shareCellTitle: { ...type.bodyStrong, color: color.text },
  shareCellSub: { ...type.caption, marginTop: space.xxs, color: color.textMuted },

  confirm: { width: '86%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xxl, alignItems: 'stretch', ...elevation.sheet },
  confirmIcon: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg, alignSelf: 'center' },
});
