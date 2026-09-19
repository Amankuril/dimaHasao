/**
 * Strip the server origin out of stored upload URLs.
 *
 * Uploads were saved with the API's own origin baked in, so a file uploaded
 * from a laptop was persisted as `http://localhost:5000/uploads/x.webp`. On
 * the live site those point at the visitor's own machine; locally they point
 * at a file on the server's disk. The origin was never the database's
 * business — the backend now stores `/uploads/x.webp` and the client resolves
 * it against whatever API it is talking to.
 *
 * This rewrites the rows written before that change. Any absolute URL whose
 * path contains /uploads/ becomes the path alone; every other value is left
 * exactly as it is, including external image URLs.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   node scripts/migrations/relative-upload-urls.js
 *   node scripts/migrations/relative-upload-urls.js --apply
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');

/** http(s)://host[:port]/uploads/<file> -> /uploads/<file> */
const UPLOAD_URL = /https?:\/\/[^/"'\s]+(\/uploads\/[^"'\s?]+)/gi;

const rewrite = (value) => {
    if (typeof value === 'string') {
        UPLOAD_URL.lastIndex = 0;
        return UPLOAD_URL.test(value) ? value.replace(UPLOAD_URL, '$1') : value;
    }
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === 'object' && value.constructor === Object) {
        const out = {};
        for (const [k, v] of Object.entries(value)) out[k] = rewrite(v);
        return out;
    }
    return value;
};

const run = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');

    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const names = (await db.listCollections().toArray()).map((c) => c.name).sort();

    console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (pass --apply to write) ===');
    let touched = 0;

    for (const name of names) {
        const collection = db.collection(name);
        // Only documents that actually mention an absolute uploads URL.
        const docs = await collection.find({}).toArray().catch(() => []);
        const changes = [];

        for (const doc of docs) {
            const before = JSON.stringify(doc);
            if (!/https?:\/\/[^"]*\/uploads\//i.test(before)) continue;

            const { _id, ...rest } = doc;
            const rewritten = rewrite(rest);
            if (JSON.stringify(rewritten) === JSON.stringify(rest)) continue;
            changes.push({ _id, rewritten });
        }

        if (!changes.length) continue;
        console.log(`  ${name}: ${changes.length} document(s)`);
        touched += changes.length;

        if (!APPLY) continue;
        for (const { _id, rewritten } of changes) {
            await collection.updateOne({ _id }, { $set: rewritten });
        }
    }

    console.log(APPLY ? `rewrote ${touched} document(s)` : `${touched} document(s) would be rewritten`);
    await mongoose.disconnect();
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
