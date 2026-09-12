/**
 * One-off cleanup after the hotel subscription feature was removed.
 *
 * The schema no longer declares `Partner.subscription` and `SubscriptionPlan`
 * is gone, but existing documents still carry the orphaned sub-document and the
 * `subscriptionplans` collection still exists. Mongoose aggregations read raw
 * BSON, so those leftovers would keep surfacing in API responses.
 *
 * Idempotent: safe to run more than once. It refuses to drop the plans
 * collection if it still holds documents, so an accidental run on a database
 * that never finished the migration cannot destroy plan data.
 *
 *   node scripts/drop-hotel-subscriptions.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;

const partners = await db
    .collection('partners')
    .updateMany({ subscription: { $exists: true } }, { $unset: { subscription: '' } });
console.log(`partners: cleared subscription on ${partners.modifiedCount} document(s)`);

const collections = (await db.listCollections().toArray()).map((c) => c.name);
if (collections.includes('subscriptionplans')) {
    const remaining = await db.collection('subscriptionplans').countDocuments();
    if (remaining > 0) {
        console.warn(
            `subscriptionplans: ${remaining} document(s) present — leaving the collection in place. ` +
            'Review and empty it before re-running.',
        );
    } else {
        await db.collection('subscriptionplans').drop();
        console.log('subscriptionplans: dropped (was empty)');
    }
} else {
    console.log('subscriptionplans: already gone');
}

await mongoose.disconnect();
