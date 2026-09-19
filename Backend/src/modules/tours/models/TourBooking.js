import mongoose from 'mongoose';

/**
 * A booked departure on a package.
 *
 * Every money field is written by the server from a single pricing function —
 * the client never sends an amount. The v1 booking screen used to compute its
 * own total, which is the same shape as the food bug where Razorpay charged one
 * figure and verification expected another.
 *
 * `advanceAmount` is what was taken online; `balanceDue` is what the operator
 * collects from the traveller in person. See services/pricing.js for how the
 * split affects settlement.
 */
const tourBookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },

  userModel: { type: String, required: true, enum: ['User', 'FoodUser'], default: 'User' },
  userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'userModel', required: true, index: true },

  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourPackage', required: true, index: true },
  /**
   * Historical only. Tours are single-vendor now, so nothing writes this —
   * it stays on the schema (and unindexed by `required`) so bookings taken
   * while the module was multi-vendor keep the operator they were sold by.
   */
  operatorId: { type: mongoose.Schema.Types.ObjectId, index: true },

  // TRAVEL
  travelDate: { type: Date, required: true },
  travellers: {
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, default: 0, min: 0 },
  },
  totalTravellers: { type: Number, required: true, min: 1 },
  pickupPoint: { type: String, trim: true },

  travellerContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  specialRequest: { type: String, trim: true },

  // PRICING — all server-computed
  pricePerPerson: { type: Number, required: true },
  childPricePerPerson: { type: Number, default: 0 },
  baseAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  couponCode: { type: String, trim: true },
  taxRate: { type: Number, default: 0 },
  taxes: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },

  // ADVANCE SPLIT
  advancePercent: { type: Number, default: 100, min: 1, max: 100 },
  advanceAmount: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceCollectedAt: { type: Date },

  // SETTLEMENT
  /**
   * Historical only, like `operatorId` above. Tours are single-vendor, so the
   * district keeps the whole fare — nothing writes these, and they are here so
   * the bookings taken under the old commission split still add up.
   */
  adminCommission: { type: Number, default: 0 },
  operatorPayout: { type: Number, default: 0 },

  paymentStatus: {
    type: String,
    enum: ['pending', 'advance_paid', 'paid', 'refunded', 'failed'],
    default: 'pending',
  },
  paymentId: { type: String },
  paymentMethod: { type: String },

  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
    index: true,
  },
  cancellationReason: { type: String, trim: true },
  cancelledAt: { type: Date },
  /** Who ended it — the traveller themselves, or support on their behalf. */
  cancelledBy: { type: String, enum: ['user', 'admin', 'operator'], default: null },

  createdBy: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });

const TourBooking = mongoose.model('TourBooking', tourBookingSchema);
export default TourBooking;
