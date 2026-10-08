/* Ported from Frontend/src/modules/Tours/app/admin/components/LocationPicker.jsx. */
/**
 * Tap-to-place / drag-to-adjust coordinate picker for a destination.
 *
 * Consumer side (TouristPlaceDetail's "How to reach") renders these same
 * coordinates as a real embedded map instead of the broken static image it
 * used to show — this is the other half: give the admin a map instead of two
 * blind number boxes to fill in from memory.
 */
import React, { useEffect, useRef } from 'react';
import { Div } from '../../../../components/web';
import { GMap, Marker, fromLatLng } from '../../../../components/maps';

// Haflong, the district headquarters — just an initial view for a fresh
// destination with no pin yet, never stored as the place's own coordinates.
const HAFLONG_CENTER = {
  lat: 25.1667,
  lng: 93.0167,
};

// Leaflet zoom 12 / 14 expressed as region deltas.
const deltaFor = (zoom) => 360 / 2 ** zoom;

const LocationPicker = ({ lat, lng, onChange, className = '' }) => {
  const mapRef = useRef(null);
  const lastKey = useRef(null);
  const position =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? {
          lat,
          lng,
        }
      : null;
  const center = position || HAFLONG_CENTER;
  const initialDelta = deltaFor(position ? 14 : 12);

  // Recenters the map when the coordinates change from outside a drag/tap (e.g. typed in).
  useEffect(() => {
    if (!position) return;
    const key = `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    mapRef.current?.animateCamera?.({ center: { latitude: position.lat, longitude: position.lng } }, { duration: 300 });
  }, [position?.lat, position?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Div className={`rounded-xl overflow-hidden border border-gray-200 relative z-0 ${className}`}>
      <GMap
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: initialDelta,
          longitudeDelta: initialDelta,
        }}
        onPress={(e) => onChange(fromLatLng(e.nativeEvent.coordinate))}
      >
        {position && (
          <Marker
            coordinate={{ latitude: position.lat, longitude: position.lng }}
            draggable
            onDragEnd={(e) => onChange(fromLatLng(e.nativeEvent.coordinate))}
          />
        )}
      </GMap>
    </Div>
  );
};
export default LocationPicker;
