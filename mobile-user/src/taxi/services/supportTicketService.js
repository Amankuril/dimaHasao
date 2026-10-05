// User slice of Taxi/modules/shared/services/supportTicketService.js (the admin calls are not part of this app).
import api from '../api/client';

export const supportTicketService = {
  getTitles: (userType) =>
    api.get('/support/titles', {
      params: userType ? { userType } : {},
    }),

  createTicket: (payload) => api.post('/support/tickets', payload),
  listMyTickets: (params = {}) => api.get('/support/tickets/my', { params }),
  getMyTicket: (ticketCode) => api.get(`/support/tickets/${encodeURIComponent(ticketCode)}`),
  replyMyTicket: (ticketCode, payload) =>
    api.post(`/support/tickets/${encodeURIComponent(ticketCode)}/reply`, payload),
};
