import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'partner',
    enum: ['partner', 'broker', 'agent', 'seller', 'user']
  },
  isPartner: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  partnerApprovalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  partnerSince: {
    type: Date,
    default: Date.now
  },
  fcmTokens: {
    app: { type: String, default: null },
    web: { type: String, default: null }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Owner Details
  ownerName: { type: String, trim: true },
  aadhaarNumber: { type: String, trim: true },
  aadhaarFront: { type: String }, // URL
  aadhaarBack: { type: String }, // URL
  panNumber: { type: String, trim: true },
  panCardImage: { type: String }, // URL

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

  // Subscription Details
  subscription: {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    status: {
      type: String,
      enum: ['active', 'expired', 'inactive'],
      default: 'inactive'
    },
    startDate: { type: Date },
    expiryDate: { type: Date },
    propertiesAdded: { type: Number, default: 0 },
    transactionId: { type: String },
    leadsUsedThisMonth: { type: Number, default: 0 },
    isPaused: { type: Boolean, default: false },
    pauseStartDate: { type: Date }
  },


  termsAccepted: { type: Boolean, default: false },

  // OTP for Login
  otp: {
    type: String,
    select: false
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

  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Partner = mongoose.model('Partner', partnerSchema);
export default Partner;
