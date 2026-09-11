import ms from 'ms';
import { FoodOtp } from './otp.model.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ValidationError } from '../auth/errors.js';
import { ApiError } from '../../utils/ApiError.js';

const INDIA_HUB_ENDPOINT = 'http://cloud.smsindiahub.in/api/mt/SendSMS';
const MSG91_OTP_ENDPOINT = 'https://control.msg91.com/api/v5/otp';

/** Normalize to 10-digit Indian mobile (no country code). */
export const normalizeOtpPhone = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '').trim();
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits.slice(-10);
};

export const getOtpTtlMs = () => {
    if (config.otpExpirySeconds) return Number(config.otpExpirySeconds) * 1000;
    if (config.otpExpiryMinutes) return Number(config.otpExpiryMinutes) * 60 * 1000;
    return 5 * 60 * 1000;
};

/**
 * Per-scope OTP policy.
 *
 * The merged projects each chose their own code length and lifetime. Every scope now issues a
 * 4-digit code for consistency; this table stays so a scope can still diverge
 * on lifetime (or length) without forking the storage layer.
 */
const OTP_SCOPES = {
    default: { length: 4 },
    user: { length: 4 },
    restaurant: { length: 4 },
    delivery: { length: 4 },
    'taxi-user': { length: 4, ttlMs: 10 * 60 * 1000 },
    'taxi-driver': { length: 4, ttlMs: 10 * 60 * 1000 },
    hotel: { length: 4, ttlMs: 10 * 60 * 1000 },
};

/** Policy for a scope, falling back to the 4-digit default. */
export const getOtpScopeConfig = (scope) =>
    OTP_SCOPES[normalizeOtpScope(scope)] || OTP_SCOPES.default;

/** Static code for dev/test modes, sized to the scope ('1234' / '123456'). */
const getDefaultOtpCode = (length = 4) => '123456789012'.slice(0, length);

const generateOtp = (length = 4) => {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
};

const getDefaultTestPhone = () =>
    normalizeOtpPhone(config.defaultTestPhone || process.env.DEFAULT_TEST_PHONE || '');

/**
 * Shared OTP resolution for every module.
 * - USE_DEFAULT_OTP=true → all phones get the static code (no SMS)
 * - else USE_DEFAULT_TEST_PHONE + DEFAULT_TEST_PHONE match → that phone gets it
 * - else live OTP + SMS
 *
 * @param {string} phone
 * @param {string} [scope] - Determines code length; see OTP_SCOPES.
 */
export const resolveOtpForPhone = (phone, scope = 'default') => {
    const normalizedPhone = normalizeOtpPhone(phone);
    const { length = 4 } = getOtpScopeConfig(scope);
    const defaultCode = getDefaultOtpCode(length);
    const testPhone = getDefaultTestPhone();

    if (config.useDefaultOtp) {
        return { phone: normalizedPhone, otp: defaultCode, isStatic: true, reason: 'USE_DEFAULT_OTP' };
    }

    if (config.useDefaultTestPhone && testPhone && normalizedPhone === testPhone) {
        return {
            phone: normalizedPhone,
            otp: defaultCode,
            isStatic: true,
            reason: 'DEFAULT_TEST_PHONE',
        };
    }

    return { phone: normalizedPhone, otp: generateOtp(length), isStatic: false, reason: 'live' };
};

const parseJsonSafe = (text) => {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

const toMsisdn = (phone) => {
    const digits = normalizeOtpPhone(phone);
    if (!/^\d{10}$/.test(digits)) {
        throw new ApiError(400, 'A valid 10-digit Indian mobile number is required for OTP');
    }
    return `91${digits}`;
};

const resolveActiveProvider = () => {
    if (config.msg91Enabled) return 'msg91';
    if (config.smsHubEnabled) return 'sms_hub';
    if (config.smsApiKey) return 'sms_hub';
    return null;
};

const sendViaIndiaHub = async ({ phone, otp, purpose = 'otp' }) => {
    const msisdn = toMsisdn(phone);
    const apiKey = String(config.smsApiKey || '').trim();
    const senderId = String(config.smsSenderId || 'SMSHUB').trim();
    const peId = String(config.smsPeId || '1001164203633432409').trim();
    const templateId = String(config.smsDltTemplateId || '').trim();
    const message = `Welcome to the Dima Hasao powered by Dima Hasao.Your OTP for registration is ${otp}.BGADEC`;

    if (!apiKey) {
        throw new ApiError(500, 'SMS India Hub API key is not configured');
    }

    const sendUrl = new URL(INDIA_HUB_ENDPOINT);
    sendUrl.searchParams.set('APIKey', apiKey);
    sendUrl.searchParams.set('senderid', senderId);
    sendUrl.searchParams.set('channel', 'Trans');
    sendUrl.searchParams.set('DCS', '0');
    sendUrl.searchParams.set('flashsms', '0');
    sendUrl.searchParams.set('number', msisdn);
    sendUrl.searchParams.set('text', message);
    if (templateId) sendUrl.searchParams.set('TemplateId', templateId);
    if (peId) sendUrl.searchParams.set('PEID', peId);

    logger.info(`[SMS] India Hub ${purpose} → ${msisdn}`);
    const res = await fetch(sendUrl.toString(), { signal: AbortSignal.timeout(15000) });
    const text = (await res.text()).trim();
    const parsed = parseJsonSafe(text);
    const ok =
        res.ok &&
        ((parsed && String(parsed.ErrorCode || '') === '000') ||
            (!parsed && !/error(?!message)|invalid|failed|unauthor|reject/i.test(text)) ||
            text.includes('"ErrorCode":"000"'));

    if (!ok) {
        throw new ApiError(502, `SMS India Hub rejected ${purpose}: ${text || res.status}`);
    }

    return {
        mode: 'live',
        provider: 'sms_hub',
        message: 'OTP sent successfully',
        providerResponse: text,
        jobId: parsed?.JobId || null,
    };
};

const sendViaMsg91 = async ({ phone, otp, purpose = 'otp' }) => {
    const msisdn = toMsisdn(phone);
    const authKey = String(config.msg91AuthKey || '').trim();
    const templateId = String(config.msg91TemplateId || '').trim();
    const senderId = String(config.msg91SenderId || '').trim();

    if (!authKey) {
        throw new ApiError(500, 'MSG91 auth key is not configured');
    }
    if (!templateId) {
        throw new ApiError(500, 'MSG91 template id is not configured');
    }

    const url = new URL(MSG91_OTP_ENDPOINT);
    url.searchParams.set('template_id', templateId);
    url.searchParams.set('mobile', msisdn);
    url.searchParams.set('otp', String(otp));
    url.searchParams.set('otp_length', String(String(otp).length || 4));
    if (senderId) url.searchParams.set('sender', senderId);

    logger.info(`[SMS] MSG91 ${purpose} → ${msisdn}`);
    const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            authkey: authKey,
            'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
    });
    const text = (await res.text()).trim();
    const parsed = parseJsonSafe(text);
    const type = String(parsed?.type || '').toLowerCase();
    const ok =
        res.ok &&
        (type === 'success' || String(parsed?.message || '').toLowerCase().includes('success'));

    if (!ok) {
        throw new ApiError(502, `MSG91 rejected ${purpose}: ${text || res.status}`);
    }

    return {
        mode: 'live',
        provider: 'msg91',
        message: 'OTP sent successfully',
        providerResponse: text,
        jobId: parsed?.request_id || parsed?.message || null,
    };
};

/**
 * Shared SMS for food + taxi.
 * MSG91_ENABLED → MSG91, else SMS_HUB_ENABLED (or hub key) → India Hub.
 */
export const sendOtpSms = async ({ phone, otp, purpose = 'otp' } = {}) => {
    const resolved = resolveOtpForPhone(phone);
    if (resolved.isStatic) {
        return {
            mode: 'debug',
            provider: 'static',
            message: `Default OTP mode (${resolved.reason})`,
        };
    }

    const provider = resolveActiveProvider();
    if (!provider) {
        throw new ApiError(
            500,
            'No SMS provider enabled. Set MSG91_ENABLED=true or SMS_HUB_ENABLED=true (with credentials).',
        );
    }

    if (provider === 'msg91') {
        return sendViaMsg91({ phone, otp, purpose });
    }
    return sendViaIndiaHub({ phone, otp, purpose });
};

const normalizeOtpScope = (scope) => {
    const normalized = String(scope || '').trim().toLowerCase();
    return normalized || 'default';
};

/** Food auth OTP create (also used as shared policy via sendOtpSms / resolveOtpForPhone). */
/**
 * Generate, store and (when not in a static/test mode) send an OTP.
 *
 * @param {string} phone
 * @param {string} [scope] - Module namespace, e.g. 'user', 'taxi-driver', 'hotel'.
 * @param {Object} [options]
 * @param {Object|null} [options.metadata] - Arbitrary data to carry alongside the
 *   code until it is verified (hotel uses this for the pending role/type).
 * @returns {Promise<string>} the generated OTP
 */
export const createOrUpdateOtp = async (phone, scope = 'default', { metadata = null } = {}) => {
    const normalizedPhone = normalizeOtpPhone(phone);
    const normalizedScope = normalizeOtpScope(scope);
    if (!normalizedPhone || normalizedPhone.length < 8) {
        throw new ValidationError('A valid phone number is required');
    }

    let existing = await FoodOtp.findOne({
        phone: normalizedPhone,
        $or: [{ scope: normalizedScope }, { scope: { $exists: false } }],
    }).sort({ createdAt: -1 });

    if (existing && String(existing.scope || '') !== normalizedScope) {
        existing.scope = normalizedScope;
    }
    const now = new Date();

    if (existing) {
        const windowMs = (config.otpRateWindow || 600) * 1000;
        const isInWindow = now - existing.lastRequestAt < windowMs;

        if (isInWindow) {
            if (existing.requestCount >= (config.otpRateLimit || 3)) {
                logger.warn(`Rate limit exceeded for phone ${phone} scope=${normalizedScope}`);
                throw new ValidationError(
                    `Too many OTP requests. Please try again after ${Math.ceil(windowMs / 60000)} minutes.`,
                );
            }
            existing.requestCount += 1;
        } else {
            existing.requestCount = 1;
        }
    }

    const resolved = resolveOtpForPhone(normalizedPhone, normalizedScope);
    const otp = resolved.otp;

    logger.info(
        `[OTP] phone=${normalizedPhone} scope=${normalizedScope} mode=${resolved.reason} otp=${otp}`,
    );
    console.log(`[OTP DEBUG] Generated OTP ${otp} for phone ${normalizedPhone} (${resolved.reason})`);

    const ttlMs =
        getOtpScopeConfig(normalizedScope).ttlMs || getOtpTtlMs() || ms(config.otpExpiry || '5m');
    const expiresAt = new Date(now.getTime() + ttlMs);

    if (existing) {
        existing.otp = otp;
        existing.expiresAt = expiresAt;
        existing.attempts = 0;
        existing.lastRequestAt = now;
        existing.metadata = metadata;
        await existing.save();
    } else {
        await FoodOtp.create({
            phone: normalizedPhone,
            scope: normalizedScope,
            otp,
            expiresAt,
            requestCount: 1,
            lastRequestAt: now,
            metadata,
        });
    }

    if (!resolved.isStatic) {
        await sendOtpSms({ phone: normalizedPhone, otp, purpose: `${normalizedScope} OTP` });
    }

    return otp;
};

export const verifyOtp = async (phone, otp, scope = 'default') => {
    const normalizedPhone = normalizeOtpPhone(phone);
    const normalizedScope = normalizeOtpScope(scope);
    if (!normalizedPhone || normalizedPhone.length < 8) {
        return { valid: false, reason: 'Invalid phone format' };
    }

    const record = await FoodOtp.findOne({
        phone: normalizedPhone,
        $or: [{ scope: normalizedScope }, { scope: { $exists: false } }],
    }).sort({ createdAt: -1 });
    if (!record) {
        return { valid: false, reason: 'OTP not found' };
    }

    if (record.expiresAt < new Date()) {
        return { valid: false, reason: 'OTP expired' };
    }

    if (record.attempts >= config.otpMaxAttempts) {
        return { valid: false, reason: 'Max attempts exceeded' };
    }

    record.attempts += 1;

    if (record.otp !== otp) {
        void record.save().catch((err) => {
            logger.warn(`[OTP VERIFY] Failed to persist attempts for ${normalizedPhone}: ${err.message}`);
        });
        return { valid: false, reason: 'Invalid OTP' };
    }

    const metadata = record.metadata ?? null;

    // Awaited deliberately: a fire-and-forget delete leaves a window in which
    // the same code verifies twice, so a captured OTP can be replayed.
    try {
        await record.deleteOne();
    } catch (err) {
        logger.warn(`[OTP VERIFY] Failed to delete OTP record for ${normalizedPhone}: ${err.message}`);
    }

    return { valid: true, metadata };
};

/**
 * Read a pending OTP's metadata without consuming the code.
 * Hotel needs the pending role before it decides which model to verify against.
 *
 * @returns {Promise<Object|null>}
 */
export const peekOtpMetadata = async (phone, scope = 'default') => {
    const record = await FoodOtp.findOne({
        phone: normalizeOtpPhone(phone),
        scope: normalizeOtpScope(scope),
    }).sort({ createdAt: -1 });

    return record?.metadata ?? null;
};
