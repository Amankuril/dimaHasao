/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminContactMessages.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { User, Hotel, Mail, Phone, MessageCircle, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { Button, Div, H2, H3, Option, Overlay, P, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
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
        limit,
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
        prev.map((m) =>
          m._id === id
            ? {
                ...m,
                status: nextStatus,
              }
            : m,
        ),
      );
    } catch {
      setError('Failed to update status.');
    }
  };
  return (
    <ScrollDiv className="space-y-6 pb-24">
      <Div className="flex flex-col gap-4">
        <Div>
          <H2 className="text-2xl font-bold text-gray-900">Contact Messages</H2>
          <P className="text-gray-500 text-sm">View and triage queries submitted from user and partner apps.</P>
        </Div>
        <Div className="flex flex-row flex-wrap gap-3">
          <Div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1">
            <Button
              onClick={() => setAudience('user')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 ${audience === 'user' ? 'bg-black text-white' : 'text-gray-600'}`}
            >
              <UiIcon as={User} size={14} />
              <Span>User</Span>
            </Button>
            <Button
              onClick={() => setAudience('partner')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 ${audience === 'partner' ? 'bg-black text-white' : 'text-gray-600'}`}
            >
              <UiIcon as={Hotel} size={14} />
              <Span>Partner</Span>
            </Button>
          </Div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white outline-none focus:ring-2 focus:ring-black/70"
          >
            <Option value="">All statuses</Option>
            <Option value="new">New</Option>
            <Option value="in_progress">In Progress</Option>
            <Option value="resolved">Resolved</Option>
          </Select>
        </Div>
      </Div>

      {error && <Div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">{error}</Div>}

      <Div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <Table cols={[190, 230, 190, 150, 100]} className="min-w-full">
          <Thead className="border-b border-gray-100">
            <Tr>
              <Th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Details</Th>
              <Th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Message</Th>
              <Th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Meta</Th>
              <Th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Status</Th>
              <Th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wide text-right">Actions</Th>
            </Tr>
          </Thead>

          <Tbody className="divide-y divide-gray-100">
            {loading ? (
              <Tr>
                <Td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                  Loading messages...
                </Td>
              </Tr>
            ) : messages.length === 0 ? (
              <Tr>
                <Td colSpan={5} className="p-8 text-center text-gray-400 text-sm">
                  No messages found for this filter.
                </Td>
              </Tr>
            ) : (
              messages.map((m) => (
                <Tr key={m._id} className="text-xs text-gray-700">
                  <Td className="px-4 py-4 pr-3 justify-start">
                    <Div className="font-bold text-gray-900">{m.name}</Div>
                    {m.email && (
                      <Div className="flex items-center gap-1 mt-1 text-[11px] text-gray-500">
                        <UiIcon as={Mail} size={11} />
                        <Span numberOfLines={1} className="flex-1">{m.email}</Span>
                      </Div>
                    )}
                    {m.phone && (
                      <Div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-500">
                        <UiIcon as={Phone} size={11} />
                        <Span>{m.phone}</Span>
                      </Div>
                    )}
                  </Td>
                  <Td className="px-4 py-4 pr-3 justify-start">
                    <P className="font-semibold text-gray-900 mb-1 line-clamp-1">{m.subject}</P>
                    <P className="text-[11px] text-gray-600 line-clamp-3">{m.message}</P>
                  </Td>
                  <Td className="px-4 py-4 pr-3 text-[11px] text-gray-500 justify-start">
                    <P>Created: {m.createdAt ? new Date(m.createdAt).toLocaleString() : '-'}</P>
                    <P>Audience: {m.audience}</P>
                  </Td>
                  <Td className="px-4 py-4 pr-3">
                    <Select
                      value={m.status}
                      onChange={(e) => handleStatusChange(m._id, e.target.value)}
                      className="px-2 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold"
                    >
                      <Option value="new">New</Option>
                      <Option value="in_progress">In Progress</Option>
                      <Option value="resolved">Resolved</Option>
                    </Select>
                  </Td>
                  <Td className="px-4 py-4 items-end">
                    <Button
                      type="button"
                      onClick={() => setSelectedMessage(m)}
                      className="flex flex-row items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-700"
                    >
                      <UiIcon as={MessageCircle} size={12} />
                      <Span>Open</Span>
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>

        <Div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 text-[11px] text-gray-500">
          <Div>
            Showing {messages.length} of {total} messages
          </Div>
          <Div className="flex items-center gap-2">
            <Button disabled={page <= 1} onClick={() => load(page - 1)} className="p-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40">
              <UiIcon as={ChevronLeft} size={14} />
            </Button>
            <Span>
              Page {page} of {totalPages}
            </Span>
            <Button
              disabled={page >= totalPages}
              onClick={() => load(page + 1)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40"
            >
              <UiIcon as={ChevronRight} size={14} />
            </Button>
          </Div>
        </Div>
      </Div>

      {selectedMessage && (
        <Overlay onClose={() => setSelectedMessage(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 border border-gray-200 max-h-[90vh]">
            <Div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <Div className="flex-1">
                <P className="text-[10px] font-bold uppercase text-gray-400">{selectedMessage.audience === 'partner' ? 'Partner Message' : 'User Message'}</P>
                <H3 className="text-sm font-bold text-gray-900">{selectedMessage.subject}</H3>
              </Div>
              <Button onClick={() => setSelectedMessage(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                <UiIcon as={X} size={16} />
              </Button>
            </Div>

            <ScrollDiv className="px-5 py-4 space-y-4 max-h-[70vh] flex-shrink">
              <Div className="flex items-start gap-3">
                <Div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
                  {selectedMessage.name?.charAt(0)?.toUpperCase() || '?'}
                </Div>
                <Div className="flex-1">
                  <Div className="flex items-center justify-between gap-2">
                    <Div className="flex-1">
                      <P className="text-sm font-bold text-gray-900">{selectedMessage.name}</P>
                      <P className="text-[10px] font-bold uppercase text-gray-400">
                        {selectedMessage.email || 'No email'} • {selectedMessage.phone || 'No phone'}
                      </P>
                    </Div>
                    <Span className="px-2 py-0.5 rounded-full border border-gray-200 text-[10px] font-bold uppercase text-gray-600">
                      {selectedMessage.status.replace('_', ' ')}
                    </Span>
                  </Div>
                  <P className="text-[10px] text-gray-400 mt-1">
                    Created at {selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleString() : '-'}
                  </P>
                </Div>
              </Div>

              <Div className="border border-gray-100 rounded-xl bg-gray-50/60 p-3">
                <P className="text-[10px] font-bold text-gray-500 uppercase mb-1">Message</P>
                <P className="text-xs text-gray-800 leading-relaxed">{selectedMessage.message}</P>
              </Div>

              <Div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <Div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Span>
                    Audience: {selectedMessage.audience} • ID: {selectedMessage._id.slice(-6)}
                  </Span>
                </Div>
                <Select
                  value={selectedMessage.status}
                  onChange={async (e) => {
                    const next = e.target.value;
                    await handleStatusChange(selectedMessage._id, next);
                    setSelectedMessage((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: next,
                          }
                        : prev,
                    );
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-black/70 bg-white"
                >
                  <Option value="new">New</Option>
                  <Option value="in_progress">In Progress</Option>
                  <Option value="resolved">Resolved</Option>
                </Select>
              </Div>
            </ScrollDiv>

            <Div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <Button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-[11px] font-bold uppercase text-gray-700 hover:bg-gray-50"
              >
                Close
              </Button>
            </Div>
          </Div>
        </Overlay>
      )}
    </ScrollDiv>
  );
};
export default AdminContactMessages;
