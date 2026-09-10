import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    sparse: true, // Allows null/undefined values to duplicate (i.e., multiple users without email)
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'partner', 'broker', 'agent', 'seller', 'admin'],
    default: 'user'
  },
  isPartner: {
    type: Boolean,
    default: false
  },
  partnerApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  partnerSince: {
    type: Date
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
  isVerified: {
    type: Boolean,
    default: false
  },
  savedHotels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }],
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  aadhaarNumber: { type: String, trim: true },
  aadhaarFront: { type: String }, // URL
  aadhaarBack: { type: String }, // URL
  panNumber: { type: String, trim: true },
  panCardImage: { type: String }, // URL
  termsAccepted: { type: Boolean, default: false },

  // Status tracking
  registrationStep: {
    type: Number,
    default: 1 // 1: Basic, 2: Details, 3: Completed
  },
  otp: {
    type: String,
    select: false // Do not return OTP in queries by default
  },
  otpExpires: {
    type: Date,
    select: false
  },
  profileImage: {
    type: String,
    default: null
  },
  profileImagePublicId: {
    type: String,
    default: null
  },
  reelPreferences: {
    categories: {
      PG: { type: Number, default: 0 },
      Rent: { type: Number, default: 0 },
      Buy: { type: Number, default: 0 },
      Plot: { type: Number, default: 0 },
      General: { type: Number, default: 0 }
    },
    locations: [
      {
        city: { type: String, trim: true },
        score: { type: Number, default: 0 }
      }
    ]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound indexes to allow same phone/email for different roles
userSchema.index({ phone: 1, role: 1 }, { unique: true });
// Partial index: only enforce uniqueness when email is not null
userSchema.index(
  { email: 1, role: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } }
  }
);

const User = mongoose.model('User', userSchema);
export default User;
