/**
 * Whether an admin's token predates their last password change.
 *
 * Access tokens are stateless and last as long as JWT_ACCESS_EXPIRES, so a
 * password reset did nothing to a token already stolen. Every place that loads
 * the admin behind a request (the feature gate on each panel, loadAdmin,
 * hotel's protect, refresh) compares the token's issue time with
 * `passwordChangedAt` and refuses older tokens.
 *
 * One second of slack: `iat` is whole seconds, so a token issued in the same
 * second as the change — the fresh pair handed back by change-password — must
 * still pass.
 *
 * @param {object} admin - admin document or lean object with passwordChangedAt
 * @param {number|Date} issuedAt - JWT `iat` (seconds) or a Date
 */
export const isIssuedBeforePasswordChange = (admin, issuedAt) => {
    const changed = admin?.passwordChangedAt ? new Date(admin.passwordChangedAt).getTime() : 0;
    if (!changed || issuedAt == null) return false;
    const issuedMs = issuedAt instanceof Date ? issuedAt.getTime() : Number(issuedAt) * 1000;
    if (!Number.isFinite(issuedMs)) return false;
    return issuedMs + 1000 < changed;
};
