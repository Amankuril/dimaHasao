/**
 * Tours admin: the whole module.
 *
 * Tours are single-vendor — the district runs them itself, exactly as it runs
 * its festivals — so there is no operator to approve and no payout to settle.
 * Everything a package needs is done from here.
 */
import TourPackage from '../models/TourPackage.js';
import TourBooking from '../models/TourBooking.js';
import ToursSettings from '../models/ToursSettings.js';
import {
  createPackage,
  buildPackageDocument,
  validatePackagePayload,
} from '../services/package.service.js';
import { searchRegex } from '../../../utils/searchRegex.js';

/* ------------------------------------------------------------------ *
 * Packages
 * ------------------------------------------------------------------ */

export const getAdminPackages = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    const titleMatch = searchRegex(search);
    if (titleMatch) query.title = titleMatch;

    const perPage = Math.min(Number(limit) || 20, 100);
    const [packages, total, summary] = await Promise.all([
      TourPackage.find(query)
        .sort({ createdAt: -1 })
        .skip((Math.max(1, Number(page)) - 1) * perPage)
        .limit(perPage)
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

/**
 * @route POST /v1/tours/admin/packages
 *
 * Published immediately by default: an admin creating a package *is* the
 * approval, and a queue where admins approve their own work is theatre. Pass
 * `publishImmediately: false` to park it as a draft.
 */
export const createAdminPackage = async (req, res) => {
  try {
    const { publishImmediately = true, ...payload } = req.body;

    const pkg = await createPackage({
      payload,
      autoApprove: publishImmediately !== false,
      approvedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: publishImmediately !== false ? 'Package published' : 'Package saved as a draft',
      package: pkg,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Admin create package error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to create package' });
  }
};

/**
 * @route PUT /v1/tours/admin/packages/:id
 *
 * An admin edit does not re-pend the package the way an operator edit used to:
 * the person editing is the person who would approve it.
 */
export const updateAdminPackage = async (req, res) => {
  try {
    const validationError = validatePackagePayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const pkg = await TourPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    Object.assign(pkg, buildPackageDocument(req.body));
    await pkg.save();

    res.json({ success: true, message: 'Package updated', package: pkg });
  } catch (error) {
    console.error('Admin update package error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this package' });
  }
};

/** @route PATCH /v1/tours/admin/packages/:id/active */
export const toggleAdminPackage = async (req, res) => {
  try {
    const pkg = await TourPackage.findById(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    pkg.isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : !pkg.isActive;
    await pkg.save();

    res.json({
      success: true,
      message: pkg.isActive ? 'Package is live' : 'Package hidden from travellers',
      package: pkg,
    });
  } catch (error) {
    console.error('Toggle package error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this package' });
  }
};

/**
 * @route DELETE /v1/tours/admin/packages/:id
 *
 * Refused while bookings reference it: deleting the package would orphan a
 * traveller's booking. Switch it off with /active instead.
 */
export const deleteAdminPackage = async (req, res) => {
  try {
    const booked = await TourBooking.countDocuments({ packageId: req.params.id });
    if (booked > 0) {
      return res.status(409).json({
        success: false,
        message: `This package has ${booked} booking${booked === 1 ? '' : 's'}. Switch it off instead of deleting it.`,
      });
    }

    const pkg = await TourPackage.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    res.json({ success: true, message: 'Package deleted' });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete this package' });
  }
};

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

    res.json({ success: true, message: `Package ${status}`, package: pkg });
  } catch (error) {
    console.error('Update package status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this package' });
  }
};

/* ------------------------------------------------------------------ *
 * Bookings and dashboard
 * ------------------------------------------------------------------ */

/** @route GET /v1/tours/admin/bookings */
export const getAdminBookings = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== 'all') query.bookingStatus = status;
    const bookingMatch = searchRegex(search);
    if (bookingMatch) query.bookingId = bookingMatch;

    const perPage = Math.min(Number(limit) || 20, 100);
    const [bookings, total] = await Promise.all([
      TourBooking.find(query)
        .sort({ createdAt: -1 })
        .skip((Math.max(1, Number(page)) - 1) * perPage)
        .limit(perPage)
        .populate('packageId', 'title heroImage')
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

    const [packages, pendingPackages, bookings, money] = await Promise.all([
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
            taxes: { $sum: '$taxes' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        packages,
        pendingPackages,
        bookings,
        ...(money[0]
          ? { gross: money[0].gross, collectedOnline: money[0].collectedOnline, taxes: money[0].taxes }
          : { gross: 0, collectedOnline: 0, taxes: 0 }),
      },
    });
  } catch (error) {
    console.error('Tours dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
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
    const { platformOpen, bookingDisabledMessage, taxRate } = req.body;

    if (typeof platformOpen === 'boolean') settings.platformOpen = platformOpen;
    if (typeof bookingDisabledMessage === 'string') settings.bookingDisabledMessage = bookingDisabledMessage;
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