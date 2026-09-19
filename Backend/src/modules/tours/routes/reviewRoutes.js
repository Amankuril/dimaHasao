import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getPackageReviews, createReview } from '../controllers/reviewController.js';

const router = express.Router();

// Replying to a review is an admin action now: /v1/tours/admin/reviews/:id/reply
router.get('/package/:packageId', getPackageReviews);
router.post('/', protect, createReview);

export default router;
