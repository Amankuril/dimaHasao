/**
 * Seed the district's settings from whatever the modules already hold.
 *
 * Brand name, logo and contact lived in three places — food's
 * `businessSettings`, taxi's `AdminBusinessSetting` and hotel's
 * `PlatformSettings`. Rather than asking an admin to retype it, this reads the
 * richest of them and writes it once into `platform_settings`.
 *
 * Only fills fields that are still empty, so re-running never overwrites
 * something an admin has since edited. Nothing is deleted: the module
 * collections stay exactly as they are, and the screens reading them keep
 * working.
 *
 * Dry run by default. Pass --apply to write.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

const run = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');

    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    // Collection names, not model names — mongoose pluralises the model, and
    // these two are `foodbusinesssettings` and `taxiadminbusinesssettings`.
    const food = await db.collection('foodbusinesssettings').findOne({}).catch(() => null);
    const taxi = await db.collection('taxiadminbusinesssettings').findOne({}).catch(() => null);

    const phone = food?.phone
        ? [food.phone.countryCode, food.phone.number].filter(Boolean).join(' ').trim()
        : '';

    const candidate = {
        brandName: asText(food?.companyName) || asText(taxi?.company_name) || 'Dima Hasao Tourism',
        supportEmail: asText(food?.email) || asText(taxi?.company_email),
        supportPhone: phone || asText(taxi?.company_phone),
        address: asText(food?.address) || asText(taxi?.company_address),
        state: asText(food?.state) || 'Assam',
        pincode: asText(food?.pincode),
        logoUrl: asText(food?.logo?.url),
    };

    const collection = db.collection('platform_settings');
    const current = (await collection.findOne({ key: 'platform' })) || {};

    /*
     * Some of what the modules hold is left over from the product this was
     * built on top of — a support address at helloparth, a phone that is a
     * country code and nothing else. Seeding those would put the wrong contact
     * details on every sign-in screen, which is worse than leaving the field
     * blank for an admin to fill in.
     */
    const isStale = (key, value) => {
        if (key === 'supportEmail') return /helloparth/i.test(value);
        if (key === 'supportPhone') return value.replace(/\D/g, '').length < 7;
        return false;
    };

    const patch = {};
    const skipped = [];
    for (const [key, value] of Object.entries(candidate)) {
        if (!value) continue;
        if (asText(current[key])) continue; // an admin already set this
        if (isStale(key, value)) { skipped.push([key, value]); continue; }
        patch[key] = value;
    }

    for (const [key, value] of skipped) {
        console.log(`  SKIP   ${key.padEnd(14)} = ${value}  (looks left over — set it in Global Settings)`);
    }

    console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (pass --apply to write) ===');
    console.log('  sources: food businessSettings', food ? 'found' : 'absent',
                '| taxi AdminBusinessSetting', taxi ? 'found' : 'absent');

    if (!Object.keys(patch).length) {
        console.log('  nothing to fill — every field is already set');
    } else {
        for (const [k, v] of Object.entries(patch)) {
            console.log(`  set    ${k.padEnd(14)} = ${String(v).slice(0, 60)}`);
        }
        if (APPLY) {
            const now = new Date();
            await collection.updateOne(
                { key: 'platform' },
                { $set: { ...patch, key: 'platform', updatedAt: now }, $setOnInsert: { createdAt: now } },
                { upsert: true },
            );
        }
    }

    console.log('Module settings collections are untouched.');
    await mongoose.disconnect();
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
