import 'dotenv/config';
import { getRazorpayKeyId, getRazorpayKeySecret } from '../../../core/payments/razorpay.service.js';

export const PaymentConfig = {
  // Commission Settings
  adminCommissionRate: 10, // 10% commission on base amount
  minCommission: 50, // Minimum commission per booking (₹50)
  maxCommission: null, // No max limit

  // Razorpay Settings
  // Getters: the admin can change these at runtime (credentials service).
  get razorpayKeyId() { return getRazorpayKeyId(); },
  get razorpayKeySecret() { return getRazorpayKeySecret(); },
  razorpayAccountNumber: process.env.RAZORPAY_ACCOUNT_NUMBER, // Required for Payouts

  // Payment methods
  paymentMethods: ['upi', 'card', 'netbanking', 'wallet'],

  // Currency
  currency: 'INR',

  // GST (if applicable)
  gstRate: 12, // 12% GST

  // Refund policy
  refundProcessingDays: 7,
  cancellationPenaltyRate: 100, // 100% if after free cancellation

  // Wallet Settings
  minWithdrawalAmount: 500, // Minimum ₹500 for withdrawal
  maxWithdrawalAmount: 100000, // Maximum ₹1,00,000 per transaction
  withdrawalProcessingDays: 3, // 3 business days

  // Transaction Types
  transactionTypes: {
    BOOKING_PAYMENT: 'booking_payment',
    COMMISSION_DEDUCTION: 'commission_deduction',
    WITHDRAWAL: 'withdrawal',
    REFUND: 'refund',
    ADJUSTMENT: 'adjustment'
  },

  // Payment Status
  paymentStatus: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  }
};


export default PaymentConfig;
