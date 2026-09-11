/**
 * The one OTP auth flow, shared by every app.
 *
 * Two calls, whatever the audience:
 *   request(audience, phone)        → { isRegistered, nextStepIfVerified }
 *   verify(audience, phone, otp)    → { nextStep, ...session }
 *
 * `nextStep` is how per-app behaviour stays out of core: the consumer app asks a
 * new number for a name (COLLECT_NAME), the partner apps send it to onboarding
 * (ONBOARDING), and both are just a value the adapter chose.
 */
import { createOrUpdateOtp, verifyOtp } from '../../otp/otp.service.js';
import { normalizeOtpPhone } from '../../otp/otp.service.js';
import { ValidationError } from '../errors.js';
import { getAuthAudience, NEXT_STEP } from './audienceRegistry.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

const assertValidPhone = (phone) => {
    const normalized = normalizeOtpPhone(phone);

    if (!/^\d{10}$/.test(normalized)) {
        throw new ValidationError('A valid 10-digit phone number is required');
    }

    return normalized;
};

/** Dev/staging expose the code so clients can prefill it; production never does. */
const shouldExposeOtp = () => config.nodeEnv !== 'production' || config.useDefaultOtp;

/**
 * Send an OTP for one audience, and tell the client up front whether this phone
 * already has an account — so the UI knows before the code is entered whether
 * this will be a sign-in or a signup.
 *
 * @param {string} audienceKey
 * @param {string} phone
 * @param {Object} [meta] - Extra data to carry until the code is verified.
 */
export const requestOtpForAudience = async (audienceKey, phone, meta = {}) => {
    const audience = getAuthAudience(audienceKey);
    const normalizedPhone = assertValidPhone(phone);

    const account = await audience.findAccount(normalizedPhone);

    if (account && typeof audience.assertCanLogin === 'function') {
        audience.assertCanLogin(account);
    }

    if (!account && audience.requireExistingAccount) {
        throw new ValidationError(
            audience.notFoundMessage || `No ${audience.label} account found for this number.`,
        );
    }

    const otp = await createOrUpdateOtp(normalizedPhone, audience.otpScope, {
        metadata: { audience: audience.key, ...meta },
    });

    const isRegistered = Boolean(account);

    return {
        phone: normalizedPhone,
        audience: audience.key,
        isRegistered,
        // What verifying this code will lead to, so the client can prepare the
        // next screen while the user is still typing.
        nextStepIfVerified: isRegistered ? NEXT_STEP.AUTHENTICATED : audience.onNewAccount,
        ...(shouldExposeOtp() ? { otp } : {}),
    };
};

/**
 * Verify an OTP for one audience and, when the account exists, mint its session.
 *
 * @param {string} audienceKey
 * @param {string} phone
 * @param {string} otp
 * @param {Object} [payload] - Passed through to the adapter (fcmToken, name, …).
 */
export const verifyOtpForAudience = async (audienceKey, phone, otp, payload = {}) => {
    const audience = getAuthAudience(audienceKey);
    const normalizedPhone = assertValidPhone(phone);
    const code = String(otp || '').trim();

    if (!code) {
        throw new ValidationError('OTP is required');
    }

    const result = await verifyOtp(normalizedPhone, code, audience.otpScope);

    if (!result.valid) {
        throw new ValidationError(result.reason || 'OTP verification failed');
    }

    let account = await audience.findAccount(normalizedPhone);

    // A new number on a COLLECT_NAME audience can finish signing up in this same
    // call when the client already has the name; otherwise it is told to ask.
    if (!account && typeof audience.createAccount === 'function') {
        account = await audience.createAccount(normalizedPhone, payload);
    }

    if (!account) {
        logger.info(
            `[OtpAuth] ${audience.key} verified ${normalizedPhone} → ${audience.onNewAccount}`,
        );

        return {
            verified: true,
            audience: audience.key,
            phone: normalizedPhone,
            isRegistered: false,
            nextStep: audience.onNewAccount,
            pending: result.metadata ?? null,
        };
    }

    if (typeof audience.assertCanLogin === 'function') {
        audience.assertCanLogin(account);
    }

    const session = await audience.issueSession(account, {
        ...payload,
        phone: normalizedPhone,
    });

    logger.info(`[OtpAuth] ${audience.key} signed in ${normalizedPhone}`);

    return {
        verified: true,
        audience: audience.key,
        phone: normalizedPhone,
        isRegistered: true,
        nextStep: NEXT_STEP.AUTHENTICATED,
        ...session,
    };
};
