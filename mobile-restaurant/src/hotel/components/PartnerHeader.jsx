import { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Wallet, Bell } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { Press } from '../../components/ui';
import { color, radii, space, type, elevation } from '../../theme';
import Fa from '../../components/Fa';
import PartnerSidebar from './PartnerSidebar';
import { hotelService } from '../services/apiService';
import walletService from '../services/walletService';
import { formatCurrencyINR } from '../utils/format';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/components/PartnerHeader.jsx:
 * menu button, DIMA HASAO / PARTNER wordmark, notification bell with unread
 * dot and the wallet balance chip. `title` / `subtitle` are accepted but, as on
 * the web, not drawn.
 */
const PartnerHeader = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const walletData = await walletService.getWallet({ viewAs: 'partner' });
        if (walletData.success && walletData.wallet) {
          setWalletBalance(walletData.wallet.balance);
        }
      } catch (error) {
        console.error('Failed to fetch wallet', error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const notifData = await hotelService.getNotifications(1, 1);
        if (notifData.success && notifData.meta) {
          setUnreadCount(notifData.meta.unreadCount);
        }
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };

    fetchWallet();
    fetchNotifications();
  }, []);

  const negative = Number(walletBalance) < 0;
  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top + space.xs }]}>
        <Press onPress={() => setIsSidebarOpen(true)} accessibilityLabel="Open menu" style={styles.iconBtn}>
          <Menu size={22} color={color.textInverse} />
        </Press>

        <View style={styles.brandBox}>
          <View style={styles.brandRow}>
            <Fa name="fa-solid fa-leaf" size={11} color={color.gold} />
            <Text style={styles.brand} numberOfLines={1} accessibilityRole="header">DIMA HASAO</Text>
          </View>
          <Text style={styles.partner}>Partner</Text>
        </View>

        <View style={{ flex: 1 }} />

        <Press onPress={() => navigate('/hotel/partner/notifications')} accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'} style={styles.iconBtn}>
          <Bell size={22} color={color.textInverse} />
          {unreadCount > 0 ? <View style={styles.dot} /> : null}
        </Press>

        <Press onPress={() => navigate('/hotel/partner/wallet')} accessibilityLabel={`Wallet, ${formatCurrencyINR(walletBalance)}${negative ? ', amount due' : ''}`} style={styles.walletBtn}>
          <Wallet size={16} color={color.goldOnDark} />
          <View>
            <Text style={styles.walletLabel} numberOfLines={1}>{negative ? 'Due' : 'Wallet'}</Text>
            <Text style={[styles.walletValue, negative && { color: '#FCA5A5' }]} numberOfLines={1}>{formatCurrencyINR(walletBalance)}</Text>
          </View>
        </Press>
      </View>

      {/* Rendered global to the header, as on the web */}
      <PartnerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 60, paddingHorizontal: space.sm, paddingBottom: space.sm, backgroundColor: color.primaryDeep, ...elevation.card },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  brandBox: { marginLeft: space.xs },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  brand: { ...type.titleSerif, color: color.goldOnDark },
  partner: { ...type.tagline, fontSize: 12, lineHeight: 16, color: color.textOnDarkMuted, marginLeft: 17 },
  dot: { position: 'absolute', top: 9, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: color.goldBright, borderWidth: 2, borderColor: color.primaryDeep },
  walletBtn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, paddingHorizontal: space.md, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(202,168,62,0.4)' },
  walletLabel: { ...type.caption, lineHeight: 14, color: color.textOnDarkMuted },
  walletValue: { ...type.label, lineHeight: 16, color: color.textInverse },
});

export { PartnerHeader };
export default PartnerHeader;
