import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, Clock, Upload, X } from 'lucide-react-native';
import Img from '../../../components/Img';
import { SelectField } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';
import { RT, RT_GRADIENT } from '../../theme';

/*
 * The small pieces the three onboarding steps share: shadcn Input / Label /
 * Button / Select, the white "bg-white p-4 rounded-md" sections and the
 * dashed upload tiles, drawn once.
 */

export function Section({ title, children, style }) {
  return (
    <View style={[styles.section, style]}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Label({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Hint({ children, style }) {
  return <Text style={[styles.hint, style]}>{children}</Text>;
}

/** shadcn Input (h-9, bg-white, text-sm). */
export function Field({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={tw.gray400}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[styles.input, focused ? { borderColor: RT.primary } : null, props.editable === false ? { opacity: 0.7 } : null, style]}
    />
  );
}

/** shadcn Select: a field that opens the option list in a sheet; `placeholder` shows while the value is empty. */
export function Dropdown({ value, options, onChange, placeholder, disabled, accessibilityLabel }) {
  const all = [{ value: '', label: placeholder }, ...options];
  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} style={disabled ? { opacity: 0.5 } : null}>
      <SelectField
        value={value || ''}
        options={all}
        onChange={onChange}
        accessibilityLabel={accessibilityLabel}
        style={styles.input}
        textStyle={[styles.inputText, !value ? { color: tw.gray500 } : null]}
        chevronColor={tw.gray500}
      />
    </View>
  );
}

/** The pill buttons ("Yes, Pure Veg", "Yes" / "No", ...). */
export function Pill({ label, active, onPress, activeColors = RT_GRADIENT, disabled }) {
  return (
    <Press scale={0.97} onPress={onPress} disabled={disabled} accessibilityRole="radio" accessibilityState={{ selected: Boolean(active) }}>
      {active ? (
        <LinearGradient colors={activeColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.pill, { borderColor: activeColors[0] }]}>
          <Text style={[styles.pillText, { color: '#fff' }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.pill, { backgroundColor: '#fff', borderColor: tw.gray200 }]}>
          <Text style={[styles.pillText, { color: tw.gray700 }]}>{label}</Text>
        </View>
      )}
    </Press>
  );
}

/** shadcn Button variant="outline" with the upload icon. */
export function UploadButton({ onPress, style }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityLabel="Upload" style={[styles.upload, style]}>
      <Upload size={16} color={tw.gray900} />
      <Text style={styles.uploadText}>Upload</Text>
    </Press>
  );
}

/** The round "x" the previews carry. */
export function RemoveButton({ onPress, style, label = 'Remove image' }) {
  return (
    <Press onPress={onPress} accessibilityLabel={label} hitSlop={6} style={style}>
      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.remove}>
        <X size={12} color="#fff" />
      </LinearGradient>
    </Press>
  );
}

/** A document photo (PAN / GST / FSSAI) with its remove button. */
export function DocumentPreview({ uri, label, onRemove }) {
  return (
    <View style={styles.document}>
      {uri ? (
        <Img source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={label} />
      ) : (
        <View style={styles.center}>
          <Text style={styles.hint}>Preview unavailable</Text>
        </View>
      )}
      <RemoveButton onPress={onRemove} label={`Remove ${label}`} style={{ position: 'absolute', top: 8, right: 8 }} />
    </View>
  );
}

const pad2 = (n) => String(n).padStart(2, '0');

/** MUI MobileTimePicker ("hh:mm a") in the web's bordered box: the field opens the Android time picker. */
export function TimeSelector({ label, value, onChange, stringToTime, timeToString, formatTime12Hour }) {
  const date = stringToTime(value);
  const open = () => {
    if (Platform.OS !== 'android') return;
    DateTimePickerAndroid.open({
      value: date || new Date(2000, 0, 1, 9, 0),
      mode: 'time',
      is24Hour: false,
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) onChange(timeToString(picked));
      },
    });
  };
  return (
    <View style={styles.timeBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Clock size={16} color={tw.gray800} />
        <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(500) }}>{label}</Text>
      </View>
      <Press scale={1} onPress={open} accessibilityLabel={label} style={styles.timeField}>
        <Text style={[styles.inputText, { fontSize: 12 }, !date ? { color: tw.gray500 } : null]}>{date ? formatTime12Hour(`${pad2(date.getHours())}:${pad2(date.getMinutes())}`) : 'Select time'}</Text>
      </Press>
    </View>
  );
}

/** The expiry-date button (shadcn Popover + Calendar on the web): opens the Android date picker, past days disabled. */
export function DateSelector({ value, onChange, parseLocalYMDDate, formatDateToLocalYMD }) {
  const date = parseLocalYMDDate(value);
  const open = () => {
    if (Platform.OS !== 'android') return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    DateTimePickerAndroid.open({
      value: date || today,
      mode: 'date',
      minimumDate: today,
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) onChange(formatDateToLocalYMD(picked));
      },
    });
  };
  return (
    <Press scale={1} onPress={open} accessibilityLabel="FSSAI expiry date" style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
      <Text style={[styles.inputText, !date ? { color: tw.gray500 } : null]}>
        {date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Select expiry date'}
      </Text>
      <Calendar size={16} color={tw.gray500} />
    </Press>
  );
}

export const styles = StyleSheet.create({
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 6, gap: 16 },
  sectionTitle: { fontSize: 18, lineHeight: 28, color: '#000', ...poppins(600) },
  label: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(400) },
  hint: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  input: { minHeight: 36, borderRadius: 6, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 4, justifyContent: 'center' },
  inputText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  pillText: { fontSize: 12, lineHeight: 16, ...poppins(400) },
  upload: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 6, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', paddingHorizontal: 16, ...shadow('sm') },
  uploadText: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(500) },
  remove: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...shadow('md') },
  document: { marginTop: 12, aspectRatio: 4 / 3, borderRadius: 6, overflow: 'hidden', backgroundColor: tw.gray100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timeBox: { borderRadius: 6, borderWidth: 1, borderColor: tw.gray200, backgroundColor: 'rgba(249,250,251,0.6)', paddingHorizontal: 12, paddingVertical: 8 },
  timeField: { height: 36, borderRadius: 4, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', paddingHorizontal: 12, justifyContent: 'center' },
});
