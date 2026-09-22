import mongoose from 'mongoose';

const restaurantCommissionSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodRestaurant',
            required: true,
            unique: true,
            index: true
        },
        defaultCommission: {
            type: {
                type: String,
                enum: ['percentage', 'amount'],
                default: 'percentage'
            },
            // No implied rate: a rule saved without a value takes nothing until
            // someone enters what was actually agreed.
            value: { type: Number, default: 0 }
        },
        notes: { type: String, trim: true, default: '' },
        status: { type: Boolean, default: true, index: true }
    },
    { collection: 'food_restaurant_commissions', timestamps: true }
);


export const FoodRestaurantCommission = mongoose.model('FoodRestaurantCommission', restaurantCommissionSchema);

