import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { color, elevation, radii, space, type } from '../../theme';

/*
 * The web's shadcn <DialogContent> (components/ui/dialog.tsx) as the restaurant pages use it,
 * in the heritage look: white card with the beige edge, the overlay token, and a 44 px close
 * button in the top-right corner (showCloseButton defaults to true). `style` is the page's
 * own override (padding, gap, max width).
 */
export function ShadDialog({ visible, onClose, children, style, showClose = true }) {
  return (
    <Dialog visible={visible} onClose={onClose} backdrop={color.overlay} panelStyle={[styles.panel, style]}>
      {children}
      {showClose ? (
        <Press scale={0.95} onPress={onClose} accessibilityLabel="Close" style={styles.close}>
          <X size={20} color={color.textSecondary} strokeWidth={2.5} />
        </Press>
      ) : null}
    </Dialog>
  );
}

/** Dialog button: 48 px, `outline` or solid brand green (sentence-case label; same API as before). */
export function ShadButton({ title, onPress, variant = 'primary', disabled, loading, style, children }) {
  const off = disabled || loading;
  const outline = variant === 'outline';
  return (
    <Press
      scale={0.98}
      onPress={onPress}
      disabled={off}
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(loading) }}
      style={[styles.button, outline ? styles.outline : styles.solid, off ? (outline ? { opacity: 0.5 } : styles.solidOff) : null, style]}
    >
      {loading ? <ActivityIndicator size="small" color={outline ? color.text : color.onPrimary} /> : null}
      {children}
      <Text style={[type.button, { color: outline ? color.text : off ? color.textMuted : color.onPrimary }]} numberOfLines={1}>
        {title}
      </Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  panel: { width: '94%', maxWidth: 512, alignSelf: 'center', backgroundColor: color.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: color.border, ...elevation.sheet },
  close: { position: 'absolute', right: space.sm, top: space.sm, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceMuted },
  button: { height: 48, paddingHorizontal: space.lg, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  solid: { backgroundColor: color.primary },
  solidOff: { backgroundColor: color.surfaceMuted },
  outline: { borderWidth: 1.5, borderColor: color.borderStrong, backgroundColor: color.surface },
});

