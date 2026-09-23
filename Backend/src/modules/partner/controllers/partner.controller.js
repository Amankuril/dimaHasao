import { sendResponse } from '../../../utils/response.js';
import { ApiError } from '../../../utils/ApiError.js';
import {
    findPartnerProfilesByPhone,
    listProfileKeys,
    resolveCallerPhone,
} from '../services/partnerIdentity.js';
import { createHotelPartnerAccount, issueHotelPartnerSession } from '../../hotel/auth/audiences.js';

/** The phone behind whichever token was presented, or 401. */
const requireCallerPhone = async (req) => {
    const phone = await resolveCallerPhone(req);

    if (!phone) {
        throw new ApiError(401, 'Could not resolve the signed-in partner.');
    }

    return phone;
};

/**
 * GET /v1/partner/profiles
 *
 * What this partner currently has. The client calls it after finishing a second
 * onboarding, so the workspace switcher appears without a fresh login.
 */
export const getMyProfiles = async (req, res) => {
    const phone = await requireCallerPhone(req);
    const accounts = await findPartnerProfilesByPhone(phone);

    return sendResponse(res, 200, 'Partner profiles', {
        phone,
        profiles: listProfileKeys(accounts),
        restaurant: accounts.restaurant
            ? {
                  id: String(accounts.restaurant._id),
                  name: accounts.restaurant.restaurantName || '',
                  status: accounts.restaurant.status || 'pending',
              }
            : null,
        hotel: accounts.hotelPartner
            ? {
                  id: String(accounts.hotelPartner._id),
                  name: accounts.hotelPartner.name || '',
                  partnerApprovalStatus: accounts.hotelPartner.partnerApprovalStatus || 'pending',
              }
            : null,
    });
};

/**
 * POST /v1/partner/profiles/hotel  { name, email }
 *
 * Add the hotel business to an existing partner, and hand back the hotel
 * session so the client can go straight into listing a property.
 *
 * This one endpoint serves both ways in: the "both" onboarding path, and the
 * "also list a hotel" option in restaurant settings. The signup ticket from
 * login expires in ten minutes and restaurant onboarding takes longer, so the
 * second business is added with a real session rather than that ticket.
 */
export const addHotelProfile = async (req, res) => {
    const phone = await requireCallerPhone(req);
    const { name, email } = req.body || {};

    if (!String(name || '').trim()) {
        throw new ApiError(400, 'A contact name is required to list a hotel.');
    }

    const existing = await findPartnerProfilesByPhone(phone);

    if (existing.hotelPartner) {
        const session = await issueHotelPartnerSession(existing.hotelPartner);
        return sendResponse(res, 200, 'Hotel profile already exists', session);
    }

    const hotelPartner = await createHotelPartnerAccount(phone, { name, email });

    if (!hotelPartner) {
        throw new ApiError(400, 'Could not create the hotel profile.');
    }

    const session = await issueHotelPartnerSession(hotelPartner);

    return sendResponse(res, 201, 'Hotel profile created', session);
};
