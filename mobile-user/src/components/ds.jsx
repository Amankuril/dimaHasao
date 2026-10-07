import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Fa from './Fa';
import { Press } from './ui';
import { color, elevation, radii, space, tone as tones, touch, type } from '../theme';

/*
 * Design-system components for the user app (see DESIGN_SYSTEM.md). Same
 * names and behaviour as the delivery app's set, in the heritage look.
 * Icons: pass a component taking { size, color } (lucide icons do), or a
 * Font Awesome class string via `fa(...)`, e.g. icon={fa('fa-solid fa-hotel')}.
 * The screen header is `Header` from components/dh/Header (heritage bar).
 */

/** Wrap a Font Awesome class string as an icon component for these props. */
export function fa(name) {
  const FaIcon = ({ size = 18, color: c }) => <Fa name={name} size={size} color={c} />;
  FaIcon.displayName = `Fa(${name})`;
  return FaIcon;
}

/** Icon-only button, 44 px target, label required. */
export function IconButton({ icon: Icon, label, onPress, variant = 'ghost', size = 44, iconSize = 20, iconColor, disabled, style, children }) {
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
      <Icon size={iconSize} color={iconColor || v.fg} />
      {children}
    </Press>
  );
}

const ICON_VARIANTS = {
  ghost: { box: null, fg: color.text },
  soft: { box: { backgroundColor: color.surfaceMuted }, fg: color.text },
  primary: { box: { backgroundColor: color.primarySoft }, fg: color.primary },
  solid: { box: { backgroundColor: color.primary }, fg: color.onPrimary },
  gold: { box: { backgroundColor: color.goldSoft }, fg: color.goldText },
  danger: { box: { backgroundColor: color.dangerSoft }, fg: color.danger },
  inverse: { box: { backgroundColor: 'rgba(255,255,255,0.16)' }, fg: color.textInverse },
};

/**
 * Button. Variants: primary (green, one per screen), gold (premium / hero CTA,
 * mainly on dark surfaces), secondary, outline, danger, dangerSoft, ghost.
 * Sizes: lg 54 (main CTA), md 48, sm 36.
 */
export function Button({ title, onPress, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading, disabled, fullWidth = true, style, textStyle, accessibilityLabel }) {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const h = BUTTON_HEIGHTS[size] || BUTTON_HEIGHTS.md;
  const off = disabled || loading;
  const solid = variant === 'primary' || variant === 'gold' || variant === 'danger';
  const fg = off && solid ? color.textMuted : v.fg;
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
        off && solid && styles.btnDisabledSolid,
        off && !solid && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={size === 'sm' ? 15 : 18} color={fg} /> : null}
      {title ? (
        <Text style={[size === 'sm' ? type.buttonSm : type.button, { color: fg }, textStyle]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      {IconRight && !loading ? <IconRight size={size === 'sm' ? 15 : 18} color={fg} /> : null}
    </Press>
  );
}

const BUTTON_HEIGHTS = { lg: 54, md: 48, sm: 36 };
const BUTTON_VARIANTS = {
  primary: { box: { backgroundColor: color.primary }, fg: color.onPrimary },
  gold: { box: { backgroundColor: color.goldBright }, fg: color.onGold },
  secondary: { box: { backgroundColor: color.primarySoft }, fg: color.primary },
  outline: { box: { backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.borderStrong }, fg: color.text },
  danger: { box: { backgroundColor: color.danger }, fg: color.textInverse },
  dangerSoft: { box: { backgroundColor: color.dangerSoft }, fg: color.danger },
  ghost: { box: null, fg: color.primary },
};

/** White card with the beige heritage edge. `onPress` makes it tappable. */
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

/**
 * Section title inside a page: Cinzel in brand green with a gold leaf, the
 * heritage signature. `plain` drops the leaf. Optional action on the right.
 */
export function SectionHeader({ title, action, onAction, plain = false, style }) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionLeft}>
        {plain ? null : <Fa name="fa-solid fa-leaf" size={12} color={color.gold} />}
        <Text style={styles.sectionTitle} accessibilityRole="header" numberOfLines={1}>
          {String(title).toUpperCase()}
        </Text>
      </View>
      {action ? (
        <Press onPress={onAction} scale={1} hitSlop={12} accessibilityLabel={action}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Press>
      ) : null}
    </View>
  );
}

/** Menu / settings row: icon tile, title + subtitle, trailing value and chevron.
 * Font Awesome screens pass chevronIcon={fa('fa-solid fa-chevron-right')} to keep one icon family. */
export function ListRow({ icon: Icon, iconTone = 'primary', title, subtitle, value, onPress, tone = 'neutral', chevron = Boolean(onPress), chevronIcon: Chevron = ChevronRight, right, style, divider }) {
  const t = tones[iconTone] || tones.primary;
  const danger = tone === 'danger';
  const content = (
    <>
      {Icon ? (
        <View style={[styles.rowIcon, { backgroundColor: danger ? color.dangerSoft : t.bg }]}>
          <Icon size={18} color={danger ? color.danger : t.fg} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[type.bodyStrong, { color: danger ? color.danger : color.text }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value != null ? typeof value === 'string' || typeof value === 'number' ? <Text style={[type.bodyStrong, { color: color.text }]}>{value}</Text> : value : null}
      {right}
      {chevron ? <Chevron size={18} color={color.textDisabled} /> : null}
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

/** Status pill: a word plus colour (never colour alone). */
export function StatusBadge({ label, tone = 'neutral', icon: Icon, style }) {
  const t = tones[tone] || tones.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {Icon ? <Icon size={12} color={t.fg} /> : null}
      <Text style={[type.caption, styles.badgeText, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Filter / category chip. Selected = brand green fill. */
export function Chip({ label, selected, onPress, icon: Icon, count, style }) {
  return (
    <Press
      onPress={onPress}
      scale={0.96}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={label}
      style={[styles.chip, selected ? styles.chipOn : styles.chipOff, style]}
    >
      {Icon ? <Icon size={14} color={selected ? color.onPrimary : color.text} /> : null}
      <Text style={[type.label, { color: selected ? color.onPrimary : color.text }]} numberOfLines={1}>
        {label}
      </Text>
      {count != null ? <Text style={[type.caption, { color: selected ? color.onPrimary : color.textMuted }]}>{count}</Text> : null}
    </Press>
  );
}

/** Horizontal, scrollable chip row with the page gutter. */
export function ChipRow({ children, style, contentStyle }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={[{ gap: space.sm, paddingHorizontal: space.lg }, contentStyle]}>
      {children}
    </ScrollView>
  );
}

/** Two-to-four option switch (tabs inside a page). options: [{ value, label, count? }] */
export function SegmentedControl({ options, value, onChange, style }) {
  return (
    <View style={[styles.seg, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Press
            key={o.value}
            onPress={() => onChange?.(o.value)}
            scale={1}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.count != null ? `${o.label}, ${o.count}` : o.label}
            style={[styles.segItem, on && [styles.segItemOn, elevation.card]]}
          >
            <Text style={[type.label, { color: on ? color.primary : color.textSecondary }]} numberOfLines={1}>
              {o.label}
            </Text>
            {o.count != null ? (
              <View style={[styles.segCount, { backgroundColor: on ? color.primary : color.borderStrong }]}>
                <Text style={[type.caption, { color: on ? color.onPrimary : color.text }]}>{o.count > 99 ? '99+' : o.count}</Text>
              </View>
            ) : null}
          </Press>
        );
      })}
    </View>
  );
}

/** Empty / no-data state. */
export function EmptyState({ icon: Icon, title, message, actionLabel, onAction, style }) {
  return (
    <View style={[styles.empty, style]}>
      {Icon ? (
        <View style={styles.emptyIcon}>
          <Icon size={26} color={color.primary} />
        </View>
      ) : null}
      <Text style={[type.subheading, { color: color.text, textAlign: 'center' }]}>{title}</Text>
      {message ? <Text style={[type.small, { color: color.textMuted, textAlign: 'center', marginTop: space.xs }]}>{message}</Text> : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" fullWidth={false} style={{ marginTop: space.lg, alignSelf: 'center' }} /> : null}
    </View>
  );
}

/** Price / money text (Poppins bold, draws ₹ fine). */
export function Money({ value, style, large, numberOfLines = 1 }) {
  return (
    <Text style={[large ? type.priceLg : type.price, { color: color.text }, style]} numberOfLines={numberOfLines}>
      {value}
    </Text>
  );
}

/** "₹1,234" / "₹1,234.50" with Indian grouping. */
export function formatINR(value, { decimals } = {}) {
  const n = Number(value || 0);
  const d = decimals ?? (Number.isInteger(n) ? 0 : 2);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

const styles = StyleSheet.create({
  btn: { borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  btnDisabledSolid: { backgroundColor: color.surfaceMuted },

  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, ...elevation.card },
  cardPad: { padding: space.lg },

  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.md },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  sectionTitle: { ...type.sectionSerif, color: color.primary, flexShrink: 1 },
  sectionAction: { ...type.label, color: color.primary },

  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  rowIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', paddingHorizontal: space.sm + 2, height: 24, borderRadius: radii.pill },
  badgeText: { fontFamily: 'Poppins_600SemiBold' },

  chip: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, height: 38, paddingHorizontal: space.md + 2, borderRadius: radii.pill, borderWidth: 1 },
  chipOn: { backgroundColor: color.primary, borderColor: color.primary },
  chipOff: { backgroundColor: color.surface, borderColor: color.border },

  seg: { flexDirection: 'row', backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: 4, gap: 4 },
  segItem: { flex: 1, minHeight: 40, borderRadius: radii.sm + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs + 2, paddingHorizontal: space.sm },
  segItemOn: { backgroundColor: color.surface },
  segCount: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingVertical: space.xxxl + space.lg, paddingHorizontal: space.xxl },
  emptyIcon: { width: 60, height: 60, borderRadius: radii.lg, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
});
