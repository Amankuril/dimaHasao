import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { tw } from '../../theme';

/* Shared bits of the taxi account screens (Tailwind classes of the web pages). */

// Web font: Outfit (Taxi/index.css). Falls back to Poppins if not loaded.
const OUTFIT = { 400: 'Outfit_400Regular', 500: 'Outfit_500Medium', 600: 'Outfit_600SemiBold', 700: 'Outfit_700Bold', 800: 'Outfit_800ExtraBold', 900: 'Outfit_900Black' };
export const fo = (w = 400) => ({ fontFamily: OUTFIT[w] || OUTFIT[400] });

export const goBack = (fallback = '/taxi/user') => {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
};

export const BG_SOFT = '#F3F4F6';

export function useHeaderTop() {
  return useSafeAreaInsets().top + 16; // web pt-10
}

export function BackBtn({ onPress, size = 36, radius = 12, color = tw.slate900, strokeWidth = 2.5, style }) {
  return (
    <Press
      onPress={onPress || (() => goBack())}
      accessibilityLabel="Back"
      style={[{ width: size, height: size, borderRadius: radius, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <ArrowLeft size={18} color={color} strokeWidth={strokeWidth} />
    </Press>
  );
}

export function Pulse({ style }) {
  const o = useAnimatedValue(1);
  useEffect(() => {
    const e = Easing.bezier(0.4, 0, 0.6, 1);
    const a = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 0.5, duration: 1000, easing: e, useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: 1000, easing: e, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [o]);
  return <Animated.View style={[style, { opacity: o }]} />;
}

export function Eyebrow({ children, color = tw.slate400, style }) {
  return <Text style={[{ fontSize: 9, letterSpacing: 2.3, textTransform: 'uppercase', color, ...fo(900) }, style]}>{children}</Text>;
}

export const sh = { boxShadow: '0 4px 14px rgba(15,23,42,0.06)' };
export const headerShadow = { boxShadow: '0 4px 20px rgba(15,23,42,0.05)' };

export const styles = StyleSheet.create({ flex: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center' } });
export { View };
