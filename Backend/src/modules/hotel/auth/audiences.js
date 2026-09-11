/**
 * Auth audience for the hotel partner app.
 *
 * Hotel partners register first (documents, KYC) and are then approved by an
 * admin, so an unknown phone is sent to onboarding rather than signed in.
 */
import jwt from 'jsonwebtoken';
import Partner from '../models/Partner.js';
import { registerAuthAudience, NEXT_STEP } from '../../../core/auth/otpAuth/audienceRegistry.js';
import { AuthError } from '../../../core/auth/errors.js';

/**
 * Signed with the platform secret — the hotel auth middleware accepts tokens
 * from either secret, so partner sessions coexist with platform sessions.
 */
const signPartnerToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '30d' });

export const registerHotelAuthAudiences = () => {
    registerAuthAudience({
        key: 'hotel-partner',
        label: 'hotel partner',
        otpScope: 'hotel',
        onNewAccount: NEXT_STEP.ONBOARDING,

        findAccount: (phone) => Partner.findOne({ phone }),

        assertCanLogin: (partner) => {
            if (partner.isBlocked) {
                throw new AuthError(
                    'Your account has been blocked by admin. Please contact support.',
                );
            }
            if (partner.partnerApprovalStatus === 'rejected') {
                throw new AuthError('Your partner registration was rejected. Please contact support.');
            }
        },

        issueSession: async (partner) => {
            // First successful OTP login also confirms the phone.
            if (!partner.isVerified) {
                partner.isVerified = true;
                await partner.save();
            }

            return {
                token: signPartnerToken(String(partner._id), partner.role || 'partner'),
                // Approval is separate from verification — the app uses this to
                // show a "pending approval" state instead of the dashboard.
                partnerApprovalStatus: partner.partnerApprovalStatus,
                user: {
                    id: String(partner._id),
                    name: partner.name || '',
                    phone: partner.phone || '',
                    email: partner.email || '',
                    role: partner.role || 'partner',
                    isVerified: partner.isVerified,
                },
            };
        },
    });
};
