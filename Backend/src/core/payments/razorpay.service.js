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
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let Razorpay = null;

try {
    const mod = await import('razorpay');
    Razorpay = mod.default;
} catch {
    // Optional dependency: the app still boots, payments just stay unconfigured.
    Razorpay = null;
}

const KEY_ID = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || '';

export const isRazorpayConfigured = () => Boolean(KEY_ID && KEY_SECRET && Razorpay);

export const getRazorpayKeyId = () => KEY_ID;

/** For server-side callers that sign their own Razorpay requests. Never send
 *  this to a client. */
export const getRazorpayKeySecret = () => KEY_SECRET;

/** Shared SDK client, or null when unconfigured. */
export const getRazorpayClient = () => {
    if (!isRazorpayConfigured()) return null;
    return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
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

    return new Razorpay({ key_id: id, key_secret: secret });
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
    const keySecret = String(secret || KEY_SECRET || '');

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
        .createHmac('sha256', String(secret || KEY_SECRET || ''))
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

/**
 * Verify a Razorpay **webhook** signature: HMAC-SHA256 of the raw request body.
 * @param {{ body: string|Buffer, signature: string, secret?: string }} params
 */
export const verifyWebhookSignature = ({ body, signature, secret } = {}) => {
    const webhookSecret = String(secret || process.env.RAZORPAY_WEBHOOK_SECRET || '');

    if (!webhookSecret || !body || !signature) return false;

    const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(Buffer.isBuffer(body) ? body : String(body))
        .digest('hex');

    return safeEqual(expected, signature);
};

export default {
    computeExpectedSignature,
    isRazorpayConfigured,
    getRazorpayKeyId,
    getRazorpayClient,
    verifyPaymentSignature,
    verifyWebhookSignature,
};
