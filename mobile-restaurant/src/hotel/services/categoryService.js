import { api } from './apiService';

/* Port of Frontend/src/modules/Hotel/services/categoryService.js. */

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
