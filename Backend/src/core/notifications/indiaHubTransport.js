/**
 * The one place that knows how to talk to SMS India Hub.
 *
 * There are two APIs on cloud.smsindiahub.in and they are not interchangeable:
 *
 *   /api/mt/SendSMS        — the JSON/REST surface. Takes `senderid`, `number`,
 *                            `text`, `TemplateId`, `channel`, `DCS`, `flashsms`.
 *   /vendorsms/pushsms.aspx — the GET surface these accounts are provisioned
 *                            for. Takes `sid`, `msisdn`, `msg`, `DLT_TE_ID`,
 *                            `gwid`, `fl`, `uname`.
 *
 * Centralising the SMS senders consolidated everything onto /api/mt/SendSMS,
 * which is the one this account rejects: every send came back
 * `{"ErrorCode":"15","ErrorMessage":"senderid not valid"}` even for a header
 * the account owns, because that endpoint resolves sender IDs against a
 * different gateway. Hotel's original sender used pushsms.aspx, and so does
 * the Switcheats integration this is modelled on, which sends live traffic.
 *
 * Parameter names are case-sensitive; `gwid=2` selects the transactional
 * gateway. Errors arrive with HTTP 200 and an ErrorCode in the body, so the
 * status line tells you nothing — always read the body.
 */
import { config } from '../../config/env.js';

const PUSH_SMS_ENDPOINT = 'http://cloud.smsindiahub.in/vendorsms/pushsms.aspx';

/** 10-digit Indian mobile → 91XXXXXXXXXX, the form the gateway expects. */
export const toIndiaHubMsisdn = (digits) => {
    const normalized = String(digits || '').replace(/\D/g, '');
    return normalized.startsWith('91') ? normalized : `91${normalized}`;
};

/**
 * Build a pushsms.aspx send URL.
 *
 * @param {{ msisdn: string, message: string }} params
 * @returns {URL}
 */
export const buildIndiaHubSendUrl = ({ msisdn, message }) => {
    const url = new URL(PUSH_SMS_ENDPOINT);

    url.searchParams.append('APIKey', String(config.smsApiKey || '').trim());
    url.searchParams.append('sid', String(config.smsSenderId || '').trim());
    url.searchParams.append('msisdn', msisdn);
    url.searchParams.append('msg', message);
    url.searchParams.append('gwid', '2');
    url.searchParams.append('fl', '0');

    const username = String(config.smsIndiaHubUsername || '').trim();
    if (username) {
        url.searchParams.append('uname', username);
    }

    const templateId = String(config.smsDltTemplateId || '').trim();
    if (templateId) {
        url.searchParams.append('DLT_TE_ID', templateId);
    }

    return url;
};

/**
 * Read a pushsms.aspx response.
 *
 * The gateway answers 200 for failures too, so success is ErrorCode "000" (or
 * a plain-text body with no error wording).
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
     * code: /api/mt/SendSMS answers JSON with an ErrorCode, but pushsms.aspx
     * answers plain text ("Failed#senderid not valid"), so a code-only check
     * silently drops the hint on the endpoint we actually use.
     */
    const lowered = text.toLowerCase();
    let hint = '';

    if (code === '006' || lowered.includes('template')) {
        hint =
            ' — DLT template mismatch: the message text must match the approved template character for character' +
            ' (SMS_INDIA_HUB_DLT_TEMPLATE_ID, and the wording built in otp.service.js).';
    } else if (code === '15' || code === '015' || lowered.includes('senderid')) {
        hint =
            ' — that sender ID is not approved on this account. Open the SMS India Hub portal, copy the approved' +
            ' 6-character header, and set SMS_INDIA_HUB_SENDER_ID to it. Headers from another account do not carry over.';
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
