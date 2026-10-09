/**
 * Ported verbatim from the generator helpers duplicated across
 * Frontend/src/modules/Taxi/modules/user/pages/intercity/IntercityDetails.jsx
 * and IntercityConfirm.jsx.
 */
export const generateIntercityBookingId = () =>
  'IC-' + Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6).padEnd(6, '0');

export const generateSearchNonce = () => `intercity-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
