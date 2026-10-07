import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { RT_GRADIENT } from '../theme';

/*
 * The web's shadcn <DialogContent> (components/ui/dialog.tsx) as the restaurant pages use it:
 * rounded-2xl card with a hairline border and shadow-2xl, a 40 % black overlay and the round
 * X button in the top-right corner (showCloseButton defaults to true). `style` is the page's
 * own className override (padding, gap, max width).
 */
export function ShadDialog({ visible, onClose, children, style, showClose = true }) {
  return (
    <Dialog visible={visible} onClose={onClose} backdrop="rgba(0,0,0,0.4)" panelStyle={[styles.panel, style]}>
      {children}
      {showClose ? (
        <Press scale={0.95} onPress={onClose} accessibilityLabel="Close" hitSlop={6} style={styles.close}>
          <X size={20} color={tw.gray500} strokeWidth={2.5} />
        </Press>
      ) : null}
    </Dialog>
  );
}

/** shadcn Button (h-9, text-sm font-medium, rounded-md): `outline` or the page's green gradient. */
export function ShadButton({ title, onPress, variant = 'primary', disabled, loading, style, children }) {
  const off = disabled || loading;
  const outline = variant === 'outline';
  return (
    <Press scale={0.98} onPress={onPress} disabled={off} accessibilityState={{ disabled: Boolean(off) }} style={[off ? { opacity: 0.5 } : null, style]}>
      {outline ? (
        <View style={[styles.button, styles.outline]}>
          {children}
          <Text style={[styles.text, { color: tw.gray900 }]}>{title}</Text>
        </View>
      ) : (
        <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
          {children}
          <Text style={[styles.text, { color: '#fff' }]}>{title}</Text>
        </LinearGradient>
      )}
    </Press>
  );
}

const styles = StyleSheet.create({
  panel: { width: '94%', maxWidth: 512, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.gray200, ...shadow('2xl') },
  close: { position: 'absolute', right: 20, top: 20, padding: 8, borderRadius: 999, backgroundColor: tw.gray50, borderWidth: 1, borderColor: 'rgba(229,231,235,0.6)' },
  button: { height: 36, paddingHorizontal: 16, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  outline: { borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  text: { fontSize: 14, lineHeight: 20, ...poppins(500) },
});
