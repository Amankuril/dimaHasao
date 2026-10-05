import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';

/*
 * The slice of the web's shadcn primitives (components/ui/{card,button,input,
 * textarea,label,badge}.tsx) that the cart pages use, at their light-theme
 * tokens (shared/styles/global.css, oklch values converted to sRGB).
 */
export const UI = {
  foreground: '#2B1B10',
  mutedForeground: '#7C6B5E',
  border: '#E8E4D6',
  input: '#F3F2EC',
  primary: '#D6A324',
  primaryForeground: '#1B0F05',
  accent: '#FBE7B8',
  secondary: '#F4F1E4',
  green: '#0A4D2B',
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
      style={[s.input, focused ? { borderColor: tw.neutral900 } : null, style]}
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
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: UI.border, paddingVertical: 24, gap: 24, ...shadow('sm') },
  cardHeader: { paddingHorizontal: 24, gap: 8 },
  cardTitle: { fontSize: 16, lineHeight: 16, color: UI.foreground, ...poppins(600) },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardContent: { paddingHorizontal: 24 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 36, paddingHorizontal: 16, borderRadius: 6 },
  btnDefault: { backgroundColor: UI.primary, ...shadow('0 1px 2px rgba(0,0,0,0.05)') },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: UI.input, ...shadow('0 1px 2px rgba(0,0,0,0.05)') },
  btnGhost: { backgroundColor: 'transparent' },
  btnIcon: { width: 36, paddingHorizontal: 0 },
  btnText: { fontSize: 14, lineHeight: 20, ...poppins(500) },
  input: { height: 36, width: '100%', borderRadius: 6, borderWidth: 1, borderColor: UI.input, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 4, fontSize: 16, color: UI.foreground, ...poppins(400) },
  textarea: { minHeight: 80, paddingVertical: 8, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 14, lineHeight: 14, color: UI.foreground, ...poppins(500) },
  badge: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, lineHeight: 16, ...poppins(500) },
});
