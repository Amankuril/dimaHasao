import { create } from 'zustand';
import axios from 'axios';

import { API_BASE_URL } from '../../../config/apiConfig';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const useAdminStore = create((set, get) => ({
  admin: null,
  token: localStorage.getItem('adminToken') || null,
  isAuthenticated: false,
  loading: true,

  setToken: (token) => {
    if (token) {
      localStorage.setItem('adminToken', token);
      set({ token, isAuthenticated: true });
    } else {
      localStorage.removeItem('adminToken');
      set({ token: null, isAuthenticated: false, admin: null });
    }
  },

  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/admin/login`, { email, password });
      const { token, user } = response.data;

      localStorage.setItem('adminToken', token);
      set({ admin: user, token, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (error) {
      console.error('Admin Login Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    set({ admin: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'undefined' || token === 'null') {
      localStorage.removeItem('adminToken');
      set({ isAuthenticated: false, admin: null, loading: false });
      return;
    }

    try {
      const response = await axiosInstance.get('/auth/me');

      if (response.data.user && ['admin', 'superadmin'].includes(response.data.user.role)) {
        set({
          admin: response.data.user,
          token,
          isAuthenticated: true,
          loading: false
        });
      } else {
        get().logout();
        set({ loading: false });
      }
    } catch (error) {
      // Only log non-401 errors (401 is expected when not logged in)
      if (error.response?.status !== 401) {
        console.error('Check Auth Error:', error);
      }
      if (error.response?.status === 401) {
        get().logout();
      }
      set({ loading: false });
    }
  }
}));

// Add response interceptor to handle 401 globally for this instance
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAdminStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export { axiosInstance };
export default useAdminStore;
