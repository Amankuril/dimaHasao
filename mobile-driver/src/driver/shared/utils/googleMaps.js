/* Port of Taxi/modules/admin/utils/googleMaps.js (no JS loader on native; maps are react-native-maps). */
export const GOOGLE_MAPS_API_KEY = String(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '')
  .trim()
  .replace(/^['"]|['"]$/g, '');

export const HAS_VALID_GOOGLE_MAPS_KEY = GOOGLE_MAPS_API_KEY !== '' && GOOGLE_MAPS_API_KEY !== 'your-google-maps-browser-key';

export const DISTRICT_CENTER = { lat: 25.1667, lng: 93.0167 }; // Haflong

export const getLatLng = (source, fallback = DISTRICT_CENTER) => {
  const lat = Number(source?.lat ?? source?.latitude);
  const lng = Number(source?.lng ?? source?.longitude ?? source?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return fallback;
};

/** The web loads the Maps JS SDK asynchronously; native maps need no loader. */
export const useBaseGoogleMapsLoader = () => ({ isLoaded: true, loadError: undefined });
export const usePlacesGoogleMapsLoader = useBaseGoogleMapsLoader;
export const useDrawingGoogleMapsLoader = useBaseGoogleMapsLoader;
export const useAppGoogleMapsLoader = useBaseGoogleMapsLoader;
