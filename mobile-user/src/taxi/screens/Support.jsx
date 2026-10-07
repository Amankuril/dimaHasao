import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, ChevronRight, HelpCircle, MessageCircle, Phone, ShieldCheck, Siren, XCircle } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { Card, ListRow, SectionHeader } from '../../components/ds';
import { color, radii, space, tone, type } from '../../theme';
import { PageTitle, useNavPad } from '../account/ui';
import { useSupportInfo } from '../content/supportInfo';
import { getTaxiUserRoutePrefix } from '../utils/routePrefix';

const HELP_TOPICS = [
  { title: "Driver didn't arrive", Icon: XCircle, tone: 'warning' },
  { title: 'Safety concern', Icon: ShieldCheck, tone: 'info' },
  { title: 'I lost an item', Icon: HelpCircle, tone: 'gold' },
  { title: 'Payment failure', Icon: AlertCircle, tone: 'neutral' },
];

/** Port of Taxi/modules/user/pages/ride/Support.jsx (/taxi/user/support). */
export default function Support() {
  const bottomPad = useNavPad(space.xxl);
  const navigate = useNavigate();
  const routePrefix = getTaxiUserRoutePrefix();
  const SUPPORT_INFO = useSupportInfo();

  const openSupportChat = (topicTitle = '') => {
    const initialDraft = topicTitle ? `Hi, I need help with: ${topicTitle}.` : '';
    navigate(`${routePrefix}/ride/chat?admin=true&role=user`, { state: initialDraft ? { initialDraft } : undefined });
  };
  const quick = [
    { title: 'Live chat', sub: 'Get quick help', Icon: MessageCircle, tone: 'primary', onPress: () => openSupportChat() },
    { title: 'Call support', sub: 'Talk to us', Icon: Phone, tone: 'info', onPress: () => Linking.openURL(`tel:${SUPPORT_INFO.phoneHref}`).catch(() => {}) },
    { title: 'Emergency SOS', sub: 'Get safety help fast', Icon: Siren, tone: 'danger', onPress: () => navigate(`${routePrefix}/safety/sos`) },
  ];

  const [chat, call, sos] = quick;

  return (
    <View style={styles.flex}>
      <PageTitle title="Help & support" subtitle="We're here to help, day and night" onBack={() => navigate(-1)} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}>
        <Press scale={0.98} onPress={sos.onPress} accessibilityLabel={`${sos.title}. ${sos.sub}`} style={styles.sos}>
          <View style={styles.sosIcon}>
            <Siren size={24} color={color.textInverse} />
          </View>
          <View style={styles.grow}>
            <Text style={[type.subheading, { color: color.danger }]}>{sos.title}</Text>
            <Text style={[type.small, { color: color.textSecondary }]}>{sos.sub}</Text>
          </View>
          <ChevronRight size={20} color={color.danger} />
        </Press>

        <View style={styles.quickRow}>
          {[chat, call].map(({ title, sub, Icon, tone: tn, onPress }) => (
            <Card key={title} onPress={onPress} accessibilityLabel={`${title}. ${sub}`} style={styles.quick}>
              <View style={[styles.quickIcon, { backgroundColor: tone[tn].bg }]}>
                <Icon size={20} color={tone[tn].fg} />
              </View>
              <Text style={[type.bodyStrong, { color: color.text }]}>{title}</Text>
              <Text style={[type.small, { color: color.textMuted }]} numberOfLines={1}>{sub}</Text>
            </Card>
          ))}
        </View>

        <View style={{ marginTop: space.md }}>
          <SectionHeader title="Choose a topic" />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {HELP_TOPICS.map(({ title, Icon, tone: tn }, i) => (
              <ListRow key={title} icon={Icon} iconTone={tn} title={title} onPress={() => openSupportChat(title)} divider={i < HELP_TOPICS.length - 1} />
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.md },
  sos: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 72, padding: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: color.danger, backgroundColor: color.dangerSoft },
  sosIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.danger, alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', gap: space.md },
  quick: { flex: 1, gap: space.xs, minHeight: 120 },
  quickIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
});
