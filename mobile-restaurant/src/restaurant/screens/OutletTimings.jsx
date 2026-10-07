import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ChevronDown, ChevronUp, Clock, Pencil } from 'lucide-react-native';
import { Card, SectionHeader, StatusBadge } from '../../components/ds';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';
import { useOutletTimings } from '../hooks/pages/useOutletTimings';
import { ScreenHeader, Switch } from './inventory/partnerKit';

/** MUI MobileTimePicker ("hh:mm a") -> the field opens the Android time picker. */
function TimeField({ label, value, display, onChange }) {
  const open = () =>
    DateTimePickerAndroid.open({
      value: value || new Date(),
      mode: 'time',
      is24Hour: false,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(date);
      },
    });
  return (
    <View style={{ flex: 1, minWidth: 136 }}>
      <Text style={[type.label, { color: color.text, marginBottom: space.sm }]}>{label}</Text>
      <Press scale={0.98} onPress={open} accessibilityLabel={`${label}: ${display}. Change`} style={styles.field}>
        <Clock size={18} color={color.primary} />
        <Text style={[type.bodyStrong, { flex: 1, color: color.text }]}>{display}</Text>
        <Pencil size={16} color={color.textMuted} />
      </Press>
    </View>
  );
}

/** Port of Food/pages/restaurant/OutletTimings.jsx (/food/restaurant/outlet-timings). */
export default function OutletTimings() {
  const insets = useSafeAreaInsets();
  const { companyName, goBack, expandedDay, days, loading, toggleDay, toggleDayOpen, handleTimeChange, dayNames, stringToTime, formatTime12Hour } = useOutletTimings();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScreenHeader title="Outlet timings" onBack={goBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
          <ActivityIndicator size="large" color={color.primary} />
          <Text style={[type.body, { color: color.textSecondary }]}>Loading outlet timings…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title="Outlet timings" subtitle={`${companyName} delivery`} onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + insets.bottom }}>
        <SectionHeader title="Weekly hours" />
        <Text style={[type.small, { color: color.textSecondary, marginTop: -space.xs, marginBottom: space.md }]}>Tap a day to change its opening and closing time. Use the switch to open or close the outlet for that day.</Text>

        <Card padded={false} style={{ overflow: 'hidden' }}>
          {dayNames.map((day, index) => {
            const dayData = days[day] || { isOpen: true, openingTime: '09:00', closingTime: '22:00' };
            const isExpanded = expandedDay === day;
            const last = index === dayNames.length - 1;
            return (
              <View key={day} style={[!last && styles.divider, isExpanded && { backgroundColor: color.surfaceMuted }]}>
                <View style={styles.dayHead}>
                  <Press
                    scale={1}
                    onPress={() => toggleDay(day)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    accessibilityLabel={`${day}, ${dayData.isOpen ? `open ${formatTime12Hour(dayData.openingTime)} to ${formatTime12Hour(dayData.closingTime)}` : 'closed'}`}
                    style={styles.dayPress}
                  >
                    {isExpanded ? <ChevronUp size={20} color={color.primary} /> : <ChevronDown size={20} color={color.textMuted} />}
                    <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                        <Text style={[type.bodyStrong, { color: color.text }]}>{day}</Text>
                        <StatusBadge label={dayData.isOpen ? 'Open' : 'Closed'} tone={dayData.isOpen ? 'primary' : 'neutral'} />
                      </View>
                      {dayData.isOpen ? (
                        <View style={styles.timeChip}>
                          <Clock size={14} color={color.textSecondary} />
                          <Text style={[type.label, { color: color.text }]}>
                            {formatTime12Hour(dayData.openingTime)} – {formatTime12Hour(dayData.closingTime)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Press>
                  <Switch value={dayData.isOpen} onValueChange={() => toggleDayOpen(day)} accessibilityLabel={`${day} open`} />
                </View>

                {isExpanded ? (
                  <View style={styles.dayBody}>
                    {dayData.isOpen ? (
                      <View style={styles.fields}>
                        <TimeField label="Opening time" value={stringToTime(dayData.openingTime)} display={formatTime12Hour(dayData.openingTime)} onChange={(date) => handleTimeChange(day, 'openingTime', date)} />
                        <TimeField label="Closing time" value={stringToTime(dayData.closingTime)} display={formatTime12Hour(dayData.closingTime)} onChange={(date) => handleTimeChange(day, 'closingTime', date)} />
                      </View>
                    ) : (
                      <Text style={[type.small, { color: color.textMuted }]}>This day is closed. Turn the switch on to set hours.</Text>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md, paddingRight: space.md, minHeight: 64 },
  dayPress: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, alignSelf: 'flex-start', paddingHorizontal: space.sm + 2, height: 28, borderRadius: radii.pill, backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  dayBody: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  field: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
});
