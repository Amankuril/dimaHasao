/**
 * Shared package construction and visibility rules.
 *
 * Create and update both go through `buildPackageDocument`, so validation
 * cannot drift between them. Hotel does not do this: `createProperty` and
 * `updateRoomTypeAsAdmin` validate the same fields differently, which is the
 * bug this file exists to avoid.
 */
import TourPackage from '../models/TourPackage.js';

/**
 * Edits that change what a traveller is buying. Touching one of these on an
 * approved package sends it back for review; editing copy or photos does not.
 * Deliberately narrower than hotel, where any update re-pends the listing and
 * fixing a typo delists the package for a day.
 */
export const MATERIAL_FIELDS = [
  'pricePerPerson',
  'childPricePercent',
  'advancePercent',
  'durationDays',
  'durationNights',
  'itinerary',
  'includes',
  'exclusions',
  'groupSizeMin',
  'groupSizeMax',
  'category',
];

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Slugs are unique; append a short suffix rather than rejecting a duplicate title. */
export const buildUniqueSlug = async (title) => {
  const base = slugify(title) || 'tour-package';
  if (!(await TourPackage.exists({ slug: base }))) return base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    if (!(await TourPackage.exists({ slug: candidate }))) return candidate;
  }
  return `${base}-${Date.now()}`;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

/** Field-level validation shared by both create paths. Returns a message or null. */
export const validatePackagePayload = (payload = {}) => {
  if (!String(payload.title || '').trim()) return 'Title is required';
  if (!String(payload.heroImage || '').trim()) return 'A cover image is required';
  if (!payload.category) return 'Category is required';

  const price = Number(payload.pricePerPerson);
  if (!Number.isFinite(price) || price <= 0) return 'Price per person must be greater than 0';

  const days = Number(payload.durationDays);
  if (!Number.isInteger(days) || days < 1) return 'Duration must be at least 1 day';

  const advance = Number(payload.advancePercent ?? 100);
  if (!Number.isFinite(advance) || advance < 1 || advance > 100) {
    return 'Advance percentage must be between 1 and 100';
  }

  const childPercent = Number(payload.childPricePercent ?? 60);
  if (!Number.isFinite(childPercent) || childPercent < 0 || childPercent > 100) {
    return 'Child price percentage must be between 0 and 100';
  }

  const min = Number(payload.groupSizeMin ?? 1);
  const max = Number(payload.groupSizeMax ?? 10);
  if (max < min) return 'Maximum group size cannot be smaller than the minimum';

  if (payload.departureMode === 'fixed') {
    // The approved booking screen has a free date input and no departure
    // picker, so fixed departures would need a new screen first. The schema
    // carries the field so this can be switched on without a migration.
    return 'Fixed departures are not supported yet — use on-request availability';
  }

  for (const [index, day] of asArray(payload.itinerary).entries()) {
    if (!String(day?.title || '').trim()) return `Itinerary day ${index + 1} needs a title`;
  }

  return null;
};

/** Normalise a payload into the fields the schema actually stores. */
export const buildPackageDocument = (payload = {}) => ({
  title: String(payload.title).trim(),
  subtitle: String(payload.subtitle || '').trim(),
  description: String(payload.description || '').trim(),

  durationDays: Number(payload.durationDays),
  durationNights: Number(payload.durationNights ?? Math.max(0, Number(payload.durationDays) - 1)),

  category: payload.category,
  difficulty: payload.difficulty || 'Easy',

  groupSizeMin: Number(payload.groupSizeMin ?? 1),
  groupSizeMax: Number(payload.groupSizeMax ?? 10),

  pricePerPerson: Number(payload.pricePerPerson),
  originalPrice: payload.originalPrice ? Number(payload.originalPrice) : undefined,
  childPricePercent: Number(payload.childPricePercent ?? 60),
  advancePercent: Number(payload.advancePercent ?? 100),

  heroImage: String(payload.heroImage).trim(),
  gallery: asArray(payload.gallery).filter(Boolean),

  destinations: asArray(payload.destinations).map((d) => String(d).trim()).filter(Boolean),
  highlights: asArray(payload.highlights).map((h) => String(h).trim()).filter(Boolean),
  includes: asArray(payload.includes)
    .filter((i) => i && i.label)
    .map((i) => ({
      id: String(i.id || slugify(i.label) || 'item'),
      label: String(i.label).trim(),
      included: i.included !== false,
    })),
  exclusions: asArray(payload.exclusions).map((e) => String(e).trim()).filter(Boolean),
  itinerary: asArray(payload.itinerary).map((day, index) => ({
    day: Number(day.day ?? index + 1),
    title: String(day.title).trim(),
    activities: asArray(day.activities).map((a) => String(a).trim()).filter(Boolean),
    mealPlan: String(day.mealPlan || '').trim(),
  })),
  pickupPoints: asArray(payload.pickupPoints).map((p) => String(p).trim()).filter(Boolean),
  cancellationPolicy: String(payload.cancellationPolicy || '').trim(),

  departureMode: 'on_request',
  leadTimeDays: Number(payload.leadTimeDays ?? 2),
});

/**
 * Create a package.
 *
 * Tours are single-vendor, so there is one entry point and the admin creating
 * the package is also its approver — nothing here waits in a queue. The
 * `status` machinery stays on the model for the packages that came through the
 * old operator flow, but a package created now is live the moment it is saved
 * unless the caller asks otherwise.
 */
export const createPackage = async ({ payload, autoApprove = true, approvedBy }) => {
  const validationError = validatePackagePayload(payload);
  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const doc = buildPackageDocument(payload);
  doc.createdBy = 'admin';
  doc.slug = await buildUniqueSlug(doc.title);

  if (autoApprove) {
    doc.status = 'approved';
    doc.approvedAt = new Date();
    doc.approvedBy = approvedBy;
  } else {
    doc.status = 'pending';
  }

  return TourPackage.create(doc);
};

/**
 * The one definition of "a traveller can see this".
 * Kept in a single place so a new listing endpoint cannot accidentally expose
 * a draft or a package the admin has switched off.
 */
export const publicPackageMatch = (extra = {}) => ({
  status: 'approved',
  isActive: true,
  ...extra,
});

/**
 * True when an edit actually *changes* something a traveller is paying for.
 *
 * Compares values rather than asking whether a key is present: the package form
 * submits every field on every save, so a presence check would re-pend a live
 * package for a typo fix — exactly what MATERIAL_FIELDS exists to prevent.
 */
export const isMaterialEdit = (current = {}, payload = {}) => {
  const current_ = current.toObject ? current.toObject() : current;

  // Both sides go through the document builder so the comparison is between
  // normalised values — "4200" and 4200 are the same price, not an edit, and
  // subdocument _ids are stripped from either side.
  const was = buildPackageDocument(current_);
  const now = buildPackageDocument({ ...current_, ...payload });

  return MATERIAL_FIELDS.some(
    (field) =>
      Object.prototype.hasOwnProperty.call(payload, field) &&
      JSON.stringify(now[field]) !== JSON.stringify(was[field]),
  );
};

export default {
  createPackage,
  publicPackageMatch,
  isMaterialEdit,
  validatePackagePayload,
  buildPackageDocument,
  MATERIAL_FIELDS,
};
