import mongoose from 'mongoose';

/**
 * One support desk for the whole platform.
 *
 * Food kept three ticket models (user, restaurant, delivery partner) and taxi a
 * fourth, each in its own collection with its own status words; hotel and tours
 * had none at all. So an admin had four inboxes and two blind spots.
 *
 * This is the base model every module's tickets now live in. Each module keeps
 * its own model as a **discriminator** rather than a plain alias: a
 * discriminator scopes every query to its own tickets automatically, so
 * `FoodSupportTicket.find({})` still returns only food's, while the base model
 * sees all of them — which is what the unified admin desk reads. Discriminators
 * also let each module keep its own required fields without forcing them on
 * everyone else.
 *
 * Safe to introduce because every ticket collection was empty; there was no
 * history to migrate.
 */

/**
 * The union of what the four original models used.
 *
 * The synonyms are deliberate. Food wrote 'in-progress', delivery wrote
 * 'in_progress' and taxi wrote 'pending'/'assigned' — and each module's admin
 * screens filter and badge on its own spelling. Narrowing the vocabulary would
 * mean editing those screens; keeping it lets every existing caller carry on
 * unchanged. `SUPPORT_STATUS_GROUPS` is what anything cross-module should read.
 */
export const SUPPORT_STATUSES = [
  'open', 'pending', 'assigned', 'in-progress', 'in_progress', 'resolved', 'closed',
];

/** Cross-module grouping: what a status means regardless of who wrote it. */
export const SUPPORT_STATUS_GROUPS = {
  waiting: ['open', 'pending'],
  working: ['assigned', 'in-progress', 'in_progress'],
  done: ['resolved', 'closed'],
};

export const SUPPORT_MODULES = ['food', 'taxi', 'hotel', 'tours', 'festivals', 'platform'];

/**
 * Which of those statuses each module's own screens can render.
 *
 * A module's discriminator enforces this for tickets its own controllers
 * create, but a ticket raised from the consumer help screen is built on this
 * base model and would otherwise accept any status in the union — leaving taxi
 * with a 'resolved' its panel has no word for. The admin desk checks against
 * this so the rule holds however the ticket was raised.
 */
export const SUPPORT_STATUSES_BY_MODULE = {
  food: ['open', 'in-progress', 'in_progress', 'resolved', 'closed'],
  taxi: ['pending', 'assigned', 'closed'],
  hotel: ['open', 'in_progress', 'resolved', 'closed'],
  tours: ['open', 'in_progress', 'resolved', 'closed'],
  festivals: ['open', 'in_progress', 'resolved', 'closed'],
  platform: ['open', 'in_progress', 'resolved', 'closed'],
};

export const SUPPORT_REQUESTER_ROLES = [
  'user', 'restaurant', 'delivery', 'driver', 'owner', 'partner', 'operator', 'admin',
];

/** A reply on a ticket. Taxi's threaded conversation, available to everyone. */
const supportMessageSchema = new mongoose.Schema({
  senderRole: { type: String, enum: [...SUPPORT_REQUESTER_ROLES], required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderName: { type: String, default: '', trim: true },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const supportTicketSchema = new mongoose.Schema({
  // Human-quotable reference. Sparse because the older food models never had
  // one and their discriminators do not require it.
  ticketCode: { type: String, unique: true, sparse: true, trim: true, index: true },

  module: { type: String, enum: SUPPORT_MODULES, required: true, index: true },

  // Who raised it. `requesterModel` names the collection so a populate can
  // resolve a requester that might be a user, a driver or a hotel partner.
  requesterRole: { type: String, enum: SUPPORT_REQUESTER_ROLES, index: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, index: true },
  requesterModel: { type: String, trim: true },
  requesterName: { type: String, default: '', trim: true },
  requesterPhone: { type: String, default: '', trim: true },

  // What it is about.
  category: { type: String, trim: true },
  issueType: { type: String, trim: true },
  subject: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },

  /**
   * What the ticket is attached to — an order, a ride, a stay, a trip.
   * Generic on purpose: a per-module ref field for each would be five nullable
   * columns, and the modules' own discriminators still declare theirs.
   */
  context: {
    kind: { type: String, trim: true },
    id: { type: mongoose.Schema.Types.ObjectId },
    label: { type: String, trim: true },
  },

  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
  status: { type: String, enum: SUPPORT_STATUSES, default: 'open', index: true },

  adminResponse: { type: String, default: '' },
  respondedAt: { type: Date },
  assignedAdminId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  assignedAdminName: { type: String, default: '', trim: true },

  messages: { type: [supportMessageSchema], default: [] },
  lastMessageAt: { type: Date, default: Date.now, index: true },
}, {
  collection: 'support_tickets',
  timestamps: true,
  // Every module's model is a discriminator on this one; `__t` is what scopes
  // their queries.
  discriminatorKey: '__t',
});

supportTicketSchema.index({ module: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ requesterRole: 1, requesterId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

const CODE_PREFIX = { food: 'FD', taxi: 'TX', hotel: 'HT', tours: 'TR', festivals: 'FS', platform: 'PL' };

/**
 * A reference a person can read out over the phone.
 *
 * Retried on collision rather than trusted: the random tail is short enough to
 * repeat, and `ticketCode` is unique.
 */
export const generateTicketCode = async (module) => {
  const prefix = CODE_PREFIX[module] || 'SP';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}-${Math.floor(Math.random() * 9000 + 1000)}`;
    // eslint-disable-next-line no-use-before-define
    if (!(await SupportTicket.exists({ ticketCode: code }))) return code;
  }
  return `${prefix}-${Date.now()}`;
};

/**
 * Every ticket gets a code, including ones created straight through a module's
 * own model. Food's and taxi's controllers predate this desk and build their
 * documents themselves; without this, their tickets would reach the unified
 * inbox with nothing an admin could quote back to the customer.
 */
supportTicketSchema.pre('validate', async function stampTicketCode(next) {
  if (!this.ticketCode) this.ticketCode = await generateTicketCode(this.module);
  next();
});

export const SupportTicket =
  mongoose.models.SupportTicket || mongoose.model('SupportTicket', supportTicketSchema);

/**
 * Register a module's ticket type.
 *
 * Returns the existing model on a second call so a re-import (or a test that
 * loads a module twice) does not throw on a duplicate discriminator.
 */
export const defineSupportTicketType = (name, extraFields = {}, fixed = {}, requesterField = null) => {
  if (mongoose.models[name]) return mongoose.models[name];

  const schema = new mongoose.Schema(extraFields, { timestamps: true });

  /*
   * The module (and the requester's role, where it is fixed) are schema
   * defaults rather than a hook. Mongoose applies defaults when the document is
   * constructed but runs a discriminator's hooks *after* the base model's — so
   * a hook here would stamp the module only after the base had already
   * generated a ticket code without knowing which module it belonged to.
   */
  for (const [key, value] of Object.entries(fixed)) {
    const basePath = supportTicketSchema.path(key);
    schema.add({
      [key]: {
        type: String,
        default: value,
        ...(basePath?.enumValues?.length ? { enum: basePath.enumValues } : {}),
        ...(basePath?.options?.index ? { index: true } : {}),
      },
    });
  }

  /*
   * Mirror the module's own owner field onto `requesterId`.
   *
   * Food's controllers predate this desk and set `userId`, `restaurantId` or
   * `deliveryPartnerId`. Without this the unified desk — and a customer's own
   * cross-service history — would not know who raised those tickets.
   */
  if (requesterField) {
    const refModel = extraFields[requesterField]?.ref;
    schema.pre('validate', function mirrorRequester(next) {
      if (!this.requesterId && this[requesterField]) this.requesterId = this[requesterField];
      if (!this.requesterModel && refModel) this.requesterModel = refModel;
      next();
    });
  }

  return SupportTicket.discriminator(name, schema);
};

export default SupportTicket;
