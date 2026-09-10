import mongoose from 'mongoose';

const hostelFeePaymentSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  hostelName: {
    type: String,
    required: true,
    trim: true
  },
  feePeriod: {
    type: String,
    required: true,
    default: 'Current Month'
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  paymentMethod: {
    type: String,
    enum: ['PhonePe', 'Google Pay', 'Paytm', 'UPI Payment', 'Scan QR', 'phonepe', 'gpay', 'paytm', 'upi', 'qr', 'online'],
    default: 'online'
  },
  paymentGateway: {
    type: String,
    default: 'razorpay'
  },
  razorpayOrderId: {
    type: String,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paidAt: {
    type: Date
  },
  hostelAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    default: null
  }
}, { timestamps: true });

hostelFeePaymentSchema.index({ userId: 1, createdAt: -1 });

const HostelFeePayment = mongoose.model('HostelFeePayment', hostelFeePaymentSchema);
export default HostelFeePayment;
