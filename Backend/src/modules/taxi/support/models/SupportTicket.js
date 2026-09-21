import mongoose from 'mongoose';
import {
  SupportTicket as PlatformSupportTicket,
  defineSupportTicketType,
} from '../../../../core/support/supportTicket.model.js';

/**
 * Taxi's ticket. A discriminator on the platform-wide `SupportTicket`; same
 * filename and exports as before, so every taxi caller is unchanged. See
 * core/support/supportTicket.model.js.
 *
 * Taxi's own statuses are a subset of the platform's union, and its screens
 * filter on these three — so they stay exactly as they were.
 */
const SUPPORT_STATUS = ['pending', 'assigned', 'closed'];

export const SUPPORT_TICKET_STATUS = SUPPORT_STATUS;

export const SupportTicket = defineSupportTicketType(
  'TaxiSupportTicket',
  {
    ticketCode: { type: String, required: true, unique: true, trim: true, index: true },
    titleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxiSupportTicketTitle',
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    userType: { type: String, enum: ['user', 'driver', 'owner'], required: true, index: true },
    supportType: { type: String, enum: ['general', 'request'], default: 'general', index: true },
    requesterRole: { type: String, enum: ['user', 'driver', 'owner'], required: true, index: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    serviceLocation: { type: String, default: '', trim: true },
    status: { type: String, enum: SUPPORT_STATUS, default: 'pending', index: true },
    assignedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodAdmin',
      default: null,
      index: true,
    },
  },
  { module: 'taxi' },
);

export { PlatformSupportTicket };
export default SupportTicket;
