import React, { useEffect, useState } from 'react';
import { User, Hotel, Mail, Phone, MessageCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import adminService from '../../../services/adminService';

const AdminContactMessages = () => {
  const [audience, setAudience] = useState('user');
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);

  const load = async (pageToLoad = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getContactMessages({
        audience,
        status: status || undefined,
        page: pageToLoad,
        limit
      });
      setMessages(res.messages || []);
      setTotal(res.total || 0);
      setPage(res.page || pageToLoad);
    } catch {
      setError('Unable to fetch contact messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [audience, status]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleStatusChange = async (id, nextStatus) => {
    try {
      await adminService.updateContactStatus(id, nextStatus);
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, status: nextStatus } : m))
      );
    } catch{
      setError('Failed to update status.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium text-neutral-900">Contact messages</h2>
          <p className="text-neutral-500 text-sm">
            View and triage queries submitted from user and partner apps.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl p-1">
            <button
              onClick={() => setAudience('user')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1 ${audience === 'user' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                }`}
            >
              <User size={14} />
              User
            </button>
            <button
              onClick={() => setAudience('partner')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1 ${audience === 'partner' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                }`}
            >
              <Hotel size={14} />
              Partner
            </button>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 bg-white outline-none focus:ring-2 focus:ring-[#0a4d2b]/30/70"
          >
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-neutral-900/[0.08] rounded-xl overflow-hidden">
        <div className="min-w-full">
          <div className="grid grid-cols-12 px-4 py-3 text-xs text-neutral-500 border-b border-neutral-100">
            <div className="col-span-3">Details</div>
            <div className="col-span-4">Message</div>
            <div className="col-span-2">Meta</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-neutral-500 text-sm">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-sm">
              No messages found for this filter.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {messages.map((m) => (
                <div
                  key={m._id}
                  className="grid grid-cols-12 px-4 py-4 text-xs text-neutral-700 hover:bg-neutral-50/60"
                >
                  <div className="col-span-3 pr-3">
                    <div className="font-medium text-neutral-900">{m.name}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                      {m.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={11} /> {m.email}
                        </span>
                      )}
                    </div>
                    {m.phone && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-500">
                        <Phone size={11} /> {m.phone}
                      </div>
                    )}
                  </div>
                  <div className="col-span-4 pr-3">
                    <div className="font-medium text-neutral-900 mb-1 line-clamp-1">
                      {m.subject}
                    </div>
                    <div className="text-xs text-neutral-600 line-clamp-3">
                      {m.message}
                    </div>
                  </div>
                  <div className="col-span-2 pr-3 text-xs text-neutral-500">
                    <div>
                      Created:{' '}
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleString()
                        : '-'}
                    </div>
                    <div>Audience: {m.audience}</div>
                  </div>
                  <div className="col-span-2 pr-3 flex items-center">
                    <select
                      value={m.status}
                      onChange={(e) => handleStatusChange(m._id, e.target.value)}
                      className="px-2 py-1 rounded-lg border border-neutral-200 text-xs font-medium outline-none focus:ring-2 focus:ring-[#0a4d2b]/30/70"
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedMessage(m)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-transform"
                    >
                      <MessageCircle size={12} />
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-xs text-neutral-500">
          <div>
            Showing {messages.length} of {total} messages
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1)}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => load(page + 1)}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 border border-neutral-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
              <div>
                <p className="text-xs text-neutral-500">
                  {selectedMessage.audience === 'partner' ? 'Partner message' : 'User message'}
                </p>
                <h3 className="text-sm font-medium text-neutral-900">
                  {selectedMessage.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-medium">
                  {selectedMessage.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {selectedMessage.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {selectedMessage.email || 'No email'} • {selectedMessage.phone || 'No phone'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full border border-neutral-200 text-xs font-medium text-neutral-600">
                      {selectedMessage.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Created at{' '}
                    {selectedMessage.createdAt
                      ? new Date(selectedMessage.createdAt).toLocaleString()
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="border border-neutral-100 rounded-xl bg-neutral-50/60 p-3">
                <p className="text-xs text-neutral-500 mb-1">
                  Message
                </p>
                <p className="text-xs text-neutral-800 whitespace-pre-line leading-relaxed">
                  {selectedMessage.message}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    Audience: {selectedMessage.audience} • ID: {selectedMessage._id.slice(-6)}
                  </span>
                </div>
                <select
                  value={selectedMessage.status}
                  onChange={async (e) => {
                    const next = e.target.value;
                    await handleStatusChange(selectedMessage._id, next);
                    setSelectedMessage((prev) => prev ? { ...prev, status: next } : prev);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium outline-none focus:ring-2 focus:ring-[#0a4d2b]/30/70 bg-white"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContactMessages;

