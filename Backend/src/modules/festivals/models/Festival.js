import mongoose from 'mongoose';

/**
 * A festival or event, and the passes it sells.
 *
 * Scope of work section 12 lists festival offers, and the home screen has been
 * advertising "Passes from ₹250" against hard-coded fixtures — this is the
 * backend that makes those real.
 *
 * Ticket categories are a subdocument rather than their own collection: they
 * have no life outside their festival, and holding inventory on the same
 * document lets a booking decrement it in one atomic update.
 */
const ticketCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  totalTickets: { type: Number, required: true, min: 0 },
  /** Never written directly — only incremented when a booking is paid. */
  soldTickets: { type: Number, default: 0, min: 0 },
  perks: { type: [String], default: [] },
  /** An organiser can close a category without deleting it. */
  isActive: { type: Boolean, default: true },
  /** Cap per order, so one buyer cannot take the whole allocation. */
  maxPerBooking: { type: Number, default: 10, min: 1 },
});

/** What the UI reads; derived so it can never disagree with the counters. */
ticketCategorySchema.virtual('remainingTickets').get(function () {
  return Math.max(0, (this.totalTickets || 0) - (this.soldTickets || 0));
});
ticketCategorySchema.virtual('isSoldOut').get(function () {
  return (this.totalTickets || 0) - (this.soldTickets || 0) <= 0;
});
ticketCategorySchema.set('toJSON', { virtuals: true });
ticketCategorySchema.set('toObject', { virtuals: true });

const festivalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, trim: true, lowercase: true },
  tagline: { type: String, trim: true },

  /** The human label the approved screens print, e.g. "Nov 14 - Nov 17, 2026". */
  dates: { type: String, trim: true },
  // Real dates drive "is it over" and sorting; the label above is presentation.
  startDate: { type: Date, index: true },
  endDate: { type: Date },

  venue: { type: String, trim: true },
  location: { type: String, trim: true },
  coordinates: { lat: { type: Number }, lng: { type: Number } },

  organizer: { type: String, trim: true },
  description: { type: String, trim: true },
  highlights: { type: [String], default: [] },

  heroImage: { type: String, trim: true },
  images: { type: [String], default: [] },

  ticketCategories: { type: [ticketCategorySchema], default: [] },

  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

festivalSchema.index({ isActive: 1, sortOrder: 1, startDate: 1 });

const Festival = mongoose.model('Festival', festivalSchema);
export default Festival;
