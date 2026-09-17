/**
 * The consumer help desk.
 *
 * One endpoint for every service: the customer picks what they need help with
 * and the server files the ticket against that module, so their history reads
 * as one list rather than one per app.
 */
import apiClient from '../../../services/api/axios';

const unwrap = (response) => response?.data ?? {};

/** The help screen's categories → the module that owns the ticket. */
export const MODULE_BY_CATEGORY = {
  Taxi: 'taxi',
  Hotel: 'hotel',
  Food: 'food',
  Tour: 'tours',
  // A refund question is not any one service's, so it goes to the platform desk.
  Payment: 'platform',
};

export const raiseSupportTicket = async ({ category, issueType, description }) =>
  unwrap(await apiClient.post('/support', {
    module: MODULE_BY_CATEGORY[category] || 'platform',
    category: 'other',
    issueType: issueType || category,
    description,
  }));

export const fetchMySupportTickets = async () =>
  unwrap(await apiClient.get('/support')).tickets || [];

export const replyToSupportTicket = async (ticketId, message) =>
  unwrap(await apiClient.post(`/support/${ticketId}/messages`, { message }));

export default { MODULE_BY_CATEGORY, raiseSupportTicket, fetchMySupportTickets, replyToSupportTicket };
