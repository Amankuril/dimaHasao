import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getLastWriteAt } from '../api/client';
import { readCache, writeCache } from './cache';

/*
 * useAsync(fn, deps, { refetchOnFocus, cacheKey })
 * -> { data, error, loading, stale, cachedAt, reload, setData }
 *
 * fn receives an AbortSignal. Only the newest call may write state; older
 * ones are aborted. With cacheKey the last good result paints first and
 * stays (stale: true) if the network fails. Never pass cacheKey for data
 * that seeds an edit form.
 */
export function useAsync(fn, deps = [], { refetchOnFocus = false, cacheKey } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true, stale: false, cachedAt: null });
  const ctrlRef = useRef(null);
  const reqId = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const loadedAt = useRef(0);

  const run = useCallback(
    async ({ silent = false } = {}) => {
      ctrlRef.current?.abort();
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      const id = ++reqId.current;
      if (!silent) setState((s) => ({ ...s, loading: s.data === undefined, error: null }));
      try {
        const data = await fnRef.current(ctrl.signal);
        if (id !== reqId.current) return;
        loadedAt.current = Date.now();
        setState({ data, error: null, loading: false, stale: false, cachedAt: null });
        if (cacheKey) writeCache(cacheKey, data);
      } catch (error) {
        if (id !== reqId.current || ctrl.signal.aborted) return;
        setState((s) => ({ ...s, error, loading: false, stale: s.data !== undefined }));
      }
    },
    [cacheKey],
  );

  useEffect(() => {
    let alive = true;
    if (cacheKey) {
      readCache(cacheKey).then((entry) => {
        if (alive && entry) {
          setState((s) => (s.data === undefined ? { ...s, data: entry.data, loading: false, stale: true, cachedAt: entry.at } : s));
        }
      });
    }
    run();
    return () => {
      alive = false;
      ctrlRef.current?.abort();
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus || !loadedAt.current) return;
      // Refetch only when something may have changed since the last load.
      if (getLastWriteAt() > loadedAt.current) run({ silent: true });
    }, [refetchOnFocus, run]),
  );

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}
