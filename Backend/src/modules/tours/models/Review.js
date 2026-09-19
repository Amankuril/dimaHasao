import mongoose from 'mongoose';

/** A traveller's review of a completed package. */
const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'userModel', required: true },
  userModel: { type: String, enum: ['User', 'FoodUser'], default: 'User' },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourPackage', required: true, index: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourBooking' },

  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true },
  reply: { type: String, trim: true },
  replyAt: { type: Date },

  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
}, { timestamps: true });

const TourReview = mongoose.model('TourReview', reviewSchema);
export default TourReview;
