import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

/*
 * Expo web preview only: react-native-maps has no web build. A flat panel in
 * the map style's base colour stands in so the overlays can be compared.
 */
export function LiveMap({ onMapLoad }) {
  useEffect(() => {
    onMapLoad?.({ panTo: () => {}, setOptions: () => {} });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F5F5F5' }]} />;
}

export default LiveMap;
