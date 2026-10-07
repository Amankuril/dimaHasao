import { useEffect, useMemo } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Loader2 } from 'lucide-react-native';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { Press } from '../../components/ui';
import { Alert, CtaButton, Spin } from './OnboardingFields';
import { OB, jk, up } from './onboardingTheme';

export const DRIVER_BRAND_LOGO = require('../../../assets/images/driver-logo.png');

/*
 * Port of driver/pages/registration/OnboardingShell.jsx: the frame every driver
 * onboarding step sits in (header, progress, title block, fixed footer button).
 */

/** The steps a driver walks, in order. The shell derives progress from this. */
export const ONBOARDING_STEPS = ['phone', 'otp', 'personal', 'vehicle', 'documents'];

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

  const percent = Math.round(((index + 1) / total) * 100);
  const width = useAnimatedValue(percent);
  useEffect(() => {
    Animated.timing(width, { toValue: percent, duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: false }).start();
  }, [percent, width]);

  return (
    <View style={{ flex: 1, backgroundColor: OB.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24 + insets.top, paddingBottom: 160 }}>
        <View style={styles.maxW}>
          <View style={{ gap: 20 }}>
            <View style={styles.headRow}>
              {onBack ? (
                <Press scale={1} onPress={onBack} accessibilityLabel="Go back" style={styles.back}>
                  <ArrowLeft size={17} strokeWidth={2.5} color={OB.text} />
                </Press>
              ) : (
                <Image source={DRIVER_BRAND_LOGO} style={{ width: 40, height: 40, borderRadius: 20 }} />
              )}
              <Text style={styles.stepText}>{up(`Step ${index + 1} of ${total}`)}</Text>
            </View>

            <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Onboarding progress">
              <Animated.View style={[styles.fill, { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
            </View>

            <View style={{ gap: 6, paddingTop: 4 }}>
              {eyebrow ? <Text style={styles.eyebrow}>{up(eyebrow)}</Text> : null}
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={{ marginTop: 24, gap: 16 }}>{children}</View>

          {error ? <Alert style={{ marginTop: 16 }}>{error}</Alert> : null}

          {footer ? <View style={{ marginTop: 24 }}>{footer}</View> : null}
        </View>
      </ScrollView>

      <View style={styles.fixed} pointerEvents="box-none">
        <LinearGradient colors={['rgba(250,246,237,0)', OB.bg, OB.bg]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[styles.maxW, { gap: 12, paddingTop: 40, paddingBottom: 28 + insets.bottom, paddingHorizontal: 20 }]}>
          <CtaButton onPress={onPrimary} disabled={primaryDisabled || primaryLoading}>
            {primaryLoading ? (
              <Spin>
                <Loader2 size={18} color="#fff" />
              </Spin>
            ) : (
              <Text style={[styles.ctaText, { color: primaryDisabled ? '#93917f' : '#fff' }]}>{primaryLabel}</Text>
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
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: OB.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stepText: { ...jk(800), fontSize: 11, letterSpacing: 1.54, color: OB.muted, minWidth: 96, textAlign: 'right', flexShrink: 0 },
  track: { height: 4, borderRadius: 999, backgroundColor: OB.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: OB.primary },
  eyebrow: { ...jk(800), fontSize: 11, letterSpacing: 1.76, color: OB.primary },
  title: { ...jk(800), fontSize: 28, lineHeight: 35, letterSpacing: -0.56, color: OB.text },
  subtitle: { ...jk(500), fontSize: 14, lineHeight: 22.75, color: OB.muted, maxWidth: 255 },
  fixed: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ctaText: { ...jk(800), fontSize: 15, letterSpacing: 0.3 },
});
