import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { IconButton } from '../../../components/ds';
import { color, radii, space, type } from '../../../theme';

/*
 * Local primitives for the food profile / account pages (design-system look):
 * the in-page title bar under the food shell's heritage header, and a
 * label-above form field.
 */

/** White title bar: 44 px back button, heading title, optional subtitle and right slot. */
export function PageHeader({ title, subtitle, onBack, right, style }) {
  return (
    <View style={[styles.header, style]}>
      {onBack ? <IconButton icon={ArrowLeft} label="Back" variant="soft" onPress={onBack} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Label-above text field, 48 px tall (multiline grows), primary border when focused, optional error. */
export function FormField({ label, error, hint, style, inputStyle, left, ...input }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: space.xs }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, input.multiline ? styles.inputWrapMulti : null, focused ? styles.focus : null, error ? styles.errorBorder : null, input.editable === false ? styles.disabled : null]}>
        {left}
        <TextInput
          accessibilityLabel={typeof label === 'string' ? label : undefined}
          placeholderTextColor={color.textMuted}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[styles.input, input.multiline ? styles.inputMulti : null, inputStyle]}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  title: { ...type.heading, color: color.text },
  subtitle: { ...type.caption, color: color.textMuted },
  label: { ...type.label, color: color.text },
  inputWrap: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  inputWrapMulti: { alignItems: 'flex-start', paddingVertical: space.sm },
  focus: { borderColor: color.primary, borderWidth: 1.5 },
  errorBorder: { borderColor: color.danger },
  disabled: { backgroundColor: color.surfaceMuted },
  input: { flex: 1, minWidth: 0, minHeight: 46, paddingVertical: 0, ...type.body, color: color.text },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  error: { ...type.small, color: color.danger },
  hint: { ...type.caption, color: color.textMuted },
});
