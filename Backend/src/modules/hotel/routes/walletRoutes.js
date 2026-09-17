import express from 'express';
import {
  getWallet,
  getTransactions,
  requestWithdrawal,
  getWithdrawals,
  updateBankDetails,
  getWalletStats,
  createAddMoneyOrder,
  verifyAddMoneyPayment,
  deleteBankDetails
} from '../controllers/walletController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

/*
 * The wallet belongs to a property partner — it is where their payouts land and
 * where they enter the bank account those payouts go to. Only `protect` guarded
 * it, so any signed-in consumer could reach the whole router: they could open a
 * wallet of their own, save bank details against it (which the controller marks
 * verified without checking anything), open a Razorpay order against it, and
 * put in a withdrawal request that only an amount check stood in the way of.
 *
 * Admins are included because the same screens are used to inspect a partner's
 * wallet from the admin side.
 */
router.use(protect, authorizedRoles('partner', 'admin', 'superadmin'));

// Get wallet balance and details
router.get('/', getWallet);

// Get wallet statistics
router.get('/stats', getWalletStats);

// Add Money (Razorpay)
router.post('/add-money', createAddMoneyOrder);
router.post('/verify-add-money', verifyAddMoneyPayment);

// Get transaction history
router.get('/transactions', getTransactions);

// Request withdrawal
router.post('/withdraw', requestWithdrawal);

// Get withdrawal history
router.get('/withdrawals', getWithdrawals);

// Update/Delete bank details
router.put('/bank-details', updateBankDetails);
router.delete('/bank-details', deleteBankDetails);

export default router;
