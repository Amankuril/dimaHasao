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

        /*
         * Emergency and contact numbers the apps used to hardcode (three copies of
         * the helpline list in the customer app alone). Defaults are the values the
         * apps shipped with, so nothing changes until an admin edits them.
         */
        /** What every SOS button dials. */
        sosNumber: { type: String, default: '112', trim: true },
        /** Helplines listed on the customer app's Home, More and Help screens, in this order. */
        emergencyContacts: {
            type: [
                new mongoose.Schema(
                    {
                        label: { type: String, required: true, trim: true },
                        number: { type: String, required: true, trim: true },
                        /** Font Awesome class the customer app shows beside it. */
                        icon: { type: String, default: 'fa-solid fa-phone', trim: true },
                    },
                    { _id: false },
                ),
            ],
            default: () => [
                { label: 'Police Control Room', number: '112', icon: 'fa-solid fa-shield' },
                { label: 'Haflong Civil Hospital', number: '03673-236222', icon: 'fa-solid fa-hospital' },
                { label: 'District Police Control Room', number: '8638389873', icon: 'fa-solid fa-person-military-pointing' },
                { label: 'Disaster Emergency (DDMA)', number: '1077', icon: 'fa-solid fa-triangle-exclamation' },
            ],
        },
        /** "Contact Tourism Desk" for local guides on the customer home screen. */
        tourismDeskPhone: { type: String, default: '+91 9101533127', trim: true },
        /** Hotel/restaurant partner support. Blank falls back to supportPhone / supportEmail. */
        partnerSupportPhone: { type: String, default: '', trim: true },
        partnerSupportEmail: { type: String, default: '', trim: true },

        address: { type: String, default: '', trim: true },
        state: { type: String, default: 'Assam', trim: true },
        pincode: { type: String, default: '', trim: true },

        updatedBy: { type: mongoose.Schema.Types.ObjectId },
    },
    { timestamps: true, collection: 'platform_settings' },
);

// Seeded placeholders that were never real numbers. Replaced in stored settings
// the first time they are read; an admin's own edits are left alone.
const PLACEHOLDER_HELPLINE = '+91 94350 99999';
const POLICE_CONTROL_ROOM = { label: 'District Police Control Room', number: '8638389873', icon: 'fa-solid fa-person-military-pointing' };

platformSettingsSchema.statics.getSettings = async function getSettings() {
    const doc = (await this.findOne({ key: 'platform' })) || (await this.create({ key: 'platform' }));
    const contacts = doc.emergencyContacts || [];
    const i = contacts.findIndex((c) => String(c?.number || '').trim() === PLACEHOLDER_HELPLINE);
    if (i !== -1) {
        contacts.splice(i, 1, POLICE_CONTROL_ROOM);
        doc.markModified('emergencyContacts');
        await doc.save();
    }
    if (String(doc.tourismDeskPhone || '').trim() === '+91 94350 12345') {
        doc.tourismDeskPhone = doc.supportPhone || '';
        await doc.save();
    }
    return doc;
};

const DistrictSettings = mongoose.model('DistrictSettings', platformSettingsSchema, 'platform_settings');
export default DistrictSettings;
