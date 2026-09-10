import mongoose from 'mongoose';

const reelSaveSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

reelSaveSchema.index({ user: 1, reel: 1 }, { unique: true });

const ReelSave = mongoose.model('ReelSave', reelSaveSchema);
export default ReelSave;
