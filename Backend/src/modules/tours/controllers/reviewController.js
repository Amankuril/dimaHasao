/**
 * Package reviews.
 *
 * A review has to be earned: only the traveller on a *completed* booking can
 * write one, and only once per booking. Without that, the rating on a package
 * is just a number anyone can move.
 */
import mongoose from 'mongoose';
import TourReview from '../models/Review.js';
import TourBooking from '../models/TourBooking.js';
import TourPackage from '../models/TourPackage.js';

/** Recompute a package's rating from its approved reviews. */
const refreshPackageRating = async (packageId) => {
  const [summary] = await TourReview.aggregate([
    { $match: { packageId: new mongoose.Types.ObjectId(String(packageId)), status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await TourPackage.findByIdAndUpdate(packageId, {
    avgRating: summary ? Math.round(summary.avg * 10) / 10 : 0,
    totalReviews: summary ? summary.count : 0,
  });
};

/**
 * @route GET /v1/tours/reviews/package/:packageId
 * Public: the approved reviews shown on a package page.
 */
export const getPackageReviews = async (req, res) => {
  try {
    const reviews = await TourReview.find({ packageId: req.params.packageId, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'name profileImage')
      .lean();

    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Get package reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to load reviews' });
  }
};

/**
 * @route POST /v1/tours/reviews
 * The traveller reviews a trip they actually took.
 */
export const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    const score = Number(rating);
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return res.status(400).json({ success: false, message: 'Give the trip a rating from 1 to 5' });
    }

    const booking = await TourBooking.findOne({ _id: bookingId, userId: req.user._id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.bookingStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can review a trip once it is completed',
      });
    }

    if (await TourReview.exists({ bookingId: booking._id })) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this trip' });
    }

    const review = await TourReview.create({
      userId: req.user._id,
      userModel: req.user.constructor.modelName === 'FoodUser' ? 'FoodUser' : 'User',
      packageId: booking.packageId,
      operatorId: booking.operatorId,
      bookingId: booking._id,
      rating: score,
      comment: String(comment || '').trim(),
    });

    await refreshPackageRating(booking.packageId);

    res.status(201).json({ success: true, message: 'Thanks for the review', review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: 'Failed to save your review' });
  }
};

/**
 * @route POST /v1/tours/reviews/:id/reply
 * The operator answers a review of their own package.
 */
export const replyToReview = async (req, res) => {
  try {
    const review = await TourReview.findOne({ _id: req.params.id, operatorId: req.user._id });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    review.reply = String(req.body.reply || '').trim();
    review.replyAt = review.reply ? new Date() : undefined;
    await review.save();

    res.json({ success: true, message: 'Reply posted', review });
  } catch (error) {
    console.error('Reply to review error:', error);
    res.status(500).json({ success: false, message: 'Failed to post your reply' });
  }
};

/** @route GET /v1/tours/reviews/operator — the operator's own reviews. */
export const getOperatorReviews = async (req, res) => {
  try {
    const reviews = await TourReview.find({ operatorId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('packageId', 'title')
      .populate('userId', 'name')
      .lean();

    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Get operator reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to load reviews' });
  }
};

/* ------------------------------------------------------------------ *
 * Admin moderation
 * ------------------------------------------------------------------ */

/** @route GET /v1/tours/admin/reviews */
export const getAdminReviews = async (req, res) => {
  try {
    const { status, operatorId } = req.query;
    const match = {};
    if (status && status !== 'all') match.status = status;
    if (operatorId) match.operatorId = operatorId;

    const reviews = await TourReview.find(match)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('packageId', 'title')
      .populate('operatorId', 'agencyName name')
      .populate('userId', 'name')
      .lean();

    res.json({ success: true, reviews, total: reviews.length });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to load reviews' });
  }
};

/** @route PATCH /v1/tours/admin/reviews/:id/status */
export const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Unknown review status' });
    }

    const review = await TourReview.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    // Hiding a review has to move the rating with it.
    await refreshPackageRating(review.packageId);

    res.json({ success: true, message: `Review ${status}`, review });
  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this review' });
  }
};

export default {
  getPackageReviews,
  createReview,
  replyToReview,
  getOperatorReviews,
  getAdminReviews,
  updateReviewStatus,
};
