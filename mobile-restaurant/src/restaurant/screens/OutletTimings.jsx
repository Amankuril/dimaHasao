import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, tw } from '../../theme';
import { PageHeader, Toggle } from '../components/ui';
import { useOutletTimings } from '../hooks/pages/useOutletTimings';
import { RT } from '../theme';

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
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Clock size={16} color={tw.gray700} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={styles.fieldWrap}>
        <Press scale={1} onPress={open} accessibilityLabel={`${label}: ${display}`} style={styles.field}>
          <Text style={styles.fieldText}>{display}</Text>
        </Press>
      </View>
      <Text style={styles.current}>Current: {display}</Text>
    </View>
  );
}

/** Port of Food/pages/restaurant/OutletTimings.jsx (/food/restaurant/outlet-timings). */
export default function OutletTimings() {
  const { companyName, goBack, expandedDay, days, loading, toggleDay, toggleDayOpen, handleTimeChange, dayNames, stringToTime, formatTime12Hour } = useOutletTimings();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) }}>Loading outlet timings...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageHeader title="Outlet timings" onBack={goBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}>
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.section}>{companyName} delivery</Text>
          <View style={{ height: 2, backgroundColor: RT.primary }} />
        </View>

        <View style={{ gap: 8 }}>
          {dayNames.map((day) => {
            const dayData = days[day] || { isOpen: true, openingTime: '09:00', closingTime: '22:00' };
            const isExpanded = expandedDay === day;
            return (
              <View key={day} style={styles.day}>
                <View style={[styles.dayHead, isExpanded ? { backgroundColor: tw.gray100 } : null]}>
                  <Press scale={1} onPress={() => toggleDay(day)} accessibilityState={{ expanded: isExpanded }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {isExpanded ? <ChevronUp size={20} color={tw.gray700} /> : <ChevronDown size={20} color={tw.gray700} />}
                    <Text style={styles.dayName}>{day}</Text>
                  </Press>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={styles.dayState}>{dayData.isOpen ? 'Open' : 'Close'}</Text>
                    <Toggle value={dayData.isOpen} onValueChange={() => toggleDayOpen(day)} onColor={tw.green500} accessibilityLabel={`${day} open`} />
                  </View>
                </View>

                {isExpanded ? (
                  <View style={styles.dayBody}>
                    {dayData.isOpen ? (
                      <>
                        <TimeField label="Opening time" value={stringToTime(dayData.openingTime)} display={formatTime12Hour(dayData.openingTime)} onChange={(date) => handleTimeChange(day, 'openingTime', date)} />
                        <TimeField label="Closing time" value={stringToTime(dayData.closingTime)} display={formatTime12Hour(dayData.closingTime)} onChange={(date) => handleTimeChange(day, 'closingTime', date)} />
                      </>
                    ) : (
                      <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, paddingLeft: 24, ...poppins(400) }}>This day is closed</Text>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, lineHeight: 24, color: RT.primary, textAlign: 'center', marginBottom: 8, ...poppins(600) },
  day: { backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 2, overflow: 'hidden' },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  dayName: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(500) },
  dayState: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) },
  dayBody: { padding: 16, gap: 16, borderTopWidth: 1, borderTopColor: tw.gray100 },
  fieldLabel: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  fieldWrap: { borderWidth: 1, borderColor: tw.gray200, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(249,250,251,0.6)' },
  field: { height: 36, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 4 },
  fieldText: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(400) },
  current: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
});
