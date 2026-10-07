import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ArrowLeft, Banknote, Check, CheckCircle2, Clock3, Eye, Minus, Plus, TicketPercent, User } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press, Spinner } from '../../components/ui';
import { Button, IconButton, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { useSelectVehicle } from '../hooks/useSelectVehicle';
import { MAP_STYLE } from '../components/live/mapStyle';
import { CircleLocationMarker, PinLocationMarker, toSrc } from '../components/live/parts';
import { fallbackCar } from '../components/home/homeShared';

/** Pickup = brand-green dot, drop = red square, everywhere in the ride flow. */
const PICKUP = color.primary;
const DROP = color.danger;
/* paymentOptions name Tailwind classes for their icon tile; map them onto design-system tones. */
const TONES = { 'bg-green-50': color.successSoft, 'bg-blue-50': color.infoSoft, 'text-green-600': color.success, 'text-blue-600': color.info };

function VehicleIcon({ uri, style }) {
  const [failed, setFailed] = useState(false);
  const source = !failed && uri ? toSrc(uri) : null;
  return <Image source={source || fallbackCar} onError={() => setFailed(true)} style={style} resizeMode="contain" />;
}

function Sheet({ visible, onClose, children, insets }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} backdrop={color.overlay} spring={{ stiffness: 320, damping: 26 }} panelStyle={[styles.modal, { paddingBottom: space.xxl + insets.bottom }]}>
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
  const bookLabel = selectedVehicle
    ? isFarePending
      ? 'Calculating fare...'
      : selectedVehicle.supportsBidding && shouldUseDriverBidding
        ? `Request bid for ${selectedVehicle.name}`
        : rideMode === 'schedule'
          ? `Schedule ${selectedVehicle.name}`
          : `Book ${selectedVehicle.name}`
    : 'Select vehicle';
  const bidValue = Math.min(bidStepCount, selectedBidSteps);

  return (
    <View style={styles.screen}>
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
        {route.length > 1 ? <Polyline coordinates={route} strokeColor={color.primaryDeep} strokeWidth={4} /> : null}
        {pickupCoord ? <CircleLocationMarker position={pickupPosition} color={PICKUP} title="Pickup" /> : null}
        {(Array.isArray(stops) ? stops : []).map((stop, i) => {
          const c = toCoord(stop?.position || stop?.coords || stop);
          return c ? <Marker key={`stop-${i}`} coordinate={c} title={`Stop ${i + 1}`} pinColor={color.info} /> : null;
        })}
        {dropCoord ? <PinLocationMarker position={dropPosition} color={DROP} title="Drop" /> : null}
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

      <IconButton icon={ArrowLeft} label="Go back" onPress={() => navigate(-1)} style={[styles.back, { top: space.lg + insets.top }]} />

      <View style={[styles.sheet, { maxHeight: sheetMax }]}>
        <View style={styles.grabber} />

        <View style={styles.routeBox}>
          {cat ? <StatusBadge label={`Category: ${cat.charAt(0).toUpperCase()}${cat.slice(1)}`} tone="primary" style={{ marginBottom: space.sm }} /> : null}
          <View style={styles.routeRow}>
            <View style={styles.routeMain}>
              <View style={styles.routeRail}>
                <View style={styles.pickupDot} />
                <View style={styles.railLine} />
                <View style={styles.dropSquare} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: space.sm }}>
                <View>
                  <Text style={[styles.placeLabel, { color: PICKUP }]}>Pickup</Text>
                  <Text style={styles.place} numberOfLines={1}>{pickup}</Text>
                </View>
                <Press scale={0.99} onPress={openLocationEditor} accessibilityLabel={`Drop: ${drop}. Edit`} style={styles.dropPress}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.placeLabel, { color: DROP }]}>Drop</Text>
                    <Text style={styles.place} numberOfLines={1}>{drop}</Text>
                  </View>
                  <Text style={styles.edit}>Edit</Text>
                </Press>
              </View>
            </View>
            <Press scale={0.96} onPress={pickSchedule} accessibilityLabel={rideMode === 'schedule' ? 'Scheduled for later. Change time' : 'Ride now. Schedule for later'} style={[styles.when, rideMode === 'schedule' ? styles.whenOn : null]}>
              <Clock3 size={18} color={rideMode === 'schedule' ? color.onPrimary : color.primary} />
              <Text style={[styles.whenText, rideMode === 'schedule' ? { color: color.onPrimary } : null]}>{rideMode === 'schedule' ? 'Later' : 'Now'}</Text>
            </Press>
          </View>
          {tripMetrics.distanceMeters > 0 ? (
            <View style={styles.metrics}>
              <StatusBadge label={`${(tripMetrics.distanceMeters / 1000).toFixed(1)} km`} tone="neutral" />
              <StatusBadge label={`${tripMetrics.durationMinutes} mins`} tone="neutral" icon={Clock3} />
            </View>
          ) : null}
        </View>

        <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {isInitialVehicleResultsLoading ? (
            <View style={styles.finding} accessibilityRole="progressbar" accessibilityLabel="Finding available rides">
              <Spinner size={22} color={color.primary} />
              <Text style={styles.findingText}>Finding available rides</Text>
            </View>
          ) : vehicleLoadError ? (
            <View style={[styles.notice, { borderColor: color.dangerSoft }]}>
              <Text style={[styles.noticeTitle, { color: color.danger }]}>{vehicleLoadError}</Text>
              <Text style={styles.noticeBody}>Please try again later.</Text>
            </View>
          ) : displayedVehicles.length === 0 ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>No vehicles available</Text>
              <Text style={styles.noticeBody}>Try changing your location or method.</Text>
            </View>
          ) : (
            displayedVehicles.map((v) => {
              const isSelected = selected === v.id;
              const availability = availabilityByVehicleId[v.id] || DEFAULT_AVAILABILITY;
              const isUnavailable = !availability.totalDrivers;
              const compactEta = Math.max(1, availability.closestDriverEtaMinutes || tripMetrics.durationMinutes || 1);
              const noDrivers = isUnavailable && rideMode !== 'schedule';
              return (
                <View key={v.id} style={[styles.vehicle, isSelected ? styles.vehicleOn : null]}>
                  <Press scale={0.99} onPress={() => setSelected(v.id)} accessibilityRole="radio" accessibilityState={{ checked: isSelected }} accessibilityLabel={`${v.name}, ${isFarePending ? 'calculating fare' : formatVehicleFare(v)}, ${compactEta} minutes away`} style={styles.vehicleRow}>
                    <View style={styles.vehicleIconCol}>
                      <VehicleIcon uri={v.icon} style={{ width: 52, height: 36 }} />
                      <Text style={styles.eta}>{compactEta} min</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.vehicleTop}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.vehicleName} numberOfLines={1}>{v.name}</Text>
                          <Text style={[styles.vehicleSub, noDrivers ? { color: color.danger } : null]} numberOfLines={1}>{noDrivers ? `No nearby ${String(v.name).toLowerCase()} drivers` : v.sublabel}</Text>
                        </View>
                        <Text style={styles.fare}>{isFarePending ? '...' : formatVehicleFare(v)}</Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.selectedRow}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.availability} numberOfLines={2}>
                              {rideMode === 'schedule' ? `Scheduled for ${formatScheduledDisplay(scheduledAt)}` : isUnavailable ? 'Unavailable right now' : formatAvailabilityLine(availability)}
                            </Text>
                            {driverLoadError ? <Text style={[styles.availability, { color: color.danger }]}>{driverLoadError}</Text> : null}
                          </View>
                          <IconButton icon={Eye} label={`View details for ${v.name}`} variant="soft" size={36} iconSize={18} onPress={() => setPreviewVehicleId(v.id)} />
                        </View>
                      ) : null}
                    </View>
                  </Press>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.foot, { paddingBottom: space.md + insets.bottom }]}>
          <View style={styles.options}>
            <Press scale={0.98} onPress={() => setShowPaymentModal(true)} accessibilityLabel={`Payment: ${paymentMethod === 'Cash' ? 'Cash' : 'Online'}. Change`} style={[styles.option, styles.optionBorder]}>
              <Banknote size={18} color={color.success} />
              <Text style={styles.optionText} numberOfLines={1}>{paymentMethod === 'Cash' ? 'Cash' : 'Online'}</Text>
            </Press>
            <Press scale={0.98} onPress={() => setShowCouponModal(true)} accessibilityLabel={appliedPromo ? `Coupon ${appliedPromo?.promo?.code} applied` : 'Coupons'} style={[styles.option, styles.optionBorder]}>
              <TicketPercent size={18} color={appliedPromo ? color.success : color.goldText} />
              <Text style={[styles.optionText, appliedPromo ? { color: color.success } : null]} numberOfLines={1}>{appliedPromo?.promo?.code || (availablePromos.length ? `Coupon ${availablePromos.length}` : 'Coupon')}</Text>
            </Press>
            <View style={styles.option}>
              <User size={18} color={color.textSecondary} />
              <Text style={styles.optionText}>Myself</Text>
            </View>
          </View>

          {appliedPromo || promoError || promoFeedback ? (
            <View style={[styles.promoNote, promoError ? { backgroundColor: color.dangerSoft } : null]}>
              {appliedPromo && !promoError ? (
                <View style={styles.promoNoteRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.promoNoteTitle} numberOfLines={1}>{appliedPromo.promo?.code} applied for this zone</Text>
                    <Text style={styles.promoNoteBody}>
                      Save {formatCurrency(appliedPromoDiscount)}. Fare now {formatCurrency(discountedSelectedFare)}.
                    </Text>
                  </View>
                  <Press scale={0.96} onPress={() => clearAppliedPromo('Coupon removed.')} accessibilityLabel="Remove coupon" hitSlop={12} style={styles.promoRemoveBtn}>
                    <Text style={styles.promoRemove}>Remove</Text>
                  </Press>
                </View>
              ) : (
                <Text style={[styles.promoNoteBody, { color: promoError ? color.danger : color.success }]}>{promoError || promoFeedback}</Text>
              )}
            </View>
          ) : null}

          <Button title={bookLabel} size="lg" disabled={!canProceed} onPress={handleBook} style={{ marginTop: space.md }} />
          {rideMode === 'schedule' ? (
            <Text style={[styles.scheduleNote, scheduleError ? { color: color.danger } : null]}>{scheduleError || `Scheduled for ${formatScheduledDisplay(scheduledAt)}.`}</Text>
          ) : null}
        </View>
      </View>

      {/* Vehicle details */}
      <Sheet visible={!!previewVehicle} onClose={() => setPreviewVehicleId('')} insets={insets}>
        {previewVehicle ? (
          <>
            <View style={styles.previewHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.kicker}>Vehicle details</Text>
                <Text style={styles.modalTitle}>{previewVehicle.name}</Text>
                <Text style={styles.modalBody}>{previewVehicle.sublabel || 'Comfortable ride option for this route.'}</Text>
              </View>
              <View style={styles.previewIcon}>
                <VehicleIcon uri={previewVehicle.icon} style={{ width: 56, height: 48 }} />
              </View>
            </View>
            <View style={styles.statGrid}>
              {[
                ['Estimated fare', isFarePending ? 'Calculating...' : formatVehicleFare(previewVehicle), true],
                ['Seats', String(previewVehicle.capacity ?? ''), true],
                ['Booking type', formatDispatchLabel(previewVehicle), false],
                ['Availability', rideMode === 'schedule' ? 'Can be scheduled' : previewAvailability.totalDrivers ? `${previewAvailability.totalDrivers} nearby` : 'Unavailable now', false],
              ].map(([label, value, big]) => (
                <View key={label} style={styles.stat}>
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={big ? styles.statValueBig : styles.statValue}>{value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.snapshot}>
              <Text style={styles.statLabel}>Trip snapshot</Text>
              <Text style={styles.snapshotText}>
                {rideMode === 'schedule'
                  ? 'This vehicle can be reserved for a later trip at your chosen time.'
                  : previewAvailability.totalDrivers
                    ? formatAvailabilityLine(previewAvailability)
                    : 'No driver is currently online for this vehicle around your pickup.'}
              </Text>
            </View>
            <Button title="Close" variant="outline" onPress={() => setPreviewVehicleId('')} style={{ marginTop: space.xl }} />
          </>
        ) : null}
      </Sheet>

      {/* Bid fare */}
      <Sheet visible={!!(showBidModal && selectedVehicle?.supportsBidding && shouldUseDriverBidding)} onClose={() => setShowBidModal(false)} insets={insets}>
        <Text style={styles.kicker}>Bid fare</Text>
        <Text style={styles.modalTitle}>Choose your max fare</Text>
        <Text style={styles.modalBody}>Drivers can send offers up to this amount for {selectedVehicle?.name}.</Text>
        <View style={[styles.snapshot, { marginTop: space.xl }]}>
          <View style={styles.promoNoteRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.statLabel}>Bid range</Text>
              <Text style={styles.snapshotText}>Adjust the fare ceiling inside the admin-configured bidding range.</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.statLabel}>Max fare</Text>
              <Text style={styles.bidMax}>{formatCurrency(selectedBidCeiling)}</Text>
            </View>
          </View>
          {/* <input type="range">: a stepper and a fill bar */}
          <View style={styles.bidRow}>
            <IconButton icon={Minus} label="Lower max fare" variant="primary" disabled={bidValue <= 0} onPress={() => setBidStepCount(Math.max(0, bidValue - 1))} />
            <View style={styles.bidTrack} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: selectedBidSteps, now: bidValue }}>
              <View style={{ height: '100%', borderRadius: 4, backgroundColor: color.primary, width: `${selectedBidSteps ? (bidValue / selectedBidSteps) * 100 : 0}%` }} />
            </View>
            <IconButton icon={Plus} label="Raise max fare" variant="primary" disabled={bidValue >= selectedBidSteps} onPress={() => setBidStepCount(Math.min(selectedBidSteps, bidValue + 1))} />
          </View>
          <View style={styles.bidRangeRow}>
            <Text style={styles.bidRange}>Floor {formatCurrency(selectedBidFloorFare)}</Text>
            <Text style={styles.bidRange}>Ceiling {formatCurrency(selectedBidCeilingMaxFare)}</Text>
          </View>
        </View>
        <View style={styles.btnRow}>
          <Button title="Cancel" variant="outline" onPress={() => setShowBidModal(false)} style={{ flex: 1 }} />
          <Button title="Send bid" onPress={proceedToBooking} style={{ flex: 1 }} />
        </View>
      </Sheet>

      {/* Coupons */}
      <Sheet visible={showCouponModal} onClose={() => setShowCouponModal(false)} insets={insets}>
        <Text style={styles.kicker}>Coupons</Text>
        <Text style={styles.modalTitle}>Apply for this zone</Text>
        <Text style={styles.modalBody}>Only coupons created for this service location show here.</Text>
        <View style={styles.couponRow}>
          <TextInput
            value={promoCodeInput}
            onChangeText={(text) => {
              setPromoCodeInput(text.toUpperCase());
              setPromoError('');
              setPromoFeedback('');
            }}
            placeholder="Enter coupon code"
            placeholderTextColor={color.textDisabled}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Coupon code"
            style={styles.couponInput}
          />
          <Button
            title={applyingPromoCode ? 'Applying' : 'Apply'}
            fullWidth={false}
            disabled={Boolean(applyingPromoCode) || !selectedVehicle}
            onPress={async () => {
              if (await applyPromoCode(promoCodeInput)) setShowCouponModal(false);
            }}
            accessibilityLabel="Apply coupon"
          />
        </View>
        {promoError || promoFeedback ? <Text style={[styles.couponMsg, { color: promoError ? color.danger : color.success }]}>{promoError || promoFeedback}</Text> : null}
        <ScrollView style={{ marginTop: space.xl, maxHeight: height * 0.46 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm }}>
          {isLoadingPromos ? (
            <View style={[styles.promoRow, { flexDirection: 'row', alignItems: 'center', gap: space.sm }]}>
              <Spinner size={16} color={color.primary} />
              <Text style={styles.promoSummary}>Loading available coupons</Text>
            </View>
          ) : availablePromos.length ? (
            availablePromos.map((promo) => {
              const code = String(promo?.code || '').toUpperCase();
              const isApplied = String(appliedPromo?.promo?.code || '').toUpperCase() === code;
              return (
                <View key={promo?._id || promo?.code} style={[styles.promoRow, isApplied ? styles.promoRowOn : null]}>
                  <View style={styles.promoNoteRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                        <Text style={styles.promoCode} numberOfLines={1}>{promo?.code}</Text>
                        {isApplied ? <CheckCircle2 size={16} color={color.success} /> : null}
                      </View>
                      <Text style={styles.promoSummary}>{formatPromoSummary(promo)}</Text>
                    </View>
                    <Button
                      title={applyingPromoCode === code ? 'Applying' : isApplied ? 'Applied' : 'Use'}
                      variant={isApplied ? 'secondary' : 'outline'}
                      size="sm"
                      fullWidth={false}
                      disabled={Boolean(applyingPromoCode)}
                      onPress={async () => {
                        if (await applyPromoCode(promo?.code)) setShowCouponModal(false);
                      }}
                      accessibilityLabel={isApplied ? `${code} applied` : `Use coupon ${code}`}
                      style={{ minHeight: 44 }}
                    />
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
        <Text style={styles.kicker}>Payment</Text>
        <Text style={[styles.modalTitle, { marginBottom: space.lg }]}>Select method</Text>
        <View style={{ gap: space.sm }}>
          {paymentOptions.map(({ stateValue, label, sub, Icon, bg, color: fg }) => {
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
                style={[styles.payRow, on ? styles.payRowOn : null]}
              >
                <View style={[styles.payIcon, { backgroundColor: TONES[bg] || color.surfaceMuted }]}>
                  <Icon size={20} color={TONES[fg] || color.textSecondary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.payLabel}>{label}</Text>
                  <Text style={styles.paySub}>{sub}</Text>
                </View>
                <View style={[styles.radio, on ? styles.radioOn : null]}>
                  {on ? <Check size={14} color={color.onPrimary} strokeWidth={3} /> : null}
                </View>
              </Press>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfaceMuted },
  back: { position: 'absolute', left: space.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 360, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    backgroundColor: color.surface, overflow: 'hidden', ...elevation.sheet,
  },
  grabber: { width: 44, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center', marginTop: space.sm + 2, marginBottom: space.sm },
  routeBox: { paddingHorizontal: space.lg, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: color.border },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  routeMain: { flex: 1, minWidth: 0, flexDirection: 'row', gap: space.md },
  routeRail: { width: 14, alignItems: 'center', paddingTop: space.xs + 2 },
  pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: PICKUP, borderWidth: 2, borderColor: color.primarySoft },
  railLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: color.borderStrong, marginVertical: space.xs },
  dropSquare: { width: 12, height: 12, borderRadius: 2, backgroundColor: DROP, marginBottom: space.md },
  placeLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold' },
  place: { ...type.bodyStrong, color: color.text },
  dropPress: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  edit: { ...type.label, color: color.primary, paddingHorizontal: space.xs },
  when: { width: 56, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: space.xxs, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.primaryBorder, backgroundColor: color.primarySoft },
  whenOn: { borderColor: color.primary, backgroundColor: color.primary },
  whenText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.primary },
  metrics: { flexDirection: 'row', gap: space.sm, marginTop: space.sm, marginLeft: 14 + space.md },
  list: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm, gap: space.sm },

  finding: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: space.md },
  findingText: { ...type.small, color: color.textSecondary },
  notice: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.lg, paddingVertical: space.xl, alignItems: 'center' },
  noticeTitle: { ...type.bodyStrong, color: color.text, textAlign: 'center' },
  noticeBody: { ...type.small, marginTop: space.xs, color: color.textMuted, textAlign: 'center' },
  vehicle: { borderRadius: radii.lg, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface, overflow: 'hidden' },
  vehicleOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, minHeight: 72 },
  vehicleIconCol: { width: 56, alignItems: 'center' },
  eta: { ...type.caption, marginTop: space.xxs, color: color.textSecondary },
  vehicleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  vehicleName: { ...type.subheading, color: color.text },
  vehicleSub: { ...type.caption, color: color.textMuted },
  fare: { ...type.price, fontSize: 20, color: color.text },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  availability: { ...type.caption, color: color.textSecondary },

  foot: { borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.lg, paddingTop: space.md },
  options: { flexDirection: 'row', borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  option: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.sm, minHeight: 48 },
  optionBorder: { borderRightWidth: 1, borderRightColor: color.border },
  optionText: { ...type.label, flexShrink: 1, color: color.text },
  promoNote: { marginTop: space.sm, borderRadius: radii.md, backgroundColor: color.successSoft, paddingHorizontal: space.md, paddingVertical: space.sm },
  promoNoteRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  promoNoteTitle: { ...type.label, color: color.success },
  promoNoteBody: { ...type.caption, color: color.success },
  promoRemoveBtn: { minHeight: 36, justifyContent: 'center' },
  promoRemove: { ...type.label, color: color.danger },
  scheduleNote: { ...type.caption, marginTop: space.sm, color: color.textSecondary, textAlign: 'center' },

  modal: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.xl, paddingTop: space.md },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center', marginBottom: space.xl },
  kicker: { ...type.overline, color: color.goldText, marginBottom: space.xs },
  modalTitle: { ...type.heading, color: color.text },
  modalBody: { ...type.small, marginTop: space.xs, color: color.textMuted },
  previewHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.lg },
  previewIcon: { width: 68, height: 68, borderRadius: radii.lg, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  statGrid: { marginTop: space.xl, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  stat: { width: '48%', borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.bg, paddingHorizontal: space.lg, paddingVertical: space.md },
  statLabel: { ...type.caption, color: color.textMuted },
  statValue: { ...type.bodyStrong, marginTop: space.xs, color: color.text },
  statValueBig: { ...type.price, marginTop: space.xs, color: color.text },
  snapshot: { marginTop: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.goldSoft, padding: space.lg },
  snapshotText: { ...type.small, marginTop: space.xs, color: color.text },
  btnRow: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  bidMax: { ...type.priceLg, color: color.text },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg },
  bidTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: color.primarySoft, overflow: 'hidden' },
  bidRangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md },
  bidRange: { ...type.caption, color: color.textSecondary },
  couponRow: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  couponInput: { flex: 1, minWidth: 0, height: 48, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, paddingHorizontal: space.lg, ...type.bodyStrong, color: color.text, outlineStyle: 'none' },
  couponMsg: { ...type.small, marginTop: space.md },
  promoRow: { borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.bg, padding: space.lg },
  promoRowOn: { borderColor: color.success, backgroundColor: color.successSoft },
  promoCode: { ...type.bodyStrong, flexShrink: 1, color: color.text },
  promoSummary: { ...type.caption, marginTop: space.xs, color: color.textSecondary },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 64, borderRadius: radii.lg, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface },
  payRowOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  payIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  payLabel: { ...type.bodyStrong, color: color.text },
  paySub: { ...type.caption, color: color.textMuted },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: color.primary, borderColor: color.primary },
});
