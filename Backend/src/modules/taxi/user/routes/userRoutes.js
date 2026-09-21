import { Router } from 'express';
import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { authenticate } from '../../middlewares/authMiddleware.js';
import { loginRateLimit, otpVerifyRateLimit, paymentOrderRateLimit } from "../../middlewares/rateLimitMiddleware.js";

import {
  createRazorpayWalletTopupOrder,
  createPhonePeWalletTopupOrder,
  handleUserRazorpayWalletTopupCallback,
  getUserWallet,
  getCurrentUser,
  getUserNotifications,
  deleteUserNotification,
  getIntercityPackageCatalog,
  clearAllUserNotifications,
  listPublicServiceLocations,
  loginUser,
  registerUser,
  requestAccountDeletion,
  saveUserFcmToken,
  signupUser,
  topupUserWallet,
  transferUserWalletToDriver,
  transferUserWallet,
  updateCurrentUser,
  uploadUserProfileImage,
  verifyRazorpayWalletTopup,
  verifyPhonePeWalletTopup,
  verifyUserPhoneForOtpLogin,
  getSetPrices,
  getZones,
} from "../controllers/userController.js";




import { getAppBootstrap, getAppModules, getGeneralSettingsCategory, getPublicVehicleTypeCatalog } from "../../admin/controllers/adminController.js";


import { triggerUserSosAlert } from '../../safety/controllers/safetyController.js';

export const userRouter = Router();

userRouter.get('/bootstrap', asyncHandler(getAppBootstrap));
userRouter.get('/app-modules', asyncHandler(getAppModules));
userRouter.get('/settings/:category', asyncHandler(getGeneralSettingsCategory));
userRouter.get('/intercity-packages', asyncHandler(getIntercityPackageCatalog));
userRouter.get('/vehicle-types', asyncHandler(getPublicVehicleTypeCatalog));
userRouter.get('/set-prices', asyncHandler(getSetPrices));
userRouter.get('/zones', asyncHandler(getZones));
userRouter.get('/service-locations', asyncHandler(listPublicServiceLocations));
userRouter.post('/register', asyncHandler(registerUser));
userRouter.post('/signup', asyncHandler(signupUser));
userRouter.post('/login', loginRateLimit, asyncHandler(loginUser));
userRouter.post('/profile-image', asyncHandler(uploadUserProfileImage));
// Consumer sign-in now lives at /v1/auth/otp (audience 'user') — one account
// across food, taxi, hotel and tours.
userRouter.post('/otp-login', otpVerifyRateLimit, asyncHandler(verifyUserPhoneForOtpLogin));
userRouter.post('/fcm-token', authenticate(['user']), asyncHandler(saveUserFcmToken));
userRouter.get('/me', authenticate(['user']), asyncHandler(getCurrentUser));
userRouter.patch('/me', authenticate(['user']), asyncHandler(updateCurrentUser));
userRouter.post('/me/delete-request', authenticate(['user']), asyncHandler(requestAccountDeletion));
userRouter.get('/notifications', authenticate(['user']), asyncHandler(getUserNotifications));
userRouter.delete('/notifications/:id', authenticate(['user']), asyncHandler(deleteUserNotification));
userRouter.delete('/notifications', authenticate(['user']), asyncHandler(clearAllUserNotifications));
userRouter.post('/sos', authenticate(['user']), asyncHandler(triggerUserSosAlert));
userRouter.get('/wallet', authenticate(['user']), asyncHandler(getUserWallet));
userRouter.post('/wallet/topup', authenticate(['user']), asyncHandler(topupUserWallet));
userRouter.post('/wallet/transfer', authenticate(['user']), asyncHandler(transferUserWallet));
userRouter.post('/wallet/transfer/driver', authenticate(['user']), asyncHandler(transferUserWalletToDriver));
userRouter.post('/wallet/razorpay/order', authenticate(['user']), paymentOrderRateLimit, asyncHandler(createRazorpayWalletTopupOrder));
userRouter.post('/wallet/razorpay/verify', authenticate(['user']), asyncHandler(verifyRazorpayWalletTopup));
userRouter.post('/wallet/razorpay/callback', asyncHandler(handleUserRazorpayWalletTopupCallback));
userRouter.get('/wallet/razorpay/callback', asyncHandler(handleUserRazorpayWalletTopupCallback));
userRouter.post('/wallet/phonepe/order', authenticate(['user']), paymentOrderRateLimit, asyncHandler(createPhonePeWalletTopupOrder));
userRouter.get('/wallet/phonepe/status/:merchantTransactionId', authenticate(['user']), asyncHandler(verifyPhonePeWalletTopup));

