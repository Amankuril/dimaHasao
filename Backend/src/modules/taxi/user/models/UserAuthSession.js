import mongoose from 'mongoose';

const userAuthSessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    // OTP codes now live in core/otp under the 'taxi-user' scope. These two
    // fields remain only so old rows still load; nothing writes them.
    otpHash: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      index: true,
    },
    otpVerifiedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

userAuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserAuthSession =
  mongoose.models.TaxiUserAuthSession ||
  mongoose.model('TaxiUserAuthSession', userAuthSessionSchema);
