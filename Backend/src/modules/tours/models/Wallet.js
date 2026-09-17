import mongoose from 'mongoose';

/**
 * Operator (and platform) balance for the tours module.
 *
 * A wallet is keyed by owner + role, so one operator has exactly one operator
 * wallet and the platform has exactly one admin wallet. `credit` and `debit`
 * write their own transaction so no caller can move money without a record.
 */
const walletSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'modelType' },
  modelType: { type: String, required: true, enum: ['TourOperator', 'Admin'], default: 'TourOperator' },
  role: { type: String, required: true, enum: ['operator', 'admin'], default: 'operator' },

  balance: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  totalWithdrawals: { type: Number, default: 0 },
  lastTransactionAt: { type: Date },
  isActive: { type: Boolean, default: true },

  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String,
    verified: { type: Boolean, default: false },
  },
}, { timestamps: true });

walletSchema.pre('save', function () {
  this.modelType = this.role === 'admin' ? 'Admin' : 'TourOperator';
});

/** Categories that represent money the owner did not earn. */
const NON_EARNING = new Set(['topup', 'refund', 'adjustment']);
/** Categories allowed to push the balance negative — the platform's cut has to
 *  be recoverable even from an empty wallet. */
const ALLOW_OVERDRAFT = new Set(['commission_deduction', 'no_show_penalty', 'refund_deduction']);

const writeTransaction = async (wallet, { type, category, amount, description, reference, metadata }) => {
  const ToursTransaction = mongoose.model('ToursTransaction');
  return ToursTransaction.create({
    walletId: wallet._id,
    ownerId: wallet.ownerId,
    modelType: wallet.modelType,
    type,
    category,
    amount,
    balanceAfter: wallet.balance,
    description,
    reference,
    status: 'completed',
    metadata,
  });
};

/*
 * Balance and ledger move together, ledger first.
 *
 * These used to save the balance and *then* write the transaction, so a
 * transaction that failed to write — a category outside the enum was enough —
 * left the money moved with nothing recording it. Of the two ways this can
 * half-fail, a ledger entry without a balance change is the recoverable one;
 * a balance change without a ledger entry is money moving invisibly.
 *
 * Writing the ledger first and rolling it back if the balance will not save
 * keeps the worse direction closed. A proper multi-document transaction would
 * close both, and is the right answer if this ever runs somewhere the two can
 * diverge under load.
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

  const transaction = await writeTransaction(wallet, entry);
  try {
    await wallet.save();
  } catch (error) {
    // The balance never landed, so the ledger entry describing it must not stand.
    Object.assign(wallet, snapshot);
    await transaction.deleteOne().catch(() => {});
    throw error;
  }
  return wallet;
};

walletSchema.methods.credit = async function (amount, description, reference, category = 'booking_payment', metadata = {}) {
  return applyMovement(this, () => {
    this.balance += amount;
    if (!NON_EARNING.has(category)) this.totalEarnings += amount;
  }, { type: 'credit', category, amount, description, reference, metadata });
};

walletSchema.methods.debit = async function (amount, description, reference, category = 'withdrawal', metadata = {}) {
  if (!ALLOW_OVERDRAFT.has(category) && this.balance < amount) {
    throw new Error('Insufficient balance');
  }

  return applyMovement(this, () => {
    this.balance -= amount;
    if (category === 'withdrawal') this.totalWithdrawals += amount;
    if (category === 'refund_deduction' || category === 'no_show_penalty') this.totalEarnings -= amount;
  }, { type: 'debit', category, amount, description, reference, metadata });
};

/** The operator's wallet, created on first use so callers never have to check. */
walletSchema.statics.forOperator = async function (operatorId) {
  return (
    (await this.findOne({ ownerId: operatorId, role: 'operator' })) ||
    this.create({ ownerId: operatorId, role: 'operator', modelType: 'TourOperator' })
  );
};

walletSchema.index({ ownerId: 1, role: 1 }, { unique: true });

const ToursWallet = mongoose.model('ToursWallet', walletSchema);
export default ToursWallet;
