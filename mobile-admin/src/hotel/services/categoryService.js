/* Ported from Frontend/src/modules/Hotel/services/categoryService.js (tools/port.js first pass). */
import { api } from './apiService';
export const categoryService = {
  getActiveCategories: async () => {
    try {
      const response = await api.get('/categories/active');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }
  },
};
