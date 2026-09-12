/**
 * Centralized email transport for every module (food, taxi, hotel, tours).
 *
 * Before this existed, each merged project built its own nodemailer transport
 * from the same EMAIL_* credentials but disagreed on the details:
 *   - utils/email.js            → secure when port === 465, lazy, config-driven
 *   - taxi/services/mailService → secure when EMAIL_PORT === '465', eager
 *   - hotel/services/email...   → secure when EMAIL_SECURE === 'true', lazy
 * Three transports, three "secure" rules, three `from` formats — so the same
 * SMTP settings could work in one module and fail in another. Everything now
 * routes through here.
 */
import nodemailer from 'nodemailer';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let transporter = null;

/** True when SMTP has enough configuration to attempt a send. */
export const isEmailConfigured = () =>
    Boolean(config.emailHost && config.emailUser && config.emailPass);

/**
 * One lazily-built transport, shared process-wide.
 * Returns null (never throws) when SMTP is not configured.
 */
export const getTransporter = () => {
    if (transporter) return transporter;

    if (!isEmailConfigured()) {
        logger.warn('[Email] Not configured — EMAIL_HOST, EMAIL_USER and EMAIL_PASS are required');
        return null;
    }

    const port = Number(config.emailPort) || 587;

    transporter = nodemailer.createTransport({
        host: config.emailHost,
        port,
        // Implicit TLS is port 465; everything else upgrades via STARTTLS.
        // EMAIL_SECURE can still force it for a non-standard port.
        secure: String(process.env.EMAIL_SECURE || '').trim().toLowerCase() === 'true' || port === 465,
        auth: { user: config.emailUser, pass: config.emailPass },
    });

    return transporter;
};

/** `"Display Name" <address>`, falling back to the authenticated user. */
const resolveFrom = (from) => {
    if (from) return from;

    const address = config.emailFrom || config.emailUser;
    const name = String(process.env.EMAIL_FROM_NAME || '').trim();

    return name ? `"${name}" <${address}>` : address;
};

/**
 * Send an email.
 *
 * Never throws: a mail failure must not take down the booking, approval or
 * registration that triggered it. Callers that care can check `success`.
 *
 * @param {{to: string, subject: string, html?: string, text?: string, from?: string}} params
 * @returns {Promise<{success: boolean, skipped?: boolean, messageId?: string, error?: string}>}
 */
export const sendEmail = async ({ to, subject, html, text, from } = {}) => {
    const recipient = String(to || '').trim();

    if (!recipient) {
        logger.warn('[Email] Skipped: no recipient');
        return { success: false, skipped: true, error: 'No recipient' };
    }

    const trans = getTransporter();

    if (!trans) {
        logger.warn(`[Email] Skipped "${subject}" → ${recipient}: SMTP not configured`);
        return { success: false, skipped: true, error: 'SMTP not configured' };
    }

    try {
        const info = await trans.sendMail({
            from: resolveFrom(from),
            to: recipient,
            subject,
            text,
            html,
        });

        logger.info(`[Email] Sent "${subject}" → ${recipient} (${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`[Email] Failed "${subject}" → ${recipient}: ${error.message}`);
        return { success: false, error: error.message };
    }
};

const BRAND = () => String(process.env.EMAIL_FROM_NAME || process.env.APP_NAME || 'Dima Hasao').trim();

/**
 * Shared branded HTML shell, so every module's mail looks like one product.
 * @param {{title: string, body: string, subtitle?: string, accent?: string}} params
 */
export const renderEmailTemplate = ({ title, body, subtitle = '', accent = '#0f766e' }) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <div style="background:${accent};color:#ffffff;padding:20px 24px;border-radius:12px 12px 0 0;">
      <div style="font-size:18px;font-weight:bold;letter-spacing:0.5px;">${BRAND()}</div>
    </div>
    <div style="background:#ffffff;padding:24px;border-radius:0 0 12px 12px;line-height:1.6;">
      <h2 style="margin:0 0 4px;color:#111827;font-size:20px;">${title}</h2>
      ${subtitle ? `<p style="margin:0 0 16px;color:#6b7280;font-size:13px;">${subtitle}</p>` : ''}
      ${body}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px;">
      This is an automated message from ${BRAND()}.
    </p>
  </div>
</body>
</html>`;

export default { sendEmail, getTransporter, isEmailConfigured, renderEmailTemplate };
