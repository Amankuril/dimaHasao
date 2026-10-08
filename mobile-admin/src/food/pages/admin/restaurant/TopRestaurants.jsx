/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/TopRestaurants.jsx (tools/port.js first pass). */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Star, Loader2, Save, Bike, ShoppingBag, RotateCcw, ArrowLeftRight } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/shadcn';
import { Button, Div, Img, Input, Option, Overlay, Select as HSelect, Span, Strong, Icon as UiIcon } from '../../../../components/web';
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
  TableSkeleton,
  EmptyState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { window } from '../../../../lib/webShim';
const MAX_TOP = 10;
// Remembers the admin's selected zone across refreshes (cleared on logout).
const ZONE_KEY = 'top_restaurants_selected_zone';
const PLACEHOLDER_40 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23e2e8f0' width='40' height='40'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='12' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";
const getLogo = (r) => {
  const img = r?.profileImage;
  if (!img) return PLACEHOLDER_40;
  if (typeof img === 'string') return img;
  return img.url || img.secure_url || PLACEHOLDER_40;
};
const getZoneName = (r) => r?.zoneId?.zoneName || r?.zoneId?.name || r?.zone || '—';

// Build a stable string of the rank map so we can detect unsaved changes.
const serializeRanks = (rankMap) =>
  Object.entries(rankMap)
    .filter(([, v]) => v)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map(([id, v]) => `${id}:${v}`)
    .join('|');

export default function TopRestaurants() {
  const [activeTab, setActiveTab] = useState('delivery'); // 'delivery' | 'takeaway'
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [ranks, setRanks] = useState({}); // restaurantId -> top number (slot)
  // When a taken slot is picked, we hold the pending replace here to confirm.
  const [replaceModal, setReplaceModal] = useState(null);
  const [savedRanksKey, setSavedRanksKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isMountedRef = useRef(true);
  // The page's own ScrollDiv is the scroller; its offset is tracked by onScroll.
  const pageScrollRef = useRef(null);
  const pageScrollYRef = useRef(0);
  // Holds the scroll position to restore after a re-sort, so the admin's view
  // stays put when a ranked restaurant jumps up the list.
  const scrollRestoreRef = useRef(null);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load zones once; default to the first zone.
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await adminAPI.getZones({
          page: 1,
          limit: 1000,
        });
        const zoneData = response?.data?.data;
        const list = Array.isArray(zoneData?.zones) ? zoneData.zones : Array.isArray(zoneData) ? zoneData : [];
        if (!isMountedRef.current) return;
        // Sort zones alphabetically by name for the dropdown.
        const arr = (Array.isArray(list) ? [...list] : []).sort((a, b) => String(a.zoneName || a.name || '').localeCompare(String(b.zoneName || b.name || '')));
        setZones(arr);
        if (arr.length > 0) {
          setSelectedZone((prev) => {
            if (prev) return prev;
            // Restore the previously selected zone if it still exists, else default
            // to the first zone alphabetically.
            let saved = null;
            try {
              saved = localStorage.getItem(ZONE_KEY);
            } catch (e) {
              saved = null;
            }
            const savedValid = saved && arr.some((z) => String(z._id || z.id) === saved);
            return savedValid ? saved : String(arr[0]._id || arr[0].id);
          });
        }
      } catch (error) {
        toast.error('Failed to load zones');
        setZones([]);
      }
    };
    fetchZones();
  }, []);

  // Remember the selected zone across refreshes (cleared on logout).
  useEffect(() => {
    if (!selectedZone) return;
    try {
      localStorage.setItem(ZONE_KEY, selectedZone);
    } catch (e) {
      /* ignore */
    }
  }, [selectedZone]);

  // Load top restaurants whenever the zone or tab changes.
  useEffect(() => {
    if (!selectedZone) return;
    let cancelled = false;
    const fetchTop = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getTopRestaurants({
          zoneId: selectedZone,
          type: activeTab,
        });
        const data = response?.data?.data;
        const list = Array.isArray(data?.restaurants) ? data.restaurants : Array.isArray(data) ? data : [];
        if (cancelled || !isMountedRef.current) return;

        // Always load the saved (DB) state. Unsaved edits are intentionally NOT
        // persisted — a refresh discards them and shows the last saved ranking.
        const initialRanks = {};
        list.forEach((r) => {
          if (r.rank) initialRanks[String(r._id)] = Number(r.rank);
        });
        setRestaurants(list);
        setRanks(initialRanks);
        setSavedRanksKey(serializeRanks(initialRanks));
        setSearchQuery('');
      } catch (error) {
        if (cancelled) return;
        toast.error(error.response?.data?.message || 'Failed to load top restaurants');
        setRestaurants([]);
        setRanks({});
        setSavedRanksKey('');
      } finally {
        if (!cancelled && isMountedRef.current) setLoading(false);
      }
    };
    fetchTop();
    return () => {
      cancelled = true;
    };
  }, [selectedZone, activeTab]);
  const assignedCount = useMemo(() => Object.values(ranks).filter((v) => v).length, [ranks]);
  const isDirty = useMemo(() => serializeRanks(ranks) !== savedRanksKey, [ranks, savedRanksKey]);

  // Warn on accidental refresh / tab close while there are unsaved changes, so
  // the admin can cancel and Save instead of silently losing their selections.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = ''; // required for the browser to show its native prompt
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Show the skeleton while zones are still resolving or restaurants are loading,
  // so a refresh never flashes half-loaded / empty data.
  const showSkeleton = loading || !selectedZone;
  const filteredRestaurants = useMemo(() => {
    let list = restaurants;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const name = String(r.restaurantName || '').toLowerCase();
        const owner = String(r.ownerName || '').toLowerCase();
        const phone = String(r.ownerPhone || '').toLowerCase();
        return name.includes(q) || owner.includes(q) || phone.includes(q);
      });
    }
    // Show ranked restaurants first (in rank order), then the rest by name.
    return [...list].sort((a, b) => {
      const ra = ranks[String(a._id)] || 999;
      const rb = ranks[String(b._id)] || 999;
      if (ra !== rb) return ra - rb;
      return String(a.restaurantName || '').localeCompare(String(b.restaurantName || ''));
    });
  }, [restaurants, searchQuery, ranks]);

  // Snapshot the current scroll position of the table's scroll container so the
  // layout effect can restore it after the list re-sorts. The list's total
  // height is unchanged by a re-sort, so restoring the exact scrollTop keeps the
  // admin's view fixed — only the edited restaurant moves up (out of view).
  const captureScroll = () => {
    scrollRestoreRef.current = { top: pageScrollYRef.current };
  };
  const nameById = (id) => {
    const r = restaurants.find((x) => String(x._id) === String(id));
    return r?.restaurantName || 'this restaurant';
  };

  // Apply an edit to the in-memory ranks only. Nothing is persisted until the
  // admin clicks Save, so a refresh reverts to the last saved state.
  const applyRanks = (next) => {
    setRanks(next);
  };

  // Clear a restaurant's slot and compact the higher slots down so the list
  // stays continuous (…, remove #Top2 → old #Top3 becomes #Top2).
  const clearSlot = (id) => {
    const removed = ranks[id];
    if (!removed) return;
    captureScroll();
    const next = {};
    Object.entries(ranks).forEach(([rid, v]) => {
      if (rid === id) return;
      next[rid] = v > removed ? v - 1 : v;
    });
    applyRanks(next);
  };

  // Assign a fresh slot to a restaurant (only the next number after the current
  // highest is allowed, so the list stays continuous).
  const assignSlot = (id, num) => {
    captureScroll();
    applyRanks({
      ...ranks,
      [id]: num,
    });
  };
  const handleSelectSlot = (restaurantId, rawValue) => {
    const id = String(restaurantId);

    // "—" clears the slot.
    if (rawValue === '') {
      clearSlot(id);
      return;
    }
    const num = Number(rawValue);
    if (!Number.isInteger(num) || num < 1 || num > MAX_TOP) return;
    if (ranks[id] === num) return;

    // Is this slot already taken by another restaurant? → confirm a replace.
    const occupant = Object.entries(ranks).find(([rid, v]) => Number(v) === num && rid !== id);
    if (occupant) {
      setReplaceModal({
        editingId: id,
        targetSlot: num,
        occupantId: occupant[0],
      });
      return;
    }

    // Free slot: only the next number (max + 1) may be assigned to a new
    // restaurant, so the top list stays continuous with no gaps.
    const maxSlot = Object.values(ranks).reduce((m, v) => Math.max(m, Number(v) || 0), 0);
    if (!ranks[id] && num === maxSlot + 1) {
      assignSlot(id, num);
    } else if (ranks[id]) {
      toast.error('To move this restaurant, pick an occupied number to swap, or clear it first');
    } else {
      toast.error(`Assign #Top${maxSlot + 1} first — top numbers must be filled in order`);
    }
  };
  const confirmReplace = () => {
    if (!replaceModal) return;
    const { editingId, targetSlot, occupantId } = replaceModal;
    const prevSlot = ranks[editingId]; // may be undefined (un-ranked)

    const next = {
      ...ranks,
      [editingId]: targetSlot,
    };
    if (prevSlot) {
      next[occupantId] = prevSlot; // swap
    } else {
      delete next[occupantId]; // occupant drops out of the top list
    }
    applyRanks(next);
    setReplaceModal(null);

    // On replace, take the admin to the top so they see the updated ranking.
    scrollRestoreRef.current = { top: 0 };
  };
  const cancelReplace = () => setReplaceModal(null);
  const handleReset = () => {
    if (Object.keys(ranks).length === 0) return;
    captureScroll();
    applyRanks({});
  };

  // After the list re-sorts, restore the exact scroll position (and re-assert on
  // the next frame to override any late scroll reset) so the view never jumps.
  useLayoutEffect(() => {
    const snap = scrollRestoreRef.current;
    if (!snap) return;
    scrollRestoreRef.current = null;
    const { top } = snap;
    pageScrollRef.current?.scrollTo({ y: top, animated: false });
    requestAnimationFrame(() => {
      pageScrollRef.current?.scrollTo({ y: top, animated: false });
    });
  }, [filteredRestaurants]);
  const handleSave = async () => {
    // Build ordered list and validate continuity (no gaps, no duplicates).
    const entries = Object.entries(ranks).filter(([, v]) => v);
    const numbers = entries.map(([, v]) => Number(v)).sort((a, b) => a - b);
    if (numbers.length > MAX_TOP) {
      toast.error(`You can select a maximum of ${MAX_TOP} top restaurants`);
      return;
    }
    // Continuous 1..N check.
    for (let i = 0; i < numbers.length; i++) {
      if (numbers[i] !== i + 1) {
        toast.error('Top numbers must be continuous starting from 1 (no gaps or duplicates)');
        return;
      }
    }
    const ordered = entries.sort((a, b) => Number(a[1]) - Number(b[1])).map(([id]) => id);
    try {
      setSaving(true);
      await adminAPI.saveTopRestaurants({
        zoneId: selectedZone,
        type: activeTab,
        restaurantIds: ordered,
      });
      setSavedRanksKey(serializeRanks(ranks));
      toast.success('Top restaurants saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save top restaurants');
    } finally {
      setSaving(false);
    }
  };
  const tabs = [
    {
      key: 'delivery',
      label: 'Delivery',
      icon: Bike,
    },
    {
      key: 'takeaway',
      label: 'Takeaway',
      icon: ShoppingBag,
    },
  ];
  const COLS = [60, 200, 170, 130, 100, 120, 160];
  return (
    <AdminPage
      maxWidth={1200}
      ref={pageScrollRef}
      scrollEventThrottle={16}
      onScroll={(e) => {
        pageScrollYRef.current = e.nativeEvent.contentOffset.y;
      }}
    >
      <PageHeader
        icon={Trophy}
        title="Top Restaurants"
        subtitle={`Choose which restaurants appear at the top for users in each zone. Max ${MAX_TOP} per zone.`}
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Top restaurants' }]}
      />

      <Card className="mb-4">
        <Div className="flex-row flex-wrap gap-2 mb-3 rounded-lg border border-slate-200 bg-slate-100 p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <Button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 min-w-[120px] flex-row items-center justify-center gap-2 rounded-lg h-11 px-3 ${active ? 'bg-blue-600' : 'bg-transparent'}`}
              >
                <UiIcon as={Icon} size={16} className={active ? 'text-white' : 'text-slate-500'} />
                <Span className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-500'}`}>{t.label}</Span>
              </Button>
            );
          })}
        </Div>

        <Toolbar className="mb-2">
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by restaurant, owner or phone…"
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
          <Div className="min-w-[160px] flex-1">
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className={INPUT}>
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 bg-white">
                {zones.map((zone) => (
                  <SelectItem key={zone._id || zone.id} value={String(zone._id || zone.id)}>
                    {zone.zoneName || zone.name || 'Unnamed Zone'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Div>
          <Button onClick={handleReset} disabled={assignedCount === 0 || saving || loading} className={BTN_SECONDARY}>
            <UiIcon as={RotateCcw} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || saving || loading} className={BTN_PRIMARY}>
            <UiIcon as={saving ? Loader2 : Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving\u2026' : 'Save'}</Span>
          </Button>
        </Toolbar>
        <Span className="text-xs text-slate-500">
          {assignedCount}/{MAX_TOP} selected · Pick a number in the <Strong>Top No.</Strong> column to promote a restaurant. Choosing a number that&apos;s already
          taken lets you replace it.
        </Span>
      </Card>

      {showSkeleton ? (
        <TableSkeleton rows={8} />
      ) : filteredRestaurants.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No restaurants found"
          message={activeTab === 'takeaway' ? 'No takeaway-enabled restaurants in this zone.' : 'No restaurants in this zone.'}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['S.No', 'Restaurant', 'Owner', 'Zone', 'Rating', 'Status', 'Top No.']} />
          <TBody>
            {filteredRestaurants.map((r, index) => {
              const id = String(r._id);
              const rank = ranks[id] || '';
              const hasRank = Boolean(rank);
              return (
                <Row key={id} last={index === filteredRestaurants.length - 1} className={hasRank ? 'bg-blue-50' : ''}>
                  <Cell width={COLS[0]} numberOfLines={1}>{String(index + 1)}</Cell>
                  <Cell width={COLS[1]}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 items-center justify-center shrink-0">
                        <Img src={getLogo(r)} alt={r.restaurantName} className="w-full h-full" contentFit="cover" fallback={PLACEHOLDER_40} />
                      </Div>
                      <Div className="flex-1 min-w-0">
                        <Span className="text-sm font-medium text-slate-900">{r.restaurantName}</Span>
                        <Span className="text-xs text-slate-500">{r.area || r.location?.area || r.city || r.location?.city || ''}</Span>
                      </Div>
                    </Div>
                  </Cell>
                  <Cell width={COLS[2]}>
                    <Div className="gap-0.5">
                      <Span className="text-sm font-medium text-slate-900">{r.ownerName || '\u2014'}</Span>
                      <Span className="text-xs text-slate-500">{r.ownerPhone || ''}</Span>
                    </Div>
                  </Cell>
                  <Cell width={COLS[3]}>{getZoneName(r)}</Cell>
                  <Cell width={COLS[4]}>
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={Star} size={14} className="text-amber-600" fill="#BB4D00" />
                      <Span className="text-sm font-semibold text-slate-900">{(Number(r.rating) || 0).toFixed(1)}</Span>
                    </Div>
                  </Cell>
                  <Cell width={COLS[5]}>
                    <StatusBadge status="approved" label="Approved" />
                  </Cell>
                  <Cell width={COLS[6]}>
                    <Div className="gap-1.5">
                      {hasRank ? <StatusBadge tone="info" label={`#Top${rank}`} /> : null}
                      <HSelect
                        value={rank === '' ? '' : String(rank)}
                        onChange={(e) => handleSelectSlot(id, e.target.value)}
                        className={INPUT}
                      >
                        <Option value="">Select</Option>
                        {Array.from(
                          {
                            length: MAX_TOP,
                          },
                          (_, i) => i + 1,
                        ).map((n) => (
                          <Option key={n} value={n}>
                            #Top{n}
                          </Option>
                        ))}
                      </HSelect>
                    </Div>
                  </Cell>
                </Row>
              );
            })}
          </TBody>
        </DataTable>
      )}

      {/* Replace confirmation modal */}
      {replaceModal && (
        <Overlay onClose={cancelReplace} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Div className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-4">
            <Div className="mb-3 flex-row items-center gap-3">
              <Div className="h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <UiIcon as={ArrowLeftRight} size={18} className="text-blue-700" />
              </Div>
              <Span className="text-base font-semibold text-slate-900 flex-1">Replace with #Top{replaceModal.targetSlot}</Span>
            </Div>
            <Span className="mb-1 text-sm text-slate-700">
              <Strong className="text-slate-900">{nameById(replaceModal.occupantId)}</Strong> is currently at <Strong>#Top{replaceModal.targetSlot}</Strong>.
            </Span>
            <Span className="mb-4 text-sm text-slate-700">
              Replace it with <Strong className="text-slate-900">{nameById(replaceModal.editingId)}</Strong>?
              {ranks[replaceModal.editingId] ? ` The two restaurants will swap their top positions.` : ` The current one will be removed from the top list.`}
            </Span>
            <Div className="flex-row flex-wrap justify-end gap-2">
              <Button onClick={cancelReplace} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button onClick={confirmReplace} className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>Replace</Span>
              </Button>
            </Div>
          </Div>
        </Overlay>
      )}
    </AdminPage>
  );
}
