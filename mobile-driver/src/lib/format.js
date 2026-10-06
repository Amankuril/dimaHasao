/*
 * Formatters ported from the web. Screens keep the web's own
 * toLocaleString / toLocaleDateString calls: Hermes ships Intl with full
 * locale data on both platforms, so the output matches Chrome's. Note that a
 * bare toLocaleDateString() follows the device locale, as the browser's does.
 */

export { errorText } from './apiError';

/** @food/utils/currency formatCurrency: "₹ 12.00" */
export const formatCurrency = (amount, currency = '₹') => `${currency} ${parseFloat(amount).toFixed(2)}`;

/** "2:05" style countdown, as SignIn's formatResendTimer. */
export function mmss(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
