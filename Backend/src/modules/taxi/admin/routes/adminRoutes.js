import { Router } from 'express';
import { authenticate } from '../../middlewares/authMiddleware.js';
import {
  loginRateLimit,
  otpSendRateLimit,
  otpVerifyRateLimit,
} from '../../middlewares/rateLimitMiddleware.js';
import {
  approveServiceCenterStaffSignup,
  approveServiceStoreSignup,
  createAirport,
  createAdminAccount,
  createAppModule,
  createGoodsType,
  createDriver,
  createDriverNeededDocument,
  bulkImportDrivers,
  createRentalPackageType,
  createOnboardingScreen,
  createPreference,
  createRole,
  createPaymentMethod,
  createServiceLocation,
  createServiceStore,
  createServiceStoreStaff,
  createRentalVehicleType,
  createSetPrice,
  createSubscriptionPlan,
  createCustomerSubscriptionPlan,
  createUser,
  createZone,
  bulkImportUsers,
  approveUserDeletionRequest,
  approveDriverDeletionRequest,
  deleteAppModule,
  deleteDriver,
  deleteDriverNeededDocument,
  deleteGoodsType,
  deleteOnboardingScreen,
  deleteRentalPackageType,
  deleteOngoingRide,
  deletePreference,
  deleteRole,
  deletePaymentMethod,
  deleteRentalVehicleType,
  deleteSetPrice,
  deleteServiceLocation,
  deleteServiceStore,
  deleteUser,
  deleteZone,
  downloadDriverDutyReport,
  downloadDriverReport,
  downloadFinanceReport,
  downloadUserReport,
  forgotPassword,
  getAdminStatus,
  getAdminEarnings,
  getAirports,
  getPendingServiceCenterStaffSignups,
  getPendingServiceStoreSignups,
  getAppModules,
  getCancelChart,
  getCountries,
  getDashboardData,
  getDeliveries,
  getDriver,
  getDriverNeededDocument,
  getDriverNeededDocuments,
  getDriverProfile,
  getDriverOnboarding,
  getDrivers,
  getDriverRatings,
  getDriverRatingDetail,
  getNegativeBalanceDrivers,
  getDriverWithdrawalSummaries,
  getDriverWithdrawals,
  getDriverWithdrawalContextByRequestId,
  approveDriverWithdrawalRequest,
  rejectDriverWithdrawalRequest,
  getDeletedDrivers,
  getDriverDeletionRequests,
  getFirebaseSettings,
  getGoodsTypes,
  getIntercityTrips,
  getRentalPackageTypes,
  getGeneralSettingsCategory,
  getMailSettings,
  getMapSettings,
  getRechargeApiSettings,
  getNearbyServiceLocations,
  getNotificationChannels,
  getOngoingRides,
  getOverallEarnings,
  getPaymentGateways,
  getPaymentMethods,
  getPaymentSettings,
  getRentalBookingRequests,
  getRentalTrackingDashboard,
  getRentalQuoteRequests,
  getPreferences,
  getRentalVehicleTypes,
  getRideModules,
  getRoles,
  getReferralSettings,
  updateReferralSettings,
  getReferralDashboard,
  getSetPriceById,
  getSetPrices,
  getServiceLocations,
  getServiceStores,
  getSmsSettings,
  getSubscriptionPlans,
  getCustomerSubscriptionPlans,
  getSubscriptionSettings,
  getUserSubscriptions,
  updateSubscriptionSettings,
  getTodayEarnings,
  getUserOnboarding,
  getUser,
  getUsers,
  getDeletedUsers,
  getUserDeletionRequests,
  restoreDeletedUser,
  permanentlyDeleteDeletedUser,
  restoreDeletedDriver,
  permanentlyDeleteDeletedDriver,
  getRideRequests,
  rejectUserDeletionRequest,
  rejectDriverDeletionRequest,
  rejectServiceCenterStaffSignup,
  rejectServiceStoreSignup,
  getUserRequests,
  getUserWalletHistory,
  getVehiclePreferenceOptions,
  getVehicleTypeCatalog,
  getVehicleTypeById,
  getVehicleTypes,
  getWithdrawals,
  getZones,
  loginAdmin,
  resetPassword,
  verifyResetOtp,
  toggleChannelMail,
  toggleChannelPush,
  toggleZoneStatus,
  adjustUserWallet,
  listDriverWalletHistory,
  adjustDriverWallet,
  updateAppModule,
  updateAirport,
  updateAdminAccount,
  updateDriver,
  updateDriverNeededDocument,
  updateDriverPassword,
  updateFirebaseSettings,
  updateOnboardingScreen,
  updateGoodsType,
  updateRentalPackageType,
  updateGeneralSettingsCategory,
  updateMailSettings,
  updateMapSettings,
  updateRechargeApiSettings,
  updatePaymentSettings,
  updatePaymentMethod,
  updateRentalBookingRequest,
  updateRentalQuoteRequest,
  updatePreferenceStatus,
  updateRentalVehicleType,
  updateSetPrice,
  updateServiceLocation,
  updateServiceStore,
  updateSmsSettings,
  updateUser,
  updateVehicleType,
  updateZone,
  generateRechargeApiToken,
  runRechargeApiTest,
  createVehicleType,
  deleteAirport,
  deleteAdminAccount,
  deleteVehicleType,
  getAdminPermissions,
  getAdmins,
  getTransportTypes,
} from "../controllers/adminController.js";



import { uploadImage } from '../../common/controllers/commonController.js';
import { promotionsRouter } from '../promotions/routes/index.js';
import { listSafetyAlerts, resolveSafetyAlert } from '../../safety/controllers/safetyController.js';

export const adminRouter = Router();

adminRouter.get('/admin', getAdminStatus);
adminRouter.get('/admin/status', getAdminStatus);
adminRouter.post('/admin/login', loginRateLimit, loginAdmin);
adminRouter.post('/admin/forgot-password', otpSendRateLimit, forgotPassword);
adminRouter.post('/admin/verify-reset-otp', otpVerifyRateLimit, verifyResetOtp);
adminRouter.post('/admin/reset-password', otpVerifyRateLimit, resetPassword);

// Public route for app branding/settings
adminRouter.get('/admin/general-settings/:category', getGeneralSettingsCategory);

adminRouter.use('/admin', authenticate(['admin']));

adminRouter.get('/admin/permissions', getAdminPermissions);
adminRouter.get('/admin/admin-management/admins', getAdmins);
adminRouter.post('/admin/admin-management/admins', createAdminAccount);
adminRouter.patch('/admin/admin-management/admins/:id', updateAdminAccount);
adminRouter.delete('/admin/admin-management/admins/:id', deleteAdminAccount);

adminRouter.get('/admin/users', getUsers);
adminRouter.post('/admin/users/bulk-import', bulkImportUsers);
adminRouter.post('/admin/users', createUser);
adminRouter.get('/admin/users/deleted', getDeletedUsers);
adminRouter.patch('/admin/users/deleted/:id/restore', restoreDeletedUser);
adminRouter.delete('/admin/users/deleted/:id', permanentlyDeleteDeletedUser);
adminRouter.get('/admin/users/delete-requests', getUserDeletionRequests);
adminRouter.patch('/admin/users/delete-requests/:id/approve', approveUserDeletionRequest);
adminRouter.patch('/admin/users/delete-requests/:id/reject', rejectUserDeletionRequest);
adminRouter.get('/admin/users/:id', getUser);
adminRouter.patch('/admin/users/:id', updateUser);
adminRouter.delete('/admin/users/:id', deleteUser);
adminRouter.get('/admin/users/:id/subscriptions', getUserSubscriptions);
adminRouter.get('/admin/users/:id/requests', getUserRequests);
adminRouter.get('/admin/users/:id/wallet-history', getUserWalletHistory);

adminRouter.get('/admin/drivers', getDrivers);
adminRouter.post('/admin/drivers/bulk-import', bulkImportDrivers);
adminRouter.get('/admin/drivers/deleted', authenticate(['admin']), getDeletedDrivers);
adminRouter.get('/admin/drivers/delete-requests', authenticate(['admin']), getDriverDeletionRequests);
adminRouter.patch('/admin/drivers/delete-requests/:id/approve', authenticate(['admin']), approveDriverDeletionRequest);
adminRouter.patch('/admin/drivers/delete-requests/:id/reject', authenticate(['admin']), rejectDriverDeletionRequest);
adminRouter.patch('/admin/drivers/deleted/:id/restore', authenticate(['admin']), restoreDeletedDriver);
adminRouter.delete('/admin/drivers/deleted/:id', authenticate(['admin']), permanentlyDeleteDeletedDriver);
adminRouter.post('/admin/drivers', createDriver);
adminRouter.get('/admin/drivers/:id/profile', getDriverProfile);
adminRouter.get('/admin/drivers/:id', getDriver);
adminRouter.patch('/admin/drivers/:id', updateDriver);
adminRouter.patch('/admin/drivers/update-password/:id', updateDriverPassword);
adminRouter.delete('/admin/drivers/:id', deleteDriver);
adminRouter.post('/admin/wallet/users/:id/adjust', adjustUserWallet);
adminRouter.get('/admin/wallet/users/:id/history', getUserWalletHistory);

adminRouter.post('/admin/wallet/drivers/:id/adjust', adjustDriverWallet);
adminRouter.get('/admin/wallet/drivers/:id/history', listDriverWalletHistory);


adminRouter.get('/admin/wallet/drivers/negative-balance', authenticate(['admin']), getNegativeBalanceDrivers);
adminRouter.get('/admin/wallet/drivers/withdrawals', authenticate(['admin']), getDriverWithdrawalSummaries);
adminRouter.get('/admin/wallet/drivers/withdrawals/request/:requestId', authenticate(['admin']), getDriverWithdrawalContextByRequestId);
adminRouter.get('/admin/wallet/drivers/:id/withdrawals', authenticate(['admin']), getDriverWithdrawals);
adminRouter.patch('/admin/wallet/drivers/withdrawals/:requestId/approve', authenticate(['admin']), approveDriverWithdrawalRequest);
adminRouter.patch('/admin/wallet/drivers/withdrawals/:requestId/reject', authenticate(['admin']), rejectDriverWithdrawalRequest);
adminRouter.get('/admin/driver-ratings', authenticate(['admin']), getDriverRatings);
adminRouter.get('/admin/driver-ratings/:id', authenticate(['admin']), getDriverRatingDetail);

adminRouter.get('/admin/driver-subscriptions/plans/list', getSubscriptionPlans);
adminRouter.post('/admin/driver-subscriptions/plans/create', createSubscriptionPlan);
adminRouter.get('/admin/driver-subscriptions/settings', getSubscriptionSettings);
adminRouter.post('/admin/driver-subscriptions/settings', updateSubscriptionSettings);
adminRouter.get('/admin/user-subscriptions/plans/list', getCustomerSubscriptionPlans);
adminRouter.post('/admin/user-subscriptions/plans/create', createCustomerSubscriptionPlan);

adminRouter.get('/countries', getCountries);
adminRouter.get('/admin/countries', getCountries);
adminRouter.get('/admin/service-locations', getServiceLocations);
adminRouter.get('/admin/service-locations/nearby', getNearbyServiceLocations);
adminRouter.post('/admin/service-locations', createServiceLocation);
adminRouter.patch('/admin/service-locations/:id', updateServiceLocation);
adminRouter.delete('/admin/service-locations/:id', deleteServiceLocation);
adminRouter.get('/admin/service-stores', getServiceStores);
adminRouter.get('/admin/service-stores/pending', getPendingServiceStoreSignups);
adminRouter.get('/admin/service-stores/pending-staff', getPendingServiceCenterStaffSignups);
adminRouter.post('/admin/service-stores', createServiceStore);
adminRouter.patch('/admin/service-stores/:id', updateServiceStore);
adminRouter.post('/admin/service-stores/:id/staff', createServiceStoreStaff);
adminRouter.patch('/admin/service-stores/:id/approve', approveServiceStoreSignup);
adminRouter.patch('/admin/service-stores/:id/reject', rejectServiceStoreSignup);
adminRouter.patch('/admin/service-stores/staff/:id/approve', approveServiceCenterStaffSignup);
adminRouter.patch('/admin/service-stores/staff/:id/reject', rejectServiceCenterStaffSignup);
adminRouter.delete('/admin/service-stores/:id', deleteServiceStore);
adminRouter.get('/common/ride_modules', getRideModules);
adminRouter.get('/admin/types/vehicle-types/list', getVehicleTypes);
adminRouter.get('/admin/types/vehicle-types', getVehicleTypeCatalog);
adminRouter.get('/admin/types/vehicle-types/:id', getVehicleTypeById);
adminRouter.post('/admin/types/vehicle-types', createVehicleType);
adminRouter.patch('/admin/types/vehicle-types/:id', updateVehicleType);
adminRouter.delete('/admin/types/vehicle-types/:id', deleteVehicleType);
adminRouter.get('/admin/types/set-prices', getSetPrices);
adminRouter.get('/admin/types/set-prices/:id', getSetPriceById);
adminRouter.post('/admin/types/set-prices', createSetPrice);
adminRouter.patch('/admin/types/set-prices/:id', updateSetPrice);
adminRouter.delete('/admin/types/set-prices/:id', deleteSetPrice);
adminRouter.get('/admin/airports', getAirports);
adminRouter.post('/admin/airports', createAirport);
adminRouter.patch('/admin/airports/:id', updateAirport);
adminRouter.delete('/admin/airports/:id', deleteAirport);



// The taxi admin uploader used to be a second, Cloudinary-backed path that
// only the pooling screens called. It now shares the one uploader every other
// module uses, which writes WebP to disk.
adminRouter.post('/admin/upload-image', uploadImage);
adminRouter.get('/admin/types/rental-vehicles', getRentalVehicleTypes);
adminRouter.post('/admin/types/rental-vehicles', createRentalVehicleType);
adminRouter.patch('/admin/types/rental-vehicles/:id', updateRentalVehicleType);
adminRouter.delete('/admin/types/rental-vehicles/:id', deleteRentalVehicleType);

// Documents a driver must upload. These lived under /admin/owner-management
// only because the fleet-owner panel happened to render them; drivers are in
// scope and owners are not, so the path now says what it is.
adminRouter.get('/admin/drivers/needed-documents', getDriverNeededDocuments);
adminRouter.get('/admin/drivers/needed-documents/:id', getDriverNeededDocument);
adminRouter.post('/admin/drivers/needed-documents', createDriverNeededDocument);
adminRouter.patch('/admin/drivers/needed-documents/:id', updateDriverNeededDocument);
adminRouter.delete('/admin/drivers/needed-documents/:id', deleteDriverNeededDocument);

adminRouter.get('/admin/rental-booking-requests', getRentalBookingRequests);
adminRouter.get('/admin/rental-tracking', getRentalTrackingDashboard);
adminRouter.patch('/admin/rental-booking-requests/:id', updateRentalBookingRequest);
adminRouter.get('/admin/rental-quote-requests', getRentalQuoteRequests);
adminRouter.patch('/admin/rental-quote-requests/:id', updateRentalQuoteRequest);
adminRouter.get('/admin/goods-types', getGoodsTypes);
adminRouter.post('/admin/goods-types', createGoodsType);
adminRouter.patch('/admin/goods-types/:id', updateGoodsType);
adminRouter.delete('/admin/goods-types/:id', deleteGoodsType);
adminRouter.get('/admin/types/rental-packages', getRentalPackageTypes);
adminRouter.post('/admin/types/rental-packages', createRentalPackageType);
adminRouter.patch('/admin/types/rental-packages/:id', updateRentalPackageType);
adminRouter.delete('/admin/types/rental-packages/:id', deleteRentalPackageType);
adminRouter.get('/admin/types/transport-types', getTransportTypes);
adminRouter.get('/admin/vehicle_preference', getVehiclePreferenceOptions);


adminRouter.get('/admin/referrals/settings/:type', getReferralSettings);
adminRouter.patch('/admin/referrals/settings/:type', updateReferralSettings);
adminRouter.get('/admin/referral/dashboard', getReferralDashboard);

adminRouter.get('/admin/dashboard/data', getDashboardData);

adminRouter.get('/admin/dashboard/admin-earnings', getAdminEarnings);
adminRouter.get('/admin/dashboard/overall-earnings', getOverallEarnings);
adminRouter.get('/admin/dashboard/today-earnings', getTodayEarnings);
adminRouter.get('/admin/dashboard/cancel-chart', getCancelChart);
adminRouter.get('/admin/safety/alerts', authenticate(['admin']), listSafetyAlerts);
adminRouter.patch('/admin/safety/alerts/:id/resolve', authenticate(['admin']), resolveSafetyAlert);
adminRouter.get('/admin/ongoing-rides', getOngoingRides);
adminRouter.get('/admin/ride-requests', getRideRequests);
adminRouter.delete('/admin/ongoing-rides/:id', deleteOngoingRide);
adminRouter.get('/admin/deliveries', getDeliveries);
adminRouter.get('/admin/trips', getIntercityTrips);

adminRouter.get('/admin/wallet/withdrawals', getWithdrawals);

adminRouter.get('/admin/zones', getZones);
adminRouter.post('/admin/zones', createZone);
adminRouter.patch('/admin/zones/:id', updateZone);
adminRouter.delete('/admin/zones/:id', deleteZone);
adminRouter.patch('/admin/zones/:id/toggle-status', toggleZoneStatus);


adminRouter.get('/admin/preferences', getPreferences);
adminRouter.post('/admin/preferences', createPreference);
adminRouter.patch('/admin/preferences/:id/status', updatePreferenceStatus);
adminRouter.delete('/admin/preferences/:id', deletePreference);

adminRouter.get('/admin/roles', getRoles);
adminRouter.post('/admin/roles', createRole);
adminRouter.delete('/admin/roles/:id', deleteRole);

adminRouter.get('/admin/common/app-modules', getAppModules);
adminRouter.post('/admin/common/app-modules', createAppModule);
adminRouter.patch('/admin/common/app-modules/:id', updateAppModule);
adminRouter.delete('/admin/common/app-modules/:id', deleteAppModule);

adminRouter.get('/admin/notification-channels', getNotificationChannels);
adminRouter.patch('/admin/notification-channels/:id/push', toggleChannelPush);
adminRouter.patch('/admin/notification-channels/:id/mail', toggleChannelMail);

adminRouter.get('/admin/integration-settings/payment-gateways', getPaymentGateways);
adminRouter.get('/admin/integration-settings/payment-settings', getPaymentSettings);
adminRouter.patch('/admin/integration-settings/payment-settings', updatePaymentSettings);

adminRouter.get('/admin/payment-methods', authenticate(['admin']), getPaymentMethods);
adminRouter.post('/admin/payment-methods', authenticate(['admin']), createPaymentMethod);
adminRouter.patch('/admin/payment-methods/:id', authenticate(['admin']), updatePaymentMethod);
adminRouter.delete('/admin/payment-methods/:id', authenticate(['admin']), deletePaymentMethod);

adminRouter.get('/admin/integration-settings/sms', getSmsSettings);
adminRouter.patch('/admin/integration-settings/sms', updateSmsSettings);
adminRouter.get('/admin/integration-settings/firebase', getFirebaseSettings);
adminRouter.patch('/admin/integration-settings/firebase', updateFirebaseSettings);
adminRouter.get('/admin/integration-settings/map', getMapSettings);
adminRouter.patch('/admin/integration-settings/map', updateMapSettings);
adminRouter.get('/admin/integration-settings/mail', getMailSettings);
adminRouter.patch('/admin/integration-settings/mail', updateMailSettings);
adminRouter.get('/admin/integration-settings/recharge-api', getRechargeApiSettings);
adminRouter.patch('/admin/integration-settings/recharge-api', updateRechargeApiSettings);
adminRouter.post('/admin/integration-settings/recharge-api/generate-token', generateRechargeApiToken);
adminRouter.post('/admin/integration-settings/recharge-api/test', runRechargeApiTest);

adminRouter.get('/admin/general-settings/:category', getGeneralSettingsCategory);
adminRouter.patch('/admin/general-settings/:category', updateGeneralSettingsCategory);

adminRouter.get('/on-boarding', getUserOnboarding);
adminRouter.post('/on-boarding', createOnboardingScreen);
adminRouter.patch('/on-boarding/:id', updateOnboardingScreen);
adminRouter.delete('/on-boarding/:id', deleteOnboardingScreen);
adminRouter.get('/on-boarding-driver', getDriverOnboarding);

adminRouter.get('/admin/reports/user/download', downloadUserReport);
adminRouter.get('/admin/reports/driver/download', downloadDriverReport);
adminRouter.get('/admin/reports/driver-duty/download', downloadDriverDutyReport);
adminRouter.get('/admin/reports/finance/download', downloadFinanceReport);

adminRouter.use('/', promotionsRouter);
