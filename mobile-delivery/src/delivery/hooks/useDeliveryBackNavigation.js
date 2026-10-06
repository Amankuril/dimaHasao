import { useCallback } from 'react';
import { router, useLocalSearchParams, usePathname } from 'expo-router';

/*
 * Ported from Frontend/src/modules/DeliveryV2/hooks/useDeliveryBackNavigation.js.
 * The web navigates to a fixed parent path rather than going back in
 * history. dismissTo() lands on that same path: it pops to it when it is
 * already in the stack and replaces the screen otherwise, so the stack does
 * not grow. `backTo` / `from` arrive as search params (web: location.state).
 */

const toDeliveryPath = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/food/delivery')) return trimmed;
  if (trimmed === '/delivery') return '/food/delivery';
  if (trimmed.startsWith('/delivery/')) return `/food${trimmed}`;
  return null;
};

const getNormalizedDeliveryPath = (pathname) =>
  pathname.startsWith('/food/delivery') ? pathname.slice('/food/delivery'.length) || '/' : pathname || '/';

export const resolveDeliveryBackPath = ({ pathname, state }) => {
  const normalizedPath = getNormalizedDeliveryPath(pathname);
  const explicitBackPath = toDeliveryPath(state?.backTo) || toDeliveryPath(state?.from);

  if (normalizedPath === '/signup/details') return '/food/delivery/signup';
  if (normalizedPath === '/signup/documents') return '/food/delivery/signup/details';
  if (normalizedPath === '/otp') return explicitBackPath || '/food/delivery/login';
  if (normalizedPath === '/terms' || normalizedPath === '/privacy' || normalizedPath === '/help/content') {
    return explicitBackPath || '/food/delivery/login';
  }
  if (
    [
      '/profile/details',
      '/profile/bank',
      '/profile/documents',
      '/profile/reviews',
      '/profile/terms',
      '/profile/privacy',
      '/help/id-card',
      '/help/tickets',
    ].includes(normalizedPath)
  ) {
    return explicitBackPath || '/food/delivery/profile';
  }
  if (normalizedPath === '/help/tickets/create' || /^\/help\/tickets\/[^/]+$/.test(normalizedPath)) {
    return explicitBackPath || '/food/delivery/help/tickets';
  }
  if (
    [
      '/pocket/payout',
      '/pocket/statement',
      '/pocket/deductions',
      '/pocket/limit-settlement',
      '/pocket/balance',
      '/pocket/cash-limit',
      '/pocket/details',
    ].includes(normalizedPath)
  ) {
    return explicitBackPath || '/food/delivery/pocket';
  }
  if (explicitBackPath && explicitBackPath !== pathname) return explicitBackPath;
  return '/food/delivery';
};

export default function useDeliveryBackNavigation() {
  const pathname = usePathname();
  const params = useLocalSearchParams();
  return useCallback(() => {
    router.dismissTo(resolveDeliveryBackPath({ pathname, state: params }));
  }, [pathname, params]);
}
