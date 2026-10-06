import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Check } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { SelectField as KitSelect } from '../../components/kit';
import { OB, jk, obLabel } from './onboardingTheme';

/*
 * Port of driver/pages/registration/OnboardingFields.jsx (+ the .dh-field / .dh-chip /
 * .dh-cta / .dh-alert rules of onboarding.css): the handful of inputs the onboarding steps use.
 */

/** animate-spin wrapper (Loader2). */
export function Spin({ children }) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(rot, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [rot]);
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

/** The full-screen "min-h-dvh items-center justify-center" spinner of the step screens. */
export function OnboardingLoading() {
  return (
    <View style={{ flex: 1, backgroundColor: OB.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={OB.primary} />
    </View>
  );
}

/** .dh-cta */
export function CtaButton({ onPress, disabled, children, style }) {
  return (
    <Press
      scale={0.99}
      onPress={onPress}
      disabled={disabled}
      style={[styles.cta, { backgroundColor: disabled ? '#d9d3c2' : OB.primary }, style]}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.ctaText, { color: disabled ? '#93917f' : '#fff' }]}>{children}</Text>
      ) : (
        children
      )}
    </Press>
  );
}

/** .dh-alert */
export function Alert({ children, style }) {
  return (
    <View accessibilityRole="alert" style={[styles.alert, style]}>
      <Text style={styles.alertText}>{children}</Text>
    </View>
  );
}

/** The bordered box all fields share (.dh-field). */
export function FieldBox({ focused, invalid, children, style }) {
  return (
    <View
      style={[
        styles.box,
        focused && { borderColor: OB.primary, boxShadow: '0 0 0 4px rgba(10,77,43,0.08)' },
        invalid && { borderColor: OB.danger, boxShadow: '0 0 0 4px rgba(185,28,28,0.07)' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export const inputText = { ...jk(600), fontSize: 15, color: OB.text, padding: 0, flex: 1, minWidth: 0 };

export function Field({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  inputMode,
  maxLength,
  valid = false,
  invalid = false,
  hint = '',
  readOnly = false,
  autoFocus = false,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={[obLabel, { marginBottom: 6, paddingHorizontal: 4 }]}>{label}</Text>
      <FieldBox focused={focused} invalid={invalid}>
        {Icon ? <Icon size={18} strokeWidth={2.2} color={OB.muted} /> : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#c2bda9"
          keyboardType={type === 'email' ? 'email-address' : inputMode === 'numeric' ? 'number-pad' : 'default'}
          autoCapitalize={type === 'email' ? 'none' : undefined}
          autoCorrect={type === 'email' ? false : undefined}
          maxLength={maxLength}
          editable={!readOnly}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputText}
        />
        {valid ? <Check size={17} strokeWidth={3} color={OB.primary} /> : null}
      </FieldBox>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Native <select> drawn as .dh-field; the options open in the kit's bottom sheet. */
export function SelectField({ label, icon: Icon, value, onChange, options, placeholder = 'Select', invalid = false }) {
  const current = options.find((o) => o.value === value);
  const sheetOptions = [{ value: '', label: placeholder }, ...options];
  return (
    <View>
      <Text style={[obLabel, { marginBottom: 6, paddingHorizontal: 4 }]}>{label}</Text>
      <FieldBox invalid={invalid}>
        {Icon ? <Icon size={18} strokeWidth={2.2} color={OB.muted} /> : null}
        <KitSelect
          value={value}
          options={sheetOptions}
          onChange={onChange}
          accessibilityLabel={label}
          chevronColor={OB.muted}
          style={{ flex: 1, minWidth: 0 }}
          textStyle={{ ...jk(600), fontSize: 15, color: current ? OB.text : '#c2bda9' }}
        />
      </FieldBox>
    </View>
  );
}

/** <input type="date">: value is YYYY-MM-DD, picked through the Android date dialog. */
export function DateField({ label, value, onChange, valid = false }) {
  const open = () => {
    const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
    DateTimePickerAndroid.open({
      value: Number.isNaN(parsed.getTime()) ? new Date() : parsed,
      mode: 'date',
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        onChange(`${date.getFullYear()}-${mm}-${dd}`);
      },
    });
  };
  const shown = value ? value.split('-').reverse().join('/') : 'dd/mm/yyyy';
  return (
    <View>
      <Text style={[obLabel, { marginBottom: 6, paddingHorizontal: 4 }]}>{label}</Text>
      <Press scale={1} onPress={Platform.OS === 'android' ? open : undefined}>
        <FieldBox>
          <Text style={[inputText, { color: value ? OB.text : '#c2bda9' }]}>{shown}</Text>
          {valid ? <Check size={17} strokeWidth={3} color={OB.primary} /> : null}
        </FieldBox>
      </Press>
    </View>
  );
}

/** A row of single-choice chips, for short option sets like gender. */
export function ChipGroup({ label, value, onChange, options, columns = 3 }) {
  return (
    <View>
      <Text style={[obLabel, { marginBottom: 6, paddingHorizontal: 4 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          const selected = value === optionValue;
          return (
            <Press
              key={optionValue}
              scale={1}
              onPress={() => onChange(optionValue)}
              style={[styles.chip, { flex: 1 }, selected && { backgroundColor: OB.primary, borderColor: OB.primary }]}
            >
              <Text style={[styles.chipText, { color: selected ? '#fff' : OB.muted }]}>{optionLabel}</Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

/** A read-only fact, such as the phone number the driver just verified. */
export function ReadOnlyRow({ label, icon: Icon, value }) {
  return (
    <View style={styles.readOnly}>
      {Icon ? <Icon size={18} strokeWidth={2.2} color={OB.primary} /> : null}
      <View style={{ minWidth: 0, flex: 1 }}>
        <Text style={[obLabel, { color: 'rgba(10,77,43,0.7)' }]}>{label}</Text>
        <Text style={{ ...jk(700), fontSize: 15, color: OB.text, lineHeight: 22.5 }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cta: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch' },
  ctaText: { ...jk(800), fontSize: 15, letterSpacing: 0.3 },
  alert: { backgroundColor: OB.dangerSoft, borderWidth: 1, borderColor: 'rgba(185,28,28,0.2)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  alertText: { ...jk(600), fontSize: 13, color: OB.danger, lineHeight: 19.5 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: OB.border, backgroundColor: OB.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  hint: { ...jk(500), fontSize: 11, color: OB.muted, marginTop: 4, paddingHorizontal: 4, lineHeight: 16.5 },
  chip: { height: 44, paddingHorizontal: 8, borderWidth: 1.5, borderColor: OB.border, backgroundColor: OB.surface, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { ...jk(700), fontSize: 13 },
  readOnly: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(10,77,43,0.15)', backgroundColor: OB.primarySoft, paddingHorizontal: 16, paddingVertical: 12 },
});
