import * as Location from 'expo-location';

/*
 * One way to read the phone's position for every hotel wizard.
 *
 * The wizards each asked for Accuracy.High with a 15 s cut-off. Indoors (where
 * a partner usually fills the form) a high-accuracy fix often never arrives,
 * so "Use current location" just timed out. This asks for a Balanced fix and
 * falls back to the last known position, which is what a location picker
 * needs: the street, not the metre.
 *
 * Throws an Error with .code 1 (permission), 2 (unavailable) or 3 (timeout).
 */
export async function getDeviceCoordinates({ timeoutMs = 20000 } = {}) {
  let perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw Object.assign(new Error('Location permission denied. Please enable it in device settings.'), { code: 1 });

  if (!(await Location.hasServicesEnabledAsync().catch(() => true))) {
    throw Object.assign(new Error('Location is turned off. Turn on GPS and try again.'), { code: 2 });
  }

  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 }).catch(() => null);

  let timer;
  try {
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('Location request timed out.'), { code: 3 })), timeoutMs);
      }),
    ]);
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  } catch (err) {
    if (lastKnown?.coords) return { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude, accuracy: lastKnown.coords.accuracy };
    if (typeof err?.code === 'number') throw err;
    throw Object.assign(new Error('Location unavailable. Check your GPS/network.'), { code: 2 });
  } finally {
    clearTimeout(timer);
  }
}

export default getDeviceCoordinates;
