import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ArrowLeft, Banknote, Check, CheckCircle2, Clock3, Eye, Minus, Plus, TicketPercent } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import { useSelectVehicle } from '../hooks/useSelectVehicle';
import { MAP_STYLE } from '../components/live/mapStyle';
import { CircleLocationMarker, PinLocationMarker, toSrc } from '../components/live/parts';
import { fallbackCar } from '../components/home/homeShared';

const ORANGE = { 50: '#FFF7ED', 100: '#FFEDD4', 200: '#FFD6A7', 500: '#FF6900', 600: '#F54900' };
const EMERALD = { 50: '#ECFDF5', 100: '#D0FAE5', 200: '#A4F4CF', 500: '#00BC7D', 600: '#009966', 700: '#007A55' };
const ROSE = { 50: '#FFF1F2', 100: '#FFE4E6', 500: '#FF2056', 600: '#EC003F' };
const TONES = { 'bg-green-50': '#F0FDF4', 'bg-blue-50': '#EFF6FF', 'text-green-600': '#00A63E', 'text-blue-600': '#155DFC' };
const CATEGORY = {
  bike: { bg: ORANGE[50], border: ORANGE[100], text: ORANGE[600], dot: ORANGE[500] },
  auto: { bg: EMERALD[50], border: EMERALD[100], text: EMERALD[600], dot: EMERALD[500] },
  other: { bg: '#EFF6FF', border: '#DBEAFE', text: '#155DFC', dot: '#2B7FFF' },
};

function VehicleIcon({ uri, style }) {
  const [failed, setFailed] = useState(false);
  const source = !failed && uri ? toSrc(uri) : null;
  return <Image source={source || fallbackCar} onError={() => setFailed(true)} style={style} resizeMode="contain" />;
}

function Sheet({ visible, onClose, children, insets }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} backdrop="rgba(0,0,0,0.5)" spring={{ stiffness: 320, damping: 26 }} panelStyle={[styles.modal, { paddingBottom: 32 + insets.bottom }]}>
      <View style={styles.handle} />
      {children}
    </BottomSheet>
  );
}

/** Port of Taxi/modules/user/pages/ride/SelectVehicle.jsx (logic: useSelectVehicle). */
export default function SelectVehicle() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const s = useSelectVehicle();
  const {
    navigate, routeState, pickup, drop, pickupPosition, dropPosition, stops, onlineDrivers, selectedVehicle, tripMetrics, openLocationEditor, rideMode, setRideMode,
    scheduledAt, setScheduledAt, setScheduleError, scheduleError, minScheduledAt, maxScheduledAt, isInitialVehicleResultsLoading, vehicleLoadError,
    displayedVehicles, selected, setSelected, availabilityByVehicleId, DEFAULT_AVAILABILITY, isFarePending, formatVehicleFare, setPreviewVehicleId,
    formatScheduledDisplay, formatAvailabilityLine, driverLoadError, paymentMethod, setPaymentMethod, showPaymentModal, setShowPaymentModal, showCouponModal,
    setShowCouponModal, appliedPromo, availablePromos, promoError, promoFeedback, appliedPromoDiscount, discountedSelectedFare, formatCurrency,
    clearAppliedPromo, canProceed, handleBook, shouldUseDriverBidding, previewVehicle, previewAvailability, formatDispatchLabel, showBidModal, setShowBidModal,
    selectedBidCeiling, selectedBidSteps, bidStepCount, setBidStepCount, selectedBidFloorFare, selectedBidCeilingMaxFare, proceedToBooking, promoCodeInput,
    setPromoCodeInput, setPromoError, setPromoFeedback, applyingPromoCode, applyPromoCode, isLoadingPromos, formatPromoSummary, paymentOptions,
    formatDateTimeInputValue, getDriverPosition, buildFallbackRoute,
  } = s;

  const map = useRef(null);
  const toCoord = (p) => (p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) ? { latitude: Number(p.lat), longitude: Number(p.lng) } : null);
  const pickupCoord = toCoord(pickupPosition);
  const dropCoord = toCoord(dropPosition);
  const route = useMemo(() => (pickupPosition && dropPosition ? buildFallbackRoute(pickupPosition, dropPosition).map(toCoord).filter(Boolean) : []), [pickupPosition?.lat, pickupPosition?.lng, dropPosition?.lat, dropPosition?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const sheetMax = Math.max(360, height * 0.69);

  useEffect(() => {
    const points = [pickupCoord, dropCoord].filter(Boolean);
    if (points.length < 2) return;
    const timer = setTimeout(() => map.current?.fitToCoordinates(points, { edgePadding: { top: 90 + insets.top, right: 50, bottom: sheetMax + 20, left: 50 }, animated: true }), 300);
    return () => clearTimeout(timer);
  }, [pickupCoord?.latitude, pickupCoord?.longitude, dropCoord?.latitude, dropCoord?.longitude, sheetMax]); // eslint-disable-line react-hooks/exhaustive-deps

  const ping = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(ping, { toValue: 1, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [ping]);

  // <input type="datetime-local"> -> the OS date picker, then the time picker.
  const pickSchedule = () => {
    const min = minScheduledAt ? new Date(minScheduledAt) : new Date();
    const max = maxScheduledAt ? new Date(maxScheduledAt) : undefined;
    const current = scheduledAt ? new Date(scheduledAt) : min;
    DateTimePickerAndroid.open({
      value: current,
      mode: 'date',
      minimumDate: min,
      maximumDate: max,
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: current,
          mode: 'time',
          is24Hour: false,
          onChange: (ev, time) => {
            if (ev.type !== 'set' || !time) return;
            const picked = new Date(date);
            picked.setHours(time.getHours(), time.getMinutes(), 0, 0);
            const clamped = picked < min ? min : max && picked > max ? max : picked;
            setScheduledAt(formatDateTimeInputValue(clamped));
            setRideMode('schedule');
            setScheduleError('');
          },
        });
      },
    });
  };

  const cat = routeState.selectedCategory ? String(routeState.selectedCategory).toLowerCase() : '';
  const catTone = CATEGORY[cat] || CATEGORY.other;
  const bookLabel = selectedVehicle
    ? isFarePending
      ? 'Calculating fare...'
      : selectedVehicle.supportsBidding && shouldUseDriverBidding
        ? `Request Bid for ${selectedVehicle.name}`
        : rideMode === 'schedule'
          ? `Schedule ${selectedVehicle.name}`
          : `Book ${selectedVehicle.name}`
    : 'Select Vehicle';
  const bidValue = Math.min(bidStepCount, selectedBidSteps);

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray200 }}>
      <MapView
        ref={map}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        customMapStyle={MAP_STYLE}
        toolbarEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
        initialRegion={{ latitude: pickupCoord?.latitude ?? 25.17, longitude: pickupCoord?.longitude ?? 93.03, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
      >
        {route.length > 1 ? <Polyline coordinates={route} strokeColor="#0F172A" strokeWidth={4} /> : null}
        {pickupCoord ? <CircleLocationMarker position={pickupPosition} color="#7fc76d" title="Pickup" /> : null}
        {(Array.isArray(stops) ? stops : []).map((stop, i) => {
          const c = toCoord(stop?.position || stop?.coords || stop);
          return c ? <Marker key={`stop-${i}`} coordinate={c} title={`Stop ${i + 1}`} pinColor="#F59E0B" /> : null;
        })}
        {dropCoord ? <PinLocationMarker position={dropPosition} color="#d95c6a" title="Drop" /> : null}
        {(onlineDrivers || []).map((driver, i) => {
          const c = toCoord(getDriverPosition(driver));
          if (!c) return null;
          return (
            <Marker key={String(driver?.id || driver?._id || i)} coordinate={c} anchor={{ x: 0.5, y: 0.5 }} flat rotation={Number(driver?.heading) || 0} tracksViewChanges={false}>
              <VehicleIcon uri={selectedVehicle?.mapIcon || selectedVehicle?.icon} style={{ width: 30, height: 30 }} />
            </Marker>
          );
        })}
      </MapView>

      <Press scale={0.9} onPress={() => navigate(-1)} accessibilityLabel="Go back" style={[styles.back, { top: 24 + insets.top }]}>
        <ArrowLeft size={18} color={tw.slate900} strokeWidth={2.5} />
      </Press>

      <View style={[styles.sheet, { maxHeight: sheetMax }]}>
        <View style={styles.grabber} />

        <View style={styles.routeBox}>
          {cat ? (
            <View style={[styles.catPill, { backgroundColor: catTone.bg, borderColor: catTone.border }]}>
              <View style={{ width: 6, height: 6 }}>
                <Animated.View style={[styles.dot6, { backgroundColor: catTone.dot, opacity: ping.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }), transform: [{ scale: ping.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] }]} />
                <View style={[styles.dot6, { backgroundColor: catTone.dot }]} />
              </View>
              <Text style={[styles.catText, { color: catTone.text }]}>CATEGORY: {String(routeState.selectedCategory).toUpperCase()}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 10, alignItems: 'center' }}>
                <View style={[styles.dot10, { backgroundColor: '#7fc76d', marginTop: 6 }]} />
                <View style={{ width: 1, height: 24, backgroundColor: tw.slate300, marginVertical: 4 }} />
                <View style={[styles.dot10, { backgroundColor: '#d95c6a' }]} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
                <Text style={[styles.place, { paddingTop: 2 }]} numberOfLines={1}>{pickup}</Text>
                <Press scale={0.99} onPress={openLocationEditor} accessibilityLabel={`Drop: ${drop}. Edit`} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.place} numberOfLines={1}>{drop}</Text>
                    {tripMetrics.distanceMeters > 0 ? (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        <Text style={[styles.metric, { backgroundColor: '#eff6ff', borderColor: '#dbeafe', color: '#155DFC' }]}>{(tripMetrics.distanceMeters / 1000).toFixed(1)} km</Text>
                        <Text style={[styles.metric, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7', color: EMERALD[600] }]}>{tripMetrics.durationMinutes} mins</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.edit}>Edit</Text>
                </Press>
              </View>
            </View>
            <Press scale={0.96} onPress={pickSchedule} accessibilityLabel={rideMode === 'schedule' ? 'Scheduled for later. Change time' : 'Ride now. Schedule for later'} style={[styles.when, rideMode === 'schedule' ? { borderColor: tw.slate900, backgroundColor: tw.slate900 } : null]}>
              <Clock3 size={14} color={rideMode === 'schedule' ? '#fff' : tw.slate600} strokeWidth={2.2} />
              <Text style={[styles.whenText, rideMode === 'schedule' ? { color: '#fff' } : null]}>{rideMode === 'schedule' ? 'Later' : 'Now'}</Text>
            </Press>
          </View>
        </View>

        <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, gap: 10 }}>
          {isInitialVehicleResultsLoading ? (
            <View style={styles.finding} accessibilityRole="progressbar" accessibilityLabel="Finding available rides">
              <ActivityIndicator size="small" color={tw.slate400} />
              <Text style={styles.findingText}>FINDING AVAILABLE RIDES</Text>
            </View>
          ) : vehicleLoadError ? (
            <View style={[styles.notice, { borderColor: tw.red50 }]}>
              <Text style={[styles.noticeTitle, { color: tw.red500, ...fo(900) }]}>{vehicleLoadError}</Text>
              <Text style={styles.noticeBody}>Please try again later.</Text>
            </View>
          ) : displayedVehicles.length === 0 ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>No vehicles available</Text>
              <Text style={styles.noticeBody}>Try changing your location or method.</Text>
            </View>
          ) : (
            displayedVehicles.map((v, i) => {
              const isSelected = selected === v.id;
              const availability = availabilityByVehicleId[v.id] || DEFAULT_AVAILABILITY;
              const isUnavailable = !availability.totalDrivers;
              const compactEta = Math.max(1, availability.closestDriverEtaMinutes || tripMetrics.durationMinutes || 1);
              const noDrivers = isUnavailable && rideMode !== 'schedule';
              return (
                <View key={v.id} style={[styles.vehicle, isSelected ? styles.vehicleOn : null]}>
                  <Press scale={0.99} onPress={() => setSelected(v.id)} accessibilityRole="radio" accessibilityState={{ checked: isSelected }} accessibilityLabel={`${v.name}, ${isFarePending ? 'calculating fare' : formatVehicleFare(v)}, ${compactEta} minutes away`} style={styles.vehicleRow}>
                    <View style={{ width: 52, alignItems: 'center' }}>
                      <VehicleIcon uri={v.icon} style={{ width: 48, height: 32 }} />
                      <Text style={styles.eta}>{compactEta} min</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.vehicleName} numberOfLines={1}>{v.name}</Text>
                          <Text style={[styles.vehicleSub, noDrivers ? { color: ROSE[500] } : null]} numberOfLines={1}>{noDrivers ? `No nearby ${String(v.name).toLowerCase()} drivers` : v.sublabel}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.fare}>{isFarePending ? '...' : formatVehicleFare(v)}</Text>
                          {isSelected ? (
                            <Press scale={0.9} onPress={() => setPreviewVehicleId(v.id)} accessibilityLabel={`View details for ${v.name}`} style={styles.eye} hitSlop={12}>
                              <Eye size={12} color={tw.slate500} strokeWidth={2.4} />
                            </Press>
                          ) : null}
                        </View>
                      </View>
                      {isSelected ? (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.availability} numberOfLines={1}>
                            {rideMode === 'schedule' ? `Scheduled for ${formatScheduledDisplay(scheduledAt)}` : isUnavailable ? 'Unavailable right now' : formatAvailabilityLine(availability)}
                          </Text>
                          {driverLoadError ? <Text style={[styles.availability, { fontSize: 10, color: ROSE[500], marginTop: 4 }]}>{driverLoadError}</Text> : null}
                        </View>
                      ) : null}
                    </View>
                  </Press>
                  {!isSelected && i < displayedVehicles.length - 1 ? <View style={{ marginLeft: 68, borderBottomWidth: 1, borderBottomColor: tw.slate100 }} /> : null}
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.foot, { paddingBottom: 10 + insets.bottom }]}>
          <View style={styles.options}>
            <Press scale={0.98} onPress={() => setShowPaymentModal(true)} accessibilityLabel={`Payment: ${paymentMethod === 'Cash' ? 'Cash' : 'Online'}. Change`} style={[styles.option, styles.optionBorder]}>
              <Banknote size={15} color="#00A63E" strokeWidth={2.2} />
              <Text style={styles.optionText}>{paymentMethod === 'Cash' ? 'Cash' : 'Online'}</Text>
            </Press>
            <Press scale={0.98} onPress={() => setShowCouponModal(true)} accessibilityLabel={appliedPromo ? `Coupon ${appliedPromo?.promo?.code} applied` : 'Coupons'} style={[styles.option, styles.optionBorder]}>
              <TicketPercent size={14} color={appliedPromo ? EMERALD[600] : tw.slate500} strokeWidth={2.3} />
              <Text style={[styles.optionText, appliedPromo ? { color: EMERALD[700] } : null]} numberOfLines={1}>{appliedPromo?.promo?.code || (availablePromos.length ? `Coupon ${availablePromos.length}` : 'Coupon')}</Text>
            </Press>
            <View style={styles.option}>
              <View style={styles.myself}>
                <Text style={{ fontSize: 10, color: tw.slate600 }}>•</Text>
              </View>
              <Text style={styles.optionText}>Myself</Text>
            </View>
          </View>

          {appliedPromo || promoError || promoFeedback ? (
            <View style={[styles.promoNote, promoError ? { borderColor: ROSE[100], backgroundColor: 'rgba(255,241,242,0.7)' } : null]}>
              {appliedPromo && !promoError ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.promoNoteTitle} numberOfLines={1}>{appliedPromo.promo?.code} applied for this zone</Text>
                    <Text style={styles.promoNoteBody}>
                      Save {formatCurrency(appliedPromoDiscount)}. Fare now {formatCurrency(discountedSelectedFare)}.
                    </Text>
                  </View>
                  <Press scale={0.96} onPress={() => clearAppliedPromo('Coupon removed.')} accessibilityLabel="Remove coupon" hitSlop={10}>
                    <Text style={styles.promoRemove}>REMOVE</Text>
                  </Press>
                </View>
              ) : (
                <Text style={[styles.promoNoteBody, { marginTop: 0, color: promoError ? ROSE[600] : EMERALD[700] }]}>{promoError || promoFeedback}</Text>
              )}
            </View>
          ) : null}

          <Press scale={0.98} disabled={!canProceed} onPress={handleBook} accessibilityLabel={bookLabel} accessibilityState={{ disabled: !canProceed }} style={[styles.book, canProceed ? null : { backgroundColor: tw.slate200 }]}>
            <Text style={[styles.bookText, canProceed ? null : { color: tw.slate400 }]}>{bookLabel}</Text>
          </Press>
          {rideMode === 'schedule' ? (
            <Text style={[styles.scheduleNote, scheduleError ? { color: ROSE[500] } : null]}>{scheduleError || `Scheduled for ${formatScheduledDisplay(scheduledAt)}.`}</Text>
          ) : null}
        </View>
      </View>

      {/* Vehicle details */}
      <Sheet visible={!!previewVehicle} onClose={() => setPreviewVehicleId('')} insets={insets}>
        {previewVehicle ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kicker, { color: ORANGE[500] }]}>VEHICLE DETAILS</Text>
                <Text style={styles.previewName}>{previewVehicle.name}</Text>
                <Text style={styles.modalBody}>{previewVehicle.sublabel || 'Comfortable ride option for this route.'}</Text>
              </View>
              <View style={styles.previewIcon}>
                <VehicleIcon uri={previewVehicle.icon} style={{ width: 56, height: 48 }} />
              </View>
            </View>
            <View style={styles.statGrid}>
              {[
                ['ESTIMATED FARE', isFarePending ? 'Calculating...' : formatVehicleFare(previewVehicle), 17],
                ['SEATS', String(previewVehicle.capacity ?? ''), 17],
                ['BOOKING TYPE', formatDispatchLabel(previewVehicle), 14],
                ['AVAILABILITY', rideMode === 'schedule' ? 'Can be scheduled' : previewAvailability.totalDrivers ? `${previewAvailability.totalDrivers} nearby` : 'Unavailable now', 14],
              ].map(([label, value, size]) => (
                <View key={label} style={styles.stat}>
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={[styles.statValue, { fontSize: size }]}>{value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.snapshot}>
              <Text style={[styles.statLabel, { color: ORANGE[500] }]}>TRIP SNAPSHOT</Text>
              <Text style={styles.snapshotText}>
                {rideMode === 'schedule'
                  ? 'This vehicle can be reserved for a later trip at your chosen time.'
                  : previewAvailability.totalDrivers
                    ? formatAvailabilityLine(previewAvailability)
                    : 'No driver is currently online for this vehicle around your pickup.'}
              </Text>
            </View>
            <Press scale={0.98} onPress={() => setPreviewVehicleId('')} accessibilityLabel="Close" style={[styles.modalBtn, styles.modalBtnOutline, { marginTop: 20 }]}>
              <Text style={[styles.modalBtnText, { color: tw.slate700 }]}>CLOSE</Text>
            </Press>
          </>
        ) : null}
      </Sheet>

      {/* Bid fare */}
      <Sheet visible={!!(showBidModal && selectedVehicle?.supportsBidding && shouldUseDriverBidding)} onClose={() => setShowBidModal(false)} insets={insets}>
        <Text style={[styles.kicker, { color: ORANGE[500] }]}>BID FARE</Text>
        <Text style={styles.modalTitle}>Choose your max fare</Text>
        <Text style={styles.modalBody}>Drivers can send offers up to this amount for {selectedVehicle?.name}.</Text>
        <View style={[styles.snapshot, { marginTop: 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statLabel, { color: ORANGE[500] }]}>BID RANGE</Text>
              <Text style={[styles.snapshotText, { marginTop: 4, fontSize: 13, color: tw.slate900 }]}>Adjust the fare ceiling inside the admin-configured bidding range.</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.statLabel}>MAX FARE</Text>
              <Text style={styles.bidMax}>{formatCurrency(selectedBidCeiling)}</Text>
            </View>
          </View>
          {/* <input type="range">: a stepper and a fill bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Press scale={0.9} disabled={bidValue <= 0} onPress={() => setBidStepCount(Math.max(0, bidValue - 1))} accessibilityLabel="Lower max fare" style={[styles.bidBtn, bidValue <= 0 ? { opacity: 0.4 } : null]}>
              <Minus size={18} color={tw.slate900} />
            </Press>
            <View style={styles.bidTrack} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: selectedBidSteps, now: bidValue }}>
              <View style={{ height: '100%', borderRadius: 4, backgroundColor: ORANGE[500], width: `${selectedBidSteps ? (bidValue / selectedBidSteps) * 100 : 0}%` }} />
            </View>
            <Press scale={0.9} disabled={bidValue >= selectedBidSteps} onPress={() => setBidStepCount(Math.min(selectedBidSteps, bidValue + 1))} accessibilityLabel="Raise max fare" style={[styles.bidBtn, bidValue >= selectedBidSteps ? { opacity: 0.4 } : null]}>
              <Plus size={18} color={tw.slate900} />
            </Press>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <Text style={styles.bidRange}>Floor {formatCurrency(selectedBidFloorFare)}</Text>
            <Text style={styles.bidRange}>Ceiling {formatCurrency(selectedBidCeilingMaxFare)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <Press scale={0.98} onPress={() => setShowBidModal(false)} accessibilityLabel="Cancel" style={[styles.modalBtn, styles.modalBtnOutline, { flex: 1 }]}>
            <Text style={[styles.modalBtnText, { color: tw.slate600 }]}>CANCEL</Text>
          </Press>
          <Press scale={0.98} onPress={proceedToBooking} accessibilityLabel="Send bid" style={[styles.modalBtn, { flex: 1, backgroundColor: '#f8e001' }]}>
            <Text style={[styles.modalBtnText, { color: tw.slate900 }]}>SEND BID</Text>
          </Press>
        </View>
      </Sheet>

      {/* Coupons */}
      <Sheet visible={showCouponModal} onClose={() => setShowCouponModal(false)} insets={insets}>
        <Text style={[styles.kicker, { color: EMERALD[500] }]}>COUPONS</Text>
        <Text style={styles.modalTitle}>Apply for this zone</Text>
        <Text style={styles.modalBody}>Only coupons created for this service location show here.</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
          <TextInput
            value={promoCodeInput}
            onChangeText={(text) => {
              setPromoCodeInput(text.toUpperCase());
              setPromoError('');
              setPromoFeedback('');
            }}
            placeholder="Enter coupon code"
            placeholderTextColor={tw.slate400}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Coupon code"
            style={styles.couponInput}
          />
          <Press
            scale={0.97}
            disabled={Boolean(applyingPromoCode) || !selectedVehicle}
            onPress={async () => {
              if (await applyPromoCode(promoCodeInput)) setShowCouponModal(false);
            }}
            accessibilityLabel="Apply coupon"
            style={[styles.couponApply, Boolean(applyingPromoCode) || !selectedVehicle ? { opacity: 0.6 } : null]}
          >
            <Text style={styles.couponApplyText}>{applyingPromoCode ? 'APPLYING' : 'APPLY'}</Text>
          </Press>
        </View>
        {promoError || promoFeedback ? <Text style={[styles.couponMsg, { color: promoError ? ROSE[500] : EMERALD[600] }]}>{promoError || promoFeedback}</Text> : null}
        <ScrollView style={{ marginTop: 20, maxHeight: height * 0.46 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
          {isLoadingPromos ? (
            <View style={[styles.promoRow, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <ActivityIndicator size="small" color={tw.slate500} />
              <Text style={styles.promoSummary}>Loading available coupons</Text>
            </View>
          ) : availablePromos.length ? (
            availablePromos.map((promo) => {
              const code = String(promo?.code || '').toUpperCase();
              const isApplied = String(appliedPromo?.promo?.code || '').toUpperCase() === code;
              return (
                <View key={promo?._id || promo?.code} style={[styles.promoRow, isApplied ? { borderColor: EMERALD[200], backgroundColor: 'rgba(236,253,245,0.7)' } : null]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.promoCode} numberOfLines={1}>{promo?.code}</Text>
                        {isApplied ? <CheckCircle2 size={14} color={EMERALD[600]} strokeWidth={2.6} /> : null}
                      </View>
                      <Text style={[styles.promoSummary, { marginTop: 4, fontSize: 11, ...fo(500) }]}>{formatPromoSummary(promo)}</Text>
                    </View>
                    <Press
                      scale={0.96}
                      disabled={Boolean(applyingPromoCode)}
                      onPress={async () => {
                        if (await applyPromoCode(promo?.code)) setShowCouponModal(false);
                      }}
                      accessibilityLabel={isApplied ? `${code} applied` : `Use coupon ${code}`}
                      style={[styles.promoUse, isApplied ? { backgroundColor: EMERALD[600], borderColor: EMERALD[600] } : null]}
                    >
                      <Text style={[styles.promoUseText, isApplied ? { color: '#fff' } : null]}>{applyingPromoCode === code ? 'APPLYING' : isApplied ? 'APPLIED' : 'USE'}</Text>
                    </Press>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.promoRow}>
              <Text style={styles.promoSummary}>No coupons are active for this zone right now.</Text>
            </View>
          )}
        </ScrollView>
      </Sheet>

      {/* Payment method */}
      <Sheet visible={showPaymentModal} onClose={() => setShowPaymentModal(false)} insets={insets}>
        <Text style={[styles.kicker, { color: tw.slate400 }]}>PAYMENT</Text>
        <Text style={[styles.modalTitle, { marginBottom: 20 }]}>Select Method</Text>
        <View style={{ gap: 10 }}>
          {paymentOptions.map(({ stateValue, label, sub, Icon, bg, color }) => {
            const on = paymentMethod === stateValue;
            return (
              <Press
                key={stateValue}
                scale={0.98}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${label}. ${sub}`}
                onPress={() => {
                  setPaymentMethod(stateValue);
                  setShowPaymentModal(false);
                }}
                style={[styles.payRow, on ? { borderColor: ORANGE[200], backgroundColor: 'rgba(255,247,237,0.4)' } : null]}
              >
                <View style={[styles.payIcon, { backgroundColor: TONES[bg] || tw.slate100 }]}>
                  <Icon size={18} color={TONES[color] || tw.slate600} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payLabel}>{label}</Text>
                  <Text style={styles.paySub}>{sub}</Text>
                </View>
                {on ? (
                  <View style={styles.payCheck}>
                    <Check size={10} color="#fff" strokeWidth={3} />
                  </View>
                ) : null}
              </Press>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...shadow('0 4px 14px rgba(15,23,42,0.12)') },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 360, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#fff', overflow: 'hidden', ...shadow('0 -12px 44px rgba(15,23,42,0.16)') },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: tw.slate200, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  routeBox: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.slate100 },
  catPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 2, marginBottom: 8 },
  catText: { fontSize: 9, lineHeight: 14, letterSpacing: 0.45, ...fo(700) },
  dot6: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  dot10: { width: 10, height: 10, borderRadius: 5 },
  place: { fontSize: 13, lineHeight: 18, color: tw.slate700, ...fo(500) },
  metric: { fontSize: 10, lineHeight: 15, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, overflow: 'hidden', ...fo(700) },
  edit: { fontSize: 11, lineHeight: 16, color: tw.slate400, marginTop: 2, ...fo(600) },
  when: { width: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', paddingHorizontal: 4, paddingVertical: 8 },
  whenText: { fontSize: 10, lineHeight: 15, color: tw.slate600, marginTop: 4, ...fo(500) },

  finding: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  findingText: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: tw.slate400, ...fo(700) },
  notice: { borderRadius: 18, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' },
  noticeTitle: { fontSize: 13, lineHeight: 18, color: tw.slate900, textAlign: 'center', ...fo(700) },
  noticeBody: { marginTop: 4, fontSize: 11, lineHeight: 16, color: tw.slate400, textAlign: 'center', ...fo(700) },
  vehicle: { borderRadius: 18, borderWidth: 1, borderColor: 'transparent', backgroundColor: '#fff', overflow: 'hidden' },
  vehicleOn: { borderColor: tw.slate200, backgroundColor: tw.slate50, ...shadow('0 6px 16px rgba(15,23,42,0.08)') },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  eta: { marginTop: 4, fontSize: 10, lineHeight: 15, color: tw.slate500, ...fo(500) },
  vehicleName: { fontSize: 14, lineHeight: 17.5, color: tw.slate900, ...fo(600) },
  vehicleSub: { marginTop: 2, fontSize: 11, lineHeight: 16, color: tw.slate400, ...fo(500) },
  fare: { fontSize: 20, lineHeight: 22, color: tw.slate900, ...fo(600) },
  eye: { marginTop: 4, width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  availability: { fontSize: 11, lineHeight: 16, color: tw.slate500, ...fo(500) },

  foot: { borderTopWidth: 1, borderTopColor: tw.slate100, backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 10 },
  options: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff' },
  option: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 10 },
  optionBorder: { borderRightWidth: 1, borderRightColor: tw.slate200 },
  optionText: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: tw.slate700, ...fo(500) },
  myself: { width: 16, height: 16, borderRadius: 8, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  promoNote: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: EMERALD[100], backgroundColor: 'rgba(236,253,245,0.7)', paddingHorizontal: 12, paddingVertical: 8 },
  promoNoteTitle: { fontSize: 11, lineHeight: 16, color: EMERALD[700], ...fo(600) },
  promoNoteBody: { marginTop: 2, fontSize: 10, lineHeight: 15, color: 'rgba(0,122,85,0.8)', ...fo(500) },
  promoRemove: { fontSize: 10, lineHeight: 15, letterSpacing: 0.25, color: EMERALD[700], ...fo(600) },
  book: { marginTop: 12, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1f1f1f' },
  bookText: { fontSize: 16, lineHeight: 24, color: '#fff', ...fo(500) },
  scheduleNote: { marginTop: 8, fontSize: 11, lineHeight: 16, color: tw.slate500, ...fo(500) },

  modal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: tw.slate200, alignSelf: 'center', marginBottom: 20 },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, marginBottom: 4, ...fo(700) },
  modalTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...fo(700) },
  modalBody: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.slate500, ...fo(700) },
  previewName: { fontSize: 20, lineHeight: 28, color: tw.slate900, ...fo(800) },
  previewIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  statGrid: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  stat: { width: '48%', borderRadius: 18, borderWidth: 1, borderColor: tw.slate100, backgroundColor: 'rgba(248,250,252,0.7)', paddingHorizontal: 16, paddingVertical: 12 },
  statLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1.4, color: tw.slate400, ...fo(900) },
  statValue: { marginTop: 4, lineHeight: 24, color: tw.slate900, ...fo(800) },
  snapshot: { marginTop: 16, borderRadius: 20, borderWidth: 1, borderColor: ORANGE[100], backgroundColor: 'rgba(255,247,237,0.6)', padding: 16 },
  snapshotText: { marginTop: 8, fontSize: 12, lineHeight: 20, color: tw.slate700, ...fo(700) },
  modalBtn: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  modalBtnOutline: { borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff' },
  modalBtnText: { fontSize: 13, lineHeight: 18, letterSpacing: 1.8, ...fo(900) },
  bidMax: { marginTop: 4, fontSize: 20, lineHeight: 28, color: tw.slate900, ...fo(900) },
  bidBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: ORANGE[200], alignItems: 'center', justifyContent: 'center' },
  bidTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: ORANGE[100], overflow: 'hidden' },
  bidRange: { fontSize: 11, lineHeight: 16, color: tw.slate500, ...fo(700) },
  couponInput: { flex: 1, minWidth: 0, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, color: tw.slate900, ...fo(600) },
  couponApply: { borderRadius: 16, backgroundColor: '#020618', paddingHorizontal: 16, justifyContent: 'center' },
  couponApplyText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.7, color: '#fff', ...fo(900) },
  couponMsg: { marginTop: 12, fontSize: 11, lineHeight: 16, ...fo(600) },
  promoRow: { borderRadius: 18, borderWidth: 1, borderColor: tw.slate100, backgroundColor: 'rgba(248,250,252,0.7)', padding: 16 },
  promoCode: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: tw.slate900, ...fo(900) },
  promoSummary: { fontSize: 12, lineHeight: 16, color: tw.slate600, ...fo(600) },
  promoUse: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate200 },
  promoUseText: { fontSize: 10, lineHeight: 15, letterSpacing: 1.4, color: tw.slate800, ...fo(900) },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 2, borderColor: tw.slate100, backgroundColor: 'rgba(248,250,252,0.5)' },
  payIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payLabel: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...fo(700) },
  paySub: { fontSize: 11, lineHeight: 16, color: tw.slate400, ...fo(700) },
  payCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: ORANGE[500], alignItems: 'center', justifyContent: 'center' },
});
