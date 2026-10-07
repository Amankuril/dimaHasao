import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { color, radii, space, tone as tones, type } from '../../../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/components/dashboard/DashboardStatCard.jsx.
 * One KPI tile: icon, the number large, the label as a caption, an optional
 * supporting line and an action link (44 px target). `iconTone` picks a
 * design-system tone; `valueTone` colours the number (e.g. 'danger' for a
 * negative wallet) and `valueNote` adds the word beside it ("Due").
 * `color` (the old icon hex) is still accepted for callers not yet migrated.
 */
const DashboardStatCard = ({ icon: Icon, label, value, subtext, actionLabel, onAction, iconTone = 'primary', valueTone, valueNote, color: legacyColor }) => {
  const t = tones[iconTone] || tones.primary;
  const vt = valueTone ? tones[valueTone] : null;
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: t.bg }]}>
        <Icon size={20} color={legacyColor && iconTone === 'primary' ? legacyColor : t.fg} />
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, vt && { color: vt.fg }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {valueNote ? (
          <View style={[styles.note, vt && { backgroundColor: vt.bg }]}>
            <Text style={[type.caption, { color: vt ? vt.fg : color.textSecondary }]}>{valueNote}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      {subtext ? (
        <Text style={styles.sub} numberOfLines={2}>
          {subtext}
        </Text>
      ) : null}
      {actionLabel ? (
        <Press scale={1} onPress={onAction} accessibilityLabel={`${actionLabel}: ${label}`} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <ChevronRight size={16} color={color.primary} />
        </Press>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs },
  iconBox: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  value: { ...type.priceLg, color: color.text, flexShrink: 1 },
  note: { paddingHorizontal: space.sm, height: 22, borderRadius: radii.pill, justifyContent: 'center', backgroundColor: color.surfaceMuted },
  label: { ...type.label, color: color.textSecondary, marginTop: space.xxs },
  sub: { ...type.caption, color: color.textMuted, marginTop: space.xxs },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.xxs, minHeight: 44, alignSelf: 'flex-start', marginTop: space.xs },
  actionText: { ...type.label, color: color.primary },
});

export { DashboardStatCard };
export default DashboardStatCard;
