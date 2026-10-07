import { View } from 'react-native';
import { useLocation, useNavigate } from '../../lib/webRouter';
import UserSupportChatPanel from '../components/UserSupportChatPanel';
import ScreenHeader from '../ui/ScreenHeader';
import { DT } from '../ui/dt';

/** Port of Taxi/modules/driver/pages/settings/SupportChat.jsx (/taxi/driver/support/chat). */
export default function SupportChat() {
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = '/taxi/driver';
  const backPath = location.state?.backPath || `${routePrefix}/help-support`;
  const backState = location.state?.backState;

  return (
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <ScreenHeader
        title="Support Chat"
        subtitle="Talk to the support team"
        onBack={() => navigate(backPath, backState ? { state: backState } : undefined)}
      />
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
