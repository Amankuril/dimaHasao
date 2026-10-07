import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import HeritageHeader from '../../components/HeritageHeader';
import { color, elevation, radii, space, type } from '../../theme';

/*
 * The small building blocks the restaurant pages share on the web
 * (their sticky white header, shadcn Switch / Button / Dialog / RadioGroup),
 * drawn once so every screen renders them the same way.
 */

/**
 * Page header for every restaurant sub-screen: the heritage bar (deep green,
 * gold Cinzel title, 44 px back). Same props as before; `border`, `large`
 * and `style` are accepted for compatibility.
 */
export function PageHeader({ title, subtitle, onBack, right, border = true, large = true, backLabel = 'Go back', style }) {
  return <HeritageHeader title={title} subtitle={subtitle} onBack={onBack} showBack={Boolean(onBack)} right={right} />;
}

/** shadcn Switch as the restaurant pages colour it (green when on, gray-300 when off). */
export function Toggle({ value, onValueChange, disabled, onColor = color.primary, offColor = color.borderStrong, accessibilityLabel }) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange?.(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: Boolean(value), disabled: Boolean(disabled) }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={[styles.switch, { backgroundColor: value ? onColor : offColor, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.thumb, { transform: [{ translateX: value ? 20 : 0 }] }]} />
    </Pressable>
  );
}

/** `bg-gradient-to-br from-[#B80B3D] to-[#66001D] text-white` buttons, repainted by the restaurant theme. */
export function PrimaryButton({ title, onPress, disabled, loading, loadingTitle, style, textStyle, children }) {
  const off = disabled || loading;
  return (
    <Press scale={0.98} onPress={onPress} disabled={off} accessibilityState={{ disabled: Boolean(off), busy: Boolean(loading) }} style={[styles.primary, off ? styles.primaryOff : null, style]}>
      {loading ? <ActivityIndicator size="small" color={off ? color.textMuted : color.onPrimary} /> : null}
      {children}
      <Text style={[styles.primaryText, off ? { color: color.textMuted } : null, textStyle]}>{loading && loadingTitle ? loadingTitle : title}</Text>
    </Press>
  );
}

/** shadcn `variant="outline"` button. */
export function OutlineButton({ title, onPress, disabled, style, textStyle }) {
  return (
    <Press scale={0.98} onPress={onPress} disabled={disabled} accessibilityState={{ disabled: Boolean(disabled) }} style={[styles.outline, disabled ? { opacity: 0.5 } : null, style]}>
      <Text style={[styles.outlineText, textStyle]}>{title}</Text>
    </Press>
  );
}

/** shadcn Dialog with a centred header (icon, title, description) and stacked footer buttons. */
export function InfoDialog({ visible, onClose, icon, title, description, children }) {
  return (
    <Dialog visible={visible} onClose={onClose} panelStyle={styles.dialog}>
      {icon ? <View style={styles.dialogIcon}>{icon}</View> : null}
      <Text style={styles.dialogTitle}>{title}</Text>
      {description ? <Text style={styles.dialogBody}>{description}</Text> : null}
      <View style={{ gap: 8, marginTop: 8 }}>{children}</View>
    </Dialog>
  );
}

/** shadcn RadioGroupItem + Label row. */
export function RadioRow({ label, selected, onPress }) {
  return (
    <Press scale={1} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected, checked: Boolean(selected) }} accessibilityLabel={typeof label === 'string' ? label : undefined} style={styles.radioRow}>
      <View style={[styles.radio, selected ? { borderColor: color.primary } : null]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <Text style={styles.radioLabel}>{label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  switch: { width: 48, height: 28, borderRadius: radii.pill, padding: 3, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.surface, ...elevation.card },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 48, paddingHorizontal: space.xl, borderRadius: radii.md, backgroundColor: color.primary },
  primaryOff: { backgroundColor: color.surfaceMuted },
  primaryText: { ...type.button, color: color.onPrimary },
  outline: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: space.lg, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.borderStrong, backgroundColor: color.surface },
  outlineText: { ...type.button, color: color.text },
  dialog: { width: '100%', maxWidth: 400, backgroundColor: color.bg, borderRadius: radii.xl, borderWidth: 1, borderColor: color.border, padding: space.xxl, ...elevation.float },
  dialogIcon: { alignSelf: 'center', marginBottom: space.md, width: 64, height: 64, borderRadius: radii.lg, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dialogTitle: { ...type.heading, color: color.text, textAlign: 'center' },
  dialogBody: { ...type.body, marginTop: space.sm, color: color.textSecondary, textAlign: 'center' },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  radioLabel: { flex: 1, ...type.body, color: color.text },
});
