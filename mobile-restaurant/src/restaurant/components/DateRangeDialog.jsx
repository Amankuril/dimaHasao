import { StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { Button, IconButton } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';

/*
 * Stand-in for Food/components/ui/date-range-calendar.tsx. The web draws its
 * own two-month calendar inside a dialog; here the dialog keeps the same job
 * (pick a start and an end, then apply) and each date opens the Android date
 * picker.
 */

const label = (date) => (date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date');

export default function DateRangeDialog({ visible, onClose, startDate, endDate, onDateRangeChange, onApply, applyLabel = 'Apply custom range', title = 'Select date range' }) {
  const pick = (which) => {
    const current = which === 'start' ? startDate : endDate;
    DateTimePickerAndroid.open({
      value: current ? new Date(current) : new Date(),
      mode: 'date',
      ...(which === 'end' && startDate ? { minimumDate: new Date(startDate) } : {}),
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        if (which === 'start') onDateRangeChange(date, endDate && new Date(endDate) < date ? date : endDate);
        else onDateRangeChange(startDate, date);
      },
    });
  };
  const field = (which, caption, value) => (
    <Press scale={0.99} onPress={() => pick(which)} accessibilityLabel={`${caption}: ${label(value)}`} style={styles.field}>
      <View style={styles.fieldIcon}>
        <Calendar size={18} color={color.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.caption}>{caption}</Text>
        <Text style={[styles.value, !value ? { color: color.textMuted } : null]}>{label(value)}</Text>
      </View>
    </Press>
  );
  return (
    <Dialog visible={visible} onClose={onClose} backdrop={color.overlay} panelStyle={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <IconButton icon={X} label="Close" onPress={onClose} style={{ marginRight: -space.sm }} />
      </View>
      <View style={{ gap: space.md }}>
        {field('start', 'From', startDate)}
        {field('end', 'To', endDate)}
      </View>
      <Button title={applyLabel} size="lg" onPress={onApply} disabled={!startDate || !endDate} style={{ marginTop: space.xl }} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  panel: { width: '90%', maxWidth: 400, alignSelf: 'center', backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xxl, ...elevation.sheet },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  title: { flex: 1, ...type.heading, color: color.text },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  fieldIcon: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  caption: { ...type.caption, color: color.textMuted },
  value: { ...type.bodyStrong, color: color.text },
});
