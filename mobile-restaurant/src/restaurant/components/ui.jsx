import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { RT, RT_GRADIENT } from '../theme';

/*
 * The small building blocks the restaurant pages share on the web
 * (their sticky white header, shadcn Switch / Button / Dialog / RadioGroup),
 * drawn once so every screen renders them the same way.
 */

/** The sticky white page header: back arrow, title, optional subtitle and a right slot. */
export function PageHeader({ title, subtitle, onBack, right, border = true, large = true, backLabel = 'Go back', style }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, border ? styles.headerBorder : null, { paddingTop: 12 + insets.top }, style]}>
      {onBack ? (
        <Press onPress={onBack} accessibilityLabel={backLabel} hitSlop={8} style={{ padding: 6 }}>
          <ArrowLeft size={large ? 24 : 20} color={tw.gray900} />
        </Press>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={large ? styles.title : styles.titleSmall} numberOfLines={1} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** shadcn Switch as the restaurant pages colour it (green when on, gray-300 when off). */
export function Toggle({ value, onValueChange, disabled, onColor = tw.green600, offColor = tw.gray300, accessibilityLabel }) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange?.(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: Boolean(value), disabled: Boolean(disabled) }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={[styles.switch, { backgroundColor: value ? onColor : offColor, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.thumb, { transform: [{ translateX: value ? 16 : 0 }] }]} />
    </Pressable>
  );
}

/** `bg-gradient-to-br from-[#B80B3D] to-[#66001D] text-white` buttons, repainted by the restaurant theme. */
export function PrimaryButton({ title, onPress, disabled, loading, loadingTitle, style, textStyle, children }) {
  const off = disabled || loading;
  return (
    <Press scale={0.98} onPress={onPress} disabled={off} accessibilityState={{ disabled: Boolean(off), busy: Boolean(loading) }} style={[off ? { opacity: 0.5 } : null, style]}>
      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
        {children}
        <Text style={[styles.primaryText, textStyle]}>{loading && loadingTitle ? loadingTitle : title}</Text>
      </LinearGradient>
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
    <Press scale={1} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={[styles.radio, selected ? { borderColor: RT.primary } : null]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <Text style={styles.radioLabel}>{label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12 },
  headerBorder: { borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  titleSmall: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) },
  subtitle: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 2, ...poppins(400) },
  switch: { width: 36, height: 20, borderRadius: 10, padding: 2, justifyContent: 'center' },
  thumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', ...shadow('sm') },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  primaryText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },
  outline: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  outlineText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  dialog: { width: '90%', maxWidth: 448, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8, ...shadow('xl') },
  dialogIcon: { alignSelf: 'center', marginBottom: 12, width: 64, height: 64, borderRadius: 32, backgroundColor: tw.orange100, alignItems: 'center', justifyContent: 'center' },
  dialogTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, textAlign: 'center', ...poppins(600) },
  dialogBody: { marginTop: 8, fontSize: 14, lineHeight: 20, color: tw.gray600, textAlign: 'center', ...poppins(400) },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: tw.gray400, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: RT.primary },
  radioLabel: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) },
});
