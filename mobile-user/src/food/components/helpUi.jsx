import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { color, elevation, radii, space, type } from '../../theme';

/*
 * Shared pieces of the food help screens (Help centre, Order help), on the
 * design-system tokens (see DESIGN_SYSTEM.md).
 */
export const HELP = {
  fg: color.text,
  muted: color.textMuted,
  border: color.border,
  mutedBg: color.surfaceMuted,
  primary: color.primary,
  green: color.primary,
};

export function HelpPage({ children }) {
  return <View style={{ flex: 1, backgroundColor: color.bg }}>{children}</View>;
}

/** White card with the beige edge; `gold` = the highlighted "still need help" panel. */
export function Card({ children, style, gold }) {
  return <View style={[styles.card, gold ? styles.gold : null, style]}>{children}</View>;
}

/** variant: default (green fill) | outline. Children are the label/icon nodes. */
export function HelpButton({ children, onPress, variant = 'outline', style, accessibilityLabel, disabled }) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      scale={0.98}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.btn, variant === 'default' ? styles.btnDefault : null, disabled ? { opacity: 0.5 } : null, style]}
    >
      {children}
    </Press>
  );
}

/** Icon tile + title/subtitle row (tappable when onPress is set). */
export function HelpRow({ icon: Icon, title, subtitle, onPress, right, last }) {
  const body = (
    <>
      <View style={styles.rowIcon}>
        <Icon size={20} color={color.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.bodyStrong, { color: color.text }]}>{title}</Text>
        {subtitle ? <Text style={[type.small, { color: color.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress ? <ChevronRight size={20} color={color.textDisabled} /> : null}
    </>
  );
  const rowStyle = [styles.row, !last && styles.rowDivider];
  return onPress ? (
    <Press onPress={onPress} scale={0.99} accessibilityRole="button" accessibilityLabel={title} style={rowStyle}>
      {body}
    </Press>
  ) : (
    <View style={rowStyle}>{body}</View>
  );
}

export const helpText = StyleSheet.create({
  h1: { ...type.heading, color: color.text },
  muted: { ...type.small, color: color.textMuted },
  title: { ...type.bodyStrong, color: color.text },
  btn: { ...type.buttonSm, color: color.text },
  btnOn: { ...type.buttonSm, color: color.onPrimary },
  link: { ...type.label, color: color.primary },
});

const styles = StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, ...elevation.card },
  gold: { backgroundColor: color.goldSoft, borderColor: color.gold },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 44, paddingHorizontal: space.lg, paddingVertical: space.sm,
    borderRadius: radii.md, borderWidth: 1.5, borderColor: color.borderStrong, backgroundColor: color.surface,
  },
  btnDefault: { backgroundColor: color.primary, borderColor: color.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  rowIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
