import mongoose from 'mongoose';
import { defineSupportTicketType } from '../../../../core/support/supportTicket.model.js';

/**
 * A restaurant's ticket. A discriminator on the platform-wide `SupportTicket`;
 * see core/support/supportTicket.model.js.
 */
export const FoodRestaurantSupportTicket = defineSupportTicketType(
  'FoodRestaurantSupportTicket',
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodRestaurant',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['orders', 'payments', 'menu', 'restaurant', 'technical', 'other'],
      required: true,
    },
    issueType: { type: String, required: true, trim: true },
    orderRef: { type: String, default: '', trim: true },
  },
  { module: 'food', requesterRole: 'restaurant' },
  'restaurantId',
);

export default FoodRestaurantSupportTicket;
