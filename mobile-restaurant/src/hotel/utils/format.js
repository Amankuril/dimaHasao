/*
 * The formatting the hotel partner screens repeat inline on the web
 * (`₹${n.toLocaleString('en-IN')}`, `toLocaleDateString('en-GB', ...)`).
 */

/** `₹12,500` */
export const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** `₹12,500` via Intl, as WalletService.formatAmount / the header chip. */
export const formatCurrencyINR = (amount, { fraction = 0 } = {}) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(Number(amount) || 0);

/** `12 Mar` (day numeric) or `12 Mar` with a 2-digit day. */
export const formatShortDate = (value, day = 'numeric') =>
  new Date(value).toLocaleDateString('en-GB', { day, month: 'short' });

/** `12 Mar 2026` */
export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** An ISO date as the `YYYY-MM-DD` a date input holds. */
export const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
