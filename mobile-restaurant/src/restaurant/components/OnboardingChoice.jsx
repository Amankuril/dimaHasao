import { StyleSheet, Text, View } from 'react-native';
import { Building2, ChevronRight, Layers, Store } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { sessionStore } from '../../lib/storage';
import { useNavigate } from '../../lib/webRouter';
import { radii, space, type } from '../../theme';
import { AUTH } from './AuthShell';
import { WORKSPACE, setActiveWorkspace, setOnboardingIntent } from '../utils/partnerSession';

/*
 * Port of Frontend/src/shared/partner/OnboardingChoice.jsx.
 *
 * What is this new partner opening? Shown when a verified number owns neither
 * business. Restaurant is a three-step wizard ending in POST
 * /food/restaurant/register; hotel is its own two-step wizard (owner details,
 * then Aadhaar/PAN) ending in an account plus KYC. "Both" runs all five steps
 * back to back inside the restaurant wizard, then submits both at once.
 */

const HOTEL_SIGNUP_TOKEN_KEY = 'hotel_onboarding_signup_token';
const HOTEL_SIGNUP_PHONE_KEY = 'hotel_onboarding_phone';

const CHOICES = [
  { id: 'restaurant', label: 'Restaurant', hint: 'Serve food for delivery, takeaway or dining', Icon: Store },
  { id: 'hotel', label: 'Hotel or stay', hint: 'List a hotel, resort, homestay or lodge', Icon: Building2 },
  { id: 'both', label: 'Both', hint: 'Restaurant first, then your stay', Icon: Layers },
];

export default function OnboardingChoice({ phone, signupToken }) {
  const navigate = useNavigate();

  /** Restaurant and "both" both start in the restaurant wizard. */
  const startRestaurant = (intent) => {
    setOnboardingIntent(intent);
    setActiveWorkspace(WORKSPACE.RESTAURANT);
    navigate('/food/restaurant/onboarding', { replace: true });
  };

  /**
   * Hotel on its own: there is no session yet, so its wizard carries the
   * signup ticket through the session store and spends it on the ticket's own
   * final step. ("Both" does not come through here.)
   */
  const startHotel = () => {
    sessionStore.setItem(HOTEL_SIGNUP_TOKEN_KEY, signupToken || '');
    sessionStore.setItem(HOTEL_SIGNUP_PHONE_KEY, phone || '');
    setOnboardingIntent('');
    setActiveWorkspace(WORKSPACE.HOTEL);
    navigate('/hotel/partner/onboarding', { replace: true });
  };

  const handlePick = (id) => {
    if (id === 'restaurant') return startRestaurant('restaurant');
    if (id === 'both') return startRestaurant('both');
    return startHotel();
  };

  return (
    <View style={{ gap: space.xl }}>
      <View>
        <Text style={styles.title} accessibilityRole="header">What are you listing?</Text>
        <Text style={styles.lead}>
          Signing in as <Text style={styles.phone}>{phone}</Text>. You can add the other one later from settings.
        </Text>
      </View>
      <View style={{ gap: space.md }}>
        {CHOICES.map(({ id, label, hint, Icon }) => (
          <Press key={id} onPress={() => handlePick(id)} accessibilityLabel={label} style={styles.choice}>
            <View style={styles.icon}>
              <Icon size={20} color={AUTH.gold} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.hint}>{hint}</Text>
            </View>
            <ChevronRight size={20} color={AUTH.gold} />
          </Press>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.heading, fontSize: 20, lineHeight: 28, color: AUTH.cream, textAlign: 'center' },
  lead: { marginTop: space.sm, ...type.small, color: AUTH.muted, textAlign: 'center' },
  phone: { color: AUTH.cream, fontFamily: 'Poppins_700Bold' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 72, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(202,168,62,0.3)', backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: space.lg, paddingVertical: space.md },
  icon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: 'rgba(202,168,62,0.15)', alignItems: 'center', justifyContent: 'center' },
  label: { ...type.subheading, color: AUTH.cream },
  hint: { ...type.small, color: AUTH.muted },
});
