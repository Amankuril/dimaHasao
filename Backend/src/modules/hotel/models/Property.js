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
  propertyType: {
    type: String,
    enum: ["villa", "resort", "hotel", "hostel", "pg", "homestay", "tent", "rent", "buy", "plot"],
    required: true
  },

  // Dynamic Category (Optional)
  dynamicCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PropertyCategory",
    default: null
  },

  // Flexible Category-Specific Details (Added for Tent/Glamping support)
  structureDetails: {
    type: Object,
    default: {} // Stores: tentType, bathroomType, electricityInfo, etc.
  },

  pgType: {
    type: String,
    enum: ["boys", "girls", "unisex"]
  },

  hostelType: {
    type: String,
    enum: ["boys", "girls", "mixed"]
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

  // --- NEW PROPERTY SPECIFIC FIELDS ---

  // PG/Co-Living Details
  pgDetails: {
    occupancy: { type: String, enum: ['Single', 'Double', 'Triple', 'Other'] },
    gender: { type: String, enum: ['Boys', 'Girls', 'Co-ed'] },
    minStay: String,
    noticePeriod: String,
    securityDeposit: Number,
    availableFrom: Date,
    foodIncluded: {
      breakfast: { type: Boolean, default: false },
      lunch: { type: Boolean, default: false },
      dinner: { type: Boolean, default: false }
    },
    rules: {
      smoking: Boolean,
      drinking: Boolean,
      visitors: Boolean,
      curfew: String,
      ageRange: String
    }
  },

  // Rent Details
  rentDetails: {
    type: { type: String }, // 1BHK, 2BHK etc.
    monthlyRent: { type: Number }, // Added Price
    furnishing: { type: String, enum: ['Fully', 'Semi', 'Unfurnished'] },
    tenantPreference: { type: String }, // Family, Bachelors, etc.
    builtYear: Number,
    maintenanceCharges: Number,
    electricityIncluded: Boolean,
    waterSupply: String,
    societyName: String,
    lift: Boolean
  },

  // Buy Details
  buyDetails: {
    type: { type: String }, // Apartment, Villa
    expectedPrice: { type: Number }, // Added Price
    area: {
      superBuiltUp: Number,
      carpet: Number,
      unit: { type: String, default: 'sqft' }
    },
    ownership: String,
    propertyAge: String,
    floor: {
      current: Number,
      total: Number
    },
    facing: String,
    registrationIncluded: Boolean,
    stampDutyIncluded: Boolean,
    propertyTax: Number,
    legalVerified: Boolean,
    loanEligible: Boolean,
    builderName: String
  },

  // Plot Details
  plotDetails: {
    expectedPrice: { type: Number }, // Added Price
    plotArea: { type: Number },
    unit: { type: String, default: 'sqyrd' },
    dimensions: { length: Number, breadth: Number }, // ft
    facing: String,
    landType: { type: String }, // Residential, Commercial
    roadWidth: String,
    boundaryMarked: Boolean,
    approvalAuthority: String,
    soilType: String,
    electricityAvailable: Boolean,
    waterSource: String,
    nearbyLandmark: String
  },

  // Universal / Pro Fields
  videoUrl: String,
  isVerified: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isUrgent: { type: Boolean, default: false },
  isNegotiable: { type: Boolean, default: false },
  virtualTourLink: String,
  availabilityStatus: { type: String, enum: ['Available', 'Sold', 'Rented'], default: 'Available' },

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
