import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Building2 } from 'lucide-react-native';
import { completePartnerSignup } from '../../api/auth';
import { submitHotelKyc } from '../../api/partner';
import { Button, Card } from '../../components/ds';
import HeritageHeader from '../../components/HeritageHeader';
import { toast } from '../../lib/notify';
import { sessionStore } from '../../lib/storage';
import { useNavigate } from '../../lib/webRouter';
import { setHotelSession } from '../../restaurant/utils/auth';
import { WORKSPACE, clearOnboardingIntent, setActiveWorkspace, setPartnerProfiles, storePartnerSession } from '../../restaurant/utils/partnerSession';
import { color, radii, space, type } from '../../theme';
import { PinnedBar } from '../components/dashboard/partnerUi';
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
      <StatusBar style="light" />
      <HeritageHeader title="Hotel onboarding" subtitle={`Step ${step} of 2`} onBack={step === 1 ? () => navigate(-1) : goBack} />

      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingVertical: space.lg }}>
        <View style={[styles.narrow, { gap: space.lg }]}>
          <View style={styles.head}>
            <View style={styles.headIcon}>
              <Building2 size={22} color={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
                {step === 1 ? 'Tell us about your stay' : 'Verify your identity'}
              </Text>
              <Text style={[type.small, { color: color.textMuted }]}>{step === 1 ? 'So guests know who they are booking with.' : 'Required before you can list a property.'}</Text>
            </View>
          </View>
          <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of 2`} accessibilityValue={{ min: 1, max: 2, now: step }}>
            <View style={[styles.progressStep, styles.progressOn]} />
            <View style={[styles.progressStep, step === 2 && styles.progressOn]} />
          </View>

          <Card>{step === 1 ? <HotelBusinessFields values={business} onChange={setBusiness} /> : <HotelDocumentsFields values={documents} onChange={setDocuments} />}</Card>
        </View>
      </ScrollView>

      <PinnedBar>
        <View style={styles.narrowBar}>
          <Button
            title={loading ? 'Submitting' : step === 1 ? 'Continue' : 'Submit for review'}
            size="lg"
            loading={loading}
            disabled={loading}
            onPress={step === 1 ? goNext : submit}
            accessibilityLabel={loading ? 'Submitting' : step === 1 ? 'Continue' : 'Submit for review'}
          />
        </View>
      </PinnedBar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  narrow: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: space.lg },
  narrowBar: { width: '100%', maxWidth: 448, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: space.sm },
  progressStep: { flex: 1, height: 6, borderRadius: radii.pill, backgroundColor: color.border },
  progressOn: { backgroundColor: color.primary },
});
