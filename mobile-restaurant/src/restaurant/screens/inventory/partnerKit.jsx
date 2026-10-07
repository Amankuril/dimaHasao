import { forwardRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Check, X } from 'lucide-react-native';
import HeritageHeader from '../../../components/HeritageHeader';
import { Press } from '../../../components/ui';
import { color, elevation, radii, space, touch, type } from '../../../theme';

/*
 * Small primitives shared by the restaurant menu / outlet / settings screens
 * (heritage design system, see DESIGN_SYSTEM.md). Built here because ds.jsx
 * has no form field, switch, checkbox or FSSAI mark.
 */

/** HeritageHeader plus a light status bar (the shell sets a dark one on these routes). */
export function ScreenHeader(props) {
  return (
    <>
      <StatusBar style="light" />
      <HeritageHeader {...props} />
    </>
  );
}

/** Field label above an input. */
export function FieldLabel({ children, optional, style }) {
  return (
    <Text style={[styles.label, style]}>
      {children}
      {optional ? <Text style={styles.optional}> (optional)</Text> : null}
    </Text>
  );
}

/** 48 px text input: beige edge at rest, brand green when focused, red with an error. */
export const Input = forwardRef(function Input({ style, error, multiline, onFocus, onBlur, editable = true, left, right, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  const box = [
    styles.inputBox,
    multiline && styles.inputMulti,
    focused && styles.inputFocus,
    error && styles.inputError,
    !editable && styles.inputDisabled,
    style,
  ];
  return (
    <View style={box}>
      {left}
      <TextInput
        ref={ref}
        {...rest}
        editable={editable}
        multiline={multiline}
        placeholderTextColor={color.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.inputText, multiline && styles.inputTextMulti, !editable && { color: color.textMuted }]}
      />
      {right}
    </View>
  );
});

/** Label + control + optional hint / error. */
export function Field({ label, optional, hint, error, children, style }) {
  return (
    <View style={style}>
      {label ? <FieldLabel optional={optional}>{label}</FieldLabel> : null}
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** On/off switch, 44 px touch target. Brand green when on (never the veg green). */
export function Switch({ value, onValueChange, disabled, accessibilityLabel }) {
  return (
    <Press
      scale={1}
      onPress={() => !disabled && onValueChange?.(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: Boolean(value), disabled: Boolean(disabled) }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[styles.switchHit, disabled && { opacity: 0.5 }]}
    >
      <View style={[styles.switch, { backgroundColor: value ? color.primary : color.borderStrong }]}>
        <View style={[styles.thumb, { transform: [{ translateX: value ? 20 : 0 }] }]} />
      </View>
    </Press>
  );
}

/** Stock switch with its word: "In stock" / "Out of stock" next to the switch. */
export function StockSwitch({ value, onValueChange, disabled, accessibilityLabel, onLabel = 'In stock', offLabel = 'Out of stock' }) {
  return (
    <View style={styles.stock}>
      <Text style={[type.caption, styles.stockText, { color: value ? color.primary : color.warning }]} numberOfLines={1}>
        {value ? onLabel : offLabel}
      </Text>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} accessibilityLabel={accessibilityLabel} />
    </View>
  );
}

/** FSSAI food mark: green square with a dot (veg), red square with a triangle (non-veg). */
export function VegMark({ veg, size = 16 }) {
  const c = veg ? color.veg : color.nonVeg;
  const inner = Math.round(size * 0.45);
  return (
    <View accessibilityLabel={veg ? 'Veg' : 'Non-veg'} style={[styles.mark, { width: size, height: size, borderColor: c }]}>
      {veg ? (
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: c }} />
      ) : (
        <View style={{ width: 0, height: 0, borderLeftWidth: inner / 2 + 1, borderRightWidth: inner / 2 + 1, borderBottomWidth: inner, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }} />
      )}
    </View>
  );
}

/** Square checkbox row (44 px tall). */
export function CheckRow({ label, checked, onPress, style, children }) {
  return (
    <Press scale={1} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(checked) }} accessibilityLabel={label} style={[styles.checkRow, style]}>
      <View style={[styles.check, checked && styles.checkOn]}>{checked ? <Check size={14} color={color.onPrimary} strokeWidth={3} /> : null}</View>
      {children || <Text style={[type.body, { flex: 1, color: color.text }]}>{label}</Text>}
    </Press>
  );
}

/** Radio circle (selected = brand green). */
export function Radio({ selected }) {
  return <View style={[styles.radio, selected && { borderColor: color.primary }]}>{selected ? <View style={styles.radioDot} /> : null}</View>;
}

/** White pinned bottom bar with a hairline top edge and the bottom safe area. */
export function PinnedBar({ children, style, extraBottom = 0 }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingBottom: space.lg + insets.bottom + extraBottom }, style]}>{children}</View>;
}

/** Bottom-sheet panel: white, xl top corners, title row with a 44 px close button. */
export function SheetPanel({ title, subtitle, onClose, right, children, style }) {
  return (
    <View style={[styles.sheet, style]}>
      <View style={styles.grip} />
      {title ? (
        <View style={styles.sheetHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={[type.small, { color: color.textMuted, marginTop: 2 }]}>{subtitle}</Text> : null}
          </View>
          {right}
          {onClose ? (
            <Press onPress={onClose} accessibilityLabel="Close" scale={0.9} style={styles.close}>
              <X size={20} color={color.textSecondary} />
            </Press>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Soft info / warning / danger callout. */
export function Notice({ tone = 'info', icon: Icon, title, children, style }) {
  const t = { info: [color.infoSoft, color.info], warning: [color.warningSoft, color.warning], danger: [color.dangerSoft, color.danger], primary: [color.primarySoft, color.primary], neutral: [color.surfaceMuted, color.textSecondary] }[tone] || [color.infoSoft, color.info];
  return (
    <View style={[styles.notice, { backgroundColor: t[0] }, style]}>
      {Icon ? <Icon size={18} color={t[1]} style={{ marginTop: 1 }} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {title ? <Text style={[type.bodyStrong, { color: t[1] }]}>{title}</Text> : null}
        {typeof children === 'string' ? <Text style={[type.small, { color: color.text }]}>{children}</Text> : children}
      </View>
    </View>
  );
}

export const kitStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  scroll: { padding: space.lg, gap: space.md },
  inputText: { ...type.body, color: color.text },
});

const styles = StyleSheet.create({
  label: { ...type.label, color: color.text, marginBottom: space.sm },
  optional: { ...type.caption, color: color.textMuted },
  inputBox: { minHeight: touch, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  inputMulti: { alignItems: 'flex-start', paddingVertical: space.sm, minHeight: 112 },
  inputFocus: { borderColor: color.primary, borderWidth: 1.5 },
  inputError: { borderColor: color.danger },
  inputDisabled: { backgroundColor: color.surfaceMuted },
  inputText: { flex: 1, minWidth: 0, ...type.body, color: color.text, paddingVertical: space.md, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) },
  inputTextMulti: { minHeight: 96, textAlignVertical: 'top', paddingVertical: space.xs },
  error: { ...type.small, color: color.danger, marginTop: space.xs },
  hint: { ...type.caption, color: color.textMuted, marginTop: space.xs },
  switchHit: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  switch: { width: 48, height: 28, borderRadius: radii.pill, padding: 3, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.surface, ...elevation.card },
  stock: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  stockText: { fontFamily: 'Poppins_600SemiBold' },
  mark: { borderWidth: 1.5, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: color.borderStrong, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: color.primary, borderColor: color.primary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  bar: { backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, ...elevation.sheet },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden' },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: color.border, marginTop: space.sm },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.lg, paddingRight: space.sm, paddingTop: space.sm, paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.md, borderRadius: radii.md },
});
