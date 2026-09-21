import mongoose from 'mongoose';

/**
 * The district's own identity and contact details, in one place.
 *
 * Brand name, logo and contact were stored three times over — food's
 * `businessSettings`, taxi's `AdminBusinessSetting` and hotel's
 * `PlatformSettings` — so renaming the district or changing the support number
 * meant finding three admin screens, and the apps disagreed with each other in
 * the meantime.
 *
 * A singleton: there is one district. `getSettings` creates it on first read so
 * no deployment step is needed.
 *
 * Registered as `DistrictSettings`, not `PlatformSettings`: mongoose model
 * names are global and hotel already owns that one for a module-specific
 * collection. Two modules registering the same name is an overwrite, not an
 * error, and the loser silently reads the winner's collection.
 */
const platformSettingsSchema = new mongoose.Schema(
    {
        /** Guarantees a single row even if two writers race. */
        key: { type: String, default: 'platform', unique: true, immutable: true },

        brandName: { type: String, default: 'Dima Hasao Tourism', trim: true },
        tagline: { type: String, default: '', trim: true },

        /** Left blank to fall back to the bundled crest in the frontend. */
        logoUrl: { type: String, default: '', trim: true },

        supportEmail: { type: String, default: '', trim: true },
        supportPhone: { type: String, default: '', trim: true },
        /** Where "Support" on a sign-in screen sends people. */
        supportUrl: { type: String, default: '', trim: true },

        address: { type: String, default: '', trim: true },
        state: { type: String, default: 'Assam', trim: true },
        pincode: { type: String, default: '', trim: true },

        updatedBy: { type: mongoose.Schema.Types.ObjectId },
    },
    { timestamps: true, collection: 'platform_settings' },
);

platformSettingsSchema.statics.getSettings = async function getSettings() {
    return (await this.findOne({ key: 'platform' })) || this.create({ key: 'platform' });
};

const DistrictSettings = mongoose.model('DistrictSettings', platformSettingsSchema, 'platform_settings');
export default DistrictSettings;
