/**
 * Auth audience for the tour operator app.
 *
 * One phone-and-OTP screen serves both sign-in and sign-up: a known number gets
 * a session, an unknown one is answered with ONBOARDING and creates its account
 * through `createAccount` on the follow-up /auth/otp/complete call.
 *
 * A pending operator can still sign in. Approval depends on KYC that is only
 * collectable inside the panel, so locking them out until approved would leave
 * them with no way to supply it — the same reasoning as the hotel partner app.
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import TourOperator from '../models/TourOperator.js';
import { registerAuthAudience, NEXT_STEP } from '../../../core/auth/otpAuth/audienceRegistry.js';
import { AuthError } from '../../../core/auth/errors.js';

const signOperatorToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '30d' });

export const registerToursAuthAudiences = () => {
    registerAuthAudience({
        key: 'tours-operator',
        label: 'tour operator',
        otpScope: 'tours',
        onNewAccount: NEXT_STEP.ONBOARDING,

        findAccount: (phone) => TourOperator.findOne({ phone }),

        /**
         * Create an operator from the minimum the login page can ask for.
         * KYC (Aadhaar, PAN, GST, address, documents) is collected later in the
         * operator area because it needs file uploads. The account starts
         * `pending`, so an admin still approves before anything can be sold.
         */
        createAccount: async (phone, { name, agencyName, email } = {}) => {
            const trimmedName = String(name || '').trim();
            if (!trimmedName) return null;

            const normalizedEmail = String(email || '').trim().toLowerCase();
            if (normalizedEmail) {
                const emailTaken = await TourOperator.findOne({
                    email: normalizedEmail,
                    phone: { $ne: phone },
                });
                if (emailTaken) {
                    throw new AuthError('That email is already registered to another operator.');
                }
            }

            // OTP is the credential here; the password column just has to be set.
            const password = await bcrypt.hash(`${phone}:${Date.now()}:${Math.random()}`, 10);

            return TourOperator.create({
                name: trimmedName,
                agencyName: String(agencyName || '').trim() || trimmedName,
                phone,
                ...(normalizedEmail ? { email: normalizedEmail } : {}),
                password,
                role: 'operator',
                isVerified: true,
                operatorApprovalStatus: 'pending',
            });
        },

        assertCanLogin: (operator) => {
            if (operator.isBlocked) {
                throw new AuthError('Your account has been blocked by admin. Please contact support.');
            }
            if (operator.operatorApprovalStatus === 'rejected') {
                throw new AuthError('Your operator registration was rejected. Please contact support.');
            }
        },

        issueSession: async (operator) => {
            // First successful OTP login also confirms the phone.
            if (!operator.isVerified) {
                operator.isVerified = true;
                await operator.save();
            }

            return {
                token: signOperatorToken(String(operator._id), operator.role || 'operator'),
                // Approval is separate from verification — the panel uses this to
                // show a "pending approval" state instead of the dashboard.
                operatorApprovalStatus: operator.operatorApprovalStatus,
                user: {
                    id: String(operator._id),
                    name: operator.name || '',
                    agencyName: operator.agencyName || '',
                    phone: operator.phone || '',
                    email: operator.email || '',
                    role: operator.role || 'operator',
                    isVerified: operator.isVerified,
                },
            };
        },
    });
};

export default registerToursAuthAudiences;
