/**
 * Pull privacy, terms and friends into one collection.
 *
 * They were written three times over: food kept them in its `pageContent`
 * singleton, hotel had its own `InfoPage` collection, and taxi shipped two
 * .txt files compiled into the frontend bundle. Tours, festivals and the
 * customer app had none at all.
 *
 * This copies what exists into `legal_documents`, keyed by module + audience +
 * slug. Nothing is deleted: the old collections stay exactly as they are, so
 * the screens still reading them keep working until each is repointed.
 *
 * Existing documents in the new collection are left alone, so re-running after
 * an admin has edited something will not overwrite their work.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   node scripts/migrations/centralize-legal-documents.js
 *   node scripts/migrations/centralize-legal-documents.js --apply
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APPLY = process.argv.includes('--apply');
const HERE = dirname(fileURLToPath(import.meta.url));
const TAXI_CONTENT = join(HERE, '../../../Frontend/src/modules/Taxi/modules/shared/content');

const TITLES = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    refund: 'Refund Policy',
    about: 'About Us',
    contact: 'Contact Us',
};

/** food's `key` -> where it belongs in the new shape. */
const FOOD_KEYS = {
    privacy: { module: 'food', audience: 'customer', slug: 'privacy' },
    privacy_user: { module: 'food', audience: 'customer', slug: 'privacy' },
    privacy_restaurant: { module: 'food', audience: 'partner', slug: 'privacy' },
    privacy_delivery: { module: 'food', audience: 'partner', slug: 'privacy' },
    terms: { module: 'food', audience: 'customer', slug: 'terms' },
    terms_user: { module: 'food', audience: 'customer', slug: 'terms' },
    terms_restaurant: { module: 'food', audience: 'partner', slug: 'terms' },
    terms_delivery: { module: 'food', audience: 'partner', slug: 'terms' },
    refund: { module: 'food', audience: 'customer', slug: 'refund' },
    about: { module: 'platform', audience: 'customer', slug: 'about' },
};

const run = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');

    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const target = db.collection('legal_documents');
    const existing = new Set(
        (await target.find({}, { projection: { module: 1, audience: 1, slug: 1 } }).toArray())
            .map((d) => `${d.module}|${d.audience}|${d.slug}`),
    );

    console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (pass --apply to write) ===');
    const planned = [];

    const plan = (module, audience, slug, title, content, source) => {
        const key = `${module}|${audience}|${slug}`;
        if (existing.has(key)) {
            console.log(`  skip   ${key} — already present`);
            return;
        }
        if (!String(content || '').trim()) {
            console.log(`  skip   ${key} — ${source} is empty`);
            return;
        }
        existing.add(key);
        planned.push({ module, audience, slug, title, content, source });
        console.log(`  take   ${key.padEnd(30)} <- ${source} (${content.length} chars)`);
    };

    // --- food ---------------------------------------------------------------
    const foodDocs = await db.collection('food_page_contents').find({}).toArray().catch(() => []);
    for (const doc of foodDocs) {
        const where = FOOD_KEYS[doc.key];
        if (!where) continue;
        const content = doc.legal?.content || doc.about?.content || '';
        plan(where.module, where.audience, where.slug,
             doc.legal?.title || TITLES[where.slug], content, `food_page_contents.${doc.key}`);
    }

    // --- hotel --------------------------------------------------------------
    const hotelDocs = await db.collection('infopages').find({}).toArray().catch(() => []);
    for (const doc of hotelDocs) {
        if (!TITLES[doc.slug]) continue;
        plan('hotel', doc.audience === 'partner' ? 'partner' : 'customer', doc.slug,
             doc.title || TITLES[doc.slug], doc.content, `infopages.${doc.audience}/${doc.slug}`);
    }

    // --- taxi: text files compiled into the bundle --------------------------
    for (const [file, slug] of [['privacy-content.txt', 'privacy'], ['terms-content.txt', 'terms']]) {
        const path = join(TAXI_CONTENT, file);
        if (!existsSync(path)) {
            console.log(`  skip   taxi ${slug} — ${file} not found`);
            continue;
        }
        plan('taxi', 'customer', slug, TITLES[slug], readFileSync(path, 'utf8'), `Taxi/${file}`);
    }

    if (APPLY && planned.length) {
        const now = new Date();
        await target.insertMany(
            planned.map(({ source, ...doc }) => ({ ...doc, isActive: true, createdAt: now, updatedAt: now })),
        );
    }

    console.log(
        APPLY
            ? `inserted ${planned.length} document(s)`
            : `${planned.length} document(s) would be inserted`,
    );
    console.log('Nothing was deleted; the original sources are untouched.');
    await mongoose.disconnect();
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
