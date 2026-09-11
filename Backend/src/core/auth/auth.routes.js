import express from 'express';
import {
    adminLoginController,
    refreshTokenController,
    logoutController,
    getMeController,
    updateAdminProfileController,
    changeAdminPasswordController,
    requestAdminForgotPasswordOtpController,
    resetAdminPasswordWithOtpController
} from './auth.controller.js';
import { authMiddleware, requireAdmin } from './auth.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';

const router = express.Router();

// router.use(authRateLimiter); // Removed global application to avoid rate-limiting /me or /refresh-token too strictly

// Phone + OTP sign-in for every app now lives at /v1/auth/otp
// (core/auth/otpAuth). Admin is password-based and stays here.

// Admin login
router.post('/admin/login', authRateLimiter, adminLoginController);

// Admin forgot password (no auth required)
router.post('/admin/forgot-password/request-otp', authRateLimiter, requestAdminForgotPasswordOtpController);
router.post('/admin/forgot-password/reset', authRateLimiter, resetAdminPasswordWithOtpController);

// Refresh token
router.post('/refresh-token', refreshTokenController);

// Logout (invalidates refresh token)
router.post('/logout', logoutController);

// Authenticated user profile (requires Bearer token)
router.get('/me', authMiddleware, getMeController);

// Admin-only: profile update & change password (Bearer + ADMIN role)
router.patch('/admin/profile', authMiddleware, requireAdmin, updateAdminProfileController);
router.post('/admin/change-password', authMiddleware, requireAdmin, changeAdminPasswordController);

export default router;

