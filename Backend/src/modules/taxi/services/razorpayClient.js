/**
 * Taxi's Razorpay access, on the same client every other module uses.
 *
 * Taxi had three hand-rolled copies of the same thing — `razorpayRequest` in
 * the driver controller, `fetchRazorpay` beside it, and another
 * `razorpayRequest` in the ride controller — each doing a basic-auth `fetch`
 * against api.razorpay.com and each parsing errors slightly differently. Food,
 * hotel and tours all go through the SDK client in
 * core/payments/razorpay.service.js.
 *
 * This routes taxi through that same client while keeping the
 * `{ method, path, body }` shape its call sites already use, so the callers
 * did not have to change. Credentials still come from taxi's own admin gateway
 * settings when those are real, and fall back to the platform's otherwise.
 */
import { createRazorpayClient } from '../../../core/payments/razorpay.service.js';
import { ApiError } from '../../../utils/ApiError.js';

const trimSlashes = (value = '') => String(value || '').replace(/^\/+|\/+$/g, '');

/**
 * Map a REST path onto the SDK call that serves it.
 *
 * Only the paths taxi actually uses are handled. An unmapped path throws
 * rather than silently falling back to raw HTTP, so a new call site has to be
 * added here deliberately instead of reintroducing a second transport.
 */
const callSdk = async (client, method, path, body) => {
    const segments = trimSlashes(path).split('/').map((segment) => decodeURIComponent(segment));
    const verb = String(method || 'GET').toUpperCase();
    const [resource, id, sub, subId] = segments;

    if (resource === 'orders') {
        if (verb === 'POST') return client.orders.create(body);
        if (verb === 'GET' && id) return client.orders.fetch(id);
    }

    if (resource === 'payment_links') {
        if (verb === 'POST') return client.paymentLink.create(body);
        if (verb === 'GET' && id) return client.paymentLink.fetch(id);
    }

    if (resource === 'payments') {
        // /payments/qr_codes and /payments/qr_codes/:id/payments
        if (id === 'qr_codes') {
            if (verb === 'POST' && !sub) return client.qrCode.create(body);
            if (verb === 'GET' && sub && subId === 'payments') return client.qrCode.fetchAllPayments(sub);
            if (verb === 'GET' && sub) return client.qrCode.fetch(sub);
        }

        if (verb === 'GET' && id) return client.payments.fetch(id);
    }

    throw new ApiError(500, `No Razorpay client mapping for ${verb} /${trimSlashes(path)}`);
};

/**
 * Perform a Razorpay call through the shared SDK client.
 *
 * Errors are normalised to the shape taxi's callers already handle: an
 * ApiError carrying Razorpay's own description and code, so the existing
 * fallbacks (QR unavailable, UPI links unsupported in test mode) still
 * recognise what came back.
 */
export const taxiRazorpayRequest = async ({ method, path, body, keyId, keySecret }) => {
    const client = createRazorpayClient({ keyId, keySecret });

    if (!client) {
        throw new ApiError(
            500,
            'Razorpay is not configured. Set keys in Admin > Payment Gateways, or platform-wide in the server environment.',
        );
    }

    try {
        return await callSdk(client, method, path, body);
    } catch (error) {
        if (error instanceof ApiError) throw error;

        const status = Number(error?.statusCode || error?.status) || 502;
        const description =
            error?.error?.description ||
            error?.description ||
            error?.message ||
            'Razorpay request failed';

        throw new ApiError(status, description, {
            provider: 'razorpay',
            path,
            code: error?.error?.code || error?.code || null,
        });
    }
};

export default taxiRazorpayRequest;
