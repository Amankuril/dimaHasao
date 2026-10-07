import { AsyncLocalStorage } from 'async_hooks';

/**
 * The request a piece of code is running for, without threading `req` through
 * every service call.
 *
 * Set once per request by requestIdMiddleware. Shared services that need to
 * know who is acting — the storage service deciding whether a file may be
 * deleted — read it here. Outside a request (startup, intervals, scripts)
 * there is no store, which callers treat as trusted server-side work.
 */
const storage = new AsyncLocalStorage();

export const runWithRequest = (req, fn) => storage.run({ req }, fn);

export const currentRequest = () => storage.getStore()?.req || null;

const ADMIN_ROLES = new Set(['ADMIN', 'SUB_ADMIN', 'SUBADMIN', 'SUPERADMIN', 'SUPER_ADMIN']);

/**
 * Who is acting, across the shapes each module's auth leaves on the request:
 * food `req.user.userId`, hotel/tours `req.user._id` (a document), taxi
 * `req.auth.sub`.
 *
 * @returns {null | { id: string|null, role: string, isAdmin: boolean, trusted: boolean }}
 *   null when not inside a request.
 */
export const currentActor = () => {
    const req = currentRequest();
    if (!req) return null;
    const rawId =
        req.user?.userId || req.user?._id || req.user?.id || req.auth?.sub || req.auth?.entity?._id || null;
    const role = String(req.user?.role || req.auth?.role || '').toUpperCase();
    return {
        id: rawId ? String(rawId) : null,
        role,
        isAdmin: ADMIN_ROLES.has(role) || Boolean(req.user?.isPlatformAdmin),
        // Server-to-server calls authenticated by the upload secret.
        trusted: Boolean(req.uploadTrusted),
    };
};
