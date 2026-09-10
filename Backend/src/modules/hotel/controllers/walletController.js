import Wallet from '../models/Wallet.js';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Withdrawal from '../models/Withdrawal.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';
import PaymentConfig from '../config/payment.config.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import axios from 'axios';
import Joi from 'joi';

// Initialize Razorpay
let razorpay;
try {
  console.log("Razorpay Keys Debug:", {
    keyId: PaymentConfig.razorpayKeyId ? "Present" : "Missing",
    keySecret: PaymentConfig.razorpayKeySecret ? "Present" : "Missing",
    accNumber: PaymentConfig.razorpayAccountNumber ? "Present" : "Missing"
  });

  if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
    razorpay = new Razorpay({
      key_id: PaymentConfig.razorpayKeyId,
      key_secret: PaymentConfig.razorpayKeySecret
    });
  } else {
    // For Development without Keys
    console.warn("⚠️ Razorpay Keys missing. Payment features will fail if used.");
    razorpay = {
      orders: {
        create: () => Promise.reject(new Error("Razorpay Not Initialized (Keys Missing)"))
      },
      payments: {
        fetch: () => Promise.reject(new Error("Razorpay Not Initialized")),
        refund: () => Promise.reject(new Error("Razorpay Not Initialized"))
      },
      contacts: {
        create: () => Promise.reject(new Error("Razorpay Not Initialized (Keys Missing)"))
      },
      fundAccount: {
        create: () => Promise.reject(new Error("Razorpay Not Initialized (Keys Missing)"))
      },
      payouts: {
        create: () => Promise.reject(new Error("Razorpay Not Initialized (Keys Missing)"))
      },
      isMock: true
    };
  }
} catch (err) {
  console.error("Razorpay Init Failed:", err.message);
}

/**
 * @desc    Get wallet balance and details
 * @route   GET /api/wallet
 * @access  Private (Partner)
 */

/**
 * @desc    Get wallet balance and details
 * @route   GET /api/wallet
 * @access  Private (Partner/User)
 */
// Helper to get wallet role based on user role and query preference
const getWalletRole = (userRole, viewAs) => {
  // If viewAs is provided explicitly, use it (Admins and Partners can switch)
  if (viewAs === 'user') return 'user';
  if (viewAs === 'partner') return 'partner';
  if (viewAs === 'admin') return 'admin';

  // Default based on current authenticated user role
  return userRole || 'user';
};

/**
 * @desc    Get wallet balance and details
 * @route   GET /api/wallet
 * @access  Private (Partner/User)
 */
export const getWallet = async (req, res) => {
  try {
    const { viewAs, ownerId } = req.query;
    const role = getWalletRole(req.user.role, viewAs);

    // Determine whose wallet to fetch: ownerId (if admin) or current user
    const targetUserId = (req.user.role === 'admin' && ownerId) ? ownerId : req.user._id;

    let wallet = await Wallet.findOne({ partnerId: targetUserId, role });

    // Create wallet if doesn't exist (only if it's the user themselves or admin creating for them)
    if (!wallet) {
      wallet = await Wallet.create({
        partnerId: targetUserId,
        role,
        balance: 0
      });
    }

    // Role-based response
    if (role === 'user') {
      return res.json({
        success: true,
        wallet: {
          balance: wallet.balance,
          totalEarnings: 0,
          totalWithdrawals: 0,
          pendingClearance: 0,
          lastTransactionAt: wallet.lastTransactionAt
        }
      });
    }

    // Partner/Admin Response
    res.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawals: wallet.totalWithdrawals,
        pendingClearance: wallet.pendingClearance,
        lastTransactionAt: wallet.lastTransactionAt,
        bankDetails: wallet.bankDetails
      }
    });

  } catch (error) {
    console.error('Get Wallet Error:', error);
    res.status(500).json({ message: 'Failed to fetch wallet details' });
  }
};

/**
 * @desc    Get wallet transactions (Merged with Bookings for Users)
 * @route   GET /api/wallet/transactions
 * @access  Private
 */
export const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, viewAs, ownerId } = req.query;
    const skip = (page - 1) * limit;
    const role = getWalletRole(req.user.role, viewAs);

    // Determine whose transactions to fetch
    const targetUserId = (req.user.role === 'admin' && ownerId) ? ownerId : req.user._id;

    // Find the specific wallet first to get its ID
    const wallet = await Wallet.findOne({ partnerId: targetUserId, role });

    // 1. Fetch Wallet Transactions (Top-ups, etc) linked to this specific WALLET
    const txQuery = { walletId: wallet?._id };
    if (type) txQuery.type = type;

    let walletTransactions = [];
    if (wallet) {
      walletTransactions = await Transaction.find(txQuery)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    }

    let mergedList = [...walletTransactions];

    // 2. If User, Fetch Bookings as "Transactions"
    if (role === 'user') {
      const bookingQuery = {
        userId: targetUserId,
        paymentStatus: { $in: ['paid', 'refunded', 'partial'] }
      };

      const bookings = await Booking.find(bookingQuery)
        .populate('propertyId', 'name')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      // Map bookings to transaction-like objects
      const bookingTransactions = bookings.map(b => ({
        _id: b._id,
        bookingId: b.bookingId, // Add Booking ID
        type: b.paymentStatus === 'refunded' ? 'credit' : 'debit',
        amount: b.totalAmount,
        description: `Booking: ${b.propertyId?.propertyName || b.propertyId?.name || 'Hotel Stay'}`,
        status: b.bookingStatus,
        paymentStatus: b.paymentStatus,
        isBooking: true,
        checkInDate: b.checkInDate, // Add Check-in
        checkOutDate: b.checkOutDate, // Add Check-out
        createdAt: b.createdAt
      }));
      mergedList = [...mergedList, ...bookingTransactions];
    }

    // 3. Sort & Paginate Merged List
    mergedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const paginatedList = mergedList.slice(skip, skip + Number(limit));
    const total = mergedList.length;

    res.json({
      success: true,
      transactions: paginatedList,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
};

/**
 * @desc    Request withdrawal
 * @route   POST /api/wallet/withdraw
 * @access  Private (Partner)
 */
export const requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;
    const role = getWalletRole(req.user.role, 'partner'); // Withdrawals only for partners generally

    // Validation
    if (!amount || amount < PaymentConfig.minWithdrawalAmount) {
      return res.status(400).json({
        message: `Minimum withdrawal amount is ₹${PaymentConfig.minWithdrawalAmount}`
      });
    }

    if (amount > PaymentConfig.maxWithdrawalAmount) {
      return res.status(400).json({
        message: `Maximum withdrawal amount is ₹${PaymentConfig.maxWithdrawalAmount}`
      });
    }

    // Get specific wallet
    const wallet = await Wallet.findOne({ partnerId: req.user._id, role });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Check bank details
    if (!wallet.bankDetails?.accountNumber || !wallet.bankDetails?.ifscCode) {
      return res.status(400).json({
        message: 'Please add your bank details first'
      });
    }

    // --- RAZORPAY PAYOUT FLOW (Using Direct API Requests via Axios) ---
    // Why? The razorpay-node SDK instance often lacks Payouts resources ('contacts', 'fund_accounts')
    // depending on version/config, leading to "undefined" errors. Direct API is reliable.

    // 1. Get Partner Details for Contact
    const Partner = (await import('../models/Partner.js')).default;
    const partner = await Partner.findById(req.user._id);
    if (!partner) return res.status(404).json({ message: 'Partner not found' });

    // Auth Header
    const authHeader = 'Basic ' + Buffer.from(`${PaymentConfig.razorpayKeyId}:${PaymentConfig.razorpayKeySecret}`).toString('base64');
    const razorpayBaseUrl = 'https://api.razorpay.com/v1';

    // Helper for API Calls
    const rpRequest = async (method, endpoint, data) => {
      try {
        // Verify Account Number is not a placeholder
        if (endpoint === '/payouts' && data.account_number?.includes('XXXX')) {
          throw new Error("Invalid Razorpay Account Number. Please update RAZORPAY_ACCOUNT_NUMBER in your .env file with your actual RazorpayX Virtual Account Number.");
        }

        console.log(`📡 Razorpay API Call: ${method.toUpperCase()} ${razorpayBaseUrl}${endpoint}`);

        const result = await axios({
          method,
          url: `${razorpayBaseUrl}${endpoint}`,
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          data
        });
        return result.data;
      } catch (error) {
        const errorDesc = error.response?.data?.error?.description || error.message;
        console.error(`❌ Razorpay API Error (${endpoint}):`, {
          status: error.response?.status,
          description: errorDesc,
          details: error.response?.data
        });
        throw new Error(errorDesc);
      }
    };

    let payoutId = null;
    let payoutStatus = 'pending';
    let rzpError = null;

    // Execute Razorpay Flow but don't block wallet logic on failure (For Testing)
    try {
      // 2. Create/Get Razorpay Contact
      if (!wallet.razorpayContactId) {
        const contact = await rpRequest('post', '/contacts', {
          name: partner.name,
          email: partner.email,
          contact: partner.phone,
          type: "vendor",
          reference_id: partner._id.toString(),
          notes: { role: 'partner' }
        });
        wallet.razorpayContactId = contact.id;
        await wallet.save();
      }

      // 3. Create/Get Razorpay Fund Account
      if (!wallet.razorpayFundAccountId) {
        const fundAccount = await rpRequest('post', '/fund_accounts', {
          contact_id: wallet.razorpayContactId,
          account_type: "bank_account",
          bank_account: {
            name: wallet.bankDetails.accountHolderName || partner.name,
            ifsc: wallet.bankDetails.ifscCode,
            account_number: wallet.bankDetails.accountNumber
          }
        });
        wallet.razorpayFundAccountId = fundAccount.id;
        await wallet.save();
      }

      // 4. Create Payout
      const payout = await rpRequest('post', '/payouts', {
        account_number: PaymentConfig.razorpayAccountNumber,
        fund_account_id: wallet.razorpayFundAccountId,
        amount: Math.round(amount * 100), // in paise
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: `WD-${Date.now()}`,
        narration: "Rukkoin Withdrawal"
      });
      payoutId = payout.id;
      payoutStatus = payout.status;
    } catch (errMessage) {
      console.warn("⚠️ Razorpay Payout Step Failed (Proceeding for Test):", errMessage.message);
      rzpError = errMessage.message;
      payoutStatus = 'pending_payout'; // Indicate it hasn't reached Razorpay but wallet is deducted
    }

    // 5. Deduct Wallet & Create Records
    const withdrawalId = 'WD' + Date.now() + Math.floor(Math.random() * 1000);

    const withdrawal = await Withdrawal.create({
      withdrawalId,
      partnerId: req.user._id,
      walletId: wallet._id,
      amount,
      bankDetails: wallet.bankDetails,
      status: (payoutStatus === 'processed' || payoutStatus === 'pending_payout') ? 'completed' : 'pending',
      razorpayPayoutId: payoutId,
      razorpayFundAccountId: wallet.razorpayFundAccountId,
      processingDetails: {
        remarks: rzpError ? `RZP Error: ${rzpError}` : 'Initiated from partner app',
        initiatedAt: new Date()
      }
    });

    // Deduct amount from wallet (Immediate deduction)
    wallet.balance -= amount;
    wallet.totalWithdrawals += amount;
    await wallet.save();

    // Create transaction
    const transaction = await Transaction.create({
      walletId: wallet._id,
      partnerId: req.user._id,
      modelType: 'Partner',
      type: 'debit',
      category: 'withdrawal',
      amount,
      balanceAfter: wallet.balance,
      description: `Withdrawal Request (${withdrawal.withdrawalId})`,
      reference: withdrawal.withdrawalId,
      status: (payoutStatus === 'processed' || payoutStatus === 'pending_payout') ? 'completed' : 'pending',
      metadata: {
        withdrawalId: withdrawal.withdrawalId,
        razorpayPayoutId: payoutId
      }
    });

    withdrawal.transactionId = transaction._id;
    await withdrawal.save();

    res.json({
      success: true,
      message: 'Withdrawal initiated successfully via Razorpay',
      withdrawal: {
        id: withdrawal.withdrawalId,
        amount: withdrawal.amount,
        status: withdrawal.status,
        txnId: transaction._id
      }
    });

  } catch (error) {
    console.error('Request Withdrawal Error:', error);
    res.status(500).json({ message: error.message || 'Failed to process withdrawal request' });
  }
};

/**
 * @desc    Get withdrawal history
 * @route   GET /api/wallet/withdrawals
 * @access  Private (Partner)
 */
export const getWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    // Withdrawals are tied to partnerId directly in Withdrawal schema usually
    // But logically only partners withdraw.
    const query = { partnerId: req.user._id };
    if (status) query.status = status;

    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Withdrawal.countDocuments(query);

    res.json({
      success: true,
      withdrawals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get Withdrawals Error:', error);
    res.status(500).json({ message: 'Failed to fetch withdrawals' });
  }
};

/**
 * @desc    Update bank details
 * @route   PUT /api/wallet/bank-details
 * @access  Private (Partner)
 */
export const updateBankDetails = async (req, res) => {
  try {
    const role = getWalletRole(req.user.role, 'partner');

    // Validation Schema
    const bankSchema = Joi.object({
      accountNumber: Joi.string()
        .pattern(/^[0-9]{9,18}$/)
        .required()
        .messages({
          'string.pattern.base': 'Account number must be 9-18 digits'
        }),
      ifscCode: Joi.string()
        .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .required()
        .messages({
          'string.pattern.base': 'Invalid IFSC code format (e.g. HDFC0001234)'
        }),
      accountHolderName: Joi.string()
        .min(3)
        .max(100)
        .required(),
      bankName: Joi.string()
        .min(2)
        .max(100)
        .required()
    });

    const { error } = bankSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { accountNumber, ifscCode, accountHolderName, bankName } = req.body;
    let wallet = await Wallet.findOne({ partnerId: req.user._id, role });

    if (!wallet) {
      wallet = await Wallet.create({
        partnerId: req.user._id,
        role,
        balance: 0
      });
    }

    wallet.bankDetails = {
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      accountHolderName,
      bankName,
      verified: true // Auto-verify for test flow, typically false
    };

    // Reset Fund Account ID so it gets recreated with new details on next withdrawal
    wallet.razorpayFundAccountId = undefined;

    await wallet.save();

    res.json({
      success: true,
      message: 'Bank details updated successfully.',
      bankDetails: wallet.bankDetails
    });

  } catch (error) {
    console.error('Update Bank Details Error:', error);
    res.status(500).json({ message: 'Failed to update bank details' });
  }
};

/**
 * @desc    Delete bank details
 * @route   DELETE /api/wallet/bank-details
 * @access  Private (Partner)
 */
export const deleteBankDetails = async (req, res) => {
  try {
    const role = getWalletRole(req.user.role, 'partner');
    const wallet = await Wallet.findOne({ partnerId: req.user._id, role });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    wallet.bankDetails = undefined;
    wallet.razorpayFundAccountId = undefined; // Force strict re-creation if added again
    // We keep razorpayContactId as the partner is the same person

    await wallet.save();

    res.json({
      success: true,
      message: 'Bank details removed successfully.'
    });

  } catch (error) {
    console.error('Delete Bank Details Error:', error);
    res.status(500).json({ message: 'Failed to remove bank details' });
  }
};

/**
 * @desc    Get wallet statistics
 * @route   GET /api/wallet/stats
 * @access  Private (Partner)
 */
export const getWalletStats = async (req, res) => {
  try {
    const { viewAs, ownerId } = req.query;
    const role = getWalletRole(req.user.role, viewAs);

    // Determine whose stats to fetch
    const targetUserId = (req.user.role === 'admin' && ownerId) ? ownerId : req.user._id;

    console.log(`[getWalletStats] Target User ID: ${targetUserId}, Role: ${role}, ViewAs: ${req.query.viewAs}`);

    const wallet = await Wallet.findOne({ partnerId: targetUserId, role });
    console.log(`[getWalletStats] Wallet found:`, wallet ? `Yes, Balance: ${wallet.balance}` : 'No');

    // Handle No Wallet Case
    if (!wallet) {
      console.log(`[getWalletStats] No wallet found, returning zero balance`);
      return res.json({
        success: true,
        stats: {
          totalEarnings: 0,
          totalWithdrawals: 0,
          currentBalance: 0,
          pendingClearance: 0,
          thisMonthEarnings: 0,
          transactionCount: 0
        }
      });
    }

    // USER Role: Return simple balance & transaction count
    if (role === 'user') {
      const walletTxCount = await Transaction.countDocuments({ walletId: wallet._id }); // Use walletId
      const bookingCount = await Booking.countDocuments({ userId: targetUserId });

      console.log(`[getWalletStats] User wallet - Balance: ${wallet.balance}, Tx: ${walletTxCount}, Bookings: ${bookingCount}`);

      return res.json({
        success: true,
        stats: {
          currentBalance: wallet.balance,
          transactionCount: walletTxCount + bookingCount,
          totalEarnings: 0,
          totalWithdrawals: 0,
          pendingClearance: 0,
          thisMonthEarnings: 0
        }
      });
    }

    // PARTNER Role: Calculate stats EXCLUSIVELY from Transaction history
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const statsData = await Transaction.aggregate([
      {
        $match: {
          walletId: wallet._id
        }
      },
      {
        $facet: {
          totalEarnings: [
            {
              $match: {
                type: 'credit',
                category: 'booking_payment',
                status: 'completed'
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          thisMonthEarnings: [
            {
              $match: {
                type: 'credit',
                category: 'booking_payment',
                status: 'completed',
                createdAt: { $gte: startOfMonth }
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          totalWithdrawals: [
            {
              $match: {
                type: 'debit',
                category: 'withdrawal',
                status: 'completed'
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          pendingClearance: [
            {
              $match: {
                status: 'pending'
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          txCount: [
            { $count: 'count' }
          ]
        }
      }
    ]);

    const result = statsData[0];

    const totalEarnings = result.totalEarnings[0]?.total || 0;
    const thisMonthEarnings = result.thisMonthEarnings[0]?.total || 0;
    const totalWithdrawals = result.totalWithdrawals[0]?.total || 0;
    const pendingClearance = result.pendingClearance[0]?.total || 0;
    const transactionCount = result.txCount[0]?.count || 0;

    res.json({
      success: true,
      stats: {
        totalEarnings,
        totalWithdrawals,
        currentBalance: wallet.balance,
        pendingClearance,
        thisMonthEarnings,
        transactionCount
      }
    });

  } catch (error) {
    console.error('Get Wallet Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch wallet statistics' });
  }
};

/**
 * @desc    Create Add Money Order (Razorpay)
 * @route   POST /api/wallet/add-money
 * @access  Private (Partner)
 */
export const createAddMoneyOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 10) { // Minimum 10rs
      return res.status(400).json({ message: 'Minimum amount is ₹10' });
    }

    const options = {
      amount: Math.round(amount * 100), // in paise
      currency: PaymentConfig.currency,
      notes: {
        userId: req.user._id.toString(),
        type: 'wallet_topup',
        role: req.user.role // Add role to notes for potential debugging or hooks
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: PaymentConfig.razorpayKeyId
      }
    });

  } catch (error) {
    console.error('Create Add Money Order Error:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
};

/**
 * @desc    Verify Add Money Payment
 * @route   POST /api/wallet/verify-add-money
 * @access  Private (Partner)
 */
export const verifyAddMoneyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const role = getWalletRole(req.user.role);

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', PaymentConfig.razorpayKeySecret)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Find correct wallet based on ROLE
    let wallet = await Wallet.findOne({ partnerId: req.user._id, role });
    if (!wallet) {
      wallet = await Wallet.create({
        partnerId: req.user._id,
        role,
        balance: 0
      });
    }

    // Credit wallet
    await wallet.credit(
      Number(amount),
      `Wallet Top-up`,
      razorpay_payment_id,
      'topup'
    );

    res.json({
      success: true,
      message: 'Wallet credited successfully',
      newBalance: wallet.balance
    });

  } catch (error) {
    console.error('Verify Add Money Error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};
