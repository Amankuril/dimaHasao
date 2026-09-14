import mongoose from 'mongoose';

/**
 * An operator's payout request.
 *
 * Raising one debits the wallet immediately, so a request that is never settled
 * leaves the operator out of pocket — the admin payout screen is what closes
 * that loop, and failing a request credits the money back.
 *
 * Note `ownerId` is declared against TourOperator, unlike hotel's Withdrawal
 * which claims `ref: 'User'` while storing Partner ids and therefore cannot be
 * populated.
 */
const withdrawalSchema = new mongoose.Schema({
  withdrawalId: { type: String, required: true, unique: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourOperator', required: true, index: true },
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'ToursWallet', required: true },

  amount: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },

  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String,
  },

  processingDetails: {
    initiatedAt: Date,
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    utrNumber: String,
    remarks: String,
  },

  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ToursTransaction' },
}, { timestamps: true });

withdrawalSchema.pre('validate', function () {
  if (!this.withdrawalId) {
    this.withdrawalId = `TW${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
});

withdrawalSchema.index({ ownerId: 1, createdAt: -1 });

const ToursWithdrawal = mongoose.model('ToursWithdrawal', withdrawalSchema);
export default ToursWithdrawal;
