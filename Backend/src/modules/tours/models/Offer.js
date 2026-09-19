import mongoose from 'mongoose';

/**
 * A promo code for tour packages.
 *
 * Model name is prefixed because hotel already registers `Offer` and mongoose
 * model names are global — the same collision that made `Wallet` and `Booking`
 * need prefixes in this module.
 *
 * Deliberately narrower than hotel's: no presentation fields (button text,
 * background colour) because tours renders coupons in the booking screen's own
 * style rather than as marketing cards.
 */
const tourOfferSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  discountType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
  discountValue: { type: Number, required: true, min: 0 },
  /** Caps a percentage discount; ignored for a flat one. */
  maxDiscount: { type: Number, min: 0 },
  minBookingAmount: { type: Number, default: 0, min: 0 },

  /** Empty means every package; otherwise only these. */
  packageIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TourPackage' }],

  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },

  usageLimit: { type: Number, default: 1000, min: 0 },
  usageCount: { type: Number, default: 0, min: 0 },
  /** Times one traveller may use it. */
  userLimit: { type: Number, default: 1, min: 1 },

  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

const TourOffer = mongoose.model('TourOffer', tourOfferSchema);
export default TourOffer;
