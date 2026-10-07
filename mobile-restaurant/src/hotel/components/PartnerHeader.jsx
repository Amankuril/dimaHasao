import { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Wallet, Bell } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import PartnerSidebar from './PartnerSidebar';
import { hotelService } from '../services/apiService';
import walletService from '../services/walletService';
import { formatCurrencyINR } from '../utils/format';
import { HT } from '../theme';

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

  return (
    <>
      <View style={[styles.header, { height: 96 + insets.top, paddingTop: 8 + insets.top }]}>
        <Press onPress={() => setIsSidebarOpen(true)} accessibilityLabel="Open menu" style={styles.roundBtn}>
          <Menu size={18} color={tw.gray700} />
        </Press>

        <View style={{ marginLeft: 16, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.brand, { color: HT.primary }]}>Dima</Text>
            <Text style={[styles.brand, { color: tw.amber600, marginLeft: 4 }]}>Hasao</Text>
          </View>
          <Text style={styles.partner}>Partner</Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Press onPress={() => navigate('/hotel/partner/notifications')} accessibilityLabel="Notifications" style={styles.roundBtn}>
            <Bell size={18} color={tw.gray700} />
            {unreadCount > 0 ? <View style={styles.dot} /> : null}
          </Press>

          <Press onPress={() => navigate('/hotel/partner/wallet')} accessibilityLabel="Wallet" style={styles.walletBtn}>
            <View style={styles.walletIcon}>
              <Wallet size={10} color="#fff" />
            </View>
            <View style={{ marginRight: 2 }}>
              {/* Written upper-case rather than textTransform: Android measures the lower-case text and clips the last letter. */}
              <Text style={styles.walletLabel} numberOfLines={1}>{'WALLET'}</Text>
              <Text style={styles.walletValue}>{formatCurrencyINR(walletBalance)}</Text>
            </View>
          </Press>
        </View>
      </View>

      {/* Rendered global to the header, as on the web */}
      <PartnerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243,244,246,0.5)',
  },
  roundBtn: { padding: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  brand: { fontSize: 18, lineHeight: 18, letterSpacing: -0.45, ...poppins(900) },
  partner: { fontSize: 9, lineHeight: 13, letterSpacing: 1.8, textTransform: 'uppercase', color: tw.gray400, marginTop: 4, ...poppins(700) },
  dot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: tw.red500, borderWidth: 2, borderColor: '#fff' },
  walletBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  walletIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: HT.primary, alignItems: 'center', justifyContent: 'center' },
  walletLabel: { fontSize: 8, lineHeight: 8, letterSpacing: 0.4, minWidth: 44, color: tw.gray400, ...poppins(700) },
  walletValue: { fontSize: 10, lineHeight: 12, color: tw.slate900, marginTop: 1, ...poppins(700) },
});

export { PartnerHeader };
export default PartnerHeader;
