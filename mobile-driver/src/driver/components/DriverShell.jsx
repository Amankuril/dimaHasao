import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { navigateTo } from '../../lib/webRouter';
import { usePushNotifications } from '../../lib/push';
import { getAuthenticatedDriverRole, getCurrentDriver, getLocalDriverToken, getStoredDriverRole } from '../services/registrationService';
import DriverRideRequestListener from './DriverRideRequestListener';
import { driver as D } from '../../theme';

/*
 * Web: Taxi/modules/driver/components/DriverLayout.jsx (the guard around every /taxi/driver route) plus the
 * `.driver-theme` page background. Rules, unchanged:
 * - onboarding routes are open (login / reg-phone also redirect an already signed-in approved driver home);
 * - everything else needs the driver token, else the login screen;
 * - GET /drivers/me decides approval: not approved -> registration-status, except the documents / support routes;
 * - the ride-request listener runs for approved drivers.
 */
const unwrapDriver = (response) => response?.data?.data || response?.data || response;

const isDriverApproved = (driver) => {
  if (!driver) return false;
  const role = String(driver?.onboarding?.role || getStoredDriverRole() || 'driver').toLowerCase();
  if (role === 'service_center' || role === 'service_center_staff') return driver.status !== 'inactive';
  const approval = String(driver.approve ?? '').toLowerCase();
  const status = String(driver.status || '').toLowerCase();
  return driver.approve === true || driver.approve === 1 || ['true', '1', 'yes', 'approved'].includes(approval) || ['approved', 'active', 'verified'].includes(status);
};

const ONBOARDING_ROUTES = new Set([
  '/taxi/driver/login',
  '/taxi/driver/terms',
  '/taxi/driver/privacy',
  '/taxi/driver/support',
  '/taxi/driver/reg-phone',
  '/taxi/driver/otp-verify',
  '/taxi/driver/step-personal',
  '/taxi/driver/step-vehicle',
  '/taxi/driver/step-documents',
  '/taxi/driver/registration-status',
  '/taxi/driver/status',
]);
const SOFT_ENTRY_ROUTES = new Set(['/taxi/driver/login', '/taxi/driver/reg-phone']);
const PENDING_ALLOWED_ROUTES = new Set([
  '/taxi/driver/documents',
  '/taxi/driver/support',
  '/taxi/driver/help-support',
  '/taxi/driver/support/chat',
  '/taxi/driver/support/tickets',
]);

const HOME = '/taxi/driver/home';
const LOGIN = '/taxi/driver/login';
const PENDING = '/taxi/driver/registration-status';

const isOnboardingRoute = (pathname = '') => ONBOARDING_ROUTES.has(pathname);

export default function DriverShell() {
  const pathname = usePathname();
  const { booting, signedIn } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isAllowed, setIsAllowed] = useState(true);
  const verifiedTokenRef = useRef('');
  const verifiedApprovalRef = useRef(false);

  usePushNotifications(signedIn);

  useEffect(() => {
    if (booting) return undefined;
    const currentPath = pathname.replace(/\/+$/, '') || '/';
    // The bare /taxi/driver entry (DriverEntryRedirect): signed in -> home, else login.
    if (currentPath === '/taxi/driver') {
      navigateTo(getLocalDriverToken() ? HOME : LOGIN, { replace: true });
      return undefined;
    }
    const token = getLocalDriverToken();
    const shouldVerifyOnboardingRoute = Boolean(token) && SOFT_ENTRY_ROUTES.has(currentPath);

    if (isOnboardingRoute(currentPath) && !shouldVerifyOnboardingRoute) {
      setIsAllowed(true);
      setIsChecking(false);
      return undefined;
    }

    if (!token) {
      setIsAllowed(false);
      verifiedTokenRef.current = '';
      verifiedApprovalRef.current = false;
      navigateTo(LOGIN, { replace: true });
      return undefined;
    }

    if (verifiedTokenRef.current === token && verifiedApprovalRef.current && isAllowed) {
      setIsChecking(false);
      return undefined;
    }

    let active = true;
    const verifyDriver = async () => {
      setIsChecking(true);
      try {
        const response = await getCurrentDriver();
        const me = unwrapDriver(response);
        const approved = isDriverApproved(me);
        const effectiveRole = String(me?.role || me?.onboarding?.role || getAuthenticatedDriverRole() || '').toLowerCase();
        if (!active) return;

        if (!approved) {
          if (PENDING_ALLOWED_ROUTES.has(currentPath)) {
            setIsAllowed(true);
            verifiedTokenRef.current = '';
            verifiedApprovalRef.current = false;
            setIsChecking(false);
            return;
          }
          setIsAllowed(false);
          verifiedTokenRef.current = '';
          verifiedApprovalRef.current = false;
          navigateTo(PENDING, { replace: true });
          return;
        }

        setIsAllowed(true);
        verifiedTokenRef.current = token;
        verifiedApprovalRef.current = true;

        if (!isOnboardingRoute(currentPath) && effectiveRole !== 'driver') {
          navigateTo(HOME, { replace: true });
          return;
        }
        if (SOFT_ENTRY_ROUTES.has(currentPath)) navigateTo(HOME, { replace: true });
      } catch (error) {
        if (!active) return;
        setIsAllowed(false);
        verifiedTokenRef.current = '';
        verifiedApprovalRef.current = false;
        const status = error?.status;
        // 401 and 404 send the driver back to login; 403 and anything else (a network error included) to the pending screen.
        navigateTo(status === 401 || status === 404 ? LOGIN : PENDING, { replace: true });
      } finally {
        if (active) setIsChecking(false);
      }
    };
    verifyDriver();
    return () => {
      active = false;
    };
  }, [booting, isAllowed, pathname, signedIn]);

  const checking = isChecking && !isOnboardingRoute(pathname);

  return (
    <View style={{ flex: 1, backgroundColor: D.bg }}>
      {/* The navigator stays mounted while the guard checks; the spinner covers it (the web swaps the Outlet for it). */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: D.bg }, animation: 'fade', animationDuration: 120 }} />
      {checking ? (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      ) : isAllowed && signedIn && getStoredDriverRole() === 'driver' ? (
        <DriverRideRequestListener />
      ) : null}
    </View>
  );
}
