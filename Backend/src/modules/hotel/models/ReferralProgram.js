import mongoose from 'mongoose';

const referralProgramSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    rewardAmount: {
        type: Number,
        required: true,
        default: 200
    },
    triggerType: {
        type: String,
        enum: ['first_booking', 'signup'],
        default: 'first_booking'
    },
    eligibleRoles: [{
        type: String,
        enum: ['user', 'partner'],
        default: 'user'
    }],
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    maxReferralsPerUser: {
        type: Number,
        default: 100
    },
    description: String
}, { timestamps: true });

const ReferralProgram = mongoose.model('ReferralProgram', referralProgramSchema);
export default ReferralProgram;
