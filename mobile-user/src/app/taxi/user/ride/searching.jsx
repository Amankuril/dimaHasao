import { Animated, Easing, Linking, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Calendar, CheckCircle2, Clock3, MessageCircle, Phone, ShieldCheck, Star, X } from 'lucide-react-native';
import Image from '../../../../components/Img';
import { Dialog } from '../../../../components/kit';
import { Press } from '../../../../components/ui';
import { Spinner } from '../../../../components/Loader';
import { fo } from '../../../../taxi/account/ui';
import { PinLocationMarker, toSrc, useLoop, useTrackViews } from '../../../../taxi/components/live/parts';
import { useSearchingDriver } from '../../../../taxi/hooks/useSearchingDriver';
import { HAS_VALID_GOOGLE_MAPS_KEY } from '../../../../taxi/utils/googleMaps';
import { MAP_STYLE } from '../../../../taxi/components/live/mapStyle';
import { tw } from '../../../../theme';

const CarIcon = require('../../../../../assets/taxi/icons/car.png');

function PulseRing({ index }) {
  const v = useLoop({ duration: 3000, delay: (index + 1) * 750, easing: Easing.out(Easing.quad) });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 4.5] }) }] },
      ]}
    />
  );
}

function BlinkingVehicle({ marker, iconSrc }) {
  const track = useTrackViews(String(iconSrc?.uri || iconSrc));
  return (
    <Marker coordinate={{ latitude: marker.position.lat, longitude: marker.position.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={track} tracksInfoWindowChanges={false}>
      <View style={styles.vehicleBox}>
        <View style={styles.vehicleRing} />
        <Image source={iconSrc} style={[styles.vehicleImg, { transform: [{ rotate: `${marker.heading}deg` }] }]} resizeMode="contain" />
      </View>
    </Marker>
  );
}

function Dot({ index }) {
  const v = useLoop({ duration: 1500, delay: index * 200, useNativeDriver: false });
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] }),
          backgroundColor: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['#e2e8f0', '#f97316', '#e2e8f0'] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.4, 1] }) }],
        },
      ]}
    />
  );
}

function Ping() {
  const v = useLoop({ duration: 1000, easing: Easing.out(Easing.quad) });
  return (
    <View style={{ width: 8, height: 8 }}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.pingDot, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }] }]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: 4, backgroundColor: tw.emerald500 }]} />
    </View>
  );
}

export default function SearchingDriverScreen() {
  const h = useSearchingDriver();
  const insets = useSafeAreaInsets();
  const { navigate, routeState, driver, rideOtp, searchStatus, isSearching, isAccepted, isScheduledRide, scheduledStatus, scheduledError, formattedScheduledTime } = h;
  const { showCancelConfirm, setShowCancelConfirm, handleCancel, pickupPos, dropPos, availableVehicleMarkers, availableVehicleIcon, userHomeRoute, routePrefix } = h;

  if (isScheduledRide) {
    const tone = scheduledStatus === 'scheduled' ? { bg: 'rgba(5,150,105,0.2)', fg: tw.emerald400 } : scheduledStatus === 'error' ? { bg: 'rgba(225,29,72,0.2)', fg: tw.rose400 } : { bg: 'rgba(37,99,235,0.2)', fg: tw.blue400 };
    return (
      <View style={[styles.schedPage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.schedCard}>
          <View style={[styles.schedIcon, { backgroundColor: tone.bg }]}>
            {scheduledStatus === 'scheduled' ? <CheckCircle2 size={26} color={tone.fg} /> : scheduledStatus === 'error' ? <AlertTriangle size={26} color={tone.fg} /> : <Spinner size={26} color={tone.fg} />}
          </View>
          <Text style={styles.schedTitle}>{scheduledStatus === 'scheduled' ? 'Ride scheduled' : scheduledStatus === 'error' ? 'Scheduling failed' : 'Scheduling your ride'}</Text>
          <Text style={styles.schedSub}>
            {scheduledStatus === 'scheduled'
              ? 'Your booking has been saved. Drivers will be notified automatically at the scheduled time.'
              : scheduledStatus === 'error'
                ? scheduledError || 'Could not schedule this ride.'
                : 'Saving your booking and preparing automatic driver notification.'}
          </Text>
          <View style={styles.schedBox}>
            <View style={styles.row12}>
              <Calendar size={16} color={tw.blue300} />
              <Text style={styles.schedBoxLabel}>Scheduled For</Text>
            </View>
            <Text style={styles.schedWhen}>{formattedScheduledTime}</Text>
            <View style={[styles.row12, { marginTop: 16 }]}>
              <Clock3 size={15} color="rgba(255,255,255,0.65)" />
              <Text style={styles.schedRoute} numberOfLines={2}>
                {routeState.pickup || 'Pickup'} to {routeState.drop || 'Drop'}
              </Text>
            </View>
          </View>
          <Press onPress={() => navigate(userHomeRoute, { replace: true })} style={styles.schedBtn}>
            <Text style={styles.schedBtnText}>{scheduledStatus === 'error' ? 'Back to Home' : 'Done'}</Text>
          </Press>
        </View>
      </View>
    );
  }

  const vehicleSrc = toSrc(availableVehicleIcon || CarIcon);
  const driverAvatar = `https://ui-avatars.com/api/?name=${(driver.name || 'VK').replace(' ', '+')}&background=cbd5e1&color=0f172a&format=png`;
  const vehicleLine = [driver.vehicleColor, driver.vehicleMake, driver.vehicleModel, driver.vehicleType || 'Taxi'].filter(Boolean).join(' ') || 'White Dzire Taxi';

  return (
    <View style={styles.page}>
      <View style={StyleSheet.absoluteFill}>
        {HAS_VALID_GOOGLE_MAPS_KEY ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialCamera={{ center: { latitude: pickupPos.lat, longitude: pickupPos.lng }, zoom: 15, heading: 0, pitch: 0 }}
            customMapStyle={MAP_STYLE}
            toolbarEnabled={false}
            zoomControlEnabled={false}
            showsCompass={false}
            showsMyLocationButton={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <PinLocationMarker position={pickupPos} title="Pickup" color="#000000" zIndex={100} />
            {dropPos ? <PinLocationMarker position={dropPos} title="Drop" color="#f97316" /> : null}
            {isSearching ? availableVehicleMarkers.map((m) => <BlinkingVehicle key={m.id} marker={m} iconSrc={vehicleSrc} />) : null}
            {dropPos ? (
              <Polyline coordinates={[{ latitude: pickupPos.lat, longitude: pickupPos.lng }, { latitude: dropPos.lat, longitude: dropPos.lng }]} strokeColor="#0f172a" strokeWidth={2} lineDashPattern={[4, 6]} />
            ) : null}
          </MapView>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tw.slate50 }]} />
        )}

        {isSearching ? (
          <View pointerEvents="none" style={styles.rings}>
            {[1, 2, 3, 4].map((i) => (
              <PulseRing key={i} index={i} />
            ))}
          </View>
        ) : null}

        <View style={[styles.routeCard, { top: insets.top + 12 }]} pointerEvents="none">
          <Text style={styles.routeLabel}>CURRENT ROUTE</Text>
          <Text style={styles.routeText} numberOfLines={1}>
            {routeState.pickup || 'Pickup'} → {routeState.drop || 'Drop'}
          </Text>
        </View>

        {isAccepted && rideOtp ? (
          <View style={[styles.otpBox, { top: insets.top + 68 }]}>
            <Text style={styles.otpText}>{rideOtp}</Text>
            <Text style={styles.otpLabel}>Start OTP</Text>
          </View>
        ) : null}

        {isSearching || isAccepted ? (
          <Press scale={0.9} onPress={() => setShowCancelConfirm(true)} style={[styles.closeBtn, { top: insets.top + 12 }]} accessibilityLabel="Cancel">
            <X size={16} color={tw.slate900} strokeWidth={2.5} />
          </Press>
        ) : null}
      </View>

      <View style={[styles.bottom, { bottom: Math.max(32, insets.bottom + 16) }]}>
        {isSearching ? (
          <View style={styles.searchCard}>
            <View style={styles.grabber} />
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={styles.searchTitle}>Finding your ride</Text>
              <Text style={styles.searchStatus}>{searchStatus}</Text>
            </View>
            <View style={styles.dots}>
              {[0, 1, 2, 3].map((i) => (
                <Dot key={i} index={i} />
              ))}
            </View>
            <View style={styles.pills}>
              <View style={styles.row12}>
                <View style={styles.pillIcon}>
                  <Ping />
                </View>
                <Text style={styles.pillText}>FAST MATCHING</Text>
              </View>
              <View style={{ width: 1, height: 32, backgroundColor: tw.slate200 }} />
              <View style={styles.row12}>
                <ShieldCheck size={20} color={tw.blue500} strokeWidth={2.5} />
                <Text style={styles.pillText}>TOP SAFETY</Text>
              </View>
            </View>
            <Press scale={0.98} onPress={() => setShowCancelConfirm(true)} style={styles.cancelSearch}>
              <Text style={styles.cancelSearchText}>CANCEL SEARCH</Text>
            </Press>
          </View>
        ) : null}

        {isAccepted ? (
          <View>
            <View style={styles.acceptCard}>
              <View style={styles.acceptBar}>
                <View style={styles.checkDisc}>
                  <CheckCircle2 size={12} color="#fff" strokeWidth={3} />
                </View>
                <Text style={styles.acceptBarText}>CAPTAIN CONFIRMED</Text>
              </View>
              <View style={{ padding: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={[styles.row8, { marginBottom: 4 }]}>
                      <Text style={styles.driverName} numberOfLines={1}>
                        {(driver.name || 'Vishal K.').toUpperCase()}
                      </Text>
                      <View style={styles.ratingPill}>
                        <Star size={10} color={tw.yellow500} fill={tw.yellow500} />
                        <Text style={styles.ratingText}>{driver.rating || '4.7'}</Text>
                      </View>
                    </View>
                    <Text style={styles.plate} numberOfLines={1} adjustsFontSizeToFit>
                      {(driver.plate || 'MP13ZL3184').toUpperCase()}
                    </Text>
                    <View style={styles.vehiclePill}>
                      <Text style={styles.vehiclePillText}>{vehicleLine}</Text>
                    </View>
                  </View>
                  <View style={{ width: 96, height: 80 }}>
                    <View style={styles.vehicleTile}>
                      <Image source={vehicleSrc} style={{ width: 48, height: 48, opacity: 0.9, tintColor: '#fff' }} resizeMode="contain" />
                    </View>
                    <View style={styles.avatar}>
                      <Image source={{ uri: driverAvatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Press scale={0.96} onPress={() => Linking.openURL(`tel:${driver.phone}`).catch(() => {})} style={[styles.actionBtn, styles.callBtn]}>
                    <Phone size={18} color={tw.slate900} strokeWidth={2.5} />
                    <Text style={[styles.actionText, { color: tw.slate900 }]}>CALL</Text>
                  </Press>
                  <Press scale={0.96} onPress={() => navigate(`${routePrefix}/ride/chat`, { state: h.buildHistoryState({ driver }) })} style={[styles.actionBtn, styles.chatBtn]}>
                    <MessageCircle size={18} color="#fff" strokeWidth={2.5} />
                    <Text style={[styles.actionText, { color: '#fff' }]}>CHAT</Text>
                  </Press>
                </View>
              </View>
            </View>
            <View style={styles.arriving}>
              <Ping />
              <Text style={styles.arrivingText}>CAPTAIN IS ARRIVING</Text>
            </View>
          </View>
        ) : null}
      </View>

      <Dialog visible={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} backdrop="rgba(0,0,0,0.5)" blur={8} panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}>
          <AlertTriangle size={26} color={tw.red400} strokeWidth={2} />
        </View>
        <Text style={styles.dialogTitle}>Cancel ride?</Text>
        <Text style={styles.dialogSub}>{"We're still searching. Stop looking?"}</Text>
        <View style={{ gap: 10, alignSelf: 'stretch' }}>
          <Press scale={0.97} onPress={handleCancel} style={styles.dialogYes}>
            <Text style={styles.dialogYesText}>YES, CANCEL</Text>
          </Press>
          <Press scale={1} onPress={() => setShowCancelConfirm(false)} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={styles.dialogBack}>{isSearching ? 'KEEP SEARCHING' : 'GO BACK'}</Text>
          </Press>
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.slate50, overflow: 'hidden' },
  row12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // scheduled
  schedPage: { flex: 1, backgroundColor: tw.slate950, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  schedCard: { width: '100%', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  schedIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  schedTitle: { marginTop: 20, ...fo(900), fontSize: 22, color: '#fff', textAlign: 'center' },
  schedSub: { marginTop: 8, ...fo(700), fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 21 },
  schedBox: { marginTop: 24, alignSelf: 'stretch', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 16 },
  schedBoxLabel: { ...fo(700), fontSize: 14, color: '#fff' },
  schedWhen: { marginTop: 8, ...fo(900), fontSize: 18, color: '#fff' },
  schedRoute: { flex: 1, ...fo(700), fontSize: 12, color: 'rgba(255,255,255,0.65)', letterSpacing: 1.9 },
  schedBtn: { marginTop: 24, height: 48, alignSelf: 'stretch', borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  schedBtnText: { ...fo(900), fontSize: 14, color: tw.slate900, letterSpacing: 2.2 },
  // map overlays
  rings: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(251,146,60,0.4)', backgroundColor: 'rgba(251,146,60,0.05)', marginTop: -22 },
  vehicleBox: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  vehicleRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.45)', backgroundColor: 'rgba(52,211,153,0.1)' },
  vehicleImg: { width: 36, height: 36 },
  routeCard: { position: 'absolute', left: 16, right: 64, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(15,23,42,0.12)' },
  routeLabel: { ...fo(700), fontSize: 9, color: tw.slate400, letterSpacing: 0.9, lineHeight: 9, marginBottom: 4 },
  routeText: { ...fo(800), fontSize: 13, color: tw.slate900, lineHeight: 16.6 },
  otpBox: { position: 'absolute', left: 16, backgroundColor: '#fff', borderRadius: 12, padding: 12, minWidth: 70, borderWidth: 1, borderColor: tw.slate50, boxShadow: '0 4px 16px rgba(15,23,42,0.12)' },
  otpText: { ...fo(800), fontSize: 18, color: '#1d4ed8', textAlign: 'center', letterSpacing: 0.9 },
  otpLabel: { ...fo(700), fontSize: 10, color: tw.slate400, marginTop: 2, textAlign: 'center' },
  closeBtn: { position: 'absolute', right: 16, width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(15,23,42,0.10)' },
  bottom: { position: 'absolute', left: 16, right: 16 },
  // searching card
  searchCard: { borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, gap: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.12)' },
  grabber: { width: 40, height: 6, borderRadius: 3, backgroundColor: tw.slate100, alignSelf: 'center', marginBottom: 8 },
  searchTitle: { ...fo(800), fontSize: 22, color: tw.slate950, letterSpacing: -0.55 },
  searchStatus: { ...fo(600), fontSize: 13, color: tw.slate400, textAlign: 'center', maxWidth: 260, lineHeight: 19.5 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pills: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 24, backgroundColor: 'rgba(248,250,252,0.8)', borderWidth: 1, borderColor: tw.slate100 },
  pillIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: tw.emerald50, alignItems: 'center', justifyContent: 'center' },
  pillText: { ...fo(700), fontSize: 11, color: tw.slate700, letterSpacing: 0.55 },
  cancelSearch: { paddingVertical: 18, borderRadius: 22, backgroundColor: tw.red50, borderWidth: 1, borderColor: 'rgba(254,226,226,0.5)', alignItems: 'center' },
  cancelSearchText: { ...fo(800), fontSize: 13, color: tw.red500, letterSpacing: 1.3 },
  // accepted card
  acceptCard: { overflow: 'hidden', borderRadius: 32, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, boxShadow: '0 24px 64px -12px rgba(15,23,42,0.18)' },
  acceptBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(236,253,245,0.5)', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(209,250,229,0.5)' },
  checkDisc: { width: 20, height: 20, borderRadius: 10, backgroundColor: tw.emerald500, alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(16,185,129,0.3)' },
  acceptBarText: { ...fo(900), fontSize: 14, color: tw.emerald700, letterSpacing: 1.4 },
  driverName: { flexShrink: 1, ...fo(900), fontSize: 14, color: tw.slate400, letterSpacing: 2.1 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(250,204,21,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(250,204,21,0.2)' },
  ratingText: { ...fo(900), fontSize: 11, color: tw.yellow700 },
  plate: { ...fo(900), fontSize: 28, color: tw.slate900, letterSpacing: -1.4, lineHeight: 28, marginBottom: 16 },
  vehiclePill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: tw.slate100, borderWidth: 1, borderColor: 'rgba(226,232,240,0.5)' },
  vehiclePillText: { ...fo(900), fontSize: 12, color: tw.slate600 },
  vehicleTile: { position: 'absolute', right: 0, top: 0, width: 80, height: 80, borderRadius: 24, backgroundColor: '#1d2333', borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  avatar: { position: 'absolute', left: -8, bottom: 0, width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: '#fff', backgroundColor: tw.slate200, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  actions: { marginTop: 28, flexDirection: 'row', gap: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 22, paddingVertical: 18 },
  callBtn: { backgroundColor: tw.slate50, borderWidth: 1, borderColor: 'rgba(226,232,240,0.6)' },
  chatBtn: { backgroundColor: tw.slate950, boxShadow: '0 12px 24px rgba(15,23,42,0.15)' },
  actionText: { ...fo(900), fontSize: 13, letterSpacing: 1.3, lineHeight: 13 },
  arriving: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  arrivingText: { ...fo(900), fontSize: 12, color: tw.slate400, letterSpacing: 2.4, lineHeight: 12 },
  pingDot: { borderRadius: 4, backgroundColor: tw.emerald400 },
  // dialog
  dialog: { width: '82%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center', alignSelf: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  dialogIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dialogTitle: { ...fo(700), fontSize: 18, color: tw.slate900, marginBottom: 6 },
  dialogSub: { ...fo(700), fontSize: 13, color: tw.slate400, marginBottom: 24, lineHeight: 21, textAlign: 'center' },
  dialogYes: { backgroundColor: tw.slate900, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  dialogYesText: { ...fo(700), fontSize: 13, color: '#fff', letterSpacing: 1.95 },
  dialogBack: { ...fo(700), fontSize: 13, color: tw.slate400, letterSpacing: 1.95 },
});
