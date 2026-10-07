import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { color, space } from '../../theme';
import StepWrapper from '../components/StepWrapper';
import { StepCard, StepIntro, StepRail, WizardFooter, WizardHeader } from '../components/wizardUi';
import { WIZARD_STEPS } from './wizards/resort/constants';
import {
  StepAmenities, StepBasic, StepDocuments, StepDone, StepImages, StepLocation, StepNearby, StepReview, StepRooms, StepRules,
} from './wizards/resort/steps';
import { useIsSm } from './wizards/resort/parts';
import { useResortWizard } from './wizards/resort/useResortWizard';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/AddResortWizard.jsx
 * (/hotel/partner/join-resort): the nine-step resort registration wizard.
 * State, validation and submit are in ./wizards/resort/useResortWizard, the step
 * bodies in ./wizards/resort/steps.
 */

const STEP_COMPONENTS = {
  1: StepBasic, 2: StepLocation, 3: StepAmenities, 4: StepNearby, 5: StepImages, 6: StepRooms, 7: StepRules, 8: StepDocuments, 9: StepReview, 10: StepDone,
};

const AddResortWizard = () => {
  const w = useResortWizard();
  const isSm = useIsSm();
  const { step, loading } = w;
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const isComplete = step > 9;
  const stepMeta = WIZARD_STEPS[step - 1];
  const Body = STEP_COMPONENTS[step];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <WizardHeader title={isComplete ? 'Complete' : stepMeta?.title || ''} subtitle={isComplete ? 'Registration submitted' : `Step ${step} of 9`} onBack={w.handleBack} onClose={w.handleExit} />

      {!isComplete && <StepRail steps={WIZARD_STEPS} step={step} showLabels={isSm} />}

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {!isComplete && <StepIntro>{stepMeta?.subtitle}</StepIntro>}

        <StepWrapper stepKey={step}>
          <StepCard>{Body ? <Body w={w} /> : null}</StepCard>
        </StepWrapper>
      </ScrollView>

      {!isComplete && (
        <WizardFooter
          onBack={w.handleBack}
          backDisabled={step === 1 || loading}
          onClear={step < 9 && isSm ? w.clearCurrentStep : undefined}
          clearDisabled={loading}
          next={{
            label: step === 9 ? (loading ? 'Submitting...' : 'Submit property') : 'Continue',
            onPress: w.handleNext,
            disabled: loading || (step === 6 && w.roomTypes.length === 0),
            loading,
            icon: !loading && step < 9 ? ArrowRight : undefined,
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { flexGrow: 1, gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xxl, width: '100%', maxWidth: 768, alignSelf: 'center' },
});

export default AddResortWizard;
