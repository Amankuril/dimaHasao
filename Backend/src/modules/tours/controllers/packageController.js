/**
 * The public tour catalogue.
 *
 * Tours are single-vendor, so every management endpoint lives in
 * adminController.js — nothing here writes.
 */
import mongoose from 'mongoose';
import TourPackage from '../models/TourPackage.js';
import TourReview from '../models/Review.js';
import { publicPackageMatch } from '../services/package.service.js';

const notFound = (res) => res.status(404).json({ success: false, message: 'Package not found' });

/* ------------------------------------------------------------------ *
 * Public catalogue
 * ------------------------------------------------------------------ */

/**
 * @route GET /v1/tours/packages
 * Only approved, active packages belonging to an approved operator.
 */
export const getPublicPackages = async (req, res) => {
  try {
    const { minPrice, maxPrice, sort, limit = 50, page = 1 } = req.query;

    /*
     * Query filters are read as text, whatever arrived.
     *
     * `?category[$ne]=null` reaches Express as an object; mongoSanitize strips
     * the operator key and leaves `{}`, which then fails to cast against a
     * string path and took the whole catalogue down with a 500. Coercing here
     * means a malformed filter finds nothing, which is the honest answer, and
     * the endpoint keeps serving.
     */
    const asText = (value) => (typeof value === 'string' ? value.trim() : '');
    const category = asText(req.query.category);
    const difficulty = asText(req.query.difficulty);
    const search = asText(req.query.search);

    const match = publicPackageMatch();

    if (category && category !== 'all') match.category = category;
    if (difficulty) match.difficulty = difficulty;
    if (minPrice || maxPrice) {
      match.pricePerPerson = {};
      if (minPrice) match.pricePerPerson.$gte = Number(minPrice);
      if (maxPrice) match.pricePerPerson.$lte = Number(maxPrice);
    }
    if (search) {
      // Escaped: a search box is not a place to accept a regular expression.
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [{ title: regex }, { subtitle: regex }, { destinations: regex }];
    }

    const sortBy =
      sort === 'price_low' ? { pricePerPerson: 1 }
        : sort === 'price_high' ? { pricePerPerson: -1 }
          : sort === 'rating' ? { avgRating: -1 }
            : { isFeatured: -1, createdAt: -1 };

    const perPage = Math.min(Number(limit) || 50, 100);
    const [packages, total] = await Promise.all([
      TourPackage.find(match)
        .sort(sortBy)
        .skip((Math.max(1, Number(page)) - 1) * perPage)
        .limit(perPage)
        .lean(),
      TourPackage.countDocuments(match),
    ]);

    res.json({ success: true, packages, total });
  } catch (error) {
    console.error('Get public packages error:', error);
    res.status(500).json({ success: false, message: 'Failed to load packages' });
  }
};

/**
 * @route GET /v1/tours/packages/:id
 * Accepts an id or a slug, so shared links survive.
 */
export const getPackageDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const byId = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };

    const pkg = await TourPackage.findOne(publicPackageMatch(byId))
      .lean();

    if (!pkg) return notFound(res);

    // A review outage should not take the package page down with it.
    const reviews = await TourReview.find({ packageId: pkg._id, status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(20)
      // Without this the author is unpopulated and every review renders under
      // the anonymous fallback, which reads as a bug on the package page.
      .populate('userId', 'name profileImage')
      .lean()
      .catch(() => []);

    res.json({ success: true, package: pkg, reviews });
  } catch (error) {
    console.error('Get package detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to load package' });
  }
};
