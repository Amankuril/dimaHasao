import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, Check, Clock, Upload, X } from 'lucide-react-native';
import Fa from '../../../components/Fa';
import Img from '../../../components/Img';
import { SelectField } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { color, elevation, radii, space, type } from '../../../theme';

/*
 * The small pieces the three onboarding steps share: shadcn Input / Label /
 * Button / Select, the white "bg-white p-4 rounded-md" sections and the
 * dashed upload tiles, drawn once.
 */

export function Section({ title, children, style }) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <Fa name="fa-solid fa-leaf" size={12} color={color.gold} />
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {String(title).toUpperCase()}
          </Text>
        </View>
      ) : null}
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
      placeholderTextColor={color.textMuted}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[styles.input, styles.inputText, focused ? styles.inputFocused : null, props.editable === false ? styles.inputReadOnly : null, style]}
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
        textStyle={[styles.inputText, !value ? { color: color.textMuted } : null]}
        chevronColor={color.textMuted}
      />
    </View>
  );
}

/** The pill buttons ("Yes, Pure Veg", "Yes" / "No", ...). */
export function Pill({ label, active, onPress, activeColors = [color.primary], disabled }) {
  const on = activeColors[0];
  return (
    <Press
      scale={0.97}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active), disabled: Boolean(disabled) }}
      style={[styles.pill, active ? { backgroundColor: on, borderColor: on } : styles.pillOff]}
    >
      {active ? <Check size={14} color={color.onPrimary} strokeWidth={3} /> : null}
      <Text style={[styles.pillText, { color: active ? color.onPrimary : color.text }]}>{label}</Text>
    </Press>
  );
}

/** shadcn Button variant="outline" with the upload icon. */
export function UploadButton({ onPress, style }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityLabel="Upload" style={[styles.upload, style]}>
      <Upload size={18} color={color.primary} />
      <Text style={styles.uploadText}>Upload</Text>
    </Press>
  );
}

/** The round "x" the previews carry. */
export function RemoveButton({ onPress, style, label = 'Remove image' }) {
  return (
    <Press onPress={onPress} accessibilityLabel={label} hitSlop={8} style={style}>
      <View style={styles.remove}>
        <X size={16} color={color.textInverse} strokeWidth={2.5} />
      </View>
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
        <Clock size={16} color={color.textSecondary} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Press scale={1} onPress={open} accessibilityLabel={label} style={styles.timeField}>
        <Text style={[styles.inputText, !date ? { color: color.textMuted } : null]}>{date ? formatTime12Hour(`${pad2(date.getHours())}:${pad2(date.getMinutes())}`) : 'Select time'}</Text>
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
      <Text style={[styles.inputText, !date ? { color: color.textMuted } : null]}>
        {date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Select expiry date'}
      </Text>
      <Calendar size={18} color={color.textMuted} />
    </Press>
  );
}

export const styles = StyleSheet.create({
  section: { backgroundColor: color.surface, padding: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, gap: space.lg, ...elevation.card },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionTitle: { ...type.sectionSerif, color: color.primary, flexShrink: 1 },
  label: { ...type.label, color: color.textSecondary },
  hint: { ...type.caption, color: color.textMuted },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.md, paddingVertical: space.xs, justifyContent: 'center' },
  inputFocused: { borderColor: color.primary, borderWidth: 1.5 },
  inputReadOnly: { backgroundColor: color.surfaceMuted, color: color.textSecondary },
  inputText: { ...type.body, color: color.text },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, minHeight: 44, paddingHorizontal: space.lg, borderRadius: radii.pill, borderWidth: 1 },
  pillOff: { backgroundColor: color.surface, borderColor: color.borderStrong },
  pillText: { ...type.label },
  upload: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, height: 48, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.primaryBorder, backgroundColor: color.primarySoft, paddingHorizontal: space.lg },
  uploadText: { ...type.button, color: color.primary },
  remove: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(17,24,39,0.72)', alignItems: 'center', justifyContent: 'center' },
  document: { marginTop: space.md, aspectRatio: 4 / 3, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timeBox: { borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted, paddingHorizontal: space.md, paddingVertical: space.md },
  timeField: { height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.md, justifyContent: 'center' },
});
