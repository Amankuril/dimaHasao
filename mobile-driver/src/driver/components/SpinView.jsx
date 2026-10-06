import { useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { useAnimatedValue } from '../../lib/useAnimatedValue';

/** Tailwind's `animate-spin` around any icon (`active` false renders it still). */
export default function SpinView({ active = true, children }) {
  const spin = useAnimatedValue(0);
  useEffect(() => {
    if (!active) return undefined;
    spin.setValue(0);
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [active, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={active ? { transform: [{ rotate }] } : undefined}>{children}</Animated.View>;
}
