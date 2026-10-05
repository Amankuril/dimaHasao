import { useCallback, useEffect, useMemo, useState } from 'react';
import { notificationApi } from '../../api/delivery';
import { getAuthToken } from '../../api/client';

// Port of Frontend/src/modules/Food/hooks/useNotificationInbox.js for module "delivery".

const normalizeInboxItems = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((item, index) => ({
    id: String(item?._id || item?.id || `broadcast-${index}`),
    source: 'broadcast',
    title: String(item?.title || 'Notification').trim(),
    message: String(item?.message || '').trim(),
    link: String(item?.link || '').trim(),
    read: Boolean(item?.isRead),
    createdAt: item?.createdAt || item?.updatedAt || new Date().toISOString(),
    category: String(item?.category || 'broadcast'),
  }));

const INBOX_MIN_FETCH_MS = 60_000;
const inboxSharedCache = new Map();
const inboxInflight = new Map();
const refreshListeners = new Set();

export const dispatchNotificationInboxRefresh = () => {
  inboxSharedCache.clear();
  refreshListeners.forEach((fn) => fn());
};

export default function useNotificationInbox(module, options = {}) {
  const enabled = options?.enabled !== false;
  const limit = options?.limit || 50;
  const cacheKey = `${module}:${limit || 50}`;

  const [items, setItems] = useState(() => inboxSharedCache.get(cacheKey)?.items || []);
  const [unreadCount, setUnreadCount] = useState(() => inboxSharedCache.get(cacheKey)?.unreadCount || 0);
  const [loading, setLoading] = useState(() => enabled && options?.autoload !== false && !inboxSharedCache.has(cacheKey));

  const fetchInbox = useCallback(
    async ({ force = false } = {}) => {
      if (!module || !enabled || !getAuthToken()) {
        setItems([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      const cached = inboxSharedCache.get(cacheKey);
      const isFresh = cached && Date.now() - (cached.fetchedAt || 0) < INBOX_MIN_FETCH_MS;
      if (!force && isFresh) {
        setItems(cached.items || []);
        setUnreadCount(Number(cached.unreadCount || 0));
        setLoading(false);
        return;
      }
      if (!force && inboxInflight.has(cacheKey)) {
        try {
          const payload = await inboxInflight.get(cacheKey);
          setItems(payload.items || []);
          setUnreadCount(Number(payload.unreadCount || 0));
        } catch {
          /* ignore */
        } finally {
          setLoading(false);
        }
        return;
      }
      try {
        if (!isFresh) setLoading(true);
        const request = notificationApi
          .getInbox({ page: 1, limit })
          .then((response) => {
            const payload = response?.data?.data || {};
            const normalized = {
              items: normalizeInboxItems(payload?.items),
              unreadCount: Number(payload?.unreadCount || 0),
              fetchedAt: Date.now(),
            };
            inboxSharedCache.set(cacheKey, normalized);
            return normalized;
          })
          .finally(() => inboxInflight.delete(cacheKey));
        inboxInflight.set(cacheKey, request);
        const payload = await request;
        setItems(payload.items);
        setUnreadCount(payload.unreadCount);
      } catch {
        setItems([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, enabled, limit, module],
  );

  useEffect(() => {
    if (!enabled || options?.autoload === false || !module) return;
    fetchInbox();
  }, [enabled, fetchInbox, module, options?.autoload]);

  useEffect(() => {
    const handler = () => fetchInbox({ force: true });
    refreshListeners.add(handler);
    return () => refreshListeners.delete(handler);
  }, [fetchInbox]);

  useEffect(() => {
    const pollMs = Number(options?.pollMs || 0);
    if (!enabled || !pollMs || pollMs < 1000 || !module) return undefined;
    const timer = setInterval(() => fetchInbox(), pollMs);
    return () => clearInterval(timer);
  }, [enabled, fetchInbox, module, options?.pollMs]);

  const markAsRead = useCallback(
    async (id) => {
      if (!id || !module) return;
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await notificationApi.markAsRead(id);
        const cached = inboxSharedCache.get(cacheKey);
        if (cached) {
          inboxSharedCache.set(cacheKey, {
            ...cached,
            items: cached.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
            unreadCount: Math.max(0, Number(cached.unreadCount || 0) - 1),
          });
        }
        dispatchNotificationInboxRefresh();
      } catch {
        fetchInbox({ force: true });
      }
    },
    [cacheKey, fetchInbox, module],
  );

  const dismiss = useCallback(
    async (id) => {
      if (!id || !module) return;
      const removed = items.find((item) => item.id === id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (removed && !removed.read) setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await notificationApi.dismiss(id);
        inboxSharedCache.delete(cacheKey);
        dispatchNotificationInboxRefresh();
      } catch {
        fetchInbox({ force: true });
      }
    },
    [cacheKey, fetchInbox, items, module],
  );

  const dismissAll = useCallback(async () => {
    if (!module) return;
    setItems([]);
    setUnreadCount(0);
    inboxSharedCache.delete(cacheKey);
    try {
      await notificationApi.dismissAll();
      dispatchNotificationInboxRefresh();
    } catch {
      fetchInbox({ force: true });
    }
  }, [cacheKey, fetchInbox, module]);

  return useMemo(
    () => ({ items, unreadCount, loading, refresh: () => fetchInbox({ force: true }), markAsRead, dismiss, dismissAll }),
    [dismiss, dismissAll, fetchInbox, items, loading, markAsRead, unreadCount],
  );
}
