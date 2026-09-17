import mongoose from 'mongoose';
import { defineSupportTicketType } from '../../../../core/support/supportTicket.model.js';

/**
 * A delivery partner's ticket. A discriminator on the platform-wide
 * `SupportTicket`; see core/support/supportTicket.model.js.
 *
 * `ticketId` stays for the screens that already display it — the base model's
 * `ticketCode` is the platform-wide reference.
 */
export const DeliverySupportTicket = defineSupportTicketType(
  'DeliverySupportTicket',
  {
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryPartner',
      required: true,
      index: true,
    },
    ticketId: { type: String, unique: true, sparse: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['payment', 'account', 'technical', 'order', 'other'],
      default: 'other',
    },
  },
  { module: 'food', requesterRole: 'delivery' },
  'deliveryPartnerId',
);

export default DeliverySupportTicket;
