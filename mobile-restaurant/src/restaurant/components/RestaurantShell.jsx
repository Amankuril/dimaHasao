import { Redirect, Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { usePushNotifications } from '../../lib/push';
import { localStore } from '../../lib/storage';
import { setCurrentPath } from '../utils/alertPlatform';

/*
 * Web: Food/components/restaurant/RestaurantRouter.jsx. The routes that sit
 * outside <ProtectedRoute requiredRole="restaurant"> are listed here; every
 * other route sends a signed-out partner to the sign-in screen. (The
 * "Session Expired" toast the router raises on a failed refresh comes from
 * AuthContext, which owns the session.)
 */
const HOME = '/food/restaurant';
const PUBLIC = new Set(['login', 'otp', 'signup', 'forgot-password', 'pending-verification', 'onboarding', 'privacy', 'terms', 'help-centre/support', 'help-content']);

export default function RestaurantShell() {
  const { signedIn, booting, user } = useAuth();
  const pathname = usePathname();
  usePushNotifications(!booting && signedIn);
  // Ported code that reads window.location.pathname asks alertPlatform for it.
  setCurrentPath(pathname);
  if (booting) return null;
  const sub = pathname.replace(/\/+$/, '').slice(HOME.length + 1);
  const isPublic = PUBLIC.has(sub);
  if (!signedIn && !isPublic) return <Redirect href={`${HOME}/login`} />;

  // ProtectedRoute: a restaurant that is not approved yet (or was disabled) only sees the verification screen.
  if (signedIn && !isPublic) {
    const status = String(user?.status || '').toLowerCase();
    if (status === 'pending' || status === 'rejected') {
      localStore.setItem('restaurant_pendingStatus', status);
      localStore.setItem(
        'restaurant_pendingMessage',
        status === 'pending'
          ? 'Your restaurant registration is pending approval.'
          : user.rejectionReason
            ? `Your restaurant registration has been rejected. Reason: ${user.rejectionReason}`
            : 'Your restaurant registration has been rejected. Please contact support.',
      );
      return <Redirect href={`${HOME}/pending-verification`} />;
    }
    if (status === 'banned' || status === 'deleted') {
      localStore.setItem('restaurant_pendingStatus', 'banned');
      localStore.setItem('restaurant_pendingMessage', 'Your restaurant has been disabled. Reason: Disabled by admin');
      return <Redirect href={`${HOME}/pending-verification`} />;
    }
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' }, animation: 'fade', animationDuration: 120 }} />
    </View>
  );
}
