import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Building2 } from 'lucide-react-native';
import { completePartnerSignup } from '../../api/auth';
import { submitHotelKyc } from '../../api/partner';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { sessionStore } from '../../lib/storage';
import { useNavigate } from '../../lib/webRouter';
import { setHotelSession } from '../../restaurant/utils/auth';
import { WORKSPACE, clearOnboardingIntent, setActiveWorkspace, setPartnerProfiles, storePartnerSession } from '../../restaurant/utils/partnerSession';
import { poppins, shadow, tw } from '../../theme';
import {
  HOTEL_BUSINESS_DEFAULTS,
  HOTEL_DOCUMENTS_DEFAULTS,
  HotelBusinessFields,
  HotelDocumentsFields,
  buildHotelKycFormData,
  validateHotelBusinessFields,
  validateHotelDocumentFields,
} from '../onboarding/hotelOnboardingFields';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/HotelOnboarding.jsx
 * (/hotel/partner/onboarding).
 *
 * Hotel-only onboarding: two steps (business/owner details, then Aadhaar/PAN).
 * Reached from OnboardingChoice with a signup ticket stashed in the session
 * store. The ticket is spent on the last step, then the KYC goes in with the
 * hotel session that signup hands back.
 */

const SIGNUP_TOKEN_KEY = 'hotel_onboarding_signup_token';
const PHONE_KEY = 'hotel_onboarding_phone';

export default function HotelOnboarding() {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const [step, setStep] = useState(1);
  const [business, setBusiness] = useState(HOTEL_BUSINESS_DEFAULTS);
  const [documents, setDocuments] = useState(HOTEL_DOCUMENTS_DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [signupToken] = useState(() => sessionStore.getItem(SIGNUP_TOKEN_KEY) || '');

  useEffect(() => {
    if (!signupToken) {
      toast.error('Your sign-in has expired. Please verify your number again.');
      navigate('/food/restaurant/login', { replace: true });
    }
  }, [signupToken, navigate]);

  const scrollToTop = () => scrollRef.current?.scrollTo?.({ y: 0, animated: false });

  const goNext = () => {
    const errors = validateHotelBusinessFields(business);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    setStep(2);
    scrollToTop();
  };

  const goBack = () => {
    setStep(1);
    scrollToTop();
  };

  const submit = async () => {
    const errors = validateHotelDocumentFields(documents);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }

    setLoading(true);
    try {
      const response = await completePartnerSignup(signupToken, {
        name: business.businessName.trim(),
        email: business.email.trim(),
      });
      const data = response?.data?.data || response?.data || {};
      // Web: storePartnerSession(data), which stores the hotel half this signup returns.
      if (data?.hotel?.token) {
        await setHotelSession(data.hotel.token, data.hotel.user);
        setPartnerProfiles([WORKSPACE.HOTEL]);
      } else {
        await storePartnerSession(data);
      }

      await submitHotelKyc(buildHotelKycFormData(business, documents));

      sessionStore.removeItem(SIGNUP_TOKEN_KEY);
      sessionStore.removeItem(PHONE_KEY);

      setActiveWorkspace(WORKSPACE.HOTEL);
      clearOnboardingIntent();
      toast.success('Submitted for review.');
      navigate('/hotel/partner/under-review', { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Could not submit your details. Please try again.';
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior="padding">
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Press onPress={step === 1 ? () => navigate(-1) : goBack} accessibilityLabel={step === 1 ? 'Back' : 'Previous step'} style={styles.round}>
            <ArrowLeft size={18} color={tw.gray700} strokeWidth={2.5} />
          </Press>
          <Text style={styles.headerTitle} accessibilityRole="header">Hotel onboarding</Text>
        </View>
        <Text style={styles.stepText}>Step {step} of 2</Text>
      </View>

      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 24, paddingBottom: 24 + insets.bottom }}>
        <View style={styles.narrow}>
          <View style={styles.head}>
            <View style={styles.headIcon}>
              <Building2 size={22} color={tw.slate700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{step === 1 ? 'Tell us about your stay' : 'Verify your identity'}</Text>
              <Text style={styles.sub}>{step === 1 ? 'So guests know who they are booking with.' : 'Required before you can list a property.'}</Text>
            </View>
          </View>

          {step === 1 ? (
            <HotelBusinessFields values={business} onChange={setBusiness} />
          ) : (
            <HotelDocumentsFields values={documents} onChange={setDocuments} />
          )}

          <Press
            onPress={step === 1 ? goNext : submit}
            disabled={loading}
            accessibilityLabel={loading ? 'Submitting' : step === 1 ? 'Continue' : 'Submit for review'}
            style={[styles.button, { marginTop: 24 }, loading ? { opacity: 0.6 } : null]}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={styles.buttonText}>{loading ? 'Submitting' : step === 1 ? 'Continue' : 'Submit for review'}</Text>
          </Press>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.gray100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.gray50, borderWidth: 1, borderColor: 'rgba(229,231,235,0.8)', ...shadow('sm') },
  headerTitle: { fontSize: 14, lineHeight: 20, color: '#000', ...poppins(600) },
  stepText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.gray500, textTransform: 'uppercase', ...poppins(700) },
  narrow: { width: '100%', maxWidth: 448, alignSelf: 'center', paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  headIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(700) },
  sub: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...poppins(400) },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: tw.slate900, paddingVertical: 14 },
  buttonText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
});
