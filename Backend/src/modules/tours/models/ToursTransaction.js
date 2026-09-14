import mongoose from 'mongoose';

/** Every wallet movement in the tours module, written by Wallet.credit/debit. */
const toursTransactionSchema = new mongoose.Schema({
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'ToursWallet', required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, refPath: 'modelType', required: true, index: true },
  modelType: { type: String, required: true, enum: ['TourOperator', 'Admin'] },

  type: { type: String, required: true, enum: ['credit', 'debit'] },
  category: {
    type: String,
    required: true,
    enum: [
      'booking_payment',      // operator's share of a paid booking
      'commission_tax',       // platform's commission + tax
      'commission_deduction', // platform's cut recovered when the advance did not cover it
      'withdrawal',
      'refund',
      'refund_deduction',
      'cancellation_refund',
      'no_show_penalty',
      'adjustment',
      'topup',
    ],
  },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String, trim: true },
  reference: { type: String, trim: true, index: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  metadata: {
    bookingId: { type: String },
    withdrawalId: { type: String },
    notes: { type: String },
  },
}, { timestamps: true });

const ToursTransaction = mongoose.model('ToursTransaction', toursTransactionSchema);
export default ToursTransaction;
