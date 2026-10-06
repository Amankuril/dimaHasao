import { StyleSheet, Text, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { PrimaryButton } from './ui';

/*
 * Stand-in for Food/components/ui/date-range-calendar.tsx. The web draws its
 * own two-month calendar inside a dialog; here the dialog keeps the same job
 * (pick a start and an end, then apply) and each date opens the Android date
 * picker.
 */

const label = (date) => (date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date');

export default function DateRangeDialog({ visible, onClose, startDate, endDate, onDateRangeChange, onApply, applyLabel = 'Apply Custom Range', title = 'Select date range' }) {
  const pick = (which) => {
    const current = which === 'start' ? startDate : endDate;
    DateTimePickerAndroid.open({
      value: current ? new Date(current) : new Date(),
      mode: 'date',
      maximumDate: new Date(),
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
      <View style={{ flex: 1 }}>
        <Text style={styles.caption}>{caption}</Text>
        <Text style={styles.value}>{label(value)}</Text>
      </View>
      <Calendar size={16} color={tw.gray400} />
    </Press>
  );
  return (
    <Dialog visible={visible} onClose={onClose} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.panel}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={styles.title}>{title}</Text>
        <Press onPress={onClose} accessibilityLabel="Close" hitSlop={8}>
          <X size={20} color={tw.gray900} />
        </Press>
      </View>
      <View style={{ gap: 12 }}>
        {field('start', 'FROM', startDate)}
        {field('end', 'TO', endDate)}
      </View>
      <PrimaryButton title={applyLabel} onPress={onApply} disabled={!startDate || !endDate} style={{ marginTop: 16 }} textStyle={{ fontSize: 16, lineHeight: 24, ...poppins(700) }} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  panel: { width: '90%', maxWidth: 384, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 24, ...shadow('2xl') },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  caption: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: tw.gray500, ...poppins(600) },
  value: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
});
