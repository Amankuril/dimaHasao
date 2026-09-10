import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false // Don't return password in queries by default
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin'
  },
  permissions: {
    type: [String],
    default: ['read', 'write', 'update', 'delete']
  },
  // Platform-based FCM tokens (app and web)
  fcmTokens: {
    app: {
      type: String,
      default: null
    },
    web: {
      type: String,
      default: null
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String,
    default: null
  },
  profileImagePublicId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
