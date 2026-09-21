import { useJsApiLoader } from '@react-google-maps/api';

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const HAS_VALID_GOOGLE_MAPS_KEY =
  typeof GOOGLE_MAPS_API_KEY === 'string' &&
  GOOGLE_MAPS_API_KEY.trim() !== '' &&
  GOOGLE_MAPS_API_KEY !== 'your-google-maps-browser-key';

/*
 * Every map in the taxi module opens here when it has nothing better to show.
 * These were the previous product's cities — the constant named DISTRICT_CENTER
 * held Indore's coordinates, and DISTRICT_CENTER Delhi's — so a district map with
 * no data yet opened 1,500 km away.
 */
export const DISTRICT_CENTER = { lat: 25.1667, lng: 93.0167 }; // Haflong
export const GOOGLE_MAPS_LOADER_ID = 'appzeto-google-maps';
export const GOOGLE_MAPS_LIBRARIES = ['drawing', 'places', 'routes'];

export const getLatLng = (source, fallback = DISTRICT_CENTER) => {
  const lat = Number(source?.lat ?? source?.latitude);
  const lng = Number(source?.lng ?? source?.longitude ?? source?.lon);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return fallback;
};

const useGoogleMapsLoader = () =>
  useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: HAS_VALID_GOOGLE_MAPS_KEY ? GOOGLE_MAPS_API_KEY : '',
    libraries: GOOGLE_MAPS_LIBRARIES,
    version: '3.64',
  });

export const useBaseGoogleMapsLoader = () => useGoogleMapsLoader();

export const usePlacesGoogleMapsLoader = () => useGoogleMapsLoader();

export const useDrawingGoogleMapsLoader = () => useGoogleMapsLoader();

export const useAppGoogleMapsLoader = useGoogleMapsLoader;
