import { sessionStore } from '../lib/storage';
import { clearOnboardingFcmLocal } from './push';

/*
 * Port of utils/deliveryOnboardingStorage.js. The web keeps picked document
 * images in IndexedDB (with an in-memory fallback) so they survive a page
 * reload; an app process does not reload, so the in-memory copy is the
 * store here and lives exactly as long as the web's sessionStorage keys.
 */

export const DELIVERY_SIGNUP_DOC_TYPES = ['profilePhoto', 'aadharPhoto', 'panPhoto', 'drivingLicensePhoto'];

const ONBOARDING_SESSION_KEYS = ['deliverySignupDetails', 'deliverySignupDocs', 'deliveryNeedsRegistration', 'deliveryAuthData'];

const signupDocumentMemory = Object.create(null);

export function saveSignupDocument(docType, file) {
  if (!DELIVERY_SIGNUP_DOC_TYPES.includes(docType) || !file?.uri) return;
  signupDocumentMemory[docType] = file;
}

export function getAllSignupDocuments() {
  return DELIVERY_SIGNUP_DOC_TYPES.reduce((acc, docType) => {
    acc[docType] = signupDocumentMemory[docType] || null;
    return acc;
  }, {});
}

export function deleteSignupDocument(docType) {
  delete signupDocumentMemory[docType];
}

export function clearSignupDocuments() {
  DELIVERY_SIGNUP_DOC_TYPES.forEach((d) => delete signupDocumentMemory[d]);
}

export const hasDeliveryStep1Progress = (formData = {}) => {
  const textFields = ['name', 'email', 'address', 'city', 'state', 'vehicleName', 'vehicleNumber', 'drivingLicenseNumber', 'panNumber', 'aadharNumber'];
  if (textFields.some((field) => String(formData[field] || '').trim())) return true;
  return Boolean(formData.vehicleType && formData.vehicleType !== 'bike');
};

const getOnboardingPhoneDigits = () => {
  try {
    const details = JSON.parse(sessionStore.getItem('deliverySignupDetails') || '{}');
    return String(details.phone || '').replace(/\D/g, '');
  } catch {
    return '';
  }
};

/** Wipes onboarding progress. `clearSession` drops the delivery session (web: clearModuleAuth). */
export async function clearDeliveryOnboardingData(clearSession) {
  const phone = getOnboardingPhoneDigits();
  ONBOARDING_SESSION_KEYS.forEach((key) => sessionStore.removeItem(key));
  if (phone) {
    sessionStore.removeItem(`delivery_block_expires_at_${phone}`);
    sessionStore.removeItem(`delivery_resend_expires_at_${phone}`);
  }
  sessionStore.removeItem('delivery_block_expires_at');
  sessionStore.removeItem('delivery_resend_expires_at');
  clearSignupDocuments();
  clearOnboardingFcmLocal('delivery');
  await clearSession?.();
}
