import api from '../../../shared/api/axiosInstance';

export const getReferralSettingsContent = (type) =>
  api.get('/common/referrals/settings', {
    params: type ? { type } : undefined,
  });
