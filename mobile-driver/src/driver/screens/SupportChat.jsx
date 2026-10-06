import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { outfit, shadow, tw } from '../../theme';
import UserSupportChatPanel from '../components/UserSupportChatPanel';

/** Port of Taxi/modules/driver/pages/settings/SupportChat.jsx (/taxi/driver/support/chat). */
export default function SupportChat() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = '/taxi/driver';
  const backPath = location.state?.backPath || `${routePrefix}/help-support`;
  const backState = location.state?.backState;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <Press onPress={() => navigate(backPath, backState ? { state: backState } : undefined)} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={18} color={tw.slate900} />
        </Press>
        <Text style={styles.title} accessibilityRole="header">Support Chat</Text>
      </View>
      <UserSupportChatPanel
        preferredRole="driver"
        title="Driver Support Chat"
        subtitle="Live Messages"
        surface="plain"
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.slate200, ...shadow('sm') },
  back: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  title: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...outfit(900) },
});

