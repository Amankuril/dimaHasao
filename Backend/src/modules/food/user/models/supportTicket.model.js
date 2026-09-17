import mongoose from 'mongoose';
import { defineSupportTicketType } from '../../../../core/support/supportTicket.model.js';

/**
 * A customer's food ticket.
 *
 * Kept as a model of its own so every existing caller and query still works,
 * but it is now a discriminator on the platform-wide `SupportTicket` — same
 * filename, same export, same scoped results, one collection behind it.
 * See core/support/supportTicket.model.js.
 */
export const FoodSupportTicket = defineSupportTicketType(
  'FoodSupportTicket',
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodUser', required: true, index: true },
    type: { type: String, enum: ['order', 'restaurant', 'other'], required: true },
    issueType: { type: String, required: true, trim: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodOrder', default: null },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRestaurant', default: null },
  },
  { module: 'food', requesterRole: 'user' },
  'userId',
);

export default FoodSupportTicket;
