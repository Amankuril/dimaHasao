import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../../components/dh/AppBottomNav';

export const BOOKING_DRAFT_KEY = 'food_dining_booking_draft_v1';

/** Restaurant address as the web's booking pages format it. */
export const formatBookingAddress = (location) =>
  typeof location === 'string'
    ? location
    : location?.addressLine1 ||
      location?.formattedAddress ||
      location?.address ||
      `${location?.city || ''}${location?.area ? `, ${location.area}` : ''}`;

/** Bottom space a fixed footer / last row leaves for the floating app nav. */
export function useNavClearance() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  return (isImmersiveRoute(pathname) ? 0 : NAV_CLEARANCE) + insets.bottom;
}

/** en-GB "05 Oct" style date the web prints with toLocaleDateString('en-GB', ...). */
export const formatShortDate = (value, withYear = false) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const opts = { day: '2-digit', month: 'short' };
  if (withYear) opts.year = 'numeric';
  return d.toLocaleDateString('en-GB', opts);
};

/** Width of one cell of a CSS `grid-cols-N gap-G` inside a container `width` wide. */
export const gridCell = (width, cols, gap) => Math.floor((width - gap * (cols - 1)) / cols);
