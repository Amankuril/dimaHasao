import mongoose from 'mongoose';

/*
 * One row per provider payment that has been turned into money on our side
 * (a wallet credit, a ride paid). The _id (the claim key) is the dedupe: inserting it
 * is the atomic "this payment is now spent" step.
 *
 * Wallet top-ups used to dedupe by looking for the payment id in the wallet's
 * own transaction list — a read-then-write two concurrent verify calls could
 * both pass, over a list capped at the last 50 entries, so an older payment
 * could simply be replayed. It also never stopped one payment being claimed
 * by two different accounts.
 */
const paymentClaimSchema = new mongoose.Schema(
  {
    // The claim key is the _id itself, so uniqueness never depends on a
    // secondary index having been built.
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      default: '',
      trim: true,
    },
    ownerRole: {
      type: String,
      default: '',
      trim: true,
    },
    ownerId: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true, collection: 'taxi_payment_claims' },
);

export const PaymentClaim = mongoose.models.TaxiPaymentClaim || mongoose.model('TaxiPaymentClaim', paymentClaimSchema);
