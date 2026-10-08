/* Ported from Frontend/src/modules/Global/app/admin/pages/Support.jsx (tools/port.js first pass). */
/**
 * One support desk for the whole platform.
 *
 * Food kept three ticket inboxes (customer, restaurant, delivery partner) and
 * taxi a fourth; hotel and tours had none. Every module's tickets now land in
 * one collection, which is what this reads — so a customer's problem is answered
 * from one screen no matter which service it was about.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, Search, Send } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import globalService from '../../../services/globalService';
import {
  AdminPage,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  Card,
  EmptyState,
  INPUT,
  PageHeader,
  StatusBadge,
  TableSkeleton,
  Toolbar,
} from '../../../../admin/ui';
import { Button, Div, Input, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
const MODULES = ['food', 'taxi', 'hotel', 'tours', 'festivals', 'platform'];

/**
 * The statuses each module actually uses.
 *
 * They disagree on purpose — food writes 'in-progress', delivery 'in_progress'
 * and taxi 'pending'/'assigned', and each module's own screens filter on its own
 * spelling. Offering an admin a status the ticket's module does not use would
 * just produce a 400, so the picker is per-module.
 */
const STATUSES_BY_MODULE = {
  food: ['open', 'in-progress', 'in_progress', 'resolved', 'closed'],
  taxi: ['pending', 'assigned', 'closed'],
  hotel: ['open', 'in_progress', 'resolved', 'closed'],
  tours: ['open', 'in_progress', 'resolved', 'closed'],
  festivals: ['open', 'in_progress', 'resolved', 'closed'],
  platform: ['open', 'in_progress', 'resolved', 'closed'],
};
const GROUPS = [
  {
    value: '',
    label: 'All tickets',
  },
  {
    value: 'waiting',
    label: 'Waiting',
  },
  {
    value: 'working',
    label: 'Being worked',
  },
  {
    value: 'done',
    label: 'Done',
  },
];
/** Priority words mapped onto the kit's tones, so the same word is one colour. */
const PRIORITY_TONE = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};
const when = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';
const Support = () => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState('');
  const [group, setGroup] = useState('');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [open, setOpen] = useState(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await globalService.getSupportTickets({
        module: module || undefined,
        group: group || undefined,
        search: applied || undefined,
        limit: 100,
      });
      setTickets(data.tickets || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [module, group, applied]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    globalService
      .getSupportStats()
      .then((data) => setStats(data.stats))
      .catch(() => setStats(null));
  }, [tickets.length]);

  // The open ticket comes from the list, so a reload refreshes it in place
  // rather than leaving a stale thread on screen.
  const openTicket = useMemo(() => (open ? tickets.find((t) => t._id === open) || null : null), [open, tickets]);
  const sendReply = async () => {
    const message = reply.trim();
    if (!message || !openTicket) return;
    try {
      setSending(true);
      const data = await globalService.replySupportTicket(openTicket._id, message);
      setTickets((current) => current.map((t) => (t._id === openTicket._id ? data.ticket : t)));
      setReply('');
    } catch (error) {
      toast.error(error.message || 'Could not send that reply');
    } finally {
      setSending(false);
    }
  };
  const patch = async (ticket, payload) => {
    try {
      setSavingId(ticket._id);
      const data = await globalService.updateSupportTicket(ticket._id, payload);
      setTickets((current) => current.map((t) => (t._id === ticket._id ? data.ticket : t)));
    } catch (error) {
      toast.error(error.message || 'Could not update this ticket');
    } finally {
      setSavingId(null);
    }
  };
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        title="Support"
        subtitle="Every module's tickets, in one place."
        icon={MessageSquare}
        actions={
          stats ? (
            <>
              <StatusBadge status="total" tone="neutral" label={`${stats.total} total`} />
              <StatusBadge status={stats.waiting > 0 ? 'pending' : 'completed'} label={`${stats.waiting} waiting`} />
            </>
          ) : null
        }
      />

      {/* Filters */}
      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Select className={`${INPUT} flex-1`} style={{ minWidth: 150 }} value={module} onChange={(e) => setModule(e.target.value)}>
            <Option value="">All services</Option>
            {MODULES.map((m) => (
              <Option key={m} value={m}>
                {m}
                {stats?.byModule?.[m] ? ` (${stats.byModule[m].total})` : ''}
              </Option>
            ))}
          </Select>

          <Select className={`${INPUT} flex-1`} style={{ minWidth: 150 }} value={group} onChange={(e) => setGroup(e.target.value)}>
            {GROUPS.map((g) => (
              <Option key={g.value} value={g.value}>
                {g.label}
              </Option>
            ))}
          </Select>

          <Input
            className={`${INPUT} flex-1`}
            style={{ minWidth: 180 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setApplied(search.trim());
            }}
            placeholder="Ticket code, name, phone or words in the ticket"
          />
          <Button type="button" onClick={() => setApplied(search.trim())} className={BTN_PRIMARY}>
            <UiIcon as={Search} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Search</Span>
          </Button>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No tickets match this filter"
          message={applied || module || group ? 'Widen the filters to see more tickets.' : 'Tickets raised in any app land here.'}
          actionLabel="Reload"
          onAction={load}
        />
      ) : (
        <Div className="gap-3">
          {tickets.map((t) => {
            const isOpen = open === t._id;
            const statuses = STATUSES_BY_MODULE[t.module] || ['open', 'resolved', 'closed'];
            return (
              <Card key={t._id} className="gap-3">
                <Div className="min-w-0">
                  <P className="text-base font-semibold text-slate-900" numberOfLines={1}>
                    {t.ticketCode || '—'}
                  </P>
                  <P className="text-sm font-medium text-slate-700 mt-1" numberOfLines={2}>
                    {t.subject || t.issueType || t.title || 'Support request'}
                  </P>
                  <P className="text-sm text-slate-500 mt-1" numberOfLines={2}>
                    {t.description}
                  </P>
                  <P className="text-xs text-slate-500 mt-1.5" numberOfLines={2}>
                    {t.requesterName || 'Unknown'}
                    {t.requesterPhone ? ` · ${t.requesterPhone}` : ''}
                    {t.category ? ` · ${t.category}` : ''}
                    {` · ${when(t.createdAt)}`}
                  </P>
                </Div>

                <Div className="flex-row flex-wrap items-center gap-2">
                  <StatusBadge status={t.module} tone="info" label={t.module} />
                  {t.requesterRole ? <StatusBadge status={t.requesterRole} tone="neutral" label={t.requesterRole} /> : null}
                  {t.priority ? <StatusBadge status={t.priority} tone={PRIORITY_TONE[t.priority] || 'neutral'} label={t.priority} /> : null}
                </Div>

                <Div className="flex-row flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  <Select
                    className={`${INPUT} flex-1`}
                    style={{ minWidth: 130 }}
                    value={t.status}
                    disabled={savingId === t._id}
                    onChange={(e) =>
                      patch(t, {
                        status: e.target.value,
                      })
                    }
                  >
                    {/* A status the ticket's own module never uses would be
                        rejected by the server, so only its own are offered. */}
                    {(statuses.includes(t.status) ? statuses : [t.status, ...statuses]).map((s) => (
                      <Option key={s} value={s}>
                        {s}
                      </Option>
                    ))}
                  </Select>

                  <Select
                    className={`${INPUT} flex-1`}
                    style={{ minWidth: 130 }}
                    value={t.priority}
                    disabled={savingId === t._id}
                    onChange={(e) =>
                      patch(t, {
                        priority: e.target.value,
                      })
                    }
                  >
                    {['low', 'medium', 'high', 'urgent'].map((p) => (
                      <Option key={p} value={p}>
                        {p}
                      </Option>
                    ))}
                  </Select>

                  <Button
                    type="button"
                    onClick={() => {
                      setOpen(isOpen ? null : t._id);
                      setReply('');
                    }}
                    className={BTN_SECONDARY}
                  >
                    <UiIcon as={MessageSquare} size={16} className="text-slate-600" />
                    <Span className={BTN_TEXT_SECONDARY}>{t.messages?.length || 0}</Span>
                  </Button>
                </Div>

                {isOpen && (
                  <Div className="pt-3 border-t border-slate-100 gap-3">
                    <ScrollDiv nestedScrollEnabled contentClassName="gap-2" style={{ maxHeight: 288 }}>
                      {(t.messages || []).length === 0 ? (
                        <P className="text-sm text-slate-500">No messages on this ticket yet.</P>
                      ) : (
                        t.messages.map((m) => {
                          const fromAdmin = m.senderRole === 'admin';
                          return (
                            <Div key={m._id} className={`flex-row ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                              <Div className={`rounded-xl px-3 py-2 ${fromAdmin ? 'bg-blue-600' : 'bg-slate-50 border border-slate-200'}`} style={{ maxWidth: '85%' }}>
                                <P className={`text-xs font-semibold uppercase tracking-wide ${fromAdmin ? 'text-blue-100' : 'text-slate-500'}`}>
                                  {m.senderName || m.senderRole}
                                </P>
                                <P className={`text-sm mt-0.5 ${fromAdmin ? 'text-white' : 'text-slate-700'}`}>{m.message}</P>
                                <P className={`text-xs mt-0.5 ${fromAdmin ? 'text-blue-100' : 'text-slate-400'}`}>{when(m.createdAt)}</P>
                              </Div>
                            </Div>
                          );
                        })
                      )}
                    </ScrollDiv>

                    <Div className="flex-row flex-wrap items-center gap-2">
                      <Input
                        className={`${INPUT} flex-1`}
                        style={{ minWidth: 180 }}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sendReply();
                        }}
                        placeholder="Reply to the customer…"
                      />
                      <Button type="button" onClick={sendReply} disabled={sending || !reply.trim()} className={BTN_PRIMARY}>
                        {sending ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Send} size={16} className="text-white" />}
                        <Span className={BTN_TEXT_PRIMARY}>Send</Span>
                      </Button>
                    </Div>
                  </Div>
                )}
              </Card>
            );
          })}
        </Div>
      )}
    </AdminPage>
  );
};
export default Support;
