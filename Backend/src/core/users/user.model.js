import mongoose from 'mongoose';

const userAddressSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            enum: ['Home', 'Office', 'Other'],
            default: 'Home',
            index: true
        },
        street: {
            type: String,
            required: true,
            trim: true
        },
        additionalDetails: {
            type: String,
            default: '',
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            required: true,
            trim: true
        },
        zipCode: {
            type: String,
            default: '',
            trim: true
        },
        phone: {
            type: String,
            default: '',
            trim: true
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                // [lng, lat]
                type: [Number],
                default: undefined,
                validate: {
                    validator: (v) =>
                        v === undefined ||
                        (Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n))),
                    message: 'location.coordinates must be [lng, lat]'
                }
            }
        },
        isDefault: {
            type: Boolean,
            default: false,
            index: true
        }
    },
    { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            trim: true
        },
        countryCode: {
            type: String,
            default: '+91'
        },
        name: {
            type: String
        },
        email: {
            type: String
        },
        profileImage: {
            type: String,
            default: ''
        },
        fcmTokens: {
            type: [String],
            default: []
        },
        fcmTokenMobile: {
            type: [String],
            default: []
        },
        dateOfBirth: {
            type: Date,
            default: null
        },
        anniversary: {
            type: Date,
            default: null
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer-not-to-say', ''],
            default: ''
        },
        referralCode: {
            type: String
        },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FoodUser',
            default: null,
            index: true
        },
        referralCount: {
            type: Number,
            default: 0,
            min: 0
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        role: {
            type: String,
            default: 'USER'
        },
        addresses: {
            type: [userAddressSchema],
            default: []
        },
        codCancellationCount: {
            type: Number,
            default: 0,
            min: 0
        },
        isCodBlocked: {
            type: Boolean,
            default: false
        },
        deletedAt: {
            type: Date
        },

        /* ---------------------------------------------------------------- *
         * Absorbed from the taxi and hotel user schemas.
         *
         * All three models always pointed at this same `users` collection, so
         * a consumer was one row read through three schemas that disagreed —
         * and hotel's could not save it at all (it marked `password` required
         * and enumerated a lowercase `role`, while OTP accounts have no
         * password and store 'USER'). Declaring the union here means the
         * legacy files can become shims without Mongoose dropping the fields
         * they used to own. Nothing below is required.
         * ---------------------------------------------------------------- */

        // OTP is the real credential; a password only exists on legacy accounts.
        password: { type: String },

        // — taxi —
        governmentIdProof: {
            type: {
                type: String,
                default: '',
                enum: ['aadhaar', 'voter_id', 'passport', 'driving_license', 'other', ''],
            },
            imageUrl: { type: String, default: '' },
            backImageUrl: { type: String, default: '' },
            fileName: { type: String, default: '' },
            backFileName: { type: String, default: '' },
            uploadedAt: { type: Date, default: null },
            backUploadedAt: { type: Date, default: null },
        },
        fcmTokenWeb: { type: mongoose.Schema.Types.Mixed },
        acquiredByEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiEmployee', default: null },
        acquiredByEmployeeCode: { type: String, default: '' },
        referredRideCompletionCount: { type: Number, default: 0 },
        referralRewardGrantedAt: { type: Date, default: null },
        active: { type: Boolean, default: true },
        deletion_reason: { type: String, default: '' },
        deletionRequest: {
            status: {
                type: String,
                default: 'none',
                enum: ['none', 'pending', 'approved', 'rejected'],
            },
            reason: { type: String, default: '' },
            requestedAt: { type: Date, default: null },
            reviewedAt: { type: Date, default: null },
            reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodAdmin', default: null },
            adminNote: { type: String, default: '' },
        },
        currentRideId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxiRide', default: null },

        // — hotel —
        isPartner: { type: Boolean, default: false },
        partnerApprovalStatus: {
            type: String,
            default: 'pending',
            enum: ['pending', 'approved', 'rejected'],
        },
        partnerSince: { type: Date },
        savedHotels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
        address: {
            street: { type: String },
            city: { type: String },
            state: { type: String },
            zipCode: { type: String },
            country: { type: String, default: 'India' },
            coordinates: {
                lat: { type: Number },
                lng: { type: Number },
            },
        },
        aadhaarNumber: { type: String },
        aadhaarFront: { type: String },
        aadhaarBack: { type: String },
        panNumber: { type: String },
        panCardImage: { type: String },
        termsAccepted: { type: Boolean, default: false },
        registrationStep: { type: Number, default: 1 },
        otp: { type: String },
        otpExpires: { type: Date },
        profileImagePublicId: { type: String, default: null }
    },
    {
        collection: 'users',
        timestamps: true
    }
);

userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ 'addresses.location': '2dsphere' });

export const FoodUser = mongoose.model('FoodUser', userSchema);

