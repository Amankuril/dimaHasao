/**
 * Ported verbatim from
 * Frontend/src/modules/Taxi/modules/shared/services/referralTranslationService.js.
 */
import api from './axiosInstance';

export const getReferralSettingsContent = type => api.get('/common/referrals/settings', {params: type ? {type} : undefined});

export default getReferralSettingsContent;
