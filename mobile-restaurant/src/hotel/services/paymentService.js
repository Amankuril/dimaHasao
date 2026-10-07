import { hotelApi } from './api';
import { initRazorpayPayment } from '../../lib/razorpay';

/*
 * Port of Frontend/src/modules/Hotel/services/paymentService.js.
 *
 * The order / verify / refund / details calls are unchanged. The web opens
 * Razorpay's checkout.js in the page; here openCheckout goes through
 * lib/razorpay.js to RazorpayHost (a WebView running checkout.js).
 */

class PaymentService {
  /** Create Razorpay order for booking payment */
  async createOrder(bookingId) {
    const response = await hotelApi.post('/payments/create-order', { bookingId });
    return response.data;
  }

  /** Verify Razorpay payment */
  async verifyPayment(verificationData) {
    const response = await hotelApi.post('/payments/verify', verificationData);
    return response.data;
  }

  /** Process refund */
  async processRefund(bookingId, amount, reason) {
    const response = await hotelApi.post(`/payments/refund/${bookingId}`, { amount, reason });
    return response.data;
  }

  /** Get payment details */
  async getPaymentDetails(paymentId) {
    const response = await hotelApi.get(`/payments/${paymentId}`);
    return response.data;
  }

  /** The web injects checkout.js; here RazorpayHost's WebView loads it when checkout opens. */
  loadRazorpayScript() {
    return Promise.resolve(true);
  }

  /** Open Razorpay checkout (WebView host mounted in the root layout). */
  async openCheckout(options) {
    const loaded = await this.loadRazorpayScript();

    if (!loaded) {
      throw new Error('Razorpay SDK failed to load');
    }

    return new Promise((resolve, reject) => {
      initRazorpayPayment({
        ...options,
        themeColor: options?.theme?.color,
        handler: (response) => resolve(response),
        onError: (error) => reject(new Error(error?.description || 'Payment failed. Please try again.')),
        onClose: () => reject(new Error('Payment cancelled by user')),
      }).catch(reject);
    });
  }
}

export default new PaymentService();
