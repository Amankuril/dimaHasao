import { StyleSheet, Text, View } from 'react-native';
import { Press } from '../../components/ui';
import { outfit } from '../../theme';
import { DT } from './dt';

/*
 * Building blocks every driver screen shares, so cards, buttons and chips look the same everywhere.
 *
 *   <Card>…</Card>                         white rounded card
 *   <Card tone="dark">…</Card>             slate-900 card (balance, summary)
 *   <CtaButton title="Go online" onPress/> graphite primary action
 *   <CtaButton variant="brand" … />        graphite solid (same as cta)
 *   <CtaButton variant="outline" … />      outlined
 *   <CtaButton variant="danger" … />       red
 *   <CtaButton variant="light" … />        white, for a graphite card
 *   <CtaButton variant="onDark" … />       quiet outline, for a graphite card
 *   <Chip label="Approved" tone="success"/> small status pill
 *   <SectionLabel>Recent</SectionLabel>    small muted label above a group
 */

export function Card({ tone = 'light', style, children, ...rest }) {
  return (
    <View style={[st.card, tone === 'dark' ? st.cardDark : null, style]} {...rest}>
      {children}
    </View>
  );
}

const BUTTONS = {
  cta: { bg: DT.cta, ink: DT.ctaInk, border: 'transparent' },
  brand: { bg: DT.brand, ink: DT.onBrand, border: 'transparent' },
  outline: { bg: DT.card, ink: DT.ink, border: DT.border },
  danger: { bg: DT.danger, ink: DT.onBrand, border: 'transparent' },
  soft: { bg: DT.brandSoft, ink: DT.brand, border: 'transparent' },
  light: { bg: DT.card, ink: DT.ink, border: 'transparent' },
  onDark: { bg: 'rgba(255,255,255,0.06)', ink: DT.onBrand, border: 'rgba(255,255,255,0.16)' },
};

export function CtaButton({ title, onPress, variant = 'cta', disabled, loading, loadingLabel, icon = null, style, textStyle, accessibilityLabel }) {
  const v = BUTTONS[variant] || BUTTONS.cta;
  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      scale={0.97}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      style={[st.btn, { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {icon}
      <Text style={[st.btnText, { color: v.ink }, textStyle]} numberOfLines={1}>
        {loading ? loadingLabel || 'Please wait…' : title}
      </Text>
    </Press>
  );
}

const CHIPS = {
  success: { bg: DT.successSoft, ink: DT.successInk },
  danger: { bg: DT.dangerSoft, ink: DT.dangerInk },
  warn: { bg: DT.warnSoft, ink: DT.warnInk },
  info: { bg: DT.infoSoft, ink: DT.info },
  neutral: { bg: DT.bgSoft, ink: DT.inkSoft },
  brand: { bg: DT.brandSoft, ink: DT.brand },
};

export function Chip({ label, tone = 'neutral', style }) {
  const c = CHIPS[tone] || CHIPS.neutral;
  return (
    <View style={[st.chip, { backgroundColor: c.bg }, style]}>
      <Text style={[st.chipText, { color: c.ink }]} numberOfLines={1}>
        {String(label || '')}
      </Text>
    </View>
  );
}

export function SectionLabel({ children, style }) {
  return <Text style={[st.section, style]}>{String(children || '')}</Text>;
}

const st = StyleSheet.create({
  card: {
    backgroundColor: DT.card,
    borderRadius: DT.radius.lg,
    borderWidth: 1,
    borderColor: DT.borderSoft,
    padding: DT.space.lg,
  },
  cardDark: { backgroundColor: DT.dark, borderColor: DT.darkSoft },
  btn: {
    minHeight: 52,
    borderRadius: DT.radius.sm,
    borderWidth: 1,
    paddingHorizontal: DT.space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { fontSize: 15, lineHeight: 20, ...outfit(600) },
  chip: { alignSelf: 'flex-start', borderRadius: DT.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 12, lineHeight: 16, textAlign: 'center', ...outfit(500) },
  section: { fontSize: 13, lineHeight: 18, color: DT.muted, ...outfit(500) },
});
