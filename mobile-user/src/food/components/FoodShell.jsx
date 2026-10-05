import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { LogIn, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import Skeleton from '../../components/Skeleton';
import { Header, PatternDivider } from '../../components/dh/Header';
import { ProfileProvider, useProfile } from '../context/ProfileContext';
import { CartProvider } from '../context/CartContext';
import { OrdersProvider } from '../context/OrdersContext';
import { useUserNotifications } from '../hooks/useUserNotifications';
import { useLocation as useGeoLocation } from '../hooks/useLocation';
import { useZone } from '../hooks/useZone';
import { useCartZoneGuard } from '../hooks/useCartZoneGuard';
import { isModuleAuthenticated } from '../utils/auth';
import { isExactMainTabPath } from '../utils/mainTabRoutes';
import { registerFoodPageCacheLifecycle } from '../utils/foodPageCache';
import { events } from '../../lib/events';
import { localStore, sessionStore } from '../../lib/storage';
import { toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';
import { F, LocationLoaderOverlay, LocationSelectorProvider, OutOfZoneScreen, useLocationSelector } from './shell';

/** Port of components/user/LoginRequiredModal.jsx. */
function LoginRequiredModal({ isOpen, onClose, intent = 'general' }) {
  const isTaxiIntent = intent === 'taxi';
  return (
    <Dialog visible={isOpen} onClose={onClose} backdrop="rgba(0,0,0,0.6)" panelStyle={styles.login}>
      <View style={styles.loginRule} />
      <Press scale={0.9} onPress={onClose} accessibilityLabel="Close" style={styles.loginClose} hitSlop={8}>
        <X size={20} color={F.green} />
      </Press>
      <View style={styles.loginIcon}>
        <LogIn size={28} color={F.green} />
      </View>
      <Text style={styles.loginTitle}>LOGIN REQUIRED</Text>
      <Text style={styles.loginBody}>
        {isTaxiIntent ? 'Please login to book rides, parcels, and more on Dima Hasao Taxi.' : 'Please login to continue your delicious journey'}
      </Text>
      <Press
        scale={0.98}
        onPress={() => {
          onClose?.();
          router.push('/app/login');
        }}
        accessibilityLabel="Login or sign up"
        style={styles.loginBtn}
      >
        <Text style={styles.loginBtnText}>LOGIN / SIGN UP</Text>
      </Press>
      <Press scale={0.98} onPress={onClose} accessibilityLabel="Not now" style={{ paddingVertical: 8, alignSelf: 'stretch' }}>
        <Text style={styles.loginSkip}>NOT NOW</Text>
      </Press>
    </Dialog>
  );
}

function AppShellSkeleton() {
  return (
    <View style={styles.skeleton} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Skeleton style={{ height: 180, borderRadius: 24 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ width: 72, height: 72, borderRadius: 36 }} />
        ))}
      </View>
      <Skeleton style={{ height: 144, borderRadius: 16 }} />
      <Skeleton style={{ height: 220, borderRadius: 24 }} />
    </View>
  );
}

const isSampleNotification = (item) => {
  const id = String(item?.id || '');
  const title = String(item?.title || '');
  const message = String(item?.message || '');
  if (id === '1' || id === '2') return true;
  if (title === 'Order Confirmed' && message.includes('#12345')) return true;
  return title === 'Special Offer' && message.includes('50% off');
};

function FoodShellContent() {
  const pathname = usePathname();
  const { location: activeLocation, loading: isGeoLoading } = useGeoLocation();
  const { loading: isProfileLoading } = useProfile();
  const { isOutOfService, loading: isZoneLoading, zoneStatus, zoneId } = useZone(activeLocation);
  useCartZoneGuard(zoneId, zoneStatus);
  const hasValidCoordinates = !!activeLocation && Number.isFinite(activeLocation.latitude) && Number.isFinite(activeLocation.longitude);
  const isOutOfZone = isOutOfService && hasValidCoordinates;
  const { openLocationSelector, showGlobalLoader, setShowGlobalLoader } = useLocationSelector();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalIntent, setLoginModalIntent] = useState('general');

  useEffect(() => {
    const handleShowLoginModal = (event) => {
      setLoginModalIntent(event?.detail?.intent === 'taxi' ? 'taxi' : 'general');
      setIsLoginModalOpen(true);
    };
    const handleNotificationToast = (e) => {
      const { title, message } = e?.detail || {};
      toast([title || 'Notification', message].filter(Boolean).join('\n'));
    };
    const handleOrderNotif = (e) => {
      const { orderId, status, title, message } = e?.detail || {};
      const statusLower = String(status || '').toLowerCase();
      if (statusLower !== 'delivered' && !statusLower.includes('cancel')) return;
      const isDelivered = statusLower === 'delivered';
      const newNotif = {
        id: `order-${orderId}-${status}-${Date.now()}`,
        type: isDelivered ? 'order' : 'alert',
        title: title || (isDelivered ? `Order #${orderId} Delivered!` : `Order #${orderId} ${status}`),
        message: message || (isDelivered ? 'Your order has been delivered. Enjoy!' : `Your order status is now ${statusLower.replace(/_/g, ' ')}`),
        time: 'Just now',
        timestamp: Date.now(),
        read: false,
        icon: isDelivered ? 'CheckCircle2' : 'AlertCircle',
        iconColor: isDelivered ? 'text-green-600' : 'text-red-600',
      };
      try {
        const existing = JSON.parse(localStore.getItem('food_user_notifications') || '[]');
        const cleaned = (Array.isArray(existing) ? existing : []).filter((item) => !isSampleNotification(item));
        const dedupeKey = `order-${orderId}-${status}`;
        const already = cleaned.some(
          (n) => String(n.id || '').startsWith(dedupeKey) || (String(n.title || '') === String(newNotif.title) && Date.now() - Number(n.timestamp || 0) < 15000),
        );
        if (already) return;
        const updated = [newNotif, ...cleaned].slice(0, 100);
        localStore.setItem('food_user_notifications', JSON.stringify(updated));
        events.emit('notificationsUpdated', { count: updated.filter((n) => !n.read).length });
      } catch {}
    };
    events.on('show-login-required', handleShowLoginModal);
    events.on('show-user-notification-toast', handleNotificationToast);
    events.on('orderStatusNotification', handleOrderNotif);
    return () => {
      events.off('show-login-required', handleShowLoginModal);
      events.off('show-user-notification-toast', handleNotificationToast);
      events.off('orderStatusNotification', handleOrderNotif);
    };
  }, []);

  const normalizedPath = (pathname.startsWith('/food') ? pathname.substring(5) || '/' : pathname).replace(/(.)\/+$/, '$1');
  const isMainPage = ['/', '', '/user', '/user/dining', '/user/takeaway', '/user/under-250'].includes(normalizedPath);
  const isPolicyPage = normalizedPath.includes('terms') || normalizedPath.includes('privacy') || normalizedPath.includes('support');
  const shouldBlockOutOfZone =
    hasValidCoordinates && !isPolicyPage && !['profile', 'wallet', 'help', 'address', 'orders'].some((part) => normalizedPath.includes(part));
  const isSearch = pathname.includes('/search');

  // The "Fetching Location..." blocker never outlives a slow lookup.
  useEffect(() => {
    if (!showGlobalLoader) return undefined;
    const timer = setTimeout(() => {
      setShowGlobalLoader(false);
      sessionStore.removeItem('manual_location_update');
    }, 8000);
    return () => clearTimeout(timer);
  }, [showGlobalLoader, setShowGlobalLoader]);

  const [isInitialChecking, setIsInitialChecking] = useState(() => {
    if (!isModuleAuthenticated('user') || isPolicyPage) return false;
    return !(localStore.getItem('userLocation') && localStore.getItem('userZoneId'));
  });

  useEffect(() => {
    if (isPolicyPage || !isModuleAuthenticated('user')) {
      setShowGlobalLoader(false);
      setIsInitialChecking(false);
      return undefined;
    }
    if (isZoneLoading || isGeoLoading || isProfileLoading) {
      // Only a location the customer picked by hand shows the blocker.
      if (sessionStore.getItem('manual_location_update') === 'true') setShowGlobalLoader(true);
      return undefined;
    }
    const timer = setTimeout(() => {
      setShowGlobalLoader(false);
      setIsInitialChecking(false);
      sessionStore.removeItem('manual_location_update');
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isZoneLoading, isGeoLoading, isProfileLoading, isPolicyPage, activeLocation?.latitude, activeLocation?.longitude, zoneStatus]);

  useEffect(() => {
    registerFoodPageCacheLifecycle();
  }, []);

  const lastOutOfZoneRef = useRef(isOutOfZone);
  useEffect(() => {
    if (isOutOfZone && !lastOutOfZoneRef.current && !showGlobalLoader && isMainPage) {
      const timer = setTimeout(() => toast('Restaurants are unavailable here right now.\nPlease choose a different location'), 300);
      lastOutOfZoneRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!isOutOfZone) lastOutOfZoneRef.current = false;
    return undefined;
  }, [isOutOfZone, showGlobalLoader, isMainPage]);

  const showSkeleton = isInitialChecking && !isSearch;
  const showOutOfZone = !showSkeleton && zoneStatus === 'OUT_OF_SERVICE' && !isZoneLoading && !isGeoLoading && shouldBlockOutOfZone;
  // Covering the navigator (rather than unmounting it) keeps the stack alive.
  const covered = showSkeleton || showOutOfZone;
  const mainTabsHidden = covered && isExactMainTabPath(pathname);

  return (
    <View style={{ flex: 1, backgroundColor: F.cream }}>
      <Header title="DIMA FOOD & DINING" subtitle="Authentic tribal delicacies & local eateries" rightAction="none" onBack={() => router.navigate('/app')} />
      <PatternDivider variant="green-gold" />
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }} pointerEvents={covered ? 'none' : 'auto'} importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: F.cream }, animation: 'slide_from_right' }}>
            <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          </Stack>
        </View>
        {showSkeleton ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff' }]}>
            <AppShellSkeleton />
          </View>
        ) : null}
        {showOutOfZone ? (
          <View style={StyleSheet.absoluteFill}>
            <OutOfZoneScreen location={activeLocation} handleLocationClick={openLocationSelector} />
          </View>
        ) : null}
        {showGlobalLoader && !isInitialChecking && !isSearch && !mainTabsHidden ? <LocationLoaderOverlay /> : null}
      </View>

      <LoginRequiredModal
        isOpen={isLoginModalOpen}
        intent={loginModalIntent}
        onClose={() => {
          setIsLoginModalOpen(false);
          setLoginModalIntent('general');
        }}
      />
    </View>
  );
}

/** Port of components/user/UserLayout.jsx: providers + the shell of every food page. */
export default function FoodShell() {
  useUserNotifications();
  return (
    <ProfileProvider>
      <CartProvider>
        <OrdersProvider>
          <LocationSelectorProvider>
            <FoodShellContent />
          </LocationSelectorProvider>
        </OrdersProvider>
      </CartProvider>
    </ProfileProvider>
  );
}

const styles = StyleSheet.create({
  login: { width: '100%', maxWidth: 380, backgroundColor: '#FCF9F2', borderRadius: 16, borderWidth: 1, borderColor: '#EBE1CD', padding: 24, alignItems: 'center', overflow: 'hidden', ...shadow('0 20px 50px rgba(0,0,0,0.3)') },
  loginRule: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: F.green, opacity: 0.3 },
  loginClose: { position: 'absolute', top: 16, right: 16, padding: 6, borderRadius: 999 },
  loginIcon: { marginTop: 24, marginBottom: 20, width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(235,225,205,0.3)', borderWidth: 1, borderColor: '#EBE1CD', alignItems: 'center', justifyContent: 'center' },
  loginTitle: { fontSize: 20, lineHeight: 28, letterSpacing: 1, color: F.green, marginBottom: 12, fontFamily: 'serif', fontWeight: '900' },
  loginBody: { fontSize: 14, lineHeight: 22.75, color: '#615446', textAlign: 'center', maxWidth: 300, marginBottom: 24, ...poppins(500) },
  loginBtn: { alignSelf: 'stretch', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 999, backgroundColor: F.green, alignItems: 'center', marginBottom: 8, ...shadow('md') },
  loginBtnText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: '#fff', ...poppins(700) },
  loginSkip: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: '#8A7A68', textAlign: 'center', ...poppins(700) },
  skeleton: { flex: 1, padding: 16, gap: 16, backgroundColor: tw.gray50 },
});
