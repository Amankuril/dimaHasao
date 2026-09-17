/**
 * Seed the festival catalogue from the v1 fixtures.
 *
 * Idempotent on slug, and it never touches `soldTickets` on a re-run — that is
 * inventory owned by real bookings, not by this file.
 *
 *   node scripts/seed-festivals.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Festival from '../src/modules/festivals/models/Festival.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const slugify = (value) =>
  String(value || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI is not set');
  await mongoose.connect(uri);

  const fixtures = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'seed-festivals.json'), 'utf8'),
  );

  let created = 0;
  let updated = 0;

  for (const fixture of fixtures) {
    const slug = slugify(fixture.name);
    const existing = await Festival.findOne({ slug });

    if (existing) {
      // Preserve each category's sold counter by matching on name.
      const categories = fixture.ticketCategories.map((c) => {
        const previous = existing.ticketCategories.find((p) => p.name === c.name);
        return { ...c, soldTickets: previous ? previous.soldTickets : 0 };
      });
      Object.assign(existing, fixture, { slug, ticketCategories: categories });
      await existing.save();
      updated += 1;
      console.log(`  updated  ${fixture.name}`);
    } else {
      await Festival.create({ ...fixture, slug, isActive: true });
      created += 1;
      console.log(`  created  ${fixture.name}`);
    }
  }

  console.log(`\n${created} created, ${updated} updated. ${await Festival.countDocuments()} festivals in total.`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
