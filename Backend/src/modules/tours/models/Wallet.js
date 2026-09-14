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
  await ToursTransaction.create({
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

walletSchema.methods.credit = async function (amount, description, reference, category = 'booking_payment', metadata = {}) {
  this.balance += amount;
  if (!NON_EARNING.has(category)) this.totalEarnings += amount;
  this.lastTransactionAt = new Date();
  await this.save();
  await writeTransaction(this, { type: 'credit', category, amount, description, reference, metadata });
  return this;
};

walletSchema.methods.debit = async function (amount, description, reference, category = 'withdrawal', metadata = {}) {
  if (!ALLOW_OVERDRAFT.has(category) && this.balance < amount) {
    throw new Error('Insufficient balance');
  }

  this.balance -= amount;
  if (category === 'withdrawal') this.totalWithdrawals += amount;
  if (category === 'refund_deduction' || category === 'no_show_penalty') this.totalEarnings -= amount;
  this.lastTransactionAt = new Date();
  await this.save();
  await writeTransaction(this, { type: 'debit', category, amount, description, reference, metadata });
  return this;
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
