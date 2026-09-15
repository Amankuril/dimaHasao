import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  getPackageReviews,
  createReview,
  replyToReview,
  getOperatorReviews,
} from '../controllers/reviewController.js';

const router = express.Router();

// Static paths before '/:id/...' so they are never read as ids.
router.get('/operator', protect, authorizedRoles('operator'), getOperatorReviews);
router.get('/package/:packageId', getPackageReviews);

router.post('/', protect, createReview);
router.post('/:id/reply', protect, authorizedRoles('operator'), replyToReview);

export default router;
