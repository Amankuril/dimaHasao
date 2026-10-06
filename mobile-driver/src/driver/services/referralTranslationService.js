import api from '../api/client';

// Web: Taxi/modules/shared/services/referralTranslationService.js
export const getReferralSettingsContent = (type) =>
  api.get('/common/referrals/settings', {
    params: type ? { type } : undefined,
  });
