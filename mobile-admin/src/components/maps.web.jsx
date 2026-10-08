/*
 * Web stub for components/maps.jsx.
 *
 * react-native-maps has no web implementation (importing it throws
 * "codegenNativeComponent is not a function"), and Expo Router statically
 * requires every route file, so one map screen would break the whole web
 * preview. The preview is only used to check layout during development; the
 * Android build uses maps.jsx. Same exports, drawing a placeholder box.
 */
import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { tw } from '../lib/tw';
import { Text } from './Text';

export const PROVIDER_GOOGLE = 'google';
export const DEFAULT_CENTER = { lat: 25.1697, lng: 93.0167 };

export const toLatLng = (p) => ({ latitude: Number(p?.lat ?? p?.latitude), longitude: Number(p?.lng ?? p?.longitude) });
export const fromLatLng = (c) => ({ lat: c.latitude, lng: c.longitude });

export function regionFor(points = []) {
  const pts = (points || []).map(toLatLng).filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
  if (!pts.length) return { latitude: DEFAULT_CENTER.lat, longitude: DEFAULT_CENTER.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 };
  const lats = pts.map((p) => p.latitude);
  const lngs = pts.map((p) => p.longitude);
  return { latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2, latitudeDelta: 0.12, longitudeDelta: 0.12 };
}

export const GMap = forwardRef(function GMap({ className, style, children }, ref) {
  const s = StyleSheet.flatten([{ width: '100%', height: 360, backgroundColor: '#E8EDF2', alignItems: 'center', justifyContent: 'center' }, tw.style(className), style]);
  return (
    <View ref={ref} style={s}>
      <Text style={{ color: '#62748E', fontSize: 12 }}>Map (Android only)</Text>
      {children}
    </View>
  );
});

const Nothing = () => null;
export const Marker = Nothing;
export const Polygon = Nothing;
export const Polyline = Nothing;
export const Circle = Nothing;
export const Heatmap = Nothing;
export const Callout = Nothing;
export const EditablePolygon = Nothing;

export default GMap;
