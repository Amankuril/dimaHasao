import { useEffect } from 'react';
import { subscribeRazorpay } from '../lib/razorpay';

/* Expo web preview: checkout.js in the page itself, as the web app does. */
export default function RazorpayHost() {
  useEffect(
    () =>
      subscribeRazorpay(({ checkout, handler, onError, onClose }) => {
        const open = () => {
          const rzp = new window.Razorpay({ ...checkout, handler, modal: { ondismiss: () => onClose?.() } });
          rzp.on('payment.failed', (r) => onError?.(r?.error));
          rzp.open();
        };
        if (window.Razorpay) return open();
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = open;
        s.onerror = () => onError?.({ description: 'Failed to load Razorpay script' });
        document.body.appendChild(s);
      }),
    [],
  );
  return null;
}
