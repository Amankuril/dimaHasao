import express from 'express';
import { protect, authorizedRoles, requireApprovedOperator } from '../middlewares/authMiddleware.js';
import {
  getPublicPackages,
  getPackageDetail,
  createOperatorPackage,
  getMyPackages,
  updateOperatorPackage,
  toggleOperatorPackage,
  deleteOperatorPackage,
} from '../controllers/packageController.js';

const router = express.Router();

// Declared before '/:id' so "mine" is never read as a package id.
router.get('/mine', protect, authorizedRoles('operator'), getMyPackages);

router.get('/', getPublicPackages);
router.get('/:id', getPackageDetail);

// Selling anything requires an approved operator.
router.post('/', protect, requireApprovedOperator, createOperatorPackage);
router.put('/:id', protect, requireApprovedOperator, updateOperatorPackage);
router.patch('/:id/active', protect, requireApprovedOperator, toggleOperatorPackage);
router.delete('/:id', protect, authorizedRoles('operator'), deleteOperatorPackage);

export default router;
