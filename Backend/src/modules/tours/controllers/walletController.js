/** Operator wallet, bank details and payout requests. */
import ToursWallet from '../models/Wallet.js';
import ToursWithdrawal from '../models/Withdrawal.js';
import ToursTransaction from '../models/ToursTransaction.js';
import PaymentConfig from '../config/payment.config.js';

/** @route GET /v1/tours/wallet */
export const getWallet = async (req, res) => {
  try {
    const wallet = await ToursWallet.forOperator(req.user._id);
    res.json({ success: true, wallet });
  } catch (error) {
    console.error('Get tours wallet error:', error);
    res.status(500).json({ success: false, message: 'Failed to load your wallet' });
  }
};

/** @route GET /v1/tours/wallet/transactions */
export const getTransactions = async (req, res) => {
  try {
    const wallet = await ToursWallet.forOperator(req.user._id);
    const transactions = await ToursTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 50, 200))
      .lean();
    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Get tours transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to load transactions' });
  }
};

/** @route PUT /v1/tours/wallet/bank-details */
export const updateBankDetails = async (req, res) => {
  try {
    const { accountNumber, ifscCode, accountHolderName, bankName } = req.body;
    if (!accountNumber || !ifscCode || !accountHolderName) {
      return res.status(400).json({
        success: false,
        message: 'Account number, IFSC and account holder name are all required',
      });
    }

    const wallet = await ToursWallet.forOperator(req.user._id);
    wallet.bankDetails = {
      accountNumber: String(accountNumber).trim(),
      ifscCode: String(ifscCode).trim().toUpperCase(),
      accountHolderName: String(accountHolderName).trim(),
      bankName: String(bankName || '').trim(),
      // Re-entering the account resets verification — it may be a different account.
      verified: false,
    };
    await wallet.save();

    res.json({ success: true, bankDetails: wallet.bankDetails });
  } catch (error) {
    console.error('Update tours bank details error:', error);
    res.status(500).json({ success: false, message: 'Failed to save bank details' });
  }
};

/**
 * @route POST /v1/tours/wallet/withdraw
 *
 * Debits the wallet immediately and leaves the request pending for an admin to
 * settle by hand. Nothing is marked completed here — telling an operator they
 * have been paid when no money has moved is exactly the bug hotel shipped.
 */
export const requestWithdrawal = async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount < PaymentConfig.minWithdrawalAmount) {
      return res.status(400).json({
        success: false,
        message: `The minimum payout is ₹${PaymentConfig.minWithdrawalAmount}`,
      });
    }
    if (amount > PaymentConfig.maxWithdrawalAmount) {
      return res.status(400).json({
        success: false,
        message: `The maximum payout is ₹${PaymentConfig.maxWithdrawalAmount}`,
      });
    }

    const wallet = await ToursWallet.forOperator(req.user._id);
    if (wallet.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    if (!wallet.bankDetails?.accountNumber || !wallet.bankDetails?.ifscCode) {
      return res.status(400).json({ success: false, message: 'Please add your bank details first' });
    }

    const withdrawal = await ToursWithdrawal.create({
      ownerId: req.user._id,
      walletId: wallet._id,
      amount,
      status: 'pending',
      bankDetails: wallet.bankDetails,
      processingDetails: { initiatedAt: new Date(), remarks: 'Requested from the operator panel' },
    });

    await wallet.debit(
      amount,
      `Payout request ${withdrawal.withdrawalId}`,
      withdrawal.withdrawalId,
      'withdrawal',
      { withdrawalId: withdrawal.withdrawalId },
    );

    const transaction = await ToursTransaction.findOne({ reference: withdrawal.withdrawalId })
      .sort({ createdAt: -1 });
    if (transaction) {
      withdrawal.transactionId = transaction._id;
      await withdrawal.save();
    }

    res.status(201).json({
      success: true,
      message: 'Payout requested. It will be settled shortly.',
      withdrawal,
    });
  } catch (error) {
    console.error('Tours withdrawal request error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to request a payout' });
  }
};

/** @route GET /v1/tours/wallet/withdrawals */
export const getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await ToursWithdrawal.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, withdrawals });
  } catch (error) {
    console.error('Get tours withdrawals error:', error);
    res.status(500).json({ success: false, message: 'Failed to load payouts' });
  }
};
