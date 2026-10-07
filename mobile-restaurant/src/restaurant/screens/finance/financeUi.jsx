import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { IconButton, formatINR } from '../../../components/ds';
import { color, elevation, radii, space, type } from '../../../theme';

/*
 * Shared pieces for the restaurant finance, dining, feedback and support
 * screens (heritage design system, see DESIGN_SYSTEM.md). Display only: no
 * data, maths or handlers live here.
 */

/** Money with two decimals ("₹1,234.50"), the precision these screens always showed. */
export const inr2 = (value) => formatINR(value, { decimals: 2 });

/** "in-progress" / "checked-in" / "OPEN" -> "In progress" / "Checked-in" / "Open". */
export function sentenceCase(value) {
  const s = String(value ?? '').replace(/_+/g, ' ').trim().toLowerCase();
  if (!s) return '';
  const lower = s === 'in-progress' ? 'in progress' : s;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Small stat tile: muted label above a bold value, optional tone tint. */
export function StatTile({ label, value, tone, icon: Icon, style }) {
  const t = TILE_TONES[tone] || TILE_TONES.neutral;
  return (
    <View style={[styles.tile, { backgroundColor: t.bg, borderColor: t.border }, style]} accessible accessibilityLabel={`${label}, ${value}`}>
      <View style={styles.tileHead}>
        {Icon ? <Icon size={16} color={t.fg} /> : null}
        <Text style={[type.caption, { color: t.fg, flexShrink: 1 }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text style={[type.price, { color: color.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const TILE_TONES = {
  neutral: { bg: color.surface, border: color.border, fg: color.textSecondary },
  primary: { bg: color.primarySoft, border: color.primarySoft, fg: color.primary },
  warning: { bg: color.warningSoft, border: color.warningSoft, fg: color.warning },
  info: { bg: color.infoSoft, border: color.infoSoft, fg: color.info },
  success: { bg: color.successSoft, border: color.successSoft, fg: color.success },
  gold: { bg: color.goldSoft, border: color.goldSoft, fg: color.goldText },
};

/** Label / value row used in summaries; `strong` for totals. */
export function KeyValue({ label, value, strong, divider, style }) {
  return (
    <View style={[styles.kv, divider && styles.kvDivider, style]}>
      <Text style={[strong ? type.bodyStrong : type.body, { color: strong ? color.text : color.textSecondary, flex: 1, minWidth: 0 }]}>{label}</Text>
      <Text style={[strong ? type.bodyStrong : type.body, { color: color.text, fontFamily: 'Poppins_600SemiBold' }]}>{value}</Text>
    </View>
  );
}

/** Centered dialog panel head: title + 44 px close button. */
export function DialogHead({ title, onClose, style }) {
  return (
    <View style={[styles.dialogHead, style]}>
      <Text style={[type.heading, { color: color.text, flex: 1, minWidth: 0 }]} accessibilityRole="header">
        {title}
      </Text>
      <IconButton icon={X} label="Close" onPress={onClose} iconColor={color.textSecondary} />
    </View>
  );
}

/** Panel style for a centered kit Dialog. */
export const dialogPanel = {
  width: '100%',
  maxWidth: 420,
  alignSelf: 'center',
  backgroundColor: color.surface,
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: color.border,
  ...elevation.float,
};

/**
 * Keyboard height while it is open (0 otherwise). Centered dialogs live in a
 * Modal that does not resize for the keyboard, so they lift by this amount.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, (e) => setHeight(e?.endCoordinates?.height || 0));
    const b = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return height;
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, gap: space.xs, padding: space.md, borderRadius: radii.md, borderWidth: 1 },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs + 2, minHeight: 32 },
  kv: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44, paddingVertical: space.sm },
  kvDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  dialogHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.xl, paddingRight: space.sm, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
});
