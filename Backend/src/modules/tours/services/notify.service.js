/**
 * Telling an operator what an admin decided.
 *
 * Every transport here is best-effort and independently guarded: an operator
 * without an email address, an unconfigured SMTP, or a missing FCM token must
 * never fail the admin's approval request. The decision is already saved by the
 * time this runs.
 */
import { sendEmail, renderEmailTemplate, isEmailConfigured } from '../../../core/notifications/email.service.js';
import { sendPushNotification } from '../../../core/notifications/firebase.service.js';
import { sendSms } from '../../../core/notifications/sms.service.js';

const BRAND_GREEN = '#0a4d2b';

const tokensOf = (operator) =>
  [operator?.fcmTokens?.app, operator?.fcmTokens?.web].filter(Boolean);

/** Fire every transport, swallow every failure, report what landed. */
const dispatch = async ({ operator, subject, title, body, sms }) => {
  const results = await Promise.allSettled([
    operator?.email && isEmailConfigured()
      ? sendEmail({
        to: operator.email,
        subject,
        html: renderEmailTemplate({ title, subtitle: 'Dima Hasao · Tours & Travels', body, accent: BRAND_GREEN }),
        text: body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      })
      : Promise.resolve(null),

    tokensOf(operator).length
      ? sendPushNotification(tokensOf(operator), { title, body: sms || title })
      : Promise.resolve(null),

    operator?.phone && sms
      ? sendSms({ phone: operator.phone, message: sms, purpose: 'tours_operator_update' })
      : Promise.resolve(null),
  ]);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`[tours notify] transport ${index} failed:`, result.reason?.message || result.reason);
    }
  });
};

/** An admin approved, rejected, or reset an operator's registration. */
export const notifyOperatorApproval = async (operator, status, reason) => {
  if (status === 'approved') {
    return dispatch({
      operator,
      subject: 'Your tour operator account is approved',
      title: 'You are approved',
      body: `<p>Hello ${operator.name || 'there'},</p>
        <p><strong>${operator.agencyName || operator.name}</strong> has been approved on Dima Hasao Tours &amp; Travels.</p>
        <p>You can now publish packages and take bookings. Sign in to your operator panel to get started.</p>`,
      sms: `Your Dima Hasao tour operator account is approved. You can now publish packages.`,
    });
  }

  if (status === 'rejected') {
    return dispatch({
      operator,
      subject: 'About your tour operator registration',
      title: 'Registration not approved',
      body: `<p>Hello ${operator.name || 'there'},</p>
        <p>We could not approve <strong>${operator.agencyName || operator.name}</strong> at this time.</p>
        <p><strong>Reason:</strong> ${reason || 'Criteria not met'}</p>
        <p>You can update your profile and documents in the operator panel and contact support to be reviewed again.</p>`,
      sms: `Your Dima Hasao operator registration was not approved: ${reason || 'criteria not met'}.`,
    });
  }

  return dispatch({
    operator,
    subject: 'Your tour operator account is under review',
    title: 'Back under review',
    body: `<p>Hello ${operator.name || 'there'},</p>
      <p>Your account has been moved back to review. Your packages are paused until a decision is made.</p>`,
    sms: 'Your Dima Hasao operator account is back under review.',
  });
};

/** An admin approved or rejected a package. */
export const notifyPackageDecision = async (operator, pkg, status, reason) => {
  const approved = status === 'approved';

  return dispatch({
    operator,
    subject: approved ? `"${pkg.title}" is live` : `"${pkg.title}" needs changes`,
    title: approved ? 'Package approved' : 'Package not approved',
    body: approved
      ? `<p><strong>${pkg.title}</strong> has been approved and is now visible to travellers.</p>`
      : `<p><strong>${pkg.title}</strong> was not approved.</p>
         <p><strong>Reason:</strong> ${reason || 'Criteria not met'}</p>
         <p>Edit it in your operator panel and save to resubmit.</p>`,
    sms: approved
      ? `"${pkg.title}" is now live on Dima Hasao.`
      : `"${pkg.title}" was not approved: ${reason || 'criteria not met'}.`,
  });
};

export default { notifyOperatorApproval, notifyPackageDecision };
