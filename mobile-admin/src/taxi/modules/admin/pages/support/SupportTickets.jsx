/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/support/SupportTickets.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Filter, Send, LifeBuoy, Inbox } from 'lucide-react-native';
import { adminSupportService } from '../../../shared/services/supportTicketService';
import { Button, Div, Input, Option, ScrollDiv, Select, Span, Textarea, Icon as UiIcon } from '../../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';

const COLS = [110, 190, 160, 110, 90];
const LABELS = ['Ticket ID', 'Title', 'User', 'Status', ''];
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
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={LifeBuoy}
        title="Support Tickets"
        subtitle="Rider, driver and owner tickets in one queue"
        breadcrumb={[{ label: 'Support Management' }, { label: 'Support Tickets' }]}
      />

      <StatGrid className="mb-4">
        <StatCard label="Total Tickets" value={stats.totalTickets || 0} tone="info" />
        <StatCard label="Pending Tickets" value={stats.pendingTickets || 0} tone="warning" />
        <StatCard label="Assigned Tickets" value={stats.assignedTickets || 0} tone="info" />
        <StatCard label="Closed Tickets" value={stats.closedTickets || 0} tone="success" />
      </StatGrid>

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Filter} size={16} className="text-slate-400" />
            <Span className="text-sm text-slate-500">Filters</Span>
          </Div>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${INPUT} min-w-[150px]`}>
            <Option value="all">All status</Option>
            <Option value="pending">Pending</Option>
            <Option value="assigned">Assigned</Option>
            <Option value="closed">Closed</Option>
          </Select>
          <Select value={userTypeFilter} onChange={(event) => setUserTypeFilter(event.target.value)} className={`${INPUT} min-w-[150px]`}>
            <Option value="all">All user types</Option>
            <Option value="user">User</Option>
            <Option value="driver">Driver</Option>
            <Option value="owner">Owner</Option>
          </Select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ticket"
            className={`${INPUT} flex-1 min-w-[180px]`}
          />
        </Toolbar>
      </Card>

      {error ? <ErrorState title="Support desk error" message={error} onRetry={loadData} className="mb-4" /> : null}

      {loading ? (
        <TableSkeleton rows={5} className="mb-4" />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No support ticket found"
          message="Nothing matches these filters. Clear the search or pick another status."
          className="mb-4"
        />
      ) : (
        <DataTable cols={COLS} className="mb-4">
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {tickets.map((ticket, i) => (
              <Row key={ticket.id} last={i === tickets.length - 1}>
                <Cell width={COLS[0]} numberOfLines={1}>{ticket.ticketCode}</Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                    {ticket.title}
                  </Span>
                </Cell>
                <Cell width={COLS[2]}>
                  <Span className="text-sm text-slate-900" numberOfLines={1}>
                    {ticket.requesterName}
                  </Span>
                  <Span className="text-xs text-slate-500" numberOfLines={1}>
                    {ticket.userType}
                  </Span>
                </Cell>
                <Cell width={COLS[3]}>
                  <StatusBadge status={ticket.status} />
                </Cell>
                <Cell width={COLS[4]} align="center">
                  <Button type="button" onClick={() => setSelectedTicketCode(ticket.ticketCode)} className="h-11 px-3 rounded-lg border border-slate-300 bg-white items-center justify-center">
                    <Span className="text-sm font-semibold text-slate-700">View</Span>
                  </Button>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      <Card>
        {!selectedTicket ? (
          <EmptyState icon={LifeBuoy} title="No ticket selected" message="Pick a ticket above to read its thread and reply." className="border-0" />
        ) : (
          <>
            <Div className="mb-3">
              <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedTicket.ticketCode}</Span>
              <Span className="text-base font-semibold text-slate-900 mt-0.5">{selectedTicket.title}</Span>
              <Span className="text-sm text-slate-500 mt-0.5">
                {`${selectedTicket.requesterName} • ${selectedTicket.requesterPhone || 'N/A'} • ${selectedTicket.userType}`}
              </Span>
            </Div>

            <Toolbar>
              <Button
                type="button"
                onClick={() =>
                  updateTicket({
                    assignToMe: true,
                  })
                }
                className={`${BTN_SECONDARY} flex-1 min-w-[150px]`}
              >
                <Span className={BTN_TEXT_SECONDARY}>Assign To Me</Span>
              </Button>
              <Button
                type="button"
                onClick={() =>
                  updateTicket({
                    status: 'closed',
                  })
                }
                className={`${BTN_SECONDARY} flex-1 min-w-[150px]`}
              >
                <Span className={BTN_TEXT_SECONDARY}>Mark Closed</Span>
              </Button>
            </Toolbar>

            <SectionTitle>Conversation</SectionTitle>
            {(selectedTicket.messages || []).length === 0 ? (
              <EmptyState icon={Inbox} title="No messages yet" message="The first reply you send starts this thread." className="border-0" />
            ) : (
              <ScrollDiv className="max-h-72 rounded-lg border border-slate-200 bg-slate-50" contentStyle={{ padding: 12, gap: 8 }}>
                {(selectedTicket.messages || []).map((message) => (
                  <Div key={message.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {`${message.senderRole} • ${message.senderName}`}
                    </Span>
                    <Span className="text-sm text-slate-800 mt-1">{message.message}</Span>
                  </Div>
                ))}
              </ScrollDiv>
            )}

            <Field label="Reply" className="mt-3">
              <Textarea
                rows={3}
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Write reply"
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </Field>
            <Button
              type="button"
              onClick={handleReply}
              disabled={sending || !replyText.trim()}
              className={`${BTN_PRIMARY} mt-3 ${sending || !replyText.trim() ? 'opacity-50' : ''}`}
            >
              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <UiIcon as={Send} size={16} className="text-white" />}
              <Span className={BTN_TEXT_PRIMARY}>{sending ? 'Sending…' : 'Send Reply'}</Span>
            </Button>
          </>
        )}
      </Card>
    </AdminPage>
  );
};
export default SupportTickets;
