import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, tw } from '../../theme';
import { HT } from '../theme';
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

// `bg-[#005CA8] hover:bg-[#004b8a]` is repainted to the strong green (partnerTheme.css matches the hover class by
// substring and its #004B8A rule comes later), and `shadow-[#005CA8]/25` loses its alpha, so the shadow is solid green.
const SHADOW_LG = `0 10px 15px -3px ${HT.primary}, 0 4px 6px -4px ${HT.primary}`;

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
  // md: breakpoint (768px): card padding p-7, heading text-3xl, main pt-8
  const md = width >= 768;
  const nextDisabled = loading || isEditingSubItem || (step === 6 && w.roomTypes.length === 0);

  return (
    <KeyboardAvoidingView style={styles.page} behavior="padding">
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Press onPress={w.handleBack} accessibilityLabel="Go back" style={[styles.headerBtn, { marginLeft: -8 }]}>
            <ArrowLeft size={20} color={tw.gray500} />
          </Press>

          <View style={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
            <Text style={styles.stepLabel}>{isComplete ? 'COMPLETE' : `STEP ${step} OF 9`}</Text>
            <Text style={styles.stepName} numberOfLines={1}>
              {isComplete ? 'Registration submitted' : title}
            </Text>
          </View>

          <Press onPress={w.handleExit} accessibilityLabel="Close and discard" style={[styles.headerBtn, { marginRight: -8 }]}>
            <X size={20} color={tw.gray500} />
          </Press>
        </View>

        {/* Segmented rail: each step is its own bar. */}
        {!isComplete && (
          <View style={styles.rail}>
            {WIZARD_STEPS.map((wizardStep, index) => {
              const position = index + 1;
              const done = position < step;
              const current = position === step;
              return (
                <View key={wizardStep.title} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <View style={[styles.bar, { backgroundColor: done || current ? HT.primary : tw.gray200 }]} />
                  {wide ? (
                    <Text style={[styles.railLabel, { color: current ? HT.primary : done ? tw.gray400 : tw.gray300 }]} numberOfLines={1}>
                      {wizardStep.short.toUpperCase()}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: md ? 32 : 24, paddingBottom: 32 }}
      >
        <View style={styles.main}>
          {!isComplete && (
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.h1, md ? { fontSize: 30, lineHeight: 36, letterSpacing: -0.75 } : null]} accessibilityRole="header">
                {title}
              </Text>
              <Text style={styles.sub}>{subtitle}</Text>
            </View>
          )}

          <View style={[styles.card, md ? { padding: 28 } : null]}>
            <Body w={w} wide={wide} />
          </View>
        </View>
      </ScrollView>

      {/* The web keeps the footer on the submitted screen too: Back (to step 9) works there, while its
          "Submit homestay" button is a no-op (handleNext has no case 10), so only Back is drawn. */}
      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.footerRow}>
          <Press
            onPress={w.handleBack}
            disabled={step === 1 || loading || isEditingSubItem}
            style={[styles.backBtn, step === 1 || loading || isEditingSubItem ? { opacity: 0.5 } : null]}
          >
            <Text style={styles.backText}>Back</Text>
          </Press>

          {step < 9 && wide && (
            <Press onPress={w.clearCurrentStep} disabled={loading} style={[styles.clearBtn, loading ? { opacity: 0.4 } : null]}>
              <Text style={styles.clearText}>Clear step</Text>
            </Press>
          )}

          {!isComplete && (
            <Press
              onPress={step === 9 ? w.submitAll : w.handleNext}
              disabled={nextDisabled}
              style={[styles.nextBtn, nextDisabled ? { opacity: 0.5 } : null]}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.nextText}>Processing...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.nextText}>{step === 9 ? 'Submit homestay' : 'Continue'}</Text>
                  {step < 9 && <ArrowRight size={16} color="#fff" />}
                </>
              )}
            </Press>
          )}
        </View>
      </View>

      <BottomSheet visible={Boolean(w.pickerRequest)} onClose={w.closePicker} panelStyle={styles.sheet}>
        <View style={{ paddingBottom: 12 + insets.bottom }}>
          <Text style={styles.sheetTitle}>Add photo</Text>
          <Press scale={0.98} onPress={() => w.pickFrom('camera')} style={styles.sheetRow}>
            <Camera size={20} color={HT.primary} />
            <Text style={styles.sheetText}>Use Camera</Text>
          </Press>
          <Press scale={0.98} onPress={() => w.pickFrom('gallery')} style={styles.sheetRow}>
            <ImageIcon size={20} color={HT.primary} />
            <Text style={styles.sheetText}>Upload from Device</Text>
          </Press>
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: HT.bg },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  headerRow: { width: '100%', maxWidth: 768, alignSelf: 'center', minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  headerBtn: { padding: 8, borderRadius: 8 },
  stepLabel: { fontSize: 11, lineHeight: 16, letterSpacing: 1.6, color: HT.primary, ...poppins(700) },
  stepName: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  rail: { width: '100%', maxWidth: 768, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', gap: 4, paddingHorizontal: 16, paddingBottom: 12 },
  bar: { height: 6, width: '100%', borderRadius: 999 },
  railLabel: { fontSize: 10, lineHeight: 14, letterSpacing: 0.5, ...poppins(700) },
  main: { width: '100%', maxWidth: 768, alignSelf: 'center' },
  h1: { fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: tw.gray900, ...poppins(800) },
  sub: { marginTop: 6, fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(229,231,235,0.8)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  footer: { backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: tw.gray200, paddingTop: 12, paddingHorizontal: 16 },
  footerRow: { width: '100%', maxWidth: 768, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backText: { fontSize: 14, lineHeight: 24, color: tw.gray600, ...poppins(700) },
  clearBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  clearText: { fontSize: 14, lineHeight: 20, color: tw.gray400, ...poppins(600) },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: HT.primaryStrong, boxShadow: SHADOW_LG },
  nextText: { color: '#fff', fontSize: 14, lineHeight: 24, ...poppins(700) },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20 },
  sheetTitle: { marginBottom: 8, fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: tw.gray200, borderRadius: 12, marginTop: 8 },
  sheetText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
});
