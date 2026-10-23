/**
 * Runtime credentials: admin-editable, encrypted at rest, no redeploy.
 *
 * Callers read through `getCredential(name)`, which is synchronous — the
 * Razorpay and Maps helpers are called from hundreds of sync sites, so values
 * are held in memory and refreshed in the background. Resolution order is
 * database value, then the env var the app always used, so a deployment that
 * has never opened the admin screen behaves exactly as before.
 *
 * Another instance's save is picked up within REFRESH_INTERVAL_MS.
 */
import crypto from 'crypto';
import PlatformCredentials from './credentials.model.js';
import { logger } from '../../utils/logger.js';

const REFRESH_INTERVAL_MS = Number(process.env.CREDENTIALS_REFRESH_MS || 60000);
const FORMAT = 'v1';

/** name → { label, env fallbacks, secret }. Secrets get no preview at all. */
export const CREDENTIAL_FIELDS = {
    googleMapsApiKey: {
        label: 'Google Maps server key',
        env: ['GOOGLE_MAPS_API_KEY', 'GOOGLE_MAP_API_KEY', 'VITE_GOOGLE_MAPS_API_KEY'],
    },
    // Public by design: it ships to every browser, so restrict it by HTTP referrer.
    googleMapsBrowserKey: {
        label: 'Google Maps web key (browser)',
        env: ['GOOGLE_MAPS_BROWSER_KEY'],
    },
    razorpayKeyId: { label: 'Razorpay key id', env: ['RAZORPAY_KEY_ID'] },
    razorpayKeySecret: { label: 'Razorpay key secret', env: ['RAZORPAY_KEY_SECRET'], secret: true },
    razorpayWebhookSecret: { label: 'Razorpay webhook secret', env: ['RAZORPAY_WEBHOOK_SECRET'], secret: true },
};

const sanitize = (value) => (value ? String(value).trim().replace(/^['"]|['"]$/g, '') : '');

let cache = {};
let refreshTimer = null;

const getEncryptionKey = () => {
    const secret = sanitize(process.env.CREDENTIALS_ENCRYPTION_KEY);
    if (secret.length < 32) return null;
    return crypto.createHash('sha256').update(secret).digest();
};

export const isEncryptionConfigured = () => Boolean(getEncryptionKey());

const encrypt = (plain) => {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    return [FORMAT, iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
};

const decrypt = (stored) => {
    const key = getEncryptionKey();
    const [format, iv, tag, data] = String(stored || '').split(':');
    if (!key || format !== FORMAT || !iv || !tag || !data) return '';
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
        decipher.setAuthTag(Buffer.from(tag, 'base64'));
        return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
    } catch {
        // Wrong CREDENTIALS_ENCRYPTION_KEY or tampered value: fall back to env.
        return '';
    }
};

const fromEnv = (name) => {
    for (const envName of CREDENTIAL_FIELDS[name]?.env || []) {
        const value = sanitize(process.env[envName]);
        if (value) return value;
    }
    return '';
};

/** Current value: database first, then the env var. Synchronous. */
export const getCredential = (name) => cache[name] || fromEnv(name);

/** Reload the in-memory copy from the database. Never throws. */
export const refreshCredentials = async () => {
    try {
        const doc = await PlatformCredentials.findOne({ key: 'credentials' }).lean();
        const next = {};
        for (const name of Object.keys(CREDENTIAL_FIELDS)) {
            const stored = doc?.values?.[name];
            if (stored) next[name] = decrypt(stored);
        }
        cache = next;
    } catch (error) {
        logger.error(`[Credentials] Refresh failed, keeping previous values: ${error.message}`);
    }
};

/** Load once at boot, then keep other instances' edits flowing in. */
export const startCredentialRefresh = async () => {
    await refreshCredentials();
    if (refreshTimer) return;
    refreshTimer = setInterval(refreshCredentials, REFRESH_INTERVAL_MS);
    refreshTimer.unref?.();
};

export const stopCredentialRefresh = () => {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
};

const mask = (value) => {
    if (!value) return '';
    if (value.length <= 8) return '••••';
    return `${value.slice(0, 4)}••••${value.slice(-4)}`;
};

/** What the admin screen may show: never a plain value. */
export const describeCredentials = async () => {
    const doc = await PlatformCredentials.findOne({ key: 'credentials' }).lean();
    const fields = {};
    for (const [name, def] of Object.entries(CREDENTIAL_FIELDS)) {
        const inDb = Boolean(doc?.values?.[name]);
        const value = getCredential(name);
        fields[name] = {
            label: def.label,
            configured: Boolean(value),
            source: inDb && cache[name] ? 'database' : value ? 'env' : 'none',
            preview: def.secret && value ? '••••••••' : mask(value),
        };
    }
    return { encryptionConfigured: isEncryptionConfigured(), fields, updatedAt: doc?.updatedAt || null };
};

/**
 * @param {Record<string,string>} updates  name → new value. Undefined leaves a
 *   field alone; an empty string removes the database value (env takes over).
 */
export const saveCredentials = async (updates = {}, adminId = null) => {
    if (!isEncryptionConfigured()) {
        const error = new Error('CREDENTIALS_ENCRYPTION_KEY (min 32 chars) is not set on the server');
        error.status = 503;
        throw error;
    }

    const doc = (await PlatformCredentials.findOne({ key: 'credentials' })) || new PlatformCredentials({ key: 'credentials' });
    const changed = [];

    for (const name of Object.keys(CREDENTIAL_FIELDS)) {
        if (updates[name] === undefined || updates[name] === null) continue;
        const value = sanitize(updates[name]);
        if (value) doc.values.set(name, encrypt(value));
        else doc.values.delete(name);
        changed.push(name);
    }

    if (!changed.length) return { changed };

    doc.updatedBy = adminId || undefined;
    await doc.save();
    await refreshCredentials();
    // Names only — never the values.
    logger.info(`[Credentials] Updated ${changed.join(', ')} by admin ${adminId || 'unknown'}`);
    return { changed };
};

export default { getCredential, refreshCredentials, startCredentialRefresh, describeCredentials, saveCredentials };
