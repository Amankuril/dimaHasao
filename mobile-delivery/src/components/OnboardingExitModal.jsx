import { useEffect } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LogOut } from 'lucide-react-native';
import { Press } from './ui';
import { useAnimatedValue } from '../lib/useAnimatedValue';
import { color, elevation, radii, space, tone, touch, type } from '../theme';

/*
 * Port of shared/components/OnboardingExitModal.jsx on the design-system
 * tokens: "Stay" is the filled (safe) action, "Exit" the soft danger one.
 */
const THEMES = {
  delivery: { accent: tone.primary },
  restaurant: { accent: tone.danger },
};

export default function OnboardingExitModal({
  open = false,
  onStay,
  onExit,
  title = 'Exit onboarding?',
  message = 'Are you sure you want to exit? Your progress may not be saved.',
  stayLabel = 'Stay here',
  exitLabel = 'Exit anyway',
  theme = 'delivery',
}) {
  const palette = THEMES[theme] || THEMES.delivery;
  const anim = useAnimatedValue(0);
  useEffect(() => {
    if (open) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 180, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }).start();
    }
  }, [open, anim]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onStay} statusBarTranslucent>
      <View style={styles.wrap}>
        <BlurView intensity={8} tint="dark" style={StyleSheet.absoluteFill} experimentalBlurMethod="dimezisBlurView" />
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: color.overlay }]} onPress={onStay} accessibilityLabel="Stay" />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              opacity: anim,
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            },
          ]}
        >
          <View style={[styles.iconRing, { backgroundColor: tone.warning.bg }]}>
            <LogOut size={28} color={tone.warning.fg} strokeWidth={2} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Press onPress={onStay} scale={0.98} accessibilityLabel={stayLabel} style={[styles.btn, { backgroundColor: palette.accent.fg }]}>
              <Text style={[styles.btnText, { color: color.onPrimary }]}>{stayLabel}</Text>
            </Press>
            <Press onPress={onExit} scale={0.98} accessibilityLabel={exitLabel} style={[styles.btn, { backgroundColor: tone.danger.bg }]}>
              <Text style={[styles.btnText, { color: tone.danger.fg }]}>{exitLabel}</Text>
            </Press>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: color.surface,
    borderRadius: radii.xl,
    padding: space.xxl,
    alignItems: 'center',
    ...elevation.float,
  },
  iconRing: { width: 56, height: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  title: { ...type.heading, color: color.text, textAlign: 'center', marginBottom: space.sm },
  message: { ...type.body, color: color.textSecondary, textAlign: 'center' },
  actions: { alignSelf: 'stretch', marginTop: space.xxl, gap: space.md },
  btn: { height: touch, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  btnText: { ...type.button },
});
