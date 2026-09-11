/**
 * Auth audience for the hotel partner app.
 *
 * One phone-and-OTP screen serves both sign-in and sign-up: a known number gets
 * a session, an unknown one is answered with ONBOARDING and creates its account
 * through `createAccount` on the follow-up /auth/otp/complete call. KYC and
 * admin approval happen afterwards, inside the partner area.
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

        /**
         * Create a partner from the minimum the login page can ask for.
         *
         * Full KYC (Aadhaar, PAN, address, documents) is collected later in the
         * partner area — it needs file uploads, and gating signup behind it left
         * new partners with no way in at all. The account starts `pending`, so
         * an admin still approves before it can transact.
         */
        createAccount: async (phone, { name, email } = {}) => {
            const trimmedName = String(name || '').trim();
            if (!trimmedName) return null;

            const normalizedEmail = String(email || '').trim().toLowerCase();

            if (normalizedEmail) {
                const emailTaken = await Partner.findOne({ email: normalizedEmail, phone: { $ne: phone } });
                if (emailTaken) {
                    throw new AuthError('That email is already registered to another partner.');
                }
            }

            // OTP is the credential here; the password column just has to be set.
            const password = await bcrypt.hash(`${phone}:${Date.now()}:${Math.random()}`, 10);

            return Partner.create({
                name: trimmedName,
                phone,
                ...(normalizedEmail ? { email: normalizedEmail } : {}),
                password,
                role: 'partner',
                isPartner: true,
                isVerified: true,
                partnerApprovalStatus: 'pending',
            });
        },

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
