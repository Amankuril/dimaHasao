import express from 'express';
import { uploadDocuments } from '../../../../middleware/upload.js';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../../core/roles/role.middleware.js';
import * as orderController from '../../orders/controllers/order.controller.js';
import { FoodDeliveryPartner } from '../models/deliveryPartner.model.js';
import { sendError } from '../../../../utils/response.js';
import { registerDeliveryPartnerController, updateDeliveryPartnerProfileController, updateDeliveryPartnerBankDetailsController, listSupportTicketsController, createSupportTicketController, getSupportTicketByIdController, updateDeliveryPartnerDetailsController, updateDeliveryPartnerProfilePhotoBase64Controller, updateAvailabilityController, getWalletController, createWithdrawalRequestController, createCashDepositOrderController, verifyCashDepositPaymentController, submitCashDepositByHandController, getEarningsController, getTripHistoryController, getPocketDetailsController, getEmergencyHelpController, getCashLimitController, getDeliveryReferralStatsController, getActiveEarningAddonsController, getMyReviewsController } from '../controllers/delivery.controller.js';

const router = express.Router();

/*
 * Order, wallet and earnings routes need an approved partner, mirroring
 * requireApprovedRestaurant. A DELIVERY_PARTNER token says nothing about
 * approval — one could be minted for a pending or rejected partner — and these
 * routes let the holder list, accept and complete orders (seeing customer
 * addresses) and move money. Profile, registration, support and similar
 * onboarding routes stay open so a pending partner can finish signing up.
 */
const requireApprovedDeliveryPartner = async (req, res, next) => {
    if (req.user?.role !== 'DELIVERY_PARTNER') {
        return sendError(res, 403, 'Delivery partner access required');
    }

    try {
        const doc = await FoodDeliveryPartner.findById(req.user.userId).select('status').lean();
        if (!doc) {
            return sendError(res, 404, 'Delivery partner not found');
        }

        if (String(doc.status || '').toLowerCase() !== 'approved') {
            return sendError(res, 403, 'Delivery partner account is not approved yet');
        }

        next();
    } catch (error) {
        next(error);
    }
};

const uploadFields = uploadDocuments.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'aadharPhoto', maxCount: 1 },
    { name: 'panPhoto', maxCount: 1 },
    { name: 'drivingLicensePhoto', maxCount: 1 },
    { name: 'upiQrCode', maxCount: 1 }
]);

router.post('/register', uploadFields, registerDeliveryPartnerController);

router.patch('/profile', authMiddleware, requireRoles('DELIVERY_PARTNER'), uploadFields, updateDeliveryPartnerProfileController);

// JSON-only profile updates (no files) – safe for web updates like vehicle number.
router.patch('/profile/details', authMiddleware, requireRoles('DELIVERY_PARTNER'), updateDeliveryPartnerDetailsController);

// Base64 profile photo update – designed for Flutter in-app WebView camera handler.
router.post('/profile/photo-base64', authMiddleware, requireRoles('DELIVERY_PARTNER'), updateDeliveryPartnerProfilePhotoBase64Controller);

router.patch('/profile/bank-details', authMiddleware, requireRoles('DELIVERY_PARTNER'), uploadFields, updateDeliveryPartnerBankDetailsController);

router.patch('/availability', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, updateAvailabilityController);

router.get('/support-tickets', authMiddleware, requireRoles('DELIVERY_PARTNER'), listSupportTicketsController);
router.post('/support-tickets', authMiddleware, requireRoles('DELIVERY_PARTNER'), createSupportTicketController);
router.get('/support-tickets/:id', authMiddleware, requireRoles('DELIVERY_PARTNER'), getSupportTicketByIdController);

// ----- Orders -----
router.get('/orders/current', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.getCurrentTripDeliveryController);
router.get('/orders/available', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.listOrdersAvailableDeliveryController);
// Legacy Flutter InAppWebView polls these — MUST be registered before /orders/:orderId
router.get('/orders/assigned', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.listLegacyAssignedActiveDeliveryController);
router.get('/orders/active', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.listLegacyAssignedActiveDeliveryController);
router.get('/orders/pending', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.listLegacyPendingDeliveryController);
router.get('/orders/:orderId', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.getOrderByIdDeliveryController);
router.patch('/orders/:orderId/accept', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.acceptOrderDeliveryController);
router.patch('/orders/:orderId/reject', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.rejectOrderDeliveryController);
router.patch('/orders/:orderId/reached-pickup', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.confirmReachedPickupDeliveryController);
router.patch('/orders/:orderId/confirm-pickup', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.confirmPickupDeliveryController);
router.patch('/orders/:orderId/reached-drop', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.confirmReachedDropDeliveryController);
router.post('/orders/:orderId/verify-drop-otp', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.verifyDropOtpDeliveryController);
router.patch('/orders/:orderId/complete', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.completeDeliveryController);
router.patch('/orders/:orderId/status', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.updateOrderStatusDeliveryController);
router.post('/orders/:orderId/collect/qr', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.createCollectQrController);
router.get('/orders/:orderId/payment-status', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, orderController.getPaymentStatusController);

// ----- Earnings / Settings -----
router.get('/earning-addons/active', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, getActiveEarningAddonsController);
router.post('/reverify', authMiddleware, requireRoles('DELIVERY_PARTNER'), (req, res) => res.json({ success: true, message: 'Submitted' })); // Stub

// Pocket / requests page – wallet, earnings, and admin-set delivery settings
router.get('/wallet', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, getWalletController);
router.post('/wallet/withdraw', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, createWithdrawalRequestController);
router.post('/wallet/deposit/order', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, createCashDepositOrderController);
router.post('/wallet/deposit/verify', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, verifyCashDepositPaymentController);
router.post('/wallet/deposit/cash-submit', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, submitCashDepositByHandController);
router.get('/earnings', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, getEarningsController);
router.get('/trip-history', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, getTripHistoryController);
router.get('/pocket-details', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, getPocketDetailsController);
router.get('/emergency-help', authMiddleware, requireRoles('DELIVERY_PARTNER'), getEmergencyHelpController);
router.get('/cash-limit', authMiddleware, requireRoles('DELIVERY_PARTNER'), requireApprovedDeliveryPartner, getCashLimitController);
router.get('/referrals/stats', authMiddleware, requireRoles('DELIVERY_PARTNER'), getDeliveryReferralStatsController);
router.get('/my-reviews', authMiddleware, requireRoles('DELIVERY_PARTNER'), getMyReviewsController);


export default router;

