/*
 * initRazorpayPayment(options) with the web's signature
 * (Frontend/src/modules/Food/utils/razorpay.js): same checkout options, same
 * handler / onError / onClose callbacks. RazorpayHost (mounted once in the
 * root layout) renders Razorpay's own checkout.js in a WebView.
 */
import { API_ORIGIN } from '../api/client';

const subs = new Set();

export function subscribeRazorpay(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export async function initRazorpayPayment(options) {
  if (!subs.size) throw new Error('Razorpay SDK not available');
  const checkout = {
    key: options.key,
    amount: options.amount,
    currency: options.currency || 'INR',
    order_id: options.order_id,
    name: options.name || 'Dima Hasao',
    description: options.description || 'Order Payment',
    image: options.image || `${API_ORIGIN}/logo.png`,
    prefill: { name: options.prefill?.name || '', email: options.prefill?.email || '', contact: options.prefill?.contact || '' },
    notes: options.notes || {},
    theme: { color: options.themeColor || '#E23744' },
    retry: { enabled: false },
  };
  subs.forEach((fn) => fn({ checkout, handler: options.handler, onError: options.onError, onClose: options.onClose }));
}

/** Web: warms checkout.js. The WebView loads it when the payment opens. */
export function preloadRazorpayScript() {}
