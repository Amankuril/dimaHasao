/*
 * Shared pieces for the Food zone map screens (AddZone, ViewZone, AllZonesMap,
 * DeliveryBoyViewMap). The web builds these with the Maps JavaScript API:
 * SymbolPath.CIRCLE vertex markers, InfoWindows opened on polygon / marker
 * clicks, the ROADMAP / SATELLITE map type control and setCenter + setZoom.
 * Here they are react-native-maps markers and plain views over the map.
 */
import { useCallback, useState } from 'react';
import { Image, View } from 'react-native';
import { X } from 'lucide-react-native';
import { Marker } from '../../../../components/maps';
import { Button, Div, Span, Icon as UiIcon } from '../../../../components/web';

/** Colours the web cycles through for zone polygons. */
export const ZONE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

/** India centre at zoom 5, the web's initial map view. */
export const INDIA_REGION = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 11.25, longitudeDelta: 11.25 };

/** A region centred on a point at a Google Maps zoom level (setCenter + setZoom). */
export const regionAtZoom = (lat, lng, zoom) => {
  const delta = 360 / 2 ** zoom;
  return { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta };
};

/** Hex colour + opacity -> rgba(), for fillOpacity / strokeOpacity. */
export const withAlpha = (hex, alpha) => {
  const h = String(hex).replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/**
 * A zone's stored coordinates as react-native-maps points, read the way the web
 * does (`coord.latitude || coord.lat`), dropping invalid ones.
 */
export const zonePath = (coordinates = []) =>
  (coordinates || [])
    .map((coord) => {
      const lat = typeof coord === 'object' && coord ? coord.latitude || coord.lat : null;
      const lng = typeof coord === 'object' && coord ? coord.longitude || coord.lng : null;
      if (lat === null || lng === null || lat === undefined || lng === undefined) return null;
      const latitude = Number(lat);
      const longitude = Number(lng);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    })
    .filter(Boolean);

/** The web's SymbolPath.CIRCLE marker icon (scale 8, white 2px stroke). */
export function DotMarker({ coordinate, color = '#9333ea', title, onPress, zIndex = 1000 }) {
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} title={title} tracksViewChanges={false} zIndex={zIndex} onPress={onPress}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: 2, borderColor: '#ffffff' }} />
    </Marker>
  );
}

/** A 50x50 image marker centred on the point and rotated to `rotation` degrees. */
export function ImageMarker({ coordinate, source, rotation = 0, title, onPress, zIndex = 1000 }) {
  const [tracks, setTracks] = useState(true);
  const loaded = useCallback(() => setTimeout(() => setTracks(false), 300), []);
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} title={title} tracksViewChanges={tracks} zIndex={zIndex} onPress={onPress}>
      <Image source={source} onLoad={loaded} style={{ width: 50, height: 50, transform: [{ rotate: `${rotation}deg` }] }} resizeMode="contain" />
    </Marker>
  );
}

/** The map type control (Map / Satellite), top right like the web's HORIZONTAL_BAR. */
export function MapTypeToggle({ value, onChange }) {
  return (
    <Div className="absolute top-2 right-2 flex-row bg-white rounded shadow-md overflow-hidden">
      {[
        ['standard', 'Map'],
        ['satellite', 'Satellite'],
      ].map(([type, label]) => (
        <Button key={type} type="button" onClick={() => onChange(type)} className="px-3 py-1.5">
          <Span className={`text-xs ${value === type ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{label}</Span>
        </Button>
      ))}
    </Div>
  );
}

/** The InfoWindow: a card over the map with a close button. */
export function InfoCard({ onClose, children }) {
  return (
    <Div className="absolute top-12 left-2 right-2 bg-white rounded-lg shadow-lg p-3">
      <Button type="button" onClick={onClose} className="absolute top-1 right-1 p-1.5">
        <UiIcon as={X} className="w-4 h-4 text-slate-500" />
      </Button>
      <Div className="pr-6">{children}</Div>
    </Div>
  );
}

/** Stops the page ScrollView from stealing pans while a finger is on the map. */
export function useMapTouchLock() {
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const handlers = {
    onTouchStart: () => setScrollEnabled(false),
    onTouchEnd: () => setScrollEnabled(true),
    onTouchCancel: () => setScrollEnabled(true),
  };
  return [scrollEnabled, handlers];
}
