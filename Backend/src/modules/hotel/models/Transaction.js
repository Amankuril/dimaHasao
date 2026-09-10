import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'modelType'
  },
  modelType: {
    type: String,
    required: true,
    enum: ['User', 'Partner', 'Admin'],
    default: 'User'
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'booking_payment',
      'commission_deduction',
      'withdrawal',
      'refund',
      'adjustment',
      'topup',
      'commission_tax',
      'commission_refund',
      'refund_deduction',
      'no_show_penalty',
      'no_show_credit',
      'booking',
      'referral_bonus',
      'referral_penalty'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  reference: {
    type: String, // Booking ID, Withdrawal ID, etc.
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  metadata: {
    bookingId: String,
    withdrawalId: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpayPayoutId: String,
    bankTransferUTR: String,
    notes: String
  }
}, { timestamps: true });

// Indexes
transactionSchema.index({ walletId: 1, createdAt: -1 });
transactionSchema.index({ partnerId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function () {
  return `₹${this.amount.toLocaleString('en-IN')}`;
});

const Transaction = mongoose.model('HotelTransaction', transactionSchema);
export default Transaction;
