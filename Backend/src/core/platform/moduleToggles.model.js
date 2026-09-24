import mongoose from 'mongoose';

/**
 * Whether each consumer module is open for business.
 *
 * One document, one row per module, so a switch is a single small write and a
 * single cached read. Kept apart from DistrictSettings (brand, contact, legal)
 * because this is read on almost every request and that is not.
 *
 * Absent means open. A module that has never been touched must work, and a
 * failed read must not close the app — see moduleToggles.service.
 */
const moduleToggleSchema = new mongoose.Schema(
    {
        module: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        /** Shown on the maintenance screen. Blank falls back to a default. */
        message: {
            type: String,
            default: '',
            trim: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodAdmin',
            default: null,
        },
    },
    { timestamps: true },
);

export const ModuleToggle = mongoose.model('ModuleToggle', moduleToggleSchema, 'platform_module_toggles');

export default ModuleToggle;
