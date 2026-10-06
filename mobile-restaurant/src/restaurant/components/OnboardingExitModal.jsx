import { useEffect } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { display, poppins, shadow, tw } from '../../theme';
import { RT, RT_GRADIENT } from '../theme';

/*
 * Port of shared/components/OnboardingExitModal.jsx with theme="restaurant":
 * header gradient #B80B3D -> #66001D and the "Stay" button in green-700, both
 * repainted by the restaurant theme (RT).
 */
export default function OnboardingExitModal({
  open = false,
  onStay,
  onExit,
  title = 'Exit Onboarding?',
  message = 'Are you sure you want to exit? Your progress may not be saved.',
  stayLabel = 'Stay Here',
  exitLabel = 'Exit Anyway',
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
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={onStay} accessibilityLabel="Stay" />
        <Animated.View
          style={[
            styles.card,
            shadow('card'),
            {
              opacity: anim,
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            },
          ]}
        >
          <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
            <View style={styles.iconRing}>
              <LogOut size={32} color="#fff" />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </LinearGradient>
          <View style={styles.actions}>
            <Press onPress={onStay} scale={0.98} style={[styles.btn, shadow('card'), { backgroundColor: RT.primaryStrong }]}>
              <Text style={styles.btnText}>{stayLabel}</Text>
            </Press>
            <Press onPress={onExit} scale={0.98} style={[styles.btn, shadow('card'), { backgroundColor: tw.red600 }]}>
              <Text style={styles.btnText}>{exitLabel}</Text>
            </Press>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 320, backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: RT.border },
  header: { padding: 17.6, alignItems: 'center' },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: { fontSize: 20, lineHeight: 28, color: '#fff', marginBottom: 8, textAlign: 'center', ...display(700, 20) },
  message: { fontSize: 13, lineHeight: 21.125, color: 'rgba(255,255,255,0.85)', textAlign: 'center', ...poppins(400) },
  actions: { padding: 17.6, gap: 12, backgroundColor: '#fff' },
  btn: { height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 15, ...poppins(600) },
});
