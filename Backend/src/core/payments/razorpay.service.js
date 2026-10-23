/**
 * Centralized Razorpay client and signature verification.
 *
 * Two things were duplicated across the merged projects:
 *
 * 1. Client construction — `new Razorpay({...})` appeared in the food helper
 *    and three hotel controllers, all reading the same RAZORPAY_* env vars.
 * 2. Signature verification — the same HMAC-SHA256 over `orderId|paymentId`
 *    was hand-rolled in **ten** places (taxi 7, hotel 2, food 1). That is
 *    security-critical code; one copy is much easier to keep correct.
 *
 * Deliberately NOT unified: taxi resolves its credentials per-deployment from
 * admin-configured gateway settings in the database (`resolveConfiguredGateway
 * Credentials('razor_pay')`) and talks to the REST API directly rather than
 * through the SDK. That is a real design difference, not an accident, so taxi
 * passes its own `secret` into `verifyPaymentSignature` instead of using the
 * env-based client here.
 */
import crypto from 'crypto';
import { getCredential } from '../platform/credentials.service.js';
import { logger } from '../../utils/logger.js';

let Razorpay = null;

try {
    const mod = await import('razorpay');
    Razorpay = mod.default;
} catch {
    // Optional dependency: the app still boots, payments just stay unconfigured.
    Razorpay = null;
}

/*
 * Read on every call, not once at import: the admin can change these from the
 * credentials screen and the next request must use the new pair, with no
 * restart and no app release (the apps take `keyId` from the order response).
 */
export const getRazorpayKeyId = () => getCredential('razorpayKeyId');

/** For server-side callers that sign their own Razorpay requests. Never send
 *  this to a client. */
export const getRazorpayKeySecret = () => getCredential('razorpayKeySecret');

export const getRazorpayWebhookSecret = () => getCredential('razorpayWebhookSecret');

export const isRazorpayConfigured = () => Boolean(getRazorpayKeyId() && getRazorpayKeySecret() && Razorpay);

/*
 * The SDK builds its axios instance with no timeout, so a gateway that hangs
 * held the request (and the user) open indefinitely. Every client made here
 * gets one.
 */
const GATEWAY_TIMEOUT_MS = Number(process.env.RAZORPAY_TIMEOUT_MS || 15000);
const withTimeout = (client) => {
    if (client?.api?.rq?.defaults) client.api.rq.defaults.timeout = GATEWAY_TIMEOUT_MS;
    return client;
};

// One SDK client per credential pair, rebuilt only when the pair changes.
let cachedClient = null;
let cachedClientPair = '';

/** Shared SDK client, or null when unconfigured. */
export const getRazorpayClient = () => {
    if (!isRazorpayConfigured()) return null;

    const keyId = getRazorpayKeyId();
    const keySecret = getRazorpayKeySecret();
    const pair = `${keyId}:${keySecret}`;

    if (!cachedClient || cachedClientPair !== pair) {
        cachedClient = withTimeout(new Razorpay({ key_id: keyId, key_secret: keySecret }));
        cachedClientPair = pair;
    }
    return cachedClient;
};

/**
 * The same SDK client, built from credentials the caller resolved itself.
 *
 * Taxi keeps its own admin-configured gateway keys, so it cannot always use
 * the platform pair above — but it should use the same client, not a
 * hand-rolled fetch against api.razorpay.com. Passing no credentials (or an
 * incomplete pair) returns the platform client, so a caller whose own config
 * is empty still gets a working one.
 *
 * @returns {object|null} null when neither the given pair nor the platform
 *   pair is usable, or when the SDK is not installed.
 */
export const createRazorpayClient = ({ keyId, keySecret } = {}) => {
    const id = String(keyId || '').trim();
    const secret = String(keySecret || '').trim();

    if (!id || !secret) return getRazorpayClient();
    if (!Razorpay) return null;

    return withTimeout(new Razorpay({ key_id: id, key_secret: secret }));
};

/**
 * Constant-time string compare.
 *
 * The hand-rolled copies all used `!==`, which leaks how much of a forged
 * signature matched via timing. Comparing digests this way removes that.
 */
const safeEqual = (a, b) => {
    const bufA = Buffer.from(String(a || ''), 'utf8');
    const bufB = Buffer.from(String(b || ''), 'utf8');

    if (bufA.length !== bufB.length || bufA.length === 0) return false;

    return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Verify a Razorpay checkout signature: HMAC-SHA256 of `orderId|paymentId`.
 *
 * @param {Object} params
 * @param {string} params.orderId    - razorpay_order_id
 * @param {string} params.paymentId  - razorpay_payment_id
 * @param {string} params.signature  - razorpay_signature
 * @param {string} [params.secret]   - Key secret; defaults to the env credential.
 *   Pass explicitly when the credential came from admin gateway settings.
 * @returns {boolean}
 */
export const verifyPaymentSignature = ({ orderId, paymentId, signature, secret } = {}) => {
    const keySecret = String(secret || getRazorpayKeySecret() || '');

    if (!keySecret || !orderId || !paymentId || !signature) {
        logger.warn('[Razorpay] Signature verification skipped: missing secret, ids or signature');
        return false;
    }

    const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    return safeEqual(expected, signature);
};

/**
 * Compute the expected checkout signature digest.
 *
 * A drop-in for hand-rolled `crypto.createHmac(...).digest('hex')` where the
 * caller already owns the comparison. Prefer `verifyPaymentSignature`, which
 * also compares in constant time.
 *
 * @param {{orderId: string, paymentId: string, secret?: string}} params
 * @returns {string} hex digest
 */
export const computeExpectedSignature = ({ orderId, paymentId, secret } = {}) =>
    crypto
        .createHmac('sha256', String(secret || getRazorpayKeySecret() || ''))
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

/**
 * Verify a Razorpay **webhook** signature: HMAC-SHA256 of the raw request body.
 * @param {{ body: string|Buffer, signature: string, secret?: string }} params
 */
export const verifyWebhookSignature = ({ body, signature, secret } = {}) => {
    const webhookSecret = String(secret || getRazorpayWebhookSecret() || '');

    if (!webhookSecret || !body || !signature) return false;

    const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(Buffer.isBuffer(body) ? body : String(body))
        .digest('hex');

    return safeEqual(expected, signature);
};

export default {
    computeExpectedSignature,
    getRazorpayWebhookSecret,
    isRazorpayConfigured,
    getRazorpayKeyId,
    getRazorpayClient,
    verifyPaymentSignature,
    verifyWebhookSignature,
};
