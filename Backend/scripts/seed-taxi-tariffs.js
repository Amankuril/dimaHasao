/**
 * Set up taxi fare tariffs.
 *
 * Nothing priced a ride on the server until now — the fare came from the app
 * and was stored as sent. `SetPrice` is where a tariff lives, and while none
 * exists the server accepts the submitted fare and logs that it could not check
 * it. Create one here and it starts checking.
 *
 * Edit RATES to your own numbers before running. These are placeholders, not a
 * recommendation — fares are a commercial decision.
 *
 *   node scripts/seed-taxi-tariffs.js            create or update
 *   node scripts/seed-taxi-tariffs.js --dry-run  show what it would write
 */
import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { SetPrice } from '../src/modules/taxi/admin/models/SetPrice.js';

/**
 * One entry per vehicle type you sell.
 *
 * base_price covers base_distance kilometres (and the time inside it — a trip
 * that never leaves the base distance costs exactly base_price, which is what
 * the rider app shows). Beyond that, price_per_distance per km plus time_price
 * per minute, then service_tax percent on the total.
 */
const RATES = [
  {
    vehicleName: 'bike lite',
    base_price: 30, base_distance: 2, price_per_distance: 9, time_price: 1, service_tax: 5,
    outstation_base_price: 350, outstation_base_distance: 10,
    outstation_price_per_distance: 8, outstation_time_price: 1,
  },
  // Add the rest of your fleet here.
];

const dryRun = process.argv.includes('--dry-run');

await mongoose.connect(config.mongodbUri);
const db = mongoose.connection.db;

const serviceLocation = await db.collection('taxiservicelocations').findOne({});
if (!serviceLocation) {
  console.error('No service location found — create one in the admin panel first.');
  process.exit(1);
}

for (const rate of RATES) {
  const vehicle = await db.collection('taxivehicles')
    .findOne({ name: new RegExp(`^${rate.vehicleName}$`, 'i') });

  if (!vehicle) {
    console.log(`  skipped "${rate.vehicleName}" — no vehicle type by that name`);
    continue;
  }

  const { vehicleName, ...fares } = rate;
  const filter = {
    vehicle_type: vehicle._id,
    service_location_id: serviceLocation._id,
    transport_type: 'taxi',
  };

  if (dryRun) {
    console.log(`  would write ${vehicleName}:`, JSON.stringify(fares));
    continue;
  }

  await SetPrice.findOneAndUpdate(
    filter,
    { ...filter, ...fares, active: 1, status: 'active', payment_type: ['cash', 'online'] },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`  ${vehicleName}: ₹${fares.base_price} base + ₹${fares.price_per_distance}/km`);
}

const total = await SetPrice.countDocuments({ active: 1 });
console.log(`\n${total} active tariff(s). Rides against a priced vehicle are now checked against it.`);
console.log('Set TAXI_ENFORCE_FARE=true to refuse rides on vehicles that still have none.');

await mongoose.disconnect();
