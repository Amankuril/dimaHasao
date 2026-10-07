import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { Press } from './ui';
import { SoraMoney } from './kit';
import { color, elevation, radii, space, tone as tones, touch, type } from '../theme';

/*
 * Design-system components (see DESIGN_SYSTEM.md). Screens compose these
 * instead of styling their own headers, buttons, rows and badges, so the
 * same thing looks the same everywhere.
 */

/**
 * Screen top bar, in normal flow (never absolute), so content below can't
 * slide under it on tall status bars. `right` takes extra actions.
 */
export function ScreenHeader({ title, subtitle, onBack, right, border = true, style }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, border && styles.headerBorder, { paddingTop: insets.top }, style]}>
      <View style={styles.headerRow}>
        {onBack ? <IconButton icon={ArrowLeft} label="Back" onPress={onBack} style={{ marginLeft: -space.sm }} /> : null}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.headerRight}>{right}</View> : null}
      </View>
    </View>
  );
}

/** Icon-only button with a 44 px target and a required label for screen readers. */
export function IconButton({ icon: Icon, label, onPress, variant = 'ghost', size = 44, iconSize = 22, iconColor, disabled, style, children }) {
  const v = ICON_VARIANTS[variant] || ICON_VARIANTS.ghost;
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      scale={0.92}
      hitSlop={size < touch ? (touch - size) / 2 : 0}
      accessibilityLabel={label}
      style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, v.box, disabled && { opacity: 0.4 }, style]}
    >
      <Icon size={iconSize} color={iconColor || v.fg} strokeWidth={2.2} />
      {children}
    </Press>
  );
}

const ICON_VARIANTS = {
  ghost: { box: null, fg: color.text },
  soft: { box: { backgroundColor: color.surfaceMuted }, fg: color.text },
  primary: { box: { backgroundColor: color.primarySoft }, fg: color.primary },
  solid: { box: { backgroundColor: color.primary }, fg: color.onPrimary },
  danger: { box: { backgroundColor: color.dangerSoft }, fg: color.danger },
  inverse: { box: { backgroundColor: 'rgba(255,255,255,0.14)' }, fg: color.textInverse },
};

/**
 * Button. Variants: primary (one per screen), secondary, outline, danger, ghost.
 * Sizes: lg 56 (main action), md 48, sm 36 (inline/compact).
 */
export function Button({ title, onPress, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading, disabled, fullWidth = true, style, accessibilityLabel }) {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const h = BUTTON_HEIGHTS[size] || BUTTON_HEIGHTS.md;
  const off = disabled || loading;
  const textStyle = size === 'sm' ? type.buttonSm : type.button;
  return (
    <Press
      onPress={onPress}
      disabled={off}
      scale={0.98}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: Boolean(off), busy: Boolean(loading) }}
      style={[
        styles.btn,
        { height: h, paddingHorizontal: size === 'sm' ? space.md : space.xl },
        v.box,
        fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' },
        off && (variant === 'primary' || variant === 'danger') && styles.btnDisabledSolid,
        off && !(variant === 'primary' || variant === 'danger') && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={off && variant === 'primary' ? color.textMuted : v.fg} />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 16 : 20} color={off && variant === 'primary' ? color.textMuted : v.fg} strokeWidth={2.2} />
      ) : null}
      {title ? (
        <Text style={[textStyle, { color: off && (variant === 'primary' || variant === 'danger') ? color.textMuted : v.fg }]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      {IconRight && !loading ? <IconRight size={size === 'sm' ? 16 : 20} color={v.fg} strokeWidth={2.2} /> : null}
    </Press>
  );
}

const BUTTON_HEIGHTS = { lg: 56, md: 48, sm: 36 };
const BUTTON_VARIANTS = {
  primary: { box: { backgroundColor: color.primary }, fg: color.onPrimary },
  secondary: { box: { backgroundColor: color.primarySoft }, fg: color.primary },
  outline: { box: { backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.borderStrong }, fg: color.text },
  danger: { box: { backgroundColor: color.danger }, fg: color.textInverse },
  dangerSoft: { box: { backgroundColor: color.dangerSoft }, fg: color.danger },
  ghost: { box: null, fg: color.primary },
};

/** White card on the grey app background. `onPress` makes the whole card tappable. */
export function Card({ children, style, padded = true, onPress, accessibilityLabel }) {
  const body = [styles.card, padded && styles.cardPad, style];
  if (onPress) {
    return (
      <Press onPress={onPress} scale={0.99} accessibilityLabel={accessibilityLabel} style={body}>
        {children}
      </Press>
    );
  }
  return <View style={body}>{children}</View>;
}

/** Title above a group of cards/rows, with an optional action on the right. */
export function SectionHeader({ title, action, onAction, style }) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Press onPress={onAction} scale={1} hitSlop={12} accessibilityLabel={action}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Press>
      ) : null}
    </View>
  );
}

/**
 * Settings/menu row: leading icon tile, title + subtitle, trailing value and
 * chevron. `tone="danger"` for destructive rows (logout, delete).
 */
export function ListRow({ icon: Icon, title, subtitle, value, onPress, tone = 'neutral', chevron = Boolean(onPress), right, style, divider }) {
  const t = tone === 'danger' ? tones.danger : tone === 'primary' ? tones.primary : tones.neutral;
  const content = (
    <>
      {Icon ? (
        <View style={[styles.rowIcon, { backgroundColor: t.bg }]}>
          <Icon size={20} color={tone === 'neutral' ? color.text : t.fg} strokeWidth={2} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[type.bodyStrong, { color: tone === 'danger' ? color.danger : color.text }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value != null ? (
        typeof value === 'string' || typeof value === 'number' ? (
          <SoraMoney style={[type.money, { color: color.text }]} numberOfLines={1}>
            {String(value)}
          </SoraMoney>
        ) : (
          value
        )
      ) : null}
      {right}
      {chevron ? <ChevronRight size={20} color={color.textDisabled} /> : null}
    </>
  );
  const rowStyle = [styles.row, divider && styles.rowDivider, style];
  return onPress ? (
    <Press onPress={onPress} scale={0.99} accessibilityLabel={title} style={rowStyle}>
      {content}
    </Press>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
}

/** Small status pill. Always pairs colour with a word, never colour alone. */
export function StatusBadge({ label, tone = 'neutral', icon: Icon, style }) {
  const t = tones[tone] || tones.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {Icon ? <Icon size={14} color={t.fg} strokeWidth={2.4} /> : null}
      <Text style={[type.caption, styles.badgeText, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Empty / no-data state: icon tile, one sentence title, optional hint and action. */
export function EmptyState({ icon: Icon, title, message, actionLabel, onAction, style }) {
  return (
    <View style={[styles.empty, style]}>
      {Icon ? (
        <View style={styles.emptyIcon}>
          <Icon size={28} color={color.textMuted} strokeWidth={1.8} />
        </View>
      ) : null}
      <Text style={[type.subheading, { color: color.text, textAlign: 'center' }]}>{title}</Text>
      {message ? <Text style={[type.small, { color: color.textMuted, textAlign: 'center', marginTop: space.xs }]}>{message}</Text> : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" fullWidth={false} style={{ marginTop: space.lg, alignSelf: 'center' }} /> : null}
    </View>
  );
}

/** Money in Sora with the rupee glyph drawn correctly. */
export function Money({ value, style, numberOfLines = 1 }) {
  return (
    <SoraMoney style={[type.money, { color: color.text }, style]} numberOfLines={numberOfLines}>
      {value}
    </SoraMoney>
  );
}

/** "₹1,234.50" with Indian grouping; keeps decimals only when present. */
export function formatINR(value, { decimals } = {}) {
  const n = Number(value || 0);
  const d = decimals ?? (Number.isInteger(n) ? 0 : 2);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

const styles = StyleSheet.create({
  header: { backgroundColor: color.surface },
  headerBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.borderStrong },
  headerRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.lg },
  headerText: { flex: 1, minWidth: 0, paddingVertical: space.sm },
  headerTitle: { ...type.heading, color: color.text },
  headerSub: { ...type.caption, color: color.textMuted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginRight: -space.sm },

  btn: { borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  btnDisabledSolid: { backgroundColor: color.surfaceMuted },

  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: color.border, ...elevation.card },
  cardPad: { padding: space.lg },

  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm, paddingHorizontal: space.xs },
  sectionTitle: { ...type.overline, color: color.textMuted },
  sectionAction: { ...type.label, color: color.primary },

  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  rowIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', paddingHorizontal: space.sm + 2, height: 26, borderRadius: radii.pill },
  badgeText: { fontFamily: 'NunitoSans_800ExtraBold' },

  empty: { alignItems: 'center', paddingVertical: space.xxxl + space.lg, paddingHorizontal: space.xxl },
  emptyIcon: { width: 64, height: 64, borderRadius: radii.lg, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
});
