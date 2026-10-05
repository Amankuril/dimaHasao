import taxiApi from './client';

/*
 * Services of the taxi account screens that the shared taxi services do not
 * have. Web: modules/shared/services/{supportTicketService,referralTranslationService}.js,
 * shared/services/uploadService.js. Account/wallet/notification calls live in
 * services/authService.js and services/userService.js.
 */
export const getReferralSettingsContent = (type) => taxiApi.get('/common/referrals/settings', { params: type ? { type } : undefined });

export const supportTicketService = {
  getTitles: (userType) => taxiApi.get('/support/titles', { params: userType ? { userType } : {} }),
  createTicket: (payload) => taxiApi.post('/support/tickets', payload),
  listMyTickets: (params = {}) => taxiApi.get('/support/tickets/my', { params }),
  getMyTicket: (code) => taxiApi.get(`/support/tickets/${encodeURIComponent(code)}`),
  replyMyTicket: (code, payload) => taxiApi.post(`/support/tickets/${encodeURIComponent(code)}/reply`, payload),
};

export const uploadImage = async (dataUrl, folder = 'general') => {
  const res = await taxiApi.post('/common/upload/image', { image: dataUrl, folder });
  return res?.data || res;
};
