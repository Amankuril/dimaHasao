import { useEffect, useRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, tw } from '../../theme';
import StepWrapper from '../components/StepWrapper';
import { HT } from '../theme';
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
  const insets = useSafeAreaInsets();
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
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Press onPress={w.handleBack} scale={0.9} style={styles.headerBtn} accessibilityLabel="Go back">
            <ArrowLeft size={20} color={tw.gray500} />
          </Press>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.stepKicker}>{isComplete ? 'COMPLETE' : `STEP ${step} OF 9`}</Text>
            <Text style={styles.stepName} numberOfLines={1}>{isComplete ? 'Registration submitted' : stepMeta?.title || ''}</Text>
          </View>
          <Press onPress={w.handleExit} scale={0.9} style={styles.headerBtn} accessibilityLabel="Close and discard">
            <X size={20} color={tw.gray500} />
          </Press>
        </View>

        {!isComplete && (
          <View style={styles.rail}>
            {WIZARD_STEPS.map((s, index) => {
              const position = index + 1;
              const done = position < step;
              const current = position === step;
              return (
                <View key={s.title} style={styles.railItem}>
                  <View style={[styles.railBar, { backgroundColor: done || current ? HT.primary : tw.gray200 }]} />
                  {isSm && (
                    <Text style={[styles.railLabel, { color: current ? HT.primary : done ? tw.gray400 : tw.gray300 }]} numberOfLines={1}>
                      {s.short}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {!isComplete && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.title}>{stepMeta?.title}</Text>
            <Text style={styles.subtitle}>{stepMeta?.subtitle}</Text>
          </View>
        )}

        <StepWrapper stepKey={step}>
          <View style={styles.card}>{Body ? <Body w={w} /> : null}</View>
        </StepWrapper>
      </ScrollView>

      {!isComplete && (
        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.footerInner}>
          <Press onPress={w.handleBack} disabled={step === 1 || loading} scale={0.98} style={[styles.backBtn, (step === 1 || loading) && { opacity: 0.5 }]}>
            <Text style={styles.backText}>Back</Text>
          </Press>
          {step < 9 && isSm && (
            <Press onPress={w.clearCurrentStep} disabled={loading} scale={0.98} style={[styles.clearBtn, loading && { opacity: 0.4 }]}>
              <Text style={styles.clearText}>Clear step</Text>
            </Press>
          )}
          <Press
            onPress={w.handleNext}
            disabled={loading || (step === 6 && w.roomTypes.length === 0)}
            scale={0.95}
            style={[styles.nextBtn, (loading || (step === 6 && w.roomTypes.length === 0)) && { opacity: 0.5 }]}
          >
            {loading && <ActivityIndicator size="small" color="#fff" />}
            <Text style={styles.nextText}>{step === 9 ? (loading ? 'Submitting...' : 'Submit Property') : 'Continue'}</Text>
          </Press>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HT.bg },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  headerRow: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, width: '100%', maxWidth: 768, alignSelf: 'center' },
  headerBtn: { padding: 8, borderRadius: 8 },
  stepKicker: { fontSize: 11, letterSpacing: 1.1, color: HT.primary, ...poppins(700) },
  stepName: { fontSize: 14, color: tw.gray900, ...poppins(700) },
  rail: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingBottom: 12, width: '100%', maxWidth: 768, alignSelf: 'center' },
  railItem: { flex: 1, alignItems: 'center', gap: 6 },
  railBar: { width: '100%', height: 6, borderRadius: 999 },
  railLabel: { fontSize: 10, letterSpacing: 0.25, textTransform: 'uppercase', ...poppins(700) },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32, width: '100%', maxWidth: 768, alignSelf: 'center' },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: tw.gray900, ...poppins(800) },
  subtitle: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 6, ...poppins(400) },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(229,231,235,0.8)', gap: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 768, alignSelf: 'center' },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: tw.gray200 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200 },
  backText: { fontSize: 16, color: tw.gray700, ...poppins(700) },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 12 },
  clearText: { fontSize: 13, color: tw.gray400, ...poppins(600) },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: HT.primary, boxShadow: '0 10px 15px -3px rgba(10,77,43,0.25)' },
  nextText: { fontSize: 16, color: '#fff', ...poppins(700) },
});

export default AddResortWizard;
