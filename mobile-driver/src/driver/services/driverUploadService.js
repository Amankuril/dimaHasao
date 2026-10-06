import { File } from 'expo-file-system';
import api from '../api/client';

/*
 * Port of Taxi/shared/services/uploadService.js plus the web's FileReader.readAsDataURL step:
 * a picked image ({ uri, type } from lib/images.js) is read as a base64 data URL and posted as JSON.
 */
export const uploadService = {
  /**
   * @param {string} base64Image a `data:image/...;base64,` URL
   * @param {string} folder destination folder
   */
  uploadImage: async (base64Image, folder = 'general') => {
    try {
      const response = await api.post('/common/upload/image', { image: base64Image, folder });
      return response?.data || response;
    } catch (error) {
      console.error('Upload Service Error:', error);
      throw error;
    }
  },
};

/** FileReader.readAsDataURL(file) for a picked image file. */
export async function readFileAsDataUrl(file) {
  try {
    const base64 = await new File(file.uri).base64();
    return `data:${file.type || 'image/jpeg'};base64,${base64}`;
  } catch {
    throw new Error('Unable to read selected image');
  }
}
