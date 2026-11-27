import express from 'express';

/*
 * Razorpay redirect-mode return, for the consumer app's in-app checkout.
 *
 * The app renders checkout.js in a WebView, which cannot open the popup
 * windows that netbanking, card 3-D Secure and wallets use. In redirect mode
 * Razorpay loads the bank page in the same window and, when the payment ends,
 * POSTs the result here as a form. A WebView cannot read a POST body, so this
 * answers with a GET redirect that carries the same fields in the query
 * string; the app intercepts that URL and hands the fields to the flow's own
 * verify endpoint, which checks the signature. Nothing is trusted here: this
 * route only relays what Razorpay sent.
 *
 *   POST /api/v1/payments/checkout/return  (Razorpay callback_url)
 *   GET  /api/v1/payments/checkout/done?status=...  (intercepted by the app)
 */
const router = express.Router();

const pick = (value) => (typeof value === 'string' ? value.slice(0, 200) : '');

router.post('/return', (req, res) => {
  const body = req.body || {};
  const params = new URLSearchParams();
  if (body.razorpay_payment_id && body.razorpay_signature) {
    params.set('status', 'success');
    params.set('razorpay_payment_id', pick(body.razorpay_payment_id));
    params.set('razorpay_order_id', pick(body.razorpay_order_id));
    params.set('razorpay_signature', pick(body.razorpay_signature));
  } else {
    // Failures arrive as error[code], error[description], ... (extended parser
    // turns them into an object).
    const error = body.error || {};
    params.set('status', 'failed');
    params.set('code', pick(error.code || body['error[code]']));
    params.set('description', pick(error.description || body['error[description]']) || 'Payment failed');
    params.set('reason', pick(error.reason || body['error[reason]']));
  }
  res.redirect(303, `${req.baseUrl}/done?${params.toString()}`);
});

// Only reached if the app did not intercept the redirect (e.g. an old build).
router.get('/done', (req, res) => {
  const ok = req.query.status === 'success';
  res
    .status(200)
    .type('html')
    .send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;text-align:center;padding:48px 24px"><h2>${ok ? 'Payment received' : 'Payment not completed'}</h2><p>You can return to the app.</p></body>`);
});

export default router;
