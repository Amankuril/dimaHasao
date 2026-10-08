/* Ported from Frontend/src/modules/Food/pages/admin/pricing/PricingManagement.jsx (tools/port.js first pass). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IndianRupee, Loader2, Percent, Save, Trash2, RefreshCw, Tag } from 'lucide-react-native';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/shadcn';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import { Button as HButton, Div, Input, Overlay, Span, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  DataTable,
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
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
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
/**
 * The kit's THead only takes plain labels, but these tables need a select-all
 * checkbox in the first heading, so the header row is built from Cells here.
 */
function SelectHeader({ cols, labels, checked, onToggle, disabled, accessibilityLabel }) {
  return (
    <Div className="flex-row items-stretch bg-slate-50 border-b border-slate-200">
      <Cell width={cols[0]} align="center">
        <Input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          accessibilityLabel={accessibilityLabel}
          className="h-5 w-5 rounded border-slate-300"
        />
      </Cell>
      {labels.map((label, i) => (
        <Cell key={`${label}-${i}`} width={cols[i + 1]}>
          <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
        </Cell>
      ))}
    </Div>
  );
}
function PreviewCard({ type, value }) {
  const base = 200;
  const num = Number(value) || 0;
  const other = type === 'FIXED' ? base + num : Math.round((base + (base * num) / 100) * 100) / 100;
  return (
    <Div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 gap-1">
      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</Span>
      <Span className="text-sm text-slate-700">
        {`Base ${RUPEE}${base} \u2192 Other ${RUPEE}${other.toFixed(0)} (${type === 'FIXED' ? `+${RUPEE}${num}` : `+${num}%`})`}
      </Span>
    </Div>
  );
}
function RuleEditor({ title, form, setForm, onSave, saving, onClear, canClear }) {
  return (
    <Card className="gap-3">
      <SectionTitle
        action={
          canClear ? (
            <HButton type="button" onClick={onClear} className="flex-row items-center gap-1 h-11 px-3 rounded-lg" accessibilityLabel="Remove override">
              <UiIcon as={Trash2} size={14} className="text-red-600" />
              <Span className="text-xs font-semibold text-red-600">Remove override</Span>
            </HButton>
          ) : null
        }
      >
        {title}
      </SectionTitle>

      <Div className="flex-row flex-wrap gap-2">
        <HButton
          type="button"
          onClick={() =>
            setForm((p) => ({
              ...p,
              type: 'PERCENTAGE',
            }))
          }
          className={`flex-row items-center gap-1.5 rounded-lg h-11 px-4 ${form.type === 'PERCENTAGE' ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
        >
          <UiIcon as={Percent} size={14} className={form.type === 'PERCENTAGE' ? 'text-white' : 'text-slate-600'} />
          <Span className={`text-sm font-semibold ${form.type === 'PERCENTAGE' ? 'text-white' : 'text-slate-700'}`}>Percentage</Span>
        </HButton>
        <HButton
          type="button"
          onClick={() =>
            setForm((p) => ({
              ...p,
              type: 'FIXED',
            }))
          }
          className={`flex-row items-center gap-1.5 rounded-lg h-11 px-4 ${form.type === 'FIXED' ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
        >
          <UiIcon as={IndianRupee} size={14} className={form.type === 'FIXED' ? 'text-white' : 'text-slate-600'} />
          <Span className={`text-sm font-semibold ${form.type === 'FIXED' ? 'text-white' : 'text-slate-700'}`}>Fixed amount</Span>
        </HButton>
      </Div>

      <Field label={form.type === 'FIXED' ? `Increase by (${RUPEE})` : 'Increase by (%)'} required>
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
          className={INPUT}
        />
      </Field>

      <PreviewCard type={form.type} value={form.value} />

      <HButton type="button" disabled={saving} onClick={onSave} className={BTN_PRIMARY}>
        <UiIcon as={saving ? Loader2 : Save} size={16} className="text-white" />
        <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving\u2026' : 'Save rule'}</Span>
      </HButton>
    </Card>
  );
}
function PricingStatusBadge({ rule, globalRule }) {
  if (rule) return <StatusBadge tone="success" label={formatRuleLabel(rule)} />;
  if (globalRule) return <StatusBadge tone="info" label={formatRuleLabel(globalRule)} />;
  return <StatusBadge tone="neutral" label="No rule" />;
}
function ConfirmBulkModal({ open, count, type, value, onCancel, onConfirm, saving, entityLabel = 'restaurant' }) {
  if (!open) return null;
  const label = type === 'FIXED' ? `+${RUPEE}${Number(value) || 0}` : `+${Number(value) || 0}%`;
  const plural = count === 1 ? entityLabel : `${entityLabel}s`;
  return (
    <Overlay onClose={saving ? undefined : onCancel} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
      <Div className="absolute inset-0" onClick={saving ? undefined : onCancel} />
      <Div className="relative w-full max-w-md rounded-xl bg-white border border-slate-200 p-4">
        <Span className="text-base font-semibold text-slate-900">Confirm bulk apply</Span>
        <Span className="mt-2 text-sm text-slate-700">{`You are about to apply ${label} pricing to ${count} ${plural}.`}</Span>
        <Div className="mt-4 flex-row flex-wrap justify-end gap-2">
          <HButton type="button" onClick={onCancel} disabled={saving} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </HButton>
          <HButton type="button" onClick={onConfirm} disabled={saving} className={BTN_PRIMARY}>
            {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
            <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Applying\u2026' : 'Apply'}</Span>
          </HButton>
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
      <Div className="relative w-full max-w-md rounded-xl bg-white border border-slate-200 p-4">
        <Span className="text-base font-semibold text-slate-900">Remove override?</Span>
        <Span className="mt-2 text-sm text-slate-700">{label || 'This restaurant will inherit Global pricing (if configured).'}</Span>
        <Div className="mt-4 flex-row flex-wrap justify-end gap-2">
          <HButton type="button" onClick={onCancel} disabled={saving} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </HButton>
          <HButton type="button" onClick={onConfirm} disabled={saving} className={BTN_DANGER}>
            <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Removing\u2026' : 'Remove'}</Span>
          </HButton>
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
  const COLS = [48, 190, 140, 130, 140, 130];
  return (
    <Div className="gap-3">
      <Card>
        <Toolbar className="mb-0">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID or owner"
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
          <HButton type="button" onClick={selectAllRestaurants} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>{`Select all (${restaurants.length})`}</Span>
          </HButton>
          <HButton type="button" onClick={selectVisible} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>{`Select visible (${pagedRestaurants.length})`}</Span>
          </HButton>
          <HButton type="button" onClick={clearSelection} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Clear selection</Span>
          </HButton>
        </Toolbar>
      </Card>

      {filteredRestaurants.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No restaurants match your search"
          message={restaurants.length === 0 ? 'No restaurants in this zone yet.' : 'Clear the search to see every restaurant in this zone.'}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <SelectHeader
              cols={COLS}
              labels={['Restaurant', 'Admin pricing', 'Rule type', 'Last updated', 'Actions']}
              checked={allVisibleSelected}
              onToggle={toggleVisibleHeader}
              accessibilityLabel="Select visible restaurants"
            />
            <TBody>
              {pagedRestaurants.map((restaurant, idx) => {
                const rule = restaurantRuleMap.get(restaurant.id) || null;
                const checked = selectedIds.has(restaurant.id);
                return (
                  <Row key={restaurant.id} last={idx === pagedRestaurants.length - 1} className={checked ? 'bg-blue-50' : ''}>
                    <Cell width={COLS[0]} align="center">
                      <Input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(restaurant.id)}
                        accessibilityLabel={`Select ${restaurant.name}`}
                        className="h-5 w-5 rounded border-slate-300"
                      />
                    </Cell>
                    <Cell width={COLS[1]}>
                      <Div className="gap-0.5">
                        <Span className="text-sm font-semibold text-slate-900">{restaurant.name}</Span>
                        {restaurant.code || restaurant.ownerName ? (
                          <Span className="text-xs text-slate-500">
                            {[restaurant.code ? `Code \u00B7 ${restaurant.code}` : null, restaurant.ownerName ? `Owner \u00B7 ${restaurant.ownerName}` : null]
                              .filter(Boolean)
                              .join(' \u00B7 ')}
                          </Span>
                        ) : null}
                      </Div>
                    </Cell>
                    <Cell width={COLS[2]}>
                      <PricingStatusBadge rule={rule} globalRule={globalRule} />
                    </Cell>
                    <Cell width={COLS[3]}>{rule ? (rule.type === 'FIXED' ? 'Fixed' : 'Percentage') : globalRule ? 'Global' : '\u2014'}</Cell>
                    <Cell width={COLS[4]}>{formatShortDate(rule?.updatedAt)}</Cell>
                    <Cell width={COLS[5]}>
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
                          className="flex-row items-center gap-1 h-11 px-3 rounded-lg"
                          accessibilityLabel={`Remove override for ${restaurant.name}`}
                        >
                          <UiIcon as={Trash2} size={14} className="text-red-600" />
                          <Span className="text-xs font-semibold text-red-600">Remove</Span>
                        </HButton>
                      ) : (
                        <Span className="text-sm text-slate-400">{'\u2014'}</Span>
                      )}
                    </Cell>
                  </Row>
                );
              })}
            </TBody>
          </DataTable>

          <Span className="text-xs text-slate-500 text-right">{`${selectedCount} selected`}</Span>

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
        </>
      )}

      {selectedCount > 0 ? (
        <Card className="gap-3">
          <Div className="gap-0.5">
            <Span className="text-base font-semibold text-slate-900">{`${selectedCount} restaurant${selectedCount === 1 ? '' : 's'} selected`}</Span>
            <Span className="text-xs text-slate-500">Apply one rule to every selected restaurant in a single action.</Span>
          </Div>
          <Div className="flex-row flex-wrap items-end gap-2">
            <HButton
              type="button"
              onClick={() => setBulkType('PERCENTAGE')}
              className={`flex-row items-center gap-1.5 rounded-lg h-11 px-4 ${bulkType === 'PERCENTAGE' ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
            >
              <UiIcon as={Percent} size={14} className={bulkType === 'PERCENTAGE' ? 'text-white' : 'text-slate-600'} />
              <Span className={`text-sm font-semibold ${bulkType === 'PERCENTAGE' ? 'text-white' : 'text-slate-700'}`}>Percentage</Span>
            </HButton>
            <HButton
              type="button"
              onClick={() => setBulkType('FIXED')}
              className={`flex-row items-center gap-1.5 rounded-lg h-11 px-4 ${bulkType === 'FIXED' ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
            >
              <UiIcon as={IndianRupee} size={14} className={bulkType === 'FIXED' ? 'text-white' : 'text-slate-600'} />
              <Span className={`text-sm font-semibold ${bulkType === 'FIXED' ? 'text-white' : 'text-slate-700'}`}>Fixed</Span>
            </HButton>
            <Div className="min-w-[140px] flex-1">
              <Field label="Value">
                <Input
                  type="number"
                  min="0"
                  max={bulkType === 'PERCENTAGE' ? 500 : undefined}
                  step="0.01"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className={INPUT}
                />
              </Field>
            </Div>
            <HButton type="button" disabled={saving} onClick={openConfirm} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Apply to selected</Span>
            </HButton>
            <HButton type="button" onClick={clearSelection} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Clear</Span>
            </HButton>
          </Div>
        </Card>
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
  const COLS = [48, 180, 140, 130, 120, 140, 130];
  return (
    <Div className="gap-3">
      <Card>
        <Field label="Restaurant" required hint="Menu item overrides are set one restaurant at a time">
          <Select value={restaurantId || '__none__'} onValueChange={(value) => handleRestaurantChange(value === '__none__' ? '' : value)}>
            <SelectTrigger className={INPUT}>
              <SelectValue placeholder="Select restaurant" />
            </SelectTrigger>
            <SelectContent className="max-h-72 border-slate-200 bg-white">
              <SelectItem value="__none__">Select restaurant</SelectItem>
              {restaurants.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Card>

      {!restaurantId ? (
        <EmptyState icon={Tag} title="No restaurant selected" message="Select a restaurant to load menu items and apply overrides in bulk." />
      ) : (
        <>
          <Card>
            <Toolbar className="mb-0">
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu items"
                className={`${INPUT} flex-1 min-w-[200px]`}
              />
              <HButton type="button" onClick={selectAllItems} disabled={!menuItems.length} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>{`Select all (${menuItems.length})`}</Span>
              </HButton>
              <HButton type="button" onClick={selectVisible} disabled={!filteredItems.length} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>{`Select visible (${pagedItems.length})`}</Span>
              </HButton>
              <HButton type="button" onClick={clearSelection} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Clear selection</Span>
              </HButton>
            </Toolbar>
          </Card>

          {loadingMenu ? (
            <TableSkeleton rows={6} />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={Tag}
              title={menuError ? 'Could not load menu items' : 'No menu items match your search'}
              message={menuError || 'Clear the search to see every menu item for this restaurant.'}
            />
          ) : (
            <>
              <DataTable cols={COLS}>
                <SelectHeader
                  cols={COLS}
                  labels={['Menu item', 'Base price', 'Admin pricing', 'Rule type', 'Last updated', 'Actions']}
                  checked={allVisibleSelected}
                  onToggle={toggleVisibleHeader}
                  disabled={!visibleIds.length}
                  accessibilityLabel="Select visible menu items"
                />
                <TBody>
                  {pagedItems.map((item, idx) => {
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
                          : '\u2014';
                    return (
                      <Row key={item.id} last={idx === pagedItems.length - 1} className={checked ? 'bg-blue-50' : ''}>
                        <Cell width={COLS[0]} align="center">
                          <Input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(item.id)}
                            accessibilityLabel={`Select ${item.name}`}
                            className="h-5 w-5 rounded border-slate-300"
                          />
                        </Cell>
                        <Cell width={COLS[1]}>
                          <Div className="gap-0.5">
                            <Span className="text-sm font-semibold text-slate-900">{item.name}</Span>
                            <Span className="text-xs text-slate-500">
                              {`${item.categoryName || 'Uncategorized'}${!item.isAvailable ? ' \u00B7 Unavailable' : ''}`}
                            </Span>
                          </Div>
                        </Cell>
                        <Cell width={COLS[2]} numberOfLines={1}>{`${RUPEE}${Math.round(item.price || 0)}`}</Cell>
                        <Cell width={COLS[3]}>
                          <PricingStatusBadge rule={rule} globalRule={inheritedRule} />
                        </Cell>
                        <Cell width={COLS[4]}>{ruleTypeLabel}</Cell>
                        <Cell width={COLS[5]}>{formatShortDate(rule?.updatedAt)}</Cell>
                        <Cell width={COLS[6]}>
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
                              className="flex-row items-center gap-1 h-11 px-3 rounded-lg"
                              accessibilityLabel={`Remove override for ${item.name}`}
                            >
                              <UiIcon as={Trash2} size={14} className="text-red-600" />
                              <Span className="text-xs font-semibold text-red-600">Remove</Span>
                            </HButton>
                          ) : (
                            <Span className="text-sm text-slate-400">{'\u2014'}</Span>
                          )}
                        </Cell>
                      </Row>
                    );
                  })}
                </TBody>
              </DataTable>

              <Span className="text-xs text-slate-500 text-right">{`${selectedCount} selected`}</Span>

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
            </>
          )}

          {selectedCount > 0 ? (
            <Card className="gap-3">
              <Div className="gap-0.5">
                <Span className="text-base font-semibold text-slate-900">{`${selectedCount} menu item${selectedCount === 1 ? '' : 's'} selected`}</Span>
                <Span className="text-xs text-slate-500">Apply one override to every selected item in this restaurant.</Span>
              </Div>
              <Div className="flex-row flex-wrap items-end gap-2">
                <HButton
                  type="button"
                  onClick={() => setBulkType('PERCENTAGE')}
                  className={`flex-row items-center gap-1.5 rounded-lg h-11 px-4 ${bulkType === 'PERCENTAGE' ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
                >
                  <UiIcon as={Percent} size={14} className={bulkType === 'PERCENTAGE' ? 'text-white' : 'text-slate-600'} />
                  <Span className={`text-sm font-semibold ${bulkType === 'PERCENTAGE' ? 'text-white' : 'text-slate-700'}`}>Percentage</Span>
                </HButton>
                <HButton
                  type="button"
                  onClick={() => setBulkType('FIXED')}
                  className={`flex-row items-center gap-1.5 rounded-lg h-11 px-4 ${bulkType === 'FIXED' ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
                >
                  <UiIcon as={IndianRupee} size={14} className={bulkType === 'FIXED' ? 'text-white' : 'text-slate-600'} />
                  <Span className={`text-sm font-semibold ${bulkType === 'FIXED' ? 'text-white' : 'text-slate-700'}`}>Fixed</Span>
                </HButton>
                <Div className="min-w-[140px] flex-1">
                  <Field label="Restaurant base price">
                    <Input
                      type="text"
                      value={selectedBasePriceLabel || '\u2014'}
                      disabled
                      readOnly
                      className={INPUT}
                    />
                  </Field>
                </Div>
                <Div className="min-w-[140px] flex-1">
                  <Field label="Value">
                    <Input
                      type="number"
                      min="0"
                      max={bulkType === 'PERCENTAGE' ? 500 : undefined}
                      step="0.01"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      className={INPUT}
                    />
                  </Field>
                </Div>
                <HButton type="button" disabled={saving} onClick={openConfirm} className={BTN_PRIMARY}>
                  <Span className={BTN_TEXT_PRIMARY}>Apply to selected</Span>
                </HButton>
                <HButton type="button" onClick={clearSelection} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Clear</Span>
                </HButton>
              </Div>
            </Card>
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
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Tag}
          title="Pricing Management"
          subtitle="Configure admin markup without editing individual menu prices."
          breadcrumb={[{ label: 'Food' }, { label: 'Pricing' }]}
        />
        <LoadingState label="Loading pricing rules…" />
      </AdminPage>
    );
  }
  if (!selectedZoneId) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Tag}
          title="Pricing Management"
          subtitle="Configure admin markup without editing individual menu prices."
          breadcrumb={[{ label: 'Food' }, { label: 'Pricing' }]}
        />
        <EmptyState icon={Tag} title="No zones available" message="Create a zone first to manage pricing." />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Tag}
        title="Pricing Management"
        subtitle="Configure admin markup without editing individual menu prices. Priority: Menu Item → Restaurant → Global."
        breadcrumb={[{ label: 'Food' }, { label: 'Pricing' }]}
        actions={
          <HButton type="button" onClick={() => loadCore()} className={BTN_SECONDARY}>
            <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
          </HButton>
        }
      />

      <Card className="mb-4">
        <Field label="Zone" hint="Pricing rules apply to the selected zone">
          <Select value={selectedZoneId} onValueChange={setSelectedZoneId} disabled={zonesLoading || zones.length === 0}>
            <SelectTrigger id="pricing-zone-select" className={INPUT}>
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent className="max-h-72 border-slate-200 bg-white">
              {zones.map((zone) => (
                <SelectItem key={zone._id || zone.id} value={String(zone._id || zone.id)}>
                  {zone.zoneName || zone.name || 'Unnamed Zone'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Card>

      <StatGrid className="mb-4">
        <StatCard
          label="Global rule"
          value={summary?.global ? (summary.global.type === 'FIXED' ? `+${RUPEE}${summary.global.value}` : `+${summary.global.value}%`) : 'Not set'}
          icon={Percent}
          tone="info"
        />
        <StatCard label="Restaurant overrides" value={String(summary?.activeRestaurantOverrides || 0)} icon={Tag} tone="warning" />
        <StatCard label="Menu item overrides" value={String(summary?.activeMenuItemOverrides || 0)} icon={IndianRupee} tone="success" />
      </StatGrid>

      <Div className="flex-row flex-wrap gap-1 rounded-lg bg-slate-100 border border-slate-200 p-1 mb-4">
        {tabs.map((t) => (
          <HButton
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[110px] h-11 px-3 rounded-lg items-center justify-center ${tab === t.id ? 'bg-blue-600' : 'bg-transparent'}`}
          >
            <Span className={`text-sm font-semibold ${tab === t.id ? 'text-white' : 'text-slate-500'}`}>{t.label}</Span>
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
    </AdminPage>
  );
}
