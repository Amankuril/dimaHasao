import mongoose from 'mongoose';

/**
 * A tourist destination in Dima Hasao.
 *
 * Scope of work section 9, "Dima Hasao Tourism Module" — the destination
 * directory. Lives in the tours module because the same document lists
 * "Destination management" under Tour Management in the admin panel.
 *
 * The field names mirror what the approved v1 screens already render, so the
 * consumer UI needed no redesign when this replaced the hard-coded fixtures.
 * Model name is prefixed because `Destination` is a plausible collision and
 * mongoose model names are global.
 */
const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, trim: true, lowercase: true },
  subtitle: { type: String, trim: true },

  // Where it is
  location: { type: String, trim: true },
  fullAddress: { type: String, trim: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },

  // The practical lines the detail screen shows
  distanceFromStation: { type: String, trim: true },
  travelTime: { type: String, trim: true },
  bestTime: { type: String, trim: true },
  idealFor: { type: String, trim: true },

  // Copy
  description: { type: String, trim: true },
  aboutDetails: { type: [String], default: [] },
  guideTips: { type: [String], default: [] },

  // Imagery — every one of these is a URL from the platform upload service.
  mainImage: { type: String, trim: true },
  heroImage: { type: String, trim: true },
  insetImage: { type: String, trim: true },
  guideSunsetImage: { type: String, trim: true },
  gallery: { type: [String], default: [] },

  /** Drives the list screen's filter chips. */
  category: {
    type: String,
    enum: ['viewpoint', 'town', 'trek', 'temple', 'lake', 'wildlife'],
    default: 'viewpoint',
    index: true,
  },

  tags: [{
    _id: false,
    icon: { type: String, trim: true },
    text: { type: String, trim: true },
    color: { type: String, trim: true },
  }],

  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false },
  /** Ascending; the directory is a curated order, not alphabetical. */
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

destinationSchema.index({ isActive: 1, sortOrder: 1 });

const TourismDestination = mongoose.model('TourismDestination', destinationSchema);
export default TourismDestination;
