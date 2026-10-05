import api from './client';

/** Global Settings: support contacts and which policies are published. Public. */
export const platformApi = {
  settings: (module = 'platform') => api.get('/platform/settings', { params: { module } }),
  /** GET /legal/:slug?module= — a published policy (web: LegalDocumentPage). */
  legal: (slug, module = 'platform') => api.get(`/legal/${encodeURIComponent(slug)}`, { params: { module } }),
};

/** Public CMS pages, e.g. /food/pages/terms (web: CMSPage via the shared client). */
export const cmsApi = {
  get: (endpoint) => api.get(endpoint),
};

/** Food business settings, public (web: loadBusinessSettings). */
export const businessSettingsApi = {
  getPublic: () => api.get('/food/admin/business-settings/public'),
};
