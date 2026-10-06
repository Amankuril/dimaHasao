/*
 * Plain modules ported from the web (services/registrationService) sign the driver in and out
 * without React; AuthContext registers the real implementations here.
 */
let handlers = { login: null, logout: null };

export function registerAuthHandlers(next) {
  handlers = { ...handlers, ...next };
}

/** persistDriverAuthSession({ token, role, driver }): stores the token securely and updates the session. */
export function signInDriver(data) {
  return handlers.login ? handlers.login(data) : Promise.resolve(null);
}

/** clearDriverAuthState(): drops the session and every cached driver value. */
export function signOutDriver() {
  return handlers.logout ? handlers.logout() : Promise.resolve();
}
