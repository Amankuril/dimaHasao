/**
 * Remove what the QA suite leaves behind.
 *
 * The suites release seats and cancel bookings through the API as they go, but
 * a few records have no API path back — a tours booking (the module has no
 * consumer cancellation) and the support tickets the injection cases raise.
 * This clears them by their QA markers and nothing else.
 *
 *   node scripts/qa/cleanup.js
 */
import mongoose from 'mongoose';
import { config } from '../../src/config/env.js';

const MARKERS = {
  tourbookings: { 'travellerContact.name': /^QA /i },
  festivalbookings: { 'attendee.name': /^QA /i },
  support_tickets: { issueType: /^QA /i },
  bookings: { 'guestContact.name': /^QA /i },
};

await mongoose.connect(config.mongodbUri);
const db = mongoose.connection.db;

for (const [collection, filter] of Object.entries(MARKERS)) {
  const found = await db.collection(collection).countDocuments(filter);
  if (!found) { console.log(`  ${collection.padEnd(20)} nothing to remove`); continue; }
  const { deletedCount } = await db.collection(collection).deleteMany(filter);
  console.log(`  ${collection.padEnd(20)} removed ${deletedCount}`);
}

await mongoose.disconnect();
