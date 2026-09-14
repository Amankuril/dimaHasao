import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  getWallet,
  getTransactions,
  updateBankDetails,
  requestWithdrawal,
  getWithdrawals,
} from '../controllers/walletController.js';

const router = express.Router();

router.use(protect);
router.use(authorizedRoles('operator'));

router.get('/', getWallet);
router.get('/transactions', getTransactions);
router.put('/bank-details', updateBankDetails);
router.post('/withdraw', requestWithdrawal);
router.get('/withdrawals', getWithdrawals);

export default router;
