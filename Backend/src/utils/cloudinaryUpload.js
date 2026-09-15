/**
 * Taxi document uploads — a shim over the platform's single upload service.
 *
 * The name and exports are unchanged so the six taxi call sites did not have
 * to move, but nothing here reaches Cloudinary any more. Images become WebP
 * via services/storage.service.js; a non-image data URL (a resume PDF, say)
 * falls through to raw storage.
 */
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';
import {
  storeImageFromDataUrl,
  storeFileBuffer,
} from '../services/storage.service.js';

const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/;

const parseDataUrl = (dataUrl) => {
  const match = String(dataUrl || '').match(DATA_URL_PATTERN);

  if (!match) {
    throw new ApiError(400, 'A valid base64 image data URL is required');
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extension = mimeType.split('/')[1] || 'jpg';

  return {
    mimeType,
    base64,
    extension,
  };
};

const toLocalUploadResult = (stored) => {
  const url = stored.url || stored.secure_url || '';
  return {
    secureUrl: url,
    publicId: stored.public_id || stored.filename || null,
    resourceType: stored.resource_type || 'image',
    format: stored.format || 'webp',
    bytes: stored.bytes || null,
    width: stored.width || null,
    height: stored.height || null,
    originalFilename: stored.original_filename || null,
    createdAt: stored.created_at || null,
    raw: stored,
  };
};

const uploadViaLocalStorage = async ({ dataUrl, folder, publicIdPrefix = 'upload' }) => {
  const scopedFolder = String(folder || env.uploadFolder || 'taxi')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^A-Za-z0-9/_-]/g, '_') || 'hello-parth-taxi';

  try {
    const stored = await storeImageFromDataUrl(dataUrl, scopedFolder, {
      originalName: `${publicIdPrefix}.jpg`,
    });
    return toLocalUploadResult(stored);
  } catch (imageError) {
    // Non-image / resume-style data URLs fall back to raw storage.
    const match = String(dataUrl || '').match(DATA_URL_PATTERN);
    if (!match) {
      throw imageError;
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const stored = await storeFileBuffer(
      buffer,
      scopedFolder,
      `${publicIdPrefix}.${mimeType.split('/')[1] || 'bin'}`,
      { mimeType },
    );
    return toLocalUploadResult(stored);
  }
};

export const uploadDataUrlToCloudinary = async ({
  dataUrl,
  folder = env.uploadFolder || 'taxi',
  publicIdPrefix = 'driver-document',
}) => uploadViaLocalStorage({ dataUrl, folder, publicIdPrefix });

export const uploadRawFileToCloudinary = async ({
  dataUrl,
  folder = env.uploadFolder || 'taxi',
  publicIdPrefix = 'career-resume',
}) => uploadViaLocalStorage({ dataUrl, folder, publicIdPrefix });

export default { uploadDataUrlToCloudinary, uploadRawFileToCloudinary };
