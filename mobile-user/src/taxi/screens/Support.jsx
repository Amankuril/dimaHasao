import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowLeft, ChevronRight, HelpCircle, MessageCircle, Phone, ShieldCheck, Siren, XCircle } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import { useSupportInfo } from '../content/supportInfo';
import { getTaxiUserRoutePrefix } from '../utils/routePrefix';

const HELP_TOPICS = [
  { title: "Driver didn't arrive", Icon: XCircle, color: '#FF2056', bg: 'rgba(255,241,242,0.7)' },
  { title: 'Safety concern', Icon: ShieldCheck, color: '#155DFC', bg: 'rgba(239,246,255,0.7)' },
  { title: 'I lost an item', Icon: HelpCircle, color: '#FF6900', bg: 'rgba(255,247,237,0.7)' },
  { title: 'Payment failure', Icon: AlertCircle, color: tw.slate800, bg: 'rgba(248,250,252,0.7)' },
];

/** Port of Taxi/modules/user/pages/ride/Support.jsx (/taxi/user/support). */
export default function Support() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const routePrefix = getTaxiUserRoutePrefix();
  const SUPPORT_INFO = useSupportInfo();

  const openSupportChat = (topicTitle = '') => {
    const initialDraft = topicTitle ? `Hi, I need help with: ${topicTitle}.` : '';
    navigate(`${routePrefix}/ride/chat?admin=true&role=user`, { state: initialDraft ? { initialDraft } : undefined });
  };
  const quick = [
    { title: 'Live chat', sub: 'Get quick help', Icon: MessageCircle, color: '#F54900', onPress: () => openSupportChat() },
    { title: 'Call support', sub: 'Talk to us', Icon: Phone, color: '#4F39F6', onPress: () => Linking.openURL(`tel:${SUPPORT_INFO.phoneHref}`).catch(() => {}) },
    { title: 'Emergency SOS', sub: 'Get safety help fast', Icon: Siren, color: '#EC003F', onPress: () => navigate(`${routePrefix}/safety/sos`) },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <Press scale={0.95} onPress={() => navigate(-1)} accessibilityLabel="Go back" style={{ padding: 8, marginLeft: -8 }} hitSlop={6}>
          <ArrowLeft size={22} color={tw.slate900} strokeWidth={3} />
        </Press>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker}>Support</Text>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">Help & Support</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 96 + insets.bottom, gap: 20 }}>
        <View style={{ gap: 12 }}>
          {quick.map(({ title, sub, Icon, color, onPress }) => (
            <Press key={title} scale={0.98} onPress={onPress} accessibilityLabel={`${title}. ${sub}`} style={styles.card}>
              <View style={styles.cardIcon}>
                <Icon size={20} color={color} strokeWidth={2.6} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{sub}</Text>
              </View>
            </Press>
          ))}
        </View>

        <View>
          <Text style={styles.section}>CHOOSE A TOPIC</Text>
          <View style={{ gap: 10 }}>
            {HELP_TOPICS.map(({ title, Icon, color, bg }) => (
              <Press key={title} scale={0.99} onPress={() => openSupportChat(title)} accessibilityLabel={title} style={styles.topic}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <View style={[styles.topicIcon, { backgroundColor: bg }]}>
                    <Icon size={18} color={color} strokeWidth={2.6} />
                  </View>
                  <Text style={styles.topicTitle} numberOfLines={1}>{title}</Text>
                </View>
                <View style={styles.chevron}>
                  <ChevronRight size={16} color={tw.slate300} strokeWidth={3} />
                </View>
              </Press>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const soft = shadow('0 14px 34px rgba(15,23,42,0.07)');
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.92)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.7)', ...shadow('0 10px 20px rgba(15,23,42,0.05)') },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 2.6, color: tw.slate400, ...fo(900) },
  title: { marginTop: 4, fontSize: 18, lineHeight: 20, letterSpacing: -0.45, color: tw.slate900, ...fo(900) },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', padding: 16, ...soft },
  cardIcon: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  cardTitle: { fontSize: 13, lineHeight: 16, color: tw.slate900, ...fo(900) },
  cardSub: { marginTop: 2, fontSize: 11, lineHeight: 16, color: tw.slate500, ...fo(700) },
  section: { fontSize: 10, lineHeight: 15, letterSpacing: 2.6, color: tw.slate400, marginBottom: 12, marginLeft: 4, ...fo(900) },
  topic: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', ...soft },
  topicIcon: { width: 40, height: 40, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  topicTitle: { flex: 1, fontSize: 14, lineHeight: 20, letterSpacing: -0.35, color: tw.slate900, ...fo(900) },
  chevron: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
});
