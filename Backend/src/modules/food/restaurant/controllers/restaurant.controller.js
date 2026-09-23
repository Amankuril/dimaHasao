import { issueRestaurantSession } from '../../auth/audiences.js';
import {
    registerRestaurant,
    listApprovedRestaurants,
    getApprovedRestaurantByIdOrSlug,
    getCurrentRestaurantProfile,
    updateRestaurantProfile,
    updateRestaurantAcceptingOrders,
    updateCurrentRestaurantDiningSettings,
    updateCurrentRestaurantTakeawaySettings,
    uploadRestaurantProfileImage,
    uploadRestaurantMenuImage,
    uploadRestaurantCoverImages,
    uploadRestaurantMenuImages,
    listPublicOffers,
    getRestaurantComplaints,
    listRestaurantsUnderPriceLimit,
    isRestaurantServiceableInZone
} from '../services/restaurant.service.js';
import {
    createDiningRequest,
    getPendingDiningRequest
} from '../../dining/services/dining.service.js';
import { validateRestaurantRegisterDto } from '../validators/restaurant.validator.js';
import { sendResponse } from '../../../../utils/response.js';

export const registerRestaurantController = async (req, res, next) => {
    try {
        const validated = validateRestaurantRegisterDto(req.body);
        const restaurant = await registerRestaurant(validated, req.files);

        /*
         * Hand back a session for the restaurant that was just created.
         *
         * Onboarding used to end with no token at all, so a brand-new partner
         * was effectively signed out the moment they finished and had to sign
         * in again. It also left the combined partner signup with nowhere to
         * go: adding the hotel business needs an authenticated call, and the
         * ten-minute signup ticket is long gone by the time a three-step
         * wizard is submitted.
         *
         * The restaurant is `pending` at this point, and
         * requireApprovedRestaurant refuses every restaurant route except
         * reading and updating this same record — so the token can do nothing
         * but finish the onboarding it came from.
         */
        const session = await issueRestaurantSession(restaurant, {
            fcmToken: validated.fcmToken,
            platform: validated.platform,
        });

        const payload = restaurant.toObject?.() ?? restaurant;

        return sendResponse(res, 201, 'Restaurant registered successfully', {
            ...payload,
            session: {
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const listApprovedRestaurantsController = async (req, res, next) => {
    try {
        const data = await listApprovedRestaurants(req.query);
        return sendResponse(res, 200, 'Restaurants fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

/**
 * Does this restaurant deliver to this zone? Answered by the same rule the
 * customer list uses to decide what to show, so the two can never disagree.
 */
export const getRestaurantServiceabilityController = async (req, res, next) => {
    try {
        const result = await isRestaurantServiceableInZone({
            restaurantId: req.params.id,
            zoneId: req.query?.zoneId
        });
        return sendResponse(res, 200, 'Serviceability resolved', result);
    } catch (error) {
        next(error);
    }
};

export const getApprovedRestaurantController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const lat = req.query?.lat;
        const lng = req.query?.lng;
        const restaurant = await getApprovedRestaurantByIdOrSlug(req.params.id, userId, { lat, lng });
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        return sendResponse(res, 200, 'Restaurant fetched successfully', { restaurant });
    } catch (error) {
        next(error);
    }
};

export const getCurrentRestaurantController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const restaurant = await getCurrentRestaurantProfile(restaurantId);
        return sendResponse(res, 200, 'Restaurant fetched successfully', { restaurant });
    } catch (error) {
        next(error);
    }
};

export const updateRestaurantProfileController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const restaurant = await updateRestaurantProfile(restaurantId, req.body || {});
        return sendResponse(res, 200, 'Restaurant updated successfully', { restaurant });
    } catch (error) {
        next(error);
    }
};

export const updateRestaurantAcceptingOrdersController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const restaurant = await updateRestaurantAcceptingOrders(restaurantId, req.body?.isAcceptingOrders);
        return sendResponse(res, 200, 'Restaurant availability updated successfully', { restaurant });
    } catch (error) {
        next(error);
    }
};

export const updateCurrentRestaurantDiningSettingsController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const restaurant = await updateCurrentRestaurantDiningSettings(restaurantId, req.body || {});
        return sendResponse(res, 200, 'Dining settings updated successfully', { restaurant });
    } catch (error) {
        next(error);
    }
};

export const updateCurrentRestaurantTakeawaySettingsController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const restaurant = await updateCurrentRestaurantTakeawaySettings(restaurantId, req.body || {});
        return sendResponse(res, 200, 'Takeaway settings updated successfully', { restaurant });
    } catch (error) {
        next(error);
    }
};

export const uploadRestaurantProfileImageController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const result = await uploadRestaurantProfileImage(restaurantId, req.file);
        return sendResponse(res, 200, 'Profile image uploaded successfully', result);
    } catch (error) {
        next(error);
    }
};

export const uploadRestaurantMenuImageController = async (req, res, next) => {
    try {
        const result = await uploadRestaurantMenuImage(req.file);
        return sendResponse(res, 200, 'Menu image uploaded successfully', result);
    } catch (error) {
        next(error);
    }
};

export const uploadRestaurantCoverImagesController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const result = await uploadRestaurantCoverImages(restaurantId, req.files || []);
        return sendResponse(res, 200, 'Restaurant photos uploaded successfully', result);
    } catch (error) {
        next(error);
    }
};

export const uploadRestaurantMenuImagesController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const result = await uploadRestaurantMenuImages(restaurantId, req.files || []);
        return sendResponse(res, 200, 'Menu photos uploaded successfully', result);
    } catch (error) {
        next(error);
    }
};

export const listPublicOffersController = async (req, res, next) => {
    try {
        const data = await listPublicOffers(req.query || {});
        return sendResponse(res, 200, 'Offers fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const getRestaurantComplaintsController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const data = await getRestaurantComplaints(restaurantId, req.query || {});
        return sendResponse(res, 200, 'Complaints fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const listRestaurantsUnder250Controller = async (req, res, next) => {
    try {
        const priceLimit = Number(req.query?.priceLimit) > 0 ? Number(req.query.priceLimit) : 250;
        const data = await listRestaurantsUnderPriceLimit(req.query || {}, priceLimit);
        return sendResponse(res, 200, 'Under 250 restaurants fetched successfully', data);
    } catch (error) {
        next(error);
    }
};

export const createDiningRequestController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const request = await createDiningRequest(restaurantId, req.body || {});
        return sendResponse(res, 201, 'Dining update request submitted successfully', request);
    } catch (error) {
        next(error);
    }
};

export const getPendingDiningRequestController = async (req, res, next) => {
    try {
        const restaurantId = req.user?.userId;
        const request = await getPendingDiningRequest(restaurantId);
        return sendResponse(res, 200, 'Pending request fetched successfully', request);
    } catch (error) {
        next(error);
    }
};
