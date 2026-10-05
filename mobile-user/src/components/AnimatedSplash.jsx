import { useEffect, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAnimatedValue } from '../lib/useAnimatedValue';

/*
 * Holds the native splash until `ready`, then fades a copy of it out over
 * the first screen. Nothing that depends on stored values renders before.
 */
export default function AnimatedSplash({ ready, children }) {
  const fade = useAnimatedValue(1);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setGone(true));
  }, [ready, fade]);

  return (
    <View style={styles.flex}>
      {ready ? children : null}
      {!gone ? (
        <Animated.View pointerEvents="none" style={[styles.cover, { opacity: fade }]}>
          <Image source={require('../../assets/images/splashLogo.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cover: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 220, height: 220 },
});
