/**
 * Ported verbatim from Frontend/src/modules/Taxi/modules/user/services/userService.js.
 */
import api from './axiosInstance';

const APP_MODULES_DEDUPE_MS = 3000;
let appModulesInflight = null;

export const userService = {
  getAppModules: async params => {
    const key = JSON.stringify(params ?? null);
    if (appModulesInflight && appModulesInflight.key === key) {
      return appModulesInflight.promise;
    }

    const promise = api.get('/users/app-modules', {params});
    appModulesInflight = {key, promise};
    setTimeout(() => {
      if (appModulesInflight?.promise === promise) appModulesInflight = null;
    }, APP_MODULES_DEDUPE_MS);

    try {
      return await promise;
    } catch (error) {
      if (appModulesInflight?.promise === promise) appModulesInflight = null;
      throw error;
    }
  },
  getIntercityPackages: async () => api.get('/users/intercity-packages'),
  getServiceLocations: async () => api.get('/users/service-locations'),
  getServiceStores: async () => api.get('/users/service-stores'),
  getAvailablePromos: async params => api.get('/promos/available', {params}),
  validatePromo: async payload => api.post('/promos/validate', payload),
};

export default userService;
