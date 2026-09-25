/**
 * Click-to-place / drag-to-adjust coordinate picker for a destination.
 *
 * Consumer side (TouristPlaceDetail's "How to reach") renders these same
 * coordinates as a real embedded map instead of the broken static image it
 * used to show — this is the other half: give the admin a map instead of two
 * blind number boxes to fill in from memory.
 */
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Vite doesn't resolve Leaflet's default icon URLs the way its own bundler
// does; without this fix every marker renders as a broken image.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// Haflong, the district headquarters — just an initial view for a fresh
// destination with no pin yet, never stored as the place's own coordinates.
const HAFLONG_CENTER = { lat: 25.1667, lng: 93.0167 };

const ClickToPlace = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
};

/** Recenters the map when the coordinates change from outside a drag/click (e.g. typed in). */
const RecenterOnChange = ({ position }) => {
  const map = useMap();
  const lastKey = useRef(null);
  useEffect(() => {
    if (!position) return;
    const key = `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    map.setView([position.lat, position.lng], Math.max(map.getZoom(), 13));
  }, [position, map]);
  return null;
};

const LocationPicker = ({ lat, lng, onChange, className = '' }) => {
  const position = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const center = position || HAFLONG_CENTER;

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 relative z-0 ${className}`}>
      <MapContainer center={[center.lat, center.lng]} zoom={position ? 14 : 12} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToPlace onPick={onChange} />
        <RecenterOnChange position={position} />
        {position && (
          <Marker
            position={[position.lat, position.lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat: dLat, lng: dLng } = e.target.getLatLng();
                onChange({ lat: dLat, lng: dLng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationPicker;
