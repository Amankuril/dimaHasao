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
import { Button, Div, H1, Input, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
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
const MODULE_TONE = {
  food: 'bg-orange-100 text-orange-700',
  taxi: 'bg-amber-100 text-amber-800',
  hotel: 'bg-sky-100 text-sky-700',
  tours: 'bg-emerald-100 text-emerald-700',
  festivals: 'bg-violet-100 text-violet-700',
  platform: 'bg-gray-200 text-gray-700',
};
const PRIORITY_TONE = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-100 text-amber-800',
  urgent: 'bg-red-100 text-red-700',
};
const field =
  'px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] transition';
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
    <ScrollDiv className="p-4 pb-20 space-y-5">
      <Div className="flex flex-wrap items-start justify-between gap-4">
        <Div>
          <H1 className="text-xl font-bold text-gray-900">Support</H1>
          <P className="text-sm text-gray-500 mt-0.5">Every module's tickets, in one place.</P>
        </Div>

        {stats && (
          <Div className="flex items-center gap-2 flex-wrap">
            <Span className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700">{stats.total} total</Span>
            <Span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${stats.waiting > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
              {stats.waiting} waiting
            </Span>
          </Div>
        )}
      </Div>

      {/* Filters */}
      <Div className="flex flex-wrap items-center gap-2">
        <Select className={field} value={module} onChange={(e) => setModule(e.target.value)}>
          <Option value="">All services</Option>
          {MODULES.map((m) => (
            <Option key={m} value={m}>
              {m}
              {stats?.byModule?.[m] ? ` (${stats.byModule[m].total})` : ''}
            </Option>
          ))}
        </Select>

        <Select className={field} value={group} onChange={(e) => setGroup(e.target.value)}>
          {GROUPS.map((g) => (
            <Option key={g.value} value={g.value}>
              {g.label}
            </Option>
          ))}
        </Select>

        <Div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Input
            className={`${field} flex-1`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setApplied(search.trim());
            }}
            placeholder="Ticket code, name, phone or words in the ticket"
          />
          <Button
            type="button"
            onClick={() => setApplied(search.trim())}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e]"
          >
            <UiIcon as={Search} size={15} /> Search
          </Button>
        </Div>
      </Div>

      {loading ? (
        <Div className="py-16 grid place-items-center">
          <UiIcon as={Loader2} className="animate-spin text-gray-400" />
        </Div>
      ) : tickets.length === 0 ? (
        <Div className="py-16 text-center text-sm text-gray-400 bg-white rounded-2xl border border-gray-200">No tickets match this filter.</Div>
      ) : (
        <Div className="space-y-3">
          {tickets.map((t) => {
            const isOpen = open === t._id;
            const statuses = STATUSES_BY_MODULE[t.module] || ['open', 'resolved', 'closed'];
            // PORT: overflow-y-auto: this element scrolls on the web -> use <ScrollDiv> (or a FlatList for a long list)
            return (
              <Div key={t._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <Div className="p-4 flex flex-wrap items-start gap-4">
                  <Div className="flex-1 basis-64 min-w-0">
                    <Div className="flex flex-wrap items-center gap-2">
                      <Span className="font-black tracking-wide text-gray-900 text-sm">{t.ticketCode || '—'}</Span>
                      <Span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${MODULE_TONE[t.module] || 'bg-gray-100 text-gray-600'}`}>
                        {t.module}
                      </Span>
                      {t.requesterRole && (
                        <Span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">{t.requesterRole}</Span>
                      )}
                      <Span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_TONE[t.priority] || ''}`}>{t.priority}</Span>
                    </Div>

                    <P className="text-sm font-semibold text-gray-800 mt-1.5">{t.subject || t.issueType || t.title || 'Support request'}</P>
                    <P className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</P>
                    <P className="text-[11px] text-gray-400 mt-1.5">
                      {t.requesterName || 'Unknown'}
                      {t.requesterPhone ? ` · ${t.requesterPhone}` : ''}
                      {t.category ? ` · ${t.category}` : ''}
                      {` · ${when(t.createdAt)}`}
                    </P>
                  </Div>

                  <Div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Select
                      className={`${field} text-xs`}
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
                      className={`${field} text-xs`}
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
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      <UiIcon as={MessageSquare} size={14} />
                      {t.messages?.length || 0}
                    </Button>
                  </Div>
                </Div>

                {isOpen && (
                  <Div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-3">
                    <Div className="space-y-2 max-h-72 overflow-y-auto">
                      {(t.messages || []).length === 0 ? (
                        <P className="text-xs text-gray-400">No messages on this ticket yet.</P>
                      ) : (
                        t.messages.map((m) => {
                          const fromAdmin = m.senderRole === 'admin';
                          return (
                            <Div key={m._id} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                              <Div
                                className={`max-w-[80%] rounded-2xl px-3 py-2 ${fromAdmin ? 'bg-[#0a4d2b] text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                              >
                                <P className={`text-[10px] font-bold uppercase ${fromAdmin ? 'text-emerald-200' : 'text-gray-400'}`}>
                                  {m.senderName || m.senderRole}
                                </P>
                                <P className="text-sm whitespace-pre-wrap">{m.message}</P>
                                <P className={`text-[10px] mt-0.5 ${fromAdmin ? 'text-emerald-200/70' : 'text-gray-400'}`}>{when(m.createdAt)}</P>
                              </Div>
                            </Div>
                          );
                        })
                      )}
                    </Div>

                    <Div className="flex items-center gap-2">
                      <Input
                        className={`${field} flex-1`}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sendReply();
                        }}
                        placeholder="Reply to the customer…"
                      />
                      <Button
                        type="button"
                        onClick={sendReply}
                        disabled={sending || !reply.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-50"
                      >
                        {sending ? <UiIcon as={Loader2} size={15} className="animate-spin" /> : <UiIcon as={Send} size={15} />}
                        Send
                      </Button>
                    </Div>
                  </Div>
                )}
              </Div>
            );
          })}
        </Div>
      )}
    </ScrollDiv>
  );
};
export default Support;
