import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { poppins, tw } from '../../../theme';
import { RT, RT_GRADIENT } from '../../theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Port of the page's SimpleCalendar: a Monday-first month grid in a dialog. */
export default function SimpleCalendar({ selectedDate, onDateSelect, isOpen, onClose }) {
  const [currentMonth, setCurrentMonth] = useState(() => (selectedDate ? new Date(selectedDate) : new Date()));
  useEffect(() => {
    if (selectedDate) setCurrentMonth(new Date(selectedDate));
  }, [selectedDate]);

  const calendarDays = useMemo(() => {
    const first = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1));
    const days = [];
    const cursor = new Date(start);
    for (let i = 0; i < 42; i += 1) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  const shiftMonth = (delta) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + delta);
    setCurrentMonth(next);
  };
  const today = new Date().toDateString();
  const selected = selectedDate ? new Date(selectedDate).toDateString() : null;

  return (
    <Dialog visible={Boolean(isOpen)} onClose={onClose} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.panel}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Press onPress={() => shiftMonth(-1)} accessibilityLabel="Previous month" style={{ padding: 4 }}>
            <ChevronLeft size={20} color={tw.gray900} />
          </Press>
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) }}>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text>
          <Press onPress={() => shiftMonth(1)} accessibilityLabel="Next month" style={{ padding: 4 }}>
            <ChevronRight size={20} color={tw.gray900} />
          </Press>
        </View>
        <View style={styles.row}>
          {DAYS.map((day) => (
            <View key={day} style={styles.cell}>
              <Text style={{ textAlign: 'center', fontSize: 12, lineHeight: 16, color: tw.gray500, paddingVertical: 8, ...poppins(500) }}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.row}>
          {calendarDays.map((date, index) => {
            const inMonth = date.getMonth() === currentMonth.getMonth();
            const isSel = Boolean(selected) && date.toDateString() === selected;
            const isToday = date.toDateString() === today;
            const color = !inMonth ? tw.gray300 : isSel ? '#fff' : isToday ? RT.primary : tw.gray700;
            const label = <Text style={{ fontSize: 14, lineHeight: 20, color, ...(inMonth && isToday && !isSel ? poppins(600) : poppins(400)) }}>{date.getDate()}</Text>;
            return (
              <View key={index} style={[styles.cell, { paddingVertical: 2 }]}>
                <Press
                  scale={1}
                  onPress={() => {
                    onDateSelect(new Date(date));
                    onClose();
                  }}
                  style={{ height: 40, borderRadius: 4, overflow: 'hidden', backgroundColor: inMonth && isToday && !isSel ? '#f9f0f7' : 'transparent' }}
                >
                  {inMonth && isSel ? (
                    <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>{label}</LinearGradient>
                  ) : (
                    <View style={styles.fill}>{label}</View>
                  )}
                </Press>
              </View>
            );
          })}
        </View>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  panel: { width: 360, maxWidth: '92%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, paddingHorizontal: 2 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
