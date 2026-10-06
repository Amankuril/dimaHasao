import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Headset, MessageCircle } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { outfit, shadow, tw } from '../../theme';

/** Port of Taxi/modules/driver/pages/settings/HelpSupportOptions.jsx (/taxi/driver/help-support). */
export default function HelpSupportOptions() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const routePrefix = '/taxi/driver';

  const options = [
    { title: 'Live Chat', sub: 'Talk instantly with support team', Icon: MessageCircle, color: tw.indigo600, bg: tw.indigo50, to: `${routePrefix}/support/chat` },
    { title: 'Support Ticket', sub: 'Raise and track issue tickets', Icon: Headset, color: tw.emerald600, bg: tw.emerald50, to: `${routePrefix}/support/tickets` },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8f9fb' }} contentContainerStyle={{ padding: 24, paddingTop: 40 + insets.top, paddingBottom: 24 + insets.bottom }}>
      <View style={styles.header}>
        <Press onPress={() => navigate(`${routePrefix}/profile`)} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={18} color={tw.slate900} />
        </Press>
        <Text style={styles.title} accessibilityRole="header">Help & Support</Text>
      </View>
      <View style={{ gap: 16 }}>
        {options.map(({ title, sub, Icon, color, bg, to }) => (
          <Press key={title} scale={1} onPress={() => navigate(to)} accessibilityLabel={`${title}. ${sub}`} style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
              <View style={[styles.icon, { backgroundColor: bg }]}>
                <Icon size={20} color={color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSub}>{sub}</Text>
              </View>
            </View>
            <ChevronRight size={18} color={tw.slate300} />
          </Press>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  back: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  title: { fontSize: 18, lineHeight: 28, letterSpacing: -0.45, color: tw.slate900, ...outfit(900) },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 20, ...shadow('sm') },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...outfit(900) },
  cardSub: { fontSize: 12, lineHeight: 16, color: tw.slate400, ...outfit(600) },
});
