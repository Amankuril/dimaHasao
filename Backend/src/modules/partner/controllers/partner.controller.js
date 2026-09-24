import { sendResponse } from '../../../utils/response.js';
import { ApiError } from '../../../utils/ApiError.js';
import {
    findPartnerProfilesByPhone,
    listProfileKeys,
    resolveCallerPhone,
} from '../services/partnerIdentity.js';
import { createHotelPartnerAccount, issueHotelPartnerSession } from '../../hotel/auth/audiences.js';
import Partner from '../../hotel/models/Partner.js';
import { uploadImageBuffer } from '../../../services/storage.service.js';

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
                  onboardingComplete: Boolean(accounts.hotelPartner.onboardingComplete),
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

/**
 * PATCH /v1/partner/profiles/hotel/kyc  (multipart)
 *   ownerName, street, city, state, zipCode, aadhaarNumber, panNumber
 *   + files: aadhaarFront, aadhaarBack, panCardImage
 *
 * Second half of hotel onboarding, run right after addHotelProfile with
 * whichever session that call (or restaurant registration, on the "both"
 * path) just returned. Marks onboardingComplete so the dashboard guard starts
 * enforcing partnerApprovalStatus for this partner — accounts that never took
 * this step stay ungated.
 */
export const submitHotelKyc = async (req, res) => {
    const phone = await requireCallerPhone(req);
    const { ownerName, street, city, state, zipCode, aadhaarNumber, panNumber } = req.body || {};

    if (!String(ownerName || '').trim()) {
        throw new ApiError(400, "Owner's full name is required.");
    }
    if (!String(street || '').trim() || !String(city || '').trim() || !String(state || '').trim() || !String(zipCode || '').trim()) {
        throw new ApiError(400, 'A complete address is required.');
    }
    if (!/^\d{12}$/.test(String(aadhaarNumber || '').trim())) {
        throw new ApiError(400, 'A valid 12-digit Aadhaar number is required.');
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(panNumber || '').trim().toUpperCase())) {
        throw new ApiError(400, 'A valid PAN number is required.');
    }

    const partner = await Partner.findOne({ phone });

    if (!partner) {
        throw new ApiError(404, 'No hotel profile found for this account.');
    }

    const files = req.files || {};

    if (files.aadhaarFront?.[0]) {
        partner.aadhaarFront = await uploadImageBuffer(files.aadhaarFront[0].buffer, 'hotel/partners/aadhaar');
    }
    if (files.aadhaarBack?.[0]) {
        partner.aadhaarBack = await uploadImageBuffer(files.aadhaarBack[0].buffer, 'hotel/partners/aadhaar');
    }
    if (files.panCardImage?.[0]) {
        partner.panCardImage = await uploadImageBuffer(files.panCardImage[0].buffer, 'hotel/partners/pan');
    }

    if (!partner.aadhaarFront || !partner.aadhaarBack) {
        throw new ApiError(400, 'Aadhaar front and back photos are required.');
    }
    if (!partner.panCardImage) {
        throw new ApiError(400, 'A PAN card photo is required.');
    }

    partner.ownerName = String(ownerName).trim();
    partner.aadhaarNumber = String(aadhaarNumber).trim();
    partner.panNumber = String(panNumber).trim().toUpperCase();
    partner.address = {
        ...partner.address,
        street: String(street).trim(),
        city: String(city).trim(),
        state: String(state).trim(),
        zipCode: String(zipCode).trim(),
        country: partner.address?.country || 'India',
    };
    partner.onboardingComplete = true;

    await partner.save();

    return sendResponse(res, 200, 'KYC submitted', {
        partnerApprovalStatus: partner.partnerApprovalStatus,
        onboardingComplete: partner.onboardingComplete,
    });
};
