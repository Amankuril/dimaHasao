/**
 * Centralized SMS transport for every module (food, taxi, hotel, tours).
 *
 * Before this existed, each merged project shipped its own SMS sender:
 *   - core/otp/otp.service.js  → MSG91 + India Hub
 *   - modules/taxi/services/smsService.js → India Hub, its own config reads
 *   - modules/hotel/utils/smsService.js  → India Hub `vendorsms/pushsms.aspx`
 *                                          (a different endpoint + template)
 * They read the same credentials but diverged on endpoint, message text and
 * phone normalization, so a number that worked in one module could silently
 * fail in another. Everything now routes through this module.
 *
 * The India Hub wire format itself lives in ./indiaHubTransport.js — hotel's
 * pushsms.aspx endpoint turned out to be the one these accounts are
 * provisioned for, and consolidating onto the other one is what broke sending.
 *
 * OTP delivery keeps living in core/otp/otp.service.js (it also owns the
 * static/test-OTP policy); this module re-exports it so callers only ever need
 * one import path for SMS.
 */
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ApiError } from '../../utils/ApiError.js';
import { normalizeOtpPhone, sendOtpSms as sendOtpSmsCore } from '../otp/otp.service.js';
import { buildIndiaHubSendUrl, readIndiaHubResponse, toIndiaHubMsisdn } from './indiaHubTransport.js';


/** 10-digit Indian mobile → 91XXXXXXXXXX, the form every provider expects. */
const toMsisdn = (phone) => {
    const digits = normalizeOtpPhone(phone);
    if (!/^\d{10}$/.test(digits)) {
        throw new ApiError(400, 'A valid 10-digit Indian mobile number is required');
    }
    return `91${digits}`;
};

/**
 * Send a free-text transactional SMS.
 *
 * MSG91's OTP endpoint only renders OTP templates, so non-OTP messages always
 * go through India Hub regardless of which provider is enabled for OTP.
 *
 * @param {{ phone: string, message: string, purpose?: string }} params
 * @returns {Promise<{ mode: string, provider: string, message: string, providerResponse?: string, jobId?: string|null }>}
 */
export const sendSms = async ({ phone, message, purpose = 'notification' } = {}) => {
    const text = String(message || '').trim();
    if (!text) {
        throw new ApiError(400, 'SMS message body is required');
    }

    const msisdn = toMsisdn(phone);
    const apiKey = String(config.smsApiKey || '').trim();

    if (!apiKey) {
        // Non-OTP SMS is best-effort: a missing key must not break a booking or
        // payment flow the way a failed login would.
        logger.warn(`[SMS] Skipped ${purpose} → ${msisdn}: India Hub API key not configured`);
        return { mode: 'skipped', provider: 'none', message: 'SMS provider not configured' };
    }

    const sendUrl = buildIndiaHubSendUrl({ msisdn: toIndiaHubMsisdn(msisdn), message: text });

    logger.info(`[SMS] India Hub ${purpose} -> ${msisdn}`);

    const res = await fetch(sendUrl.toString(), { signal: AbortSignal.timeout(15000) });
    const body = (await res.text()).trim();
    const result = readIndiaHubResponse(body, res.ok);

    if (!result.ok) {
        throw new ApiError(502, `SMS India Hub rejected ${purpose}: ${body || res.status}${result.hint}`);
    }

    return {
        mode: 'live',
        provider: 'sms_hub',
        message: 'SMS sent successfully',
        providerResponse: body,
        jobId: result.jobId,
    };
};

/**
 * Send an OTP SMS. Honours the shared static/test-OTP policy — when
 * USE_DEFAULT_OTP (or the configured test phone) is active nothing is sent.
 *
 * @param {{ phone: string, otp: string, purpose?: string }} params
 */
export const sendOtpSms = sendOtpSmsCore;

export { normalizeOtpPhone };

export default { sendSms, sendOtpSms, normalizeOtpPhone };
