import mongoose from 'mongoose';

/**
 * A tour operator / travel agency.
 *
 * Mirrors the hotel Partner: OTP is the real credential (the password column is
 * a random hash just to satisfy the field), signup collects only the minimum,
 * and full KYC is gathered later inside the operator panel. An account starts
 * `pending` and can still sign in — gating login behind approval would leave a
 * new operator with no way to submit the documents approval depends on.
 */
const tourOperatorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  agencyName: { type: String, trim: true },
  email: { type: String, sparse: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true, unique: true },
  password: { type: String, required: true },

  role: { type: String, default: 'operator', enum: ['operator'] },

  isBlocked: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  operatorApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: { type: String, trim: true },
  operatorSince: { type: Date, default: Date.now },

  fcmTokens: {
    app: { type: String, default: null },
    web: { type: String, default: null },
  },

  // KYC — collected in-panel after signup, verified by an admin.
  ownerName: { type: String, trim: true },
  aadhaarNumber: { type: String, trim: true },
  aadhaarFront: { type: String },
  aadhaarBack: { type: String },
  panNumber: { type: String, trim: true },
  panCardImage: { type: String },
  gstNumber: { type: String, trim: true },

  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },

  termsAccepted: { type: Boolean, default: false },
  profileImage: { type: String, default: null },
  profileImagePublicId: { type: String, default: null },
}, { timestamps: true });

const TourOperator = mongoose.model('TourOperator', tourOperatorSchema);
export default TourOperator;
