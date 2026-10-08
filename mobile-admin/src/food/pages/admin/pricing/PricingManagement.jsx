/* Ported from Frontend/src/modules/Food/pages/admin/pricing/PricingManagement.jsx (tools/port.js first pass). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IndianRupee, Loader2, Percent, Save, Trash2, RefreshCw, Search, X } from 'lucide-react-native';
import { Button } from '../../../../components/shadcn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/shadcn';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import { Button as HButton, Div, H1, H3, Input, Label, Overlay, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
const RUPEE = '\u20B9';
const emptyRuleForm = {
  type: 'PERCENTAGE',
  value: '10',
  status: 'active',
};
function formatRuleLabel(rule) {
  if (!rule) return '';
  const value = Number(rule.value) || 0;
  return rule.type === 'FIXED' ? `+${RUPEE}${value}` : `+${value}%`;
}
function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
function PreviewCard({ type, value }) {
  const base = 200;
  const num = Number(value) || 0;
  const other = type === 'FIXED' ? base + num : Math.round((base + (base * num) / 100) * 100) / 100;
  return (
    <Div className="rounded-xl border border-dashed border-[#DC2626]/40 bg-red-50 px-4 py-3">
      <P className="text-[11px] font-bold uppercase tracking-wide text-[#DC2626]">Preview</P>
      <P className="mt-1 text-sm text-gray-700">
        Base {RUPEE}
        {base} → Other {RUPEE}
        {other.toFixed(0)}
        <Span className="ml-2 text-xs text-gray-500">({type === 'FIXED' ? `+${RUPEE}${num}` : `+${num}%`})</Span>
      </P>
    </Div>
  );
}
function RuleEditor({ title, form, setForm, onSave, saving, onClear, canClear }) {
  return (
    <Div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Div className="flex items-center justify-between gap-3">
        <H3 className="text-sm font-bold text-slate-900">{title}</H3>
        {canClear ? (
          <HButton type="button" onClick={onClear} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline">
            <UiIcon as={Trash2} className="h-3.5 w-3.5" /> Remove override
          </HButton>
        ) : null}
      </Div>

      <Div className="flex flex-wrap gap-2">
        <HButton
          type="button"
          onClick={() =>
            setForm((p) => ({
              ...p,
              type: 'PERCENTAGE',
            }))
          }
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${form.type === 'PERCENTAGE' ? 'bg-[#DC2626] text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          <UiIcon as={Percent} className="h-3.5 w-3.5" /> Percentage
        </HButton>
        <HButton
          type="button"
          onClick={() =>
            setForm((p) => ({
              ...p,
              type: 'FIXED',
            }))
          }
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${form.type === 'FIXED' ? 'bg-[#DC2626] text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          <UiIcon as={IndianRupee} className="h-3.5 w-3.5" /> Fixed amount
        </HButton>
      </Div>

      <Div>
        <Label className="mb-1 block text-xs font-semibold text-slate-500">{form.type === 'FIXED' ? 'Increase by (₹)' : 'Increase by (%)'}</Label>
        <Input
          type="number"
          min="0"
          max={form.type === 'PERCENTAGE' ? 500 : undefined}
          step="0.01"
          value={form.value}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              value: e.target.value,
            }))
          }
          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#DC2626]"
        />
      </Div>

      <PreviewCard type={form.type} value={form.value} />

      <Button type="button" disabled={saving} onClick={onSave} className="h-11 w-full rounded-xl bg-[#DC2626] font-bold text-white hover:bg-[#B91C1C]">
        {saving ? (
          <Span className="inline-flex items-center gap-2">
            <UiIcon as={Loader2} className="h-4 w-4 animate-spin" /> Saving...
          </Span>
        ) : (
          <Span className="inline-flex items-center gap-2">
            <UiIcon as={Save} className="h-4 w-4" /> Save rule
          </Span>
        )}
      </Button>
    </Div>
  );
}
function PricingStatusBadge({ rule, globalRule }) {
  if (rule) {
    return (
      <Span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
        {formatRuleLabel(rule)}
      </Span>
    );
  }
  if (globalRule) {
    return (
      <Span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/15">
        {formatRuleLabel(globalRule)}
      </Span>
    );
  }
  return <Span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">No Rule</Span>;
}
function ConfirmBulkModal({ open, count, type, value, onCancel, onConfirm, saving, entityLabel = 'restaurant' }) {
  if (!open) return null;
  const label = type === 'FIXED' ? `+${RUPEE}${Number(value) || 0}` : `+${Number(value) || 0}%`;
  const plural = count === 1 ? entityLabel : `${entityLabel}s`;
  return (
    <Overlay onClose={saving ? undefined : onCancel} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
      <Div className="absolute inset-0" onClick={saving ? undefined : onCancel} />
      <Div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <H3 className="text-base font-bold text-slate-900">Confirm bulk apply</H3>
        <P className="mt-2 text-sm text-slate-600">
          You are about to apply <Span className="font-semibold text-slate-900">{label}</Span> pricing to{' '}
          <Span className="font-semibold text-slate-900">{count}</Span> {plural}.
        </P>
        <Div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={saving} className="rounded-xl bg-[#DC2626] font-bold text-white hover:bg-[#B91C1C]">
            {saving ? (
              <Span className="inline-flex items-center gap-2">
                <UiIcon as={Loader2} className="h-4 w-4 animate-spin" /> Applying...
              </Span>
            ) : (
              'Apply'
            )}
          </Button>
        </Div>
      </Div>
    </Overlay>
  );
}
function ConfirmDeleteModal({ open, label, onCancel, onConfirm, saving }) {
  if (!open) return null;
  return (
    <Overlay onClose={saving ? undefined : onCancel} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
      <Div className="absolute inset-0" onClick={saving ? undefined : onCancel} />
      <Div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <H3 className="text-base font-bold text-slate-900">Remove override?</H3>
        <P className="mt-2 text-sm text-slate-600">{label || 'This restaurant will inherit Global pricing (if configured).'}</P>
        <Div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={saving} className="rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700">
            {saving ? 'Removing...' : 'Remove'}
          </Button>
        </Div>
      </Div>
    </Overlay>
  );
}
function RestaurantPricingPanel({ restaurants, rules, globalRule, saving, onRemoveOverride, onBulkApply }) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkType, setBulkType] = useState('PERCENTAGE');
  const [bulkValue, setBulkValue] = useState('10');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const applyLockRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_pricing_restaurants_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const restaurantRuleMap = useMemo(() => {
    const map = new Map();
    for (const rule of rules) {
      if (rule.scope !== 'RESTAURANT' || rule.status !== 'active') continue;
      const rid = String(rule.restaurantId || '');
      if (!rid) continue;
      const prev = map.get(rid);
      if (!prev) {
        map.set(rid, rule);
        continue;
      }
      const prevTime = new Date(prev.updatedAt || 0).getTime();
      const nextTime = new Date(rule.updatedAt || 0).getTime();
      if (nextTime >= prevTime) map.set(rid, rule);
    }
    return map;
  }, [rules]);
  const filteredRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return restaurants;
    const tokens = q.split(/\s+/).filter(Boolean);
    return restaurants.filter((r) => {
      const haystack = [r.name, r.id, r.code, r.ownerName].filter(Boolean).join(' ').toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [restaurants, search]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  const totalPages = Math.max(1, Math.ceil(filteredRestaurants.length / pageSize) || 1);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);
  const pagedRestaurants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRestaurants.slice(start, start + pageSize);
  }, [filteredRestaurants, currentPage, pageSize]);
  const visibleIds = useMemo(() => pagedRestaurants.map((r) => r.id), [pagedRestaurants]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllRestaurants = () => {
    setSelectedIds(new Set(restaurants.map((r) => r.id)));
  };
  const toggleVisibleHeader = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }
    selectVisible();
  };
  const selectedCount = selectedIds.size;
  const selectedList = useMemo(() => [...selectedIds], [selectedIds]);
  const openConfirm = () => {
    if (!selectedCount) {
      toast.error('Select at least one restaurant');
      return;
    }
    const num = Number(bulkValue);
    if (!Number.isFinite(num) || num < 0) {
      toast.error('Enter a valid value');
      return;
    }
    if (bulkType === 'PERCENTAGE' && num > 500) {
      toast.error('Percentage cannot exceed 500%');
      return;
    }
    setConfirmOpen(true);
  };
  const handleConfirmApply = async () => {
    if (applyLockRef.current || saving) return;
    applyLockRef.current = true;
    try {
      await onBulkApply({
        restaurantIds: selectedList,
        type: bulkType,
        value: Number(bulkValue),
      });
      setConfirmOpen(false);
      clearSelection();
    } catch {
      // parent shows toast
    } finally {
      applyLockRef.current = false;
    }
  };
  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id || applyLockRef.current || saving) return;
    applyLockRef.current = true;
    try {
      await onRemoveOverride(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // parent toast
    } finally {
      applyLockRef.current = false;
    }
  };
  return (
    <Div className="space-y-4">
      <Div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Div className="relative max-w-md flex-1">
          <UiIcon as={Search} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or owner"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-[#DC2626]"
          />
          {search ? (
            <HButton
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <UiIcon as={X} className="h-4 w-4" />
            </HButton>
          ) : null}
        </Div>
        <Div className="flex flex-wrap items-center gap-2 text-xs">
          <HButton type="button" onClick={selectAllRestaurants} className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100">
            Select all ({restaurants.length})
          </HButton>
          <HButton type="button" onClick={selectVisible} className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100">
            Select visible ({pagedRestaurants.length})
          </HButton>
          <HButton type="button" onClick={clearSelection} className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100">
            Clear selection
          </HButton>
        </Div>
      </Div>

      <Div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Div>
          <Table className="min-w-full border-collapse text-left text-sm" cols={[44, 200, 140, 130, 140, 140]}>
            <Thead className="z-10 bg-slate-50">
              <Tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Th className="w-10 px-3 py-3">
                  <Input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleHeader}
                    accessibilityLabel="Select visible restaurants"
                    className="h-4 w-4 rounded border-slate-300 text-[#DC2626] focus:ring-[#DC2626]"
                  />
                </Th>
                <Th className="px-3 py-3 font-semibold">Restaurant</Th>
                <Th className="px-3 py-3 font-semibold">Admin Pricing</Th>
                <Th className="px-3 py-3 font-semibold">Rule Type</Th>
                <Th className="px-3 py-3 font-semibold">Last Updated</Th>
                <Th className="px-3 py-3 text-right font-semibold">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredRestaurants.length === 0 ? (
                <Tr>
                  <Td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                    No restaurants match your search.
                  </Td>
                </Tr>
              ) : (
                pagedRestaurants.map((restaurant) => {
                  const rule = restaurantRuleMap.get(restaurant.id) || null;
                  const checked = selectedIds.has(restaurant.id);
                  return (
                    <Tr key={restaurant.id} className={`border-b border-slate-100 last:border-0 ${checked ? 'bg-rose-50/40' : 'hover:bg-slate-50/80'}`}>
                      <Td className="px-3 py-3 align-middle">
                        <Input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(restaurant.id)}
                          accessibilityLabel={`Select ${restaurant.name}`}
                          className="h-4 w-4 rounded border-slate-300 text-[#DC2626] focus:ring-[#DC2626]"
                        />
                      </Td>
                      <Td className="px-3 py-3 align-middle">
                        <Div className="min-w-0">
                          <P className="truncate font-semibold text-slate-900">{restaurant.name}</P>
                          {(restaurant.code || restaurant.ownerName) && (
                            <P className="mt-0.5 truncate text-xs text-slate-400">
                              {[restaurant.code ? `Code · ${restaurant.code}` : null, restaurant.ownerName ? `Owner · ${restaurant.ownerName}` : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </P>
                          )}
                        </Div>
                      </Td>
                      <Td className="px-3 py-3 align-middle">
                        <PricingStatusBadge rule={rule} globalRule={globalRule} />
                      </Td>
                      <Td className="px-3 py-3 align-middle text-slate-600">
                        {rule ? (rule.type === 'FIXED' ? 'Fixed' : 'Percentage') : globalRule ? 'Global' : '—'}
                      </Td>
                      <Td className="px-3 py-3 align-middle text-slate-500">{formatShortDate(rule?.updatedAt)}</Td>
                      <Td className="px-3 py-3 align-middle text-right">
                        {rule?.id ? (
                          <HButton
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              setDeleteTarget({
                                id: rule.id,
                                label: `Remove override for "${restaurant.name}"? It will inherit Global pricing if configured.`,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            <UiIcon as={Trash2} className="h-3.5 w-3.5" />
                            Remove
                          </HButton>
                        ) : (
                          <Span className="text-xs text-slate-300">—</Span>
                        )}
                      </Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Div>
        <Div className="flex items-center justify-end border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          <Span>{selectedCount} selected</Span>
        </Div>
        <AdminListPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredRestaurants.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            try {
              localStorage.setItem('admin_pricing_restaurants_pageSize', String(size));
            } catch {
              // ignore
            }
            setPageSize(size);
            setCurrentPage(1);
          }}
          itemLabel="restaurants"
        />
      </Div>

      {selectedCount > 0 ? (
        <Div className="z-20 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
          <Div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <Div>
              <P className="text-sm font-bold text-slate-900">
                {selectedCount} restaurant{selectedCount === 1 ? '' : 's'} selected
              </P>
              <P className="mt-0.5 text-xs text-slate-500">Apply one rule to every selected restaurant in a single action.</P>
            </Div>
            <Div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                <HButton
                  type="button"
                  onClick={() => setBulkType('PERCENTAGE')}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${bulkType === 'PERCENTAGE' ? 'bg-white text-[#DC2626] shadow-sm' : 'text-slate-500'}`}
                >
                  <UiIcon as={Percent} className="h-3.5 w-3.5" />
                </HButton>
                <HButton
                  type="button"
                  onClick={() => setBulkType('FIXED')}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${bulkType === 'FIXED' ? 'bg-white text-[#DC2626] shadow-sm' : 'text-slate-500'}`}
                >
                  <UiIcon as={IndianRupee} className="h-3.5 w-3.5" /> Fixed
                </HButton>
              </Div>
              <Div>
                <Label className="mb-1 block text-[11px] font-semibold text-slate-400">Value</Label>
                <Input
                  type="number"
                  min="0"
                  max={bulkType === 'PERCENTAGE' ? 500 : undefined}
                  step="0.01"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="h-10 w-28 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#DC2626]"
                />
              </Div>
              <Button
                type="button"
                disabled={saving}
                onClick={openConfirm}
                className="h-10 rounded-xl bg-[#DC2626] px-4 font-bold text-white hover:bg-[#B91C1C]"
              >
                Apply to selected
              </Button>
              <Button type="button" variant="outline" onClick={clearSelection} className="h-10 rounded-xl">
                Clear
              </Button>
            </Div>
          </Div>
        </Div>
      ) : null}

      <ConfirmBulkModal
        open={confirmOpen}
        count={selectedCount}
        type={bulkType}
        value={bulkValue}
        saving={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmApply}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        label={deleteTarget?.label}
        saving={saving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </Div>
  );
}
function MenuItemPricingPanel({ restaurants, rules, globalRule, saving, onRemoveOverride, onBulkApply }) {
  const [restaurantId, setRestaurantId] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkType, setBulkType] = useState('PERCENTAGE');
  const [bulkValue, setBulkValue] = useState('10');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const applyLockRef = useRef(false);
  const loadSeqRef = useRef(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_pricing_menu_items_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const restaurantRule = useMemo(() => {
    if (!restaurantId) return null;
    return rules.find((r) => r.scope === 'RESTAURANT' && String(r.restaurantId) === String(restaurantId) && r.status === 'active') || null;
  }, [rules, restaurantId]);
  const menuRuleMap = useMemo(() => {
    const map = new Map();
    for (const rule of rules) {
      if (rule.scope !== 'MENU_ITEM' || rule.status !== 'active') continue;
      const mid = String(rule.menuItemId || '');
      if (!mid) continue;
      const prev = map.get(mid);
      if (!prev) {
        map.set(mid, rule);
        continue;
      }
      const prevTime = new Date(prev.updatedAt || 0).getTime();
      const nextTime = new Date(rule.updatedAt || 0).getTime();
      if (nextTime >= prevTime) map.set(mid, rule);
    }
    return map;
  }, [rules]);
  const inheritedRule = restaurantRule || globalRule || null;
  const loadMenuItems = useCallback(async (rid) => {
    const seq = ++loadSeqRef.current;
    if (!rid) {
      setMenuItems([]);
      setMenuError('');
      return;
    }
    try {
      setLoadingMenu(true);
      setMenuError('');
      // FoodItem collection is the source of truth — not the legacy restaurant.menu embed.
      const foodsRes = await adminAPI.getFoods({
        restaurantId: rid,
        limit: 1000,
        approvalStatus: 'approved',
      });
      if (seq !== loadSeqRef.current) return;
      const foods = foodsRes?.data?.data?.foods || foodsRes?.data?.data || [];
      const normalized = (Array.isArray(foods) ? foods : [])
        .map((f) => ({
          id: String(f._id || f.id || ''),
          name: f.name || 'Item',
          price: Number(f.price) || 0,
          categoryName: f.categoryName || '',
          isAvailable: f.isAvailable !== false,
        }))
        .filter((i) => i.id)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
      setMenuItems(normalized);
      if (!normalized.length) {
        setMenuError('No approved menu items found for this restaurant.');
      }
    } catch (error) {
      if (seq !== loadSeqRef.current) return;
      setMenuItems([]);
      setMenuError(error?.response?.data?.message || 'Failed to load menu items');
      toast.error(error?.response?.data?.message || 'Failed to load menu items');
    } finally {
      if (seq === loadSeqRef.current) setLoadingMenu(false);
    }
  }, []);
  const handleRestaurantChange = (id) => {
    setRestaurantId(id);
    setSelectedIds(new Set());
    setSearch('');
    setConfirmOpen(false);
    setDeleteTarget(null);
    loadMenuItems(id);
  };
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const list = !tokens.length
      ? [...menuItems]
      : menuItems.filter((item) => {
          const haystack = [item.name, item.id, item.categoryName].filter(Boolean).join(' ').toLowerCase();
          return tokens.every((token) => haystack.includes(token));
        });

    // Keep rows in a stable category → name sequence
    return list.sort((a, b) => {
      const catA = String(a.categoryName || '').toLowerCase();
      const catB = String(b.categoryName || '').toLowerCase();
      if (catA !== catB) return catA.localeCompare(catB);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [menuItems, search]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, restaurantId]);
  const totalItemPages = Math.max(1, Math.ceil(filteredItems.length / pageSize) || 1);
  useEffect(() => {
    if (currentPage > totalItemPages) setCurrentPage(totalItemPages);
  }, [currentPage, totalItemPages]);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);
  const visibleIds = useMemo(() => pagedItems.map((i) => i.id), [pagedItems]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;
  const selectedList = useMemo(() => [...selectedIds], [selectedIds]);
  const selectedBasePriceLabel = useMemo(() => {
    if (!selectedCount) return null;
    const selected = menuItems.filter((item) => selectedIds.has(item.id));
    if (!selected.length) return null;
    if (selected.length === 1) {
      return `${RUPEE}${Math.round(Number(selected[0].price) || 0)}`;
    }
    const prices = selected.map((item) => Math.round(Number(item.price) || 0));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `${RUPEE}${min}`;
    return `${RUPEE}${min} – ${RUPEE}${max}`;
  }, [menuItems, selectedIds, selectedCount]);
  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllItems = () => {
    setSelectedIds(new Set(menuItems.map((i) => i.id)));
  };
  const toggleVisibleHeader = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }
    selectVisible();
  };
  const openConfirm = () => {
    if (!restaurantId) {
      toast.error('Select a restaurant first');
      return;
    }
    if (!selectedCount) {
      toast.error('Select at least one menu item');
      return;
    }
    const num = Number(bulkValue);
    if (!Number.isFinite(num) || num < 0) {
      toast.error('Enter a valid value');
      return;
    }
    if (bulkType === 'PERCENTAGE' && num > 500) {
      toast.error('Percentage cannot exceed 500%');
      return;
    }
    setConfirmOpen(true);
  };
  const handleConfirmApply = async () => {
    if (applyLockRef.current || saving) return;
    applyLockRef.current = true;
    try {
      await onBulkApply({
        restaurantId,
        menuItemIds: selectedList,
        type: bulkType,
        value: Number(bulkValue),
      });
      setConfirmOpen(false);
      clearSelection();
    } catch {
      // parent toast
    } finally {
      applyLockRef.current = false;
    }
  };
  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id || applyLockRef.current || saving) return;
    applyLockRef.current = true;
    try {
      await onRemoveOverride(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // parent toast
    } finally {
      applyLockRef.current = false;
    }
  };
  return (
    <Div className="space-y-4">
      <Div className="rounded-2xl border border-slate-200 bg-white p-4">
        <Label className="mb-1 block text-xs font-semibold text-slate-500">Restaurant</Label>
        <Select value={restaurantId || '__none__'} onValueChange={(value) => handleRestaurantChange(value === '__none__' ? '' : value)}>
          <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white text-sm font-semibold text-slate-900">
            <SelectValue placeholder="Select restaurant" />
          </SelectTrigger>
          <SelectContent className="max-h-72 border-slate-200 bg-white text-slate-900">
            <SelectItem
              value="__none__"
              className="cursor-pointer focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
            >
              Select restaurant
            </SelectItem>
            {restaurants.map((r) => (
              <SelectItem
                key={r.id}
                value={r.id}
                className="cursor-pointer focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
              >
                <Span className="truncate">{r.name}</Span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Div>

      {!restaurantId ? (
        <P className="text-sm text-slate-500">Select a restaurant to load menu items and apply overrides in bulk.</P>
      ) : (
        <>
          <Div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Div className="relative max-w-md flex-1">
              <UiIcon as={Search} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu items"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-[#DC2626]"
              />
              {search ? (
                <HButton
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <UiIcon as={X} className="h-4 w-4" />
                </HButton>
              ) : null}
            </Div>
            <Div className="flex flex-wrap items-center gap-2 text-xs">
              <HButton
                type="button"
                onClick={selectAllItems}
                disabled={!menuItems.length}
                className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Select all ({menuItems.length})
              </HButton>
              <HButton
                type="button"
                onClick={selectVisible}
                disabled={!filteredItems.length}
                className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Select visible ({pagedItems.length})
              </HButton>
              <HButton type="button" onClick={clearSelection} className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100">
                Clear selection
              </HButton>
            </Div>
          </Div>

          <Div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <Div>
              {loadingMenu ? (
                <Div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
                  <UiIcon as={Loader2} className="h-4 w-4 animate-spin text-[#DC2626]" />
                  Loading menu items...
                </Div>
              ) : (
                <Table className="w-full border-collapse text-sm" cols={[44, 190, 150, 140, 130, 140, 120]}>
                  <Thead className="z-10 bg-slate-50">
                    <Tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Th className="px-2 py-3 text-center">
                        <Input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleVisibleHeader}
                          disabled={!visibleIds.length}
                          accessibilityLabel="Select visible menu items"
                          className="mx-auto h-4 w-4 rounded border-slate-300 text-[#DC2626] focus:ring-[#DC2626]"
                        />
                      </Th>
                      <Th className="px-2 py-3 text-center font-semibold">Menu Item</Th>
                      <Th className="px-2 py-3 text-center font-semibold">Restaurant Base Price</Th>
                      <Th className="px-2 py-3 text-center font-semibold">Admin Pricing</Th>
                      <Th className="px-2 py-3 text-center font-semibold">Rule Type</Th>
                      <Th className="px-2 py-3 text-center font-semibold">Last Updated</Th>
                      <Th className="px-2 py-3 text-center font-semibold">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredItems.length === 0 ? (
                      <Tr>
                        <Td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                          {menuError || 'No menu items match your search.'}
                        </Td>
                      </Tr>
                    ) : (
                      pagedItems.map((item) => {
                        const rule = menuRuleMap.get(item.id) || null;
                        const checked = selectedIds.has(item.id);
                        const ruleTypeLabel = rule
                          ? rule.type === 'FIXED'
                            ? 'Fixed'
                            : 'Percentage'
                          : restaurantRule
                            ? 'Restaurant'
                            : globalRule
                              ? 'Global'
                              : '—';
                        return (
                          <Tr key={item.id} className={`border-b border-slate-100 last:border-0 ${checked ? 'bg-rose-50/40' : 'hover:bg-slate-50/80'}`}>
                            <Td className="px-2 py-3 text-center align-middle">
                              <Input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleOne(item.id)}
                                accessibilityLabel={`Select ${item.name}`}
                                className="mx-auto h-4 w-4 rounded border-slate-300 text-[#DC2626] focus:ring-[#DC2626]"
                              />
                            </Td>
                            <Td className="px-2 py-3 text-center align-middle">
                              <P className="truncate font-semibold text-slate-900">{item.name}</P>
                              <P className="mt-0.5 truncate text-xs text-slate-400">
                                {item.categoryName || 'Uncategorized'}
                                {!item.isAvailable ? ' · Unavailable' : ''}
                              </P>
                            </Td>
                            <Td className="px-2 py-3 text-center align-middle font-semibold text-slate-700">
                              {RUPEE}
                              {Math.round(item.price || 0)}
                            </Td>
                            <Td className="px-2 py-3 text-center align-middle">
                              <Div className="flex justify-center">
                                <PricingStatusBadge rule={rule} globalRule={inheritedRule} />
                              </Div>
                            </Td>
                            <Td className="px-2 py-3 text-center align-middle text-slate-600">{ruleTypeLabel}</Td>
                            <Td className="px-2 py-3 text-center align-middle text-slate-500">{formatShortDate(rule?.updatedAt)}</Td>
                            <Td className="px-2 py-3 text-center align-middle">
                              {rule?.id ? (
                                <HButton
                                  type="button"
                                  disabled={saving}
                                  onClick={() =>
                                    setDeleteTarget({
                                      id: rule.id,
                                      label: `Remove override for "${item.name}"? It will inherit Restaurant or Global pricing.`,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                >
                                  <UiIcon as={Trash2} className="h-3.5 w-3.5" />
                                  Remove
                                </HButton>
                              ) : (
                                <Span className="text-xs text-slate-300">—</Span>
                              )}
                            </Td>
                          </Tr>
                        );
                      })
                    )}
                  </Tbody>
                </Table>
              )}
            </Div>
            <Div className="flex items-center justify-end border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              <Span>{selectedCount} selected</Span>
            </Div>
            <AdminListPagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredItems.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                try {
                  localStorage.setItem('admin_pricing_menu_items_pageSize', String(size));
                } catch {
                  // ignore
                }
                setPageSize(size);
                setCurrentPage(1);
              }}
              itemLabel="items"
            />
          </Div>

          {selectedCount > 0 ? (
            <Div className="z-20 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-4">
              <Div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <Div>
                  <P className="text-sm font-bold text-slate-900">
                    {selectedCount} menu item{selectedCount === 1 ? '' : 's'} selected
                  </P>
                  <P className="mt-0.5 text-xs text-slate-500">Apply one override to every selected item in this restaurant.</P>
                </Div>
                <Div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                    <HButton
                      type="button"
                      onClick={() => setBulkType('PERCENTAGE')}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${bulkType === 'PERCENTAGE' ? 'bg-white text-[#DC2626] shadow-sm' : 'text-slate-500'}`}
                    >
                      <UiIcon as={Percent} className="h-3.5 w-3.5" />
                    </HButton>
                    <HButton
                      type="button"
                      onClick={() => setBulkType('FIXED')}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${bulkType === 'FIXED' ? 'bg-white text-[#DC2626] shadow-sm' : 'text-slate-500'}`}
                    >
                      <UiIcon as={IndianRupee} className="h-3.5 w-3.5" /> Fixed
                    </HButton>
                  </Div>
                  <Div>
                    <Label className="mb-1 block text-[11px] font-semibold text-slate-400">Restaurant Base Price</Label>
                    <Input
                      type="text"
                      value={selectedBasePriceLabel || '—'}
                      disabled
                      readOnly
                      className="h-10 w-28 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500"
                    />
                  </Div>
                  <Div>
                    <Label className="mb-1 block text-[11px] font-semibold text-slate-400">Value</Label>
                    <Input
                      type="number"
                      min="0"
                      max={bulkType === 'PERCENTAGE' ? 500 : undefined}
                      step="0.01"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      className="h-10 w-28 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#DC2626]"
                    />
                  </Div>
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={openConfirm}
                    className="h-10 rounded-xl bg-[#DC2626] px-4 font-bold text-white hover:bg-[#B91C1C]"
                  >
                    Apply to selected
                  </Button>
                  <Button type="button" variant="outline" onClick={clearSelection} className="h-10 rounded-xl">
                    Clear
                  </Button>
                </Div>
              </Div>
            </Div>
          ) : null}
        </>
      )}

      <ConfirmBulkModal
        open={confirmOpen}
        count={selectedCount}
        type={bulkType}
        value={bulkValue}
        saving={saving}
        entityLabel="menu item"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmApply}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        label={deleteTarget?.label}
        saving={saving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </Div>
  );
}
export default function PricingManagement() {
  const [tab, setTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rules, setRules] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [zonesLoading, setZonesLoading] = useState(true);
  const [globalForm, setGlobalForm] = useState(emptyRuleForm);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState(null);
  const saveLockRef = useRef(false);
  const globalRule = useMemo(() => rules.find((r) => r.scope === 'GLOBAL' && r.status === 'active') || null, [rules]);
  const loadCore = useCallback(
    async ({ silent = false } = {}) => {
      if (!selectedZoneId) {
        setSummary(null);
        setRules([]);
        setRestaurants([]);
        setGlobalForm(emptyRuleForm);
        setLoading(false);
        return;
      }
      try {
        if (!silent) setLoading(true);
        const zoneParams = {
          zoneId: selectedZoneId,
        };
        const [summaryRes, rulesRes, restaurantsRes] = await Promise.all([
          adminAPI.getPricingSummary(zoneParams),
          adminAPI.getPricingRules(zoneParams),
          adminAPI.getRestaurants({
            limit: 1000,
            zoneId: selectedZoneId,
          }),
        ]);
        setSummary(summaryRes?.data?.data || null);
        const nextRules = rulesRes?.data?.data?.rules || [];
        setRules(nextRules);
        const restList = restaurantsRes?.data?.data?.restaurants || restaurantsRes?.data?.data?.items || restaurantsRes?.data?.data || [];
        const normalized = (Array.isArray(restList) ? restList : [])
          .map((r) => ({
            id: String(r._id || r.id || ''),
            code: String(r.restaurantId || ''),
            name: r.restaurantName || r.name || 'Restaurant',
            ownerName: r.ownerName || '',
          }))
          .filter((r) => r.id);
        setRestaurants(normalized);
        const global = nextRules.find((r) => r.scope === 'GLOBAL' && r.status === 'active');
        if (global) {
          setGlobalForm({
            type: global.type || 'PERCENTAGE',
            value: String(global.value ?? '10'),
            status: global.status || 'active',
            id: global.id,
          });
        } else {
          setGlobalForm(emptyRuleForm);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load pricing');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedZoneId],
  );
  useEffect(() => {
    const fetchZones = async () => {
      try {
        setZonesLoading(true);
        const res = await adminAPI.getZones({
          limit: 1000,
        });
        const zoneData = res?.data?.data;
        const list = Array.isArray(zoneData?.zones) ? zoneData.zones : Array.isArray(zoneData) ? zoneData : [];
        setZones(list);
        if (list.length > 0) {
          setSelectedZoneId(String(list[0]._id || list[0].id));
        }
      } catch (error) {
        toast.error('Failed to load zones');
        setZones([]);
      } finally {
        setZonesLoading(false);
      }
    };
    fetchZones();
  }, []);
  useEffect(() => {
    if (zonesLoading) return;
    loadCore();
  }, [loadCore, zonesLoading]);
  const saveRule = async (scope, form, extra = {}) => {
    if (!selectedZoneId) {
      toast.error('Please select a zone first');
      return;
    }
    if (saveLockRef.current || saving) return;
    const num = Number(form.value);
    if (!Number.isFinite(num) || num < 0) {
      toast.error('Enter a valid value (>= 0)');
      return;
    }
    if (form.type === 'PERCENTAGE' && num > 500) {
      toast.error('Percentage cannot exceed 500%');
      return;
    }
    saveLockRef.current = true;
    try {
      setSaving(true);
      await adminAPI.upsertPricingRule({
        scope,
        type: form.type,
        value: num,
        status: 'active',
        zoneId: selectedZoneId,
        ...extra,
      });
      toast.success('Pricing rule saved');
      await loadCore({
        silent: true,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save rule');
    } finally {
      setSaving(false);
      saveLockRef.current = false;
    }
  };
  const clearRule = async (ruleId) => {
    if (!ruleId || saveLockRef.current || saving) return;
    saveLockRef.current = true;
    try {
      setSaving(true);
      await adminAPI.deletePricingRule(ruleId);
      const removedId = String(ruleId);
      const removed = rules.find((r) => String(r.id) === removedId);
      setRules((prev) => prev.filter((r) => String(r.id) !== removedId));
      if (removed?.scope === 'GLOBAL' || String(globalForm.id) === removedId) {
        setGlobalForm(emptyRuleForm);
        setSummary((prev) =>
          prev
            ? {
                ...prev,
                global: null,
              }
            : prev,
        );
      } else if (removed?.scope === 'RESTAURANT') {
        setSummary((prev) =>
          prev
            ? {
                ...prev,
                activeRestaurantOverrides: Math.max(0, (Number(prev.activeRestaurantOverrides) || 0) - 1),
              }
            : prev,
        );
      } else if (removed?.scope === 'MENU_ITEM') {
        setSummary((prev) =>
          prev
            ? {
                ...prev,
                activeMenuItemOverrides: Math.max(0, (Number(prev.activeMenuItemOverrides) || 0) - 1),
              }
            : prev,
        );
      }
      toast.success('Override removed');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to remove rule');
      throw error;
    } finally {
      setSaving(false);
      saveLockRef.current = false;
    }
  };
  const requestClearRule = (ruleId, label) => {
    if (!ruleId) return;
    setDeleteRuleTarget({
      id: ruleId,
      label,
    });
  };
  const confirmClearRule = async () => {
    if (!deleteRuleTarget?.id) return;
    try {
      await clearRule(deleteRuleTarget.id);
      setDeleteRuleTarget(null);
    } catch {
      // toast already shown
    }
  };
  const bulkApplyRestaurantRules = async ({ restaurantIds, type, value }) => {
    if (!selectedZoneId) {
      toast.error('Please select a zone first');
      return;
    }
    try {
      setSaving(true);
      const res = await adminAPI.bulkUpsertRestaurantPricingRules({
        restaurantIds,
        type,
        value,
        status: 'active',
        zoneId: selectedZoneId,
      });
      const updated = res?.data?.data?.updated ?? restaurantIds.length;
      toast.success(`Pricing updated successfully. ${updated} restaurants updated.`);
      await loadCore({
        silent: true,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to apply pricing');
      throw error;
    } finally {
      setSaving(false);
    }
  };
  const bulkApplyMenuItemRules = async ({ restaurantId, menuItemIds, type, value }) => {
    if (!selectedZoneId) {
      toast.error('Please select a zone first');
      return;
    }
    try {
      setSaving(true);
      const res = await adminAPI.bulkUpsertMenuItemPricingRules({
        restaurantId,
        menuItemIds,
        type,
        value,
        status: 'active',
        zoneId: selectedZoneId,
      });
      const updated = res?.data?.data?.updated ?? menuItemIds.length;
      toast.success(`Pricing updated successfully. ${updated} menu items updated.`);
      await loadCore({
        silent: true,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to apply menu pricing');
      throw error;
    } finally {
      setSaving(false);
    }
  };
  const tabs = useMemo(
    () => [
      {
        id: 'global',
        label: 'Global',
      },
      {
        id: 'restaurant',
        label: 'Restaurant',
      },
      {
        id: 'menu',
        label: 'Menu Item',
      },
    ],
    [],
  );
  if (zonesLoading || (selectedZoneId && loading)) {
    return (
      <ScrollDiv className="flex min-h-[50vh] items-center justify-center">
        <UiIcon as={Loader2} className="h-6 w-6 animate-spin text-[#DC2626]" />
      </ScrollDiv>
    );
  }
  if (!selectedZoneId) {
    return (
      <ScrollDiv className="mx-auto max-w-6xl p-4 sm:p-6">
        <H1 className="text-2xl font-black tracking-tight text-slate-950">Pricing Management</H1>
        <P className="mt-4 text-sm text-slate-500">No zones available. Create a zone first to manage pricing.</P>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <Div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Div className="min-w-0 flex-1">
          <H1 className="text-2xl font-black tracking-tight text-slate-950">Pricing Management</H1>
          <P className="mt-1 whitespace-nowrap text-sm text-slate-500">
            Configure admin markup without editing individual menu prices. Priority: Menu Item → Restaurant → Global.
          </P>
        </Div>
        <Div className="flex shrink-0 items-center gap-2 self-start">
          <Label className="text-sm font-medium text-slate-700 whitespace-nowrap">Zone:</Label>
          <Select value={selectedZoneId} onValueChange={setSelectedZoneId} disabled={zonesLoading || zones.length === 0}>
            <SelectTrigger id="pricing-zone-select" className="h-10 min-w-[10rem] rounded-xl border-slate-300 bg-white text-sm text-slate-900 shadow-sm">
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent className="max-h-72 border-slate-200 bg-white text-slate-900">
              {zones.map((zone) => (
                <SelectItem
                  key={zone._id || zone.id}
                  value={String(zone._id || zone.id)}
                  className="cursor-pointer focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                >
                  {zone.zoneName || zone.name || 'Unnamed Zone'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={() => loadCore()} className="h-10 shrink-0 rounded-xl">
            <UiIcon as={RefreshCw} className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </Div>
      </Div>

      <Div className="grid gap-3 sm:grid-cols-3">
        <Div className="rounded-2xl border border-slate-200 bg-white p-4">
          <P className="text-xs font-semibold text-slate-400">Global rule</P>
          <P className="mt-1 text-lg font-black text-slate-900">
            {summary?.global ? (summary.global.type === 'FIXED' ? `+${RUPEE}${summary.global.value}` : `+${summary.global.value}%`) : 'Not set'}
          </P>
        </Div>
        <Div className="rounded-2xl border border-slate-200 bg-white p-4">
          <P className="text-xs font-semibold text-slate-400">Restaurant overrides</P>
          <P className="mt-1 text-lg font-black text-slate-900">{summary?.activeRestaurantOverrides || 0}</P>
        </Div>
        <Div className="rounded-2xl border border-slate-200 bg-white p-4">
          <P className="text-xs font-semibold text-slate-400">Menu item overrides</P>
          <P className="mt-1 text-lg font-black text-slate-900">{summary?.activeMenuItemOverrides || 0}</P>
        </Div>
      </Div>

      <Div className="flex gap-2 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <HButton
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${tab === t.id ? 'bg-white text-[#DC2626] shadow-sm' : 'text-slate-500'}`}
          >
            {t.label}
          </HButton>
        ))}
      </Div>

      {tab === 'global' ? (
        <RuleEditor
          title="Global Admin Pricing"
          form={globalForm}
          setForm={setGlobalForm}
          saving={saving}
          canClear={Boolean(globalForm.id)}
          onClear={() => requestClearRule(globalForm.id, 'Remove the Global pricing rule? Restaurants without overrides will show base price only.')}
          onSave={() => saveRule('GLOBAL', globalForm)}
        />
      ) : null}

      {tab === 'restaurant' ? (
        <RestaurantPricingPanel
          key={selectedZoneId}
          restaurants={restaurants}
          rules={rules}
          globalRule={globalRule}
          saving={saving}
          onRemoveOverride={clearRule}
          onBulkApply={bulkApplyRestaurantRules}
        />
      ) : null}

      {tab === 'menu' ? (
        <MenuItemPricingPanel
          key={selectedZoneId}
          restaurants={restaurants}
          rules={rules}
          globalRule={globalRule}
          saving={saving}
          onRemoveOverride={clearRule}
          onBulkApply={bulkApplyMenuItemRules}
        />
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(deleteRuleTarget)}
        label={deleteRuleTarget?.label}
        saving={saving}
        onCancel={() => setDeleteRuleTarget(null)}
        onConfirm={confirmClearRule}
      />
    </ScrollDiv>
  );
}
