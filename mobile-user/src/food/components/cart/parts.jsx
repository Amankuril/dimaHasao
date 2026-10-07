import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Skeleton from '../../../components/Skeleton';
import { Press } from '../../../components/ui';
import { color, radii, space, type } from '../../../theme';

/*
 * Small food-checkout primitives built on the design-system tokens (see
 * DESIGN_SYSTEM.md). Shared by the cart, checkout, address, order and wallet
 * screens; nothing here holds state or logic beyond focus styling.
 */

/** FSSAI veg / non-veg mark: square outline + dot. Never restyle the meaning. */
export function VegMark({ veg, size = 16, style }) {
  const c = veg ? color.veg : color.nonVeg;
  return (
    <View
      accessible
      accessibilityLabel={veg ? 'Veg' : 'Non-veg'}
      style={[{ width: size, height: size, borderWidth: 1.5, borderColor: c, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface }, style]}
    >
      <View style={{ width: size / 2, height: size / 2, borderRadius: size / 4, backgroundColor: c }} />
    </View>
  );
}

/** Radio dot for single-choice rows (pair with accessibilityRole="radio" on the row). */
export function Radio({ checked, disabled }) {
  return (
    <View style={[s.radio, checked && { borderColor: color.primary }, disabled && { borderColor: color.border }]}>
      {checked ? <View style={s.radioDot} /> : null}
    </View>
  );
}

/**
 * Bill line: label left, value right-aligned. `tone` = 'success' for discounts,
 * `strong` for totals, `note` for a supporting line under the label.
 */
export function BillRow({ label, value, loading, tone, strong, note }) {
  const fg = tone === 'success' ? color.success : strong ? color.text : color.textSecondary;
  return (
    <View style={s.billRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[strong ? type.bodyStrong : type.body, { color: fg }]}>{label}</Text>
        {note ? <Text style={[type.caption, { color: color.textMuted, marginTop: 2 }]}>{note}</Text> : null}
      </View>
      {loading ? (
        <Skeleton style={{ width: 56, height: 16, borderRadius: 4 }} />
      ) : (
        <Text style={[strong ? type.price : type.bodyStrong, { color: tone === 'success' ? color.success : color.text, textAlign: 'right' }]}>{value}</Text>
      )}
    </View>
  );
}

/** Hairline divider (optionally dashed) between groups inside a card. */
export function Divider({ dashed, style }) {
  return <View style={[{ borderBottomWidth: 1, borderColor: color.border, borderStyle: dashed ? 'dashed' : 'solid' }, style]} />;
}

/**
 * Pinned bottom CTA bar: white, hairline top border, safe-area padding.
 * `extraBottom` adds clearance for the floating app nav where it shows.
 */
export function CtaBar({ children, extraBottom, style }) {
  const insets = useSafeAreaInsets();
  const bottom = extraBottom != null ? extraBottom : insets.bottom;
  return <View style={[s.bar, { paddingBottom: space.md + bottom }, style]}>{children}</View>;
}

/** Labelled text field: label above, 48 px, beige at rest, green when focused. */
export const Field = forwardRef(function Field({ label, error, hint, style, inputStyle, multiline, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: space.xs + 2 }, style]}>
      {label ? <Text style={[type.label, { color: color.text }]}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={color.textDisabled}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[s.input, multiline && s.inputMulti, focused && { borderColor: color.primary }, error ? { borderColor: color.danger } : null, inputStyle]}
        {...rest}
      />
      {error ? <Text style={[type.small, { color: color.danger }]}>{error}</Text> : hint ? <Text style={[type.caption, { color: color.textMuted }]}>{hint}</Text> : null}
    </View>
  );
});

/** Text-only inline action (≥44 px tall target). */
export function LinkButton({ title, onPress, tone = 'primary', disabled, accessibilityLabel, style }) {
  const fg = tone === 'danger' ? color.danger : color.primary;
  return (
    <Press onPress={onPress} disabled={disabled} scale={0.96} hitSlop={8} accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} style={[s.link, disabled && { opacity: 0.5 }, style]}>
      <Text style={[type.label, { color: fg }]}>{title}</Text>
    </Press>
  );
}

const s = StyleSheet.create({
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  billRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  bar: { backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderStrong, paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.md, paddingVertical: space.sm, ...type.body, lineHeight: undefined, color: color.text },
  inputMulti: { minHeight: 96, paddingTop: space.md },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
});
