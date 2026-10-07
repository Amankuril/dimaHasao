import { useEffect } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LogOut } from 'lucide-react-native';
import { Button } from '../../components/ds';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { color, elevation, radii, space, type } from '../../theme';

/*
 * Port of shared/components/OnboardingExitModal.jsx in the heritage look: deep-green header with a
 * gold icon, "Stay" as the primary action and "Exit" as the soft destructive one.
 */
export default function OnboardingExitModal({
  open = false,
  onStay,
  onExit,
  title = 'Exit onboarding?',
  message = 'Are you sure you want to exit? Your progress may not be saved.',
  stayLabel = 'Stay here',
  exitLabel = 'Exit anyway',
}) {
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
          <View style={styles.header}>
            <View style={styles.iconRing}>
              <LogOut size={28} color={color.goldOnDark} />
            </View>
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
          <View style={styles.actions}>
            <Button title={stayLabel} onPress={onStay} />
            <Button title={exitLabel} variant="dangerSoft" onPress={onExit} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: { width: '100%', maxWidth: 340, backgroundColor: color.surface, borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: color.border, ...elevation.sheet },
  header: { paddingHorizontal: space.xl, paddingVertical: space.xxl, alignItems: 'center', backgroundColor: color.primaryDeep },
  iconRing: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(202,168,62,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: space.md, borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)' },
  title: { ...type.heading, fontSize: 20, lineHeight: 28, color: color.textInverse, marginBottom: space.sm, textAlign: 'center' },
  message: { ...type.small, color: color.textOnDarkMuted, textAlign: 'center' },
  actions: { padding: space.xl, gap: space.md, backgroundColor: color.surface },
});
