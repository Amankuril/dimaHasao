import { Router } from 'express';
import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { authenticate } from '../../middlewares/authMiddleware.js';
import { loginRateLimit, otpVerifyRateLimit, paymentOrderRateLimit } from "../../middlewares/rateLimitMiddleware.js";

import {
  createRentalAdvancePaymentOrder,
  createPhonePeRentalAdvancePaymentOrder,
  payRentalAdvanceWithWallet,
  createRentalBookingRequest,
  createRentalQuoteRequest,
  createRazorpayWalletTopupOrder,
  createPhonePeWalletTopupOrder,
  handleUserRazorpayWalletTopupCallback,
  getUserWallet,
  getCurrentUser,
  getUserNotifications,
  deleteUserNotification,
  endMyActiveRentalRide,
  getIntercityPackageCatalog,
  clearAllUserNotifications,
  getMyActiveRentalBooking,
  listPublicServiceLocations,
  listPublicServiceStores,
  listMyRentalBookings,
  loginUser,
  registerUser,
  requestAccountDeletion,
  saveUserFcmToken,
  signupUser,
  topupUserWallet,
  transferUserWalletToDriver,
  transferUserWallet,
  updateMyActiveRentalLocation,
  updateCurrentUser,
  uploadUserProfileImage,
  verifyRentalAdvancePayment,
  verifyPhonePeRentalAdvancePayment,
  verifyRazorpayWalletTopup,
  verifyPhonePeWalletTopup,
  verifyUserPhoneForOtpLogin,
  getAvailableSubscriptionPlans,
  getMySubscriptions,
  buySubscription,
  getSetPrices,
  getZones,
} from "../controllers/userController.js";

import { getAppBootstrap, getAppModules, getGeneralSettingsCategory, getGoodsTypes, getPublicRentalVehicleCatalog, getPublicVehicleTypeCatalog } from '../../admin/controllers/adminController.js';
import { triggerUserSosAlert } from '../../safety/controllers/safetyController.js';

export const userRouter = Router();

userRouter.get('/bootstrap', asyncHandler(getAppBootstrap));
userRouter.get('/app-modules', asyncHandler(getAppModules));
userRouter.get('/settings/:category', asyncHandler(getGeneralSettingsCategory));
userRouter.get('/intercity-packages', asyncHandler(getIntercityPackageCatalog));
userRouter.get('/goods-types', asyncHandler(getGoodsTypes));
userRouter.get('/vehicle-types', asyncHandler(getPublicVehicleTypeCatalog));
userRouter.get('/set-prices', asyncHandler(getSetPrices));
userRouter.get('/zones', asyncHandler(getZones));
userRouter.get('/rental-vehicles', asyncHandler(getPublicRentalVehicleCatalog));
userRouter.get('/service-locations', asyncHandler(listPublicServiceLocations));
userRouter.get('/service-stores', asyncHandler(listPublicServiceStores));
userRouter.post('/rental-quote-requests', asyncHandler(createRentalQuoteRequest));
userRouter.post('/rental-bookings', authenticate(['user']), asyncHandler(createRentalBookingRequest));
userRouter.get('/rental-bookings', authenticate(['user']), asyncHandler(listMyRentalBookings));
userRouter.get('/rental-bookings/active', authenticate(['user']), asyncHandler(getMyActiveRentalBooking));
userRouter.post('/rental-bookings/:id/end', authenticate(['user']), asyncHandler(endMyActiveRentalRide));
userRouter.post('/rental-bookings/:id/location', authenticate(['user']), asyncHandler(updateMyActiveRentalLocation));
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
userRouter.get('/subscriptions/plans', authenticate(['user']), asyncHandler(getAvailableSubscriptionPlans));
userRouter.get('/subscriptions/me', authenticate(['user']), asyncHandler(getMySubscriptions));
userRouter.post('/subscriptions/purchase', authenticate(['user']), asyncHandler(buySubscription));
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
userRouter.post('/rental-advance/razorpay/order', authenticate(['user']), paymentOrderRateLimit, asyncHandler(createRentalAdvancePaymentOrder));
userRouter.post('/rental-advance/razorpay/verify', authenticate(['user']), asyncHandler(verifyRentalAdvancePayment));
userRouter.post('/rental-advance/phonepe/order', authenticate(['user']), paymentOrderRateLimit, asyncHandler(createPhonePeRentalAdvancePaymentOrder));
userRouter.get('/rental-advance/phonepe/status/:merchantTransactionId', authenticate(['user']), asyncHandler(verifyPhonePeRentalAdvancePayment));
userRouter.post('/rental-advance/wallet', authenticate(['user']), asyncHandler(payRentalAdvanceWithWallet));

