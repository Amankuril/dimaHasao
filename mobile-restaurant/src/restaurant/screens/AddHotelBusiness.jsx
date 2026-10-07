import { useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Building2 } from 'lucide-react-native';
import { createHotelProfile, fetchPartnerProfiles, submitHotelKyc } from '../../api/partner';
import { Button, Card, EmptyState } from '../../components/ds';
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
import { color, radii, space, type } from '../../theme';
import { setHotelSession } from '../utils/auth';
import { WORKSPACE, hasHotelProfile, setActiveWorkspace, setPartnerProfiles } from '../utils/partnerSession';
import { PinnedBar, ScreenHeader } from './inventory/partnerKit';

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
        <ScreenHeader title="Stay business" />
        <View style={[styles.narrow, { paddingTop: space.xxl }]}>
          <EmptyState icon={Building2} title="You already have a stay business." actionLabel="Go to it" onAction={() => navigate('/hotel/partner/dashboard')} />
        </View>
      </View>
    );
  }

  const skipping = step === 1 && continuingSignup;
  return (
    <KeyboardAvoidingView style={styles.page} behavior="padding">
      <ScreenHeader title="Stay business" subtitle={`Step ${step} of 2`} onBack={goBack} />
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: space.lg }}>
        <View style={[styles.narrow, { gap: space.lg }]}>
          <View style={styles.head}>
            <View style={styles.headIcon}>
              <Building2 size={22} color={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
                {step === 1 ? (continuingSignup ? 'Now your stay' : 'List a hotel or stay') : 'Verify your identity'}
              </Text>
              <Text style={[type.small, { color: color.textMuted }]}>
                {step === 1
                  ? continuingSignup
                    ? 'Your restaurant is in for review. Next, set up your stay.'
                    : 'Runs alongside your restaurant on the same sign-in.'
                  : 'Required before you can list a property.'}
              </Text>
            </View>
          </View>
          <View style={styles.progress}>
            <View style={[styles.progressStep, styles.progressOn]} />
            <View style={[styles.progressStep, step === 2 && styles.progressOn]} />
          </View>

          <Card>
            {step === 1 ? <HotelBusinessFields values={business} onChange={setBusiness} /> : <HotelDocumentsFields values={documents} onChange={setDocuments} />}
          </Card>
        </View>
      </ScrollView>

      <PinnedBar style={{ gap: space.sm }}>
        <Button
          title={loading ? 'Submitting' : step === 1 ? 'Continue' : 'Submit for review'}
          size="lg"
          loading={loading}
          disabled={loading}
          onPress={step === 1 ? goNext : submit}
          accessibilityLabel={loading ? 'Submitting' : step === 1 ? 'Continue' : 'Submit for review'}
        />
        {skipping ? <Button title="Skip for now" variant="ghost" onPress={goBack} accessibilityLabel="Skip for now" /> : null}
      </PinnedBar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  narrow: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: space.sm },
  progressStep: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.border },
  progressOn: { backgroundColor: color.primary },
});
