import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Wallet, Building2, Star, Plus } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { Button } from '../../components/ds';
import { collectFcmTokenFast } from '../../lib/push';
import { color, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import usePartnerDashboard from '../hooks/usePartnerDashboard';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import RecentBookingsTable from '../components/dashboard/RecentBookingsTable';
import ActionRequired from '../components/dashboard/ActionRequired';
import { userService } from '../services/apiService';
import { PageLoader } from '../components/dashboard/partnerUi';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerDashboard.jsx
 * (/hotel/partner and /hotel/partner/dashboard).
 *
 * The web asks the browser for notification permission and registers an FCM
 * token for 'web'; the app registers its device push token for 'mobile'.
 */
const PartnerDashboard = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const { stats, recentBookings, actionItems, loading, user } = usePartnerDashboard();

  // Init Notifications
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const { fcmToken } = await collectFcmTokenFast();
        if (fcmToken) {
          await userService.updateFcmToken(fcmToken, 'mobile');
        }
      } catch (error) {
        console.error('Partner Notification Init Failed:', error);
      }
    };
    if (user) {
      initNotifications();
    }
  }, [user]);

  // Helper for formatting Currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.page}>
        <PageLoader />
      </View>
    );
  }

  const negativeWallet = Number(stats.walletBalance) < 0;

  return (
    <View style={styles.page}>
      <PartnerHeader />

      <ScrollView contentContainerStyle={[styles.main, { paddingBottom: space.xxxl + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* Header & Greeting */}
        <View style={styles.greetRow}>
          <View style={{ gap: space.xxs }}>
            <Text style={styles.h1} numberOfLines={2}>
              Welcome back, {user?.name?.split(' ')[0] || 'Partner'}
            </Text>
            <Text style={styles.sub}>Here&apos;s what&apos;s happening with your properties today.</Text>
          </View>

          {/* Add Property - High Visible */}
          <Button title="Add property" icon={Plus} onPress={() => navigate('/hotel/partner/join')} fullWidth={false} />
        </View>

        {/* Priority Actions */}
        <ActionRequired items={actionItems} />

        {/* KPI Grid */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <DashboardStatCard
              icon={Calendar}
              label="Total bookings"
              value={stats.totalBookings}
              subtext={stats.bookingsThisWeek > 0 ? `+${stats.bookingsThisWeek} this week` : 'No new bookings this week'}
              actionLabel="View all"
              onAction={() => navigate('/hotel/partner/bookings')}
            />
            <DashboardStatCard
              icon={Wallet}
              iconTone={negativeWallet ? 'danger' : 'success'}
              label="Wallet balance"
              value={negativeWallet ? `−${formatCurrency(Math.abs(stats.walletBalance))}` : formatCurrency(stats.walletBalance)}
              valueTone={negativeWallet ? 'danger' : undefined}
              valueNote={negativeWallet ? 'Due' : undefined}
              subtext={negativeWallet ? 'You owe the platform' : 'Available to withdraw'}
              actionLabel="Withdraw"
              onAction={() => navigate('/hotel/partner/wallet')}
            />
          </View>
          <View style={styles.gridRow}>
            <DashboardStatCard
              icon={Building2}
              iconTone="info"
              label="Active properties"
              value={stats.activeProperties}
              subtext="Online & bookable"
              actionLabel="Manage"
              onAction={() => navigate('/hotel/partner/properties')}
            />
            <DashboardStatCard
              icon={Star}
              iconTone="gold"
              label="Pending reviews"
              value={stats.pendingReviews}
              subtext="Action required"
              actionLabel="Reply"
              onAction={() => navigate('/hotel/partner/reviews')}
            />
          </View>
        </View>

        {/* Recent Activity Section */}
        <RecentBookingsTable bookings={recentBookings} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  main: { padding: space.lg, gap: space.xxl },
  greetRow: { gap: space.lg },
  h1: { ...type.heading, fontSize: 22, lineHeight: 30, color: color.text },
  sub: { ...type.small, color: color.textMuted },
  grid: { gap: space.md },
  gridRow: { flexDirection: 'row', gap: space.md },
});

export default PartnerDashboard;
