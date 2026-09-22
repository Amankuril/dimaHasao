/**
 * The one place that knows how to talk to SMS India Hub.
 *
 * cloud.smsindiahub.in exposes two send APIs — /api/mt/SendSMS and
 * /vendorsms/pushsms.aspx — and an account is provisioned for one of them.
 * This account is on the /api/mt/SendSMS one, proven by a live send (ErrorCode
 * 000, JobId returned). pushsms.aspx answers 006 for the same credentials
 * and the same body, so it is not a fallback worth keeping.
 *
 * Getting here cost a long detour, so the trap is worth recording: with a
 * stale API key this endpoint answers
 * `{"ErrorCode":"15","ErrorMessage":"senderid not valid"}` — it blames the
 * sender, not the key. That error sent us off replacing approved headers and
 * eventually the whole endpoint, none of which was wrong. **If a send is
 * rejected for the sender, check the API key before touching anything else.**
 *
 * Note the DLT parameter is `DLTTemplateId`. `TemplateId`, which this code
 * used to send, is not the same field.
 *
 * Failures arrive with HTTP 200 and an ErrorCode in the body, so the status
 * line never tells you anything — always read the body.
 */
import { config } from '../../config/env.js';

const SEND_SMS_ENDPOINT = 'http://cloud.smsindiahub.in/api/mt/SendSMS';

/** 10-digit Indian mobile → 91XXXXXXXXXX, the form the gateway expects. */
export const toIndiaHubMsisdn = (digits) => {
    const normalized = String(digits || '').replace(/\D/g, '');
    return normalized.startsWith('91') ? normalized : `91${normalized}`;
};

/**
 * Build a send URL.
 *
 * @param {{ msisdn: string, message: string }} params
 * @returns {URL}
 */
export const buildIndiaHubSendUrl = ({ msisdn, message }) => {
    const url = new URL(SEND_SMS_ENDPOINT);

    url.searchParams.append('APIKey', String(config.smsApiKey || '').trim());
    url.searchParams.append('senderid', String(config.smsSenderId || '').trim());
    url.searchParams.append('channel', 'Trans');
    url.searchParams.append('DCS', '0');
    url.searchParams.append('flashsms', '0');
    url.searchParams.append('number', msisdn);
    url.searchParams.append('text', message);

    const templateId = String(config.smsDltTemplateId || '').trim();
    if (templateId) {
        url.searchParams.append('DLTTemplateId', templateId);
    }

    return url;
};

/**
 * Read a send response. Success is ErrorCode "000".
 *
 * @param {string} body
 * @param {boolean} httpOk
 * @returns {{ ok: boolean, code: string|null, message: string, jobId: string|null, hint: string }}
 */
export const readIndiaHubResponse = (body, httpOk) => {
    const text = String(body || '').trim();

    let parsed = null;
    try {
        parsed = JSON.parse(text);
    } catch {
        parsed = null;
    }

    const code = parsed?.ErrorCode != null ? String(parsed.ErrorCode) : null;
    const ok =
        httpOk &&
        (code === '000' ||
            (code === null && !/error(?!message)|invalid|failed|unauthor|reject/i.test(text)));

    /*
     * The two failures that actually happen. Match on the text as well as the
     * code, since the other endpoint answers in plain text and a code-only
     * check silently drops the hint.
     */
    const lowered = text.toLowerCase();
    let hint = '';

    if (code === '006' || lowered.includes('template')) {
        hint =
            ' — the message body does not match an approved DLT template for this sender.' +
            ' It is compared character for character: see SMS_INDIA_HUB_OTP_TEMPLATE.';
    } else if (code === '15' || code === '015' || lowered.includes('senderid')) {
        hint =
            ' — reported as a sender problem, but check SMS_INDIA_HUB_API_KEY first:' +
            ' a stale key produces this exact error even when the sender is approved.';
    }

    return {
        ok,
        code,
        message: parsed?.ErrorMessage || text,
        jobId: parsed?.JobId || null,
        hint,
    };
};

export default { buildIndiaHubSendUrl, readIndiaHubResponse, toIndiaHubMsisdn };
