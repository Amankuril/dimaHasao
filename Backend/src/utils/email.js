/**
 * Platform email helpers.
 *
 * Transport, branding shell and failure handling all live in
 * core/notifications/email.service.js; this file only holds the message
 * content for platform-level (admin, restaurant, delivery) mail.
 */
import { sendEmail, renderEmailTemplate } from '../core/notifications/email.service.js';

const OTP_BOX = (otp) =>
    `<p style="font-size:24px;font-weight:bold;letter-spacing:4px;background:#f3f4f6;padding:12px 16px;border-radius:8px;text-align:center;margin:16px 0;">${otp}</p>`;

const BUTTONLESS_NOTE =
    '<p style="color:#6b7280;font-size:13px;">If you did not expect this email you can safely ignore it.</p>';

/**
 * OTP email for admin forgot-password.
 * @returns {Promise<boolean>} true if sent
 */
export async function sendAdminResetOtpEmail(to, otp) {
    const { success } = await sendEmail({
        to,
        subject: 'Your password reset code',
        text: `Your password reset code is: ${otp}. It is valid for 10 minutes. If you did not request this, ignore this email.`,
        html: renderEmailTemplate({
            title: 'Password reset code',
            subtitle: 'Valid for 10 minutes',
            body: `<p>Use the code below to reset your admin password.</p>${OTP_BOX(otp)}${BUTTONLESS_NOTE}`,
        }),
    });

    return success;
}

/**
 * Restaurant approval.
 *
 * This and the three below were imported by
 * modules/food/admin/services/admin.service.js but had never been written, so
 * every call threw "… is not a function" inside a try/catch — approval and
 * rejection mail silently never sent.
 *
 * @param {{to: string, restaurantName?: string, restaurantId?: string, isChangesApproval?: boolean}} params
 * @returns {Promise<boolean>}
 */
export async function sendRestaurantApprovalEmail({ to, restaurantName, isChangesApproval = false } = {}) {
    const name = String(restaurantName || 'your restaurant').trim();
    const title = isChangesApproval ? 'Your changes are approved' : 'Your restaurant is approved';
    const lead = isChangesApproval
        ? `The updates you submitted for <strong>${name}</strong> have been approved and are now live.`
        : `<strong>${name}</strong> has been approved. You can sign in and start taking orders.`;

    const { success } = await sendEmail({
        to,
        subject: title,
        text: `${title}. ${name} is approved.`,
        html: renderEmailTemplate({ title, body: `<p>${lead}</p>` }),
    });

    return success;
}

/**
 * Restaurant rejection.
 * @param {{to: string, restaurantName?: string, reason?: string}} params
 * @returns {Promise<boolean>}
 */
export async function sendRestaurantRejectionEmail({ to, restaurantName, reason } = {}) {
    const name = String(restaurantName || 'your restaurant').trim();
    const why = String(reason || '').trim();
    const title = 'Update on your restaurant application';

    const { success } = await sendEmail({
        to,
        subject: title,
        text: `Your application for ${name} could not be approved.${why ? ` Reason: ${why}` : ''}`,
        html: renderEmailTemplate({
            title,
            accent: '#b45309',
            body:
                `<p>We could not approve the application for <strong>${name}</strong>.</p>` +
                (why ? `<p style="background:#fef3c7;padding:12px 16px;border-radius:8px;"><strong>Reason:</strong> ${why}</p>` : '') +
                '<p>You can correct the details and reapply, or contact support if you think this is a mistake.</p>',
        }),
    });

    return success;
}

/**
 * Delivery partner approval.
 * @param {{to: string, partnerName?: string, isChangesApproval?: boolean}} params
 * @returns {Promise<boolean>}
 */
export async function sendDeliveryApprovalEmail({ to, partnerName, isChangesApproval = false } = {}) {
    const name = String(partnerName || 'Partner').trim();
    const title = isChangesApproval ? 'Your changes are approved' : 'You are approved to deliver';
    const lead = isChangesApproval
        ? `The updates you submitted have been approved, ${name}.`
        : `Welcome aboard, ${name}. Your account is approved — sign in to start accepting deliveries.`;

    const { success } = await sendEmail({
        to,
        subject: title,
        text: `${title}. ${lead.replace(/<[^>]+>/g, '')}`,
        html: renderEmailTemplate({ title, body: `<p>${lead}</p>` }),
    });

    return success;
}

/**
 * Delivery partner rejection.
 * @param {{to: string, partnerName?: string, reason?: string}} params
 * @returns {Promise<boolean>}
 */
export async function sendDeliveryRejectionEmail({ to, partnerName, reason } = {}) {
    const name = String(partnerName || 'Partner').trim();
    const why = String(reason || '').trim();
    const title = 'Update on your delivery partner application';

    const { success } = await sendEmail({
        to,
        subject: title,
        text: `Hello ${name}, your application could not be approved.${why ? ` Reason: ${why}` : ''}`,
        html: renderEmailTemplate({
            title,
            accent: '#b45309',
            body:
                `<p>Hello ${name}, we could not approve your application at this time.</p>` +
                (why ? `<p style="background:#fef3c7;padding:12px 16px;border-radius:8px;"><strong>Reason:</strong> ${why}</p>` : '') +
                '<p>You can update your details and reapply, or contact support for help.</p>',
        }),
    });

    return success;
}
