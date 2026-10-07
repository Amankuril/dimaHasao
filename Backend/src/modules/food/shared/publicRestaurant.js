/*
 * Fields of a restaurant document that never leave the server on a public
 * (unauthenticated, customer-facing) read. The detail and unified-search
 * endpoints returned the whole document, so anyone could pull a restaurant's
 * bank account, IFSC, UPI, PAN, KYC document images, owner phone/email and
 * push tokens by id.
 *
 * A denylist rather than the list endpoint's allowlist because the detail page
 * reads many fields (dining/takeaway settings, address parts, menu…) and an
 * allowlist would silently blank whichever one was missed. What the customer
 * apps do render is kept: ownerName, gstNumber and fssaiNumber are shown in
 * the legal block on the restaurant page (FSSAI display is a legal
 * requirement), and primaryContactNumber is the public contact number.
 */
const PRIVATE_RESTAURANT_FIELDS = [
    'ownerEmail',
    'ownerPhone',
    'ownerPhoneDigits',
    'ownerPhoneLast10',
    'panNumber',
    'nameOnPan',
    'panImage',
    'gstLegalName',
    'gstAddress',
    'gstImage',
    'fssaiImage',
    'fssaiExpiry',
    'accountNumber',
    'ifscCode',
    'accountHolderName',
    'accountType',
    'upiId',
    'upiQrImage',
    'fcmTokens',
    'fcmTokenMobile',
    'businessModel',
    'rejectionReason',
    'rejectedAt',
    'pendingApprovalType',
    'deletedAt',
    'onboarding',
    'password',
];

/** A copy of a restaurant document safe to hand to the public. */
export const toPublicRestaurant = (doc) => {
    if (!doc || typeof doc !== 'object') return doc;
    const out = { ...(typeof doc.toObject === 'function' ? doc.toObject() : doc) };
    for (const field of PRIVATE_RESTAURANT_FIELDS) delete out[field];
    return out;
};
