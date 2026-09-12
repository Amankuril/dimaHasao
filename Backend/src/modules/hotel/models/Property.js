// models/Property.js
import mongoose from "mongoose";

const nearbyPlaceSchema = new mongoose.Schema({
  name: String,
  type: {
    type: String,
    // enum removed to allow flexibilty (bus_stop, restaurant, other, etc.)
  },
  distanceKm: Number
});

const propertySchema = new mongoose.Schema({

  // BASIC INFO
  propertyName: { type: String, required: true },
  contactNumber: { type: String },
  /**
   * The scope of work covers hotels, resorts, homestays and lodges. The module
   * was ported from a real-estate marketplace that also listed PGs, hostels,
   * villas, tents, rentals, resales and plots; those types were removed.
   */
  propertyType: {
    type: String,
    enum: ["hotel", "resort", "homestay", "lodge"],
    required: true
  },

  // Dynamic Category (Optional)
  dynamicCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PropertyCategory",
    default: null
  },

  hostLivesOnProperty: { type: Boolean, default: false },
  familyFriendly: { type: Boolean, default: false },

  resortType: {
    type: String,
    enum: ["beach", "hill", "jungle", "desert"]
  },

  hotelCategory: {
    type: String,
    enum: ["Budget", "Premium", "Luxury"]
  },
  starRating: {
    type: Number,
    min: 1,
    max: 7
  },

  activities: [String],

  description: String,
  shortDescription: String,

  // OWNER
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Partner",
    required: true
  },

  // LOCATION
  address: {
    country: String,
    state: String,
    city: String,
    area: String,
    fullAddress: String,
    pincode: String
  },

  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: [Number]
  },

  nearbyPlaces: {
    type: [nearbyPlaceSchema],
    default: []
  },

  // MEDIA
  coverImage: { type: String, required: true },
  propertyImages: [String],

  // AMENITIES (PROPERTY LEVEL)
  amenities: [String],

  // POLICIES
  checkInTime: String,
  checkOutTime: String,
  cancellationPolicy: String,
  houseRules: [String],

  // Universal / Pro Fields
  videoUrl: String,
  isVerified: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  virtualTourLink: String,

  // STATUS
  status: {
    type: String,
    enum: ["draft", "pending", "approved", "rejected"],
    default: "draft"
  },

  isLive: { type: Boolean, default: false },

  // RATINGS
  avgRating: { type: Number, default: 3 },
  totalReviews: { type: Number, default: 0 }

}, { timestamps: true });

propertySchema.index({ location: "2dsphere" });

export default mongoose.model("Property", propertySchema);
