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

  /**
   * When passes may be bought. Both ends are optional and mean different
   * things when blank: no open date means sales are already open, and no close
   * date falls back to the festival's own end — selling a pass to something
   * that has finished is never right, and an admin should not have to remember
   * to set a second date to prevent it.
   */
  bookingOpensAt: { type: Date },
  bookingClosesAt: { type: Date },

  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

festivalSchema.index({ isActive: 1, sortOrder: 1, startDate: 1 });

/**
 * Whether passes can be bought right now, and why not.
 *
 * Exported as a plain function over a festival object so the quote, the booking
 * and the payload the screen renders all reach the same verdict — a countdown
 * that says "2 hours left" while the server refuses the sale is the class of
 * disagreement this project keeps having to fix.
 */
export const bookingWindow = (festival, now = new Date()) => {
  const opensAt = festival?.bookingOpensAt ? new Date(festival.bookingOpensAt) : null;
  // The festival's own end is the backstop when no close date was set.
  const closesAt = festival?.bookingClosesAt
    ? new Date(festival.bookingClosesAt)
    : (festival?.endDate ? new Date(festival.endDate) : null);

  if (!festival?.isActive) {
    return { isOpen: false, reason: 'This festival is not open for booking', opensAt, closesAt };
  }
  if (opensAt && now < opensAt) {
    return { isOpen: false, reason: 'Bookings have not opened yet', opensAt, closesAt };
  }
  if (closesAt && now > closesAt) {
    return { isOpen: false, reason: 'Bookings have closed for this festival', opensAt, closesAt };
  }
  return { isOpen: true, reason: null, opensAt, closesAt };
};

/** Where a festival sits in its own life, for the admin list. */
export const festivalStatus = (festival, now = new Date()) => {
  const start = festival?.startDate ? new Date(festival.startDate) : null;
  const end = festival?.endDate ? new Date(festival.endDate) : null;

  if (end && now > end) return 'ended';
  if (start && end && now >= start && now <= end) return 'live';
  if (start && now < start) return 'upcoming';
  // No dates to judge by; `dates` is free text, so say nothing rather than guess.
  return 'scheduled';
};

const Festival = mongoose.model('Festival', festivalSchema);
export default Festival;
