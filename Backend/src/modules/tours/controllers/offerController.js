/**
 * Tour promo codes — public listing and admin CRUD.
 *
 * The discount itself is never computed here; that lives in offer.service.js so
 * the quote, the booking and this screen can never disagree about what a code
 * is worth.
 */
import mongoose from 'mongoose';
import TourOffer from '../models/Offer.js';

const asIds = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

const buildDocument = (payload = {}) => ({
  code: String(payload.code || '').trim().toUpperCase(),
  title: String(payload.title || '').trim(),
  description: String(payload.description || '').trim(),
  discountType: payload.discountType === 'flat' ? 'flat' : 'percentage',
  discountValue: Math.max(0, Number(payload.discountValue) || 0),
  maxDiscount: payload.maxDiscount ? Math.max(0, Number(payload.maxDiscount)) : undefined,
  minBookingAmount: Math.max(0, Number(payload.minBookingAmount) || 0),
  packageIds: asIds(payload.packageIds),
  operatorIds: asIds(payload.operatorIds),
  startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
  endDate: payload.endDate ? new Date(payload.endDate) : undefined,
  usageLimit: Math.max(0, Number(payload.usageLimit) || 0),
  userLimit: Math.max(1, Number(payload.userLimit) || 1),
  isActive: payload.isActive !== false,
});

const validate = (doc) => {
  if (!doc.code) return 'A promo code is required';
  if (!doc.title) return 'A title is required';
  if (!(doc.discountValue > 0)) return 'The discount must be greater than zero';
  if (doc.discountType === 'percentage' && doc.discountValue > 100) {
    return 'A percentage discount cannot exceed 100';
  }
  if (doc.endDate && doc.startDate && doc.endDate < doc.startDate) {
    return 'The end date cannot fall before the start date';
  }
  return null;
};

/* ------------------------------------------------------------------ *
 * Public
 * ------------------------------------------------------------------ */

/**
 * @route GET /v1/tours/offers
 * What the booking screen lists as "available offers". Only codes that are live
 * right now and not exhausted — a traveller should never be shown a code that
 * the quote will then refuse.
 */
export const getPublicOffers = async (req, res) => {
  try {
    const now = new Date();
    const match = {
      isActive: true,
      startDate: { $lte: now },
      $and: [
        { $or: [{ endDate: { $gte: now } }, { endDate: null }, { endDate: { $exists: false } }] },
        { $expr: { $or: [{ $eq: ['$usageLimit', 0] }, { $lt: ['$usageCount', '$usageLimit'] }] } },
      ],
    };

    // Package-scoped codes only surface on the package they belong to.
    const { packageId } = req.query;
    if (packageId && mongoose.Types.ObjectId.isValid(packageId)) {
      match.$and.push({ $or: [{ packageIds: { $size: 0 } }, { packageIds: packageId }] });
    }

    const offers = await TourOffer.find(match)
      .select('code title description discountType discountValue maxDiscount minBookingAmount endDate')
      .sort({ discountValue: -1 })
      .lean();

    res.json({ success: true, offers, total: offers.length });
  } catch (error) {
    console.error('Get tour offers error:', error);
    res.status(500).json({ success: false, message: 'Failed to load offers' });
  }
};

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

/** @route GET /v1/tours/admin/offers */
export const getAdminOffers = async (_req, res) => {
  try {
    const offers = await TourOffer.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, offers, total: offers.length });
  } catch (error) {
    console.error('Get admin tour offers error:', error);
    res.status(500).json({ success: false, message: 'Failed to load offers' });
  }
};

/** @route POST /v1/tours/admin/offers */
export const createOffer = async (req, res) => {
  try {
    const doc = buildDocument(req.body);
    const problem = validate(doc);
    if (problem) return res.status(400).json({ success: false, message: problem });

    if (await TourOffer.exists({ code: doc.code })) {
      return res.status(409).json({ success: false, message: `${doc.code} already exists` });
    }

    const offer = await TourOffer.create(doc);
    res.status(201).json({ success: true, message: 'Offer created', offer });
  } catch (error) {
    console.error('Create tour offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to create this offer' });
  }
};

/** @route PUT /v1/tours/admin/offers/:id */
export const updateOffer = async (req, res) => {
  try {
    const existing = await TourOffer.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Offer not found' });

    const doc = buildDocument({ ...existing.toObject(), ...req.body });
    const problem = validate(doc);
    if (problem) return res.status(400).json({ success: false, message: problem });

    if (doc.code !== existing.code && (await TourOffer.exists({ code: doc.code }))) {
      return res.status(409).json({ success: false, message: `${doc.code} already exists` });
    }

    // usageCount is redemption history, not a field an edit may rewrite.
    Object.assign(existing, doc);
    await existing.save();

    res.json({ success: true, message: 'Offer updated', offer: existing });
  } catch (error) {
    console.error('Update tour offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this offer' });
  }
};

/** @route PATCH /v1/tours/admin/offers/:id/active */
export const toggleOffer = async (req, res) => {
  try {
    const offer = await TourOffer.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(req.body.isActive) },
      { new: true },
    );
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.json({ success: true, isActive: offer.isActive });
  } catch (error) {
    console.error('Toggle tour offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this offer' });
  }
};

/**
 * @route DELETE /v1/tours/admin/offers/:id
 * Refused once it has been redeemed: bookings reference the code, and deleting
 * it would leave those discounts unexplainable in the finance screens.
 */
export const deleteOffer = async (req, res) => {
  try {
    const offer = await TourOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });

    if (offer.usageCount > 0) {
      return res.status(409).json({
        success: false,
        message: `${offer.code} has been used ${offer.usageCount} time(s). Deactivate it instead of deleting it.`,
      });
    }

    await offer.deleteOne();
    res.json({ success: true, message: 'Offer deleted' });
  } catch (error) {
    console.error('Delete tour offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete this offer' });
  }
};

export default {
  getPublicOffers,
  getAdminOffers,
  createOffer,
  updateOffer,
  toggleOffer,
  deleteOffer,
};
