// models/Booking.js
import mongoose from "mongoose";

const guestSchema = new mongoose.Schema({
  adults: { type: Number, required: true },
  children: { type: Number, default: 0 }
});

const bookingSchema = new mongoose.Schema({

  // USER
  userModel: {
    type: String,
    required: true,
    enum: ['User', 'Partner'],
    default: 'User'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: true
  },

  bookingId: {
    type: String,
    required: true,
    unique: true
  },

  // PROPERTY
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },

  propertyType: {
    type: String,
    enum: ["hotel", "resort", "homestay", "lodge"],
    required: true
  },

  // ROOM / INVENTORY (REQUIRED FOR ALL)
  roomTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType"
  },

  bookingUnit: {
    type: String,
    enum: ["entire", "room"]
  },

  // STAY DETAILS
  checkInDate: { type: Date },
  checkOutDate: { type: Date },
  totalNights: { type: Number },

  guests: guestSchema,

  // PRICING (PER NIGHT LOGIC)
  pricePerNight: { type: Number }, // average nightly rate actually charged
  baseAmount: { type: Number }, // sum of the nightly breakdown

  /**
   * What each night of the stay cost, captured at booking time.
   *
   * Seasonal rates can be edited afterwards, so an invoice reprinted later has
   * to read these rather than recompute from the room type.
   */
  nightlyBreakdown: [
    {
      date: { type: Date, required: true },
      rate: { type: Number, required: true },
      season: { type: String, default: null },
      units: { type: Number, default: 1 },
      amount: { type: Number, required: true }
    }
  ],

  extraAdultPrice: { type: Number, default: 0 },
  extraChildPrice: { type: Number, default: 0 },

  extraCharges: { type: Number, default: 0 }, // extra guests * nights

  taxes: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  couponCode: String,

  adminCommission: { type: Number, default: 0 },
  partnerPayout: { type: Number, default: 0 },

  totalAmount: { type: Number },

  // PAYMENT
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded", "partial"],
    default: "pending"
  },

  paymentId: String,
  paymentMethod: String,

  // BOOKING STATUS
  bookingStatus: {
    type: String,
    enum: ["pending", "awaiting_payment", "confirmed", "checked_in", "checked_out", "cancelled", "no_show", "rejected", "completed"],
    default: "pending"
  },

  cancellationReason: String,
  cancelledAt: Date,

  // AUDIT
  createdBy: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  }

}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);