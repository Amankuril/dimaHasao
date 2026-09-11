/**
 * Registry of auth audiences — the apps that sign in with phone + OTP.
 *
 * There are five: the consumer super-app (food + taxi + hotel + tours share one
 * account), and four partner apps — restaurant, delivery, taxi driver, hotel
 * partner.
 *
 * Core owns the OTP mechanics and the shared vocabulary. Each module supplies an
 * adapter describing how to find its accounts and mint its sessions, so nothing
 * here imports a module's models — the dependency only ever points module →
 * core. Adding a sixth app means writing one adapter, not touching this file.
 */
import { ValidationError } from '../errors.js';

/**
 * What the client should do once the OTP is verified. This vocabulary is the
 * contract every app shares, so a frontend can branch on one field regardless of
 * which audience it belongs to.
 */
export const NEXT_STEP = {
    /** Signed in — tokens are in the response. */
    AUTHENTICATED: 'authenticated',
    /** Verified, but we only need a display name before issuing a session. */
    COLLECT_NAME: 'collect_name',
    /** Verified, but the account needs a full registration/onboarding flow. */
    ONBOARDING: 'onboarding',
};

const audiences = new Map();

const REQUIRED_METHODS = ['findAccount', 'issueSession'];

/**
 * @typedef {Object} AuthAudience
 * @property {string} key            - Public identifier, e.g. 'user', 'restaurant'.
 * @property {string} otpScope       - Namespace in the shared OTP store.
 * @property {string} [label]        - Human-readable name for logs/errors.
 * @property {string} [onNewAccount] - NEXT_STEP to return when no account exists.
 *   Defaults to ONBOARDING; the consumer app uses COLLECT_NAME.
 * @property {boolean} [requireExistingAccount] - When true, requesting an OTP for
 *   an unknown phone fails instead of starting a signup.
 * @property {(phone: string) => Promise<any|null>} findAccount
 * @property {(account: any) => void} [assertCanLogin] - Throw to block a
 *   blocked/pending/deactivated account.
 * @property {(account: any, ctx: Object) => Promise<Object>} issueSession -
 *   Returns the session payload for this app (tokens, user, whatever it needs).
 * @property {(phone: string, payload: Object) => Promise<any>} [createAccount] -
 *   Optional: used by COLLECT_NAME audiences to finish a lightweight signup.
 */

/**
 * Register an audience. Called by modules at boot.
 * @param {AuthAudience} adapter
 */
export const registerAuthAudience = (adapter) => {
    const key = String(adapter?.key || '').trim().toLowerCase();

    if (!key) {
        throw new Error('registerAuthAudience: `key` is required');
    }
    if (!adapter.otpScope) {
        throw new Error(`registerAuthAudience(${key}): \`otpScope\` is required`);
    }
    for (const method of REQUIRED_METHODS) {
        if (typeof adapter[method] !== 'function') {
            throw new Error(`registerAuthAudience(${key}): \`${method}\` must be a function`);
        }
    }
    if (audiences.has(key)) {
        throw new Error(`registerAuthAudience(${key}): already registered`);
    }

    audiences.set(key, {
        label: key,
        onNewAccount: NEXT_STEP.ONBOARDING,
        requireExistingAccount: false,
        ...adapter,
        key,
    });

    return audiences.get(key);
};

/**
 * Look up an audience, rejecting unknown keys with a client-safe error.
 * @param {string} key
 * @returns {AuthAudience}
 */
export const getAuthAudience = (key) => {
    const normalized = String(key || '').trim().toLowerCase();
    const audience = audiences.get(normalized);

    if (!audience) {
        throw new ValidationError(
            `Unknown auth audience '${key}'. Expected one of: ${listAuthAudiences().join(', ')}`,
        );
    }

    return audience;
};

export const listAuthAudiences = () => [...audiences.keys()];

/** Test seam — lets a suite register adapters against a clean registry. */
export const resetAuthAudiences = () => audiences.clear();
