import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../../config/env.js';
import { ADMIN_LEVELS, ADMIN_MODULES } from './adminHierarchy.constants.js';
import { ALL_ADMIN_MODULES } from './adminHierarchy.constants.js';

const adminSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        name: { type: String, trim: true, default: '' },
        // No default: the `admins` collection carries a unique+sparse index on
        // phone, inherited from hotel's old Admin schema. Sparse skips a
        // *missing* field but not an empty string, so defaulting to '' meant a
        // second admin without a phone number could never be created.
        phone: { type: String, trim: true },
        profileImage: { type: String, trim: true, default: '' },
        // Written by the hotel panel, which used to have its own Admin schema.
        profileImagePublicId: { type: String, trim: true, default: '' },
        lastLogin: { type: Date },
        fcmTokens: {
            type: [String],
            default: []
        },
        fcmTokenMobile: {
            type: [String],
            default: []
        },
        role: {
            type: String,
            default: 'ADMIN'
        },
        adminLevel: {
            type: String,
            enum: Object.values(ADMIN_LEVELS),
            default: ADMIN_LEVELS.PLATFORM_SUPERADMIN,
        },
        module: {
            type: String,
            enum: [...Object.values(ADMIN_MODULES), null],
            default: null,
        },
        parentAdminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodAdmin',
            default: null,
            index: true,
        },
        admin_type: {
            type: String,
            enum: ['superadmin', 'subadmin'],
            default: 'superadmin',
            trim: true,
        },
        permissions: {
            type: [String],
            default: [],
        },
        /*
         * Per-module, per-feature grants:
         *   { 'food.orders': { view: true, edit: true } }
         *
         * Deliberately a second field rather than a richer `permissions`.
         * That one is an array of strings and the whole hierarchy reads it as
         * one — expandLegacyPermissions, permissionsIncludeAll,
         * hasResourcePermission and so canManageAdmins. The food sub-admin
         * feature tried to write a nested object into it and every create threw
         * `Cast to [string] failed`, which is why it never worked.
         */
        featurePermissions: {
            type: mongoose.Schema.Types.Mixed,
            default: () => ({}),
        },
        isActive: {
            type: Boolean,
            default: true
        },
        active: {
            type: Boolean,
            default: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            trim: true,
        },
        servicesAccess: {
            type: [String],
            // Derived from ADMIN_MODULES so a new module cannot be added to the
            // hierarchy and then fail to persist here.
            enum: ALL_ADMIN_MODULES,
            default: ['food']
        },
        service_location_ids: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'TaxiServiceLocation',
                },
            ],
            default: [],
        },
        zone_ids: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'TaxiZone',
                },
            ],
            default: [],
        },
        food_zone_ids: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'FoodZone',
                },
            ],
            default: [],
        },
        resetPasswordOtp: {
            type: String,
            select: false,
        },
        resetPasswordExpires: {
            type: Date,
            select: false,
        },
    },
    {
        collection: 'admins',
        timestamps: true
    }
);

adminSchema.index({ servicesAccess: 1 });
adminSchema.index({ adminLevel: 1, module: 1 });
adminSchema.index({ parentAdminId: 1, module: 1 });

// Runs before validation (not pre-save, which fires after) so a module that
// gets retired from ADMIN_MODULES cannot strand an admin already holding it —
// full-document validation on the next unrelated save would otherwise 500 on
// the stale enum value forever, since nothing else ever touches this field.
adminSchema.pre('validate', function (next) {
    if (Array.isArray(this.servicesAccess)) {
        this.servicesAccess = this.servicesAccess.filter((s) => ALL_ADMIN_MODULES.includes(s));
    }
    if (this.module && !ALL_ADMIN_MODULES.includes(this.module)) {
        this.module = null;
    }
    next();
});

adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

adminSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const FoodAdmin = mongoose.models.FoodAdmin || mongoose.model('FoodAdmin', adminSchema);

export default FoodAdmin;
