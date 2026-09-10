import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Ensure .env is loaded before config (needed when this module is loaded before server.js body runs)
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Path to the file on local filesystem
 * @param {string} folder - Cloudinary folder name (default: 'rukkoin')
 * @param {string} publicId - Custom public_id (optional)
 * @returns {Promise<Object>} - Upload result
 */
export const uploadToCloudinary = async (filePath, folder = 'general', publicId = null) => {
  try {
    const uploadOptions = {
      folder: `rukkoin/${folder}`,
      resource_type: 'auto',
      transformation: [
        { width: 1920, height: 1920, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    // Delete local file after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);

    // Clean up local file even on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    throw new Error('Failed to upload file to Cloudinary');
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      message: result.result === 'ok' ? 'Image deleted successfully' : 'Image not found'
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

/**
 * Upload base64 image to Cloudinary (for Flutter camera/mobile)
 * @param {string} base64String - Base64 encoded image data
 * @param {string} folder - Cloudinary folder name
 * @param {string} publicId - Custom public_id (optional)
 * @returns {Promise<Object>} - Upload result
 */
export const uploadBase64ToCloudinary = async (base64String, folder = 'general', publicId = null) => {
  try {
    // Ensure base64 string has proper data URI prefix
    let dataUri = base64String;
    if (!base64String.startsWith('data:')) {
      // If no prefix, assume it's JPEG
      dataUri = `data:image/jpeg;base64,${base64String}`;
    }

    const uploadOptions = {
      folder: `rukkoin/${folder}`,
      resource_type: 'auto',
      transformation: [
        { width: 1920, height: 1920, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    console.log(`[Cloudinary] Uploading base64 image to folder: ${folder}`);

    const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

    console.log(`[Cloudinary] Upload success: ${result.secure_url}`);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary base64 upload error:', error);
    throw new Error('Failed to upload base64 image to Cloudinary');
  }
};

/**
 * Upload video to Cloudinary (for reels)
 * @param {string} filePath - Path to the video file on local filesystem
 * @param {string} folder - Cloudinary folder name (default: 'reels')
 * @param {string} publicId - Custom public_id (optional)
 * @returns {Promise<Object>} - Upload result with url, publicId, duration
 */
export const uploadVideoToCloudinary = async (filePath, folder = 'reels', publicId = null) => {
  try {
    const uploadOptions = {
      folder: `rukkoin/${folder}`,
      resource_type: 'video',
      chunk_size: 6000000, // 6MB chunks for reliable video streaming
    };
    if (publicId) uploadOptions.public_id = publicId;

    // Use upload_large wrapped in Promise callback (Cloudinary SDK v1 upload_large requires callback to return result)
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(filePath, uploadOptions, (error, res) => {
        if (error) reject(error);
        else resolve(res);
      });
    });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const duration = result.duration != null ? Number(result.duration) : null;
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      duration,
      format: result.format,
    };
  } catch (error) {
    console.error('Cloudinary video upload error:', error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw new Error('Failed to upload video to Cloudinary: ' + (error.message || 'Unknown error'));
  }
};

/**
 * Generate thumbnail URL from Cloudinary video (frame at 0s or 1s)
 * @param {string} publicId - Cloudinary public_id of the video
 * @returns {string} - URL for thumbnail image
 */
export const getVideoThumbnailUrl = (publicId) => {
  if (!publicId) return null;
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    secure: true,
    transformation: [
      { start_offset: 0 },
      { width: 720, crop: 'limit' },
    ],
  });
};

/**
 * Delete video from Cloudinary
 * @param {string} publicId - Public ID of the video
 * @returns {Promise<Object>}
 */
export const deleteVideoFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    return {
      success: result.result === 'ok',
      message: result.result === 'ok' ? 'Video deleted successfully' : 'Video not found',
    };
  } catch (error) {
    console.error('Cloudinary video delete error:', error);
    throw new Error('Failed to delete video from Cloudinary');
  }
};

export default cloudinary;
