import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ArrowLeft, Calendar, ChevronRight, Clock3, Info, MapPin, Users } from 'lucide-react-native';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import { useIntercityVehicle } from '../hooks/useIntercityVehicle';

const fromDateValue = (value) => {
  const [y, m, d] = String(value || '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
};

/** Port of Taxi/modules/user/pages/intercity/IntercityVehicle.jsx (/taxi/user/intercity/vehicle). */
export default function IntercityVehicle() {
  const insets = useSafeAreaInsets();
  const h = useIntercityVehicle();
  if (h.__guard) return null;

  const {
    navigate, fromCity, toCity, selectedPackages, pickupAddress, tripType, setTripType, rideMode, setRideMode,
    travelDate, setTravelDate, scheduledAt, setScheduledAt, passengers, setPassengers, selectedVehicleId, setSelectedVehicleId,
    scheduleError, setScheduleError, minTravelDate, maxTravelDate, minScheduledAt, maxScheduledAt, vehicles, selectedVehicle,
    finalFare, handleContinue, formatDateInputValue, formatDateTimeInputValue, calculateFare, getDisplayDate,
  } = h;

  // <input type="date"> -> the OS date picker
  const openTravelDate = () => {
    DateTimePickerAndroid.open({
      value: fromDateValue(travelDate),
      mode: 'date',
      minimumDate: fromDateValue(minTravelDate),
      maximumDate: fromDateValue(maxTravelDate),
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        setTravelDate(formatDateInputValue(date));
        setScheduleError('');
      },
    });
  };

  // <input type="datetime-local"> -> the OS date picker, then the time picker
  const openScheduledAt = () => {
    const min = new Date(minScheduledAt);
    const max = new Date(maxScheduledAt);
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
            const clamped = picked < min ? min : picked > max ? max : picked;
            setScheduledAt(formatDateTimeInputValue(clamped));
            setScheduleError('');
          },
        });
      },
    });
  };

  const seats = selectedVehicle?.seats || 1;

  return (
    <View style={{ flex: 1, backgroundColor: tw.slate50 }}>
      <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
        <Press scale={0.96} onPress={() => navigate(-1)} accessibilityLabel="Go back" style={styles.back} hitSlop={6}>
          <ArrowLeft size={18} color={tw.slate700} />
        </Press>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker}>Intercity booking</Text>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{toCity}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 140 + insets.bottom }}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.muted14}>Route</Text>
              <Text style={styles.route}>{fromCity} to {toCity}</Text>
            </View>
            <Text style={styles.count}>{selectedPackages.length} package{selectedPackages.length === 1 ? '' : 's'}</Text>
          </View>
          {pickupAddress ? (
            <View style={styles.pickup}>
              <MapPin size={16} color={tw.blue600} style={{ marginTop: 2 }} />
              <Text style={styles.pickupText} numberOfLines={2}>{pickupAddress}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>Trip details</Text>
          <Text style={[styles.muted14, { marginTop: 4, ...fo(400) }]}>Choose how and when this trip should run.</Text>

          <View style={styles.row2}>
            {['One Way', 'Round Trip'].map((type) => {
              const active = tripType === type;
              return (
                <Press key={type} onPress={() => setTripType(type)} accessibilityRole="radio" accessibilityState={{ selected: active }} style={[styles.choice, active ? styles.choiceOn : null]}>
                  <Text style={[styles.choiceText, active ? { color: tw.blue700 } : null]}>{type}</Text>
                </Press>
              );
            })}
          </View>

          <View style={styles.row2}>
            {[['now', 'Ride now', Clock3], ['schedule', 'Schedule', Calendar]].map(([mode, label, Icon]) => {
              const active = rideMode === mode;
              return (
                <Press key={mode} onPress={() => setRideMode(mode)} accessibilityRole="radio" accessibilityState={{ selected: active }} style={[styles.choice, active ? styles.choiceOn : null]}>
                  <Icon size={16} color={active ? tw.blue700 : tw.slate700} />
                  <Text style={[styles.choiceText, active ? { color: tw.blue700 } : null]}>{label}</Text>
                </Press>
              );
            })}
          </View>

          {rideMode === 'schedule' ? (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.label}>Travel date</Text>
              <Press onPress={openTravelDate} style={styles.field}>
                <Text style={styles.fieldText}>{travelDate || 'Select travel date'}</Text>
                <Calendar size={16} color={tw.slate400} />
              </Press>
              <Text style={[styles.label, { marginTop: 16 }]}>Pickup time</Text>
              <Press onPress={openScheduledAt} style={styles.field}>
                <Text style={styles.fieldText}>{scheduledAt ? scheduledAt.replace('T', ' ') : 'Select pickup time'}</Text>
                <Clock3 size={16} color={tw.slate400} />
              </Press>
              {scheduleError ? (
                <Text style={styles.scheduleError}>{scheduleError}</Text>
              ) : (
                <Text style={styles.hint}>Drivers will be notified automatically around this scheduled time.</Text>
              )}
            </View>
          ) : null}

          <View style={styles.passengers}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Users size={16} color={tw.slate500} />
              <View>
                <Text style={styles.passTitle}>Passengers</Text>
                <Text style={styles.hint0}>Up to {seats} seats</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Press onPress={() => setPassengers((current) => Math.max(1, current - 1))} accessibilityLabel="Fewer passengers" style={styles.step}>
                <Text style={styles.stepText}>-</Text>
              </Press>
              <Text style={styles.passCount}>{passengers}</Text>
              <Press onPress={() => setPassengers((current) => Math.min(seats, current + 1))} accessibilityLabel="More passengers" style={styles.step}>
                <Text style={styles.stepText}>+</Text>
              </Press>
            </View>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View>
            <Text style={styles.h3}>Choose vehicle</Text>
            <Text style={[styles.muted14, { marginTop: 4, ...fo(400) }]}>Only vehicles mapped to this package are shown.</Text>
          </View>

          {vehicles.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Info size={20} color={tw.slate400} />
              </View>
              <Text style={styles.passTitle}>No vehicles available</Text>
              <Text style={[styles.muted14, { marginTop: 4, ...fo(400) }]}>Try another destination or package.</Text>
            </View>
          ) : (
            vehicles.map((vehicle) => {
              const vehicleFare = calculateFare(vehicle, tripType);
              const isActive = selectedVehicleId === vehicle.id;
              return (
                <Press
                  key={vehicle.id}
                  onPress={() => {
                    setSelectedVehicleId(vehicle.id);
                    if (passengers > vehicle.seats) setPassengers(vehicle.seats);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  style={[styles.vehicle, isActive ? styles.vehicleOn : null]}
                >
                  <View style={styles.vehicleIcon}>
                    <Img source={{ uri: vehicle.icon }} style={{ width: 40, height: 40 }} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.h3} numberOfLines={1}>{vehicle.name}</Text>
                    <Text style={[styles.muted14, { marginTop: 4, ...fo(400) }]} numberOfLines={1}>{vehicle.seats} seats · {vehicle.packageTypeName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.fare}>Rs {vehicleFare.toLocaleString()}</Text>
                    <Text style={styles.hint0}>estimated</Text>
                  </View>
                </Press>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{tripType} · {getDisplayDate(rideMode, travelDate)}</Text>
          <Text style={styles.total}>Rs {finalFare.toLocaleString()}</Text>
        </View>
        <Press scale={0.98} disabled={!selectedVehicle} onPress={handleContinue} accessibilityState={{ disabled: !selectedVehicle }} style={[styles.cta, selectedVehicle ? null : { opacity: 0.5 }]}>
          <Text style={styles.ctaText}>Continue</Text>
          <ChevronRight size={16} color="#fff" />
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderBottomWidth: 1, borderBottomColor: tw.slate200 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...fo(500) },
  title: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...fo(600) },
  card: { borderRadius: 24, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', padding: 20, ...shadow('sm') },
  muted14: { fontSize: 14, lineHeight: 20, color: tw.slate500, ...fo(500) },
  route: { fontSize: 20, lineHeight: 28, color: tw.slate900, marginTop: 4, ...fo(600) },
  count: { fontSize: 12, lineHeight: 16, color: tw.blue700, backgroundColor: tw.blue50, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, overflow: 'hidden', ...fo(500) },
  pickup: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16, borderRadius: 16, backgroundColor: tw.slate50, paddingHorizontal: 16, paddingVertical: 12 },
  pickupText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.slate600, ...fo(400) },
  h3: { fontSize: 16, lineHeight: 24, color: tw.slate900, ...fo(600) },
  row2: { flexDirection: 'row', gap: 12, marginTop: 16 },
  choice: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12 },
  choiceOn: { borderColor: tw.blue600, backgroundColor: tw.blue50 },
  choiceText: { fontSize: 14, lineHeight: 20, color: tw.slate700, ...fo(500) },
  label: { fontSize: 14, lineHeight: 20, color: tw.slate700, marginBottom: 8, ...fo(500) },
  field: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', paddingHorizontal: 16 },
  fieldText: { fontSize: 14, color: tw.slate900, ...fo(400) },
  scheduleError: { marginTop: 8, fontSize: 14, lineHeight: 20, color: tw.rose500, ...fo(500) },
  hint: { marginTop: 8, fontSize: 12, lineHeight: 16, color: tw.slate500, ...fo(400) },
  hint0: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...fo(400) },
  passengers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, borderRadius: 16, backgroundColor: tw.slate50, paddingHorizontal: 16, paddingVertical: 12 },
  passTitle: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...fo(500) },
  step: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, lineHeight: 24, color: tw.slate700, ...fo(400) },
  passCount: { width: 32, textAlign: 'center', fontSize: 16, lineHeight: 24, color: tw.slate900, ...fo(600) },
  empty: { borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.slate300, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 24, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', padding: 16 },
  vehicleOn: { borderColor: tw.blue600, backgroundColor: '#F5F9FF' },
  vehicleIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  fare: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...fo(600) },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTopWidth: 1, borderTopColor: tw.slate200, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16 },
  total: { fontSize: 20, lineHeight: 28, color: tw.slate900, marginTop: 4, ...fo(600) },
  cta: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, backgroundColor: tw.slate900, paddingHorizontal: 20 },
  ctaText: { fontSize: 14, color: '#fff', ...fo(500) },
});
