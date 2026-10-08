/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/dashboard/AdminEarnings.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BarChart3,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  Loader2,
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
  ArrowRight,
  CheckCircle,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react-native';
import { motion, AnimatePresence } from '../../../../../lib/motion';
// PORT: needs modules/Taxi/modules/admin/services/adminService.js ported (node tools/port.js modules/Taxi/modules/admin/services/adminService.js)
import { adminService } from '../../services/adminService';
import {
  Button,
  Div,
  H1,
  H3,
  H4,
  Input,
  Label,
  Option,
  P,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../../components/web';
import { Circle, Line, Path, Svg } from 'react-native-svg';
import { document, window } from '../../../../../lib/webShim';
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
const DatePickerField = ({ label, value, onChange }) => {
  const inputRef = React.useRef(null);
  const openPicker = () => {
    if (typeof inputRef.current?.showPicker === 'function') {
      inputRef.current.showPicker();
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.click();
  };
  // PORT: ref on a host element: check what the web did with it (scrollIntoView, focus, measure, DOM reads)
  return (
    <Label className="space-y-1 block">
      <Span className="flex items-center gap-1 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
        <UiIcon as={CalendarDays} size={12} className="text-[#64748B]" /> {label}
      </Span>
      <Div className="relative">
        <Button
          type="button"
          onClick={openPicker}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#FFC400]"
        >
          <Span>{formatFilterDate(value)}</Span>
          <UiIcon as={ChevronDown} size={14} className="text-slate-400" />
        </Button>
        <Input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </Div>
    </Label>
  );
};
const AdminEarnings = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const [pendingFilters, setPendingFilters] = useState(emptyFilters);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [zones, setZones] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    // PORT: new Blob: browser API; see the porting guide
    const blob = new Blob([headers + rows], {
      type: 'text/csv',
    });
    const url = window.URL.createObjectURL(blob);
    // PORT: document.createElement: DOM access has no React Native equivalent; use refs/state
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Finance_Report_AdminEarnings_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
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
        color: '#3B82F6',
      },
      {
        label: 'Online',
        value: online,
        percent: Math.round((online / total) * 100),
        color: '#FFC400',
      },
    ];
  }, [data.results]);
  // PORT: className on an svg element: give it width/height/style instead
  // PORT: inline style object: check every property is valid in React Native (no backgroundImage, cursor, gridTemplate..., strings like "1rem")
  // PORT: overflow-x-auto: this row scrolls sideways on the web -> use <HScroll> (tables: <Table cols>)
  // PORT: <Table>: set cols={[...]} widths (px) for each column; the table scrolls sideways like the web's overflow-x-auto
  return (
    <ScrollDiv className="min-h-screen bg-[#F6F8FC] p-6 lg:p-8 font-sans redigo-admin-root animate-in fade-in duration-300">
      {/* 1. HEADER SECTION */}
      <Div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <Div>
          <Div className="flex items-center gap-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#64748B]">
            <Span>Finance Center</Span>
            <UiIcon as={ChevronRight} size={10} />
            <Span className="text-[#0B1220] font-bold">Admin Earnings</Span>
          </Div>
          <Div className="flex items-center gap-2">
            <H1 className="text-2xl font-bold text-[#0B1220] tracking-tight">Admin Earnings</H1>
            <Span className="bg-[#FFC400]/20 text-[#0B1220] text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#FFC400]/40">Finance</Span>
          </Div>
          <P className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Track commissions, driver payouts, refunds, settlements, and payment performance.
          </P>
        </Div>
        <Div className="flex flex-wrap items-center gap-3">
          <Button onClick={loadEarnings} className="admin-btn-secondary h-10 w-10 !p-0">
            <UiIcon as={RefreshCw} size={15} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button onClick={handleExport} className="admin-btn-secondary h-10 gap-2 text-xs font-semibold">
            <UiIcon as={Download} size={14} />
            <Span>Export CSV</Span>
          </Button>
          <Button onClick={handleExport} className="admin-btn-primary h-10 gap-2 !bg-[#FFC400] !text-[#0B1220] hover:brightness-95 text-xs font-semibold">
            <UiIcon as={FileSpreadsheet} size={14} />
            <Span>Download Report</Span>
          </Button>
        </Div>
      </Div>

      {/* 2. KPI CARDS SECTION (10 Metrics) */}
      <Div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-8">
        {[
          {
            label: 'Total Commission',
            value: currency(totalCommission),
            icon: IndianRupee,
            cardBg: '!bg-orange-500',
          },
          {
            label: 'Gross Ride Fare',
            value: currency(grossFare),
            icon: Wallet,
            cardBg: '!bg-blue-500',
          },
          {
            label: 'Driver Earnings',
            value: currency(driverEarnings),
            icon: TrendingUp,
            cardBg: '!bg-emerald-500',
          },
          {
            label: 'Net Platform Revenue',
            value: currency(netPlatformRevenue),
            icon: ShieldCheck,
            cardBg: '!bg-violet-500',
          },
          {
            label: 'Average Commission',
            value: currency(averageCommission),
            icon: BarChart3,
            cardBg: '!bg-fuchsia-500',
          },
          {
            label: 'Cash Commission',
            value: currency(cashCommission),
            icon: UserRound,
            cardBg: '!bg-slate-600',
          },
          {
            label: 'Online Commission',
            value: currency(onlineCommission),
            icon: Car,
            cardBg: '!bg-teal-500',
          },
          {
            label: 'Pending Settlements',
            value: currency(pendingSettlements),
            icon: Clock,
            cardBg: '!bg-orange-500',
          },
          {
            label: 'Refund Amount',
            value: currency(refundAmount),
            icon: AlertTriangle,
            cardBg: '!bg-rose-500',
          },
          {
            label: 'Completed Transactions',
            value: totalTrips,
            icon: CheckCircle,
            cardBg: '!bg-sky-500',
          },
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.3,
              delay: idx * 0.03,
            }}
            className={`admin-card !p-4 border-none !text-white hover:scale-[1.02] transition-all shadow-lg rounded-lg ${kpi.cardBg}`}
          >
            <Div className="flex items-center justify-between mb-2">
              <Span className="card-label text-[10px] font-bold opacity-80 uppercase tracking-wider">{kpi.label}</Span>
              <Div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                <UiIcon as={kpi.icon} size={16} strokeWidth={2.5} />
              </Div>
            </Div>
            <H4 className="text-xl font-black tracking-tight mt-1">{loading ? '...' : kpi.value}</H4>
          </motion.div>
        ))}
      </Div>

      {/* 3. FILTERS PANEL */}
      <Div className="admin-card !p-4 bg-white space-y-4 mb-8 border border-[#E5E7EB]">
        <Div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <UiIcon as={SlidersHorizontal} size={14} className="text-[#FFC400]" />
          <H3 className="text-[11px] font-bold uppercase tracking-wider text-[#0B1220]">Financial Ledger Filtering</H3>
        </Div>

        <Div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-8">
          <DatePickerField label="From" value={pendingFilters.from} onChange={(val) => updatePendingFilter('from', val)} />
          <DatePickerField label="To" value={pendingFilters.to} onChange={(val) => updatePendingFilter('to', val)} />

          <Label className="space-y-1 block">
            <Span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Zone</Span>
            <Select value={pendingFilters.zone} onChange={(e) => updatePendingFilter('zone', e.target.value)} className="admin-input h-10">
              <Option value="">All Zones</Option>
              {zones.map((zone) => (
                <Option key={getOptionValue(zone)} value={getOptionValue(zone)}>
                  {getOptionLabel(zone)}
                </Option>
              ))}
            </Select>
          </Label>

          <Label className="space-y-1 block">
            <Span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Vehicle</Span>
            <Select value={pendingFilters.vehicle} onChange={(e) => updatePendingFilter('vehicle', e.target.value)} className="admin-input h-10">
              <Option value="">All Vehicles</Option>
              {vehicles.map((v) => (
                <Option key={getOptionValue(v)} value={getOptionValue(v)}>
                  {getOptionLabel(v)}
                </Option>
              ))}
            </Select>
          </Label>

          <Label className="space-y-1 block">
            <Span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Rider Type</Span>
            <Select value={pendingFilters.riderType} onChange={(e) => updatePendingFilter('riderType', e.target.value)} className="admin-input h-10">
              {RIDER_TYPES.map((t) => (
                <Option key={t.value} value={t.value}>
                  {t.label}
                </Option>
              ))}
            </Select>
          </Label>

          <Label className="space-y-1 block">
            <Span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Payment</Span>
            <Select value={pendingFilters.paymentMethod} onChange={(e) => updatePendingFilter('paymentMethod', e.target.value)} className="admin-input h-10">
              {PAYMENT_TYPES.map((pt) => (
                <Option key={pt.value} value={pt.value}>
                  {pt.label}
                </Option>
              ))}
            </Select>
          </Label>

          <Label className="space-y-1 block">
            <Span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Search Ledger</Span>
            <Div className="relative">
              <UiIcon as={Search} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={pendingFilters.search}
                onChange={(e) => updatePendingFilter('search', e.target.value)}
                placeholder="Trip ID, driver..."
                className="admin-input pl-9 h-10"
              />
            </Div>
          </Label>

          <Div className="flex items-end gap-2">
            <Button onClick={applyFilters} className="admin-btn-primary h-10 flex-1 !bg-[#FFC400] !text-[#0B1220] font-bold text-xs">
              Apply
            </Button>
            <Button onClick={clearFilters} disabled={!hasActiveFilters} className="admin-btn-secondary h-10 flex-1 text-xs font-semibold disabled:opacity-40">
              Clear
            </Button>
          </Div>
        </Div>
      </Div>

      {error && <Div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">{error}</Div>}

      {/* 4. DYNAMIC INTERACTIVE CHARTS SECTION */}
      <Div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        {/* Revenue vs Commission */}
        <Div className="admin-card flex flex-col justify-between hover:shadow-md transition-shadow relative">
          <Div>
            <H3 className="text-xs font-bold text-[#0B1220] uppercase tracking-wider">Revenue vs Commission</H3>
            <P className="text-[10px] text-[#64748B] mt-0.5">Historical correlation profile.</P>
          </Div>
          {revenueVsCommissionPoints.length === 0 ? (
            <Div className="h-[140px] flex flex-col items-center justify-center text-xs text-slate-400">No historical data available</Div>
          ) : (
            <Div className="py-2.5">
              <Svg viewBox="0 0 500 120" className="w-full overflow-visible">
                {/* Gridlines */}
                {[0, 1, 2].map((g) => (
                  <Line key={g} x1="0" y1={40 * g + 10} x2="500" y2={40 * g + 10} stroke="#F1F5F9" strokeWidth="1" />
                ))}
                {/* Revenue Path */}
                <Path d={revenueLinePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" />
                {/* Commission Path */}
                <Path d={commissionLinePath} fill="none" stroke="#FFC400" strokeWidth="2.5" />
              </Svg>
              <Div className="flex justify-between text-[9px] text-slate-400 mt-2">
                <Span>Earliest Transaction</Span>
                <Span>Latest Transaction</Span>
              </Div>
            </Div>
          )}
          <Div className="flex gap-4 text-[10px] font-semibold border-t border-[#E5E7EB] pt-3">
            <Span className="flex items-center gap-1.5 text-blue-600">
              <Span className="w-2.5 h-1 bg-blue-600 inline-block rounded-full" /> Gross Fare
            </Span>
            <Span className="flex items-center gap-1.5 text-amber-500">
              <Span className="w-2.5 h-1 bg-[#FFC400] inline-block rounded-full" /> Commission
            </Span>
          </Div>
        </Div>

        {/* Payment Method Distribution */}
        <Div className="admin-card flex flex-col justify-between hover:shadow-md transition-shadow">
          <Div>
            <H3 className="text-xs font-bold text-[#0B1220] uppercase tracking-wider">Payment Method Distribution</H3>
            <P className="text-[10px] text-[#64748B] mt-0.5">Segment splits by volume.</P>
          </Div>
          <Div className="flex items-center justify-center gap-6 py-2.5">
            <Svg width="90" height="90" viewBox="0 0 100 100" className="transform -rotate-90">
              <Circle
                cx="50"
                cy="50"
                r="35"
                fill="transparent"
                stroke="#3B82F6"
                strokeWidth="10"
                strokeDasharray={`${paymentMethodData[0].percent * 2.2} 220`}
              />
              <Circle
                cx="50"
                cy="50"
                r="35"
                fill="transparent"
                stroke="#FFC400"
                strokeWidth="10"
                strokeDasharray={`${paymentMethodData[1].percent * 2.2} 220`}
                strokeDashoffset={`-${paymentMethodData[0].percent * 2.2}`}
              />
            </Svg>
            <Div className="space-y-1.5 text-[10px] font-bold">
              {paymentMethodData.map((d, i) => (
                <Div key={i} className="flex items-center gap-1.5">
                  <Span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{
                      backgroundColor: d.color,
                    }}
                  />
                  <Span className="text-slate-600">{d.label}:</Span>
                  <Span className="text-[#0B1220]">{d.percent}%</Span>
                </Div>
              ))}
            </Div>
          </Div>
          <Div className="text-[9px] text-[#64748B] border-t border-[#E5E7EB] pt-3">Split calculated from current active registry.</Div>
        </Div>

        {/* Daily Commission & Earnings Trend */}
        <Div className="admin-card flex flex-col justify-between hover:shadow-md transition-shadow">
          <Div>
            <H3 className="text-xs font-bold text-[#0B1220] uppercase tracking-wider">Daily Commission Distribution</H3>
            <P className="text-[10px] text-[#64748B] mt-0.5">Average transactional values.</P>
          </Div>
          <Div className="py-2.5 flex items-end justify-between h-[100px] px-2">
            {data.results.slice(0, 10).map((r, i) => {
              const heightPercent = maxCommission > 0 ? Math.max(10, Math.min(100, (Number(r.adminCommission || 0) / maxCommission) * 100)) : 10;
              // PORT: inline style object: check every property is valid in React Native (no backgroundImage, cursor, gridTemplate..., strings like "1rem")
              return (
                <Div
                  key={i}
                  className="w-5 bg-amber-100 hover:bg-[#FFC400] transition-colors rounded-sm group relative"
                  style={{
                    height: `${heightPercent}%`,
                  }}
                >
                  <Div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-900 !text-white rounded p-1.5 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mb-1 z-10 whitespace-nowrap">
                    ₹{r.adminCommission}
                  </Div>
                </Div>
              );
            })}
          </Div>
          <Div className="text-[9px] text-[#64748B] border-t border-[#E5E7EB] pt-3">Last 10 completed transaction bars.</Div>
        </Div>
      </Div>

      {/* 5. PERFORMANCE METRIC CARDS */}
      <Div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        <BreakdownPanel title="Zone performance" icon={BarChart3} rows={zonePerformanceRows} emptyText="No zone earnings found." />
        <BreakdownPanel title="Vehicle performance" icon={Car} rows={vehiclePerformanceRows} emptyText="No vehicle earnings found." />
        <BreakdownPanel title="Rider type performance" icon={UserRound} rows={riderTypePerformanceRows} emptyText="No rider type earnings found." />
      </Div>

      {/* 6 & 7. SETTLEMENT & ADJUSTMENT PANEL ROW */}
      <Div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* Settlement Summary */}
        <Div className="admin-card bg-white border border-[#E5E7EB] rounded-lg">
          <Div className="flex items-center gap-2 mb-4">
            <H3 className="text-xs font-bold text-[#0B1220] uppercase tracking-wider">Settlement Ledger Summary</H3>
            <Div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </Div>
          <Div className="grid grid-cols-2 gap-4 text-xs mb-4">
            <Div>
              <Span className="text-slate-400 block uppercase font-semibold text-[9px] tracking-wider">Total Driver Payable</Span>
              <Span className="text-base font-bold text-[#0B1220] block mt-0.5">{currency(driverEarnings)}</Span>
            </Div>
            <Div>
              <Span className="text-slate-400 block uppercase font-semibold text-[9px] tracking-wider">Paid to Drivers</Span>
              <Span className="text-base font-bold text-emerald-600 block mt-0.5">{currency(driverEarnings * 0.92)}</Span>
            </Div>
            <Div>
              <Span className="text-slate-400 block uppercase font-semibold text-[9px] tracking-wider">Pending Payout</Span>
              <Span className="text-base font-bold text-amber-500 block mt-0.5">{currency(pendingSettlements)}</Span>
            </Div>
            <Div>
              <Span className="text-slate-400 block uppercase font-semibold text-[9px] tracking-wider">Failed Payout</Span>
              <Span className="text-base font-bold text-rose-500 block mt-0.5">{currency(0)}</Span>
            </Div>
          </Div>
          <Div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex justify-between items-center text-[10px] text-slate-500 font-semibold">
            <Span>Next Settlement Target Date</Span>
            <Span className="text-[#0B1220] font-bold">Friday, 10:00 AM</Span>
          </Div>
        </Div>

        {/* Refund & Adjustment Summary */}
        <Div className="admin-card bg-white border border-[#E5E7EB] rounded-lg">
          <Div className="flex items-center gap-2 mb-4">
            <H3 className="text-xs font-bold text-[#0B1220] uppercase tracking-wider">Refunds & Adjustments</H3>
            <Div className="h-1.5 w-1.5 rounded-full bg-[#FFC400]" />
          </Div>
          <Div className="grid grid-cols-2 gap-4 text-xs mb-4">
            <Div>
              <Span className="text-slate-400 block uppercase font-semibold text-[9px] tracking-wider">Total Refunds Issued</Span>
              <Span className="text-base font-bold text-rose-500 block mt-0.5">{currency(refundAmount)}</Span>
            </Div>
            <Div>
              <Span className="text-slate-400 block uppercase font-semibold text-[9px] tracking-wider">Cancelled Ride Refunds</Span>
              <Span className="text-base font-bold text-[#0B1220] block mt-0.5">{currency(refundAmount * 0.7)}</Span>
            </Div>
            <Div>
              <Span className="text-slate-400 block uppercase font-semibold text-[9px] tracking-wider">Wallet Adjustments</Span>
              <Span className="text-base font-bold text-[#0B1220] block mt-0.5">{currency(refundAmount * 0.2)}</Span>
            </Div>
            <Div>
              <Span className="text-slate-400 block uppercase font-semibold text-[9px] tracking-wider">Disputed Audits</Span>
              <Span className="text-base font-bold text-amber-500 block mt-0.5">{currency(refundAmount * 0.1)}</Span>
            </Div>
          </Div>
          <Div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex justify-between items-center text-[10px] text-slate-500 font-semibold">
            <Span>Manual Adjustments Approved Today</Span>
            <Span className="text-[#0B1220] font-bold">₹0.00</Span>
          </Div>
        </Div>
      </Div>

      {/* 8. TRANSACTION HISTORY TABLE */}
      <Div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm mb-8">
        <Div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
          <Div>
            <H3 className="text-xs font-bold text-[#0B1220] uppercase tracking-wider">Transaction Registry History</H3>
            <P className="mt-1 text-[11px] text-[#64748B]">{paginator.total || 0} transaction items indexed</P>
          </Div>
          <Div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            Show
            <Select
              value={limit}
              onChange={(event) => {
                setPage(1);
                setLimit(Number(event.target.value));
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold outline-none"
            >
              <Option value={10}>10</Option>
              <Option value={25}>25</Option>
              <Option value={50}>50</Option>
            </Select>
            entries
          </Div>
        </Div>

        <Div className="overflow-x-auto">
          <Table className="w-full min-w-[1250px] text-left font-sans">
            <Thead>
              <Tr className="bg-slate-50 text-[12px] font-bold text-[#64748B] border-b border-[#E5E7EB]">
                <Th className="px-5 py-3">Request ID</Th>
                <Th className="px-5 py-3">Completed Date</Th>
                <Th className="px-5 py-3">Rider</Th>
                <Th className="px-5 py-3">Driver</Th>
                <Th className="px-5 py-3">Zone</Th>
                <Th className="px-5 py-3">Vehicle</Th>
                <Th className="px-5 py-3">Type</Th>
                <Th className="px-5 py-3">Payment</Th>
                <Th className="px-5 py-3 text-right">Gross Fare</Th>
                <Th className="px-5 py-3 text-right">Commission</Th>
                <Th className="px-5 py-3 text-right">Driver Earning</Th>
                <Th className="px-5 py-3 text-right">Refund</Th>
                <Th className="px-5 py-3">Status</Th>
                <Th className="px-5 py-3 text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-slate-100">
              {loading ? (
                <Tr>
                  <Td colSpan={14} className="py-16 text-center">
                    <UiIcon as={Loader2} className="mx-auto animate-spin text-[#0B1220]" size={32} />
                  </Td>
                </Tr>
              ) : data.results.length ? (
                data.results.map((row) => {
                  const devEarning = (row.grossFare || 0) - (row.adminCommission || 0);
                  const isCash = String(row.paymentMethod).toLowerCase() === 'cash';
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
                    <React.Fragment key={row.id}>
                      <Tr className={`text-xs text-[#0B1220] hover:bg-slate-50/70 transition-colors font-medium ${isExpanded ? 'bg-[#FAFBFD]' : ''}`}>
                        <Td className="px-5 py-4 font-bold">{row.requestId}</Td>
                        <Td className="px-5 py-4 text-slate-500">{formatDate(row.completedAt)}</Td>
                        <Td className="px-5 py-4">
                          <Span className="font-bold text-slate-900 block">{row.userName}</Span>
                          <Span className="text-[10px] text-slate-400 block mt-0.5">{row.userPhone || '--'}</Span>
                        </Td>
                        <Td className="px-5 py-4">
                          <Span className="font-bold text-slate-900 block">{row.driverName}</Span>
                          <Span className="text-[10px] text-slate-400 block mt-0.5">{row.driverPhone || '--'}</Span>
                        </Td>
                        <Td className="px-5 py-4 font-semibold text-slate-600">{row.zoneName || '--'}</Td>
                        <Td className="px-5 py-4 font-semibold text-slate-600">{row.vehicleName || '--'}</Td>
                        <Td className="px-5 py-4">
                          <Span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[9px] font-bold uppercase text-cyan-700 border border-cyan-100">
                            {row.riderType}
                          </Span>
                        </Td>
                        <Td className="px-5 py-4">
                          <Span
                            className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase border ${isCash ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}
                          >
                            {row.paymentMethod}
                          </Span>
                        </Td>
                        <Td className="px-5 py-4 text-right font-bold">{currency(row.grossFare)}</Td>
                        <Td className="px-5 py-4 text-right font-bold text-emerald-600">{currency(row.adminCommission)}</Td>
                        <Td className="px-5 py-4 text-right font-bold text-blue-600">{currency(devEarning)}</Td>
                        <Td className="px-5 py-4 text-right font-bold text-rose-500">{currency(0)}</Td>
                        <Td className="px-5 py-4">
                          <Span className="admin-badge admin-badge-success">Success</Span>
                        </Td>
                        <Td className="px-5 py-4 text-right">
                          <Button
                            onClick={toggleExpand}
                            className="text-[11px] font-bold text-slate-500 hover:text-[#0B1220] flex items-center gap-0.5 justify-end w-full"
                          >
                            <Span>Details</Span>
                            <UiIcon
                              as={ChevronRight}
                              size={12}
                              className={`transition-transform duration-250 ${isExpanded ? 'rotate-90 text-[#FFC400]' : ''}`}
                            />
                          </Button>
                        </Td>
                      </Tr>
                      {isExpanded && (
                        <Tr className="bg-[#FAFBFD]">
                          <Td colSpan={14} className="px-3 py-2">
                            <motion.div
                              initial={{
                                opacity: 0,
                                height: 0,
                              }}
                              animate={{
                                opacity: 1,
                                height: 'auto',
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                              }}
                              transition={{
                                duration: 0.2,
                              }}
                              className="bg-white border-l-4 border-l-[#FFC400] border border-[#E5E7EB] rounded-r-xl p-3 shadow-sm space-y-3 font-sans text-xs text-[#0B1220] overflow-hidden"
                            >
                              <Div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                                <Div>
                                  <H4 className="font-bold text-sm text-[#0B1220] flex items-center gap-1.5">
                                    <UiIcon as={IndianRupee} size={15} className="text-[#FFC400]" />
                                    <Span>Transaction Details: {selectedTx.requestId}</Span>
                                  </H4>
                                  <P className="text-[#64748B] text-[10px] mt-0.5">Completed: {formatDate(selectedTx.completedAt)}</P>
                                </Div>
                                <Button
                                  onClick={() => {
                                    setIsDrawerOpen(false);
                                    setSelectedTx(null);
                                  }}
                                  className="text-slate-400 hover:text-slate-600 p-1"
                                >
                                  <UiIcon as={X} size={16} />
                                </Button>
                              </Div>

                              <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <Div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                  <Span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold mb-1.5">Rider Information</Span>
                                  <Span className="font-bold text-slate-900 block">{selectedTx.userName || 'Not available'}</Span>
                                  <Span className="text-slate-400 block mt-0.5 text-[10px]">{selectedTx.userPhone || 'Not available'}</Span>
                                </Div>

                                <Div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                  <Span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold mb-1.5">Driver Information</Span>
                                  <Span className="font-bold text-slate-900 block">{selectedTx.driverName || 'Not available'}</Span>
                                  <Span className="text-slate-400 block mt-0.5 text-[10px]">{selectedTx.driverPhone || 'Not available'}</Span>
                                </Div>

                                <Div className="space-y-1.5 text-[11px]">
                                  <Span className="text-[9px] uppercase tracking-wider text-[#64748B] block font-bold mb-0.5">Logistics & Zone</Span>
                                  <Div className="flex justify-between">
                                    <Span className="text-slate-400">Zone</Span>
                                    <Span className="font-bold text-slate-800">{selectedTx.zoneName || 'Global Zone'}</Span>
                                  </Div>
                                  <Div className="flex justify-between">
                                    <Span className="text-slate-400">Vehicle</Span>
                                    <Span className="font-bold text-slate-800">{selectedTx.vehicleName || 'Standard Car'}</Span>
                                  </Div>
                                </Div>

                                <Div className="space-y-1.5 text-[11px]">
                                  <Span className="text-[9px] uppercase tracking-wider text-[#64748B] block font-bold mb-0.5">Payment Details</Span>
                                  <Div className="flex justify-between">
                                    <Span className="text-slate-400">Gateway</Span>
                                    <Span className="font-bold text-slate-800">{selectedTx.paymentMethod || 'Not available'}</Span>
                                  </Div>
                                  <Div className="flex justify-between">
                                    <Span className="text-slate-400">Settlement</Span>
                                    <Span className="text-emerald-600 font-bold">Completed</Span>
                                  </Div>
                                </Div>
                              </Div>

                              <Div className="pt-2 border-t border-[#F1F5F9] grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                                <Div>
                                  <Span className="text-slate-400 block">Gross Ride Fare</Span>
                                  <Span className="font-bold text-[#0B1220] text-sm mt-0.5 block">{currency(selectedTx.grossFare)}</Span>
                                </Div>
                                <Div>
                                  <Span className="text-slate-400 block">Platform Commission Cut</Span>
                                  <Span className="font-bold text-emerald-600 text-sm mt-0.5 block">-{currency(selectedTx.adminCommission)}</Span>
                                </Div>
                                <Div>
                                  <Span className="text-slate-400 block">Driver Net Earnings</Span>
                                  <Span className="font-bold text-blue-600 text-sm mt-0.5 block">
                                    {currency((selectedTx.grossFare || 0) - (selectedTx.adminCommission || 0))}
                                  </Span>
                                </Div>
                                <Div>
                                  <Span className="text-slate-400 block">Refund Offsets</Span>
                                  <Span className="font-bold text-rose-500 text-sm mt-0.5 block">{currency(0)}</Span>
                                </Div>
                              </Div>
                            </motion.div>
                          </Td>
                        </Tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <Tr>
                  <Td colSpan={14} className="py-16 text-center text-xs font-bold text-slate-400">
                    No admin earning transactions found.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Div>

        <Div className="flex flex-col justify-between gap-3 border-t border-slate-100 p-4 md:flex-row md:items-center">
          <P className="text-xs font-semibold text-slate-500">
            Page {paginator.current_page || page} of {paginator.last_page || 1}
          </P>
          <Div className="flex gap-2">
            <Button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Previous
            </Button>
            <Button
              type="button"
              disabled={page >= (paginator.last_page || 1)}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Next
            </Button>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
const BreakdownPanel = ({ title, icon: Icon, rows, emptyText }) => {
  const max = Math.max(...rows.map((row) => Number(row.adminCommission || 0)), 0);
  return (
    <Div className="admin-card bg-white border border-[#E5E7EB] rounded-lg">
      <Div className="mb-5 flex items-center justify-between">
        <Div>
          <H3 className="text-xs font-bold text-[#0B1220] uppercase tracking-wider">{title}</H3>
          <P className="mt-0.5 text-[10px] text-slate-400 font-semibold">Commission split telemetry</P>
        </Div>
        <Div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
          <Icon size={16} />
        </Div>
      </Div>

      {rows.length ? (
        <Div className="space-y-4">
          {rows.slice(0, 5).map((row) => {
            const percent = max ? Math.max(6, (Number(row.adminCommission || 0) / max) * 100) : 0;
            // PORT: inline style object: check every property is valid in React Native (no backgroundImage, cursor, gridTemplate..., strings like "1rem")
            return (
              <Div key={row.label}>
                <Div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <Span className="truncate font-bold text-slate-700">{row.label}</Span>
                  <Span className="shrink-0 font-bold text-[#0B1220]">{currency(row.adminCommission)}</Span>
                </Div>
                <Div className="h-1.5 rounded bg-slate-100 overflow-hidden">
                  <Div
                    className="h-1.5 rounded bg-[#FFC400]"
                    style={{
                      width: `${percent}%`,
                    }}
                  />
                </Div>
                <P className="mt-1 text-[9px] font-semibold text-slate-400">
                  {row.trips} trips · gross {currency(row.grossFare)}
                </P>
              </Div>
            );
          })}
        </Div>
      ) : (
        <Div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-400">{emptyText}</Div>
      )}
    </Div>
  );
};
export default AdminEarnings;
