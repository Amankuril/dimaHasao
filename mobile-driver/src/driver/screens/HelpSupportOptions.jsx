import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Headset, MessageCircle } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { outfit, shadow } from '../../theme';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';


/** Port of Taxi/modules/driver/pages/settings/HelpSupportOptions.jsx (/taxi/driver/help-support). */
export default function HelpSupportOptions() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const routePrefix = '/taxi/driver';

  const options = [
    { title: 'Live Chat', sub: 'Talk instantly with support team', Icon: MessageCircle, color: DT.brand, bg: DT.brandSoft, to: `${routePrefix}/support/chat` },
    { title: 'Support Ticket', sub: 'Raise and track issue tickets', Icon: Headset, color: DT.brand, bg: DT.brandSoft, to: `${routePrefix}/support/tickets` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
    <ScreenHeader title="Help & Support" subtitle="We are here for you" onBack={() => navigate(`${routePrefix}/profile`)} />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 24 + insets.bottom }}>
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
            <ChevronRight size={20} color={DT.faint} />
          </Press>
        ))}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, paddingHorizontal: 18, paddingVertical: 18, ...shadow('sm') },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, lineHeight: 21, color: DT.ink, ...outfit(700) },
  cardSub: { fontSize: 12, lineHeight: 17, color: DT.muted, ...outfit(500) },
});
