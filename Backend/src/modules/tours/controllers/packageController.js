/**
 * Package endpoints for operators and for the public catalogue.
 * Admin-side package management lives in adminController.js.
 */
import mongoose from 'mongoose';
import TourPackage from '../models/TourPackage.js';
import TourReview from '../models/Review.js';
import {
  createPackage,
  buildPackageDocument,
  validatePackagePayload,
  publicPackageMatch,
  sellableOperatorIds,
  isMaterialEdit,
} from '../services/package.service.js';

const notFound = (res) => res.status(404).json({ success: false, message: 'Package not found' });

/* ------------------------------------------------------------------ *
 * Public catalogue
 * ------------------------------------------------------------------ */

/**
 * @route GET /v1/tours/packages
 * Only approved, active packages belonging to an approved operator.
 */
export const getPublicPackages = async (req, res) => {
  try {
    const { category, difficulty, search, minPrice, maxPrice, sort, limit = 50, page = 1 } = req.query;

    const match = publicPackageMatch({ operatorId: { $in: await sellableOperatorIds() } });

    if (category && category !== 'all') match.category = category;
    if (difficulty) match.difficulty = difficulty;
    if (minPrice || maxPrice) {
      match.pricePerPerson = {};
      if (minPrice) match.pricePerPerson.$gte = Number(minPrice);
      if (maxPrice) match.pricePerPerson.$lte = Number(maxPrice);
    }
    if (search) {
      const regex = new RegExp(String(search).trim(), 'i');
      match.$or = [{ title: regex }, { subtitle: regex }, { destinations: regex }];
    }

    const sortBy =
      sort === 'price_low' ? { pricePerPerson: 1 }
        : sort === 'price_high' ? { pricePerPerson: -1 }
          : sort === 'rating' ? { avgRating: -1 }
            : { isFeatured: -1, createdAt: -1 };

    const perPage = Math.min(Number(limit) || 50, 100);
    const [packages, total] = await Promise.all([
      TourPackage.find(match)
        .sort(sortBy)
        .skip((Math.max(1, Number(page)) - 1) * perPage)
        .limit(perPage)
        .populate('operatorId', 'name agencyName phone')
        .lean(),
      TourPackage.countDocuments(match),
    ]);

    res.json({ success: true, packages, total });
  } catch (error) {
    console.error('Get public packages error:', error);
    res.status(500).json({ success: false, message: 'Failed to load packages' });
  }
};

/**
 * @route GET /v1/tours/packages/:id
 * Accepts an id or a slug, so shared links survive.
 */
export const getPackageDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const byId = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };

    const pkg = await TourPackage.findOne(publicPackageMatch(byId))
      .populate('operatorId', 'name agencyName phone email')
      .lean();

    if (!pkg) return notFound(res);

    // A review outage should not take the package page down with it.
    const reviews = await TourReview.find({ packageId: pkg._id, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .catch(() => []);

    res.json({ success: true, package: pkg, reviews });
  } catch (error) {
    console.error('Get package detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to load package' });
  }
};

/* ------------------------------------------------------------------ *
 * Operator
 * ------------------------------------------------------------------ */

/** @route POST /v1/tours/packages — the operator's own create. */
export const createOperatorPackage = async (req, res) => {
  try {
    // The operator id is never taken from the body here; an operator can only
    // ever create for themselves.
    const pkg = await createPackage({
      operatorId: req.user._id,
      payload: req.body,
      createdBy: 'operator',
      autoApprove: false,
    });

    res.status(201).json({
      success: true,
      message: 'Package submitted for approval',
      package: pkg,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Create package error:', error);
    res.status(status).json({ success: false, message: error.message || 'Failed to create package' });
  }
};

/** @route GET /v1/tours/packages/mine */
export const getMyPackages = async (req, res) => {
  try {
    const packages = await TourPackage.find({ operatorId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, packages });
  } catch (error) {
    console.error('Get my packages error:', error);
    res.status(500).json({ success: false, message: 'Failed to load your packages' });
  }
};

/** @route PUT /v1/tours/packages/:id */
export const updateOperatorPackage = async (req, res) => {
  try {
    const pkg = await TourPackage.findOne({ _id: req.params.id, operatorId: req.user._id });
    if (!pkg) return notFound(res);

    const validationError = validatePackagePayload({ ...pkg.toObject(), ...req.body });
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    Object.assign(pkg, buildPackageDocument({ ...pkg.toObject(), ...req.body }));

    // Only edits that change what is being sold go back for review. A typo fix
    // should not delist a live package for a day.
    if (pkg.status === 'approved' && isMaterialEdit(req.body)) {
      pkg.status = 'pending';
      pkg.approvedAt = undefined;
      pkg.approvedBy = undefined;
    }

    await pkg.save();
    res.json({
      success: true,
      message: pkg.status === 'pending' ? 'Saved — resubmitted for approval' : 'Package updated',
      package: pkg,
    });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ success: false, message: 'Failed to update package' });
  }
};

/** @route PATCH /v1/tours/packages/:id/active — the operator's own on/off switch. */
export const toggleOperatorPackage = async (req, res) => {
  try {
    const pkg = await TourPackage.findOne({ _id: req.params.id, operatorId: req.user._id });
    if (!pkg) return notFound(res);

    pkg.isActive = Boolean(req.body.isActive);
    await pkg.save();
    res.json({ success: true, isActive: pkg.isActive });
  } catch (error) {
    console.error('Toggle package error:', error);
    res.status(500).json({ success: false, message: 'Failed to update package' });
  }
};

/** @route DELETE /v1/tours/packages/:id */
export const deleteOperatorPackage = async (req, res) => {
  try {
    const pkg = await TourPackage.findOneAndDelete({ _id: req.params.id, operatorId: req.user._id });
    if (!pkg) return notFound(res);
    res.json({ success: true, message: 'Package deleted' });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete package' });
  }
};
