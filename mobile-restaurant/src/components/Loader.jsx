import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Loader2 } from 'lucide-react-native';
import { useAnimatedValue } from '../lib/useAnimatedValue';

/* @food/components/Loader: a 48 px ring, 4 px, brand-green top segment, spinning. */
export default function Loader({ fullScreen = true }) {
  const spin = useAnimatedValue(0);
  useEffect(() => {
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={fullScreen ? styles.full : styles.inline} accessibilityLabel="Loading">
      <View style={styles.box}>
        <View style={[styles.ring, { borderColor: 'rgba(10,77,43,0.1)' }]} />
        <Animated.View style={[styles.ring, styles.top, { transform: [{ rotate }] }]} />
      </View>
    </View>
  );
}

/** lucide Loader2 with Tailwind's animate-spin. */
export function Spinner({ size = 20, color = '#fff', strokeWidth = 2 }) {
  const spin = useAnimatedValue(0);
  useEffect(() => {
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Loader2 size={size} color={color} strokeWidth={strokeWidth} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  full: { ...StyleSheet.absoluteFillObject, zIndex: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  inline: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  box: { width: 48, height: 48 },
  ring: { ...StyleSheet.absoluteFillObject, borderWidth: 4, borderRadius: 24 },
  top: { borderColor: 'transparent', borderTopColor: '#0a4d2b' },
});
