import mongoose from 'mongoose';

const referralCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'ownerType'
    },
    ownerType: {
        type: String,
        required: true,
        enum: ['User', 'Partner', 'Admin']
    },
    referralProgramId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReferralProgram'
    },
    usageCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isCustom: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Check to ensure one active code per user usually, but Schema allows multiple if needed.
// We will enforce single active code at service level.

const ReferralCode = mongoose.model('ReferralCode', referralCodeSchema);
export default ReferralCode;
