/* Ported from Frontend/src/modules/Food/pages/admin/DeliverySupportTickets.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { FlatList } from 'react-native';
import { MessageSquare, Search, Clock, CheckCircle, XCircle, Loader2, Eye, Edit } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Textarea } from '../../../components/shadcn';
import { AdminPage, PageHeader, Card, SectionTitle, StatCard, Toolbar, StatusBadge, LoadingState, EmptyState, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../admin/ui';
import { Button, Div, Input, Option, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../components/web';

/* The kit's status words don't cover a ticket's lifecycle, so the tone is mapped here. */
const TICKET_TONE = { open: 'warning', in_progress: 'info', resolved: 'success', closed: 'neutral' };
const ticketStatusLabel = (status) => String(status || '').replace('_', ' ').replace(/^./, (c) => c.toUpperCase());
const PAGE_MAX = 1200;
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function DeliverySupportTickets() {
  const { width, tablet, wide } = useLayoutWidth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);
  useEffect(() => {
    fetchStats();
  }, []);
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const response = await adminAPI.getDeliverySupportTickets(params);
      if (response?.data?.success && response?.data?.data?.tickets) {
        setTickets(response.data.data.tickets);
      } else {
        setTickets([]);
      }
    } catch (error) {
      debugError('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchStats = async () => {
    try {
      const response = await adminAPI.getDeliverySupportTicketStats();
      if (response?.data?.success && response?.data?.data) {
        setStats(response.data.data);
      }
    } catch (error) {
      debugError('Error fetching stats:', error);
    }
  };
  const handleSearch = () => {
    fetchTickets();
  };
  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsViewOpen(true);
  };
  const handleRespond = (ticket) => {
    setSelectedTicket(ticket);
    setResponseText(ticket.adminResponse || '');
    setIsResponseOpen(true);
  };
  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    try {
      setUpdating(true);
      const response = await adminAPI.updateDeliverySupportTicket(selectedTicket._id, {
        adminResponse: responseText.trim(),
        status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
      });
      if (response?.data?.success) {
        toast.success('Ticket updated successfully!');
        const updatedTicket = response?.data?.data?.ticket ||
          response?.data?.ticket || {
            ...selectedTicket,
            adminResponse: responseText.trim(),
            respondedAt: new Date().toISOString(),
            status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
          };
        setSelectedTicket(updatedTicket);
        setIsResponseOpen(false);
        setIsViewOpen(false);
        setResponseText('');
        await fetchTickets();
        await fetchStats();
      } else {
        toast.error(response?.data?.message || 'Failed to update ticket');
      }
    } catch (error) {
      debugError('Error updating ticket:', error);
      toast.error(error?.response?.data?.message || 'Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };
  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const response = await adminAPI.updateDeliverySupportTicket(ticketId, {
        status: newStatus,
      });
      if (response?.data?.success) {
        toast.success('Ticket status updated!');
        await fetchTickets();
        await fetchStats();
      }
    } catch (error) {
      debugError('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <UiIcon as={CheckCircle} size={18} className="text-green-700" />;
      case 'closed':
        return <UiIcon as={XCircle} size={18} className="text-slate-400" />;
      case 'in_progress':
        return <UiIcon as={Clock} size={18} className="text-blue-700" />;
      default:
        return <UiIcon as={Clock} size={18} className="text-amber-700" />;
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const statColumns = wide ? 5 : tablet ? 3 : 2;
  const statWidth = (Math.min(width, PAGE_MAX) - 32 - 32 - 12 * (statColumns - 1)) / statColumns;
  const statTiles = stats
    ? [
        { label: 'Total', value: stats.total, tone: 'neutral' },
        { label: 'Open', value: stats.open, tone: 'warning' },
        { label: 'In progress', value: stats.inProgress, tone: 'info' },
        { label: 'Resolved', value: stats.resolved, tone: 'success' },
        { label: 'Closed', value: stats.closed, tone: 'neutral' },
      ]
    : [];
  const listHeader = (
    <Div>
      <PageHeader
        icon={MessageSquare}
        title="Delivery support tickets"
        subtitle="Manage and respond to support tickets raised by delivery partners."
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery' }, { label: 'Support tickets' }]}
      />
      {stats ? (
        <Div className="flex-row flex-wrap gap-3 mb-3">
          {statTiles.map((tile) => (
            <Div key={tile.label} style={{ width: statWidth }}>
              <StatCard label={tile.label} value={String(tile.value ?? 0)} tone={tile.tone} />
            </Div>
          ))}
        </Div>
      ) : null}
      <Card className="mb-3">
        <SectionTitle>Filters</SectionTitle>
        <Div className="flex-row items-center gap-2 mb-3">
          <UiIcon as={Search} size={16} className="text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search subject, description, ticket ID or partner"
            className={`${INPUT} flex-1`}
          />
        </Div>
        <Toolbar className="mb-0">
          <Div className="flex-1 min-w-[150px]">
            <Field label="Status">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT}>
                <Option value="">All status</Option>
                <Option value="open">Open</Option>
                <Option value="in_progress">In progress</Option>
                <Option value="resolved">Resolved</Option>
                <Option value="closed">Closed</Option>
              </Select>
            </Field>
          </Div>
          <Div className="flex-1 min-w-[150px]">
            <Field label="Priority">
              <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={INPUT}>
                <Option value="">All priority</Option>
                <Option value="low">Low</Option>
                <Option value="medium">Medium</Option>
                <Option value="high">High</Option>
                <Option value="urgent">Urgent</Option>
              </Select>
            </Field>
          </Div>
          <Button onClick={handleSearch} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Search</Span>
          </Button>
        </Toolbar>
      </Card>
    </Div>
  );
  const detailBlock = (label, value) => (
    <Div className="gap-1">
      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
      <Span className="text-sm text-slate-900">{value}</Span>
    </Div>
  );
  return (
    <AdminPage scroll={false} padded={false} maxWidth={PAGE_MAX} contentClassName="flex-1">
      <FlatList
        data={loading ? [] : tickets}
        keyExtractor={(item) => String(item._id)}
        renderItem={({ item: ticket }) => (
          <Card>
            <Div className="flex-row items-start gap-3">
              {getStatusIcon(ticket.status)}
              <Div className="flex-1 min-w-0 gap-1.5">
                <Div className="flex-row items-center flex-wrap gap-2">
                  {ticket.ticketId ? <Span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">#{ticket.ticketId}</Span> : null}
                  <StatusBadge status={ticket.status} tone={TICKET_TONE[ticket.status] || 'neutral'} label={ticketStatusLabel(ticket.status)} />
                </Div>
                <Span className="text-sm font-semibold text-slate-900">{ticket.subject}</Span>
                <Span className="text-xs text-slate-500">
                  {`${ticket.deliveryPartner?.name || 'N/A'}${ticket.deliveryPartner?._id ? ` · DP-${String(ticket.deliveryPartner._id).slice(-8).toUpperCase()}` : ''} · ${formatDateTime(ticket.createdAt)}`}
                </Span>
              </Div>
            </Div>
            <Div className="flex-row items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
              <Button
                onClick={() => handleViewTicket(ticket)}
                accessibilityLabel="View ticket"
                className="w-11 h-11 rounded-lg border border-slate-200 bg-white items-center justify-center"
              >
                <UiIcon as={Eye} size={16} className="text-slate-600" />
              </Button>
              <Button
                onClick={() => handleRespond(ticket)}
                accessibilityLabel="Respond to ticket"
                className="w-11 h-11 rounded-lg border border-slate-200 bg-white items-center justify-center"
              >
                <UiIcon as={Edit} size={16} className="text-blue-700" />
              </Button>
              {ticket.status !== 'closed' ? (
                <Div className="flex-1 min-w-[150px]">
                  <Select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(ticket._id, e.target.value)}
                    className={INPUT}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Option value="open">Open</Option>
                    <Option value="in_progress">In progress</Option>
                    <Option value="resolved">Resolved</Option>
                    <Option value="closed">Closed</Option>
                  </Select>
                </Div>
              ) : null}
            </Div>
          </Card>
        )}
        ItemSeparatorComponent={() => <Div className="h-3" />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading tickets…" />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No tickets found"
              message="No delivery support tickets match these filters."
              actionLabel="Clear filters"
              onAction={() => {
                setSearchQuery('');
                setStatusFilter('');
                setPriorityFilter('');
              }}
            />
          )
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      />

      {/* View Ticket Dialog - Full Details */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[600px] max-h-[85vh] border border-slate-200 bg-white p-0">
          <DialogHeader className="border-b border-slate-200 px-4 py-4 pr-14">
            <DialogTitle className="text-base font-semibold text-slate-900">Ticket details</DialogTitle>
            <Span className="text-sm text-slate-500 mt-0.5">Everything recorded against this support ticket</Span>
          </DialogHeader>
          {selectedTicket ? (
            <ScrollDiv nestedScrollEnabled contentStyle={{ padding: 16, gap: 16 }}>
              <Div className="gap-3">
                <SectionTitle className="mb-0">Ticket information</SectionTitle>
                {selectedTicket.ticketId ? detailBlock('Ticket ID', `#${selectedTicket.ticketId}`) : null}
                {detailBlock('Subject', selectedTicket.subject)}
                <Div className="gap-1">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description / issue</Span>
                  <Div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <Span className="text-sm text-slate-900">{selectedTicket.description}</Span>
                  </Div>
                </Div>
                <Div className="flex-row flex-wrap gap-3">
                  <Div className="gap-1 min-w-[110px]">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</Span>
                    <StatusBadge
                      status={selectedTicket.status}
                      tone={TICKET_TONE[selectedTicket.status] || 'neutral'}
                      label={ticketStatusLabel(selectedTicket.status)}
                    />
                  </Div>
                  <Div className="min-w-[110px]">{detailBlock('Priority', selectedTicket.priority)}</Div>
                  <Div className="min-w-[110px]">{detailBlock('Category', selectedTicket.category)}</Div>
                </Div>
                {detailBlock('Created', formatDateTime(selectedTicket.createdAt))}
              </Div>

              <Div className="gap-3">
                <SectionTitle className="mb-0">Delivery partner</SectionTitle>
                {detailBlock('Name', selectedTicket.deliveryPartner?.name || 'N/A')}
                {detailBlock('Phone number', selectedTicket.deliveryPartner?.phone || 'N/A')}
                {selectedTicket.deliveryPartner?._id ? detailBlock('ID', `DP-${String(selectedTicket.deliveryPartner._id).slice(-8).toUpperCase()}`) : null}
              </Div>

              {selectedTicket.adminResponse ? (
                <Div className="gap-3">
                  <SectionTitle className="mb-0">Admin response</SectionTitle>
                  <Div className="bg-slate-50 border border-slate-200 p-3 rounded-lg gap-2">
                    <Span className="text-sm text-slate-900">{selectedTicket.adminResponse}</Span>
                    {selectedTicket.respondedAt ? (
                      <Span className="text-xs text-slate-500">{`Responded on ${formatDateTime(selectedTicket.respondedAt)}`}</Span>
                    ) : null}
                  </Div>
                </Div>
              ) : null}

              {selectedTicket.status !== 'closed' ? (
                <Div className="flex-row flex-wrap gap-2 pt-3 border-t border-slate-200">
                  <Button onClick={() => handleRespond(selectedTicket)} className={BTN_PRIMARY}>
                    <Span className={BTN_TEXT_PRIMARY}>{selectedTicket.adminResponse ? 'Edit response' : 'Send response'}</Span>
                  </Button>
                  {selectedTicket.status === 'in_progress' ? (
                    <Button
                      onClick={() => {
                        handleStatusChange(selectedTicket._id, 'resolved');
                        setIsViewOpen(false);
                      }}
                      className={BTN_SECONDARY}
                    >
                      <Span className={BTN_TEXT_SECONDARY}>Mark resolved</Span>
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => {
                      handleStatusChange(selectedTicket._id, 'closed');
                      setIsViewOpen(false);
                    }}
                    className={BTN_SECONDARY}
                  >
                    <Span className={BTN_TEXT_SECONDARY}>Close ticket</Span>
                  </Button>
                </Div>
              ) : null}
            </ScrollDiv>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[560px] border border-slate-200 bg-white p-0">
          <DialogHeader className="border-b border-slate-200 px-4 py-4 pr-14">
            <DialogTitle className="text-base font-semibold text-slate-900">Respond to ticket</DialogTitle>
            {selectedTicket ? (
              <Span className="text-sm text-slate-500 mt-0.5">
                {`${selectedTicket.ticketId ? `#${selectedTicket.ticketId} · ` : ''}${selectedTicket.subject || 'Send an update the delivery partner can see.'}`}
              </Span>
            ) : null}
          </DialogHeader>
          <Div className="px-4 py-4">
            <Field label="Response" hint="This message is visible to the delivery partner in their support ticket.">
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Enter your response…"
                rows={6}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </Field>
          </Div>
          <DialogFooter className="border-t border-slate-200 px-4 py-3 gap-2 flex-row">
            <Button onClick={() => setIsResponseOpen(false)} className={`${BTN_SECONDARY} flex-1`}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={handleUpdateTicket} disabled={updating || !responseText.trim()} className={`${BTN_PRIMARY} flex-1`}>
              {updating ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>{updating ? 'Updating…' : 'Update ticket'}</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
