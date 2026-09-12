/**
 * Food payment helpers.
 *
 * The client and signature verification now live in
 * core/payments/razorpay.service.js — this file keeps the food-specific
 * operations (orders, payment links, QR codes, refunds) and re-exports the
 * shared primitives so its existing callers need no changes.
 */
import crypto from 'crypto';
import { config } from '../../../../config/env.js';
import {
    isRazorpayConfigured,
    getRazorpayKeyId,
    getRazorpayClient,
    verifyPaymentSignature as verifySignature,
} from '../../../../core/payments/razorpay.service.js';

export { isRazorpayConfigured, getRazorpayKeyId };

/** @deprecated Prefer getRazorpayClient() from core/payments/razorpay.service.js */
export const getRazorpayInstance = getRazorpayClient;

/**
 * Verify a checkout signature. Positional args are kept for the existing
 * callers; the shared implementation is constant-time.
 */
export function verifyPaymentSignature(orderId, paymentId, signature) {
    return verifySignature({ orderId, paymentId, signature });
}

export function createRazorpayOrder(amountPaise, currency = 'INR', receipt = '') {
    const instance = getRazorpayInstance();
    if (!instance) return Promise.reject(new Error('Razorpay not configured'));
    return instance.orders.create({
        amount: Math.round(amountPaise),
        currency,
        receipt: receipt || undefined
    });
}

export function createPaymentLink({
    amountPaise,
    currency = 'INR',
    description,
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    notes = {},
}) {
    const instance = getRazorpayInstance();
    if (!instance) return Promise.reject(new Error('Razorpay not configured'));
    const foodOrderId = orderId ? String(orderId) : '';
    return instance.paymentLink.create({
        amount: Math.round(amountPaise),
        currency,
        description: description || `Order ${foodOrderId}`,
        reference_id: foodOrderId ? foodOrderId.slice(0, 40) : undefined,
        notes: {
            foodOrderId,
            ...(notes || {}),
        },
        customer: {
            name: customerName || 'Customer',
            email: customerEmail || 'customer@example.com',
            contact: customerPhone ? String(customerPhone).replace(/\D/g, '').slice(-10) : '9999999999'
        }
    });
}

/**
 * Assert Razorpay payment matches expected order id + amount (paise).
 * Status must be captured or authorized.
 */
export function assertRazorpayPaymentMatches(payment, { orderId, amountPaise }) {
    if (!payment?.id) throw new Error('Payment not found on Razorpay');
    const status = String(payment.status || '').toLowerCase();
    if (!['captured', 'authorized'].includes(status)) {
        throw new Error(`Payment not successful (status=${status || 'unknown'})`);
    }
    if (orderId && payment.order_id && String(payment.order_id) !== String(orderId)) {
        throw new Error('Payment does not match Razorpay order');
    }
    if (Number.isFinite(amountPaise) && amountPaise > 0) {
        const paid = Number(payment.amount);
        if (!Number.isFinite(paid) || Math.abs(paid - Math.round(amountPaise)) > 1) {
            throw new Error('Payment amount mismatch');
        }
    }
    return true;
}

/**
 * Fetch Razorpay payment (server-side) for additional validation (amount/status/order match).
 * @param {string} paymentId
 */
export async function fetchRazorpayPayment(paymentId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!paymentId) throw new Error('paymentId is required');
    return instance.payments.fetch(String(paymentId));
}

/**
 * Fetch Razorpay payment-link to check status (used for Razorpay QR auto verification).
 * @param {string} paymentLinkId
 */
export async function fetchRazorpayPaymentLink(paymentLinkId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!paymentLinkId) throw new Error('paymentLinkId is required');
    return instance.paymentLink.fetch(String(paymentLinkId));
}

/**
 * Create a Dynamic Single-Use UPI QR Code via Razorpay QR Code API
 * Scanned with PhonePe / GPay / Paytm -> Opens UPI App directly with exact amount pre-filled!
 */
export async function createRazorpayQrCode({
    amountPaise,
    name,
    description,
    notes = {},
}) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    const foodOrderId = notes.foodOrderId ? String(notes.foodOrderId) : '';

    return instance.qrCode.create({
        type: 'upi_qr',
        name: name || `Order #${foodOrderId.slice(-6)}`,
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: Math.round(amountPaise),
        description: description || `Payment for order ${foodOrderId}`,
        notes: {
            foodOrderId,
            ...(notes || {}),
        },
    });
}

export async function fetchRazorpayQrCode(qrCodeId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!qrCodeId) throw new Error('qrCodeId is required');
    return instance.qrCode.fetch(String(qrCodeId));
}

export async function fetchRazorpayQrCodePayments(qrCodeId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!qrCodeId) throw new Error('qrCodeId is required');
    return instance.qrCode.fetchAllPayments(String(qrCodeId));
}

/**
 * ✅ NEW: Initiate a refund for a successful payment.
 * NON-BREAKING Extension for automated cancellation refunds.
 * @param {string} paymentId - Original Razorpay payment_id (captured)
 * @param {number} amount - Amount to refund (in major unit, e.g., INR 123.45)
 */
export async function initiateRazorpayRefund(paymentId, amount) {
    if (!isRazorpayConfigured()) {
        throw new Error('Razorpay is not configured on this server');
    }
    const instance = getRazorpayInstance();
    try {
        const refund = await instance.payments.refund(paymentId, {
            amount: Math.round(Number(amount) * 100), // convert to paise
            notes: {
                reason: 'Order cancelled by system flow',
                at: new Date().toISOString()
            }
        });
        return {
            success: true,
            refundId: refund.id,
            status: refund.status || 'processed',
            raw: refund
        };
    } catch (err) {
        // Log locally but pass the error to the service to handle status update
        console.error(`Razorpay Refund API Failure [PaymentId: ${paymentId}]:`, err?.message || err);
        return {
            success: false,
            error: err?.message || 'Razorpay refund API error',
            status: 'failed'
        };
    }
}
