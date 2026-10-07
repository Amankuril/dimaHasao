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
 * Balance and ledger move together.
 *
 * The balance change is one atomic $inc, guarded by `balance >= amount` for a
 * debit that may not overdraw. These used to read the balance, change it in
 * memory and save() it whole — two concurrent debits both passed the check
 * and one save overwrote the other, so money could be spent twice or a credit
 * silently lost. If the ledger entry then fails to write, the $inc is reversed
 * so money never moves without a record.
 */
const applyMovement = async (wallet, { inc, guard = {} }, entry) => {
  const Model = wallet.constructor;
  const lastTransactionAt = new Date();
  const updated = await Model.findOneAndUpdate(
    { _id: wallet._id, ...guard },
    { $inc: inc, $set: { lastTransactionAt } },
    { new: true }
  );
  if (!updated) {
    throw new Error('Insufficient balance');
  }

  const Transaction = mongoose.model('HotelTransaction');
  try {
    await Transaction.create({
      walletId: wallet._id,
      partnerId: wallet.partnerId,
      modelType: wallet.modelType,
      balanceAfter: updated.balance,
      status: 'completed',
      ...entry,
    });
  } catch (error) {
    const reverse = Object.fromEntries(Object.entries(inc).map(([k, v]) => [k, -v]));
    await Model.updateOne({ _id: wallet._id }, { $inc: reverse }).catch(() => {});
    throw error;
  }

  // Keep the caller's in-memory document in step without marking it dirty, so
  // a later save() of some other field cannot write a stale balance back.
  for (const key of ['balance', 'totalEarnings', 'totalWithdrawals', 'lastTransactionAt']) {
    wallet.set(key, updated.get(key));
    wallet.unmarkModified(key);
  }
  return wallet;
};

walletSchema.methods.credit = async function (amount, description, reference, type = 'booking_payment') {
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid credit amount');
  const inc = { balance: amount };
  // Only add to totalEarnings for actual earnings (bookings), not topups or refunds
  if (type !== 'topup' && type !== 'refund' && type !== 'commission_refund') {
    inc.totalEarnings = amount;
  }
  return applyMovement(this, { inc }, { type: 'credit', category: type, amount, description, reference });
};

walletSchema.methods.debit = async function (amount, description, reference, type = 'withdrawal') {
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid debit amount');
  // Allow overdraft for commission deductions or penalties
  const allowOverdraft = ['commission_deduction', 'no_show_penalty', 'refund_deduction'].includes(type);

  const inc = { balance: -amount };
  if (type === 'withdrawal') inc.totalWithdrawals = amount;
  // Reversing a booking payment should decrease totalEarnings too.
  if (type === 'refund_deduction' || type === 'no_show_penalty') inc.totalEarnings = -amount;

  return applyMovement(
    this,
    { inc, guard: allowOverdraft ? {} : { balance: { $gte: amount } } },
    { type: 'debit', category: type, amount, description, reference }
  );
};

// Indexes
walletSchema.index({ createdAt: -1 });
walletSchema.index({ partnerId: 1, role: 1 }, { unique: true }); // Composite key

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
