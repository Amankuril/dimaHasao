/**
 * Ported verbatim from Frontend/src/modules/Taxi/modules/shared/services/supportTicketService.js
 * (rider-facing calls only — admin ones stay out of this app's scope).
 */
import api from './axiosInstance';

export const supportTicketService = {
  getTitles: userType => api.get('/support/titles', {params: userType ? {userType} : {}}),
  createTicket: payload => api.post('/support/tickets', payload),
  listMyTickets: (params = {}) => api.get('/support/tickets/my', {params}),
  getMyTicket: ticketCode => api.get(`/support/tickets/${encodeURIComponent(ticketCode)}`),
  replyMyTicket: (ticketCode, payload) => api.post(`/support/tickets/${encodeURIComponent(ticketCode)}/reply`, payload),
};

export default supportTicketService;
