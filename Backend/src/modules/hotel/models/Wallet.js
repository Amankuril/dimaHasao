import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['user', 'partner', 'admin'],
    default: 'partner',
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalWithdrawals: {
    type: Number,
    default: 0
  },
  pendingClearance: {
    type: Number,
    default: 0,
    comment: 'Amount pending settlement'
  },
  lastTransactionAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String,
    verified: {
      type: Boolean,
      default: false
    },
    /** When an admin confirmed the account, and who. */
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, default: null }
  },
  razorpayContactId: String,
  razorpayFundAccountId: String
}, { timestamps: true });

// Pre-save hook to set modelType based on role
walletSchema.pre('save', async function () {
  if (this.role === 'partner') {
    this.modelType = 'Partner';
  } else if (this.role === 'admin') {
    this.modelType = 'Admin';
  } else {
    this.modelType = 'User';
  }
});

// Methods

/*
 * Balance and ledger move together, ledger first.
 *
 * Both methods below used to save the balance and *then* write the transaction,
 * so a transaction that failed to write left the money moved with nothing
 * recording it. Of the two ways this can half-fail, a ledger entry without a
 * balance change is recoverable; a balance change without one is money moving
 * invisibly. Tours' wallet carries the same guard for the same reason.
 */
const applyMovement = async (wallet, mutate, entry) => {
  const snapshot = {
    balance: wallet.balance,
    totalEarnings: wallet.totalEarnings,
    totalWithdrawals: wallet.totalWithdrawals,
    lastTransactionAt: wallet.lastTransactionAt,
  };

  mutate();
  wallet.lastTransactionAt = new Date();

  const Transaction = mongoose.model('HotelTransaction');
  const transaction = await Transaction.create({
    walletId: wallet._id,
    partnerId: wallet.partnerId,
    modelType: wallet.modelType,
    balanceAfter: wallet.balance,
    status: 'completed',
    ...entry,
  });

  try {
    await wallet.save();
  } catch (error) {
    Object.assign(wallet, snapshot);
    await transaction.deleteOne().catch(() => {});
    throw error;
  }
  return wallet;
};
walletSchema.methods.credit = async function (amount, description, reference, type = 'booking_payment') {
  return applyMovement(this, () => {
    this.balance += amount;
    // Only add to totalEarnings for actual earnings (bookings), not topups or refunds
    if (type !== 'topup' && type !== 'refund' && type !== 'commission_refund') {
      this.totalEarnings += amount;
    }
  }, { type: 'credit', category: type, amount, description, reference });
};

walletSchema.methods.debit = async function (amount, description, reference, type = 'withdrawal') {
  // Allow overdraft for commission deductions or penalties
  const allowOverdraft = ['commission_deduction', 'no_show_penalty', 'refund_deduction'].includes(type);

  if (!allowOverdraft && this.balance < amount) {
    throw new Error('Insufficient balance');
  }

  return applyMovement(this, () => {
    this.balance -= amount;
    if (type === 'withdrawal') this.totalWithdrawals += amount;
    // Reversing a booking payment should decrease totalEarnings too.
    if (type === 'refund_deduction' || type === 'no_show_penalty') this.totalEarnings -= amount;
  }, { type: 'debit', category: type, amount, description, reference });
};

// Indexes
walletSchema.index({ createdAt: -1 });
walletSchema.index({ partnerId: 1, role: 1 }, { unique: true }); // Composite key

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
