import { StyleSheet, Text } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Press } from '../../components/ui';
import { outfit } from '../../theme';
import { DT } from '../ui/dt';

/*
 * <input type="date"> of the settings pages: shows dd/mm/yyyy, holds the web's YYYY-MM-DD value and opens
 * the system date dialog.
 */
const toDisplay = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

const pad = (n) => String(n).padStart(2, '0');

export default function DriverDateField({ value, onChange, style, accessibilityLabel }) {
  const display = toDisplay(value);
  const open = () => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    DateTimePickerAndroid.open({
      value: m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(),
      mode: 'date',
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        onChange(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
      },
    });
  };
  return (
    <Press scale={1} onPress={open} accessibilityLabel={accessibilityLabel} style={[styles.field, style]}>
      <Text style={[styles.text, !display && { color: DT.faint }]}>{display || 'dd/mm/yyyy'}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 48, justifyContent: 'center', borderRadius: DT.radius.md, borderWidth: 1.5, borderColor: DT.border, backgroundColor: DT.bg, paddingHorizontal: 16, paddingVertical: 12 },
  text: { fontSize: 14, lineHeight: 20, color: DT.ink, ...outfit(700) },
});


