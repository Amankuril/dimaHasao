import * as Location from 'expo-location';

/*
 * navigator.geolocation.getCurrentPosition(enableHighAccuracy, timeout, maximumAge) of the web's DriverHome /
 * DriverRideRequestListener, on expo-location (foreground only). Coordinates are [lng, lat] like the web's.
 * Rejections carry the web's own error copy (GeolocationPositionError codes 1 denied, 2 unavailable, 3 timeout).
 */
export const getGeoLocationErrorMessage = (error, { purpose = 'generic' } = {}) => {
  const code = Number(error?.code);

  if (code === 1) {
    return purpose === 'online'
      ? 'Please allow location permission to go online.'
      : 'Live location updates are paused. Please allow location permission.';
  }
  if (code === 2) {
    return 'Could not detect your current location.';
  }
  if (code === 3) {
    return purpose === 'online'
      ? 'Timed out while fetching your location. Please try again.'
      : 'Live location refresh timed out.';
  }
  return purpose === 'online'
    ? 'Could not fetch your location to go online.'
    : 'Could not update live location.';
};

const TIMEOUT_MS = 6000;
const MAXIMUM_AGE_MS = 10000;

export const getCurrentCoords = async ({ purpose = 'generic', timeout = TIMEOUT_MS } = {}) => {
  let code = 2;
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      code = 1;
      throw new Error('denied');
    }

    const cached = await Location.getLastKnownPositionAsync({ maxAge: MAXIMUM_AGE_MS }).catch(() => null);
    if (cached?.coords) return [cached.coords.longitude, cached.coords.latitude];

    let timer;
    const timedOut = new Promise((_, reject) => {
      timer = setTimeout(() => {
        code = 3;
        reject(new Error('timeout'));
      }, timeout);
    });
    try {
      const position = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), timedOut]);
      return [position.coords.longitude, position.coords.latitude];
    } finally {
      clearTimeout(timer);
    }
  } catch {
    throw new Error(getGeoLocationErrorMessage({ code }, { purpose }));
  }
};
