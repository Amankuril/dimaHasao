import { runExclusive } from '../../../../utils/runExclusive.js';
import { sendResponse, sendError } from '../../../../utils/response.js';
import { FoodRestaurantWithdrawal } from '../models/foodRestaurantWithdrawal.model.js';
import { FoodRestaurant } from '../models/restaurant.model.js';
import { getRestaurantFinance } from '../services/restaurantFinance.service.js';

// The balance check and the insert are not atomic; two requests fired together
// both saw the full balance and withdrew it twice. See utils/runExclusive.js.
const runExclusiveForRestaurant = (restaurantId, task) => runExclusive('restaurant-withdrawal', restaurantId, task);

export const createWithdrawalRequestController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const { bankDetails } = req.body;
        const amount = Number(req.body?.amount);

        if (!restaurantId) return sendError(res, 401, 'Restaurant authentication required');
        if (!Number.isFinite(amount) || amount <= 0) {
            return sendError(res, 400, 'Invalid withdrawal amount');
        }

        const outcome = await runExclusiveForRestaurant(restaurantId, async () => {
            // Check if restaurant has enough balance
            const finance = await getRestaurantFinance(restaurantId);
            const availableBalance = finance?.currentCycle?.estimatedPayout || 0;

            if (amount > availableBalance) {
                return { error: `Insufficient balance. Available: ₹${availableBalance}` };
            }

            // Create the withdrawal request
            const withdrawal = new FoodRestaurantWithdrawal({
                restaurantId,
                amount,
                bankDetails,
                status: 'pending'
            });

            await withdrawal.save();
            return { withdrawal };
        });

        if (outcome.error) return sendError(res, 400, outcome.error);
        return sendResponse(res, 201, 'Withdrawal request submitted successfully', outcome.withdrawal);
    } catch (error) {
        next(error);
    }
};

export const listMyWithdrawalsController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        if (!restaurantId) return sendError(res, 401, 'Restaurant authentication required');

        const withdrawals = await FoodRestaurantWithdrawal.find({ restaurantId })
            .sort({ createdAt: -1 })
            .lean();

        return sendResponse(res, 200, 'Withdrawals fetched successfully', withdrawals);
    } catch (error) {
        next(error);
    }
};
