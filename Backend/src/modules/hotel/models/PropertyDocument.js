// models/PropertyDocument.js
import mongoose from "mongoose";

const propertyDocumentSchema = new mongoose.Schema({

  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },

  propertyType: {
    type: String,
    enum: ["hotel", "resort", "homestay", "lodge"],
    required: true
  },

  documents: [{
    type: { type: String },     // trade_license, gst_certificate, etc.
    name: { type: String },     // Display name if needed
    fileUrl: { type: String },
    isRequired: { type: Boolean }
  }],

  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending"
  },

  adminRemark: String,

  verifiedAt: Date

}, { timestamps: true });

export default mongoose.model("PropertyDocument", propertyDocumentSchema);
