import mongoose from 'mongoose';

const reelInteractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    totalWatchTime: {
      type: Number,
      default: 0,
    },
    completedViews: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    propertyClicks: {
      type: Number,
      default: 0,
    },
    lastWatchPosition: {
      type: Number,
      default: 0,
    },
    notInterested: {
      type: Boolean,
      default: false,
    },
    lastInteractedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

reelInteractionSchema.index({ user: 1, reel: 1 }, { unique: true });

const ReelInteraction = mongoose.model('ReelInteraction', reelInteractionSchema);
export default ReelInteraction;
