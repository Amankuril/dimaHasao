import mongoose from 'mongoose';

const poolingDriverOnboardingSessionSchema = new mongoose.Schema(
  {
    registrationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    role: {
      type: String,
      default: 'pooling_driver',
      trim: true,
    },
    // OTP codes now live in core/otp under the 'taxi-driver' scope. Kept only
    // so old rows still load; nothing writes this.
    otpHash: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    status: {
      type: String,
      enum: ['otp_sent', 'otp_verified', 'details_saved', 'submitted'],
      default: 'otp_sent',
    },
    driverName: {
      type: String,
      trim: true,
      default: '',
    },
    vehicleDraft: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true },
);

poolingDriverOnboardingSessionSchema.index({ phone: 1, status: 1 });

export const PoolingDriverOnboardingSession =
  mongoose.models.PoolingDriverOnboardingSession ||
  mongoose.model('PoolingDriverOnboardingSession', poolingDriverOnboardingSessionSchema);
