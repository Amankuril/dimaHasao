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
    }
};
