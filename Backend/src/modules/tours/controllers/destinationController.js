/**
 * Tourist destinations — public directory, admin CRUD.
 *
 * Only an admin writes here; travellers read. The public endpoints never
 * return inactive destinations, so unpublishing one is a single toggle rather
 * than a delete.
 */
import mongoose from 'mongoose';
import TourismDestination from '../models/Destination.js';
import TourPackage from '../models/TourPackage.js';
import { publicPackageMatch } from '../services/package.service.js';
import { deleteStoredAssets, deleteReplacedAssets } from '../../../services/storage.service.js';
import { searchRegex } from '../../../utils/searchRegex.js';

const slugify = (value) =>
  String(value || '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Slugs are unique; suffix rather than reject a duplicate name. */
const buildUniqueSlug = async (name, excludeId) => {
  const base = slugify(name) || 'destination';
  const taken = async (slug) => {
    const match = { slug };
    if (excludeId) match._id = { $ne: excludeId };
    return TourismDestination.exists(match);
  };

  if (!(await taken(base))) return base;
  for (let i = 2; i < 30; i += 1) {
    const candidate = `${base}-${i}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${base}-${Date.now()}`;
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const cleanLines = (value) => asArray(value).map((v) => String(v).trim()).filter(Boolean);

/** Only the fields an admin may set — never timestamps, never _id. */
const buildDocument = (payload = {}) => ({
  name: String(payload.name || '').trim(),
  subtitle: String(payload.subtitle || '').trim(),
  location: String(payload.location || '').trim(),
  fullAddress: String(payload.fullAddress || '').trim(),
  coordinates: {
    lat: payload.coordinates?.lat != null ? Number(payload.coordinates.lat) : undefined,
    lng: payload.coordinates?.lng != null ? Number(payload.coordinates.lng) : undefined,
  },
  distanceFromStation: String(payload.distanceFromStation || '').trim(),
  travelTime: String(payload.travelTime || '').trim(),
  bestTime: String(payload.bestTime || '').trim(),
  idealFor: String(payload.idealFor || '').trim(),
  description: String(payload.description || '').trim(),
  aboutDetails: cleanLines(payload.aboutDetails),
  guideTips: cleanLines(payload.guideTips),
  mainImage: String(payload.mainImage || '').trim(),
  heroImage: String(payload.heroImage || '').trim(),
  insetImage: String(payload.insetImage || '').trim(),
  guideSunsetImage: String(payload.guideSunsetImage || '').trim(),
  gallery: cleanLines(payload.gallery),
  category: payload.category || 'viewpoint',
  tags: asArray(payload.tags)
    .filter((t) => t && String(t.text || '').trim())
    .map((t) => ({
      icon: String(t.icon || 'fa-solid fa-location-dot').trim(),
      text: String(t.text).trim(),
      color: String(t.color || 'text-emerald-600').trim(),
    })),
  isActive: payload.isActive !== false,
  isFeatured: Boolean(payload.isFeatured),
  sortOrder: Number(payload.sortOrder) || 0,
});

/** Every image URL a destination references, for cleanup on delete. */
const imagesOf = (doc = {}) => [
  doc.mainImage, doc.heroImage, doc.insetImage, doc.guideSunsetImage,
  ...asArray(doc.gallery),
].filter(Boolean);

/**
 * Words too generic to link on — every place and package in the district
 * mentions them, so matching on one would surface the entire catalogue.
 */
const PLACE_STOPWORDS = new Set([
  'dima', 'hasao', 'assam', 'india', 'love', 'the', 'and', 'point', 'view',
  'town', 'peak', 'hill', 'hills', 'road', 'tour', 'trip', 'near', 'valley',
]);

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Distinctive words from a destination's name and location. */
const placeTokens = (destination = {}) =>
  [...new Set(
    `${destination.name || ''} ${destination.location || ''}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4 && !PLACE_STOPWORDS.has(word)),
  )].map(escapeRegex);

const validate = (payload = {}) => {
  if (!String(payload.name || '').trim()) return 'A name is required';
  if (!String(payload.mainImage || '').trim()) return 'A main image is required';
  return null;
};

/* ------------------------------------------------------------------ *
 * Public
 * ------------------------------------------------------------------ */

/** @route GET /v1/tours/destinations */
export const getPublicDestinations = async (req, res) => {
  try {
    const { category, search } = req.query;
    const match = { isActive: true };
    if (category && category !== 'all') match.category = category;
    if (search) {
      const regex = searchRegex(search);
      match.$or = [{ name: regex }, { location: regex }, { description: regex }, { subtitle: regex }];
    }

    const destinations = await TourismDestination.find(match)
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    res.json({ success: true, destinations, total: destinations.length });
  } catch (error) {
    console.error('Get destinations error:', error);
    res.status(500).json({ success: false, message: 'Failed to load destinations' });
  }
};

/**
 * @route GET /v1/tours/destinations/:id
 * Accepts an id or a slug, and carries the live tour packages that visit it —
 * the scope of work lists "Tour packages" as a feature of the destination page.
 */
export const getDestinationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const byId = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };

    const destination = await TourismDestination.findOne({ ...byId, isActive: true }).lean();
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    // Matched on place-name tokens rather than the whole string: a destination
    // called "HAFLONG TOWN" should surface a package that lists "Haflong Lake",
    // which an exact match never would. A package outage must not take the
    // destination page down with it.
    const tokens = placeTokens(destination);
    const packages = !tokens.length ? [] : await TourPackage.find(
      publicPackageMatch({ destinations: new RegExp(tokens.join('|'), 'i') }),
    )
      .select('title slug heroImage pricePerPerson durationDays durationNights advancePercent avgRating totalReviews category difficulty')
      .limit(10)
      .lean()
      .catch(() => []);

    res.json({ success: true, destination, packages });
  } catch (error) {
    console.error('Get destination detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to load this destination' });
  }
};

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

/** @route GET /v1/tours/admin/destinations */
export const getAdminDestinations = async (req, res) => {
  try {
    const destinations = await TourismDestination.find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.json({ success: true, destinations, total: destinations.length });
  } catch (error) {
    console.error('Get admin destinations error:', error);
    res.status(500).json({ success: false, message: 'Failed to load destinations' });
  }
};

/** @route POST /v1/tours/admin/destinations */
export const createDestination = async (req, res) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const doc = buildDocument(req.body);
    doc.slug = await buildUniqueSlug(doc.name);

    const destination = await TourismDestination.create(doc);
    res.status(201).json({ success: true, message: 'Destination created', destination });
  } catch (error) {
    console.error('Create destination error:', error);
    res.status(500).json({ success: false, message: 'Failed to create this destination' });
  }
};

/** @route PUT /v1/tours/admin/destinations/:id */
export const updateDestination = async (req, res) => {
  try {
    const existing = await TourismDestination.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Destination not found' });

    const merged = { ...existing.toObject(), ...req.body };
    const problem = validate(merged);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const before = existing.toObject();
    const doc = buildDocument(merged);
    if (doc.name !== before.name) {
      doc.slug = await buildUniqueSlug(doc.name, existing._id);
    }

    Object.assign(existing, doc);
    await existing.save();

    // Images the edit dropped are now unreferenced; take them off disk.
    await deleteReplacedAssets(imagesOf(before), imagesOf(existing.toObject()));

    res.json({ success: true, message: 'Destination updated', destination: existing });
  } catch (error) {
    console.error('Update destination error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this destination' });
  }
};

/** @route PATCH /v1/tours/admin/destinations/:id/active */
export const toggleDestination = async (req, res) => {
  try {
    const destination = await TourismDestination.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(req.body.isActive) },
      { new: true },
    );
    if (!destination) return res.status(404).json({ success: false, message: 'Destination not found' });
    res.json({ success: true, isActive: destination.isActive });
  } catch (error) {
    console.error('Toggle destination error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this destination' });
  }
};

/** @route DELETE /v1/tours/admin/destinations/:id */
export const deleteDestination = async (req, res) => {
  try {
    const destination = await TourismDestination.findByIdAndDelete(req.params.id);
    if (!destination) return res.status(404).json({ success: false, message: 'Destination not found' });

    // Its images have no other owner, so they go with it.
    await deleteStoredAssets(imagesOf(destination.toObject()));

    res.json({ success: true, message: 'Destination deleted' });
  } catch (error) {
    console.error('Delete destination error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete this destination' });
  }
};

export default {
  getPublicDestinations,
  getDestinationDetail,
  getAdminDestinations,
  createDestination,
  updateDestination,
  toggleDestination,
  deleteDestination,
};
