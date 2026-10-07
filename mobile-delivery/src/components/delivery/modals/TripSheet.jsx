import { useEffect } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { color, elevation, radii, space } from '../../../theme';

/*
 * The trip panels' shared shell: a full-screen layer (it covers the header
 * and the bottom nav, as the web's `fixed inset-0` does), a black/40 dim that
 * fades in, and a white sheet sliding up from 100 % with framer-motion's
 * default spring for y (stiffness 500, damping 25).
 * `max-w-md bg-white rounded-t-3xl shadow-[0_-20px_60px_rgba(0,0,0,.3)]
 * p-4 pb-6 max-h-[84vh] overflow-y-auto`.
 */
export default function TripSheet({ visible = true, onBackdropPress, onRequestClose, children, contentStyle }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const y = useAnimatedValue(height);
  const dim = useAnimatedValue(0);

  useEffect(() => {
    if (!visible) return;
    y.setValue(height);
    dim.setValue(0);
    Animated.parallel([
      Animated.spring(y, { toValue: 0, stiffness: 500, damping: 25, mass: 1, useNativeDriver: true }),
      Animated.timing(dim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onRequestClose || onBackdropPress}>
      <View style={styles.wrap}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color.overlay, opacity: dim }]}>
          {/* The pickup panel's dim has no click handler; the verification panels close on it. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={onBackdropPress} disabled={!onBackdropPress} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { maxHeight: height * 0.84, transform: [{ translateY: y }] }]}>
          <ScrollView bounces={false} contentContainerStyle={[styles.content, { paddingBottom: space.xxl + insets.bottom }, contentStyle]}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: color.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...elevation.sheet,
    overflow: 'hidden',
  },
  content: { paddingHorizontal: space.lg, paddingTop: space.sm },
});
