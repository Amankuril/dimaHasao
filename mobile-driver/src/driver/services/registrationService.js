import api from '../api/client';
import { requestOtp, verifyOtp, AUDIENCE } from '../../api/auth';
import { setAuthTokens } from '../../api/client';
import { localStore, sessionStore, setSessionSecrets } from '../../lib/storage';
import { events } from '../../lib/events';
import { signInDriver, signOutDriver } from '../utils/authBridge';

/*
 * Port of Taxi/modules/driver/services/registrationService.js, driver role only (the owner / pooling-driver /
 * bus / service-centre calls belong to other apps). localStorage -> localStore, sessionStorage -> sessionStore;
 * the token itself also lives in SecureStore (context/AuthContext).
 */

const STORAGE_KEY = 'driverRegistrationSession';
const DRIVER_AUTH_KEYS = ['token', 'driverToken', 'driverInfo', 'role', 'driverRole', 'chatRole'];
const DRIVER_PORTAL_ROLES = ['driver'];
const isDataUrl = (value) => /^data:/i.test(String(value || '').trim());

const sanitizeStoredDocumentValue = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const nextValue = { ...value };
  if (isDataUrl(nextValue.previewUrl)) nextValue.previewUrl = '';
  if (isDataUrl(nextValue.secureUrl)) nextValue.secureUrl = '';
  if (isDataUrl(nextValue.dataUrl)) delete nextValue.dataUrl;
  return nextValue;
};

const sanitizeDocumentsForStorage = (documents = {}) => {
  if (!documents || typeof documents !== 'object' || Array.isArray(documents)) return {};
  return Object.fromEntries(Object.entries(documents).map(([key, value]) => [key, sanitizeStoredDocumentValue(value)]));
};

const buildStorableDriverRegistrationSession = (session = {}) => ({
  ...session,
  documents: sanitizeDocumentsForStorage(session.documents || {}),
});

const readStoredSession = () => {
  try {
    const raw = localStore.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const getStoredDriverRegistrationSession = () => readStoredSession();

export const saveDriverRegistrationSession = (session = {}) => {
  const storableSession = buildStorableDriverRegistrationSession({ ...readStoredSession(), ...session });
  let serialized = '';
  try {
    serialized = JSON.stringify(storableSession);
    localStore.setItem(STORAGE_KEY, serialized);
  } catch {
    /* keep going with the in-memory copy */
  }
  // Hand back plain data (the web round-trips through JSON so callers never get a Proxy view).
  if (serialized) {
    try {
      return JSON.parse(serialized);
    } catch {
      /* fall through */
    }
  }
  return storableSession;
};

export const clearDriverRegistrationSession = () => {
  localStore.removeItem(STORAGE_KEY);
};

/** Drops the signed-in session (token, role, driver info) and the onboarding session. */
export const clearDriverAuthState = () => {
  clearDriverRegistrationSession();
  DRIVER_AUTH_KEYS.forEach((key) => {
    sessionStore.removeItem(key);
    localStore.removeItem(key);
  });
  setAuthTokens(null);
  setSessionSecrets({});
  return signOutDriver();
};

export const persistDriverAuthSession = ({ token = '', role = 'driver', driver = null } = {}) => {
  const normalizedRole = String(role || 'driver').toLowerCase();
  const chatRole = normalizedRole === 'owner' ? 'owner' : 'driver';

  if (token) {
    // Synchronous, like localStorage: the next request already carries the token.
    setAuthTokens({ accessToken: token, taxiToken: token });
    setSessionSecrets({ accessToken: token });
    sessionStore.setItem('token', token);
    sessionStore.setItem('driverToken', token);
  }
  sessionStore.setItem('role', normalizedRole);
  sessionStore.setItem('driverRole', normalizedRole);
  sessionStore.setItem('chatRole', chatRole);
  localStore.setItem('role', normalizedRole);
  localStore.setItem('driverRole', normalizedRole);
  localStore.setItem('chatRole', chatRole);

  if (!token) {
    events.emit('app:auth-ready', { role: normalizedRole, hasToken: Boolean(readLocalDriverToken()), source: 'driver' });
    return Promise.resolve(null);
  }
  return signInDriver({ token, role: normalizedRole, driver });
};

/** The driver-portal role a token claims, or '' if it does not claim one. */
export const normalizeDriverPortalRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  return normalized === 'driver' ? 'driver' : '';
};

export const sendDriverOtp = (payload) => api.post('/drivers/onboarding/send-otp', payload);

export const verifyDriverOtp = (payload) => api.post('/drivers/onboarding/verify-otp', payload);

// Driver *login* goes through the shared auth surface. The onboarding OTPs above stay on their own routes.
export const sendDriverLoginOtp = ({ phone, ...rest } = {}) => requestOtp(AUDIENCE.TAXI_DRIVER, phone, rest);

export const verifyDriverLoginOtp = ({ phone, otp, ...rest } = {}) => verifyOtp(AUDIENCE.TAXI_DRIVER, phone, otp, rest);

export const getDriverOnboardingSession = ({ registrationId, phone }) =>
  api.get(`/drivers/onboarding/session/${encodeURIComponent(registrationId)}`, { params: phone ? { phone } : {} });

export const saveDriverPersonalDetails = (payload) => api.patch('/drivers/onboarding/personal', payload);

export const saveDriverReferral = (payload) => api.patch('/drivers/onboarding/referral', payload);

export const saveDriverVehicle = (payload) => api.patch('/drivers/onboarding/vehicle', payload);

export const saveDriverDocuments = (payload) => api.patch('/drivers/onboarding/documents', payload);

export const completeDriverOnboarding = (payload) => api.post('/drivers/onboarding/complete', payload);

export const buildDriverOnboardingSessionSnapshot = (payload = {}, fallbackSession = {}) => {
  const serverSession = payload?.session || {};
  const personal = payload?.personal || {};
  const vehicle = payload?.vehicle || {};
  const documents = payload?.documents || {};

  return {
    ...fallbackSession,
    registrationId: serverSession.registrationId || fallbackSession.registrationId || '',
    phone: serverSession.phone || fallbackSession.phone || '',
    role: serverSession.role || fallbackSession.role || 'driver',
    roleConfirmed: true,
    status: serverSession.status || fallbackSession.status || '',
    otpVerified:
      serverSession.otpVerified === true ||
      serverSession.status === 'otp_verified' ||
      serverSession.status === 'personal_saved' ||
      serverSession.status === 'vehicle_saved' ||
      serverSession.status === 'documents_saved',
    fullName: personal.fullName || fallbackSession.fullName || '',
    email: personal.email || fallbackSession.email || '',
    gender: personal.gender || fallbackSession.gender || '',
    referralCode: payload?.referralCode !== undefined ? payload.referralCode : fallbackSession.referralCode || '',
    registerFor: vehicle.registerFor || fallbackSession.registerFor || '',
    serviceCategories: Array.isArray(vehicle.serviceCategories) ? vehicle.serviceCategories : fallbackSession.serviceCategories || [],
    locationId: vehicle.locationId || fallbackSession.locationId || '',
    vehicleTypeId: vehicle.vehicleTypeId || fallbackSession.vehicleTypeId || '',
    rcNumber: vehicle.rcNumber || fallbackSession.rcNumber || '',
    make: vehicle.make || fallbackSession.make || '',
    model: vehicle.model || fallbackSession.model || '',
    year: vehicle.year || fallbackSession.year || '',
    number: vehicle.number || fallbackSession.number || '',
    color: vehicle.color || fallbackSession.color || '',
    companyName: vehicle.companyName || fallbackSession.companyName || '',
    companyAddress: vehicle.companyAddress || fallbackSession.companyAddress || '',
    city: vehicle.city || fallbackSession.city || '',
    postalCode: vehicle.postalCode || fallbackSession.postalCode || '',
    taxNumber: vehicle.taxNumber || fallbackSession.taxNumber || '',
    customFields: vehicle.customFields || fallbackSession.customFields || {},
    roleDetails: payload?.roleDetails || fallbackSession.roleDetails || {},
    documents,
    otpSession: payload?.session || fallbackSession.otpSession || null,
    personalSession: payload?.session || fallbackSession.personalSession || null,
    referralSession: payload?.session || fallbackSession.referralSession || null,
    vehicleSession: payload?.session
      ? { ...(fallbackSession.vehicleSession || {}), vehicle, status: payload?.session?.status || fallbackSession.vehicleSession?.status || '' }
      : fallbackSession.vehicleSession || null,
  };
};

export const getDriverOnboardingResumeStep = (session = {}) => {
  const status = String(session?.status || '').toLowerCase();
  const hasPersonal = Boolean(String(session?.fullName || '').trim() && String(session?.email || '').trim() && String(session?.gender || '').trim());
  const hasVehicle = Boolean(
    String(session?.vehicle?.locationId || session?.locationId || '').trim() && String(session?.vehicle?.vehicleTypeId || session?.vehicleTypeId || '').trim(),
  );

  if (!session?.otpVerified && !['otp_verified', 'personal_saved', 'vehicle_saved', 'documents_saved'].includes(status)) return 'otp-verify';
  if (status === 'vehicle_saved' || status === 'documents_saved' || hasVehicle) return 'step-documents';
  if (status === 'personal_saved' || hasPersonal) return 'step-vehicle';
  return 'step-personal';
};

const decodeBase64Url = (value) => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return normalized + '='.repeat(padding);
};

const getTokenPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(decodeBase64Url(payload)));
  } catch {
    return null;
  }
};

const getPersistedDriverToken = () => {
  const persistedDriverToken = String(localStore.getItem('driverToken') || '');
  if (persistedDriverToken) return persistedDriverToken;
  const persistedGenericToken = String(localStore.getItem('token') || '');
  if (DRIVER_PORTAL_ROLES.includes(normalizeDriverPortalRole(getTokenPayload(persistedGenericToken)?.role))) return persistedGenericToken;
  return '';
};

export const getStoredDriverRole = () =>
  sessionStore.getItem('driverRole') ||
  sessionStore.getItem('role') ||
  normalizeDriverPortalRole(getTokenPayload(getPersistedDriverToken())?.role) ||
  String(localStore.getItem('driverRole') || localStore.getItem('role') || 'driver').toLowerCase();

const readLocalDriverToken = () => {
  const direct = sessionStore.getItem('driverToken');
  if (direct) return direct;
  const fallback = sessionStore.getItem('token');
  if (DRIVER_PORTAL_ROLES.includes(normalizeDriverPortalRole(getTokenPayload(fallback)?.role))) return fallback;
  return getPersistedDriverToken();
};

export const getLocalDriverToken = readLocalDriverToken;

export const getAuthenticatedDriverRole = () => {
  const tokenPayloadRole = normalizeDriverPortalRole(getTokenPayload(readLocalDriverToken())?.role);
  const storedRole = normalizeDriverPortalRole(getStoredDriverRole());
  return tokenPayloadRole || storedRole || 'driver';
};

const withDriverAuth = (config = {}) => {
  const token = readLocalDriverToken();
  if (!token) return config;
  return { ...config, headers: { ...(config.headers || {}), Authorization: `Bearer ${token}` } };
};

export const getCurrentDriver = () => api.get('/drivers/me', withDriverAuth());

export const getDriverRideHistory = (params = {}) => api.get('/rides', withDriverAuth({ params }));

export const updateDriverProfile = (payload) => api.patch('/drivers/me', payload, withDriverAuth());
export const deleteCurrentDriverAccount = (reason = '') => api.delete('/drivers/me', withDriverAuth({ data: { reason } }));
export const requestDriverAccountDeletion = (reason) => api.post('/drivers/me/delete-request', { reason }, withDriverAuth());
export const getDriverNotifications = (params = {}) => api.get('/drivers/notifications', withDriverAuth({ params }));
export const getDriverScheduledRides = (params = {}) => api.get('/drivers/scheduled-rides', withDriverAuth({ params }));
export const cancelDriverScheduledRide = (rideId) => api.post(`/drivers/scheduled-rides/${rideId}/cancel`, {}, withDriverAuth());
export const deleteDriverNotification = (id) => api.delete(`/drivers/notifications/${id}`, withDriverAuth());
export const clearAllDriverNotifications = () => api.delete('/drivers/notifications', withDriverAuth());
export const getDriverEmergencyContacts = () => api.get('/drivers/emergency-contacts', withDriverAuth());
export const saveDriverFcmToken = (token, platform) => api.post('/drivers/fcm-token', { token, platform }, withDriverAuth());
export const addDriverEmergencyContact = (payload) => api.post('/drivers/emergency-contacts', payload, withDriverAuth());
export const deleteDriverEmergencyContact = (contactId) => api.delete(`/drivers/emergency-contacts/${contactId}`, withDriverAuth());

export const updateDriverVehicle = (payload) => api.patch('/drivers/vehicle', payload, withDriverAuth());
export const deleteDriverVehicle = (vehicleId) => api.delete(`/drivers/vehicle/${vehicleId}`, withDriverAuth());

export const getDriverVehicleTypes = async () => {
  const authConfig = withDriverAuth();
  const hasDriverAuthorization = Boolean(authConfig?.headers?.Authorization || authConfig?.headers?.authorization);

  if (hasDriverAuthorization) {
    try {
      return await api.get('/admin/types/vehicle-types', authConfig);
    } catch (error) {
      const status = Number(error?.response?.status || error?.status || 0);
      if (status && status !== 401 && status !== 403) throw error;
    }
  }
  return api.get('/users/vehicle-types');
};

export const getDriverApprovalStatus = () => api.get('/drivers/approval-status', withDriverAuth({ params: { t: Date.now() } }));

export const getDriverRegistrationSession = ({ registrationId, phone }) =>
  api.get(`/drivers/onboarding/session/${registrationId}`, { params: { phone } });

export const getDriverServiceLocations = () => api.get('/drivers/service-locations');
export const getDriverDocumentTemplates = (role = 'driver') => api.get('/drivers/document-templates', { params: { role } });
export const getDriverVehicleFieldTemplates = (role = 'driver') => api.get('/drivers/vehicle-field-templates', { params: { role } });

export const updateDriverDocument = (documentKey, document) =>
  api.patch(`/drivers/documents/${encodeURIComponent(documentKey)}`, { document }, withDriverAuth());
export const getDriverIncentives = () => api.get('/drivers/incentives', withDriverAuth());

export const claimDriverIncentiveReward = (payload) => api.post('/drivers/incentives/claim', payload, withDriverAuth());
