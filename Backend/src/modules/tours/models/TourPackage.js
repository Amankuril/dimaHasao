import mongoose from 'mongoose';

/**
 * A sellable tour package.
 *
 * The field set is driven by two things at once: the approved v1 consumer
 * screens (`Frontend/src/modules/DimaHasao/data/tourPackageData.js`), which
 * already expect `duration`, `includes[]`, `itinerary[]` and so on, and the
 * scope of work's operator features. Keeping both in one schema is what lets
 * the existing screens run on real data without being redesigned.
 *
 * Destinations are plain strings and a guide is an `includes` line item —
 * neither is an entity, by decision, until there is a reason for them to be.
 */

const itineraryDaySchema = new mongoose.Schema({
  day: { type: Number, required: true, min: 1 },
  title: { type: String, required: true, trim: true },
  activities: { type: [String], default: [] },
  mealPlan: { type: String, trim: true },
}, { _id: false });

/** Matches the v1 UI's `{ id, label, included }` rows so a package can list
 *  what is covered and what is pointedly not. */
const inclusionSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  included: { type: Boolean, default: true },
}, { _id: false });

/** Only used when departureMode is 'fixed'. Present from day one so switching
 *  a package to fixed departures later needs no migration. */
const departureSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  capacity: { type: Number, required: true, min: 1 },
  booked: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const tourPackageSchema = new mongoose.Schema({
  createdBy: { type: String, enum: ['operator', 'admin'], default: 'operator' },

  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  subtitle: { type: String, trim: true },
  description: { type: String, trim: true },

  durationDays: { type: Number, required: true, min: 1 },
  durationNights: { type: Number, default: 0, min: 0 },

  category: {
    type: String,
    enum: ['sightseeing', 'trekking', 'adventure', 'cultural', 'nature', 'family', 'couple', 'group'],
    required: true,
  },
  difficulty: { type: String, enum: ['Easy', 'Moderate', 'Challenging'], default: 'Easy' },

  groupSizeMin: { type: Number, default: 1, min: 1 },
  groupSizeMax: { type: Number, default: 10, min: 1 },

  // PRICING
  pricePerPerson: { type: Number, required: true, min: 0 },
  /** Shown struck through next to the live price; purely presentational. */
  originalPrice: { type: Number, min: 0 },
  /** A child seat costs this percentage of an adult seat. */
  childPricePercent: { type: Number, default: 60, min: 0, max: 100 },
  /**
   * How much of the total is taken online to confirm the booking. 100 means
   * fully prepaid; anything less leaves a balance the operator collects
   * directly from the traveller.
   */
  advancePercent: { type: Number, default: 100, min: 1, max: 100 },

  // MEDIA
  heroImage: { type: String, required: true },
  gallery: { type: [String], default: [] },

  // CONTENT
  destinations: { type: [String], default: [] },
  highlights: { type: [String], default: [] },
  includes: { type: [inclusionSchema], default: [] },
  exclusions: { type: [String], default: [] },
  itinerary: { type: [itineraryDaySchema], default: [] },
  pickupPoints: { type: [String], default: [] },
  cancellationPolicy: { type: String, trim: true },

  // AVAILABILITY
  departureMode: { type: String, enum: ['on_request', 'fixed'], default: 'on_request' },
  /** Minimum days between booking and travel, for 'on_request' packages. */
  leadTimeDays: { type: Number, default: 2, min: 0 },
  departures: { type: [departureSchema], default: [] },

  // MODERATION
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'draft',
    index: true,
  },
  rejectionReason: { type: String, trim: true },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId },

  /** The operator's own switch, independent of admin approval. */
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },

  avgRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
}, { timestamps: true });

/**
 * Display helpers for non-lean reads.
 *
 * List endpoints use .lean() for speed, and virtuals do not survive that
 * without the mongoose-lean-virtuals plugin — so the consumer adapter derives
 * these strings from durationDays/durationNights/groupSize* instead. These
 * exist for the document responses returned straight from create/update.
 */
tourPackageSchema.virtual('durationLabel').get(function () {
  const nights = this.durationNights;
  const days = `${this.durationDays} Day${this.durationDays === 1 ? '' : 's'}`;
  if (!nights) return days;
  return `${days} / ${nights} Night${nights === 1 ? '' : 's'}`;
});

tourPackageSchema.virtual('groupSizeLabel').get(function () {
  if (this.groupSizeMax) return `Min ${this.groupSizeMin}, Max ${this.groupSizeMax}`;
  return `Min ${this.groupSizeMin} People`;
});

tourPackageSchema.set('toJSON', { virtuals: true });
tourPackageSchema.set('toObject', { virtuals: true });

tourPackageSchema.index({ status: 1, isActive: 1 });

const TourPackage = mongoose.model('TourPackage', tourPackageSchema);
export default TourPackage;
