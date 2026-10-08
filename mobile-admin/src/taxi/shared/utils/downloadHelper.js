/* Ported from Frontend/src/modules/Taxi/shared/utils/downloadHelper.js. */
import { saveBase64File, saveTextFile } from '../../../lib/files';

/**
 * Centralized Binary File Download Handler
 *
 * The web wraps the report response in a Blob and clicks a hidden <a download>.
 * Here the bytes are written to a file and handed to the share sheet
 * (lib/files), which is this app's equivalent of the browser download. The file
 * name and extension are built exactly as on the web.
 *
 * `data` is what the taxi axios instance resolves for `responseType: 'blob'`
 * (a Blob), or the raw text for a CSV. Unlike the web helper this is async, so
 * callers await the boolean result.
 */
const mimeTypes = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  pdf: 'application/pdf',
  zip: 'application/zip',
};

const extensions = {
  excel: 'xlsx',
  csv: 'csv',
  pdf: 'pdf',
  zip: 'zip',
};

/** The base64 payload of a Blob (React Native's FileReader reads a data: URL). */
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read the downloaded file'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });

export const triggerFileDownload = async (data, fileName, format) => {
  const mimeType = mimeTypes[format] || 'application/octet-stream';

  try {
    // Sanitize filename to avoid weird character issues
    const sanitizedName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const ext = extensions[format] || format;
    const name = `${sanitizedName}.${ext}`;

    if (typeof data === 'string') {
      return await saveTextFile(name, data, mimeType);
    }
    const base64 = await blobToBase64(data);
    return await saveBase64File(name, base64, mimeType);
  } catch (error) {
    console.error('Binary Download Error:', error);
    return false;
  }
};
