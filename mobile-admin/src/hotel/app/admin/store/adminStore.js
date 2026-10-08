/* Ported from Frontend/src/modules/Hotel/app/admin/store/adminStore.js (tools/port.js first pass). */
import { create } from 'zustand';
import api, { createApi } from '../../../../api/client';
import { API_BASE_URL } from '../../../config/apiConfig';

// axios.create({ baseURL: API_BASE_URL }). The app client attaches the admin
// session's bearer token itself, which is what the web's request interceptor does.
const baseInstance = createApi('/hotel');

// The web's response interceptor: a 401 on this instance logs the store out.
const on401 = (error) => {
  if (error.response?.status === 401) {
    useAdminStore.getState().logout();
  }
  return Promise.reject(error);
};
const axiosInstance = {
  get: (p, c) => baseInstance.get(p, c).catch(on401),
  post: (p, b, c) => baseInstance.post(p, b, c).catch(on401),
  put: (p, b, c) => baseInstance.put(p, b, c).catch(on401),
  patch: (p, b, c) => baseInstance.patch(p, b, c).catch(on401),
  delete: (p, c) => baseInstance.delete(p, c).catch(on401),
  upload: (p, f, o) => baseInstance.upload(p, f, o).catch(on401),
};
const useAdminStore = create((set, get) => ({
  admin: null,
  token: localStorage.getItem('adminToken') || null,
  isAuthenticated: false,
  loading: true,
  setToken: (token) => {
    if (token) {
      localStorage.setItem('adminToken', token);
      set({
        token,
        isAuthenticated: true,
      });
    } else {
      localStorage.removeItem('adminToken');
      set({
        token: null,
        isAuthenticated: false,
        admin: null,
      });
    }
  },
  login: async (email, password) => {
    try {
      const response = await api.post(`${API_BASE_URL}/auth/admin/login`, {
        email,
        password,
      });
      const { token, user } = response.data;
      localStorage.setItem('adminToken', token);
      set({
        admin: user,
        token,
        isAuthenticated: true,
        loading: false,
      });
      return {
        success: true,
      };
    } catch (error) {
      console.error('Admin Login Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  },
  logout: () => {
    localStorage.removeItem('adminToken');
    set({
      admin: null,
      token: null,
      isAuthenticated: false,
    });
  },
  checkAuth: async () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'undefined' || token === 'null') {
      localStorage.removeItem('adminToken');
      set({
        isAuthenticated: false,
        admin: null,
        loading: false,
      });
      return;
    }
    try {
      const response = await axiosInstance.get('/auth/me');
      if (response.data.user && ['admin', 'superadmin'].includes(response.data.user.role)) {
        set({
          admin: response.data.user,
          token,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        get().logout();
        set({
          loading: false,
        });
      }
    } catch (error) {
      // Only log non-401 errors (401 is expected when not logged in)
      if (error.response?.status !== 401) {
        console.error('Check Auth Error:', error);
      }
      if (error.response?.status === 401) {
        get().logout();
      }
      set({
        loading: false,
      });
    }
  },
}));

export { axiosInstance };
export default useAdminStore;
