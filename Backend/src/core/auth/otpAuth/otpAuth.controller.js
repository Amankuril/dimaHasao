import { sendResponse } from '../../../utils/response.js';
import { requestOtpForAudience, verifyOtpForAudience } from './otpAuth.service.js';
import { listAuthAudiences } from './audienceRegistry.js';

/** POST /auth/otp/request  { audience, phone } */
export const requestOtpController = async (req, res, next) => {
    try {
        const { audience, phone, ...meta } = req.body || {};
        const result = await requestOtpForAudience(audience, phone, meta);

        return sendResponse(res, 200, 'OTP sent successfully', result);
    } catch (error) {
        next(error);
    }
};

/** POST /auth/otp/verify  { audience, phone, otp, ...payload } */
export const verifyOtpController = async (req, res, next) => {
    try {
        const { audience, phone, otp, ...payload } = req.body || {};
        const result = await verifyOtpForAudience(audience, phone, otp, payload);

        return sendResponse(res, 200, 'OTP verified successfully', result);
    } catch (error) {
        next(error);
    }
};

/** GET /auth/otp/audiences — what this deployment supports. */
export const listAudiencesController = async (_req, res, next) => {
    try {
        return sendResponse(res, 200, 'Audiences', { audiences: listAuthAudiences() });
    } catch (error) {
        next(error);
    }
};
