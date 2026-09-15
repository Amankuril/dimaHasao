/**
 * Image upload for the tours panels.
 *
 * Talks to the platform's single upload service at /v1/uploads — the same one
 * food, taxi and hotel use. It converts whatever is sent into a compressed
 * WebP, so the panels do not resize or re-encode anything client-side.
 *
 * `replaceUrl` matters: passing the URL currently on the record makes the
 * server delete the old file as it writes the new one, so editing an image ten
 * times leaves one file on disk rather than ten.
 */
import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

// API_BASE_URL is scoped to /tours; uploads live one level up at the API root.
const UPLOAD_ROOT = API_BASE_URL.replace(/\/tours$/, '');

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * @param {File} file
 * @param {{folder?: string, replaceUrl?: string}} [options]
 * @returns {Promise<string>} the stored URL
 */
export const uploadImage = async (file, { folder = 'tours/destinations', replaceUrl } = {}) => {
  if (!file) throw new Error('Choose an image first');
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('That file is not an image');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Images must be under 10MB');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  if (replaceUrl) form.append('replaceUrl', replaceUrl);

  try {
    const { data } = await axios.post(`${UPLOAD_ROOT}/uploads/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    const url = data?.data?.url;
    if (!url) throw new Error('The server did not return an image URL');
    return url;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Upload failed');
  }
};

/** Remove a stored image. Best-effort — a failed delete must not block a save. */
export const deleteImage = async (url) => {
  if (!url) return false;
  try {
    await axios.delete(`${UPLOAD_ROOT}/uploads`, { data: { url } });
    return true;
  } catch {
    return false;
  }
};

export default { uploadImage, deleteImage, MAX_UPLOAD_BYTES };
