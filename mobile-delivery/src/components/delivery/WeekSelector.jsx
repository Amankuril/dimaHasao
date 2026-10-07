import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDays, endOfWeek, startOfWeek } from 'date-fns';
import { CalendarDays } from 'lucide-react-native';
import { Press } from '../ui';
import { color, radii, space, type } from '../../theme';

/*
 * This week / Last week / Select day chips and the selected range below.
 * "Select day" opens the OS date picker and selects that day's week.
 */

const fmt = (d) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d);
const sameRange = (a, b) => a.start.toDateString() === b.start.toDateString() && a.end.toDateString() === b.end.toDateString();

function Chip({ label, active, onPress, icon: Icon }) {
  return (
    <Press
      onPress={onPress}
      scale={0.97}
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active) }}
      style={[styles.chip, active ? styles.chipOn : styles.chipOff]}
    >
      {Icon ? <Icon size={16} color={active ? color.primary : color.textSecondary} /> : null}
      <Text style={[type.label, { color: active ? color.primary : color.text }]} numberOfLines={1}>
        {label}
      </Text>
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

  const isThisWeek = sameRange(range, computeRange(new Date()));
  const isLastWeek = sameRange(range, computeRange(addDays(new Date(), -7)));

  return (
    <View style={[{ width: '100%' }, style]}>
      <View style={styles.chips}>
        <Chip label="This week" active={isThisWeek} onPress={() => apply(new Date())} />
        <Chip label="Last week" active={isLastWeek} onPress={() => apply(addDays(new Date(), -7))} />
        <Chip label="Select day" icon={CalendarDays} active={!isThisWeek && !isLastWeek} onPress={() => setOpen(true)} />
      </View>

      <View style={styles.rangeRow}>
        <View style={styles.hair} />
        <Text style={[type.subheading, { color: color.primary }]} accessibilityLabel={`Selected week ${fmt(range.start)} to ${fmt(range.end)}`}>
          {fmt(range.start)} – {fmt(range.end)}
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
          accentColor={color.primary}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  chip: {
    height: 44,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs + 2,
  },
  chipOn: { backgroundColor: color.primarySoft, borderColor: color.primary },
  chipOff: { backgroundColor: color.surface, borderColor: color.borderStrong },
  rangeRow: { marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  hair: { height: StyleSheet.hairlineWidth, flex: 1, backgroundColor: color.borderStrong },
});
