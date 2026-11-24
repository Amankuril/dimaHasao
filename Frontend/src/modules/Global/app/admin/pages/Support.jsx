/**
 * One support desk for the whole platform.
 *
 * Food kept three ticket inboxes (customer, restaurant, delivery partner) and
 * taxi a fourth; hotel and tours had none. Every module's tickets now land in
 * one collection, which is what this reads — so a customer's problem is answered
 * from one screen no matter which service it was about.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, Search, Send } from 'lucide-react';
import toast from 'react-hot-toast';

import globalService from '../../../services/globalService';
import { moduleColour } from '../moduleColours';

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
  { value: '', label: 'All tickets' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'working', label: 'Being worked' },
  { value: 'done', label: 'Done' },
];

// Only the priorities that need attention get a colour; low and medium stay muted text.
const PRIORITY_DOT = {
  high: 'bg-amber-500',
  urgent: 'bg-red-600',
};

const sentence = (value) => {
  const text = String(value || '').replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

const field = 'px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm outline-none focus:border-[#0a4d2b] focus:ring-2 focus:ring-[#0a4d2b]/20 transition-colors';

const when = (value) => (value ? new Date(value).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
}) : '');

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

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    globalService.getSupportStats()
      .then((data) => setStats(data.stats))
      .catch(() => setStats(null));
  }, [tickets.length]);

  // The open ticket comes from the list, so a reload refreshes it in place
  // rather than leaving a stale thread on screen.
  const openTicket = useMemo(
    () => (open ? tickets.find((t) => t._id === open) || null : null),
    [open, tickets],
  );

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Support</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Every module's tickets, in one place.
          </p>
        </div>

        {stats && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] text-neutral-500 tabular-nums">{stats.total} tickets</span>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-neutral-700 tabular-nums">
              {stats.waiting > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
              {stats.waiting} waiting on us
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select className={field} value={module} onChange={(e) => setModule(e.target.value)}>
          <option value="">All services</option>
          {MODULES.map((m) => (
            <option key={m} value={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}{stats?.byModule?.[m] ? ` (${stats.byModule[m].total})` : ''}
            </option>
          ))}
        </select>

        <select className={field} value={group} onChange={(e) => setGroup(e.target.value)}>
          {GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>

        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <input
            className={`${field} flex-1`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setApplied(search.trim()); }}
            placeholder="Ticket code, name, phone or words in the ticket"
          />
          <button
            type="button"
            onClick={() => setApplied(search.trim())}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0a4d2b] text-white rounded-xl font-medium text-sm hover:bg-[#06381e]"
          >
            <Search size={15} /> Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 grid place-items-center"><Loader2 className="animate-spin text-neutral-500" /></div>
      ) : tickets.length === 0 ? (
        <div className="py-16 text-center text-sm text-neutral-500 bg-white rounded-2xl border border-neutral-200">
          No tickets match this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const isOpen = open === t._id;
            const statuses = STATUSES_BY_MODULE[t.module] || ['open', 'resolved', 'closed'];
            return (
              <div key={t._id} className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
                <div className="p-4 flex flex-wrap items-start gap-4">
                  <div className="flex-1 basis-64 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-neutral-900">
                        {t.ticketCode || '—'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: moduleColour(t.module) }} />
                        {sentence(t.module)}
                      </span>
                      {t.requesterRole && (
                        <span className="text-xs text-neutral-500">· {sentence(t.requesterRole)}</span>
                      )}
                      {t.priority && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
                          · {PRIORITY_DOT[t.priority] && <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />}
                          {sentence(t.priority)} priority
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-neutral-800 mt-1.5">
                      {t.subject || t.issueType || t.title || 'Support request'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{t.description}</p>
                    <p className="text-xs text-neutral-500 mt-1.5">
                      {t.requesterName || 'Unknown'}
                      {t.requesterPhone ? ` · ${t.requesterPhone}` : ''}
                      {t.category ? ` · ${t.category}` : ''}
                      {` · ${when(t.createdAt)}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      className={`${field} text-xs`}
                      value={t.status}
                      disabled={savingId === t._id}
                      onChange={(e) => patch(t, { status: e.target.value })}
                    >
                      {/* A status the ticket's own module never uses would be
                          rejected by the server, so only its own are offered. */}
                      {(statuses.includes(t.status) ? statuses : [t.status, ...statuses]).map((s) => (
                        <option key={s} value={s}>{String(s).replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())}</option>
                      ))}
                    </select>

                    <select
                      className={`${field} text-xs`}
                      value={t.priority}
                      disabled={savingId === t._id}
                      onChange={(e) => patch(t, { priority: e.target.value })}
                    >
                      {['low', 'medium', 'high', 'urgent'].map((p) => (
                        <option key={p} value={p}>{String(p).replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => { setOpen(isOpen ? null : t._id); setReply(''); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <MessageSquare size={14} />
                      {t.messages?.length || 0}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-neutral-100 bg-neutral-50/60 p-4 space-y-3">
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(t.messages || []).length === 0 ? (
                        <p className="text-xs text-neutral-500">No messages on this ticket yet.</p>
                      ) : t.messages.map((m) => {
                        const fromAdmin = m.senderRole === 'admin';
                        return (
                          <div key={m._id} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                              fromAdmin ? 'bg-[#0a4d2b] text-white' : 'bg-white border border-neutral-200 text-neutral-800'
                            }`}>
                              <p className={`text-xs ${fromAdmin ? 'text-white/70' : 'text-neutral-500'}`}>
                                {m.senderName || sentence(m.senderRole)}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                              <p className={`text-xs mt-0.5 ${fromAdmin ? 'text-white/60' : 'text-neutral-500'}`}>
                                {when(m.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        className={`${field} flex-1`}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }}
                        placeholder="Reply to the customer"
                      />
                      <button
                        type="button"
                        onClick={sendReply}
                        disabled={sending || !reply.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#0a4d2b] text-white rounded-xl font-medium text-sm hover:bg-[#06381e] disabled:opacity-50"
                      >
                        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Support;
