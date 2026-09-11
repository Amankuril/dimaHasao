import express from 'express';
import { authRateLimiter } from '../../../middleware/rateLimit.js';
import {
    requestOtpController,
    verifyOtpController,
    listAudiencesController,
} from './otpAuth.controller.js';

/**
 * The single OTP auth surface, shared by all five apps. Mounted at
 * /api/v1/auth/otp — see routes/index.js.
 *
 *   POST /request   { audience, phone }
 *   POST /verify    { audience, phone, otp, ...payload }
 *   GET  /audiences
 */
const router = express.Router();

router.post('/request', authRateLimiter, requestOtpController);
router.post('/verify', authRateLimiter, verifyOtpController);
router.get('/audiences', listAudiencesController);

export default router;
