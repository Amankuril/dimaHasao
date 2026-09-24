/**
 * Which consumer modules are open, and the maintenance notice for the ones
 * that are not.
 *
 * Read on nearly every request, so it is cached for a few seconds and
 * invalidated the moment an admin flips a switch — the same shape the food
 * maintenance flag already used, kept because it behaves well: a module can be
 * closed and the apps notice within seconds without a restart.
 *
 * It fails OPEN. A database blip must not take every module down; the worst
 * case of failing open is that a module stays reachable a little longer, and
 * the worst case of failing closed is the whole platform dark because one
 * query timed out.
 */
import { ModuleToggle } from './moduleToggles.model.js';
import { logger } from '../../utils/logger.js';

/**
 * The consumer modules that can be closed.
 *
 * `places` and `tours` are separate: places is the district's tourist-places
 * guide inside /app, tours is the packages business with its own module.
 */
export const TOGGLEABLE_MODULES = ['food', 'taxi', 'hotel', 'tours', 'places'];

export const MODULE_LABELS = {
    food: 'Food',
    taxi: 'Taxi & Auto',
    hotel: 'Hotels & Stays',
    tours: 'Tourism & Travels',
    places: 'Places',
};

export const DEFAULT_MAINTENANCE_MESSAGE =
    'This section is under maintenance right now. Please check back shortly.';

const CACHE_TTL_MS = 5000;

let cache = null;
let cachedAt = 0;
let inflight = null;

/** Every module open — what callers get before anything has been configured. */
const allOpen = () =>
    Object.fromEntries(
        TOGGLEABLE_MODULES.map((module) => [module, { enabled: true, message: '' }]),
    );

export const readModuleToggles = async () => {
    const now = Date.now();
    if (cache && now - cachedAt < CACHE_TTL_MS) return cache;
    if (inflight) return inflight;

    inflight = (async () => {
        try {
            const rows = await ModuleToggle.find({}).lean();
            const next = allOpen();

            for (const row of rows) {
                if (!TOGGLEABLE_MODULES.includes(row.module)) continue;
                next[row.module] = {
                    enabled: row.enabled !== false,
                    message: String(row.message || '').trim(),
                };
            }

            cache = next;
            cachedAt = Date.now();
            return cache;
        } catch (error) {
            logger.warn(`[ModuleToggles] read failed, leaving every module open: ${error.message}`);
            cache = allOpen();
            cachedAt = Date.now();
            return cache;
        } finally {
            inflight = null;
        }
    })();

    return inflight;
};

export const invalidateModuleToggles = () => {
    cache = null;
    cachedAt = 0;
};

/** @returns {Promise<{enabled: boolean, message: string}>} */
export const readModuleToggle = async (module) => {
    const toggles = await readModuleToggles();
    return toggles[module] || { enabled: true, message: '' };
};

/**
 * @param {Array<{module: string, enabled: boolean, message?: string}>} updates
 */
export const writeModuleToggles = async (updates = [], adminId = null) => {
    const writes = updates
        .filter((item) => TOGGLEABLE_MODULES.includes(String(item?.module || '').toLowerCase()))
        .map((item) => ({
            updateOne: {
                filter: { module: String(item.module).toLowerCase() },
                update: {
                    $set: {
                        enabled: item.enabled !== false,
                        message: String(item.message || '').trim(),
                        updatedBy: adminId || null,
                    },
                },
                upsert: true,
            },
        }));

    if (writes.length) await ModuleToggle.bulkWrite(writes);

    invalidateModuleToggles();
    return readModuleToggles();
};
