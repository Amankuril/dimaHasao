import mongoose from 'mongoose';

/**
 * A pass someone bought.
 *
 * Every amount is written by the server from the festival's own ticket price —
 * the client sends a category and a quantity, never a figure. The QR code is
 * what gets scanned at the gate, so it is issued only once payment lands.
 */
const festivalBookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },

  /**
   * One checkout, one group.
   *
   * A basket spanning three categories is three bookings — each category is a
   * different entitlement at the gate, needs its own pass code, and its seats
   * are taken from its own allocation. This ties them back together so the
   * whole basket is charged once and reads as a single purchase in history.
   * Absent on bookings made before grouping existed.
   */
  orderGroupId: { type: String, index: true },

  /*
   * When an unpaid hold stops holding its seats.
   *
   * Checkout takes the seats up front so a race for the last pass has one
   * winner, and they were given back only if the browser asked — which it
   * cannot do if it is closed, offline, or killed. Every abandoned basket then
   * held its passes forever: measured, three abandoned baskets moved a
   * festival's sold count from 3 to 12 and nothing ever gave them back.
   *
   * Indexed because the sweep queries on it.
   */
  holdExpiresAt: { type: Date, default: null, index: true },

  userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'userModel', required: true, index: true },
  userModel: { type: String, enum: ['FoodUser', 'User'], default: 'FoodUser' },

  festivalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Festival', required: true, index: true },
  /** Snapshotted so a later price or name change cannot rewrite history. */
  ticketCategoryId: { type: mongoose.Schema.Types.ObjectId, required: true },
  ticketCategoryName: { type: String, trim: true },
  festivalName: { type: String, trim: true },
  festivalDates: { type: String, trim: true },

  ticketCount: { type: Number, required: true, min: 1 },
  pricePerTicket: { type: Number, required: true, min: 0 },
  baseAmount: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0 },
  taxes: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0 },

  attendee: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending',
    index: true,
  },
  paymentId: { type: String },
  paymentMethod: { type: String },

  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'used', 'cancelled'],
    default: 'pending',
    index: true,
  },
  /** Issued on payment; the gate scans this. */
  qrCode: { type: String, index: true },
  usedAt: { type: Date },
  cancelledAt: { type: Date },
  cancellationReason: { type: String, trim: true },
}, { timestamps: true });

const FestivalBooking = mongoose.model('FestivalBooking', festivalBookingSchema);
export default FestivalBooking;
