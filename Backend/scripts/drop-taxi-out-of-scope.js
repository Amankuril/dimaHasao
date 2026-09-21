/**
 * One-off cleanup after the taxi module was reconciled with the scope of work.
 *
 * Careers, employee attribution, the language and referral-translation CMS, bus
 * ticketing, car pooling, the fleet-owner module, parcel delivery, ride
 * bidding, subscriptions and the rental service-store marketplace were all
 * removed from the code. Their collections survive in any database that
 * predates the change, and nothing reads them any more.
 *
 * Follows the hotel precedent (drop-hotel-out-of-scope.js): idempotent, and
 * deliberately cautious. It drops a collection only when that collection is
 * empty, and reports anything holding rows so a person can decide — every one
 * of these was empty when the code was removed, so a non-empty one means
 * something happened since and is worth a look before anyone deletes it.
 *
 *   node scripts/drop-taxi-out-of-scope.js            # report only
 *   node scripts/drop-taxi-out-of-scope.js --apply    # drop the empty ones
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const COLLECTIONS = {
  'careers / jobs board': ['taxicareerjobs', 'taxicareerapplications'],
  'employee attribution': ['taxiemployees'],
  'language + referral translation CMS': ['taxiapplanguages', 'taxireferraltranslations'],
  'bus ticketing': ['taxibusservices', 'taxibusbookings', 'taxibusseatholds', 'taxibusdrivers'],
  'car pooling': [
    'taxipoolingroutes',
    'taxipoolingvehicles',
    'taxipoolingbookings',
    'taxipoolingseatreservations',
    'taxipoolingdriveronboardingsessions',
  ],
  'fleet owners': ['taxiowners', 'taxiownerwallettransactions', 'taxifleetvehicles'],
  'parcel delivery': ['taxideliveries', 'taxigoodstypes'],
  'ride bidding': ['taxiridebids'],
  subscriptions: ['taxisubscriptionplans', 'taxiusersubscriptions'],
  'rental marketplace': [
    'taxiservicestores',
    'taxiservicecenterstaffs',
    'taxicustomerbiometricprofiles',
    'taxirentalvehicletypes',
    'taxirentalbookingrequests',
    'taxirentalquoterequests',
  ],
};

const apply = process.argv.includes('--apply');
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!uri) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;
const present = new Set((await db.listCollections().toArray()).map((c) => c.name));

let dropped = 0;
let kept = 0;
let absent = 0;

for (const [feature, names] of Object.entries(COLLECTIONS)) {
  const lines = [];

  for (const name of names) {
    if (!present.has(name)) {
      absent += 1;
      continue;
    }

    const count = await db.collection(name).countDocuments();

    if (count > 0) {
      kept += 1;
      lines.push(`  ! ${name} — ${count} document(s), left alone`);
      continue;
    }

    if (apply) {
      await db.collection(name).drop();
      dropped += 1;
      lines.push(`  ✓ ${name} — dropped (was empty)`);
    } else {
      dropped += 1;
      lines.push(`  · ${name} — empty, would drop`);
    }
  }

  if (lines.length) {
    console.log(`\n${feature}`);
    lines.forEach((line) => console.log(line));
  }
}

console.log(
  `\n${apply ? 'Dropped' : 'Would drop'} ${dropped}; kept ${kept} holding rows; ${absent} already gone.`,
);

if (!apply) {
  console.log('Re-run with --apply to drop the empty collections.');
}

await mongoose.disconnect();
