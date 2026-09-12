// models/RoomType.js
import mongoose from "mongoose";

const roomTypeSchema = new mongoose.Schema({

  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },

  name: { type: String, required: true },

  inventoryType: {
    type: String,
    enum: ["room", "entire"],
    required: true
  },

  roomCategory: {
    type: String,
    enum: ["private", "entire", "triple", "double"]
  },

  bathroomType: {
    type: String,
    enum: ["Attached (Private)", "Shared Complex"]
  },

  // CAPACITY
  maxAdults: { type: Number, required: true },
  maxChildren: { type: Number, default: 0 },

  // INVENTORY COUNT
  bedsPerRoom: {
    type: Number
  },
  totalInventory: {
    type: Number,
    required: true
  },

  // PRICING (PER NIGHT – SINGLE SOURCE OF TRUTH)
  pricePerNight: { type: Number, required: true },
  extraAdultPrice: { type: Number, default: 0 },
  extraChildPrice: { type: Number, default: 0 },
  securityDeposit: { type: Number, default: 0 },

  // MEDIA
  images: {
    type: [String],
    default: []
  },

  amenities: [String],

  availableFrom: { type: String },

  isActive: { type: Boolean, default: true }

}, { timestamps: true });

export default mongoose.model("RoomType", roomTypeSchema);
