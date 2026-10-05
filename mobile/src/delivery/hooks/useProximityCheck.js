import { useMemo } from 'react';
import { useDeliveryStore } from '../store/useDeliveryStore';
import { calculateDistance } from './proximity.utils';
import { parseLatLng } from '../utils/geo';

// Ported from Frontend/src/modules/DeliveryV2/hooks/useProximityCheck.js.

/** City delivery should never show 100+ km — usually GPS fallback / bad coords. */
const MAX_TRUSTED_TRIP_DISTANCE_M = 100_000;

export const useProximityCheck = () => {
  const riderLocation = useDeliveryStore((state) => state.riderLocation);
  const activeOrder = useDeliveryStore((state) => state.getFocusedOrder());
  const tripStatus = useDeliveryStore((state) => state.getFocusedTripStatus());
  const settings = useDeliveryStore((state) => state.settings);

  const targetType = useMemo(() => {
    if (['PICKING_UP', 'REACHED_PICKUP'].includes(tripStatus)) return 'restaurant';
    if (['PICKED_UP', 'REACHED_DROP'].includes(tripStatus)) return 'customer';
    return null;
  }, [tripStatus]);

  const targetLocation = useMemo(() => {
    if (!activeOrder || !targetType) return null;
    if (targetType === 'restaurant') {
      return parseLatLng(activeOrder.restaurantLocation || activeOrder.restaurant_location);
    }
    return parseLatLng(activeOrder.customerLocation || activeOrder.customer_location);
  }, [activeOrder, targetType]);

  const riderPoint = useMemo(() => parseLatLng(riderLocation), [riderLocation]);

  const actionLimit = useMemo(() => {
    if (tripStatus === 'PICKING_UP') return settings.pickupRangeLimit || 500;
    if (tripStatus === 'PICKED_UP') return settings.deliveryRangeLimit || 500;
    return 500;
  }, [tripStatus, settings]);

  const distanceToTarget = useMemo(() => {
    if (!riderPoint || !targetLocation) return Infinity;
    const meters = calculateDistance(riderPoint.lat, riderPoint.lng, targetLocation.lat, targetLocation.lng);
    if (!Number.isFinite(meters) || meters > MAX_TRUSTED_TRIP_DISTANCE_M) return Infinity;
    return meters;
  }, [riderPoint, targetLocation]);

  // Web: VITE_APP_MODE === 'developer' || VITE_ENABLE_RANGE_BYPASS === 'true' || import.meta.env.DEV
  const isDevMode =
    process.env.EXPO_PUBLIC_APP_MODE === 'developer' || process.env.EXPO_PUBLIC_ENABLE_RANGE_BYPASS === 'true' || __DEV__;

  const isWithinRange = isDevMode ? true : distanceToTarget <= actionLimit;

  return { distanceToTarget, isWithinRange, actionLimit, targetType };
};

/** Display km for trip HUD — never show Infinity / bogus values. */
export function formatTripDistanceKm(distanceToTarget) {
  if (distanceToTarget == null || distanceToTarget === Infinity || !Number.isFinite(distanceToTarget)) return '--';
  return (distanceToTarget / 1000).toFixed(1);
}
