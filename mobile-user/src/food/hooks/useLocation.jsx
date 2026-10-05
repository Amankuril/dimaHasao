import { useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import apiClient from '../../api/client';
import { geocodeAPI } from '../../api/food';
import { useProfile } from '../context/ProfileContext';
import { persistFoodUserLocation } from '../../shared/utils/sharedUserLocation';
import { localStore, sessionStore } from '../../lib/storage';
import { events } from '../../lib/events';

/*
 * Native port of Frontend/src/modules/Food/hooks/useLocation.jsx.
 *
 * Same contract as the web hook: it returns
 *   { location, geoLocation, effectiveLocation, loading, error, permissionGranted,
 *     requestLocation, requestLocationFast, startWatchingLocation, stopWatchingLocation }
 * keeps the selected location in storage under `userLocation`, the address
 * mode under `deliveryAddressMode`, and announces changes with the
 * `userLocationUpdated` / `deliveryAddressModeUpdated` events.
 *
 * What changed is only the source of the fix: expo-location (foreground)
 * instead of navigator.geolocation. Reverse geocoding is the web's: the
 * backend's Google proxy first, BigDataCloud as the fallback.
 */

let globalCustomizationSettings = null;
let customizationFetchPromise = null;

const loadCustomizationSettings = async () => {
  if (globalCustomizationSettings) return globalCustomizationSettings;
  if (customizationFetchPromise) return customizationFetchPromise;

  try {
    const saved = localStore.getItem('helloparth_customization_settings');
    if (saved) globalCustomizationSettings = JSON.parse(saved);
  } catch {
    /* ignore */
  }

  // Fetch in the background to update.
  customizationFetchPromise = (async () => {
    try {
      const response = await apiClient.get('/food/public/customization-settings');
      const settings = response?.data?.data || response?.data;
      if (settings) {
        globalCustomizationSettings = settings;
        localStore.setItem('helloparth_customization_settings', JSON.stringify(settings));
        events.emit('customizationSettingsLoaded');
        return settings;
      }
    } catch {
      /* keep what we have */
    } finally {
      customizationFetchPromise = null;
    }
    return globalCustomizationSettings || {};
  })();

  return globalCustomizationSettings || customizationFetchPromise;
};

// Reverse geocoding is rate-limited across every component that mounts the hook.
const GLOBAL_GEOCODE_MIN_INTERVAL_MS = 60_000;
const GLOBAL_GEOCODE_REUSE_DISTANCE_METERS = 75;
const geoDistanceMeters = (lat1, lng1, lat2, lng2) => {
  if (typeof lat1 !== 'number' || typeof lng1 !== 'number' || typeof lat2 !== 'number' || typeof lng2 !== 'number') {
    return Number.POSITIVE_INFINITY;
  }
  const latDiff = lat2 - lat1;
  const lngDiff = lng2 - lng1;
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111320;
};

let globalReverseGeocodeInFlight = null;
let globalReverseGeocodeLastStartAt = 0;
let globalReverseGeocodeLastCoords = { latitude: null, longitude: null };
let globalReverseGeocodeLastSuccess = null;

// --- Global loading state shared by every mounted hook ---
let globalLocationLoading = false;
const loadingListeners = new Set();
const setGlobalLocationLoading = (isLoading) => {
  globalLocationLoading = isLoading;
  loadingListeners.forEach((listener) => listener(isLoading));
};

const SERVICE_CITIES = ['Indore', 'Bhopal', 'Ujjain', 'Dewas', 'Mhow', 'Pithampur', 'Rau'];

/** Prefer a known service city over a village/locality name. */
export function resolveServiceCity({ locality = '', adminArea2 = '', formattedAddress = '', fallback = 'Indore' } = {}) {
  const findKnown = (text) => {
    const match = String(text || '').match(new RegExp(`\\b(${SERVICE_CITIES.join('|')})\\b`, 'i'));
    if (!match) return '';
    const hit = match[1];
    return SERVICE_CITIES.find((city) => city.toLowerCase() === hit.toLowerCase()) || hit;
  };

  const fromFormatted = findKnown(formattedAddress);
  if (fromFormatted) return fromFormatted;

  const localityTrim = String(locality || '').trim();
  if (localityTrim) {
    const knownLocality = SERVICE_CITIES.find((city) => city.toLowerCase() === localityTrim.toLowerCase());
    if (knownLocality) return knownLocality;
  }

  const fromAdmin = findKnown(adminArea2);
  if (fromAdmin) return fromAdmin;

  return localityTrim || fallback;
}

const reverseGeocodeDirect = async (latitude, longitude) => {
  const now = Date.now();
  const movedMeters = geoDistanceMeters(globalReverseGeocodeLastCoords.latitude, globalReverseGeocodeLastCoords.longitude, latitude, longitude);
  const timeSinceLastStart = now - globalReverseGeocodeLastStartAt;

  // A nearby point geocoded recently: reuse it (no network).
  if (globalReverseGeocodeLastSuccess && movedMeters < GLOBAL_GEOCODE_REUSE_DISTANCE_METERS && timeSinceLastStart < GLOBAL_GEOCODE_MIN_INTERVAL_MS) {
    return globalReverseGeocodeLastSuccess;
  }

  if (globalReverseGeocodeInFlight && movedMeters < GLOBAL_GEOCODE_REUSE_DISTANCE_METERS) {
    try {
      return await globalReverseGeocodeInFlight;
    } catch {
      // fall through to a fresh attempt
    }
  }

  globalReverseGeocodeLastStartAt = now;
  globalReverseGeocodeLastCoords = { latitude, longitude };

  const run = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`, {
        signal: controller.signal,
      });
      const data = await res.json();

      const formattedAddress = data.formattedAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      const addrParts = formattedAddress.split(',').map((p) => p.trim()).filter(Boolean);

      let area = data.subLocality || '';
      if (!area && data.localityInfo?.informative) {
        const infoArea = data.localityInfo.informative.find(
          (i) => i.description?.toLowerCase().includes('sublocality') || i.description?.toLowerCase().includes('neighborhood'),
        );
        if (infoArea) area = infoArea.name;
      }

      if (!area && addrParts.length >= 1) {
        // The first part that is not the city or the state.
        const cityLower = (data.city || data.locality || '').toLowerCase();
        const stateLower = (data.principalSubdivision || '').toLowerCase();
        for (const part of addrParts) {
          const partLower = part.toLowerCase();
          if (partLower !== cityLower && partLower !== stateLower && !/^-?\d/.test(part) && part.length > 2) {
            area = part;
            break;
          }
        }
      }

      const city = resolveServiceCity({
        locality: data.city || data.locality || '',
        adminArea2: Array.isArray(data?.localityInfo?.administrative)
          ? data.localityInfo.administrative.find((entry) => {
              const desc = String(entry?.description || '').toLowerCase();
              return desc.includes('city') || desc.includes('district') || desc.includes('municipality') || desc.includes('order3') || desc.includes('order 3');
            })?.name || ''
          : '',
        formattedAddress,
        fallback: addrParts.length > 1 ? addrParts[addrParts.length - 2] : 'Indore',
      });

      const localityName = String(data.locality || data.city || '').trim();
      if (!area && localityName && localityName.toLowerCase() !== String(city).toLowerCase()) area = localityName;

      const value = {
        city,
        state: data.principalSubdivision || (addrParts.length > 0 ? addrParts[addrParts.length - 1] : ''),
        country: data.countryName || '',
        area,
        mainTitle: area || city,
        address: formattedAddress,
        formattedAddress,
      };

      globalReverseGeocodeLastSuccess = value;
      return value;
    } catch {
      // Failures are not cached as success, but something usable is returned.
      return {
        city: 'Current Location',
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        formattedAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      };
    } finally {
      clearTimeout(timer);
      globalReverseGeocodeInFlight = null;
    }
  })();

  globalReverseGeocodeInFlight = run;
  return run;
};

/** Reverse geocode through the backend proxy (the Maps key stays on the server). */
const reverseGeocodeWithGoogleMaps = async (latitude, longitude) => {
  try {
    const response = await geocodeAPI.reverse(latitude, longitude, {}, { timeout: 3000 });
    const data = response?.data?.data;

    if (data?.status !== 'OK' || !data.results || data.results.length === 0) {
      return reverseGeocodeDirect(latitude, longitude);
    }

    // The first result is usually the most specific (premise / street address).
    const result = data.results[0];
    const components = result.address_components;
    const getComponent = (types) => {
      const comp = components.find((c) => types.some((t) => c.types.includes(t)));
      return comp ? comp.long_name : '';
    };

    const streetNumber = getComponent(['street_number']);
    const route = getComponent(['route']);
    const sublocality = getComponent(['sublocality_level_1']) || getComponent(['sublocality']);
    const neighborhood = getComponent(['neighborhood']);
    const locality = getComponent(['locality']);
    const adminArea2 = getComponent(['administrative_area_level_2']);
    const state = getComponent(['administrative_area_level_1']);
    const country = getComponent(['country']);
    const pincode = getComponent(['postal_code']);

    const city = resolveServiceCity({ locality, adminArea2, formattedAddress: result.formatted_address, fallback: 'Indore' });

    let area = sublocality || neighborhood || '';
    if (!area && locality && locality.toLowerCase() !== String(city).toLowerCase()) area = locality;

    const premise = getComponent(['premise']) || getComponent(['subpremise']) || getComponent(['point_of_interest']);

    const addressParts = [];
    if (premise) addressParts.push(premise);
    if (streetNumber && route) addressParts.push(`${streetNumber}, ${route}`);
    else if (route) addressParts.push(route);
    if (area) addressParts.push(area);

    const displayAddress = addressParts.join(', ') || result.formatted_address.split(',')[0];

    return {
      city: city || 'Indore',
      state,
      country,
      area,
      pincode,
      mainTitle: area || city,
      address: displayAddress,
      formattedAddress: result.formatted_address,
      premise: premise || '',
      streetNumber,
      route,
      placeId: result.place_id,
    };
  } catch {
    return reverseGeocodeDirect(latitude, longitude);
  }
};

// The web's temporary default pin, used only when the admin's
// `default_location_enabled` customization setting is on.
const TEMPORARY_DEFAULT_INDORE_LOCATION = {
  latitude: 22.7533,
  longitude: 75.8937,
  city: 'Indore',
  state: 'Madhya Pradesh',
  country: 'India',
  area: 'Vijay Nagar',
  address: 'Vijay Nagar, Indore, Madhya Pradesh',
  formattedAddress: 'Vijay Nagar, Indore, Madhya Pradesh',
};

export const isPlaceholderLocation = (loc) => {
  if (!loc || typeof loc !== 'object') return true;
  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  const formatted = String(loc.formattedAddress || '').trim().toLowerCase();
  const address = String(loc.address || '').trim().toLowerCase();
  const city = String(loc.city || '').trim().toLowerCase();
  if (formatted === 'select location' || address === 'select location') return true;
  if (city === 'current location' || city === 'select location') return true;
  return false;
};

export const hasValidStoredUserLocation = () => {
  try {
    const raw = localStore.getItem('userLocation');
    if (!raw) return false;
    return !isPlaceholderLocation(JSON.parse(raw));
  } catch {
    return false;
  }
};

const defaultModeEnabled = () => {
  try {
    const saved = localStore.getItem('helloparth_customization_settings');
    return saved ? JSON.parse(saved).default_location_enabled === true : false;
  } catch {
    return false;
  }
};

let pageLoadAutoRefreshStarted = false;
let appOpenBootstrapped = false;
let autoLocationRefreshInFlight = null;
const AUTO_LOCATION_REFRESH_COOLDOWN_MS = 15_000;
let lastAutoLocationRefreshAt = 0;

export const LOCATION_APP_SESSION_KEY = 'helloparth_location_session';

/**
 * Web: a reload keeps the selected address, a fresh tab forces current GPS.
 * An app launch is the fresh tab: the first hook of the process sets the
 * mode to "current".
 */
function bootstrapLocationModeOnAppOpen() {
  if (appOpenBootstrapped) return { isNewAppSession: true };
  appOpenBootstrapped = true;
  sessionStore.setItem(LOCATION_APP_SESSION_KEY, '1');
  localStore.setItem('deliveryAddressMode', 'current');
  loadCustomizationSettings();
  return { isNewAppSession: true };
}

const runDedupedAutoRefresh = (refreshFn) => {
  const now = Date.now();
  if (now - lastAutoLocationRefreshAt < AUTO_LOCATION_REFRESH_COOLDOWN_MS && autoLocationRefreshInFlight) {
    return autoLocationRefreshInFlight;
  }
  lastAutoLocationRefreshAt = now;
  autoLocationRefreshInFlight = Promise.resolve(refreshFn()).finally(() => {
    autoLocationRefreshInFlight = null;
  });
  return autoLocationRefreshInFlight;
};

const withTimeout = (promise, ms, message = 'Location request timed out') =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(message);
      err.code = 3; // GeolocationPositionError.TIMEOUT
      reject(err);
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });

/** Ask for foreground location; rejects like a PERMISSION_DENIED position error. */
async function ensurePermission({ ask = true } = {}) {
  let perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted && ask && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) {
    const err = new Error('Location permission denied');
    err.code = 1;
    throw err;
  }
  return true;
}

/** High accuracy first, lower accuracy on timeout (the web's retry). */
async function getPosition({ forceFresh = false } = {}) {
  if (!forceFresh) {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 120000 }).catch(() => null);
    if (last) return last;
  }
  try {
    return await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), forceFresh ? 15000 : 10000);
  } catch (err) {
    if (err?.code !== 3) throw err;
    return withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), forceFresh ? 12000 : 8000);
  }
}

async function resolveAddress(latitude, longitude) {
  let addr;
  try {
    addr = await reverseGeocodeWithGoogleMaps(latitude, longitude);
  } catch {
    addr = await reverseGeocodeDirect(latitude, longitude);
  }
  return {
    ...addr,
    city: resolveServiceCity({ locality: addr?.city || '', formattedAddress: addr?.formattedAddress || addr?.address || '', fallback: addr?.city || 'Indore' }),
  };
}

export function useLocation() {
  // Must run before the addressMode state initialises.
  const { isNewAppSession } = bootstrapLocationModeOnAppOpen();

  const [isDefaultLocationMode, setIsDefaultLocationMode] = useState(defaultModeEnabled);

  const [location, setLocation] = useState(() => {
    try {
      const cached = localStore.getItem('userLocation');
      if (cached) return JSON.parse(cached);
    } catch {
      /* fall through */
    }
    return defaultModeEnabled() ? TEMPORARY_DEFAULT_INDORE_LOCATION : null;
  });
  const [loading, setLoading] = useState(globalLocationLoading);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const watchRef = useRef(null);

  useEffect(() => {
    const handleSettingsLoaded = () => {
      try {
        const saved = localStore.getItem('helloparth_customization_settings');
        if (!saved) return;
        const enabled = JSON.parse(saved).default_location_enabled === true;
        setIsDefaultLocationMode(enabled);
        if (!enabled) {
          // The default pin must not survive the mode being switched off.
          const currentStored = localStore.getItem('userLocation');
          if (currentStored) {
            const parsed = JSON.parse(currentStored);
            if (parsed?.latitude === TEMPORARY_DEFAULT_INDORE_LOCATION.latitude && parsed?.longitude === TEMPORARY_DEFAULT_INDORE_LOCATION.longitude) {
              localStore.removeItem('userLocation');
              setLocation(null);
            }
          }
        }
      } catch {
        /* ignore */
      }
    };
    events.on('customizationSettingsLoaded', handleSettingsLoaded);
    handleSettingsLoaded();
    return () => events.off('customizationSettingsLoaded', handleSettingsLoaded);
  }, []);

  useEffect(() => {
    loadingListeners.add(setLoading);
    return () => loadingListeners.delete(setLoading);
  }, []);

  const stopWatchingLocation = () => {
    watchRef.current?.remove?.();
    watchRef.current = null;
  };

  /** Read GPS, resolve the address, persist and announce it. */
  const getLocation = async (forceFresh = false, showLoading = false, { ask = true } = {}) => {
    if (showLoading) setGlobalLocationLoading(true);
    try {
      await ensurePermission({ ask });
      setPermissionGranted(true);
      const pos = await getPosition({ forceFresh });
      const { latitude, longitude, accuracy } = pos.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Invalid coordinates');

      const addr = await resolveAddress(latitude, longitude);
      const finalLoc = { ...addr, latitude, longitude, accuracy: accuracy ?? null };
      persistFoodUserLocation(finalLoc);
      setLocation(finalLoc);
      return finalLoc;
    } finally {
      if (showLoading) setGlobalLocationLoading(false);
    }
  };

  /** Refresh without prompting: only when the permission is already there. */
  const refreshLocationIfPermitted = async ({ showLoading = false } = {}) => {
    try {
      return await getLocation(false, showLoading, { ask: false });
    } catch {
      return null;
    }
  };

  const requestLocation = async () => {
    setGlobalLocationLoading(true);
    setError(null);
    try {
      localStore.setItem('deliveryAddressMode', 'current');
      events.emit('deliveryAddressModeUpdated');

      // Clear the cached pin so a fresh fix replaces it.
      localStore.removeItem('userLocation');
      const loc = await getLocation(true, true);
      events.emit('userLocationUpdated');
      return loc;
    } catch (err) {
      setError(err.message || 'Failed to get location');
      throw err;
    } finally {
      setGlobalLocationLoading(false);
    }
  };

  /** Fast path for the address selector's "Use current location". */
  const requestLocationFast = async () => {
    setError(null);
    try {
      localStore.setItem('deliveryAddressMode', 'current');
      events.emit('deliveryAddressModeUpdated');

      await ensurePermission();
      let pos = await Location.getLastKnownPositionAsync({ maxAge: 30000 }).catch(() => null);
      if (!pos) {
        try {
          pos = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 6000);
        } catch {
          pos = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 10000);
        }
      }

      const { latitude, longitude, accuracy } = pos.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Invalid coordinates');

      const addr = await resolveAddress(latitude, longitude);
      const finalLoc = { ...addr, latitude, longitude, accuracy: accuracy ?? null };
      persistFoodUserLocation(finalLoc);
      setLocation(finalLoc);
      setPermissionGranted(true);
      events.emit('userLocationUpdated');
      return finalLoc;
    } catch (err) {
      setError(err.message || 'Failed to get location');
      throw err;
    }
  };

  /** Live GPS: coordinates only; the address is not re-resolved on every tick. */
  const startWatchingLocation = async () => {
    if (watchRef.current) return;
    try {
      await ensurePermission();
      watchRef.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 }, (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocation((prev) => ({ ...(prev || {}), latitude, longitude, accuracy: accuracy ?? null }));
      });
    } catch (err) {
      setError(err.message || 'Failed to watch location');
    }
  };

  useEffect(() => {
    // Safety: never leave the loading flag up when a fix cannot be had.
    const loadingTimeout = setTimeout(() => {
      setLoading((currentLoading) => {
        if (currentLoading) {
          setLocation((currentLocation) => {
            if (!currentLocation || (currentLocation.formattedAddress === 'Select location' && !currentLocation.latitude && !currentLocation.city)) {
              return isDefaultLocationMode ? TEMPORARY_DEFAULT_INDORE_LOCATION : { city: 'Select location', address: 'Select location', formattedAddress: 'Select location' };
            }
            return currentLocation;
          });
        }
        return false;
      });
    }, 5000);

    // App open: force current GPS once for the whole process.
    if (!isDefaultLocationMode && isNewAppSession) {
      if (!pageLoadAutoRefreshStarted) {
        pageLoadAutoRefreshStarted = true;
        sessionStore.setItem('manual_location_update', 'true');
        localStore.setItem('deliveryAddressMode', 'current');
        events.emit('deliveryAddressModeUpdated');
        runDedupedAutoRefresh(() => requestLocation().catch(() => refreshLocationIfPermitted({ showLoading: true })));
      }
    } else {
      setLoading(false);
    }

    // Keep every mounted hook in step with the stored location.
    const handleCustomUpdate = () => {
      const stored = localStore.getItem('userLocation');
      if (!stored) return;
      try {
        setLocation(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    };
    events.on('userLocationUpdated', handleCustomUpdate);

    // One automatic fetch after a login.
    const handleLoginSuccess = () => {
      if (isDefaultLocationMode) return;
      if (sessionStore.getItem('lastLoginLocationFetch')) return;
      sessionStore.setItem(LOCATION_APP_SESSION_KEY, '1');
      localStore.setItem('deliveryAddressMode', 'current');
      events.emit('deliveryAddressModeUpdated');
      setTimeout(() => {
        requestLocation()
          .then(() => sessionStore.setItem('lastLoginLocationFetch', 'true'))
          .catch(() => {});
      }, 1000);
    };
    events.on('userLoginSuccess', handleLoginSuccess);

    return () => {
      clearTimeout(loadingTimeout);
      stopWatchingLocation();
      events.off('userLocationUpdated', handleCustomUpdate);
      events.off('userLoginSuccess', handleLoginSuccess);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { getDefaultAddress } = useProfile();
  const defaultSavedAddress = getDefaultAddress?.() || null;

  const defaultSavedAddressLocation = useMemo(() => {
    if (!defaultSavedAddress) return null;
    const coordinates = defaultSavedAddress?.location?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const lng = parseFloat(coordinates[0]);
      const lat = parseFloat(coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };
    }
    const lat = parseFloat(defaultSavedAddress?.latitude || defaultSavedAddress?.lat);
    const lng = parseFloat(defaultSavedAddress?.longitude || defaultSavedAddress?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { latitude: lat, longitude: lng };
    return null;
  }, [defaultSavedAddress]);

  const [addressMode, setAddressMode] = useState(() => localStore.getItem('deliveryAddressMode') || 'current');

  useEffect(() => {
    const handleModeUpdate = () => setAddressMode(localStore.getItem('deliveryAddressMode') || 'current');
    events.on('userLocationUpdated', handleModeUpdate);
    events.on('deliveryAddressModeUpdated', handleModeUpdate);
    return () => {
      events.off('userLocationUpdated', handleModeUpdate);
      events.off('deliveryAddressModeUpdated', handleModeUpdate);
    };
  }, []);

  const effectiveLocation = useMemo(() => {
    if (addressMode === 'current') return location;

    if (defaultSavedAddressLocation && Number.isFinite(defaultSavedAddressLocation.latitude) && Number.isFinite(defaultSavedAddressLocation.longitude)) {
      const parts = [
        defaultSavedAddress?.additionalDetails,
        defaultSavedAddress?.street,
        defaultSavedAddress?.city,
        defaultSavedAddress?.state,
        defaultSavedAddress?.zipCode,
      ].filter(Boolean);
      const resolvedAddress = parts.length > 0 ? parts.join(', ') : defaultSavedAddress?.formattedAddress || defaultSavedAddress?.address || '';

      return {
        ...(location || {}),
        latitude: defaultSavedAddressLocation.latitude,
        longitude: defaultSavedAddressLocation.longitude,
        area: defaultSavedAddress?.additionalDetails || defaultSavedAddress?.street || defaultSavedAddress?.area || '',
        city: defaultSavedAddress?.city || '',
        state: defaultSavedAddress?.state || '',
        address: resolvedAddress,
        formattedAddress: resolvedAddress,
        pincode: defaultSavedAddress?.zipCode || '',
      };
    }

    return location;
  }, [location, defaultSavedAddressLocation, addressMode, defaultSavedAddress]);

  return {
    location: effectiveLocation,
    geoLocation: location,
    effectiveLocation,
    loading,
    error,
    permissionGranted,
    requestLocation,
    requestLocationFast,
    startWatchingLocation,
    stopWatchingLocation,
  };
}
