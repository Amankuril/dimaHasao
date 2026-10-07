import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, Wallet, Building2, Star, Plus } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { Press } from '../../components/ui';
import { collectFcmTokenFast } from '../../lib/push';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import usePartnerDashboard from '../hooks/usePartnerDashboard';
import DashboardStatCard from '../components/dashboard/DashboardStatCard';
import RecentBookingsTable from '../components/dashboard/RecentBookingsTable';
import ActionRequired from '../components/dashboard/ActionRequired';
import { userService } from '../services/apiService';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerDashboard.jsx
 * (/hotel/partner and /hotel/partner/dashboard).
 *
 * The web asks the browser for notification permission and registers an FCM
 * token for 'web'; the app registers its device push token for 'mobile'.
 */
const PartnerDashboard = () => {
  const navigate = useNavigate();
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
      <View style={[styles.page, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={HT.primary} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <PartnerHeader />

      <ScrollView contentContainerStyle={styles.main} showsVerticalScrollIndicator={false}>
        {/* Header & Greeting */}
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.h1}>Welcome back, {user?.name?.split(' ')[0] || 'Partner'}! 👋</Text>
            <Text style={styles.sub}>Here&apos;s what&apos;s happening with your properties today.</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Add Property - High Visible */}
            <Press onPress={() => navigate('/hotel/partner/join')} style={styles.addBtn}>
              <Plus size={18} color="#fff" />
              <Text style={styles.addText}>Add Property</Text>
            </Press>
          </View>
        </View>

        {/* Priority Actions */}
        <ActionRequired items={actionItems} />

        {/* KPI Grid */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <DashboardStatCard
              icon={Calendar}
              label="Total Bookings"
              value={stats.totalBookings}
              subtext={stats.bookingsThisWeek > 0 ? `+${stats.bookingsThisWeek} this week` : 'No new bookings this week'}
              actionLabel="View All"
              onAction={() => navigate('/hotel/partner/bookings')}
            />
            <DashboardStatCard
              icon={Wallet}
              label="Wallet Balance"
              value={formatCurrency(stats.walletBalance)}
              subtext="Available to withdraw"
              actionLabel="Withdraw"
              onAction={() => navigate('/hotel/partner/wallet')}
              color={tw.blue600}
            />
          </View>
          <View style={styles.gridRow}>
            <DashboardStatCard
              icon={Building2}
              label="Active Properties"
              value={stats.activeProperties}
              subtext="Online & Bookable"
              actionLabel="Manage"
              onAction={() => navigate('/hotel/partner/properties')}
              color={tw.purple600}
            />
            <DashboardStatCard
              icon={Star}
              label="Pending Reviews"
              value={stats.pendingReviews}
              subtext="Action required"
              actionLabel="Reply"
              onAction={() => navigate('/hotel/partner/reviews')}
              color={tw.orange500}
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
  page: { flex: 1, backgroundColor: HT.bg },
  main: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 96 },
  greetRow: { marginBottom: 32, gap: 16 },
  h1: { fontSize: 24, lineHeight: 32, color: tw.slate900, ...poppins(900) },
  sub: { color: tw.gray500, marginTop: 4, fontSize: 14, lineHeight: 20, ...poppins(500) },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: HT.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start', ...shadow('md') },
  addText: { color: '#fff', fontSize: 16, lineHeight: 24, ...poppins(700) },
  grid: { gap: 8, marginBottom: 24 },
  gridRow: { flexDirection: 'row', gap: 8 },
});

export default PartnerDashboard;
