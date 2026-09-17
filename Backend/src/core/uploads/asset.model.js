import mongoose from 'mongoose';

/**
 * Who uploaded a file.
 *
 * Files were written to disk with a generated name and nothing else — no record
 * of who put them there. That made `DELETE /v1/uploads` impossible to scope:
 * once it required a session, any signed-in user could still delete any asset
 * by URL, because there was no way to say whose it was.
 *
 * Deliberately thin. It is an ownership ledger, not a media library: the file
 * on disk remains the source of truth for the bytes, and an asset with no row
 * here is simply one uploaded before this existed.
 */
const uploadedAssetSchema = new mongoose.Schema({
  /** The stored filename, which is what a URL resolves to. */
  publicId: { type: String, required: true, unique: true, index: true },
  url: { type: String, required: true },
  folder: { type: String, trim: true },

  uploadedBy: { type: mongoose.Schema.Types.ObjectId, index: true },
  /** The caller's platform role at upload time, for reading the audit later. */
  uploaderRole: { type: String, trim: true },

  mimeType: { type: String, trim: true },
  bytes: { type: Number },
  originalName: { type: String, trim: true },
}, { timestamps: true, collection: 'uploaded_assets' });

const UploadedAsset = mongoose.model('UploadedAsset', uploadedAssetSchema);
export default UploadedAsset;
