import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Card, IconButton, SectionHeader } from '../../../components/ds';
import { color, radii, space, tone as tones, type } from '../../../theme';
import { useNavClearance } from './TableShared';

/** Shared chrome of TableModificationPolicy / TableCancellationPolicy: page header + scroll body. */
export default function TablePolicyScreen({ title, onBack, children }) {
  const clearance = useNavClearance();
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Back" variant="soft" onPress={onBack} />
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl + clearance, gap: space.xxl }}>{children}</ScrollView>
    </View>
  );
}

/** Intro card: icon tile, title, one-line subtitle. `icon` is a component taking { size, color }. */
export function PolicyHero({ icon: Icon, tone = 'primary', title, subtitle }) {
  const t = tones[tone] || tones.primary;
  return (
    <Card style={styles.hero}>
      <View style={[styles.heroIcon, { backgroundColor: t.bg }]}>
        <Icon size={32} color={t.fg} />
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSub}>{subtitle}</Text>
    </Card>
  );
}

/** The deadline / status callout (soft tone background, never colour alone). */
export function PolicyBanner({ tone = 'primary', icon: Icon, label, line, note }) {
  const t = tones[tone] || tones.primary;
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }]}>
      <View style={[styles.bannerIcon, { backgroundColor: color.surface }]}>
        <Icon size={22} color={t.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.bannerLabel, { color: t.fg }]}>{label}</Text>
        <Text style={styles.bannerLine}>{line}</Text>
        <Text style={styles.bannerNote}>{note}</Text>
      </View>
    </View>
  );
}

/** Titled list of policy points. items: [{ title, desc, icon: Component, tone }] */
export function PolicyList({ heading, items }) {
  return (
    <View>
      <SectionHeader title={heading} />
      <Card padded={false}>
        {items.map((item, i) => {
          const Icon = item.icon;
          const t = tones[item.tone] || tones.success;
          return (
            <View key={item.title} style={[styles.item, i > 0 ? styles.itemDivider : null]}>
              <Icon size={20} color={t.fg} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  title: { flex: 1, ...type.heading, color: color.text },
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  heroTitle: { ...type.heading, color: color.text, textAlign: 'center' },
  heroSub: { ...type.body, color: color.textSecondary, textAlign: 'center' },
  banner: { borderRadius: radii.lg, padding: space.lg, flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  bannerIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  bannerLabel: { ...type.overline, marginBottom: space.xxs },
  bannerLine: { ...type.subheading, color: color.text },
  bannerNote: { ...type.small, color: color.textSecondary, marginTop: space.xxs },
  item: { padding: space.lg, flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  itemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  itemTitle: { ...type.bodyStrong, color: color.text },
  itemDesc: { ...type.body, color: color.textSecondary, marginTop: space.xxs },
});
