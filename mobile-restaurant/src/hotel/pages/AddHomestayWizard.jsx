import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Camera, Image as ImageIcon } from 'lucide-react-native';
import { ListRow } from '../../components/ds';
import { BottomSheet } from '../../components/kit';
import { color, elevation, radii, space, type } from '../../theme';
import { StepCard, StepIntro, StepRail, WizardFooter, WizardHeader } from '../components/wizardUi';
import { WIZARD_STEPS } from './wizards/homestay/constants';
import {
  StepAmenities,
  StepBasic,
  StepComplete,
  StepDocuments,
  StepImages,
  StepInventory,
  StepLocation,
  StepNearby,
  StepReview,
  StepRules,
} from './wizards/homestay/steps';
import { useHomestayWizard } from './wizards/homestay/useHomestayWizard';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/AddHomestayWizard.jsx
 * (/hotel/partner/join-homestay): the nine-step homestay registration wizard
 * plus its "submitted" screen. State and handlers are in
 * ./wizards/homestay/useHomestayWizard, the step bodies in ./wizards/homestay/steps.
 */

const BODIES = [StepBasic, StepLocation, StepAmenities, StepNearby, StepImages, StepInventory, StepRules, StepDocuments, StepReview, StepComplete];

export default function AddHomestayWizard() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = useHomestayWizard();
  const { step, loading, isComplete, isEditingSubItem } = w;
  const Body = BODIES[Math.min(step, BODIES.length) - 1] || StepComplete;
  const title = WIZARD_STEPS[step - 1]?.title || '';
  const subtitle = WIZARD_STEPS[step - 1]?.subtitle || '';
  // The web hides "Clear step" below the sm breakpoint (640px) and shows the rail labels from it.
  const wide = width >= 640;
  const nextDisabled = loading || isEditingSubItem || (step === 6 && w.roomTypes.length === 0);

  return (
    <KeyboardAvoidingView style={styles.page} behavior="padding">
      <WizardHeader title={isComplete ? 'Complete' : title} subtitle={isComplete ? 'Registration submitted' : `Step ${step} of 9`} onBack={w.handleBack} onClose={w.handleExit} />

      {/* Segmented rail: each step is its own bar. */}
      {!isComplete && <StepRail steps={WIZARD_STEPS} step={step} showLabels={wide} />}

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.scroll}>
        <View style={styles.main}>
          {!isComplete && <StepIntro>{subtitle}</StepIntro>}

          <StepCard>
            <Body w={w} wide={wide} />
          </StepCard>
        </View>
      </ScrollView>

      {/* The web keeps the footer on the submitted screen too: Back (to step 9) works there, while its
          "Submit homestay" button is a no-op (handleNext has no case 10), so only Back is drawn. */}
      <WizardFooter
        onBack={w.handleBack}
        backDisabled={step === 1 || loading || isEditingSubItem}
        onClear={step < 9 && wide ? w.clearCurrentStep : undefined}
        clearDisabled={loading}
        next={
          isComplete
            ? null
            : {
                label: loading ? 'Processing...' : step === 9 ? 'Submit homestay' : 'Continue',
                onPress: step === 9 ? w.submitAll : w.handleNext,
                disabled: nextDisabled,
                loading,
                icon: !loading && step < 9 ? ArrowRight : undefined,
              }
        }
      />

      <BottomSheet visible={Boolean(w.pickerRequest)} onClose={w.closePicker} panelStyle={styles.sheet}>
        <View style={{ paddingBottom: space.lg + insets.bottom, gap: space.sm }}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle} accessibilityRole="header">
            Add photo
          </Text>
          <ListRow icon={Camera} title="Use camera" onPress={() => w.pickFrom('camera')} style={styles.sheetRow} />
          <ListRow icon={ImageIcon} title="Upload from device" onPress={() => w.pickFrom('gallery')} style={styles.sheetRow} />
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  scroll: { flexGrow: 1, paddingTop: space.lg, paddingBottom: space.xxl },
  main: { width: '100%', maxWidth: 768, alignSelf: 'center', paddingHorizontal: space.lg, gap: space.lg },
  sheet: { backgroundColor: color.bg, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.xl, paddingTop: space.md, ...elevation.sheet },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center', marginBottom: space.sm },
  sheetTitle: { ...type.heading, color: color.text, marginBottom: space.xs },
  sheetRow: { backgroundColor: color.surface, borderRadius: radii.md, borderWidth: 1, borderColor: color.border },
});
