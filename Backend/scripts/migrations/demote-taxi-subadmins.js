/**
 * Demote taxi-panel sub-admins that the database records as platform superadmins.
 *
 * The taxi admin panel created accounts without an `adminLevel`, so the shared
 * admin schema's default — PLATFORM_SUPERADMIN — was stored on every one,
 * sub-admins included. Core reads that explicit level first
 * (resolveAdminLevel), so each taxi "sub-admin" was a full platform superadmin
 * everywhere except taxi's own panel: every module, admin management, finance.
 *
 * The code no longer writes that (taxi now sets the level explicitly). This
 * fixes the records already stored. It touches only accounts whose
 * admin_type/role says 'subadmin' but whose adminLevel is anything else, and
 * gives them what a taxi sub-admin is now created with: level 'subadmin',
 * module 'taxi', servicesAccess ['taxi'], and featurePermissions derived from
 * their legacy permission strings (so the core feature gate lets them keep
 * doing exactly what taxi already allowed).
 *
 * Accounts typed 'superadmin' that carry a single-module servicesAccess are
 * only LISTED for review — a real platform superadmin and a taxi-created one
 * look alike in storage, and guessing wrong would lock someone out.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   node scripts/migrations/demote-taxi-subadmins.js
 *   node scripts/migrations/demote-taxi-subadmins.js --apply
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { ADMIN_FEATURES, FEATURE_ACTIONS, featureKey } from '../../src/core/admin/adminFeatures.js';
import { ADMIN_LEVELS, ADMIN_MODULES } from '../../src/core/admin/adminHierarchy.constants.js';

const APPLY = process.argv.includes('--apply');

const deriveTaxiFeaturePermissions = (permissions = []) => {
    const granted = new Set((permissions || []).map(String));
    const result = {};
    for (const entry of ADMIN_FEATURES[ADMIN_MODULES.TAXI] || []) {
        if ((entry.legacy || []).some((name) => granted.has(name))) {
            result[featureKey(ADMIN_MODULES.TAXI, entry.key)] = Object.fromEntries(
                FEATURE_ACTIONS.map((action) => [action, true]),
            );
        }
    }
    return result;
};

const main = async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');
    await mongoose.connect(uri);
    const admins = mongoose.connection.db.collection('admins');

    const isSubadmin = { $or: [{ admin_type: /^subadmin$/i }, { role: /^subadmin$/i }] };
    const wrong = await admins
        .find({ ...isSubadmin, adminLevel: { $ne: ADMIN_LEVELS.SUBADMIN } })
        .project({ email: 1, admin_type: 1, role: 1, adminLevel: 1, servicesAccess: 1, permissions: 1, featurePermissions: 1 })
        .toArray();

    console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${wrong.length} sub-admin(s) stored above sub-admin level\n`);
    for (const admin of wrong) {
        const hasGrants = admin.featurePermissions && Object.keys(admin.featurePermissions).length > 0;
        const set = {
            adminLevel: ADMIN_LEVELS.SUBADMIN,
            module: ADMIN_MODULES.TAXI,
            servicesAccess: [ADMIN_MODULES.TAXI],
            ...(hasGrants ? {} : { featurePermissions: deriveTaxiFeaturePermissions(admin.permissions) }),
        };
        console.log(`  ${admin.email}  ${admin.adminLevel || '(default)'} → subadmin  grants: ${Object.keys(set.featurePermissions || admin.featurePermissions || {}).join(', ') || 'none'}`);
        if (APPLY) await admins.updateOne({ _id: admin._id }, { $set: set });
    }

    const review = await admins
        .find({
            admin_type: /^superadmin$/i,
            adminLevel: ADMIN_LEVELS.PLATFORM_SUPERADMIN,
            servicesAccess: { $size: 1 },
        })
        .project({ email: 1, servicesAccess: 1, createdAt: 1 })
        .toArray();
    if (review.length) {
        console.log(`\nReview by hand — platform superadmins with a single-module servicesAccess (likely taxi-panel superadmins):`);
        for (const admin of review) console.log(`  ${admin.email}  servicesAccess=${JSON.stringify(admin.servicesAccess)}`);
    }

    if (!APPLY && wrong.length) console.log('\nRe-run with --apply to write.');
    await mongoose.disconnect();
};

main().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
