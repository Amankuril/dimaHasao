import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, LogOut, Sparkles, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import ImageSourcePicker from '../components/ImageSourcePicker';
import OnboardingExitModal from '../components/OnboardingExitModal';
import { HotelBusinessFields, HotelDocumentsFields } from '../../hotel/onboarding/hotelOnboardingFields';
import { useOnboarding } from '../hooks/pages/useOnboarding';
import { RT, RT_GRADIENT } from '../theme';
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
function GradientButton({ title, onPress, disabled, style }) {
  return (
    <Press scale={0.98} onPress={onPress} disabled={disabled} accessibilityState={{ disabled: Boolean(disabled) }} style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
        <Text style={styles.buttonText}>{title}</Text>
      </LinearGradient>
    </Press>
  );
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const o = useOnboarding();
  const {
    step, loading, saving, error, isLoggingOut, isEditing, setIsEditing, totalSteps, scrollRef,
    handleLogout, handleNext, handleBack, requestExit, showExitModal, handleStay, handleExit,
    sourcePicker, closeImageSourcePicker, hotelStep1, setHotelStep1, hotelStep2, setHotelStep2,
  } = o;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={RT.primary} />
      </View>
    );
  }

  const finishDisabled = saving || (step === totalSteps && !isEditing);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: tw.gray100 }} behavior="padding">
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Press onPress={step === 1 ? requestExit : handleBack} accessibilityLabel={step === 1 ? 'Close onboarding' : 'Go back'} style={styles.round}>
            {step === 1 ? <X size={18} color={tw.gray700} strokeWidth={2.5} /> : <ArrowLeft size={18} color={tw.gray700} strokeWidth={2.5} />}
          </Press>
          <Text style={styles.title} accessibilityRole="header">{step <= 3 ? 'Restaurant onboarding' : 'Hotel onboarding'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {!isEditing ? (
            <Press onPress={() => setIsEditing(true)} accessibilityLabel="Edit Details" style={styles.edit}>
              <Sparkles size={12} color={tw.blue700} />
              <Text style={styles.editText}>Edit Details</Text>
            </Press>
          ) : null}
          <Text style={styles.stepText}>Step {step} of {totalSteps}</Text>
          <Press onPress={handleLogout} disabled={isLoggingOut} accessibilityLabel="Logout" style={[styles.logout, isLoggingOut ? { opacity: 0.5 } : null]}>
            <LogOut size={16} color={RT.primary} />
          </Press>
        </View>
      </View>

      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View pointerEvents={isEditing ? 'auto' : 'none'}>
          {step === 1 ? <Step1 o={o} /> : step === 2 ? <Step2 o={o} /> : step === 3 ? <Step3 o={o} /> : step === 4 ? (
            <View style={{ gap: 24 }}>
              <Section title="Your stay — business details" style={{ gap: 0 }}>
                <Text style={styles.lead}>You picked &quot;Both&quot; — these last two steps set up your hotel or stay alongside the restaurant above.</Text>
                <HotelBusinessFields values={hotelStep1} onChange={setHotelStep1} />
              </Section>
            </View>
          ) : (
            <View style={{ gap: 24 }}>
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
      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        {step > 1 ? <GradientButton title="Back" onPress={handleBack} disabled={saving} style={{ flex: 1 }} /> : null}
        <GradientButton title={saving ? 'Saving...' : step === totalSteps ? 'Finish' : 'Continue'} onPress={handleNext} disabled={finishDisabled} style={{ flex: 1 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: RT.onboardingSoft, borderWidth: 1, borderColor: 'rgba(229,231,235,0.8)', ...shadow('sm') },
  title: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: '#000', ...poppins(600) },
  stepText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.gray500, textTransform: 'uppercase', textAlign: 'right', ...poppins(700) },
  logout: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 32, borderRadius: 6, borderWidth: 1, borderColor: tw.blue300, backgroundColor: tw.blue50 },
  editText: { fontSize: 12, lineHeight: 16, color: tw.blue700, ...poppins(500) },
  lead: { marginTop: 4, marginBottom: 16, fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  error: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 12, lineHeight: 16, color: RT.primary, ...poppins(400) },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.slate100 },
  button: { height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, ...shadow('md') },
  buttonText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
});
