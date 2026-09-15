/**
 * Hotel image storage — a shim over the platform's single upload service.
 *
 * The file keeps its old name and exports so the six call sites in
 * hotelController and authController did not have to change, exactly as the
 * SMS and email shims do. Nothing here talks to Cloudinary any more: every
 * image in the project is converted to WebP by `services/storage.service.js`
 * and written to `Backend/uploads` in development or `/var/www/uploads` in
 * production.
 *
 * This also fixes a real outage — hotel's uploader had no fallback, so with
 * the blank CLOUDINARY_* credentials in .env every hotel image upload failed.
 */
import fs from 'fs';
import {
  storeImageBuffer,
  storeImageFromDataUrl,
  deleteStoredAsset,
} from '../../../services/storage.service.js';

/** Storage result → the `{ url, publicId }` shape hotel's controllers read. */
const present = (stored) => ({
  url: stored.url || stored.secure_url,
  secure_url: stored.url || stored.secure_url,
  publicId: stored.public_id || stored.filename || null,
  public_id: stored.public_id || stored.filename || null,
  format: stored.format || 'webp',
  bytes: stored.bytes,
  width: stored.width,
  height: stored.height,
});

/**
 * Upload a file multer wrote to disk.
 * @param {string} filePath
 * @param {string} folder
 * @param {string|null} _publicId  accepted for call-site compatibility; the
 *   storage service names files itself so ids cannot collide across modules.
 */
export const uploadToCloudinary = async (filePath, folder = 'general', _publicId = null) => {
  const buffer = await fs.promises.readFile(filePath);
  const stored = await storeImageBuffer(buffer, `hotel/${folder}`, { originalName: filePath });

  // multer's disk copy is redundant once the WebP is written.
  await fs.promises.unlink(filePath).catch(() => {});

  return present(stored);
};

/** Upload a base64 / data-URL image (the Flutter camera path). */
export const uploadBase64ToCloudinary = async (base64String, folder = 'general', _publicId = null) => {
  const dataUrl = String(base64String || '').startsWith('data:')
    ? base64String
    : `data:image/jpeg;base64,${base64String}`;

  return present(await storeImageFromDataUrl(dataUrl, `hotel/${folder}`));
};

/** Remove a stored image. Accepts a URL or the stored filename. */
export const deleteFromCloudinary = async (publicIdOrUrl) => {
  const deleted = await deleteStoredAsset(publicIdOrUrl);
  return { result: deleted ? 'ok' : 'not found', deleted };
};

export default { uploadToCloudinary, uploadBase64ToCloudinary, deleteFromCloudinary };
