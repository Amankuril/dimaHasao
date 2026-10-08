/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminContactMessages.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { User, Hotel, Mail, Phone, MessageCircle, X, MessageSquare } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { Button, Div, H3, Option, Overlay, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  Pagination,
  TableSkeleton,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
const COLS = [200, 240, 190, 150, 110];
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
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={MessageSquare}
        title="Contact Messages"
        subtitle="View and triage queries submitted from the user and partner apps."
        breadcrumb={[{ label: 'Hotel' }, { label: 'Contact Messages' }]}
      />

      <Card className="mb-3">
        <Toolbar className="mb-0">
          <Button onClick={() => setAudience('user')} className={audience === 'user' ? BTN_PRIMARY : BTN_SECONDARY}>
            <UiIcon as={User} size={16} className={audience === 'user' ? 'text-white' : 'text-slate-600'} />
            <Span className={audience === 'user' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>User</Span>
          </Button>
          <Button onClick={() => setAudience('partner')} className={audience === 'partner' ? BTN_PRIMARY : BTN_SECONDARY}>
            <UiIcon as={Hotel} size={16} className={audience === 'partner' ? 'text-white' : 'text-slate-600'} />
            <Span className={audience === 'partner' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Partner</Span>
          </Button>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className={`${INPUT} flex-1 min-w-[160px]`}>
            <Option value="">All statuses</Option>
            <Option value="new">New</Option>
            <Option value="in_progress">In Progress</Option>
            <Option value="resolved">Resolved</Option>
          </Select>
        </Toolbar>
      </Card>

      {error && messages.length === 0 ? (
        <ErrorState title="Could not load messages" message={error} onRetry={() => load(page)} />
      ) : loading ? (
        <TableSkeleton rows={5} />
      ) : messages.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No messages here"
          message={status ? `No ${audience} messages with that status.` : `Nothing has come in from the ${audience} app yet.`}
          actionLabel={status ? 'Clear status filter' : undefined}
          onAction={status ? () => setStatus('') : undefined}
        />
      ) : (
        <>
          {error ? (
            <Card className="mb-3 bg-red-100 border-red-200">
              <P className="text-sm text-red-700">{error}</P>
            </Card>
          ) : null}
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['Details', 'Message', 'Meta', 'Status', 'Actions']} />
            <TBody>
              {messages.map((m, i) => (
                <Row key={m._id} last={i === messages.length - 1}>
                  <Cell width={COLS[0]}>
                    <P numberOfLines={1} className="text-sm font-semibold text-slate-900">
                      {m.name}
                    </P>
                    {m.email ? (
                      <Div className="flex-row items-center gap-1 mt-1">
                        <UiIcon as={Mail} size={12} className="text-slate-400" />
                        <Span numberOfLines={1} className="text-xs text-slate-500 flex-1">
                          {m.email}
                        </Span>
                      </Div>
                    ) : null}
                    {m.phone ? (
                      <Div className="flex-row items-center gap-1 mt-0.5">
                        <UiIcon as={Phone} size={12} className="text-slate-400" />
                        <Span className="text-xs text-slate-500">{m.phone}</Span>
                      </Div>
                    ) : null}
                  </Cell>
                  <Cell width={COLS[1]}>
                    <P numberOfLines={1} className="text-sm font-semibold text-slate-900">
                      {m.subject}
                    </P>
                    <P numberOfLines={3} className="text-xs text-slate-500 mt-0.5">
                      {m.message}
                    </P>
                  </Cell>
                  <Cell width={COLS[2]}>
                    <P numberOfLines={2} className="text-xs text-slate-500">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}
                    </P>
                    <P className="text-xs text-slate-500">Audience: {m.audience}</P>
                  </Cell>
                  <Cell width={COLS[3]}>
                    <Select value={m.status} onChange={(e) => handleStatusChange(m._id, e.target.value)} className={`${INPUT} w-full`}>
                      <Option value="new">New</Option>
                      <Option value="in_progress">In Progress</Option>
                      <Option value="resolved">Resolved</Option>
                    </Select>
                  </Cell>
                  <Cell width={COLS[4]}>
                    <Button
                      type="button"
                      onClick={() => setSelectedMessage(m)}
                      className={BTN_SECONDARY}
                      accessibilityLabel={`Open message from ${m.name}`}
                    >
                      <UiIcon as={MessageCircle} size={14} className="text-slate-600" />
                      <Span className={BTN_TEXT_SECONDARY}>Open</Span>
                    </Button>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
          <Pagination page={page} pages={totalPages} total={total} onPrev={() => load(page - 1)} onNext={() => load(page + 1)} />
        </>
      )}

      {selectedMessage && (
        <Overlay onClose={() => setSelectedMessage(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full max-h-[90vh]">
            <Div className="flex-row items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
              <Div className="flex-1 min-w-0">
                <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {selectedMessage.audience === 'partner' ? 'Partner message' : 'User message'}
                </P>
                <H3 className="text-base font-semibold text-slate-900" numberOfLines={2}>
                  {selectedMessage.subject}
                </H3>
              </Div>
              <Button
                onClick={() => setSelectedMessage(null)}
                className="w-11 h-11 rounded-lg items-center justify-center shrink-0"
                accessibilityLabel="Close message"
              >
                <UiIcon as={X} size={18} className="text-slate-500" />
              </Button>
            </Div>

            <ScrollDiv className="px-4 py-4 max-h-[70vh] flex-shrink" contentClassName="gap-3">
              <Div className="flex-row items-start gap-3">
                <Div className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center shrink-0">
                  <Span className="text-sm font-bold text-white">{selectedMessage.name?.charAt(0)?.toUpperCase() || '?'}</Span>
                </Div>
                <Div className="flex-1 min-w-0">
                  <Div className="flex-row items-start justify-between gap-2">
                    <Div className="flex-1 min-w-0">
                      <P numberOfLines={1} className="text-sm font-semibold text-slate-900">
                        {selectedMessage.name}
                      </P>
                      <P numberOfLines={2} className="text-xs text-slate-500">
                        {selectedMessage.email || 'No email'} · {selectedMessage.phone || 'No phone'}
                      </P>
                    </Div>
                    <StatusBadge status={selectedMessage.status} label={selectedMessage.status.replace('_', ' ')} />
                  </Div>
                  <P className="text-xs text-slate-500 mt-1">
                    Created {selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleString() : '—'}
                  </P>
                </Div>
              </Div>

              <Div className="border border-slate-200 rounded-lg bg-slate-50 p-3">
                <P className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Message</P>
                <P className="text-sm text-slate-700">{selectedMessage.message}</P>
              </Div>

              <Div className="gap-2">
                <P className="text-xs text-slate-500">
                  Audience: {selectedMessage.audience} · ID {selectedMessage._id.slice(-6)}
                </P>
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
                  className={INPUT}
                >
                  <Option value="new">New</Option>
                  <Option value="in_progress">In Progress</Option>
                  <Option value="resolved">Resolved</Option>
                </Select>
              </Div>
            </ScrollDiv>

            <Div className="px-4 py-3 border-t border-slate-200 flex-row justify-end">
              <Button onClick={() => setSelectedMessage(null)} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Close</Span>
              </Button>
            </Div>
          </Div>
        </Overlay>
      )}
    </AdminPage>
  );
};
export default AdminContactMessages;
