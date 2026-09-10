import mongoose from 'mongoose';

/**
 * Tracks Reel duration surcharge payments (Razorpay), separate from wallet Transaction
 * so historical charges remain accurate after Admin pricing changes.
 */
const reelDurationPaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      refPath: 'userModel',
    },
    userModel: {
      type: String,
      enum: ['User', 'Partner', 'Admin'],
      default: 'User',
      required: true,
    },
    /** Snapshot of which pricing profile was used */
    uploaderType: {
      type: String,
      enum: ['user', 'vendor'],
      default: 'user',
      index: true,
    },
    /** Duration (seconds) used to create the order — backend-calculated charge */
    durationSec: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    /** Snapshots so history stays correct if admin changes settings later */
    freeDurationSnapshot: { type: Number, required: true },
    maxDurationSnapshot: { type: Number, required: true },
    appliedTiernapshot: {
      minDuration: Number,
      maxDuration: Number,
      price: Number,
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      index: true,
      sparse: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'used', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paidAt: { type: Date },
    usedAt: { type: Date },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

reelDurationPaymentSchema.index({ user: 1, paymentStatus: 1, createdAt: -1 });
reelDurationPaymentSchema.index(
  { razorpayPaymentId: 1 },
  { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: 'string' } } }
);

const ReelDurationPayment = mongoose.model('ReelDurationPayment', reelDurationPaymentSchema);
export default ReelDurationPayment;
