/**
 * Tours: multi-vendor -> single-vendor.
 *
 * The module used to have operators who owned packages, held wallets and drew
 * payouts. The district runs its own tours now, so those records describe a
 * party that no longer exists.
 *
 * What this does:
 *   - unsets `operatorId` on tour packages and reviews, and `operatorIds` on
 *     offers, since those fields are no longer on the schemas
 *   - unsets `defaultCommission` on the settings singleton
 *   - drops the operator, wallet, transaction and withdrawal collections
 *
 * What it deliberately does NOT touch: `tourbookings`. Those are customer
 * records. Their `operatorId` is kept as a historical trace of who the trip was
 * sold by — the schema still carries the field, unindexed by `required`, and
 * nothing writes it any more.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   node scripts/migrations/tours-single-vendor.js
 *   node scripts/migrations/tours-single-vendor.js --apply
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');

const UNSET = [
  { collection: 'tourpackages', field: 'operatorId' },
  { collection: 'tourreviews', field: 'operatorId' },
  { collection: 'touroffers', field: 'operatorIds' },
  { collection: 'tourssettings', field: 'defaultCommission' },
];

const DROP = ['touroperators', 'tourswallets', 'tourstransactions', 'tourswithdrawals'];

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

  console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (pass --apply to write) ===');

  for (const { collection, field } of UNSET) {
    if (!existing.has(collection)) {
      console.log(`  skip   ${collection}.${field} — no such collection`);
      continue;
    }
    const filter = { [field]: { $exists: true } };
    const count = await db.collection(collection).countDocuments(filter);
    if (!APPLY) {
      console.log(`  unset  ${collection}.${field} on ${count} document(s)`);
      continue;
    }
    const result = await db.collection(collection).updateMany(filter, { $unset: { [field]: '' } });
    console.log(`  unset  ${collection}.${field} — ${result.modifiedCount} modified`);
  }

  for (const collection of DROP) {
    if (!existing.has(collection)) {
      console.log(`  skip   ${collection} — already gone`);
      continue;
    }
    const count = await db.collection(collection).countDocuments();
    if (!APPLY) {
      console.log(`  drop   ${collection} (${count} document(s))`);
      continue;
    }
    await db.collection(collection).drop();
    console.log(`  drop   ${collection} — dropped (${count} document(s))`);
  }

  // Bookings are left alone on purpose; report what they still carry.
  if (existing.has('tourbookings')) {
    const withOperator = await db.collection('tourbookings').countDocuments({ operatorId: { $exists: true } });
    const total = await db.collection('tourbookings').countDocuments();
    console.log(`  keep   tourbookings — ${total} booking(s), ${withOperator} carrying a historical operatorId`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
