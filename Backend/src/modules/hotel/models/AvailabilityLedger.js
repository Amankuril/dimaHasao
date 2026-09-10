import mongoose from "mongoose";

const availabilityLedgerSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },
  roomTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType"
  },
  inventoryType: {
    type: String,
    enum: ["room", "bed", "entire", "tent"],
    required: true
  },
  source: {
    type: String,
    enum: ["platform", "walk_in", "external", "manual_block"],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  externalPlatform: String,
  externalReference: String,
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  units: {
    type: Number,
    required: true,
    min: 1
  },
  notes: String,
  createdBy: {
    type: String,
    enum: ["system", "partner"],
    default: "system"
  }
}, { timestamps: true });

availabilityLedgerSchema.index({ propertyId: 1, roomTypeId: 1, startDate: 1, endDate: 1 });
availabilityLedgerSchema.index({ source: 1, referenceId: 1 });

export default mongoose.model("AvailabilityLedger", availabilityLedgerSchema);

