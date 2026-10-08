/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/dashboard/AdminEarnings.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Wallet,
  Download,
  FileSpreadsheet,
  X,
  Clock,
  AlertTriangle,
  CheckCircle,
  Inbox,
} from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { saveTextFile } from '../../../../../lib/files';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { Text } from '../../../../../components/Text';
import { tw } from '../../../../../lib/tw';
import {
  A,
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  StatusBadge,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  Pagination,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Circle, Line, Path, Svg } from 'react-native-svg';
import { window } from '../../../../../lib/webShim';
const RIDER_TYPES = [
  {
    value: '',
    label: 'All Rider Types',
  },
  {
    value: 'ride',
    label: 'Ride',
  },
  {
    value: 'parcel',
    label: 'Parcel',
  },
  {
    value: 'intercity',
    label: 'Intercity',
  },
];
const PAYMENT_TYPES = [
  {
    value: '',
    label: 'All Payments',
  },
  {
    value: 'cash',
    label: 'Cash',
  },
  {
    value: 'online',
    label: 'Online',
  },
];
const emptyFilters = {
  from: '',
  to: '',
  zone: '',
  vehicle: '',
  riderType: '',
  paymentMethod: '',
  status: '',
  search: '',
};
/* Chart axis and label colour, per the admin design system. */
const AXIS_COLOR = '#62748E';
const BREADCRUMB = [{ label: 'Taxi' }, { label: 'Finance' }, { label: 'Admin earnings' }];
/* Column widths authored for a phone; the table scrolls sideways and stretches on a tablet. */
const COLS = [110, 150, 170, 170, 120, 120, 100, 110, 120, 120, 130, 100, 110, 90];
const COL_LABELS = [
  'Request ID',
  'Completed',
  'Rider',
  'Driver',
  'Zone',
  'Vehicle',
  'Type',
  'Payment',
  'Gross fare',
  'Commission',
  'Driver earning',
  'Refund',
  'Status',
  '',
];
const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const formatFilterDate = (value) => {
  if (!value) return 'Select date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Select date';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
const unwrapResults = (payload, key = 'results') => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  if (Array.isArray(payload?.data?.data?.[key])) return payload.data.data[key];
  return [];
};
const getOptionLabel = (item) => item?.name || item?.type_name || item?.service_location_name || item?.title || 'Option';
const getOptionValue = (item) => String(item?._id || item?.id || getOptionLabel(item));
/*
 * The web paints its own field and keeps a transparent <input type="date"> on
 * top of it, opening the native picker through showPicker()/click(). The kit's
 * Input type="date" IS the native picker, so the transparent layer stays and
 * becomes the tap target; the field below keeps the web's formatted label.
 */
const DatePickerField = ({ label, value, onChange }) => (
  <Field label={label}>
    <Div className="relative">
      <Div className={`${INPUT} flex-row items-center justify-between`}>
        <Div className="flex-row items-center gap-2 flex-1 min-w-0">
          <UiIcon as={CalendarDays} size={14} className="text-slate-400" />
          <Text style={tw`text-sm text-slate-900 flex-1`} numberOfLines={1}>
            {formatFilterDate(value)}
          </Text>
        </Div>
        <UiIcon as={ChevronDown} size={16} className="text-slate-400" />
      </Div>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 opacity-0" />
    </Div>
  </Field>
);
const AdminEarnings = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const [pendingFilters, setPendingFilters] = useState(emptyFilters);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [zones, setZones] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // The web's <svg className="w-full" viewBox="0 0 500 120"> scales to its box;
  // react-native-svg needs the pixel width, so measure the wrapper.
  const [trendBoxWidth, setTrendBoxWidth] = useState(0);
  const { tablet } = useLayoutWidth();

  // Drawer state
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [data, setData] = useState({
    summary: {},
    breakdowns: {
      zones: [],
      vehicles: [],
      riderTypes: [],
    },
    results: [],
    paginator: {
      current_page: 1,
      last_page: 1,
      total: 0,
    },
  });
  const updatePendingFilter = (key, value) => {
    setPendingFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };
  const applyFilters = () => {
    setPage(1);
    setFilters(pendingFilters);
  };
  const clearFilters = useCallback(() => {
    setPage(1);
    setFilters(emptyFilters);
    setPendingFilters(emptyFilters);
  }, []);
  const loadOptions = useCallback(async () => {
    try {
      const [zoneRes, vehicleRes] = await Promise.all([adminService.getZones(), adminService.getVehicleTypes()]);
      setZones(unwrapResults(zoneRes?.data || zoneRes));
      setVehicles(unwrapResults(vehicleRes?.data || vehicleRes));
    } catch (err) {
      console.error('Failed to load admin earning options:', err);
    }
  }, []);
  const loadEarnings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminService.getAdminEarnings({
        ...filters,
        page,
        limit,
      });
      const payload = response?.data || response || {};
      setData({
        summary: payload.summary || {},
        breakdowns: payload.breakdowns || {
          zones: [],
          vehicles: [],
          riderTypes: [],
        },
        results: Array.isArray(payload.results) ? payload.results : [],
        paginator: payload.paginator || {
          current_page: 1,
          last_page: 1,
          total: 0,
        },
      });
    } catch (err) {
      setError(err?.message || 'Failed to load admin earnings');
      setData({
        summary: {},
        breakdowns: {
          zones: [],
          vehicles: [],
          riderTypes: [],
        },
        results: [],
        paginator: {
          current_page: 1,
          last_page: 1,
          total: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);
  useEffect(() => {
    loadOptions();
  }, [loadOptions]);
  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  // Escape key listener to close details
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
        setSelectedTx(null);
      }
    };
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen]);
  const summary = data.summary || {};
  const paginator = data.paginator || {};
  const hasActiveFilters = Object.values(filters).some((value) => String(value || '').trim() !== '');

  // Calculate detailed financial KPIs based on available API metrics
  const totalCommission = Number(summary.adminCommission || 0);
  const grossFare = Number(summary.grossFare || 0);
  const driverEarnings = Number(summary.driverEarnings || 0);
  const averageCommission = Number(summary.averageCommission || 0);
  const totalTrips = Number(summary.totalTrips || 0);
  const cashCommission = Number(summary.byCash || 0);
  const onlineCommission = Math.max(0, totalCommission - cashCommission);

  // Safe derived metrics for premium accounting layout
  const netPlatformRevenue = Math.max(0, totalCommission * 0.95); // Assuming 5% standard tax/disputes reduction
  const refundAmount = Math.max(0, grossFare * 0.015); // Derived estimate
  const pendingSettlements = Math.max(0, driverEarnings * 0.08); // Derived 8% pending window

  // CSV Export utility
  const handleExport = () => {
    const headers = 'Request ID,Completed Date,Rider,Driver,Zone,Vehicle,Type,Payment,Gross Fare,Commission,Driver Earning\n';
    const rows = data.results
      .map(
        (row) =>
          `"${row.requestId || ''}","${formatDate(row.completedAt)}","${row.userName || ''}","${row.driverName || ''}","${row.zoneName || ''}","${row.vehicleName || ''}","${row.riderType || ''}","${row.paymentMethod || ''}",${row.grossFare || 0},${row.adminCommission || 0},${(row.grossFare || 0) - (row.adminCommission || 0)}`,
      )
      .join('\n');
    saveTextFile(`Finance_Report_AdminEarnings_${new Date().toISOString().split('T')[0]}.csv`, headers + rows, 'text/csv');
  };

  // Performance calculations
  const zonePerformanceRows = useMemo(() => {
    return (data.breakdowns.zones || []).map((row) => ({
      label: row.label || 'Default Zone',
      adminCommission: Number(row.adminCommission || 0),
      grossFare: Number(row.grossFare || 0),
      trips: Number(row.trips || 0),
    }));
  }, [data.breakdowns.zones]);
  const vehiclePerformanceRows = useMemo(() => {
    return (data.breakdowns.vehicles || []).map((row) => ({
      label: row.label || 'Default Vehicle',
      adminCommission: Number(row.adminCommission || 0),
      grossFare: Number(row.grossFare || 0),
      trips: Number(row.trips || 0),
    }));
  }, [data.breakdowns.vehicles]);
  const riderTypePerformanceRows = useMemo(() => {
    return (data.breakdowns.riderTypes || []).map((row) => ({
      label: row.label || 'Default Type',
      adminCommission: Number(row.adminCommission || 0),
      grossFare: Number(row.grossFare || 0),
      trips: Number(row.trips || 0),
    }));
  }, [data.breakdowns.riderTypes]);

  // Chart telemetry calculations
  const maxCommission = Math.max(...data.results.map((r) => r.adminCommission || 0), 10);
  const maxGross = Math.max(...data.results.map((r) => r.grossFare || 0), 10);
  const revenueVsCommissionPoints = useMemo(() => {
    if (data.results.length === 0) return [];
    return data.results
      .slice(0, 10)
      .reverse()
      .map((r, i) => {
        const x = (i / 9) * 500;
        const yComm = 120 - ((r.adminCommission || 0) / maxCommission) * 90;
        const yGross = 120 - ((r.grossFare || 0) / maxGross) * 90;
        return {
          x,
          yComm,
          yGross,
          label: r.requestId || '',
          commVal: r.adminCommission,
          grossVal: r.grossFare,
        };
      });
  }, [data.results, maxCommission, maxGross]);
  const revenueLinePath = useMemo(() => {
    if (revenueVsCommissionPoints.length === 0) return '';
    return 'M ' + revenueVsCommissionPoints.map((p) => `${p.x} ${p.yGross}`).join(' L ');
  }, [revenueVsCommissionPoints]);
  const commissionLinePath = useMemo(() => {
    if (revenueVsCommissionPoints.length === 0) return '';
    return 'M ' + revenueVsCommissionPoints.map((p) => `${p.x} ${p.yComm}`).join(' L ');
  }, [revenueVsCommissionPoints]);

  // Payment method calculations (Donut Chart)
  const paymentMethodData = useMemo(() => {
    let cash = 0;
    let online = 0;
    data.results.forEach((r) => {
      if (String(r.paymentMethod).toLowerCase() === 'cash') cash++;
      else online++;
    });
    const total = cash + online || 1;
    return [
      {
        label: 'Cash',
        value: cash,
        percent: Math.round((cash / total) * 100),
        color: A.primary,
      },
      {
        label: 'Online',
        value: online,
        percent: Math.round((online / total) * 100),
        color: A.warning,
      },
    ];
  }, [data.results]);
  const cardGrid = tablet ? 'grid grid-cols-2 gap-3 mb-4' : 'gap-3 mb-4';
  return (
    <AdminPage maxWidth={1200}>
      {/* 1. HEADER SECTION */}
      <PageHeader
        icon={IndianRupee}
        title="Admin Earnings"
        subtitle="Commissions, driver payouts, refunds, settlements and payment performance."
        breadcrumb={BREADCRUMB}
        actions={
          <>
            <Button onClick={handleExport} className={BTN_PRIMARY}>
              <UiIcon as={FileSpreadsheet} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Download report</Span>
            </Button>
            <Button onClick={handleExport} className={BTN_SECONDARY}>
              <UiIcon as={Download} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Export CSV</Span>
            </Button>
            <Button onClick={loadEarnings} className={BTN_SECONDARY} accessibilityLabel="Reload earnings">
              <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Reload</Span>
            </Button>
          </>
        }
      />

      {/* 2. KPI CARDS SECTION */}
      <StatGrid className="mb-4">
        {[
          { label: 'Total commission', value: currency(totalCommission), icon: IndianRupee, tone: 'success' },
          { label: 'Gross ride fare', value: currency(grossFare), icon: Wallet, tone: 'info' },
          { label: 'Driver earnings', value: currency(driverEarnings), icon: TrendingUp, tone: 'info' },
          { label: 'Net platform revenue', value: currency(netPlatformRevenue), icon: ShieldCheck, tone: 'success' },
          { label: 'Average commission', value: currency(averageCommission), icon: BarChart3, tone: 'info' },
          { label: 'Cash commission', value: currency(cashCommission), icon: UserRound, tone: 'neutral' },
          { label: 'Online commission', value: currency(onlineCommission), icon: Car, tone: 'info' },
          { label: 'Pending settlements', value: currency(pendingSettlements), icon: Clock, tone: 'warning' },
          { label: 'Refund amount', value: currency(refundAmount), icon: AlertTriangle, tone: 'danger' },
          { label: 'Completed transactions', value: String(totalTrips), icon: CheckCircle, tone: 'success' },
        ].map((kpi) => (
          <StatCard key={kpi.label} label={kpi.label} value={loading ? '—' : kpi.value} icon={kpi.icon} tone={kpi.tone} />
        ))}
      </StatGrid>

      {/* 3. FILTERS PANEL */}
      <Card className="mb-4">
        <SectionTitle>Financial ledger filters</SectionTitle>
        <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
          <DatePickerField label="From" value={pendingFilters.from} onChange={(val) => updatePendingFilter('from', val)} />
          <DatePickerField label="To" value={pendingFilters.to} onChange={(val) => updatePendingFilter('to', val)} />

          <Field label="Zone">
            <Select value={pendingFilters.zone} onChange={(e) => updatePendingFilter('zone', e.target.value)} className={INPUT}>
              <Option value="">All Zones</Option>
              {zones.map((zone) => (
                <Option key={getOptionValue(zone)} value={getOptionValue(zone)}>
                  {getOptionLabel(zone)}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Vehicle">
            <Select value={pendingFilters.vehicle} onChange={(e) => updatePendingFilter('vehicle', e.target.value)} className={INPUT}>
              <Option value="">All Vehicles</Option>
              {vehicles.map((v) => (
                <Option key={getOptionValue(v)} value={getOptionValue(v)}>
                  {getOptionLabel(v)}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Rider type">
            <Select value={pendingFilters.riderType} onChange={(e) => updatePendingFilter('riderType', e.target.value)} className={INPUT}>
              {RIDER_TYPES.map((t) => (
                <Option key={t.value} value={t.value}>
                  {t.label}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Payment">
            <Select value={pendingFilters.paymentMethod} onChange={(e) => updatePendingFilter('paymentMethod', e.target.value)} className={INPUT}>
              {PAYMENT_TYPES.map((pt) => (
                <Option key={pt.value} value={pt.value}>
                  {pt.label}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Search ledger" hint="Matches a trip id, rider or driver" className={tablet ? 'col-span-2' : null}>
            <Div className="relative justify-center">
              <UiIcon as={Search} size={16} className="absolute left-3 text-slate-400 z-10" />
              <Input
                value={pendingFilters.search}
                onChange={(e) => updatePendingFilter('search', e.target.value)}
                placeholder="Trip ID, driver..."
                className={`${INPUT} pl-9`}
              />
            </Div>
          </Field>
        </Div>

        <Toolbar className="mt-3 mb-0">
          <Button onClick={applyFilters} className={`${BTN_PRIMARY} flex-1`}>
            <Span className={BTN_TEXT_PRIMARY}>Apply filters</Span>
          </Button>
          <Button onClick={clearFilters} disabled={!hasActiveFilters} className={`${BTN_SECONDARY} flex-1 ${hasActiveFilters ? '' : 'opacity-40'}`}>
            <Span className={BTN_TEXT_SECONDARY}>Clear</Span>
          </Button>
        </Toolbar>
      </Card>

      {error ? <ErrorState title="Could not load admin earnings" message={error} onRetry={loadEarnings} className="mb-4" /> : null}

      {/* 4. CHARTS SECTION */}
      <Div className={cardGrid}>
        {/* Revenue vs Commission */}
        <Card>
          <SectionTitle>Revenue vs commission</SectionTitle>
          <Text style={tw`text-xs text-slate-500 mb-2`}>Historical correlation across the latest transactions.</Text>
          {revenueVsCommissionPoints.length === 0 ? (
            <EmptyState icon={BarChart3} title="No historical data yet" message="Completed transactions build this trend." className="border-0 py-6 px-0" />
          ) : (
            <Div className="py-2" onLayout={(event) => setTrendBoxWidth(event.nativeEvent.layout.width)}>
              {trendBoxWidth > 0 && (
                <Svg width={trendBoxWidth} height={(trendBoxWidth * 120) / 500} viewBox="0 0 500 120">
                  {/* Gridlines */}
                  {[0, 1, 2].map((g) => (
                    <Line key={g} x1="0" y1={40 * g + 10} x2="500" y2={40 * g + 10} stroke="#E2E8F0" strokeWidth="1" />
                  ))}
                  {/* Revenue Path */}
                  <Path d={revenueLinePath} fill="none" stroke={A.primary} strokeWidth="2.5" />
                  {/* Commission Path */}
                  <Path d={commissionLinePath} fill="none" stroke={A.warning} strokeWidth="2.5" />
                </Svg>
              )}
              <Div className="flex-row justify-between mt-2">
                <Text style={[tw`text-xs`, { color: AXIS_COLOR }]}>Earliest</Text>
                <Text style={[tw`text-xs`, { color: AXIS_COLOR }]}>Latest</Text>
              </Div>
            </Div>
          )}
          <Div className="flex-row flex-wrap items-center gap-4 border-t border-slate-200 pt-3 mt-2">
            <Div className="flex-row items-center gap-2">
              <Div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: A.primary }} />
              <Text style={tw`text-xs text-slate-700`}>Gross fare</Text>
            </Div>
            <Div className="flex-row items-center gap-2">
              <Div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: A.warning }} />
              <Text style={tw`text-xs text-slate-700`}>Commission</Text>
            </Div>
          </Div>
        </Card>

        {/* Payment Method Distribution */}
        <Card>
          <SectionTitle>Payment method distribution</SectionTitle>
          <Text style={tw`text-xs text-slate-500 mb-2`}>Segment split by transaction volume.</Text>
          <Div className="flex-row items-center justify-center gap-6 py-2">
            <Svg width={110} height={110} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx="50" cy="50" r="35" fill="transparent" stroke={paymentMethodData[0].color} strokeWidth="10" strokeDasharray={`${paymentMethodData[0].percent * 2.2} 220`} />
              <Circle
                cx="50"
                cy="50"
                r="35"
                fill="transparent"
                stroke={paymentMethodData[1].color}
                strokeWidth="10"
                strokeDasharray={`${paymentMethodData[1].percent * 2.2} 220`}
                strokeDashoffset={`-${paymentMethodData[0].percent * 2.2}`}
              />
            </Svg>
            <Div className="gap-2">
              {paymentMethodData.map((d) => (
                <Div key={d.label} className="flex-row items-center gap-2">
                  <Div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <Text style={tw`text-sm text-slate-700`}>{d.label}</Text>
                  <Text style={tw`text-sm font-semibold text-slate-900`}>{d.percent}%</Text>
                </Div>
              ))}
            </Div>
          </Div>
          <Text style={[tw`text-xs border-t border-slate-200 pt-3 mt-2`, { color: AXIS_COLOR }]}>Split calculated from the transactions on this page.</Text>
        </Card>

        {/* Daily Commission Distribution */}
        <Card>
          <SectionTitle>Daily commission distribution</SectionTitle>
          <Text style={tw`text-xs text-slate-500 mb-2`}>Average transactional values.</Text>
          {data.results.length === 0 ? (
            <EmptyState icon={BarChart3} title="No transactions yet" message="Commission bars appear once trips settle." className="border-0 py-6 px-0" />
          ) : (
            <Div className="flex-row items-end justify-between gap-1.5 h-[110px] py-2">
              {data.results.slice(0, 10).map((r, i) => {
                const heightPercent = maxCommission > 0 ? Math.max(10, Math.min(100, (Number(r.adminCommission || 0) / maxCommission) * 100)) : 10;
                return <Div key={i} className="flex-1 rounded-t-md" style={{ height: `${heightPercent}%`, backgroundColor: A.primarySoft }} />;
              })}
            </Div>
          )}
          <Text style={[tw`text-xs border-t border-slate-200 pt-3 mt-2`, { color: AXIS_COLOR }]}>Last 10 completed transactions.</Text>
        </Card>
      </Div>

      {/* 5. PERFORMANCE METRIC CARDS */}
      <Div className={cardGrid}>
        <BreakdownPanel title="Zone performance" icon={BarChart3} rows={zonePerformanceRows} emptyText="No zone earnings found." loading={loading} />
        <BreakdownPanel title="Vehicle performance" icon={Car} rows={vehiclePerformanceRows} emptyText="No vehicle earnings found." loading={loading} />
        <BreakdownPanel title="Rider type performance" icon={UserRound} rows={riderTypePerformanceRows} emptyText="No rider type earnings found." loading={loading} />
      </Div>

      {/* 6 & 7. SETTLEMENT & ADJUSTMENT PANELS */}
      <Div className={cardGrid}>
        <Card>
          <SectionTitle>Settlement ledger summary</SectionTitle>
          <Div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: 'Total driver payable', value: currency(driverEarnings), className: 'text-slate-900' },
              { label: 'Paid to drivers', value: currency(driverEarnings * 0.92), className: 'text-green-700' },
              { label: 'Pending payout', value: currency(pendingSettlements), className: 'text-amber-700' },
              { label: 'Failed payout', value: currency(0), className: 'text-red-700' },
            ].map((item) => (
              <Div key={item.label} className="gap-1">
                <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`} numberOfLines={2}>
                  {item.label}
                </Text>
                <Text style={tw.style('text-base font-semibold', item.className)} numberOfLines={1}>
                  {item.value}
                </Text>
              </Div>
            ))}
          </Div>
          <Div className="flex-row items-center justify-between gap-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
            <Text style={tw`text-sm text-slate-700 flex-1`} numberOfLines={1}>
              Next settlement target
            </Text>
            <Text style={tw`text-sm font-semibold text-slate-900`}>Friday, 10:00 AM</Text>
          </Div>
        </Card>

        <Card>
          <SectionTitle>Refunds &amp; adjustments</SectionTitle>
          <Div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: 'Total refunds issued', value: currency(refundAmount), className: 'text-red-700' },
              { label: 'Cancelled ride refunds', value: currency(refundAmount * 0.7), className: 'text-slate-900' },
              { label: 'Wallet adjustments', value: currency(refundAmount * 0.2), className: 'text-slate-900' },
              { label: 'Disputed audits', value: currency(refundAmount * 0.1), className: 'text-amber-700' },
            ].map((item) => (
              <Div key={item.label} className="gap-1">
                <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`} numberOfLines={2}>
                  {item.label}
                </Text>
                <Text style={tw.style('text-base font-semibold', item.className)} numberOfLines={1}>
                  {item.value}
                </Text>
              </Div>
            ))}
          </Div>
          <Div className="flex-row items-center justify-between gap-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
            <Text style={tw`text-sm text-slate-700 flex-1`} numberOfLines={2}>
              Manual adjustments approved today
            </Text>
            <Text style={tw`text-sm font-semibold text-slate-900`}>₹0.00</Text>
          </Div>
        </Card>
      </Div>

      {/* 8. TRANSACTION HISTORY */}
      <Card className="mb-3">
        <SectionTitle>Transaction registry</SectionTitle>
        <Toolbar className="mb-0">
          <Text style={tw`text-sm text-slate-500 flex-1`}>{paginator.total || 0} transactions indexed</Text>
          <Div className="flex-row items-center gap-2">
            <Text style={tw`text-sm text-slate-700`}>Show</Text>
            <Select
              value={limit}
              onChange={(event) => {
                setPage(1);
                setLimit(Number(event.target.value));
              }}
              className={`${INPUT} w-24`}
            >
              <Option value={10}>10</Option>
              <Option value={25}>25</Option>
              <Option value={50}>50</Option>
            </Select>
          </Div>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : data.results.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No transactions found"
          message={hasActiveFilters ? 'No earnings match these filters yet.' : 'Completed trips and their commission appear here.'}
          actionLabel={hasActiveFilters ? 'Clear filters' : 'Reload'}
          onAction={hasActiveFilters ? clearFilters : loadEarnings}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={COL_LABELS} />
            <TBody>
              {data.results.map((row, index) => {
                const devEarning = (row.grossFare || 0) - (row.adminCommission || 0);
                const isExpanded = selectedTx && selectedTx.id === row.id && isDrawerOpen;
                const toggleExpand = (e) => {
                  e.stopPropagation();
                  if (isExpanded) {
                    setIsDrawerOpen(false);
                    setSelectedTx(null);
                  } else {
                    setSelectedTx(row);
                    setIsDrawerOpen(true);
                  }
                };
                return (
                  <Row key={row.id} last={index === data.results.length - 1} className={isExpanded ? 'bg-blue-50' : null}>
                    <Cell width={COLS[0]} numberOfLines={1}>
                      {row.requestId}
                    </Cell>
                    <Cell width={COLS[1]}>{formatDate(row.completedAt)}</Cell>
                    <Cell width={COLS[2]}>
                      <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={1}>
                        {row.userName || '--'}
                      </Text>
                      <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                        {row.userPhone || '--'}
                      </Text>
                    </Cell>
                    <Cell width={COLS[3]}>
                      <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={1}>
                        {row.driverName || '--'}
                      </Text>
                      <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                        {row.driverPhone || '--'}
                      </Text>
                    </Cell>
                    <Cell width={COLS[4]}>{row.zoneName || '--'}</Cell>
                    <Cell width={COLS[5]}>{row.vehicleName || '--'}</Cell>
                    <Cell width={COLS[6]}>
                      <StatusBadge tone="info" label={String(row.riderType || '--')} />
                    </Cell>
                    <Cell width={COLS[7]}>
                      <StatusBadge tone="neutral" label={String(row.paymentMethod || '--')} />
                    </Cell>
                    <Cell width={COLS[8]} align="right">
                      {currency(row.grossFare)}
                    </Cell>
                    <Cell width={COLS[9]} align="right">
                      {currency(row.adminCommission)}
                    </Cell>
                    <Cell width={COLS[10]} align="right">
                      {currency(devEarning)}
                    </Cell>
                    <Cell width={COLS[11]} align="right">
                      {currency(0)}
                    </Cell>
                    <Cell width={COLS[12]}>
                      <StatusBadge status="completed" label="Success" />
                    </Cell>
                    <Cell width={COLS[13]} align="center">
                      <Button onClick={toggleExpand} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="View transaction details">
                        <UiIcon
                          as={ChevronRight}
                          size={18}
                          className={isExpanded ? 'text-blue-600' : 'text-slate-500'}
                          style={isExpanded ? { transform: [{ rotate: '90deg' }] } : undefined}
                        />
                      </Button>
                    </Cell>
                  </Row>
                );
              })}
            </TBody>
          </DataTable>

          {isDrawerOpen && selectedTx ? (
            <Card className="mt-3">
              <SectionTitle
                action={
                  <Button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setSelectedTx(null);
                    }}
                    className="w-11 h-11 rounded-lg items-center justify-center"
                    accessibilityLabel="Close transaction details"
                  >
                    <UiIcon as={X} size={18} className="text-slate-500" />
                  </Button>
                }
              >
                Transaction {selectedTx.requestId}
              </SectionTitle>
              <Text style={tw`text-xs text-slate-500 mb-3`}>Completed {formatDate(selectedTx.completedAt)}</Text>

              <Div className={tablet ? 'grid grid-cols-2 gap-3 mb-3' : 'gap-3 mb-3'}>
                <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 gap-1">
                  <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`}>Rider</Text>
                  <Text style={tw`text-sm font-semibold text-slate-900`}>{selectedTx.userName || 'Not available'}</Text>
                  <Text style={tw`text-xs text-slate-500`}>{selectedTx.userPhone || 'Not available'}</Text>
                </Div>
                <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 gap-1">
                  <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`}>Driver</Text>
                  <Text style={tw`text-sm font-semibold text-slate-900`}>{selectedTx.driverName || 'Not available'}</Text>
                  <Text style={tw`text-xs text-slate-500`}>{selectedTx.driverPhone || 'Not available'}</Text>
                </Div>
                <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 gap-1.5">
                  <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`}>Logistics &amp; zone</Text>
                  <Div className="flex-row items-center justify-between gap-3">
                    <Text style={tw`text-sm text-slate-700`}>Zone</Text>
                    <Text style={tw`text-sm font-semibold text-slate-900 flex-1 text-right`} numberOfLines={1}>
                      {selectedTx.zoneName || 'Global Zone'}
                    </Text>
                  </Div>
                  <Div className="flex-row items-center justify-between gap-3">
                    <Text style={tw`text-sm text-slate-700`}>Vehicle</Text>
                    <Text style={tw`text-sm font-semibold text-slate-900 flex-1 text-right`} numberOfLines={1}>
                      {selectedTx.vehicleName || 'Standard Car'}
                    </Text>
                  </Div>
                </Div>
                <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 gap-1.5">
                  <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`}>Payment</Text>
                  <Div className="flex-row items-center justify-between gap-3">
                    <Text style={tw`text-sm text-slate-700`}>Gateway</Text>
                    <Text style={tw`text-sm font-semibold text-slate-900 flex-1 text-right`} numberOfLines={1}>
                      {selectedTx.paymentMethod || 'Not available'}
                    </Text>
                  </Div>
                  <Div className="flex-row items-center justify-between gap-3">
                    <Text style={tw`text-sm text-slate-700`}>Settlement</Text>
                    <StatusBadge status="completed" label="Completed" />
                  </Div>
                </Div>
              </Div>

              <Div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                {[
                  { label: 'Gross ride fare', value: currency(selectedTx.grossFare), className: 'text-slate-900' },
                  { label: 'Platform commission', value: `-${currency(selectedTx.adminCommission)}`, className: 'text-green-700' },
                  { label: 'Driver net earnings', value: currency((selectedTx.grossFare || 0) - (selectedTx.adminCommission || 0)), className: 'text-blue-700' },
                  { label: 'Refund offsets', value: currency(0), className: 'text-red-700' },
                ].map((item) => (
                  <Div key={item.label} className="gap-1">
                    <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`} numberOfLines={2}>
                      {item.label}
                    </Text>
                    <Text style={tw.style('text-base font-semibold', item.className)} numberOfLines={1}>
                      {item.value}
                    </Text>
                  </Div>
                ))}
              </Div>
            </Card>
          ) : null}

          <Pagination
            page={paginator.current_page || page}
            pages={paginator.last_page || 1}
            total={paginator.total || 0}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => current + 1)}
          />
        </>
      )}
    </AdminPage>
  );
};
const BreakdownPanel = ({ title, icon: PanelIcon, rows, emptyText, loading }) => {
  const max = Math.max(...rows.map((row) => Number(row.adminCommission || 0)), 0);
  return (
    <Card>
      <SectionTitle action={<UiIcon as={PanelIcon} size={18} className="text-slate-400" />}>{title}</SectionTitle>
      <Text style={tw`text-xs text-slate-500 mb-3`}>Commission split</Text>

      {loading ? (
        <TableSkeleton rows={3} className="border-0 p-0" />
      ) : rows.length ? (
        <Div className="gap-3">
          {rows.slice(0, 5).map((row) => {
            const percent = max ? Math.max(6, (Number(row.adminCommission || 0) / max) * 100) : 0;
            return (
              <Div key={row.label} className="gap-1.5">
                <Div className="flex-row items-start justify-between gap-3">
                  <Text style={tw`text-sm text-slate-700 flex-1`} numberOfLines={2}>
                    {row.label}
                  </Text>
                  <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={1}>
                    {currency(row.adminCommission)}
                  </Text>
                </Div>
                <Div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <Div className="h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: A.primary }} />
                </Div>
                <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                  {row.trips} trips · gross {currency(row.grossFare)}
                </Text>
              </Div>
            );
          })}
        </Div>
      ) : (
        <EmptyState icon={BarChart3} title="Nothing to split yet" message={emptyText} className="border-0 py-6 px-0" />
      )}
    </Card>
  );
};
export default AdminEarnings;
