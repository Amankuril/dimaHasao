import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema(
  {
    platformOpen: {
      type: Boolean,
      default: true
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    bookingDisabledMessage: {
      type: String,
      default: 'Bookings are temporarily disabled. Please try again later.'
    },
    maintenanceTitle: {
      type: String,
      default: 'We will be back soon.'
    },
    maintenanceMessage: {
      type: String,
      default: 'The platform is under scheduled maintenance. Please check back in some time.'
    },
    defaultCommission: {
      type: Number,
      default: 10 // Percentage
    },
    taxRate: {
      type: Number,
      default: 12 // Percentage (GST)
    },
    reelCouponTarget: {
      type: Number,
      default: 1000 // Default target likes
    },
    reelCouponDiscount: {
      type: Number,
      default: 500 // Default flat discount
    },
    /** Legacy global reel duration (kept as fallback; prefer reelPricing.user / reelPricing.vendor) */
    reelFreeDurationSec: {
      type: Number,
      default: 10,
      min: 1,
    },
    reelMaxDurationSec: {
      type: Number,
      default: 60,
      min: 1,
    },
    reelPaidDurationEnabled: {
      type: Boolean,
      default: false,
    },
    reelDurationTiers: [
      {
        minDuration: { type: Number, required: true, min: 0 },
        maxDuration: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        enabled: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
      },
    ],
    /**
     * Independent Reel duration/pricing per uploader type.
     * Admin edits these from Reel Settings. Code must not hardcode prices/limits.
     */
    reelPricing: {
      user: {
        active: { type: Boolean, default: true },
        freeDurationSec: { type: Number, default: 10, min: 1 },
        maxDurationSec: { type: Number, default: 60, min: 1 },
        paidDurationEnabled: { type: Boolean, default: false },
        durationTiers: [
          {
            minDuration: { type: Number, required: true, min: 0 },
            maxDuration: { type: Number, required: true, min: 1 },
            price: { type: Number, required: true, min: 0 },
            enabled: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
          },
        ],
      },
      vendor: {
        active: { type: Boolean, default: true },
        freeDurationSec: { type: Number, default: 20, min: 1 },
        maxDurationSec: { type: Number, default: 60, min: 1 },
        paidDurationEnabled: { type: Boolean, default: false },
        durationTiers: [
          {
            minDuration: { type: Number, required: true, min: 0 },
            maxDuration: { type: Number, required: true, min: 1 },
            price: { type: Number, required: true, min: 0 },
            enabled: { type: Boolean, default: true },
            order: { type: Number, default: 0 },
          },
        ],
      },
    },
  },
  { timestamps: true }
);

platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);

export default PlatformSettings;

