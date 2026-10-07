import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { color, elevation } from '../../../theme';

/* Small pieces the live-ride screens (searching / tracking / complete) share. */

/** An image source: a bundled require() as is, a URL string as { uri }. */
export const toSrc = (value) => (typeof value === 'string' ? (value ? { uri: value } : undefined) : value);

/** react-native-maps renders a Marker's children to a bitmap; stop re-rendering once they settled. */
export function useTrackViews(key, ms = 1500) {
  const [track, setTrack] = useState(true);
  useEffect(() => {
    setTrack(true);
    const id = setTimeout(() => setTrack(false), ms);
    return () => clearTimeout(id);
  }, [key, ms]);
  return track;
}

/** A 0 -> 1 value that loops forever (framer-motion `repeat: Infinity`); the first delay applies once. */
export function useLoop({ duration, delay = 0, easing = Easing.linear, useNativeDriver = true }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    v.setValue(0);
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver }));
    const id = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(id);
      loop.stop();
    };
  }, [v, duration, delay, easing, useNativeDriver]);
  return v;
}

/** The searching screen's PinLocationMarker: coloured disc with a white dot and a small pointer below. */
export function PinLocationMarker({ position, title, color, size = 34, zIndex = 1 }) {
  const track = useTrackViews(`${color}${size}`);
  const tri = Math.round(size * 0.18);
  return (
    <Marker
      coordinate={{ latitude: position.lat, longitude: position.lng }}
      title={title}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={zIndex}
      tracksViewChanges={track}
      tracksInfoWindowChanges={false}
    >
      <View style={{ alignItems: 'center', padding: 4 }}>
        <View style={[styles.pinDisc, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
          <View style={styles.pinDot} />
        </View>
        <View style={{ width: 0, height: 0, borderLeftWidth: tri, borderRightWidth: tri, borderTopWidth: Math.round(size * 0.28), borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color, marginTop: -2 }} />
      </View>
    </Marker>
  );
}

/** Tracking screen's small round location dot. */
export function CircleLocationMarker({ position, color, title }) {
  const track = useTrackViews(color, 600);
  return (
    <Marker coordinate={{ latitude: position.lat, longitude: position.lng }} title={title} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={track} tracksInfoWindowChanges={false}>
      <View style={{ padding: 6 }}>
        <View style={[styles.circleDot, { backgroundColor: color }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pinDisc: { borderWidth: 2, borderColor: color.surface, alignItems: 'center', justifyContent: 'center', ...elevation.float },
  pinDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.surface },
  circleDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: color.surface, ...elevation.float },
});
