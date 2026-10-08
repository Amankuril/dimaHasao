/* Ported from Frontend/src/modules/Food/pages/admin/system/NotificationBroadcast.jsx (tools/port.js first pass). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, ChevronLeft, ChevronRight, History, Loader2, Search, Send, Trash2, X } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  LoadingState,
  TableSkeleton,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Form, Input, Label, Option, Overlay, ScrollDiv, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { window } from '../../../../lib/webShim';
const HISTORY_COLS = [160, 240, 140, 110, 170, 110];
const HISTORY_LABELS = ['Title', 'Message', 'Target type', 'Recipients', 'Sent at', 'Action'];
const TEXTAREA = 'px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900';
const TARGET_OPTIONS = [
  {
    value: 'ALL',
    label: 'All',
  },
  {
    value: 'USER',
    label: 'Users',
  },
  {
    value: 'RESTAURANT',
    label: 'Restaurants',
  },
  {
    value: 'DELIVERY',
    label: 'Delivery Partners',
  },
  {
    value: 'CUSTOM',
    label: 'Particular Persons',
  },
];
const CATEGORY_TABS = [
  {
    id: 'ALL',
    label: 'All Recipients',
  },
  {
    id: 'USER',
    label: 'Users',
  },
  {
    id: 'RESTAURANT',
    label: 'Restaurants',
  },
  {
    id: 'DELIVERY_PARTNER',
    label: 'Delivery Partners',
  },
];
const SEARCHING_LABEL_MAP = {
  ALL: 'Searching All Recipients...',
  USER: 'Searching Users...',
  RESTAURANT: 'Searching Restaurants...',
  DELIVERY_PARTNER: 'Searching Delivery Partners...',
};
const toDateLabel = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};
export default function NotificationBroadcast() {
  const [form, setForm] = useState(() => {
    const savedTarget = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('admin_broadcast_targetType') : null;
    return {
      title: '',
      message: '',
      targetType: savedTarget && TARGET_OPTIONS.some((opt) => opt.value === savedTarget) ? savedTarget : 'ALL',
    };
  });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const initialLoadDone = useRef(false);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [allRecipients, setAllRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [counts, setCounts] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    matchedTotal: 0,
    totalPages: 1,
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const handleTargetTypeChange = (newTarget) => {
    setForm((prev) => ({
      ...prev,
      targetType: newTarget,
    }));
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('admin_broadcast_targetType', newTarget);
    }
  };
  const loadHistory = async ({ silent = false } = {}) => {
    try {
      if (!silent) setHistoryLoading(true);
      const response = await adminAPI.getBroadcastNotifications({
        page: 1,
        limit: 50,
      });
      setHistory(response?.data?.data?.items || []);
    } catch {
      if (!silent) setHistory([]);
    } finally {
      if (!silent) setHistoryLoading(false);
      initialLoadDone.current = true;
    }
  };
  const fetchRecipients = async (searchQuery = '', targetCategory = categoryFilter, pageNum = page, limitNum = limit) => {
    try {
      setRecipientLoading(true);
      const res = await adminAPI.searchBroadcastRecipients({
        search: searchQuery,
        targetType: targetCategory,
        page: pageNum,
        limit: limitNum,
      });
      const payload = res?.data?.data || res?.data || {};
      setAllRecipients(payload.recipients || []);
      if (payload.counts) {
        setCounts(payload.counts);
      }
      if (payload.pagination) {
        setPagination(payload.pagination);
      }
    } catch {
      setAllRecipients([]);
    } finally {
      setRecipientLoading(false);
    }
  };
  useEffect(() => {
    loadHistory();
  }, []);
  useEffect(() => {
    if (form.targetType !== 'CUSTOM') return;
    const timer = setTimeout(() => {
      fetchRecipients(search, categoryFilter, page, limit);
    }, 250);
    return () => clearTimeout(timer);
  }, [form.targetType, search, categoryFilter, page, limit]);
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);
  useEffect(() => {
    if (form.targetType !== 'CUSTOM') {
      setSelectedRecipients([]);
      setSearch('');
      setCategoryFilter('ALL');
      setPage(1);
    }
  }, [form.targetType]);
  const selectedKeys = useMemo(() => new Set(selectedRecipients.map((item) => `${item.ownerType}:${item.ownerId}`)), [selectedRecipients]);
  const filteredRecipients = useMemo(() => {
    const list = [...allRecipients];
    list.sort((a, b) => {
      const aKey = `${a.ownerType}:${a.ownerId}`;
      const bKey = `${b.ownerType}:${b.ownerId}`;
      const aSel = selectedKeys.has(aKey) ? 1 : 0;
      const bSel = selectedKeys.has(bKey) ? 1 : 0;
      return bSel - aSel;
    });
    return list;
  }, [allRecipients, selectedKeys]);
  const pageNumbers = useMemo(() => {
    const pages = [];
    const total = pagination.totalPages;
    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(total - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (page < total - 2) pages.push('...');
      if (!pages.includes(total)) pages.push(total);
    }
    return pages;
  }, [page, pagination.totalPages]);
  const toggleRecipient = (recipient) => {
    const key = `${recipient.ownerType}:${recipient.ownerId}`;
    setSelectedRecipients((prev) =>
      prev.some((item) => `${item.ownerType}:${item.ownerId}` === key)
        ? prev.filter((item) => `${item.ownerType}:${item.ownerId}` !== key)
        : [...prev, recipient],
    );
  };
  const handleSelectAllFiltered = () => {
    const newItems = filteredRecipients.filter((item) => !selectedKeys.has(`${item.ownerType}:${item.ownerId}`));
    if (newItems.length > 0) {
      setSelectedRecipients((prev) => [...prev, ...newItems]);
    }
  };
  const handleDeselectAllFiltered = () => {
    const filteredKeys = new Set(filteredRecipients.map((item) => `${item.ownerType}:${item.ownerId}`));
    setSelectedRecipients((prev) => prev.filter((item) => !filteredKeys.has(`${item.ownerType}:${item.ownerId}`)));
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    if (form.targetType === 'CUSTOM' && selectedRecipients.length === 0) return;
    try {
      setSubmitting(true);
      await adminAPI.createBroadcastNotification({
        title: form.title.trim(),
        message: form.message.trim(),
        targetType: form.targetType,
        targetIds: form.targetType === 'CUSTOM' ? selectedRecipients.map((item) => item.ownerId) : [],
        targets:
          form.targetType === 'CUSTOM'
            ? selectedRecipients.map((item) => ({
                ownerType: item.ownerType,
                ownerId: item.ownerId,
                label: item.label,
                subLabel: item.subLabel,
              }))
            : [],
      });
      setForm((prev) => ({
        title: '',
        message: '',
        targetType: prev.targetType,
      }));
      setSelectedRecipients([]);
      setSearch('');
      setCategoryFilter('ALL');
      setPage(1);
      window.dispatchEvent(new Event('adminBroadcastUpdated'));
      await loadHistory({
        silent: true,
      });
    } finally {
      setSubmitting(false);
    }
  };
  const handleDelete = async (id) => {
    if (!id || deletingIds.has(id)) return;
    setDeletingIds((prev) => new Set([...prev, id]));
    setHistory((prev) => prev.filter((item) => item?._id !== id));
    try {
      await adminAPI.deleteBroadcastNotification(id);
      window.dispatchEvent(new Event('adminBroadcastUpdated'));
    } catch {
      await loadHistory({
        silent: true,
      });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };
  const { tablet } = useLayoutWidth();
  const col = tablet ? { width: '48.5%' } : { width: '100%' };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={BellRing}
        title="Broadcast Notification"
        subtitle="Send one notification to all, role-based or selected recipients"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Broadcast' }]}
        actions={
          <Button type="button" onClick={() => setShowHistoryModal(true)} className={BTN_SECONDARY}>
            <UiIcon as={History} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>View history</Span>
            <Span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{historyLoading ? '…' : history.length}</Span>
          </Button>
        }
      />

      <Card>
        <Form onSubmit={handleSubmit}>
          <Div className="flex-row flex-wrap gap-3 mb-3">
            <Div style={col}>
              <Field label="Title" required>
                <Input
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Enter notification title"
                  className={INPUT}
                />
              </Field>
            </Div>
            <Div style={col}>
              <Field label="Target Type" required>
                <Select value={form.targetType} onChange={(event) => handleTargetTypeChange(event.target.value)} className={INPUT}>
                  {TARGET_OPTIONS.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Field>
            </Div>
          </Div>

          <Field label="Message" required className="mb-3">
            <Textarea
              value={form.message}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  message: event.target.value,
                }))
              }
              placeholder="Enter notification message"
              rows={4}
              className={TEXTAREA}
            />
          </Field>

          {form.targetType === 'CUSTOM' ? (
            <Div className="rounded-xl border border-slate-200 bg-slate-50 p-3 gap-3 mb-3">
              <SectionTitle className="mb-0">Pick recipients</SectionTitle>
              <Div className="flex-row flex-wrap gap-2 pb-3 border-b border-slate-200">
                {CATEGORY_TABS.map((tab) => {
                  const active = categoryFilter === tab.id;
                  const countMap = {
                    ALL: counts?.total,
                    USER: counts?.user,
                    RESTAURANT: counts?.restaurant,
                    DELIVERY_PARTNER: counts?.delivery,
                  };
                  const rawCount = countMap[tab.id];
                  const isLoadingCount = recipientLoading || rawCount === undefined || rawCount === null;
                  const count = rawCount ?? 0;
                  return (
                    <Button
                      key={tab.id}
                      type="button"
                      onClick={() => setCategoryFilter(tab.id)}
                      className={`flex-row items-center gap-2 h-11 px-4 rounded-lg border ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                    >
                      <Span className={active ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-700'}>{tab.label}</Span>
                      <Span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {isLoadingCount ? '…' : String(count)}
                      </Span>
                    </Button>
                  );
                })}
              </Div>

              <Toolbar className="mb-0">
                <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
                  <UiIcon as={Search} size={16} className="text-slate-400 shrink-0" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name, phone or email…"
                    className="flex-1 text-sm text-slate-900"
                  />
                </Div>
                <Button type="button" onClick={handleSelectAllFiltered} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Select all shown</Span>
                </Button>
                <Button type="button" onClick={handleDeselectAllFiltered} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Deselect shown</Span>
                </Button>
              </Toolbar>

              <Div className="flex-row flex-wrap items-center justify-between gap-2">
                {recipientLoading ? (
                  <Div className="flex-row items-center gap-1.5">
                    <UiIcon as={Loader2} size={12} className="text-blue-600" />
                    <Text style={tw`text-xs font-semibold text-blue-600`}>{SEARCHING_LABEL_MAP[categoryFilter] || 'Searching…'}</Text>
                  </Div>
                ) : (
                  <Text style={tw`text-xs text-slate-500`}>
                    {`Showing ${filteredRecipients.length} of ${pagination.matchedTotal} matches (page ${pagination.page} of ${pagination.totalPages})`}
                  </Text>
                )}
                <Text style={tw`text-xs font-semibold text-blue-600`}>{`Selected: ${selectedRecipients.length}`}</Text>
              </Div>

              <ScrollDiv className="max-h-72 rounded-xl border border-slate-200 bg-white">
                {recipientLoading && allRecipients.length === 0 ? (
                  <TableSkeleton rows={4} className="border-0" />
                ) : filteredRecipients.length === 0 ? (
                  <EmptyState title="No recipients found" message="No record matches your search in this category." className="border-0" />
                ) : (
                  filteredRecipients.map((recipient, i) => {
                    const key = `${recipient.ownerType}:${recipient.ownerId}`;
                    const checked = selectedKeys.has(key);
                    return (
                      <Label
                        key={key}
                        className={`flex-row items-start gap-3 px-3 py-3 ${i === filteredRecipients.length - 1 ? '' : 'border-b border-slate-100'} ${checked ? 'bg-blue-50' : ''}`}
                      >
                        <Input type="checkbox" checked={checked} onChange={() => toggleRecipient(recipient)} className="mt-1 w-5 h-5 rounded border-slate-300" />
                        <Div className="min-w-0 flex-1 gap-1">
                          <Div className="flex-row items-center gap-2">
                            <Text style={tw`text-sm font-semibold text-slate-900 flex-1`} numberOfLines={2}>
                              {recipient.label}
                            </Text>
                            {checked ? <StatusBadge tone="info" label="Selected" /> : null}
                          </Div>
                          <Div className="flex-row items-center gap-2">
                            <StatusBadge tone="neutral" label={String(recipient.ownerType || '').replaceAll('_', ' ')} />
                            {recipient.subLabel ? (
                              <Text style={tw`text-xs text-slate-500 flex-1`} numberOfLines={1}>
                                {recipient.subLabel}
                              </Text>
                            ) : null}
                          </Div>
                        </Div>
                      </Label>
                    );
                  })
                )}
              </ScrollDiv>

              <Div className="flex-row flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <Div className="flex-row flex-wrap items-center gap-3">
                  <Div className="flex-row items-center gap-2">
                    <Text style={tw`text-xs text-slate-500`}>Rows per page</Text>
                    <Select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                    >
                      <Option value={20}>20</Option>
                      <Option value={50}>50</Option>
                      <Option value={100}>100</Option>
                    </Select>
                  </Div>
                  <Text style={tw`text-xs text-slate-500`}>
                    {`Showing ${pagination.matchedTotal === 0 ? 0 : (page - 1) * limit + 1}–${Math.min(page * limit, pagination.matchedTotal)} of ${pagination.matchedTotal} recipients`}
                  </Text>
                </Div>

                <Div className="flex-row flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    disabled={page <= 1 || recipientLoading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    accessibilityLabel="Previous page"
                    className="w-11 h-11 items-center justify-center rounded-lg border border-slate-300 bg-white"
                  >
                    <UiIcon as={ChevronLeft} size={16} className="text-slate-600" />
                  </Button>
                  {pageNumbers.map((pg, idx) =>
                    pg === '...' ? (
                      <Span key={`dots-${idx}`} className="px-2 text-sm text-slate-400">
                        …
                      </Span>
                    ) : (
                      <Button
                        key={pg}
                        type="button"
                        onClick={() => setPage(pg)}
                        className={`w-11 h-11 items-center justify-center rounded-lg border ${page === pg ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}
                      >
                        <Span className={page === pg ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-700'}>{String(pg)}</Span>
                      </Button>
                    ),
                  )}
                  <Button
                    type="button"
                    disabled={page >= pagination.totalPages || recipientLoading}
                    onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                    accessibilityLabel="Next page"
                    className="w-11 h-11 items-center justify-center rounded-lg border border-slate-300 bg-white"
                  >
                    <UiIcon as={ChevronRight} size={16} className="text-slate-600" />
                  </Button>
                </Div>
              </Div>
            </Div>
          ) : null}

          <Div className="flex-row justify-end">
            <Button type="submit" disabled={submitting} className={BTN_PRIMARY}>
              <UiIcon as={submitting ? Loader2 : Send} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Send Broadcast</Span>
            </Button>
          </Div>
        </Form>
      </Card>

      {showHistoryModal ? (
        <Overlay onClose={() => setShowHistoryModal(false)} className="absolute inset-0 items-center justify-center bg-black/50 p-4">
          <Div className="bg-white rounded-xl border border-slate-200 w-full max-w-[1100px] max-h-[85vh] overflow-hidden">
            <Div className="flex-row items-center justify-between gap-2 p-4 border-b border-slate-200">
              <Div className="flex-1 min-w-0">
                <Text style={tw`text-base font-semibold text-slate-900`}>Broadcast History</Text>
                <Text style={tw`text-xs text-slate-500`}>View and manage sent broadcast notifications.</Text>
              </Div>
              <Button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                accessibilityLabel="Close history"
                className="w-11 h-11 rounded-lg items-center justify-center shrink-0"
              >
                <UiIcon as={X} size={18} className="text-slate-500" />
              </Button>
            </Div>

            <ScrollDiv className="p-4 bg-slate-50">
              {historyLoading ? (
                <LoadingState label="Loading history…" />
              ) : history.length === 0 ? (
                <EmptyState
                  icon={BellRing}
                  title="No broadcast notifications found"
                  message="Broadcasts you send will show up here."
                  actionLabel="Refresh"
                  onAction={() => loadHistory()}
                />
              ) : (
                <DataTable cols={HISTORY_COLS}>
                  <THead cols={HISTORY_COLS} labels={HISTORY_LABELS} />
                  <TBody>
                    {history.map((item, i) => (
                      <Row key={item?._id} last={i === history.length - 1} className={deletingIds.has(item?._id) ? 'opacity-40' : ''}>
                        <Cell width={HISTORY_COLS[0]}>
                          <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={2}>
                            {item?.title || 'Notification'}
                          </Text>
                        </Cell>
                        <Cell width={HISTORY_COLS[1]} numberOfLines={3}>
                          {item?.message || '-'}
                        </Cell>
                        <Cell width={HISTORY_COLS[2]}>
                          <StatusBadge tone="info" label={item?.targetLabel || item?.targetType || '—'} />
                        </Cell>
                        <Cell width={HISTORY_COLS[3]} align="center">
                          {String(item?.targetCount || item?.targets?.length || 0)}
                        </Cell>
                        <Cell width={HISTORY_COLS[4]}>{toDateLabel(item?.createdAt)}</Cell>
                        <Cell width={HISTORY_COLS[5]} align="center">
                          <Button
                            type="button"
                            onClick={() => handleDelete(item?._id)}
                            accessibilityLabel={`Delete ${item?.title || 'broadcast'}`}
                            className="w-11 h-11 rounded-lg items-center justify-center"
                          >
                            <UiIcon as={Trash2} size={16} className="text-red-600" />
                          </Button>
                        </Cell>
                      </Row>
                    ))}
                  </TBody>
                </DataTable>
              )}
            </ScrollDiv>
          </Div>
        </Overlay>
      ) : null}
    </AdminPage>
  );
}
