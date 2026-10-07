import express from 'express';
import mongoose from 'mongoose';
import {
    getPaymentHistoryController,
    getOrderTransactionsController,
    getUserWalletBalanceController,
    getUserWalletTransactionsController,
    getRestaurantWalletController,
    getDeliveryWalletController,
    getAdminWalletController,
    getAdminFinanceSummaryController,
    listSettlementsController,
    createSettlementController,
    processSettlementController,
    listRefundsController,
    getRefundsByOrderController
} from './payment.controller.js';
import { requireRoles } from '../roles/role.middleware.js';
import { loadAdmin } from '../admin/admin.controller.js';
import { isPlatformSuperAdmin } from '../admin/adminHierarchy.service.js';
import { FoodOrder } from '../../modules/food/orders/models/order.model.js';
import { sendError } from '../../utils/response.js';

/*
 * Every route here used to sit behind authMiddleware alone, so any token —
 * a consumer, a rider, even a signup ticket — could read any order's payment
 * trail and any restaurant or rider wallet, and create and process
 * settlements that debit those wallets. Each route is now scoped to the party
 * it belongs to, and finance writes to an active platform superadmin.
 */
const router = express.Router();

const role = (req) => String(req.user?.role || '').toUpperCase();

/** The order's customer, its restaurant, its assigned rider, or an admin. */
const requireOrderParty = async (req, res, next) => {
    try {
        if (role(req) === 'ADMIN') return next();
        const { orderId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(orderId)) return sendError(res, 404, 'Order not found');
        const me = req.user?.userId;
        const order = await FoodOrder.findOne({
            _id: orderId,
            $or: [{ userId: me }, { restaurantId: me }, { 'dispatch.deliveryPartnerId': me }],
        }).select('_id').lean();
        if (!order) return sendError(res, 404, 'Order not found');
        next();
    } catch (err) {
        next(err);
    }
};

/** A restaurant or rider reading its own wallet (the :id must be the caller), or an admin. */
const requireSelfOrAdmin = (ownRole, param) => (req, res, next) => {
    if (role(req) === 'ADMIN') return next();
    if (role(req) === ownRole && String(req.params[param]) === String(req.user?.userId)) return next();
    return sendError(res, 403, 'Forbidden: insufficient permissions');
};

const requireFinanceAdmin = [
    requireRoles('ADMIN'),
    loadAdmin,
    (req, res, next) => (isPlatformSuperAdmin(req.admin)
        ? next()
        : sendError(res, 403, 'Only a platform superadmin can manage platform finance')),
];

// ─── Payment history for an order (user sees their payment trail) ───
router.get('/orders/:orderId/payments', requireOrderParty, getPaymentHistoryController);
router.get('/orders/:orderId/transactions', requireOrderParty, getOrderTransactionsController);
router.get('/orders/:orderId/refunds', requireOrderParty, getRefundsByOrderController);

// ─── User wallet (new transaction-based endpoints) ───
router.get('/wallet/balance', requireRoles('USER'), getUserWalletBalanceController);
router.get('/wallet/transactions', requireRoles('USER'), getUserWalletTransactionsController);

// ─── Restaurant wallet ───
router.get('/restaurant/:restaurantId/wallet', requireSelfOrAdmin('RESTAURANT', 'restaurantId'), getRestaurantWalletController);

// ─── Delivery partner wallet ───
router.get('/delivery/:deliveryPartnerId/wallet', requireSelfOrAdmin('DELIVERY_PARTNER', 'deliveryPartnerId'), getDeliveryWalletController);

// ─── Admin / Finance ───
router.get('/admin/wallet', requireFinanceAdmin, getAdminWalletController);
router.get('/admin/finance/summary', requireFinanceAdmin, getAdminFinanceSummaryController);
router.get('/admin/settlements', requireFinanceAdmin, listSettlementsController);
router.post('/admin/settlements', requireFinanceAdmin, createSettlementController);
router.post('/admin/settlements/:id/process', requireFinanceAdmin, processSettlementController);
router.get('/admin/refunds', requireFinanceAdmin, listRefundsController);

export default router;
