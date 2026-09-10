import mongoose from 'mongoose';

const reelCommentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReelComment',
      default: null,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

reelCommentSchema.index({ reel: 1, createdAt: -1 });

const ReelComment = mongoose.model('ReelComment', reelCommentSchema);
export default ReelComment;
