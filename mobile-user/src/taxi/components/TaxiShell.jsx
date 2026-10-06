import { useEffect, useMemo } from 'react';
import { Redirect, Stack, router, usePathname } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, PatternDivider } from '../../components/dh/Header';
import { useAuth } from '../../context/AuthContext';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { UserThemeProvider } from '../context/UserThemeContext';
import { socketService } from '../api/socket';
import taxiApi from '../api/client';
import { clearCurrentRide } from '../services/currentRideService';
import { addRealtimeNotification } from '../store/realtimeNotificationStore';
import { syncUpcomingRideReminders } from '../store/upcomingRideReminderService';
import { events } from '../../lib/events';
import { toast } from '../../lib/notify';

/*
 * Web: TaxiApp.jsx. UserProtectedRoute (signed-out -> shared login), UserAccountInvalidationListener (socket
 * `account:deleted` / admin `chat:message`, `app:auth-stale`), UserUpcomingRideReminderBootstrap (scheduled rides,
 * every 10 minutes), SettingsProvider and UserThemeProvider. The page background is #EFF5FD (MainLayout).
 */
const getPayload = (response) => response?.data?.data || response?.data || response || {};

function Listeners() {
  const { logout } = useAuth();
  const { loading: settingsLoading } = useSettings();

  useEffect(() => {
    const handleLogout = async () => {
      clearCurrentRide();
      socketService.disconnect();
      await logout();
    };
    const handleAdminChatMessage = (payload = {}) => {
      const senderRole = String(payload.senderRole || payload.sender?.role || '').toLowerCase();
      const receiverRole = String(payload.receiverRole || payload.receiver?.role || '').toLowerCase();
      const body = String(payload.message || payload.body || '').trim();
      if (senderRole !== 'admin' || !body) return;
      if (receiverRole && receiverRole !== 'user') return;
      const added = addRealtimeNotification({
        id: `support-chat:${payload.id || payload._id || `${Date.now()}-${body}`}`,
        title: 'Support message',
        body,
        sentAt: payload.createdAt || new Date().toISOString(),
        type: 'support',
        source: 'support-chat',
      });
      if (added) toast(body, { duration: 4500 });
    };
    const handleAuthStale = (event) => {
      if (event?.detail?.role === 'user') handleLogout();
    };

    const socket = socketService.connect({ role: 'user' });
    if (socket) {
      socketService.on('account:deleted', handleLogout);
      socketService.on('chat:message', handleAdminChatMessage);
    }
    events.on('app:auth-stale', handleAuthStale);
    return () => {
      socketService.off('account:deleted', handleLogout);
      socketService.off('chat:message', handleAdminChatMessage);
      events.off('app:auth-stale', handleAuthStale);
      socketService.disconnect();
    };
  }, [logout]);

  useEffect(() => {
    if (settingsLoading) return undefined;
    let cancelled = false;
    const sync = async () => {
      try {
        const result = await taxiApi.get('/rides', { params: { page: 1, limit: 20, category: 'scheduled' } }).catch(() => ({ data: { results: [] } }));
        if (cancelled) return;
        const payload = getPayload(result);
        syncUpcomingRideReminders({ scheduledRides: Array.isArray(payload?.results) ? payload.results : [] });
      } catch {
        /* reminder sync is non-blocking */
      }
    };
    sync();
    const id = setInterval(sync, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [settingsLoading]);

  return null;
}

export default function TaxiShell() {
  const { signedIn, booting } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  // The module header already sits below the status bar, so the screens under it must not pad for it again.
  const innerInsets = useMemo(() => ({ ...insets, top: 0 }), [insets]);
  if (booting) return null;
  // Guests cannot browse taxi: the shared login, returning to where they were.
  if (!signedIn) return <Redirect href={{ pathname: '/app/login', params: { from: pathname } }} />;
  return (
    <SettingsProvider>
      <UserThemeProvider>
        <Listeners />
        {/* Web: routes.jsx TaxiUserShell -> ModuleShell (module header + divider above every taxi screen). */}
        <View style={{ flex: 1, backgroundColor: '#EFF5FD' }}>
          <Header title="TAXI / AUTO" subtitle="Book your ride, travel with ease" rightAction="none" onBack={() => router.navigate('/app')} />
          <PatternDivider variant="green-gold" />
          <SafeAreaInsetsContext.Provider value={innerInsets}>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#EFF5FD' }, animation: 'fade', animationDuration: 120 }} />
            </View>
          </SafeAreaInsetsContext.Provider>
        </View>
      </UserThemeProvider>
    </SettingsProvider>
  );
}
