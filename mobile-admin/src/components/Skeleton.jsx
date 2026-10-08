import { useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { useAnimatedValue } from '../lib/useAnimatedValue';

/* @food/components/ui/skeleton: slate-200/80, radius 8, Tailwind animate-pulse (2 s). */
export default function Skeleton({ style }) {
  const pulse = useAnimatedValue(1);
  useEffect(() => {
    const ease = Easing.bezier(0.4, 0, 0.6, 1);
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 1000, easing: ease, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: ease, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [pulse]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ borderRadius: 8, backgroundColor: 'rgba(226,232,240,0.8)' }, style, { opacity: pulse }]}
    />
  );
}
