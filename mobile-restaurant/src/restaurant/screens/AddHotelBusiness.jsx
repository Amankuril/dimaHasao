import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Building2 } from 'lucide-react-native';
import { createHotelProfile, fetchPartnerProfiles, submitHotelKyc } from '../../api/partner';
import { Press } from '../../components/ui';
import {
  HOTEL_BUSINESS_DEFAULTS,
  HOTEL_DOCUMENTS_DEFAULTS,
  HotelBusinessFields,
  HotelDocumentsFields,
  buildHotelKycFormData,
  validateHotelBusinessFields,
  validateHotelDocumentFields,
} from '../../hotel/onboarding/hotelOnboardingFields';
import { toast } from '../../lib/notify';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { poppins, tw } from '../../theme';
import { setHotelSession } from '../utils/auth';
import { WORKSPACE, hasHotelProfile, setActiveWorkspace, setPartnerProfiles } from '../utils/partnerSession';

/*
 * Port of Frontend/src/shared/partner/AddHotelBusiness.jsx (/food/restaurant/add-hotel).
 *
 * Add the stay business to a partner who already runs a restaurant.
 *
 * The other way in, choosing "both" at sign-up, runs these same two steps
 * inline as steps 4-5 of the restaurant wizard (see Onboarding.jsx). Here the
 * partner already has a session, so there is no signup ticket to spend: step 1
 * goes straight to POST /partner/profiles/hotel, then step 2 to the KYC
 * endpoint, both with the live session. The hotel half of the session is kept
 * with setHotelSession (web: setPartnerSession).
 */
export default function AddHotelBusiness() {
  const navigate = useNavigate();
  const location = useLocation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  /*
   * Arriving from the "both" signup, the owner details were just collected by
   * the restaurant wizard: asking for the same name a second time would be a
   * poor welcome. Coming from settings there is no state and these start empty.
   */
  const prefill = location.state || {};
  const continuingSignup = Boolean(prefill.name || prefill.email);

  const [step, setStep] = useState(1);
  const [business, setBusiness] = useState({
    ...HOTEL_BUSINESS_DEFAULTS,
    businessName: prefill.name || '',
    ownerName: prefill.name || '',
    email: prefill.email || '',
  });
  const [documents, setDocuments] = useState(HOTEL_DOCUMENTS_DEFAULTS);
  const [loading, setLoading] = useState(false);
  // Read once: setting the hotel session below must not flip this screen mid-submit.
  const [alreadyHasHotel] = useState(() => hasHotelProfile());

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

  const submit = async () => {
    const errors = validateHotelDocumentFields(documents);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }

    setLoading(true);

    try {
      const session = await createHotelProfile({ name: business.businessName.trim(), email: business.email.trim() });

      if (session?.token) {
        await setHotelSession(session.token, session.user);
      }

      await submitHotelKyc(buildHotelKycFormData(business, documents));

      // Re-read from the server rather than assuming, so the switcher matches
      // what actually exists.
      try {
        const profiles = await fetchPartnerProfiles();
        setPartnerProfiles(profiles?.profiles || []);
      } catch {
        setPartnerProfiles([WORKSPACE.RESTAURANT, WORKSPACE.HOTEL]);
      }

      setActiveWorkspace(WORKSPACE.HOTEL);
      toast.success('Submitted for review');
      navigate('/hotel/partner/under-review', { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Could not add the stay business. Please try again.';
      toast.error(message);
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    if (continuingSignup) navigate('/food/restaurant/pending-verification', { replace: true });
    else navigate(-1);
  };

  if (alreadyHasHotel) {
    return (
      <View style={styles.page}>
        <View style={[styles.narrow, { alignItems: 'center', paddingTop: 40 + insets.top }]}>
          <Text style={styles.already}>You already have a stay business.</Text>
          <Press onPress={() => navigate('/hotel/partner/dashboard')} accessibilityLabel="Go to it" style={[styles.button, { alignSelf: 'center', paddingHorizontal: 20, marginTop: 16 }]}>
            <Text style={styles.buttonText}>Go to it</Text>
          </Press>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior="padding">
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom }}>
        <View style={styles.narrow}>
          <Press onPress={goBack} accessibilityLabel={step === 1 && continuingSignup ? 'Skip for now' : 'Back'} style={styles.back}>
            <ArrowLeft size={14} color={tw.slate500} />
            <Text style={styles.backText}>{step === 1 && continuingSignup ? 'Skip for now' : 'Back'}</Text>
          </Press>

          <View style={styles.head}>
            <View style={styles.headIcon}>
              <Building2 size={22} color={tw.slate700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} accessibilityRole="header">
                {step === 1 ? (continuingSignup ? 'Now your stay' : 'List a hotel or stay') : 'Verify your identity'}
              </Text>
              <Text style={styles.sub}>
                {step === 1
                  ? continuingSignup
                    ? 'Your restaurant is in for review. Next, set up your stay.'
                    : 'Runs alongside your restaurant on the same sign-in.'
                  : 'Required before you can list a property.'}
              </Text>
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
  page: { flex: 1, backgroundColor: '#fff' },
  narrow: { width: '100%', maxWidth: 448, alignSelf: 'center', paddingHorizontal: 20 },
  already: { fontSize: 14, lineHeight: 20, color: tw.slate600, textAlign: 'center', ...poppins(400) },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 20 },
  backText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.slate500, textTransform: 'uppercase', ...poppins(700) },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  headIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(700) },
  sub: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...poppins(400) },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: tw.slate900, paddingVertical: 14 },
  buttonText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
});
