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
    enum: ["villa", "resort", "hotel", "hostel", "pg", "homestay", "tent", "rent", "buy", "plot"],
    required: true
  },

  // ROOM / INVENTORY (REQUIRED FOR ALL)
  roomTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType"
  },

  bookingUnit: {
    type: String,
    enum: ["entire", "room", "bed", "tent"]
  },

  // STAY DETAILS
  checkInDate: { type: Date },
  checkOutDate: { type: Date },
  totalNights: { type: Number },

  guests: guestSchema,

  // PRICING (PER NIGHT LOGIC)
  pricePerNight: { type: Number },
  baseAmount: { type: Number }, // pricePerNight * nights

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

  // INQUIRY FLAG
  isInquiry: { type: Boolean, default: false },

  // AUDIT
  createdBy: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  // Metadata for different logic
  inquiryMetadata: {
    preferredDate: Date,
    message: String,
    budget: Number,
    status: {
      type: String,
      enum: ["new", "scheduled", "negotiating", "closed", "sold", "rented", "dropped"],
      default: "new"
    }
  }

}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);