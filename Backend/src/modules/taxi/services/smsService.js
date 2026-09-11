/**
 * Taxi SMS — delegates to the centralized transport in
 * core/notifications/sms.service.js.
 *
 * This module used to carry its own India Hub client: separate credential
 * reads (env.sms.* instead of config.*), its own phone normalization, its own
 * DLT template text and its own static-OTP switch. That meant taxi OTPs could
 * succeed or fail independently of food OTPs on identical input. The import
 * path is kept so existing callers (driver onboarding, driver login, pooling
 * onboarding, user login) need no changes.
 */
export { sendOtpSms, sendSms } from '../../../core/notifications/sms.service.js';
