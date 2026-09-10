import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      refPath: 'userModel',
      index: true
    },
    userType: {
      type: String,
      enum: ['user', 'partner', 'admin'],
      default: 'user',
      required: true
    },
    userModel: {
      type: String,
      required: true,
      enum: ['User', 'Admin', 'Partner'],
      default: 'User'
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    body: {
      type: String,
      required: [true, 'Notification body is required'],
      trim: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date
    },
    type: {
      type: String,
      default: 'general'
    },
    fcmMessageId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, userType: 1, isRead: 1, createdAt: -1 });

// Pre-save hook to set userModel based on userType
notificationSchema.pre('save', async function () {
  if (this.userType === 'admin') {
    this.userModel = 'Admin';
  } else if (this.userType === 'partner') {
    this.userModel = 'Partner';
  } else {
    this.userModel = 'User';
  }
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
