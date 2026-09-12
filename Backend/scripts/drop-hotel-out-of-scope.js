/**
 * One-off cleanup after the hotel module was reconciled with the scope of work.
 *
 * Reels and the real-estate property types (PG, hostel, villa, tent, rent, buy,
 * plot) were removed from the code. Their collections and documents survive in
 * any database that predates the change, and Mongoose aggregations read raw
 * BSON, so leftovers would keep surfacing.
 *
 * Idempotent, and deliberately cautious: it drops a collection only when that
 * collection is empty, and it never deletes a property or booking — it reports
 * out-of-scope rows so a human can decide what to do with real listings.
 *
 *   node scripts/drop-hotel-out-of-scope.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const REEL_COLLECTIONS = [
    'reels',
    'reellikes',
    'reelcomments',
    'reelsaves',
    'reelinteractions',
    'reeldurationpayments',
];
const OTHER_COLLECTIONS = ['hostelfeepayments'];
const SUPPORTED_TYPES = ['hotel', 'resort', 'homestay', 'lodge'];

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
const present = new Set((await db.listCollections().toArray()).map((c) => c.name));

for (const name of [...REEL_COLLECTIONS, ...OTHER_COLLECTIONS]) {
    if (!present.has(name)) continue;
    const count = await db.collection(name).countDocuments();
    if (count > 0) {
        console.warn(`${name}: ${count} document(s) present — left in place. Review and empty it before re-running.`);
        continue;
    }
    await db.collection(name).drop();
    console.log(`${name}: dropped (was empty)`);
}

// Settings and profile documents keep fields the schema no longer declares.
const settings = await db
    .collection('platformsettings')
    .updateMany({}, {
        $unset: {
            reelCouponTarget: '',
            reelCouponDiscount: '',
            reelFreeDurationSec: '',
            reelMaxDurationSec: '',
            reelPaidDurationEnabled: '',
            reelDurationTiers: '',
            reelPricing: '',
        },
    });
console.log(`platformsettings: cleared reel config on ${settings.modifiedCount} document(s)`);

const users = await db
    .collection('users')
    .updateMany({ reelPreferences: { $exists: true } }, { $unset: { reelPreferences: '' } });
console.log(`users: cleared reelPreferences on ${users.modifiedCount} document(s)`);

const props = await db
    .collection('properties')
    .updateMany({}, {
        $unset: {
            pgType: '',
            hostelType: '',
            pgDetails: '',
            rentDetails: '',
            buyDetails: '',
            plotDetails: '',
            structureDetails: '',
            isUrgent: '',
            isNegotiable: '',
            availabilityStatus: '',
        },
    });
console.log(`properties: cleared real-estate fields on ${props.modifiedCount} document(s)`);

const bookings = await db
    .collection('bookings')
    .updateMany({ $or: [{ isInquiry: { $exists: true } }, { inquiryMetadata: { $exists: true } }] },
        { $unset: { isInquiry: '', inquiryMetadata: '' } });
console.log(`bookings: cleared inquiry fields on ${bookings.modifiedCount} document(s)`);

// Reported, never deleted — an out-of-scope listing may still be a real business.
const strayProps = await db
    .collection('properties')
    .countDocuments({ propertyType: { $nin: SUPPORTED_TYPES } });
const strayBookings = await db
    .collection('bookings')
    .countDocuments({ propertyType: { $nin: SUPPORTED_TYPES } });
if (strayProps || strayBookings) {
    console.warn(
        `\nOut of scope and NOT deleted: ${strayProps} propert(ies) and ${strayBookings} booking(s) ` +
        `carry a propertyType outside ${SUPPORTED_TYPES.join(', ')}. They will fail schema validation on ` +
        'the next save. Decide whether to migrate or remove them.',
    );
} else {
    console.log('\nNo out-of-scope properties or bookings.');
}

await mongoose.disconnect();
