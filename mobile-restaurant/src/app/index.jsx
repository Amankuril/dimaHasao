import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getPartnerProfiles, resolvePartnerHome } from '../restaurant/utils/partnerSession';

// The wrapper opened https://tourismdimahasao.in/food/restaurant; so does the app, unless the
// partner's open business is the hotel (e.g. an approved hotel whose restaurant is still under review).
export default function Index() {
  const { booting, signedIn } = useAuth();
  if (booting) return null;
  const home = signedIn ? resolvePartnerHome(getPartnerProfiles()) : null;
  return <Redirect href={home || '/food/restaurant'} />;
}
