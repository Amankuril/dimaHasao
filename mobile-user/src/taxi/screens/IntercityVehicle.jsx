import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ArrowLeft, Calendar, ChevronRight, Clock3, Info, Minus, Plus, Users } from 'lucide-react-native';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { Button, EmptyState, IconButton, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
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
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: space.sm + insets.top }]}>
        <IconButton icon={ArrowLeft} label="Go back" onPress={() => navigate(-1)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker}>Intercity booking</Text>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{toCity}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.muted}>Route</Text>
              <Text style={styles.route}>{fromCity} to {toCity}</Text>
            </View>
            <StatusBadge label={`${selectedPackages.length} package${selectedPackages.length === 1 ? '' : 's'}`} tone="primary" />
          </View>
          {pickupAddress ? (
            <View style={styles.pickup}>
              <View style={styles.pickupDot} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.pickupLabel}>Pickup</Text>
                <Text style={styles.pickupText} numberOfLines={2}>{pickupAddress}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>Trip details</Text>
          <Text style={[styles.muted, { marginTop: space.xxs }]}>Choose how and when this trip should run.</Text>

          <View style={styles.row2} accessibilityRole="radiogroup">
            {['One Way', 'Round Trip'].map((type_) => {
              const active = tripType === type_;
              return (
                <Press key={type_} onPress={() => setTripType(type_)} accessibilityRole="radio" accessibilityState={{ selected: active }} style={[styles.choice, active ? styles.choiceOn : null]}>
                  <Text style={[styles.choiceText, active ? { color: color.onPrimary } : null]}>{type_ === 'One Way' ? 'One way' : 'Round trip'}</Text>
                </Press>
              );
            })}
          </View>

          <View style={styles.row2} accessibilityRole="radiogroup">
            {[['now', 'Ride now', Clock3], ['schedule', 'Schedule', Calendar]].map(([mode, label, Icon]) => {
              const active = rideMode === mode;
              return (
                <Press key={mode} onPress={() => setRideMode(mode)} accessibilityRole="radio" accessibilityState={{ selected: active }} style={[styles.choice, active ? styles.choiceOn : null]}>
                  <Icon size={18} color={active ? color.onPrimary : color.text} />
                  <Text style={[styles.choiceText, active ? { color: color.onPrimary } : null]}>{label}</Text>
                </Press>
              );
            })}
          </View>

          {rideMode === 'schedule' ? (
            <View style={{ marginTop: space.lg }}>
              <Text style={styles.label}>Travel date</Text>
              <Press onPress={openTravelDate} accessibilityLabel={`Travel date ${travelDate || 'not set'}. Change`} style={styles.field}>
                <Text style={styles.fieldText}>{travelDate || 'Select travel date'}</Text>
                <Calendar size={18} color={color.textMuted} />
              </Press>
              <Text style={[styles.label, { marginTop: space.lg }]}>Pickup time</Text>
              <Press onPress={openScheduledAt} accessibilityLabel={`Pickup time ${scheduledAt ? scheduledAt.replace('T', ' ') : 'not set'}. Change`} style={styles.field}>
                <Text style={styles.fieldText}>{scheduledAt ? scheduledAt.replace('T', ' ') : 'Select pickup time'}</Text>
                <Clock3 size={18} color={color.textMuted} />
              </Press>
              {scheduleError ? (
                <Text style={styles.scheduleError} accessibilityLiveRegion="polite">{scheduleError}</Text>
              ) : (
                <Text style={styles.hint}>Drivers will be notified automatically around this scheduled time.</Text>
              )}
            </View>
          ) : null}

          <View style={styles.passengers}>
            <View style={styles.passLeft}>
              <Users size={18} color={color.textSecondary} />
              <View>
                <Text style={styles.passTitle}>Passengers</Text>
                <Text style={styles.hint0}>Up to {seats} seats</Text>
              </View>
            </View>
            <View style={styles.stepper}>
              <IconButton icon={Minus} label="Fewer passengers" variant="primary" onPress={() => setPassengers((current) => Math.max(1, current - 1))} />
              <Text style={styles.passCount} accessibilityLabel={`${passengers} passengers`}>{passengers}</Text>
              <IconButton icon={Plus} label="More passengers" variant="primary" onPress={() => setPassengers((current) => Math.min(seats, current + 1))} />
            </View>
          </View>
        </View>

        <View style={{ gap: space.md }}>
          <View>
            <Text style={styles.h3}>Choose vehicle</Text>
            <Text style={[styles.muted, { marginTop: space.xxs }]}>Only vehicles mapped to this package are shown.</Text>
          </View>

          {vehicles.length === 0 ? (
            <View style={styles.empty}>
              <EmptyState icon={Info} title="No vehicles available" message="Try another destination or package." style={{ paddingVertical: space.xxl }} />
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
                  accessibilityLabel={`${vehicle.name}, ${vehicle.seats} seats, estimated Rs ${vehicleFare.toLocaleString()}`}
                  style={[styles.vehicle, isActive ? styles.vehicleOn : null]}
                >
                  <View style={styles.vehicleIcon}>
                    <Img source={{ uri: vehicle.icon }} style={{ width: 44, height: 44 }} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.vehicleName} numberOfLines={1}>{vehicle.name}</Text>
                    <Text style={styles.vehicleSub} numberOfLines={1}>{vehicle.seats} seats · {vehicle.packageTypeName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.fare}>₹{vehicleFare.toLocaleString()}</Text>
                    <Text style={styles.hint0}>estimated</Text>
                  </View>
                </Press>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.footKicker} numberOfLines={1}>{tripType === 'One Way' ? 'One way' : tripType === 'Round Trip' ? 'Round trip' : tripType} · {getDisplayDate(rideMode, travelDate)}</Text>
          <Text style={styles.total}>₹{finalFare.toLocaleString()}</Text>
        </View>
        <Button title="Continue" iconRight={ChevronRight} size="lg" fullWidth={false} disabled={!selectedVehicle} onPress={handleContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingBottom: space.sm, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  kicker: { ...type.overline, color: color.goldText },
  title: { ...type.heading, color: color.text },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  card: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: space.lg, ...elevation.card },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  muted: { ...type.small, color: color.textMuted },
  route: { ...type.heading, color: color.text, marginTop: space.xxs },
  pickup: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginTop: space.lg, borderRadius: radii.md, backgroundColor: color.bg, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg, paddingVertical: space.md },
  pickupDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: color.primary },
  pickupLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.primary },
  pickupText: { ...type.small, color: color.text },
  h3: { ...type.subheading, color: color.text },
  row2: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  choice: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.lg },
  choiceOn: { borderColor: color.primary, backgroundColor: color.primary },
  choiceText: { ...type.label, color: color.text },
  label: { ...type.label, color: color.text, marginBottom: space.sm },
  field: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.lg },
  fieldText: { ...type.body, color: color.text },
  scheduleError: { ...type.small, marginTop: space.sm, color: color.danger },
  hint: { ...type.caption, marginTop: space.sm, color: color.textMuted },
  hint0: { ...type.caption, color: color.textMuted },
  passengers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginTop: space.lg, borderRadius: radii.md, backgroundColor: color.bg, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg, paddingVertical: space.sm },
  passLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1, minWidth: 0 },
  passTitle: { ...type.bodyStrong, color: color.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  passCount: { width: 32, textAlign: 'center', ...type.subheading, color: color.text },
  empty: { borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.surface },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radii.lg, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface, padding: space.md, minHeight: 72 },
  vehicleOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  vehicleIcon: { width: 60, height: 60, borderRadius: radii.md, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { ...type.subheading, color: color.text },
  vehicleSub: { ...type.small, color: color.textMuted },
  fare: { ...type.price, color: color.text },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.lg, paddingTop: space.md, ...elevation.sheet },
  footKicker: { ...type.caption, color: color.textSecondary },
  total: { ...type.priceLg, color: color.text },
});
