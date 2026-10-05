import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';
import { useNavClearance } from './TableShared';

/** Shared chrome of TableModificationPolicy / TableCancellationPolicy: sticky header + scroll body. */
export default function TablePolicyScreen({ title, onBack, children }) {
  const clearance = useNavClearance();
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Press scale={0.9} onPress={onBack} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={24} color={tw.slate900} />
        </Press>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 80 + clearance, gap: 24 }}>{children}</ScrollView>
    </View>
  );
}

export function PolicyHero({ icon, tint, bg, title, subtitle }) {
  return (
    <View style={styles.hero}>
      <View style={[styles.heroIcon, { backgroundColor: bg }]}>{icon}</View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSub}>{subtitle.toUpperCase()}</Text>
    </View>
  );
}

export function PolicyBanner({ bg, shadowColor, icon, label, labelColor, line, note, noteColor }) {
  return (
    <View style={[styles.banner, { backgroundColor: bg }, shadow(`0 20px 25px -5px ${shadowColor}, 0 8px 10px -6px ${shadowColor}`)]}>
      <View style={styles.bannerIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerLabel, { color: labelColor }]}>{label.toUpperCase()}</Text>
        <Text style={styles.bannerLine}>{line}</Text>
        <Text style={[styles.bannerNote, { color: noteColor }]}>{note}</Text>
      </View>
    </View>
  );
}

export function PolicyList({ heading, items }) {
  return (
    <View style={{ gap: 16, paddingTop: 16 }}>
      <Text style={styles.listHeading}>{heading.toUpperCase()}</Text>
      <View style={styles.list}>
        {items.map((item, i) => (
          <View key={item.title} style={[styles.item, i > 0 ? { borderTopWidth: 1, borderTopColor: tw.slate50 } : null]}>
            <View style={{ marginTop: 4 }}>{item.icon}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export const policyStyles = StyleSheet.create({
  primaryBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 14, letterSpacing: 1.4, color: '#fff', ...poppins(900) },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderBottomWidth: 1, borderBottomColor: tw.slate100 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 28, letterSpacing: -0.5, color: tw.slate900, ...poppins(900) },
  hero: { backgroundColor: '#fff', borderRadius: 40, padding: 32, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', gap: 8, ...shadow('sm') },
  heroIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  heroTitle: { fontSize: 24, lineHeight: 30, letterSpacing: -0.6, color: tw.slate900, textAlign: 'center', ...poppins(900) },
  heroSub: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: tw.slate400, textAlign: 'center', paddingHorizontal: 16, marginTop: 4, ...poppins(700) },
  banner: { borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  bannerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bannerLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 2, marginBottom: 4, ...poppins(900) },
  bannerLine: { fontSize: 18, lineHeight: 28, color: '#fff', ...poppins(700) },
  bannerNote: { fontSize: 12, lineHeight: 16, marginTop: 4, fontStyle: 'italic', ...poppins(500) },
  listHeading: { fontSize: 10, lineHeight: 15, letterSpacing: 3, color: tw.slate400, marginLeft: 8, ...poppins(900) },
  list: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: tw.slate100, overflow: 'hidden', ...shadow('sm') },
  item: { padding: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  itemTitle: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(700) },
  itemDesc: { fontSize: 12, lineHeight: 19.5, color: tw.slate500, marginTop: 4, ...poppins(500) },
});
