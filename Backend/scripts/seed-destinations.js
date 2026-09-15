/**
 * Seed the tourist destination directory from the v1 fixtures.
 *
 * Idempotent: matches on slug, so re-running updates rather than duplicating,
 * and it never touches a destination an admin has since edited beyond the
 * fields the fixture owns.
 *
 *   node scripts/seed-destinations.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import TourismDestination from '../src/modules/tours/models/Destination.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const slugify = (value) =>
  String(value || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  await mongoose.connect(uri);

  const fixtures = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'seed-destinations.json'), 'utf8'),
  );

  let created = 0;
  let updated = 0;

  for (const fixture of fixtures) {
    const slug = slugify(fixture.name);
    const existing = await TourismDestination.findOne({ slug });

    if (existing) {
      Object.assign(existing, fixture, { slug });
      await existing.save();
      updated += 1;
      console.log(`  updated  ${fixture.name}`);
    } else {
      await TourismDestination.create({ ...fixture, slug, isActive: true });
      created += 1;
      console.log(`  created  ${fixture.name}`);
    }
  }

  const total = await TourismDestination.countDocuments();
  console.log(`\n${created} created, ${updated} updated. ${total} destinations in total.`);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
