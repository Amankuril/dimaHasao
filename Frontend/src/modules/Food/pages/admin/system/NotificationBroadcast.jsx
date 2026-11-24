import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, ChevronLeft, ChevronRight, History, Loader2, Search, Send, Trash2, X } from "lucide-react";
import { adminAPI } from "@food/api";

const TARGET_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "USER", label: "Users" },
  { value: "RESTAURANT", label: "Restaurants" },
  { value: "DELIVERY", label: "Delivery Partners" },
  { value: "CUSTOM", label: "Particular Persons" },
];

const CATEGORY_TABS = [
  { id: "ALL", label: "All Recipients" },
  { id: "USER", label: "Users" },
  { id: "RESTAURANT", label: "Restaurants" },
  { id: "DELIVERY_PARTNER", label: "Delivery Partners" },
];

const SEARCHING_LABEL_MAP = {
  ALL: "Searching All Recipients...",
  USER: "Searching Users...",
  RESTAURANT: "Searching Restaurants...",
  DELIVERY_PARTNER: "Searching Delivery Partners...",
};

const toDateLabel = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function NotificationBroadcast() {
  const [form, setForm] = useState(() => {
    const savedTarget = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("admin_broadcast_targetType") : null;
    return {
      title: "",
      message: "",
      targetType: savedTarget && TARGET_OPTIONS.some((opt) => opt.value === savedTarget) ? savedTarget : "ALL",
    };
  });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const initialLoadDone = useRef(false);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [allRecipients, setAllRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [counts, setCounts] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, matchedTotal: 0, totalPages: 1 });
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleTargetTypeChange = (newTarget) => {
    setForm((prev) => ({ ...prev, targetType: newTarget }));
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("admin_broadcast_targetType", newTarget);
    }
  };

  const loadHistory = async ({ silent = false } = {}) => {
    try {
      if (!silent) setHistoryLoading(true);
      const response = await adminAPI.getBroadcastNotifications({ page: 1, limit: 50 });
      setHistory(response?.data?.data?.items || []);
    } catch {
      if (!silent) setHistory([]);
    } finally {
      if (!silent) setHistoryLoading(false);
      initialLoadDone.current = true;
    }
  };

  const fetchRecipients = async (searchQuery = "", targetCategory = categoryFilter, pageNum = page, limitNum = limit) => {
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
    if (form.targetType !== "CUSTOM") return;
    const timer = setTimeout(() => {
      fetchRecipients(search, categoryFilter, page, limit);
    }, 250);
    return () => clearTimeout(timer);
  }, [form.targetType, search, categoryFilter, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  useEffect(() => {
    if (form.targetType !== "CUSTOM") {
      setSelectedRecipients([]);
      setSearch("");
      setCategoryFilter("ALL");
      setPage(1);
    }
  }, [form.targetType]);

  const selectedKeys = useMemo(
    () => new Set(selectedRecipients.map((item) => `${item.ownerType}:${item.ownerId}`)),
    [selectedRecipients]
  );

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
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(total - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (page < total - 2) pages.push("...");
      if (!pages.includes(total)) pages.push(total);
    }
    return pages;
  }, [page, pagination.totalPages]);

  const toggleRecipient = (recipient) => {
    const key = `${recipient.ownerType}:${recipient.ownerId}`;
    setSelectedRecipients((prev) =>
      prev.some((item) => `${item.ownerType}:${item.ownerId}` === key)
        ? prev.filter((item) => `${item.ownerType}:${item.ownerId}` !== key)
        : [...prev, recipient]
    );
  };

  const handleSelectAllFiltered = () => {
    const newItems = filteredRecipients.filter(
      (item) => !selectedKeys.has(`${item.ownerType}:${item.ownerId}`)
    );
    if (newItems.length > 0) {
      setSelectedRecipients((prev) => [...prev, ...newItems]);
    }
  };

  const handleDeselectAllFiltered = () => {
    const filteredKeys = new Set(
      filteredRecipients.map((item) => `${item.ownerType}:${item.ownerId}`)
    );
    setSelectedRecipients((prev) =>
      prev.filter((item) => !filteredKeys.has(`${item.ownerType}:${item.ownerId}`))
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    if (form.targetType === "CUSTOM" && selectedRecipients.length === 0) return;

    try {
      setSubmitting(true);
      await adminAPI.createBroadcastNotification({
        title: form.title.trim(),
        message: form.message.trim(),
        targetType: form.targetType,
        targetIds:
          form.targetType === "CUSTOM"
            ? selectedRecipients.map((item) => item.ownerId)
            : [],
        targets:
          form.targetType === "CUSTOM"
            ? selectedRecipients.map((item) => ({
                ownerType: item.ownerType,
                ownerId: item.ownerId,
                label: item.label,
                subLabel: item.subLabel,
              }))
            : [],
      });
      setForm((prev) => ({ title: "", message: "", targetType: prev.targetType }));
      setSelectedRecipients([]);
      setSearch("");
      setCategoryFilter("ALL");
      setPage(1);
      window.dispatchEvent(new Event("adminBroadcastUpdated"));
      await loadHistory({ silent: true });
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
      window.dispatchEvent(new Event("adminBroadcastUpdated"));
    } catch {
      await loadHistory({ silent: true });
    } finally {
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-neutral-100 text-neutral-500">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-medium text-neutral-900">Broadcast notification</h1>
              </div>
              <p className="text-sm text-neutral-500 mt-1">
                Send one notification to all, role-based, or selected recipients
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="inline-flex items-center gap-2.5 px-5 py-3 text-sm font-medium rounded-2xl text-white shadow-sm shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-colors self-start sm:self-auto cursor-pointer bg-neutral-600"
          >
            <History className="w-5 h-5 text-white" /> View history
            <span className="bg-white/25 text-white text-xs px-2.5 py-0.5 rounded-full font-medium ml-0.5 inline-flex items-center justify-center min-w-[28px] min-h-[24px]">
              {historyLoading ? (
                <span className="block w-2.5 h-3 bg-white/40 rounded animate-pulse" />
              ) : (
                history.length
              )}
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Enter notification title"
                className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-[#0a4d2b]/30"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Target type</span>
              <select
                value={form.targetType}
                onChange={(event) => handleTargetTypeChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-[#0a4d2b]/30 font-medium"
              >
                {TARGET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Message</span>
            <textarea
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="Enter notification message"
              rows={4}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-[#0a4d2b]/30 resize-y"
            />
          </label>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 shadow-sm shadow-blue-500/20 hover:shadow-lg transition-colors cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Broadcast
            </button>
          </div>

          {form.targetType === "CUSTOM" && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 space-y-4">
              <div className="flex flex-wrap gap-2 pb-1 border-b border-neutral-200">
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
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCategoryFilter(tab.id)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-medium transition-colors ${
                        active
                          ? "bg-neutral-900 text-white shadow-sm"
                          : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`inline-flex items-center justify-center min-w-[20px] rounded-full px-2 py-0.5 text-xs font-medium ${
                          active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {isLoadingCount ? (
                          <span className="inline-block w-5 h-2.5 bg-neutral-300/80 animate-pulse rounded-full" />
                        ) : (
                          count
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 flex-1 w-full">
                  <Search className="w-4 h-4 text-neutral-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name, phone, or email across all DB records"
                    className="w-full text-sm bg-transparent outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-3 py-2 text-xs font-medium text-[#0a4d2b] hover:bg-neutral-50 rounded-xl border border-neutral-200 bg-white"
                  >
                    Select all shown
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllFiltered}
                    className="px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-xl border border-neutral-200 bg-white"
                  >
                    Deselect shown
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-medium text-neutral-500 px-1">
                <span>
                  {recipientLoading ? (
                    <span className="inline-flex items-center gap-1.5 text-[#0a4d2b] font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> {SEARCHING_LABEL_MAP[categoryFilter] || "Searching..."}
                    </span>
                  ) : (
                    `Showing ${filteredRecipients.length} of ${pagination.matchedTotal} matches (Page ${pagination.page} of ${pagination.totalPages})`
                  )}
                </span>
                <span className="font-medium text-[#0a4d2b]">
                  Selected: {selectedRecipients.length}
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100">
                {recipientLoading && allRecipients.length === 0 ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="flex items-center gap-3 animate-pulse">
                        <div className="w-4 h-4 rounded bg-neutral-200" />
                        <div className="space-y-1 flex-1">
                          <div className="h-3.5 bg-neutral-200 rounded w-1/3" />
                          <div className="h-2.5 bg-neutral-100 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredRecipients.length === 0 ? (
                  <div className="p-6 text-sm text-neutral-500">No recipients found matching your filter</div>
                ) : (
                  filteredRecipients.map((recipient) => {
                    const key = `${recipient.ownerType}:${recipient.ownerId}`;
                    const checked = selectedKeys.has(key);
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          checked ? "bg-neutral-50/70 hover:bg-neutral-50" : "hover:bg-neutral-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecipient(recipient)}
                          className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#0a4d2b] focus:ring-[#0a4d2b]/30"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-neutral-900">
                              {recipient.label}
                            </div>
                            {checked && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-neutral-900 text-white">
                                Selected
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-1.5 ${
                                recipient.ownerType === "USER"
                                  ? "bg-neutral-100 text-[#0a4d2b]"
                                  : recipient.ownerType === "RESTAURANT"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {recipient.ownerType.replaceAll("_", " ")}
                            </span>
                            {recipient.subLabel ? recipient.subLabel : ""}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-3 border-t border-neutral-200 px-1">
                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600">
                  <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-xl border border-neutral-900/[0.08] bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 outline-none focus:border-neutral-400"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <span>
                    Showing <strong className="text-neutral-900">{pagination.matchedTotal === 0 ? 0 : (page - 1) * limit + 1}</strong> to <strong className="text-neutral-900">{Math.min(page * limit, pagination.matchedTotal)}</strong> of <strong className="text-neutral-900">{pagination.matchedTotal}</strong> recipients
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1 || recipientLoading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-2 text-xs text-neutral-400 font-medium">
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-medium transition-colors ${
                          page === p
                            ? "bg-neutral-900 text-white shadow-sm"
                            : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages || recipientLoading}
                    onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-neutral-900/[0.08] shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-neutral-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-neutral-100 text-neutral-500">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">Broadcast history</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">View and manage sent broadcast notifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-2 rounded-xl text-neutral-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-neutral-50/50">
              {historyLoading ? (
                <div className="py-16 text-sm text-neutral-500 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0a4d2b]" />
                  <span>Loading history...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="py-16 text-center text-sm text-neutral-500 flex flex-col items-center justify-center gap-2">
                  <BellRing className="w-10 h-10 text-neutral-300" />
                  <span className="font-medium text-neutral-700">No broadcast notifications found</span>
                  <span className="text-xs text-neutral-400">Broadcasts you send will show up here</span>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-neutral-500 bg-neutral-100/80 border-b border-neutral-200">
                          <th className="py-3.5 px-4 w-44">Title</th>
                          <th className="py-3.5 px-4">Message</th>
                          <th className="py-3.5 px-4 w-40">Target type</th>
                          <th className="py-3.5 px-4 w-28 text-center">Recipients</th>
                          <th className="py-3.5 px-4 w-44">Sent at</th>
                          <th className="py-3.5 px-4 w-32 text-right pr-5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {history.map((item) => (
                          <tr key={item?._id} className={`align-middle hover:bg-neutral-50/80 transition-colors ${deletingIds.has(item?._id) ? 'opacity-30' : 'opacity-100'}`}>
                            <td className="py-4 px-4 font-medium text-neutral-900 w-44 truncate" title={item?.title}>
                              {item?.title || "Notification"}
                            </td>
                            <td className="py-4 px-4 text-neutral-600 max-w-[280px]">
                              <p className="truncate text-xs font-medium text-neutral-700" title={item?.message}>
                                {item?.message || "-"}
                              </p>
                            </td>
                            <td className="py-4 px-4 w-40">
                              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-50 text-[#0a4d2b] border border-neutral-200 whitespace-nowrap">
                                {item?.targetLabel || item?.targetType}
                              </span>
                            </td>
                            <td className="py-4 px-4 w-28 text-center font-medium text-neutral-800">
                              {item?.targetCount || item?.targets?.length || 0}
                            </td>
                            <td className="py-4 px-4 w-44 text-neutral-500 whitespace-nowrap text-xs">
                              {toDateLabel(item?.createdAt)}
                            </td>
                            <td className="py-4 px-4 w-32 text-right pr-5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleDelete(item?._id)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer shadow-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
