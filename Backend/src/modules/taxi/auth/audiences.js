/**
 * Auth audience for the taxi driver app.
 *
 * A phone can hold several driver-portal roles (driver, owner, bus driver,
 * service centre…), so the session includes which role was matched and the full
 * list, letting the app show a role picker when there is more than one.
 */
import { signAccessToken } from '../services/tokenService.js';
import {
    findPreferredDriverPortalAccountByPhone,
    findAllDriverPortalAccountsByPhone,
} from '../driver/services/loginOtpService.js';
import { registerAuthAudience, NEXT_STEP } from '../../../core/auth/otpAuth/audienceRegistry.js';
import { AuthError } from '../../../core/auth/errors.js';

export const registerTaxiAuthAudiences = () => {
    registerAuthAudience({
        key: 'taxi-driver',
        label: 'taxi driver',
        otpScope: 'taxi-driver',
        onNewAccount: NEXT_STEP.ONBOARDING,

        // Returns { role, account } — the whole match is carried through so
        // issueSession knows which role this login is for.
        findAccount: (phone) => findPreferredDriverPortalAccountByPhone(phone),

        assertCanLogin: ({ account }) => {
            if (account?.isBlocked || account?.isActive === false) {
                throw new AuthError('Your account is not active. Please contact support.');
            }
        },

        issueSession: async ({ role, account }, { phone }) => {
            const token = signAccessToken({ sub: String(account._id), role });
            const availableRoles = (await findAllDriverPortalAccountsByPhone(phone)).map(
                (item) => item.role,
            );

            return {
                token,
                accessToken: token,
                role,
                availableRoles,
                user: {
                    id: String(account._id),
                    name: account.name || account.fullName || '',
                    phone: account.phone || phone,
                    role,
                },
            };
        },
    });
};
