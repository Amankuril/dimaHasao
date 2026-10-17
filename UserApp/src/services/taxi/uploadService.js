/**
 * Ported verbatim from Frontend/src/modules/Taxi/shared/services/uploadService.js.
 */
import api from './axiosInstance';

export const uploadService = {
  uploadImage: async (base64Image, folder = 'general') => {
    const response = await api.post('/common/upload/image', {image: base64Image, folder});
    return response?.data || response;
  },
};

export default uploadService;
