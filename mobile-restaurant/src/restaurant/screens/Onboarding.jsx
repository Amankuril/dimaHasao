import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Pencil } from 'lucide-react-native';
import HeritageHeader from '../../components/HeritageHeader';
import { Button, IconButton } from '../../components/ds';
import { color, space, type } from '../../theme';
import ImageSourcePicker from '../components/ImageSourcePicker';
import OnboardingExitModal from '../components/OnboardingExitModal';
import { HotelBusinessFields, HotelDocumentsFields } from '../../hotel/onboarding/hotelOnboardingFields';
import { useOnboarding } from '../hooks/pages/useOnboarding';
import Step1 from './onboarding/Step1';
import Step2 from './onboarding/Step2';
import Step3 from './onboarding/Step3';
import { Section } from './onboarding/parts';

/*
 * Port of Food/pages/restaurant/Onboarding.jsx (/food/restaurant/onboarding): the three-step
 * registration wizard a new partner number lands on after the code is verified.
 *
 * Steps 4-5 (hotel business, then hotel documents) only exist when the sign-in chose "Both"
 * (totalSteps is 5); they reuse the shared hotel fields. The step bodies are in ./onboarding.
 */
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const o = useOnboarding();
  const {
    step, keyboardInset, loading, saving, error, isLoggingOut, isEditing, setIsEditing, totalSteps, scrollRef,
    handleLogout, handleNext, handleBack, requestExit, showExitModal, handleStay, handleExit,
    sourcePicker, closeImageSourcePicker, hotelStep1, setHotelStep1, hotelStep2, setHotelStep2,
  } = o;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  const finishDisabled = saving || (step === totalSteps && !isEditing);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.bg }} behavior="padding">
      <HeritageHeader
        title={step <= 3 ? 'Restaurant onboarding' : 'Hotel onboarding'}
        subtitle={`Step ${step} of ${totalSteps}`}
        showBack
        onBack={step === 1 ? requestExit : handleBack}
        right={<IconButton icon={LogOut} label="Logout" variant="inverse" onPress={handleLogout} disabled={isLoggingOut} />}
      />
      <View style={styles.progressBar}>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of ${totalSteps}`} accessibilityValue={{ min: 1, max: totalSteps, now: step }}>
          <View style={[styles.fill, { width: `${(step / totalSteps) * 100}%` }]} />
        </View>
        {!isEditing ? <Button title="Edit details" icon={Pencil} variant="secondary" size="sm" fullWidth={false} onPress={() => setIsEditing(true)} accessibilityLabel="Edit Details" style={{ height: 40 }} /> : null}
      </View>

      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        <View pointerEvents={isEditing ? 'auto' : 'none'}>
          {step === 1 ? <Step1 o={o} /> : step === 2 ? <Step2 o={o} /> : step === 3 ? <Step3 o={o} /> : step === 4 ? (
            <View style={{ gap: space.xxl }}>
              <Section title="Your stay — business details" style={{ gap: 0 }}>
                <Text style={styles.lead}>You picked &quot;Both&quot; — these last two steps set up your hotel or stay alongside the restaurant above.</Text>
                <HotelBusinessFields values={hotelStep1} onChange={setHotelStep1} />
              </Section>
            </View>
          ) : (
            <View style={{ gap: space.xxl }}>
              <Section title="Your stay — identity documents" style={{ gap: 0 }}>
                <Text style={styles.lead}>Required before your stay listing can be reviewed.</Text>
                <HotelDocumentsFields values={hotelStep2} onChange={setHotelStep2} />
              </Section>
            </View>
          )}
        </View>
      </ScrollView>

      <ImageSourcePicker isOpen={sourcePicker.isOpen} onClose={closeImageSourcePicker} onFileSelect={sourcePicker.onSelectFile} title={sourcePicker.title} fileNamePrefix={sourcePicker.fileNamePrefix} />
      <OnboardingExitModal open={showExitModal} onStay={handleStay} onExit={handleExit} />

      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {keyboardInset ? null : (
        <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
          {step > 1 ? <Button title="Back" variant="outline" onPress={handleBack} disabled={saving} style={{ flex: 1 }} /> : null}
          <Button title={saving ? 'Saving…' : step === totalSteps ? 'Finish' : 'Continue'} onPress={handleNext} disabled={finishDisabled} loading={saving} style={{ flex: step > 1 ? 1.4 : 1 }} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  progressBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: color.surfaceMuted, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: color.primary },
  lead: { marginTop: space.md, marginBottom: space.lg, ...type.small, color: color.textSecondary },
  error: { paddingHorizontal: space.lg, paddingVertical: space.sm, ...type.small, color: color.danger, backgroundColor: color.dangerSoft },
  footer: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
});
