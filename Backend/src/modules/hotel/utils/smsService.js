/**
 * Hotel SMS — adapter over the centralized transport in
 * core/notifications/sms.service.js.
 *
 * This module used to be its own India Hub client pointed at a *different*
 * endpoint (`vendorsms/pushsms.aspx` rather than `api/mt/SendSMS`) with its own
 * message template and phone normalization, so hotel SMS could fail while food
 * and taxi SMS on the same credentials succeeded.
 *
 * The positional API (`sendOTP(phone, otp)`, `sendSMS(phone, message)`) and the
 * non-throwing `{ success, ... }` return contract are preserved, because
 * callers here are fire-and-forget booking alerts and an awaited signup OTP
 * that must not turn a provider outage into a failed registration.
 */
import { sendOtpSms, sendSms } from '../../../core/notifications/sms.service.js';

const toResult = (result) => ({
    success: result?.mode !== 'skipped',
    ...result,
});

const toFailure = (error, context) => {
    console.error(`⚠️ [SMS] ${context} failed:`, error?.message || error);
    return { success: false, error: error?.message || String(error) };
};

class HotelSmsService {
    /**
     * @param {string} phone
     * @param {string} otp
     * @param {string} [purpose]
     */
    async sendOTP(phone, otp, purpose = 'registration') {
        try {
            return toResult(await sendOtpSms({ phone, otp, purpose }));
        } catch (error) {
            return toFailure(error, `hotel ${purpose} OTP`);
        }
    }

    /**
     * @param {string} phone
     * @param {string} message
     */
    async sendSMS(phone, message) {
        try {
            return toResult(await sendSms({ phone, message, purpose: 'hotel notification' }));
        } catch (error) {
            return toFailure(error, 'hotel notification SMS');
        }
    }
}

export default new HotelSmsService();
