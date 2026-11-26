import { useEffect, useMemo, useRef } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Loader2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { outfit } from '../../theme';
import { DT } from '../ui/dt';
import { Alert, CtaButton, Spin } from './OnboardingFields';
import { jk, obCard, up } from './onboardingTheme';

export const DRIVER_BRAND_LOGO = require('../../../assets/images/driver-logo.webp');

/*
 * The frame every driver onboarding step sits in: a plain header on the page (logo or back button,
 * step progress, ink title), the step's white cards, and a fixed footer with the graphite primary action.
 */

/** The steps a driver walks, in order. The shell derives progress from this. */
export const ONBOARDING_STEPS = ['phone', 'otp', 'personal', 'vehicle', 'documents'];

/**
 * A solid strip behind the system status bar. The onboarding pages scroll
 * edge-to-edge, so without it the form slid under the clock/battery icons.
 */
export function StatusBarBackdrop() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar style="dark" />
      {insets.top ? <View pointerEvents="none" style={[styles.statusBackdrop, { height: insets.top }]} /> : null}
    </>
  );
}

/** The header block of an onboarding page: sits on the page background, no slab. */
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
 * Sign-in layout (phone number, code): the logo and an ink title on the page,
 * then a white form card, then an optional footer (legal links).
 */
export function AuthScaffold({ title, subtitle, children, footer = null, icon = null }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
    <ScrollView
      style={{ flex: 1, backgroundColor: DT.bg }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 + insets.bottom }}
    >
      <BrandHero top={insets.top + 24} style={styles.authHero}>
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
    <StatusBarBackdrop />
    </View>
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

  // The message sits below the form, so bring it into view when it appears.
  const scrollRef = useRef(null);
  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 170 }}>
        <BrandHero top={insets.top}>
          <View style={styles.maxW}>
            <View style={styles.headRow}>
              {onBack ? (
                <Press scale={0.92} onPress={onBack} accessibilityLabel="Go back" style={styles.back} hitSlop={8}>
                  <ArrowLeft size={20} strokeWidth={2} color={DT.ink} />
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

      <StatusBarBackdrop />

      <View style={styles.fixed} pointerEvents="box-none">
        <LinearGradient colors={['rgba(250,250,250,0)', DT.bg, DT.bg]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
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
  hero: { paddingHorizontal: 20, paddingBottom: 8 },
  authHero: { paddingBottom: 24 },
  authBody: { paddingHorizontal: 20 },
  authCard: { padding: 20, gap: 16 },
  authTitle: { ...outfit(600), fontSize: 28, lineHeight: 36, color: DT.ink, marginTop: 24 },
  logoRing: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPill: { paddingVertical: 4 },
  stepText: { ...jk(500), fontSize: 13, lineHeight: 18, color: DT.muted, textAlign: 'right' },
  segments: { flexDirection: 'row', gap: 4, marginTop: 16 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: DT.border },
  segmentDone: { backgroundColor: DT.ink },
  segmentActive: { backgroundColor: DT.ink },
  eyebrow: { ...jk(500), fontSize: 13, lineHeight: 18, color: DT.muted },
  title: { ...outfit(600), fontSize: 26, lineHeight: 34, color: DT.ink },
  subtitle: { ...jk(400), fontSize: 15, lineHeight: 22, color: DT.inkSoft },
  fixed: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  statusBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: DT.bg, zIndex: 50, elevation: 50 },
  ctaText: { ...jk(600), fontSize: 15, lineHeight: 20 },
});
