import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { useDeliveryStore } from '../store/useDeliveryStore';
import { getCurrentPosition, watchPosition } from './useGeolocation';

// Ported from Frontend/src/modules/DeliveryV2/hooks/useRiderLocationSync.js.

const LAPTOP_TEST_FALLBACK = { lat: 22.7196, lng: 75.8577, heading: 0 };
const geoOptions = { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 };

/** Orders tab only — Feed uses the home map tracking; Pocket/Profile do not need GPS. */
export function isOrdersRoute(pathname = '') {
  return /\/orders\/?$/.test(pathname) || pathname.endsWith('/orders');
}

export function useRiderLocationSync() {
  const pathname = usePathname();
  const isOnline = useDeliveryStore((state) => state.isOnline);
  const setRiderLocation = useDeliveryStore((state) => state.setRiderLocation);
  const shouldSync = isOnline && isOrdersRoute(pathname);

  useEffect(() => {
    if (!shouldSync) return undefined;
    const applyPosition = (pos) => {
      const { latitude: lat, longitude: lng, heading } = pos.coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setRiderLocation({ lat, lng, heading: heading || 0 });
    };
    const applyFallback = () => {
      // Indore fallback is DEV-only — fake GPS caused 700–800 km distance on live trips.
      if (!__DEV__) return;
      if (!useDeliveryStore.getState().riderLocation) setRiderLocation(LAPTOP_TEST_FALLBACK);
    };
    getCurrentPosition(applyPosition, applyFallback, geoOptions);
    return watchPosition(applyPosition, applyFallback, geoOptions);
  }, [shouldSync, setRiderLocation]);
}
