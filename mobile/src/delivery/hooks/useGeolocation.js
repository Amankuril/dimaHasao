import * as Location from 'expo-location';

/*
 * navigator.geolocation.getCurrentPosition / watchPosition on expo-location.
 * Callbacks receive the browser's { coords: { latitude, longitude, heading,
 * speed, accuracy } } shape so the ported effects read it unchanged.
 */

async function ensurePermission() {
  const cur = await Location.getForegroundPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const req = await Location.requestForegroundPermissionsAsync();
  return req.granted;
}

const accuracyFor = (opts) => (opts?.enableHighAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced);

export function getCurrentPosition(onSuccess, onError, opts = {}) {
  let done = false;
  const timer = opts.timeout
    ? setTimeout(() => {
        if (!done) {
          done = true;
          onError?.({ code: 3, message: 'Timeout' });
        }
      }, opts.timeout)
    : null;
  (async () => {
    try {
      if (!(await ensurePermission())) throw Object.assign(new Error('Permission denied'), { code: 1 });
      const pos = await Location.getCurrentPositionAsync({ accuracy: accuracyFor(opts) });
      if (!done) {
        done = true;
        onSuccess?.(pos);
      }
    } catch (e) {
      if (!done) {
        done = true;
        onError?.(e);
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();
}

/** Returns a clear() function (navigator.geolocation.clearWatch). */
export function watchPosition(onSuccess, onError, opts = {}) {
  let sub = null;
  let cancelled = false;
  (async () => {
    try {
      if (!(await ensurePermission())) throw Object.assign(new Error('Permission denied'), { code: 1 });
      const s = await Location.watchPositionAsync(
        { accuracy: accuracyFor(opts), timeInterval: 1000, distanceInterval: 0 },
        (pos) => onSuccess?.(pos),
        (reason) => onError?.({ message: reason }),
      );
      if (cancelled) s.remove();
      else sub = s;
    } catch (e) {
      if (!cancelled) onError?.(e);
    }
  })();
  return () => {
    cancelled = true;
    sub?.remove();
  };
}
