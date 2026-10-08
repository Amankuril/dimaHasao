/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/support/SupportTickets.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Filter, Send } from 'lucide-react-native';
import { adminSupportService } from '../../../shared/services/supportTicketService';
import {
  Button,
  Div,
  H1,
  H3,
  Input,
  Option,
  P,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../../components/web';
const statusBadgeClass = (status) => {
  if (status === 'closed') return 'bg-emerald-50 text-emerald-600';
  if (status === 'assigned') return 'bg-indigo-50 text-indigo-600';
  return 'bg-amber-50 text-amber-600';
};
const SupportTickets = () => {
  const [stats, setStats] = useState({
    totalTickets: 0,
    pendingTickets: 0,
    assignedTickets: 0,
    closedTickets: 0,
  });
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTicketCode, setSelectedTicketCode] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResponse, listResponse] = await Promise.all([
        adminSupportService.getTicketStats(),
        adminSupportService.listTickets({
          status: statusFilter,
          userType: userTypeFilter,
          search: search || undefined,
          page: 1,
          limit: 100,
        }),
      ]);
      setStats(statsResponse?.data || {});
      setTickets(listResponse?.data?.results || []);
    } catch (apiError) {
      setError(apiError?.message || 'Unable to load support tickets');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, [statusFilter, userTypeFilter]);
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  const selectedListTicket = useMemo(() => tickets.find((item) => item.ticketCode === selectedTicketCode) || null, [tickets, selectedTicketCode]);
  useEffect(() => {
    const ticketCode = selectedListTicket?.ticketCode;
    if (!ticketCode) {
      setSelectedTicket(null);
      return;
    }
    let active = true;
    const loadTicket = async () => {
      try {
        const response = await adminSupportService.getTicket(ticketCode);
        if (!active) return;
        setSelectedTicket(response?.data || null);
      } catch (apiError) {
        if (!active) return;
        setError(apiError?.message || 'Unable to load ticket detail');
      }
    };
    loadTicket();
    return () => {
      active = false;
    };
  }, [selectedListTicket?.ticketCode]);
  const updateTicket = async (payload) => {
    if (!selectedTicketCode) return;
    try {
      await adminSupportService.updateTicket(selectedTicketCode, payload);
      await loadData();
      const detail = await adminSupportService.getTicket(selectedTicketCode);
      setSelectedTicket(detail?.data || null);
    } catch (apiError) {
      setError(apiError?.message || 'Unable to update ticket');
    }
  };
  const handleReply = async () => {
    const message = String(replyText || '').trim();
    if (!message || !selectedTicketCode) return;
    setSending(true);
    setError('');
    try {
      await adminSupportService.replyTicket(selectedTicketCode, {
        message,
      });
      setReplyText('');
      await loadData();
      const detail = await adminSupportService.getTicket(selectedTicketCode);
      setSelectedTicket(detail?.data || null);
    } catch (apiError) {
      setError(apiError?.message || 'Unable to send reply');
    } finally {
      setSending(false);
    }
  };
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <Div className="mb-6">
        <Div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
          <Span>Support Management</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Support Tickets</Span>
        </Div>
        <H1 className="text-xl text-gray-900 font-bold">Support Tickets</H1>
      </Div>

      {error ? <Div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</Div> : null}

      <Div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Div className="rounded-xl border border-gray-200 bg-white p-4">
          <P className="text-xs font-semibold text-gray-500">Total Tickets</P>
          <P className="mt-2 text-2xl font-semibold text-gray-900">{stats.totalTickets || 0}</P>
        </Div>
        <Div className="rounded-xl border border-gray-200 bg-white p-4">
          <P className="text-xs font-semibold text-gray-500">Pending Tickets</P>
          <P className="mt-2 text-2xl font-semibold text-amber-600">{stats.pendingTickets || 0}</P>
        </Div>
        <Div className="rounded-xl border border-gray-200 bg-white p-4">
          <P className="text-xs font-semibold text-gray-500">Assigned Tickets</P>
          <P className="mt-2 text-2xl font-semibold text-indigo-600">{stats.assignedTickets || 0}</P>
        </Div>
        <Div className="rounded-xl border border-gray-200 bg-white p-4">
          <P className="text-xs font-semibold text-gray-500">Closed Tickets</P>
          <P className="mt-2 text-2xl font-semibold text-emerald-600">{stats.closedTickets || 0}</P>
        </Div>
      </Div>

      <Div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Div className="rounded-xl border border-gray-200 bg-white">
          <Div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
            <Div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500">
              <UiIcon as={Filter} size={15} />
              <Span>Filters</Span>
            </Div>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <Option value="all">All status</Option>
              <Option value="pending">Pending</Option>
              <Option value="assigned">Assigned</Option>
              <Option value="closed">Closed</Option>
            </Select>
            <Select
              value={userTypeFilter}
              onChange={(event) => setUserTypeFilter(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <Option value="all">All user types</Option>
              <Option value="user">User</Option>
              <Option value="driver">Driver</Option>
              <Option value="owner">Owner</Option>
            </Select>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ticket..."
              className="min-w-[220px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </Div>

          <Div>
            <Table cols={[110, 200, 170, 120, 100]} className="w-full">
              <Thead>
                <Tr className="border-b border-gray-100 bg-gray-50">
                  <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Ticket ID</Th>
                  <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Title</Th>
                  <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">User</Th>
                  <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</Th>
                  <Th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                      Loading support tickets...
                    </Td>
                  </Tr>
                ) : tickets.length === 0 ? (
                  <Tr>
                    <Td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                      No support ticket found.
                    </Td>
                  </Tr>
                ) : (
                  tickets.map((ticket) => (
                    <Tr key={ticket.id} className="border-b border-gray-50 last:border-b-0">
                      <Td className="px-4 py-3 text-xs font-semibold text-gray-700">{ticket.ticketCode}</Td>
                      <Td className="px-4 py-3 text-sm font-medium text-gray-900">{ticket.title}</Td>
                      <Td className="px-4 py-3 text-sm text-gray-600">
                        <P className="font-medium text-gray-800">{ticket.requesterName}</P>
                        <P className="text-xs text-gray-500">{ticket.userType}</P>
                      </Td>
                      <Td className="px-4 py-3">
                        <Span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(ticket.status)}`}>{ticket.status}</Span>
                      </Td>
                      <Td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          onClick={() => setSelectedTicketCode(ticket.ticketCode)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          View
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Div>
        </Div>

        <Div className="rounded-xl border border-gray-200 bg-white p-5">
          {!selectedTicket ? (
            <Div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">
              Select ticket to view detail
            </Div>
          ) : (
            <Div className="space-y-4">
              <Div>
                <P className="text-xs font-semibold uppercase tracking-wide text-gray-500">{selectedTicket.ticketCode}</P>
                <H3 className="mt-1 text-lg text-gray-900 font-bold">{selectedTicket.title}</H3>
                <P className="mt-1 text-sm text-gray-500">
                  {selectedTicket.requesterName} • {selectedTicket.requesterPhone || 'N/A'} • {selectedTicket.userType}
                </P>
              </Div>

              <Div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  onClick={() =>
                    updateTicket({
                      assignToMe: true,
                    })
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Assign To Me
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    updateTicket({
                      status: 'closed',
                    })
                  }
                  className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  Mark Closed
                </Button>
              </Div>

              <ScrollDiv className="max-h-72 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                {(selectedTicket.messages || []).map((message) => (
                  <Div key={message.id} className="rounded-lg border border-gray-100 bg-white p-3">
                    <P className="text-xs font-semibold uppercase text-gray-500">
                      {message.senderRole} • {message.senderName}
                    </P>
                    <P className="mt-1 text-sm text-gray-800">{message.message}</P>
                  </Div>
                ))}
              </ScrollDiv>

              <Div className="space-y-2">
                <Textarea
                  rows={3}
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Write reply..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <Button
                  type="button"
                  onClick={handleReply}
                  disabled={sending || !replyText.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UiIcon as={Send} size={15} />
                  {sending ? 'Sending...' : 'Send Reply'}
                </Button>
              </Div>
            </Div>
          )}
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default SupportTickets;
