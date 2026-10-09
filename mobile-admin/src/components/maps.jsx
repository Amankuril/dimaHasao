/*
 * Google Maps for the admin panels (Food zones, Taxi geo-fencing / zones /
 * airports / service locations / god's eye / heatmap), on react-native-maps.
 *
 *   <GMap className="h-[420px] rounded-xl" initialRegion={regionFor(points)} onPress={(e) => add(e.nativeEvent.coordinate)}>
 *     <EditablePolygon points={points} onChange={setPoints} strokeColor="#2563eb" fillColor="rgba(37,99,235,0.2)" />
 *     <Marker coordinate={{ latitude, longitude }} />
 *   </GMap>
 *
 * The web's polygon tools already draw by "each map click adds a vertex"
 * (Google retired DrawingManager); EditablePolygon is that, with each vertex
 * a draggable marker as on the web. Points are { lat, lng } like the web keeps
 * them; toLatLng / fromLatLng convert for react-native-maps.
 * Places search / geocoding: api/geocode.js (geocodeAPI).
 */
import { forwardRef, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import MapView, { Callout, Circle, Heatmap, Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { tw } from '../lib/tw';

export { Callout, Circle, Heatmap, Marker, Polygon, Polyline, PROVIDER_GOOGLE };

/** Haflong, the district HQ: the default centre when there is nothing to fit. */
export const DEFAULT_CENTER = { lat: 25.1697, lng: 93.0167 };

export const toLatLng = (p) => ({ latitude: Number(p?.lat ?? p?.latitude), longitude: Number(p?.lng ?? p?.longitude) });
export const fromLatLng = (c) => ({ lat: c.latitude, lng: c.longitude });

/** A region that fits the points (with padding), or the default centre at city zoom. */
export function regionFor(points = [], { padding = 1.4, minDelta = 0.02 } = {}) {
  const pts = (points || []).map(toLatLng).filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
  if (!pts.length) return { latitude: DEFAULT_CENTER.lat, longitude: DEFAULT_CENTER.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 };
  const lats = pts.map((p) => p.latitude);
  const lngs = pts.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(minDelta, (maxLat - minLat) * padding),
    longitudeDelta: Math.max(minDelta, (maxLng - minLng) * padding),
  };
}

/** MapView on the Google provider, sized by the web's classes (`h-[500px] w-full rounded-lg`). */
export const GMap = forwardRef(function GMap({ className, style, children, ...rest }, ref) {
  const s = StyleSheet.flatten([{ width: '100%', height: 360 }, tw.style(className), style]);
  return (
    <MapView ref={ref} provider={PROVIDER_GOOGLE} style={s} toolbarEnabled={false} moveOnMarkerPress={false} {...rest}>
      {children}
    </MapView>
  );
});

/**
 * A vehicle icon on the map. Marker's `image` prop draws a PNG at its pixel size
 * (the 331x701 vehicle icons then cover the whole map), so the icon is a child
 * Image at a fixed width instead. `icon` is a required asset or a URL string.
 */
export function VehicleMarker({ icon, width = 18, ...rest }) {
  const [tracking, setTracking] = useState(true);
  if (!icon) return <Marker anchor={{ x: 0.5, y: 0.5 }} {...rest} />;
  const source = typeof icon === 'string' ? { uri: icon } : icon;
  const meta = typeof source === 'number' ? Image.resolveAssetSource(source) : null;
  const ratio = meta?.width && meta?.height ? meta.height / meta.width : 1;
  return (
    <Marker anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracking} {...rest}>
      <Image source={source} resizeMode="contain" style={{ width, height: width * ratio }} onLoad={() => setTracking(false)} onError={() => setTracking(false)} />
    </Marker>
  );
}

/**
 * A polygon whose vertices are draggable markers. `points` are { lat, lng };
 * onChange receives the new list. Tapping a vertex calls onVertexPress(index)
 * (the web removes a vertex on right-click; use it for "remove point").
 */
export function EditablePolygon({ points = [], onChange, editable = true, strokeColor = '#2563EB', fillColor = 'rgba(37,99,235,0.2)', strokeWidth = 2, vertexColor = '#2563EB', onVertexPress }) {
  const coords = points.map(toLatLng);
  return (
    <>
      {coords.length >= 2 ? (
        coords.length >= 3 ? (
          <Polygon coordinates={coords} strokeColor={strokeColor} fillColor={fillColor} strokeWidth={strokeWidth} tappable={false} />
        ) : (
          <Polyline coordinates={coords} strokeColor={strokeColor} strokeWidth={strokeWidth} />
        )
      ) : null}
      {editable
        ? coords.map((c, i) => (
            <Marker
              key={`v${i}`}
              coordinate={c}
              draggable
              pinColor={vertexColor}
              tracksViewChanges={false}
              onPress={() => onVertexPress?.(i)}
              onDragEnd={(e) => {
                const next = points.slice();
                next[i] = fromLatLng(e.nativeEvent.coordinate);
                onChange?.(next);
              }}
            />
          ))
        : null}
    </>
  );
}

export default GMap;
