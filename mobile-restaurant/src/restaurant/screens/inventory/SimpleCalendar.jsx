import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { IconButton } from '../../../components/ds';
import { Dialog } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { color as c, radii, space, type } from '../../../theme';

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
    <Dialog visible={Boolean(isOpen)} onClose={onClose} backdrop={c.overlay} panelStyle={styles.panel}>
      <View style={{ padding: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
          <IconButton icon={ChevronLeft} label="Previous month" variant="soft" onPress={() => shiftMonth(-1)} />
          <Text style={[type.heading, { color: c.text }]} accessibilityRole="header">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text>
          <IconButton icon={ChevronRight} label="Next month" variant="soft" onPress={() => shiftMonth(1)} />
        </View>
        <View style={styles.row}>
          {DAYS.map((day) => (
            <View key={day} style={styles.cell}>
              <Text style={[type.caption, { textAlign: 'center', color: c.textMuted, paddingVertical: space.sm }]}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.row}>
          {calendarDays.map((date, index) => {
            const inMonth = date.getMonth() === currentMonth.getMonth();
            const isSel = Boolean(selected) && date.toDateString() === selected;
            const isToday = date.toDateString() === today;
            const fg = !inMonth ? c.textDisabled : isSel ? c.onPrimary : isToday ? c.primary : c.text;
            const label = <Text style={[inMonth && (isToday || isSel) ? type.bodyStrong : type.body, { color: fg }]}>{date.getDate()}</Text>;
            return (
              <View key={index} style={[styles.cell, { paddingVertical: 2 }]}>
                <Press
                  scale={1}
                  onPress={() => {
                    onDateSelect(new Date(date));
                    onClose();
                  }}
                  accessibilityLabel={date.toDateString()}
                  accessibilityState={{ selected: inMonth && isSel }}
                  style={{ height: 44, borderRadius: radii.md, overflow: 'hidden', backgroundColor: inMonth && isSel ? c.primary : inMonth && isToday ? c.primarySoft : 'transparent' }}
                >
                  <View style={styles.fill}>{label}</View>
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
  panel: { width: 360, maxWidth: '92%', backgroundColor: c.surface, borderRadius: radii.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, paddingHorizontal: 2 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
