import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
      required: true,
      index: true,
    },
    userModel: {
      type: String,
      enum: ['User', 'Partner', 'Admin'],
      default: 'User',
      required: true,
    },
    creatorType: {
      type: String,
      enum: ['user', 'vendor', 'admin'],
      default: 'user',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
      index: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    videoPublicId: {
      type: String,
      default: null,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    caption: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    hashtags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number],
      },
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    savesCount: {
      type: Number,
      default: 0,
    },
    propertyClicksCount: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      enum: ['PG', 'Rent', 'Buy', 'Plot', 'General'],
      default: 'General',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'published', 'rejected', 'blocked'],
      default: 'published',
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    /** Actual video duration in seconds (from storage provider) */
    durationSec: {
      type: Number,
      default: null,
    },
    /** Historical duration surcharge (₹) applied at upload time */
    durationCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationPaymentStatus: {
      type: String,
      enum: ['free', 'paid', 'pending', 'failed', 'not_required'],
      default: 'not_required',
    },
    durationPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReelDurationPayment',
      default: null,
    },
    durationTierSnapshot: {
      minDuration: Number,
      maxDuration: Number,
      price: Number,
    },
    durationPricingRole: {
      type: String,
      enum: ['user', 'vendor'],
      default: 'user',
    },
  },
  { timestamps: true }
);

reelSchema.index({ createdAt: -1 });
reelSchema.index({ user: 1, createdAt: -1 });
reelSchema.index({ 'location.coordinates': '2dsphere' }, { sparse: true });
// Feed / recommendation candidate indexes
reelSchema.index({ status: 1, createdAt: -1 });
reelSchema.index({ status: 1, category: 1, createdAt: -1 });
reelSchema.index({ status: 1, 'location.city': 1, createdAt: -1 });
reelSchema.index({
  status: 1,
  propertyClicksCount: -1,
  savesCount: -1,
  likesCount: -1,
  createdAt: -1,
});

const Reel = mongoose.model('Reel', reelSchema);
export default Reel;
