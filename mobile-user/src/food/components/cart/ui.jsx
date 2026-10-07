import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Press } from '../../../components/ui';
import { color, elevation, radii, space, type } from '../../../theme';

/*
 * The slice of the web's shadcn primitives the cart / profile pages use,
 * restyled on the design-system tokens (DESIGN_SYSTEM.md); same API as
 * components/ui/{card,button,input,textarea,label,badge}.tsx.
 */
export const UI = {
  foreground: color.text,
  mutedForeground: color.textMuted,
  border: color.border,
  input: color.border,
  primary: color.goldBright,
  primaryForeground: color.onGold,
  accent: color.goldSoft,
  secondary: color.surfaceMuted,
  green: color.primary,
};

export function Card({ style, children }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function CardHeader({ style, children }) {
  return <View style={[s.cardHeader, style]}>{children}</View>;
}

export function CardTitle({ style, children, row }) {
  if (row) return <View style={[s.titleRow, style]}>{children}</View>;
  return <Text style={[s.cardTitle, style]}>{children}</Text>;
}

export function CardContent({ style, children }) {
  return <View style={[s.cardContent, style]}>{children}</View>;
}

/** variant: default | outline | ghost. */
export function Button({ variant = 'default', onPress, disabled, style, textStyle, children, icon, accessibilityLabel, selected }) {
  const base = variant === 'default' ? s.btnDefault : variant === 'outline' ? s.btnOutline : s.btnGhost;
  const color = variant === 'default' ? UI.primaryForeground : UI.foreground;
  const content = typeof children === 'string' ? <Text style={[s.btnText, { color }, textStyle]}>{children}</Text> : children;
  return (
    <Press
      scale={icon ? 0.95 : 0.98}
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, selected }}
      style={[s.btn, base, icon ? s.btnIcon : null, disabled ? { opacity: 0.5 } : null, style]}
    >
      {content}
    </Press>
  );
}

export const Input = forwardRef(function Input({ style, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={UI.mutedForeground}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[s.input, focused ? { borderColor: color.primary } : null, style]}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ style, ...rest }, ref) {
  return <Input ref={ref} multiline textAlignVertical="top" style={[s.textarea, style]} {...rest} />;
});

export function Label({ children, style }) {
  return <Text style={[s.label, style]}>{children}</Text>;
}

export function Badge({ children, style, textStyle, outline }) {
  return (
    <View style={[s.badge, outline ? { borderColor: UI.border, backgroundColor: 'transparent' } : { borderColor: 'transparent', backgroundColor: UI.primary }, style]}>
      <Text style={[s.badgeText, { color: outline ? UI.foreground : UI.primaryForeground }, textStyle]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, paddingVertical: space.xl, gap: space.xl, ...elevation.card },
  cardHeader: { paddingHorizontal: space.xl, gap: space.sm },
  cardTitle: { ...type.subheading, color: UI.foreground },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardContent: { paddingHorizontal: space.xl },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 44, paddingHorizontal: space.lg, borderRadius: radii.md },
  btnDefault: { backgroundColor: UI.primary },
  btnOutline: { backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.borderStrong },
  btnGhost: { backgroundColor: 'transparent' },
  btnIcon: { width: 44, paddingHorizontal: 0 },
  btnText: { ...type.buttonSm },
  input: { minHeight: 48, width: '100%', borderRadius: radii.md, borderWidth: 1, borderColor: UI.input, backgroundColor: color.surface, paddingHorizontal: space.md, paddingVertical: space.xs, ...type.body, lineHeight: undefined, color: UI.foreground },
  textarea: { minHeight: 96, paddingVertical: space.sm, ...type.body },
  label: { ...type.label, color: UI.foreground },
  badge: { alignSelf: 'flex-start', borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: space.sm, paddingVertical: 2 },
  badgeText: { ...type.caption },
});
