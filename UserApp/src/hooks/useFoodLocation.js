/**
 * Pragmatic RN port of Frontend/src/modules/Food/hooks/useLocation.jsx.
 *
 * The web hook is ~1900 lines, almost all of it defensive machinery for a
 * browser's unreliable Geolocation API: multiple reverse-geocoding fallback
 * providers, retry/backoff chains, a "new app session" flag to show a
 * location prompt once per session, and `window` event dispatch so every
 * mounted instance of the hook (navbar, Home, address selector) stays in
 * sync. RN's native geolocation is materially more reliable, and this app
 * already has a proven GPS + reverse-geocode pattern (Taxi's
 * LocationMapSection.jsx / googlePlaces.js) plus a cross-instance sync
 * mechanism (DeviceEventEmitter, already wired through FoodProfileContext's
 * setDefaultAddress — see that file). This hook keeps the same external
 * shape Home.jsx needs (`location`, `loading`, `requestLocation`) and the
 * same storage keys/semantics (`userLocation`, `deliveryAddressMode`), so
 * it plugs into the rest of the Food port unchanged; what's dropped is the
 * browser-specific retry/session scaffolding, not the behavior.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import {reverseGeocode} from '../utils/googlePlaces';
import {removePlusCode} from '../utils/foodCommon';

async function requestLocationPermission() {
  try {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Location access',
      message: 'We use your location to show restaurants that deliver to you.',
      buttonPositive: 'Allow',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

const getDeviceCoords = () =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve({latitude: position.coords.latitude, longitude: position.coords.longitude}),
      error => reject(error),
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  });

const buildLocationFromAddressParts = (coords, parts) => {
  const resolvedAddress = parts.length > 0 ? parts.join(', ') : '';
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    address: resolvedAddress,
    formattedAddress: resolvedAddress,
    area: parts[0] || '',
    city: '',
    state: '',
    pincode: '',
  };
};

async function resolveFromSavedAddress() {
  try {
    const [mode, addressesRaw] = await AsyncStorage.multiGet(['deliveryAddressMode', 'userAddresses']);
    if (mode[1] !== 'saved') return null;
    const addresses = JSON.parse(addressesRaw[1] || '[]');
    const defaultAddress = (Array.isArray(addresses) ? addresses : []).find(a => a.isDefault) || addresses?.[0];
    if (!defaultAddress) return null;

    const coordinates = defaultAddress?.location?.coordinates;
    const lng = Array.isArray(coordinates) ? Number(coordinates[0]) : null;
    const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : null;
    const latitude = Number.isFinite(lat) ? lat : Number(defaultAddress?.latitude ?? defaultAddress?.lat);
    const longitude = Number.isFinite(lng) ? lng : Number(defaultAddress?.longitude ?? defaultAddress?.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const parts = [defaultAddress?.additionalDetails, defaultAddress?.street, defaultAddress?.city, defaultAddress?.state, defaultAddress?.zipCode].filter(Boolean);
    const resolvedAddress = parts.length > 0 ? parts.join(', ') : defaultAddress?.formattedAddress || defaultAddress?.address || '';

    return {
      latitude,
      longitude,
      address: resolvedAddress,
      formattedAddress: resolvedAddress,
      area: defaultAddress?.additionalDetails || defaultAddress?.street || defaultAddress?.area || '',
      city: defaultAddress?.city || '',
      state: defaultAddress?.state || '',
      pincode: defaultAddress?.zipCode || '',
    };
  } catch {
    return null;
  }
}

/** Dedupes the web hook's "new app session -> auto GPS fetch" behavior across every mounted instance (e.g. Delivery + Takeaway Home screens mounted side by side), so only one GPS prompt fires per app session instead of one per screen. */
let hasAutoRequestedThisSession = false;

export function useFoodLocation() {
  const [geoLocation, setGeoLocation] = useState(null);
  const [effectiveLocation, setEffectiveLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const isHydratingSavedRef = useRef(false);

  const applyAddressModeOverride = useCallback(async baseLocation => {
    if (isHydratingSavedRef.current) return;
    isHydratingSavedRef.current = true;
    try {
      const saved = await resolveFromSavedAddress();
      setEffectiveLocation(saved || baseLocation);
    } finally {
      isHydratingSavedRef.current = false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('userLocation');
        const parsed = cached ? JSON.parse(cached) : null;
        setGeoLocation(parsed);
        await applyAddressModeOverride(parsed);
      } catch {
        // ignore
      } finally {
        setIsHydrated(true);
      }
    })();
  }, [applyAddressModeOverride]);

  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener('userLocationUpdated', () => {
        AsyncStorage.getItem('userLocation').then(raw => {
          try {
            const parsed = raw ? JSON.parse(raw) : null;
            setGeoLocation(parsed);
            applyAddressModeOverride(parsed);
          } catch {
            // ignore
          }
        });
      }),
      DeviceEventEmitter.addListener('deliveryAddressModeUpdated', () => {
        applyAddressModeOverride(geoLocation);
      }),
    ];
    return () => subs.forEach(s => s.remove());
  }, [applyAddressModeOverride, geoLocation]);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await AsyncStorage.setItem('deliveryAddressMode', 'current');
      DeviceEventEmitter.emit('deliveryAddressModeUpdated');

      const hasPermission = await requestLocationPermission();
      setPermissionGranted(hasPermission);
      if (!hasPermission) throw new Error('Location permission denied');

      const coords = await getDeviceCoords();
      const address = removePlusCode(await reverseGeocode(coords.latitude, coords.longitude));
      const nextLocation = buildLocationFromAddressParts(coords, [address].filter(Boolean));

      await AsyncStorage.setItem('userLocation', JSON.stringify(nextLocation));
      setGeoLocation(nextLocation);
      await applyAddressModeOverride(nextLocation);
      DeviceEventEmitter.emit('userLocationUpdated', {location: nextLocation});

      return nextLocation;
    } catch (err) {
      setError(err?.message || 'Failed to get location');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [applyAddressModeOverride]);

  /** Web's "new app session -> force a live GPS fetch" behavior, deduped across every mounted instance (see `hasAutoRequestedThisSession` above) so it fires once per app session, not once per Home tab. */
  useEffect(() => {
    if (!isHydrated || geoLocation || hasAutoRequestedThisSession) return;
    hasAutoRequestedThisSession = true;
    requestLocation().catch(() => {});
  }, [isHydrated, geoLocation, requestLocation]);

  return {
    location: effectiveLocation,
    geoLocation,
    effectiveLocation,
    loading,
    error,
    permissionGranted,
    requestLocation,
  };
}

export default useFoodLocation;
