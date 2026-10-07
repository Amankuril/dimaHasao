import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Loader2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { playfair, shadow } from '../../theme';
import { DT } from '../ui/dt';
import { Alert, CtaButton, Spin } from './OnboardingFields';
import { jk, obCard, up } from './onboardingTheme';

export const DRIVER_BRAND_LOGO = require('../../../assets/images/driver-logo.png');

/*
 * The frame every driver onboarding step sits in: a deep-green hero (logo or back button, step pills,
 * gold serif title), the step's white cards, and a fixed footer with the yellow call-to-action.
 */

/** The steps a driver walks, in order. The shell derives progress from this. */
export const ONBOARDING_STEPS = ['phone', 'otp', 'personal', 'vehicle', 'documents'];

/** The green hero block: rounded bottom corners, gold serif title, cream subtitle. */
export function BrandHero({ top = 0, children, style }) {
  return <View style={[styles.hero, { paddingTop: top + 18 }, style]}>{children}</View>;
}

/** The logo medallion used by the sign-in screens and the status screens. */
export function LogoBadge({ size = 64 }) {
  return (
    <View style={[styles.logoRing, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
      <Image source={DRIVER_BRAND_LOGO} style={{ width: size, height: size, borderRadius: size / 2 }} />
    </View>
  );
}

/**
 * Sign-in layout (phone number, code): green hero with the logo and a gold serif title,
 * then a white form card pulled up over the hero's edge, then an optional footer (legal links).
 */
export function AuthScaffold({ title, subtitle, children, footer = null, icon = null }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: DT.bg }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 + insets.bottom }}
    >
      <BrandHero top={insets.top + 14} style={styles.authHero}>
        <View style={styles.maxW}>
          {icon || <LogoBadge size={64} />}
          <Text style={styles.authTitle}>{title}</Text>
          {subtitle ? <View style={{ marginTop: 8 }}>{typeof subtitle === 'string' ? <Text style={styles.subtitle}>{subtitle}</Text> : subtitle}</View> : null}
        </View>
      </BrandHero>

      <View style={[styles.maxW, styles.authBody]}>
        <View style={[obCard, styles.authCard]}>{children}</View>
        {footer ? <View style={{ marginTop: 20 }}>{footer}</View> : null}
      </View>
    </ScrollView>
  );
}

export default function OnboardingShell({
  step,
  eyebrow,
  title,
  subtitle,
  children,
  error = '',
  onBack,
  footer,
  primaryLabel = 'Continue',
  primaryDisabled = false,
  primaryLoading = false,
  onPrimary,
  secondary = null,
}) {
  const insets = useSafeAreaInsets();
  const { index, total } = useMemo(() => {
    const position = ONBOARDING_STEPS.indexOf(step);
    return { index: position < 0 ? 0 : position, total: ONBOARDING_STEPS.length };
  }, [step]);

  return (
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 170 }}>
        <BrandHero top={insets.top}>
          <View style={styles.maxW}>
            <View style={styles.headRow}>
              {onBack ? (
                <Press scale={0.92} onPress={onBack} accessibilityLabel="Go back" style={styles.back} hitSlop={8}>
                  <ArrowLeft size={20} strokeWidth={2.5} color={DT.onBrand} />
                </Press>
              ) : (
                <Image source={DRIVER_BRAND_LOGO} style={{ width: 44, height: 44, borderRadius: 22 }} />
              )}
              <View style={styles.stepPill}>
                <Text style={styles.stepText}>{up(`Step ${index + 1} of ${total}`)}</Text>
              </View>
            </View>

            <View
              style={styles.segments}
              accessibilityRole="progressbar"
              accessibilityLabel="Onboarding progress"
              accessibilityValue={{ min: 1, max: total, now: index + 1 }}
            >
              {ONBOARDING_STEPS.map((name, i) => (
                <View
                  key={name}
                  style={[styles.segment, i < index && styles.segmentDone, i === index && styles.segmentActive]}
                />
              ))}
            </View>

            <View style={{ gap: 6, marginTop: 20 }}>
              {eyebrow ? <Text style={styles.eyebrow}>{up(eyebrow)}</Text> : null}
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>
        </BrandHero>

        <View style={[styles.maxW, { paddingHorizontal: 20, marginTop: 20 }]}>
          <View style={{ gap: 16 }}>{children}</View>

          {error ? <Alert style={{ marginTop: 16 }}>{error}</Alert> : null}

          {footer ? <View style={{ marginTop: 24 }}>{footer}</View> : null}
        </View>
      </ScrollView>

      <View style={styles.fixed} pointerEvents="box-none">
        <LinearGradient colors={['rgba(248,250,252,0)', DT.bg, DT.bg]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[styles.maxW, { gap: 12, paddingTop: 36, paddingBottom: 20 + insets.bottom, paddingHorizontal: 20 }]}>
          <CtaButton onPress={onPrimary} disabled={primaryDisabled || primaryLoading}>
            {primaryLoading ? (
              <Spin>
                <Loader2 size={18} color={DT.ctaInk} />
              </Spin>
            ) : (
              <Text style={[styles.ctaText, { color: primaryDisabled ? DT.faint : DT.ctaInk }]}>{primaryLabel}</Text>
            )}
          </CtaButton>
          {secondary}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  maxW: { width: '100%', maxWidth: 448, alignSelf: 'center' },
  hero: {
    backgroundColor: DT.brandDeep,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: DT.radius.xl,
    borderBottomRightRadius: DT.radius.xl,
    ...shadow('md'),
  },
  authHero: { paddingBottom: 56 },
  authBody: { paddingHorizontal: 20, marginTop: -32 },
  authCard: { padding: 20, gap: 16 },
  authTitle: { ...playfair(700), fontSize: 30, lineHeight: 38, color: DT.gold, marginTop: 18 },
  logoRing: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: DT.gold, backgroundColor: DT.brand },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPill: { minWidth: 112, paddingHorizontal: 12, paddingVertical: 6, borderRadius: DT.radius.pill, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(202,168,62,0.5)' },
  stepText: { ...jk(800), fontSize: 11, lineHeight: 16, letterSpacing: 1.2, color: DT.gold, textAlign: 'center' },
  segments: { flexDirection: 'row', gap: 6, marginTop: 18 },
  segment: { flex: 1, height: 6, borderRadius: DT.radius.pill, backgroundColor: 'rgba(255,255,255,0.18)' },
  segmentDone: { backgroundColor: DT.gold },
  segmentActive: { backgroundColor: DT.accent },
  eyebrow: { ...jk(800), fontSize: 11, lineHeight: 16, letterSpacing: 1.6, minWidth: 40, color: DT.onBrandMuted },
  title: { ...playfair(700), fontSize: 28, lineHeight: 36, color: DT.gold },
  subtitle: { ...jk(500), fontSize: 14, lineHeight: 21, color: DT.onBrandMuted },
  fixed: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ctaText: { ...jk(800), fontSize: 15, lineHeight: 20 },
});
