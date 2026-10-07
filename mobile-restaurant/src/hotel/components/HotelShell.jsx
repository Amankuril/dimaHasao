import { Redirect, Stack, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { isHotelAuthenticated } from '../../restaurant/utils/auth';

/*
 * Web: Hotel/routes.jsx (RequirePartner + PartnerThemeLayout). The hotel
 * partner panel at /hotel/partner/*.
 *
 *  - partner/login is only a redirect to the one shared sign-in;
 *  - onboarding and under-review sit outside the guard (a fresh signup has no
 *    session yet, an unapproved one is deliberately kept out of the panel);
 *  - every other page needs a hotel partner session, and a partner who
 *    finished the owner-details/KYC step but is not approved yet is kept on
 *    under-review. Partners created before that step existed have
 *    onboardingComplete unset and are left unblocked.
 */
const HOME = '/hotel/partner';
const PUBLIC = new Set(['onboarding', 'under-review']);

export default function HotelShell() {
  const { signedInHotel, booting, hotelUser } = useAuth();
  const pathname = usePathname();
  if (booting) return null;
  const sub = pathname.replace(/\/+$/, '').slice(HOME.length + 1);

  if (sub === 'login') return <Redirect href="/food/restaurant/login" />;
  if (!PUBLIC.has(sub)) {
    // RequirePartner: isPartnerSignedIn() also refuses an expired token, so no dashboard flashes before the 401.
    if (!signedInHotel || !isHotelAuthenticated()) return <Redirect href="/food/restaurant/login" />;
    if (hotelUser?.onboardingComplete && hotelUser?.partnerApprovalStatus !== 'approved') return <Redirect href={`${HOME}/under-review`} />;
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' }, animation: 'fade', animationDuration: 120 }} />
    </View>
  );
}
