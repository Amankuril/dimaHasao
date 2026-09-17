/**
 * Festivals — public catalogue and admin CRUD.
 *
 * Passes are sold directly by the platform (no operator or partner), so unlike
 * tours there is no approval queue: an admin publishes, and `isActive` is the
 * only gate a traveller sees.
 */
import mongoose from 'mongoose';
import Festival from '../models/Festival.js';
import { deleteStoredAssets, deleteReplacedAssets } from '../../../services/storage.service.js';

const asArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Add the derived ticket fields the screens read.
 *
 * The schema declares them as virtuals, but `lean({ virtuals: true })` is a
 * silent no-op without the mongoose-lean-virtuals plugin, which this project
 * does not install — so a lean query drops them and the UI sees undefined.
 * Deriving here keeps the reads lean and the values honest.
 */
const withTicketCounts = (festival) => ({
  ...festival,
  ticketCategories: asArray(festival.ticketCategories).map((c) => {
    const remainingTickets = Math.max(0, (c.totalTickets || 0) - (c.soldTickets || 0));
    return { ...c, remainingTickets, isSoldOut: remainingTickets <= 0 };
  }),
});
const cleanLines = (value) => asArray(value).map((v) => String(v).trim()).filter(Boolean);

const slugify = (value) =>
  String(value || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const buildUniqueSlug = async (name, excludeId) => {
  const base = slugify(name) || 'festival';
  const taken = async (slug) => {
    const match = { slug };
    if (excludeId) match._id = { $ne: excludeId };
    return Festival.exists(match);
  };
  if (!(await taken(base))) return base;
  for (let i = 2; i < 30; i += 1) {
    const candidate = `${base}-${i}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${base}-${Date.now()}`;
};

/** Images a festival references, for cleanup when it is edited or deleted. */
const imagesOf = (doc = {}) => [doc.heroImage, ...asArray(doc.images)].filter(Boolean);

/**
 * Only the fields an admin may set.
 *
 * `soldTickets` is deliberately absent: it is inventory, moved only by a paid
 * booking. Letting an edit write it would let a typo resurrect sold-out passes.
 */
const buildDocument = (payload = {}, existing = null) => ({
  name: String(payload.name || '').trim(),
  tagline: String(payload.tagline || '').trim(),
  dates: String(payload.dates || '').trim(),
  startDate: payload.startDate ? new Date(payload.startDate) : undefined,
  endDate: payload.endDate ? new Date(payload.endDate) : undefined,
  venue: String(payload.venue || '').trim(),
  location: String(payload.location || '').trim(),
  coordinates: {
    lat: payload.coordinates?.lat != null ? Number(payload.coordinates.lat) : undefined,
    lng: payload.coordinates?.lng != null ? Number(payload.coordinates.lng) : undefined,
  },
  organizer: String(payload.organizer || '').trim(),
  description: String(payload.description || '').trim(),
  highlights: cleanLines(payload.highlights),
  heroImage: String(payload.heroImage || '').trim(),
  images: cleanLines(payload.images),
  ticketCategories: asArray(payload.ticketCategories)
    .filter((c) => c && String(c.name || '').trim())
    .map((c) => {
      // Carry the sold counter across an edit by matching on id.
      const previous = existing?.ticketCategories?.find((p) => String(p._id) === String(c._id));
      return {
        ...(c._id && mongoose.Types.ObjectId.isValid(c._id) ? { _id: c._id } : {}),
        name: String(c.name).trim(),
        price: Math.max(0, Number(c.price) || 0),
        originalPrice: c.originalPrice ? Number(c.originalPrice) : undefined,
        totalTickets: Math.max(0, Number(c.totalTickets) || 0),
        soldTickets: previous ? previous.soldTickets : 0,
        perks: cleanLines(c.perks),
        isActive: c.isActive !== false,
        maxPerBooking: Math.max(1, Number(c.maxPerBooking) || 10),
      };
    }),
  isActive: payload.isActive !== false,
  isFeatured: Boolean(payload.isFeatured),
  sortOrder: Number(payload.sortOrder) || 0,
});

const validate = (payload = {}) => {
  if (!String(payload.name || '').trim()) return 'A festival name is required';
  if (!String(payload.heroImage || '').trim()) return 'A hero image is required';
  const categories = asArray(payload.ticketCategories).filter((c) => String(c?.name || '').trim());
  if (!categories.length) return 'Add at least one ticket category';
  for (const [index, c] of categories.entries()) {
    if (!(Number(c.price) >= 0)) return `Ticket ${index + 1} needs a price`;
    if (!(Number(c.totalTickets) > 0)) return `Ticket ${index + 1} needs an allocation`;
  }
  return null;
};

/* ------------------------------------------------------------------ *
 * Public
 * ------------------------------------------------------------------ */

/** @route GET /v1/festivals */
export const getPublicFestivals = async (req, res) => {
  try {
    const { search, upcoming } = req.query;
    const match = { isActive: true };

    // Two independent OR groups, so combine with $and — assigning both to
    // match.$or would let the second silently replace the first.
    const conditions = [];

    if (search) {
      const regex = new RegExp(String(search).trim(), 'i');
      conditions.push({ $or: [{ name: regex }, { venue: regex }, { location: regex }, { tagline: regex }] });
    }
    if (upcoming === 'true') {
      // A festival with no endDate never expires — `dates` is free text, so
      // there is nothing to infer, and hiding it would be worse than showing it.
      conditions.push({ $or: [{ endDate: { $gte: new Date() } }, { endDate: null }, { endDate: { $exists: false } }] });
    }
    if (conditions.length) match.$and = conditions;

    const festivals = (await Festival.find(match)
      .sort({ sortOrder: 1, startDate: 1, createdAt: 1 })
      .lean()).map(withTicketCounts);

    res.json({ success: true, festivals, total: festivals.length });
  } catch (error) {
    console.error('Get festivals error:', error);
    res.status(500).json({ success: false, message: 'Failed to load festivals' });
  }
};

/** @route GET /v1/festivals/:id — accepts an id or a slug. */
export const getFestivalDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const by = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };

    const festival = await Festival.findOne({ ...by, isActive: true }).lean();
    if (!festival) return res.status(404).json({ success: false, message: 'Festival not found' });

    res.json({ success: true, festival: withTicketCounts(festival) });
  } catch (error) {
    console.error('Get festival detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to load this festival' });
  }
};

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

/** @route GET /v1/festivals/admin */
export const getAdminFestivals = async (_req, res) => {
  try {
    const festivals = (await Festival.find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()).map(withTicketCounts);
    res.json({ success: true, festivals, total: festivals.length });
  } catch (error) {
    console.error('Get admin festivals error:', error);
    res.status(500).json({ success: false, message: 'Failed to load festivals' });
  }
};

/** @route POST /v1/festivals/admin */
export const createFestival = async (req, res) => {
  try {
    const problem = validate(req.body);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const doc = buildDocument(req.body);
    doc.slug = await buildUniqueSlug(doc.name);

    const festival = await Festival.create(doc);
    res.status(201).json({ success: true, message: 'Festival created', festival });
  } catch (error) {
    console.error('Create festival error:', error);
    res.status(500).json({ success: false, message: 'Failed to create this festival' });
  }
};

/** @route PUT /v1/festivals/admin/:id */
export const updateFestival = async (req, res) => {
  try {
    const existing = await Festival.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Festival not found' });

    const merged = { ...existing.toObject(), ...req.body };
    const problem = validate(merged);
    if (problem) return res.status(400).json({ success: false, message: problem });

    const before = existing.toObject();
    const doc = buildDocument(merged, existing);
    if (doc.name !== before.name) doc.slug = await buildUniqueSlug(doc.name, existing._id);

    // An allocation can never drop below what has already been sold.
    for (const category of doc.ticketCategories) {
      if (category.totalTickets < category.soldTickets) {
        return res.status(400).json({
          success: false,
          message: `"${category.name}" already sold ${category.soldTickets} passes; the allocation cannot be lower`,
        });
      }
    }

    Object.assign(existing, doc);
    await existing.save();

    await deleteReplacedAssets(imagesOf(before), imagesOf(existing.toObject()));

    res.json({ success: true, message: 'Festival updated', festival: existing });
  } catch (error) {
    console.error('Update festival error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this festival' });
  }
};

/** @route PATCH /v1/festivals/admin/:id/active */
export const toggleFestival = async (req, res) => {
  try {
    const festival = await Festival.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(req.body.isActive) },
      { new: true },
    );
    if (!festival) return res.status(404).json({ success: false, message: 'Festival not found' });
    res.json({ success: true, isActive: festival.isActive });
  } catch (error) {
    console.error('Toggle festival error:', error);
    res.status(500).json({ success: false, message: 'Failed to update this festival' });
  }
};

/** @route DELETE /v1/festivals/admin/:id */
export const deleteFestival = async (req, res) => {
  try {
    const festival = await Festival.findById(req.params.id);
    if (!festival) return res.status(404).json({ success: false, message: 'Festival not found' });

    // Deleting a festival people hold passes to would orphan those bookings.
    const FestivalBooking = (await import('../models/FestivalBooking.js')).default;
    const sold = await FestivalBooking.countDocuments({
      festivalId: festival._id,
      paymentStatus: 'paid',
    });
    if (sold > 0) {
      return res.status(409).json({
        success: false,
        message: `${sold} pass(es) have been sold for this festival. Hide it instead of deleting it.`,
      });
    }

    await festival.deleteOne();
    await deleteStoredAssets(imagesOf(festival.toObject()));

    res.json({ success: true, message: 'Festival deleted' });
  } catch (error) {
    console.error('Delete festival error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete this festival' });
  }
};

export default {
  getPublicFestivals,
  getFestivalDetail,
  getAdminFestivals,
  createFestival,
  updateFestival,
  toggleFestival,
  deleteFestival,
};
