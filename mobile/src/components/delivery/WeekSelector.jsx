import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, endOfWeek, startOfWeek } from 'date-fns';
import { ChevronDown } from 'lucide-react-native';
import { Press } from '../ui';
import { ff, shadow, tw } from '../../theme';

/*
 * Port of components/WeekSelector.jsx: This week / Last week / Select day
 * pills and the centred range between hairlines. Pills are shadcn
 * `outline` buttons (colours read from the web's computed styles).
 * "Select day" opens the OS date picker where the web opens a
 * react-day-picker calendar in a popover (see CONVERSION.md, substitutions).
 */

const fmt = (d) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d);
const sameRange = (a, b) => a.start.toDateString() === b.start.toDateString() && a.end.toDateString() === b.end.toDateString();

function Pill({ label, active, onPress, children }) {
  return (
    <Press onPress={onPress} scale={1} accessibilityLabel={label} style={[styles.pill, shadow('xs'), active ? styles.pillOn : styles.pillOff]}>
      <Text style={[styles.pillText, { color: active ? '#004F3B' : '#270E01' }]}>{label}</Text>
      {children}
    </Press>
  );
}

export default function WeekSelector({ weekStartsOn = 0, onChange, style }) {
  const computeRange = useCallback((date) => ({ start: startOfWeek(date, { weekStartsOn }), end: endOfWeek(date, { weekStartsOn }) }), [weekStartsOn]);
  const [open, setOpen] = useState(false);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [range, setRange] = useState(() => computeRange(new Date()));

  const apply = (date) => {
    const r = computeRange(date);
    setRange(r);
    setAnchorDate(date);
    onChange?.(r);
  };

  return (
    <View style={[{ width: '100%' }, style]}>
      <View style={styles.pills}>
        <Pill label="This week" active={sameRange(range, computeRange(new Date()))} onPress={() => apply(new Date())} />
        <Pill label="Last week" onPress={() => apply(addDays(new Date(), -7))} />
        <Pill label="Select day" onPress={() => setOpen(true)}>
          <ChevronDown size={16} color="#270E01" style={{ marginLeft: 8 }} />
        </Pill>
      </View>

      <View style={styles.rangeRow}>
        <View style={styles.hair} />
        <Text style={styles.range}>
          {fmt(range.start)} - {fmt(range.end)}
        </Text>
        <View style={styles.hair} />
      </View>

      {open ? (
        <DateTimePicker
          value={anchorDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date(2020, 0, 1)}
          maximumDate={new Date(2030, 11, 31)}
          accentColor={tw.primary}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) apply(date);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pill: { height: 40, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pillOn: { backgroundColor: tw.primarySoft, borderColor: tw.primaryBorder },
  pillOff: { backgroundColor: '#fff', borderColor: '#F1EEE7' },
  pillText: { fontSize: 12, lineHeight: 16, ...ff(500) },
  rangeRow: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
  hair: { height: 1, flex: 1, backgroundColor: tw.gray200 },
  range: { fontSize: 18, lineHeight: 28, color: '#0A4D2B', ...ff(600) },
});
