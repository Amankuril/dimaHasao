import { useState } from 'react';
import { Animated } from 'react-native';

/** RN's useAnimatedValue, which react-native-web does not export. */
export function useAnimatedValue(initial) {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}
