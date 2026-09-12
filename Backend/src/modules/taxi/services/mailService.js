/**
 * Taxi email — delegates to the centralized transport in
 * core/notifications/email.service.js.
 *
 * This module used to build its own nodemailer transport at import time, with
 * its own EMAIL_* reads and its own `secure` rule, so taxi mail could behave
 * differently from food and hotel on identical SMTP settings. The import path
 * is kept so existing callers need no changes.
 */
export { sendEmail } from '../../../core/notifications/email.service.js';
