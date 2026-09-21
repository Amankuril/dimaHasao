import { Router } from "express";
import { asyncHandler } from "../../../../utils/asyncHandler.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { loginRateLimit, paymentOrderRateLimit } from "../../middlewares/rateLimitMiddleware.js";

import {
  addDriverEmergencyContact,
  completeOnboarding,
  createDriverPaymentQr,
  handleDriverRazorpayWalletTopupCallback,
  createServiceCenterStaffMember,
  enrollServiceCenterStaffBiometric,
  updateServiceCenterStaffMember,
  createDriverWithdrawalRequest,
  createServiceCenterVehicle,
  captureServiceCenterBookingFingerprint,
  deleteServiceCenterBookingFingerprint,
  deleteCurrentDriverAccount,
  deleteServiceCenterVehicle,
  deleteServiceCenterStaffMember,
  updateServiceCenterVehicle,
  deleteDriverEmergencyContact,
  claimDriverIncentiveReward,
  goOffline,
  goOnline,
  getCurrentDriver,
  getDriverPaymentQrStatus,
  getDriverApprovalStatus,
  getDriverDocumentTemplates,
  getDriverVehicleFieldTemplates,
  getDriverEmergencyContacts,
  getDriverIncentives,
  getDriverNotifications,
  cancelDriverScheduledRide,
  getDriverScheduledRides,
  getServiceCenterBookings,
  getServiceCenterBookingBiometrics,
  getServiceCenterStaffBiometrics,
  getServiceCenterStaffMembers,
  getServiceCenterVehicles,
  saveDriverFcmToken,
  getMyWallet,
  getOnboardingSession,
  getOnboardingSignupOptions,
  getServiceLocations,
  loginDriver,
  saveOnboardingDocuments,
  saveOnboardingRoleDetails,
  saveOnboardingRole,
  saveOnboardingPersonal,
  saveOnboardingReferral,
  saveOnboardingVehicle,
  verifyOnboardingLicenseDocument,
  verifyOnboardingVehicleRc,
  registerDriver,
  requestDriverAccountDeletion,
  startOnboarding,
  topUpMyWallet,
  createDriverWalletTopupOrder,
  createDriverPhonePeWalletTopupOrder,
  verifyDriverWalletTopup,
  verifyDriverPhonePeWalletTopup,
  verifyCurrentDriverBankDetails,
  verifyCurrentDriverBankDocument,
  verifyCurrentDriverUpiDetails,
  verifyCurrentDriverLicenseDocument,
  verifyCurrentDriverGstinDocument,
  verifyCurrentDriverPanDocument,
  verifyCurrentDriverRcDocument,
  updateCurrentDriver,
  updateDriverVehicle,
  updateServiceCenterBookingBiometrics,
  updateServiceCenterBooking,
  verifyServiceCenterBookingFingerprint,
  verifyOnboardingOtp,
  updateCurrentDriverDocument,
} from "../controllers/driverController.js";

import { triggerDriverSosAlert } from '../../safety/controllers/safetyController.js';

export const driverRouter = Router();

driverRouter.post("/register", asyncHandler(registerDriver));
driverRouter.post("/login", loginRateLimit, asyncHandler(loginDriver));
// Driver sign-in now lives at /v1/auth/otp (audience 'taxi-driver').
driverRouter.get(
  "/me",
  authenticate(["driver", "service_center", "service_center_staff"], { allowPending: true }),
  asyncHandler(getCurrentDriver),
);
driverRouter.patch(
  "/me",
  authenticate(["driver"]),
  asyncHandler(updateCurrentDriver),
);
driverRouter.post(
  "/me/bank-details/verify",
  authenticate(["driver"]),
  asyncHandler(verifyCurrentDriverBankDetails),
);
driverRouter.post(
  "/me/upi/verify",
  authenticate(["driver"]),
  asyncHandler(verifyCurrentDriverUpiDetails),
);
driverRouter.delete(
  "/me",
  authenticate(["driver"]),
  asyncHandler(deleteCurrentDriverAccount),
);
driverRouter.post(
  "/me/delete-request",
  authenticate(["driver"]),
  asyncHandler(requestDriverAccountDeletion),
);
driverRouter.post(
  "/sos",
  authenticate(["driver"]),
  asyncHandler(triggerDriverSosAlert),
);
driverRouter.get(
  "/emergency-contacts",
  authenticate(["driver"]),
  asyncHandler(getDriverEmergencyContacts),
);
driverRouter.post(
  "/emergency-contacts",
  authenticate(["driver"]),
  asyncHandler(addDriverEmergencyContact),
);
driverRouter.delete(
  "/emergency-contacts/:contactId",
  authenticate(["driver"]),
  asyncHandler(deleteDriverEmergencyContact),
);
driverRouter.patch(
  "/documents/:documentKey",
  authenticate(["driver"], { allowPending: true }),
  asyncHandler(updateCurrentDriverDocument),
);
driverRouter.post(
  "/documents/:documentKey/verify-license",
  authenticate(["driver"], { allowPending: true }),
  asyncHandler(verifyCurrentDriverLicenseDocument),
);
driverRouter.post(
  "/documents/:documentKey/verify-pan",
  authenticate(["driver"], { allowPending: true }),
  asyncHandler(verifyCurrentDriverPanDocument),
);
driverRouter.post(
  "/documents/:documentKey/verify-gst",
  authenticate(["driver"], { allowPending: true }),
  asyncHandler(verifyCurrentDriverGstinDocument),
);
driverRouter.post(
  "/documents/:documentKey/verify-rc",
  authenticate(["driver"], { allowPending: true }),
  asyncHandler(verifyCurrentDriverRcDocument),
);
driverRouter.post(
  "/documents/:documentKey/verify-bank",
  authenticate(["driver"], { allowPending: true }),
  asyncHandler(verifyCurrentDriverBankDocument),
);
driverRouter.get(
  "/notifications",
  authenticate(["driver"]),
  asyncHandler(getDriverNotifications),
);
driverRouter.get(
  "/scheduled-rides",
  authenticate(["driver"]),
  asyncHandler(getDriverScheduledRides),
);
driverRouter.post(
  "/scheduled-rides/:rideId/cancel",
  authenticate(["driver"]),
  asyncHandler(cancelDriverScheduledRide),
);
driverRouter.post(
  "/fcm-token",
  authenticate(["driver", "service_center", "service_center_staff"], { allowPending: true }),
  asyncHandler(saveDriverFcmToken),
);
driverRouter.get(
  "/wallet",
  authenticate(["driver"]),
  asyncHandler(getMyWallet),
);
driverRouter.get(
  "/incentives",
  authenticate(["driver"]),
  asyncHandler(getDriverIncentives),
);
driverRouter.post(
  "/incentives/claim",
  authenticate(["driver"]),
  asyncHandler(claimDriverIncentiveReward),
);
driverRouter.post(
  "/wallet/top-up",
  authenticate(["driver"]),
  asyncHandler(topUpMyWallet),
);
driverRouter.post(
  "/wallet/top-up/razorpay/callback",
  asyncHandler(handleDriverRazorpayWalletTopupCallback),
);
driverRouter.get(
  "/wallet/top-up/razorpay/callback",
  asyncHandler(handleDriverRazorpayWalletTopupCallback),
);
driverRouter.post(
    "/wallet/top-up/razorpay/order",
    authenticate(["driver"]),
    paymentOrderRateLimit,
    asyncHandler(createDriverWalletTopupOrder),
);
driverRouter.post(
    "/wallet/top-up/phonepe/order",
    authenticate(["driver"]),
    paymentOrderRateLimit,
    asyncHandler(createDriverPhonePeWalletTopupOrder),
);
  driverRouter.post(
    "/wallet/top-up/razorpay/verify",
    authenticate(["driver"]),
    asyncHandler(verifyDriverWalletTopup),
  );
  driverRouter.get(
    "/wallet/top-up/phonepe/status/:merchantTransactionId",
    authenticate(["driver"]),
    asyncHandler(verifyDriverPhonePeWalletTopup),
  );
driverRouter.post(
  "/wallet/withdrawals",
  authenticate(["driver"]),
  asyncHandler(createDriverWithdrawalRequest),
);

driverRouter.post(
  "/payments/qr",
  authenticate(["driver"]),
  asyncHandler(createDriverPaymentQr),
);
driverRouter.get(
  "/payments/qr/status",
  authenticate(["driver"]),
  asyncHandler(getDriverPaymentQrStatus),
);
driverRouter.patch(
  "/vehicle",
  authenticate(["driver"]),
  asyncHandler(updateDriverVehicle),
);
driverRouter.get("/approval-status", asyncHandler(getDriverApprovalStatus));
driverRouter.get(
  "/service-center/staff",
  authenticate(["service_center"]),
  asyncHandler(getServiceCenterStaffMembers),
);
driverRouter.post(
  "/service-center/staff",
  authenticate(["service_center"]),
  asyncHandler(createServiceCenterStaffMember),
);
driverRouter.patch(
  "/service-center/staff/:staffId",
  authenticate(["service_center"]),
  asyncHandler(updateServiceCenterStaffMember),
);
driverRouter.delete(
  "/service-center/staff/:staffId",
  authenticate(["service_center"]),
  asyncHandler(deleteServiceCenterStaffMember),
);
driverRouter.get(
  "/service-center/staff/:staffId/biometrics",
  authenticate(["service_center", "service_center_staff"]),
  asyncHandler(getServiceCenterStaffBiometrics),
);
driverRouter.post(
  "/service-center/staff/biometrics/enroll",
  authenticate(["service_center", "service_center_staff"]),
  asyncHandler(enrollServiceCenterStaffBiometric),
);
driverRouter.get(
  "/service-center/bookings",
  authenticate(["service_center", "service_center_staff"]),
  asyncHandler(getServiceCenterBookings),
);
driverRouter.get(
  "/service-center/bookings/:bookingId/biometrics",
  authenticate(["service_center", "service_center_staff"]),
  asyncHandler(getServiceCenterBookingBiometrics),
);
driverRouter.patch(
  "/service-center/bookings/:bookingId/biometrics",
  authenticate(["service_center", "service_center_staff"]),
  asyncHandler(updateServiceCenterBookingBiometrics),
);
driverRouter.post(
  "/service-center/bookings/:bookingId/biometrics/fingers",
  authenticate(["service_center", "service_center_staff"]),
  asyncHandler(captureServiceCenterBookingFingerprint),
);
driverRouter.delete(
  "/service-center/bookings/:bookingId/biometrics/fingers/:fingerCode",
  authenticate(["service_center", "service_center_staff"]),
  asyncHandler(deleteServiceCenterBookingFingerprint),
);
driverRouter.post(
  "/service-center/bookings/:bookingId/biometrics/verify",
  authenticate(["service_center", "service_center_staff"]),
  asyncHandler(verifyServiceCenterBookingFingerprint),
);
driverRouter.patch(
  "/service-center/bookings/:bookingId",
  authenticate(["service_center", "service_center_staff"]),
  asyncHandler(updateServiceCenterBooking),
);
driverRouter.get(
  "/service-center/vehicles",
  authenticate(["service_center", "service_center_staff"]),
  asyncHandler(getServiceCenterVehicles),
);
driverRouter.post(
  "/service-center/vehicles",
  authenticate(["service_center"]),
  asyncHandler(createServiceCenterVehicle),
);
driverRouter.patch(
  "/service-center/vehicles/:vehicleId",
  authenticate(["service_center"]),
  asyncHandler(updateServiceCenterVehicle),
);
driverRouter.delete(
  "/service-center/vehicles/:vehicleId",
  authenticate(["service_center"]),
  asyncHandler(deleteServiceCenterVehicle),
);
driverRouter.get("/service-locations", asyncHandler(getServiceLocations));
driverRouter.get(
  "/document-templates",
  asyncHandler(getDriverDocumentTemplates),
);
driverRouter.get(
  "/vehicle-field-templates",
  asyncHandler(getDriverVehicleFieldTemplates),
);
driverRouter.post("/onboarding/send-otp", asyncHandler(startOnboarding));
driverRouter.post("/onboarding/verify-otp", asyncHandler(verifyOnboardingOtp));
driverRouter.patch("/onboarding/role", asyncHandler(saveOnboardingRole));
driverRouter.get("/onboarding/signup-options", asyncHandler(getOnboardingSignupOptions));
driverRouter.patch("/onboarding/role-details", asyncHandler(saveOnboardingRoleDetails));
driverRouter.patch(
  "/onboarding/personal",
  asyncHandler(saveOnboardingPersonal),
);
driverRouter.patch(
  "/onboarding/referral",
  asyncHandler(saveOnboardingReferral),
);
driverRouter.patch("/onboarding/vehicle", asyncHandler(saveOnboardingVehicle));
driverRouter.post("/onboarding/vehicle/verify-rc", asyncHandler(verifyOnboardingVehicleRc));
driverRouter.post(
  "/onboarding/documents/:documentKey/verify-license",
  asyncHandler(verifyOnboardingLicenseDocument),
);
driverRouter.patch(
  "/onboarding/documents",
  asyncHandler(saveOnboardingDocuments),
);
driverRouter.post("/onboarding/complete", asyncHandler(completeOnboarding));
driverRouter.get(
  "/onboarding/session/:registrationId",
  asyncHandler(getOnboardingSession),
);
driverRouter.patch("/online", authenticate(["driver"]), asyncHandler(goOnline));
driverRouter.patch(
  "/offline",
  authenticate(["driver"]),
  asyncHandler(goOffline),
);
