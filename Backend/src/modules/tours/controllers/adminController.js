/**
 * Tours admin: operator approval, package moderation, bookings and payouts.
 */
import mongoose from 'mongoose';
import TourOperator from '../models/TourOperator.js';
import TourPackage from '../models/TourPackage.js';
import TourBooking from '../models/TourBooking.js';
import ToursWallet from '../models/Wallet.js';
import ToursWithdrawal from '../models/Withdrawal.js';
import ToursTransaction from '../models/ToursTransaction.js';
import ToursSettings from '../models/ToursSettings.js';
import { createPackage, assertOperatorSellable } from '../services/package.service.js';
import { notifyOperatorApproval, notifyPackageDecision } from '../services/notify.service.js';
import { searchRegex } from '../../../utils/searchRegex.js';

/* ------------------------------------------------------------------ *
 * Operators
 * ------------------------------------------------------------------ */

/** @route GET /v1/tours/admin/operators */
export const getOperators = async (req, res) => {
  try {
    const { approvalStatus, search, minimal, page = 1, limit = 20 } = req.query;

    const query = {};
    if (approvalStatus && approvalStatus !== 'all') query.operatorApprovalStatus = approvalStatus;
    if (search) {
      const regex = searchRegex(search);
      query.$or = [{ name: regex }, { agencyName: regex }, { phone: regex }, { email: regex }];
    }

    // `minimal` feeds the operator picker on the admin create-package screen.
    if (minimal) {
      const operators = await TourOperator.find({ ...query, isBlocked: false })
        .select('name agencyName phone operatorApprovalStatus')
        .sort({ agencyName: 1 })
        .lean();
      return res.json({ success: true, operators });
    }

    const perPage = Math.min(Number(limit) || 20, 100);
    const [operators, total, summary] = await Promise.all([
      TourOperator.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((Math.max(1, Number(page)) - 1) * perPage)
        .limit(perPage)
        .lean(),
      TourOperator.countDocuments(query),
      TourOperator.aggregate([{ $group: { _id: '$operatorApprovalStatus', count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      operators,
      total,
      summary: summary.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {}),
    });
  } catch (error) {
    console.error('Get operators error:', error);
    res.status(500).json({ success: false, message: 'Failed to load operators' });
  }
};

/** @route GET /v1/tours/admin/operators/:id */
export const getOperatorDetail = async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id).select('-password').lean();
    if (!operator) return res.status(404).json({ success: false, message: 'Operator not found' });

    const [packageCount, bookingCount, wallet] = await Promise.all([
      TourPackage.countDocuments({ operatorId: operator._id }),
      TourBooking.countDocuments({ operatorId: operator._id }),
      ToursWallet.findOne({ ownerId: operator._id, role: 'operator' }).lean(),
    ]);

    res.json({ success: true, operator, stats: { packageCount, bookingCount, wallet } });
  } catch (error) {
    console.error('Get operator detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to load operator' });
  }
};

/** @route PATCH /v1/tours/admin/operators/:id/approval */
export const updateOperatorApproval = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid approval status' });
    }

    const operator = await TourOperator.findById(req.params.id);
    if (!operator) return res.status(404).json({ success: false, message: 'Operator not found' });

    operator.operatorApprovalStatus = status;
    if (status === 'approved') {
      if (!operator.operatorSince) operator.operatorSince = new Date();
      operator.rejectionReason = undefined;
    } else if (status === 'rejected') {
      operator.rejectionReason = reason || 'Criteria not met';
      // Their packages come off sale with them.
      await TourPackage.updateMany({ operatorId: operator._id }, { isActive: false });
    }
    await operator.save();

    // Best-effort and un-awaited: the decision is already saved, and a dead
    // SMTP or a missing FCM token must not fail the admin's request.
    notifyOperatorApproval(operator, status, operator.rejectionReason)
      .catch((error) => console.warn('[tours] operator approval notice failed:', error.message));

    res.json({ success: true, message: `Operator ${status}`, operator });
  } catch (error) {
    console.error('Update operator approval error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this operator' });
  }
};

/** @route PATCH /v1/tours/admin/operators/:id/block */
export const updateOperatorBlock = async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    if (!operator) return res.status(404).json({ success: false, message: 'Operator not found' });

    operator.isBlocked = Boolean(req.body.isBlocked);
    await operator.save();

    res.json({ success: true, isBlocked: operator.isBlocked });
  } catch (error) {
    console.error('Block operator error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this operator' });
  }
};

/* ------------------------------------------------------------------ *
 * Packages
 * ------------------------------------------------------------------ */

/** @route GET /v1/tours/admin/packages */
export const getAdminPackages = async (req, res) => {
  try {
    const { status, operatorId, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (operatorId && mongoose.Types.ObjectId.isValid(operatorId)) query.operatorId = operatorId;
    const titleMatch = searchRegex(search);
    if (titleMatch) query.title = titleMatch;

    const perPage = Math.min(Number(limit) || 20, 100);
    const [packages, total, summary] = await Promise.all([
      TourPackage.find(query)
        .sort({ createdAt: -1 })
        .skip((Math.max(1, Number(page)) - 1) * perPage)
        .limit(perPage)
        .populate('operatorId', 'name agencyName')
        .lean(),
      TourPackage.countDocuments(query),
      TourPackage.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      packages,
      total,
      summary: summary.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {}),
    });
  } catch (error) {
    console.error('Get admin packages error:', error);
    res.status(500).json({ success: false, message: 'Failed to load packages' });
  }
};

/**
 * @route POST /v1/tours/admin/packages
 * Admin creates a package on behalf of a selected operator.
 *
 * The operator id comes from the body, not the caller — the whole point of this
 * endpoint. It goes through the same service as the operator's own create, so
 * the two cannot validate differently.
 *
 * Published immediately by default: an admin creating a package *is* the
 * approval, and a queue where admins approve their own work is theatre. Pass
 * `publishImmediately: false` to leave it pending for the operator to review.
 */
export const createPackageForOperator = async (req, res) => {
  try {
    const { operatorId, publishImmediately = true, ...payload } = req.body;

    const operator = await assertOperatorSellable(operatorId);

    const pkg = await createPackage({
      operatorId: operator._id,
      payload,
      createdBy: 'admin',
      autoApprove: publishImmediately !== false,
      approvedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: publishImmediately !== false
        ? `Package published for ${operator.agencyName || operator.name}`
        : `Package created for ${operator.agencyName || operator.name}, pending their review`,
      package: pkg,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Admin create package error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to create package' });
  }
};

/** @route PATCH /v1/tours/admin/packages/:id/status */
export const updatePackageStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid package status' });
    }
    if (status === 'rejected' && !String(reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'A reason is required to reject a package' });
    }

    const pkg = await TourPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    pkg.status = status;
    if (status === 'approved') {
      pkg.approvedAt = new Date();
      pkg.approvedBy = req.user._id;
      pkg.rejectionReason = undefined;
    } else if (status === 'rejected') {
      pkg.rejectionReason = reason;
      pkg.approvedAt = undefined;
    }
    await pkg.save();

    if (status !== 'pending') {
      const operator = await TourOperator.findById(pkg.operatorId);
      if (operator) {
        notifyPackageDecision(operator, pkg, status, reason)
          .catch((error) => console.warn('[tours] package decision notice failed:', error.message));
      }
    }

    res.json({ success: true, message: `Package ${status}`, package: pkg });
  } catch (error) {
    console.error('Update package status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this package' });
  }
};

/* ------------------------------------------------------------------ *
 * Bookings, dashboard and payouts
 * ------------------------------------------------------------------ */

/** @route GET /v1/tours/admin/bookings */
export const getAdminBookings = async (req, res) => {
  try {
    const { status, operatorId, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== 'all') query.bookingStatus = status;
    if (operatorId && mongoose.Types.ObjectId.isValid(operatorId)) query.operatorId = operatorId;
    const bookingMatch = searchRegex(search);
    if (bookingMatch) query.bookingId = bookingMatch;

    const perPage = Math.min(Number(limit) || 20, 100);
    const [bookings, total] = await Promise.all([
      TourBooking.find(query)
        .sort({ createdAt: -1 })
        .skip((Math.max(1, Number(page)) - 1) * perPage)
        .limit(perPage)
        .populate('packageId', 'title heroImage')
        .populate('operatorId', 'name agencyName')
        .lean(),
      TourBooking.countDocuments(query),
    ]);

    res.json({ success: true, bookings, total });
  } catch (error) {
    console.error('Get admin bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
};

/** @route GET /v1/tours/admin/dashboard */
export const getDashboardStats = async (req, res) => {
  try {
    const paidMatch = { paymentStatus: { $in: ['advance_paid', 'paid'] } };

    const [operators, pendingOperators, packages, pendingPackages, bookings, money] = await Promise.all([
      TourOperator.countDocuments(),
      TourOperator.countDocuments({ operatorApprovalStatus: 'pending' }),
      TourPackage.countDocuments(),
      TourPackage.countDocuments({ status: 'pending' }),
      TourBooking.countDocuments(),
      TourBooking.aggregate([
        { $match: paidMatch },
        {
          $group: {
            _id: null,
            gross: { $sum: '$totalAmount' },
            collectedOnline: { $sum: '$advanceAmount' },
            commission: { $sum: '$adminCommission' },
            taxes: { $sum: '$taxes' },
            payout: { $sum: '$operatorPayout' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        operators,
        pendingOperators,
        packages,
        pendingPackages,
        bookings,
        ...(money[0]
          ? { gross: money[0].gross, collectedOnline: money[0].collectedOnline, commission: money[0].commission, taxes: money[0].taxes, payout: money[0].payout }
          : { gross: 0, collectedOnline: 0, commission: 0, taxes: 0, payout: 0 }),
      },
    });
  } catch (error) {
    console.error('Tours dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
};

/** Terminal states must not reopen; a paid-out request cannot be un-paid. */
const WITHDRAWAL_TRANSITIONS = {
  pending: ['processing', 'completed', 'failed', 'cancelled'],
  processing: ['completed', 'failed'],
  completed: [],
  failed: [],
  cancelled: [],
};
const REFUNDING_STATUSES = ['failed', 'cancelled'];

/** @route GET /v1/tours/admin/withdrawals */
export const getWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const perPage = Math.min(Number(limit) || 20, 100);
    const [withdrawals, total, summary] = await Promise.all([
      ToursWithdrawal.find(query)
        .sort({ createdAt: -1 })
        .skip((Math.max(1, Number(page)) - 1) * perPage)
        .limit(perPage)
        // Works because ownerId is declared against TourOperator, unlike hotel's
        // Withdrawal which claims ref:'User' and silently populates nothing.
        .populate('ownerId', 'name agencyName phone email')
        .lean(),
      ToursWithdrawal.countDocuments(query),
      ToursWithdrawal.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      success: true,
      withdrawals,
      total,
      summary: summary.reduce((acc, row) => ({ ...acc, [row._id]: { count: row.count, amount: row.amount } }), {}),
    });
  } catch (error) {
    console.error('Get tours withdrawals error:', error);
    res.status(500).json({ success: false, message: 'Failed to load payouts' });
  }
};

/** @route PATCH /v1/tours/admin/withdrawals/:id/status */
export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { status, utrNumber, remarks } = req.body;

    const withdrawal = await ToursWithdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Payout not found' });

    if (!(WITHDRAWAL_TRANSITIONS[withdrawal.status] || []).includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move a ${withdrawal.status} payout to ${status}.`,
      });
    }
    if (status === 'completed' && !String(utrNumber || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'A bank reference (UTR) is required to mark a payout completed.',
      });
    }

    const now = new Date();
    withdrawal.status = status;
    withdrawal.processingDetails = withdrawal.processingDetails || {};
    if (remarks) withdrawal.processingDetails.remarks = remarks;
    if (utrNumber) withdrawal.processingDetails.utrNumber = String(utrNumber).trim();
    if (status === 'processing') withdrawal.processingDetails.processedAt = now;
    if (status === 'completed') withdrawal.processingDetails.completedAt = now;
    if (REFUNDING_STATUSES.includes(status)) withdrawal.processingDetails.failedAt = now;

    // The wallet was debited when the request was raised, so a payout that never
    // happened has to go back before the request is closed.
    if (REFUNDING_STATUSES.includes(status)) {
      const wallet = await ToursWallet.findById(withdrawal.walletId);
      if (wallet) {
        await wallet.credit(
          withdrawal.amount,
          `Payout ${withdrawal.withdrawalId} ${status} — amount returned`,
          withdrawal.withdrawalId,
          'refund',
          { withdrawalId: withdrawal.withdrawalId, notes: remarks || status },
        );
        wallet.totalWithdrawals = Math.max(0, (wallet.totalWithdrawals || 0) - withdrawal.amount);
        await wallet.save();
      }
    }

    if (withdrawal.transactionId) {
      await ToursTransaction.findByIdAndUpdate(withdrawal.transactionId, {
        status: status === 'completed' ? 'completed' : REFUNDING_STATUSES.includes(status) ? 'failed' : 'pending',
      });
    }

    await withdrawal.save();
    res.json({ success: true, withdrawal });
  } catch (error) {
    console.error('Update tours withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this payout' });
  }
};

/** @route GET/PUT /v1/tours/admin/settings */
export const getSettings = async (_req, res) => {
  try {
    res.json({ success: true, settings: await ToursSettings.getSettings() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await ToursSettings.getSettings();
    const { platformOpen, bookingDisabledMessage, defaultCommission, taxRate } = req.body;

    if (typeof platformOpen === 'boolean') settings.platformOpen = platformOpen;
    if (typeof bookingDisabledMessage === 'string') settings.bookingDisabledMessage = bookingDisabledMessage;
    if (defaultCommission !== undefined) {
      const value = Number(defaultCommission);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return res.status(400).json({ success: false, message: 'Commission must be between 0 and 100' });
      }
      settings.defaultCommission = value;
    }
    if (taxRate !== undefined) {
      const value = Number(taxRate);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return res.status(400).json({ success: false, message: 'Tax rate must be between 0 and 100' });
      }
      settings.taxRate = value;
    }

    await settings.save();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update tours settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
