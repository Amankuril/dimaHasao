/**
 * Ported from Frontend/src/modules/Food/hooks/useZone.jsx. localStorage ->
 * AsyncStorage; the module-level cache/in-flight maps are unchanged (same
 * reasoning: many screens call useFoodZone(location), de-dupe the repeat
 * /food/zones/detect calls).
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {zoneApi} from '../services/food/locationApi';

const ZONE_CACHE_TTL_MS = 30 * 1000;
const zoneCache = new Map();
const zoneInFlight = new Map();

const roundCoord = (v, digits = 5) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const p = 10 ** digits;
  return Math.round(n * p) / p;
};

const zoneKeyFromCoords = (lat, lng) => {
  const rLat = roundCoord(lat, 5);
  const rLng = roundCoord(lng, 5);
  if (rLat === null || rLng === null) return null;
  return `${rLat},${rLng}`;
};

const applyZonePayload = async (data, {setZoneId, setZone, setZoneStatus}) => {
  if (data?.status === 'IN_SERVICE' && data.zoneId) {
    setZoneId(data.zoneId);
    setZone(data.zone || null);
    setZoneStatus('IN_SERVICE');
    await AsyncStorage.multiSet([
      ['userZoneId', data.zoneId],
      ['userZone', JSON.stringify(data.zone)],
      ['userZoneStatus', 'IN_SERVICE'],
    ]);
  } else {
    setZoneId(null);
    setZone(null);
    setZoneStatus('OUT_OF_SERVICE');
    await AsyncStorage.multiRemove(['userZoneId', 'userZone']);
    await AsyncStorage.setItem('userZoneStatus', 'OUT_OF_SERVICE');
  }
};

export function useFoodZone(location) {
  const [zoneId, setZoneId] = useState(null);
  const [zoneStatus, setZoneStatus] = useState('loading');
  const [zone, setZone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const prevCoordsRef = useRef({latitude: null, longitude: null});
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [storedZoneId, storedStatus, storedZone] = await AsyncStorage.multiGet(['userZoneId', 'userZoneStatus', 'userZone']);
      if (storedZoneId[1]) setZoneId(storedZoneId[1]);
      if (storedStatus[1]) setZoneStatus(storedStatus[1]);
      try {
        if (storedZone[1]) setZone(JSON.parse(storedZone[1]));
      } catch {
        // ignore
      }
      setIsHydrated(true);
    })();
  }, []);

  const detectZone = useCallback(async (lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setZoneStatus('OUT_OF_SERVICE');
      setZoneId(null);
      setZone(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const key = zoneKeyFromCoords(lat, lng);
      const now = Date.now();
      if (key) {
        const cached = zoneCache.get(key);
        if (cached && now - cached.ts < ZONE_CACHE_TTL_MS) {
          await applyZonePayload(cached.payload, {setZoneId, setZone, setZoneStatus});
          return;
        }
      }

      const promise = (() => {
        if (key && zoneInFlight.has(key)) return zoneInFlight.get(key);
        const p = zoneApi
          .detectZone(lat, lng)
          .then(response => {
            if (!response?.data?.success) throw new Error(response?.data?.message || 'Failed to detect zone');
            return response.data.data;
          })
          .finally(() => {
            if (key) zoneInFlight.delete(key);
          });
        if (key) zoneInFlight.set(key, p);
        return p;
      })();

      const data = await promise;
      if (key) zoneCache.set(key, {ts: now, payload: data});
      await applyZonePayload(data, {setZoneId, setZone, setZoneStatus});
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to detect zone');

      const cachedZoneId = await AsyncStorage.getItem('userZoneId');
      if (cachedZoneId) {
        const cachedZone = await AsyncStorage.getItem('userZone');
        setZoneId(cachedZoneId);
        try {
          setZone(cachedZone ? JSON.parse(cachedZone) : null);
        } catch {
          setZone(null);
        }
        setZoneStatus('IN_SERVICE');
      } else {
        setZoneStatus('loading');
        setZoneId(null);
        setZone(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const lat = roundCoord(location?.latitude, 5);
  const lng = roundCoord(location?.longitude, 5);
  const coordsChanged = prevCoordsRef.current.latitude !== lat || prevCoordsRef.current.longitude !== lng;

  useEffect(() => {
    if (!isHydrated) return;

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (coordsChanged) {
        prevCoordsRef.current = {latitude: lat, longitude: lng};
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => detectZone(lat, lng), 50);
      }
    } else {
      (async () => {
        const cachedZoneId = await AsyncStorage.getItem('userZoneId');
        if (cachedZoneId) {
          const [cachedZone, cachedStatus] = await Promise.all([AsyncStorage.getItem('userZone'), AsyncStorage.getItem('userZoneStatus')]);
          setZoneId(cachedZoneId);
          try {
            setZone(cachedZone ? JSON.parse(cachedZone) : null);
          } catch {
            setZone(null);
          }
          setZoneStatus(cachedStatus || 'IN_SERVICE');
        } else {
          setZoneStatus('loading');
          setZoneId(null);
          setZone(null);
        }
      })();
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [lat, lng, detectZone, coordsChanged, isHydrated]);

  const refreshZone = useCallback(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) detectZone(lat, lng);
  }, [lat, lng, detectZone]);

  return {
    zoneId,
    zone,
    zoneStatus,
    loading,
    error,
    isInService: zoneStatus === 'IN_SERVICE',
    isOutOfService: zoneStatus === 'OUT_OF_SERVICE',
    refreshZone,
  };
}

export default useFoodZone;
