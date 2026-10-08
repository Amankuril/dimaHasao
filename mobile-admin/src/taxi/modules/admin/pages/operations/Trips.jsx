/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/operations/Trips.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Filter, MoreVertical, Search, Loader2, ChevronRight, Menu, X, Eye, UserPlus, MapPin, XCircle, FileText } from 'lucide-react-native';
import { motion } from '../../../../../lib/motion';
import { adminService } from '../../services/adminService';
import {
  Button,
  Div,
  H1,
  H2,
  H3,
  Input,
  Label,
  Option,
  HScroll,
  Overlay,
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
import { printHtml } from '../../../../../lib/files';
const STATUS_STYLES = {
  CANCELLED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
  UPCOMING: 'bg-yellow-100 text-yellow-700',
  ONGOING: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-blue-100 text-blue-700',
};
const PAYMENT_STYLES = {
  CASH: 'bg-gray-100 text-gray-800 border border-gray-200',
  CARD: 'bg-gray-100 text-gray-800 border border-gray-200',
  WALLET: 'bg-gray-100 text-gray-800 border border-gray-200',
};
const TAB_SET = ['All', 'Completed', 'Cancelled', 'Upcoming', 'On Trip'];
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
const normalizeTab = (tab) => {
  if (tab === 'On Trip') return 'ongoing';
  return tab.toLowerCase();
};
const normalizeRow = (row = {}) => ({
  id: String(row._id || row.id || row.requestId || Math.random()),
  requestId: row.requestId || row.request_id || row.ride_request_id || '--',
  date: row.date || row.createdAt || row.created_at || row.trip_date || row.updatedAt,
  userName: row.userName || row.user_name || row.customer_name || row.user?.name || '--',
  driverName: row.driverName || row.driver_name || row.driver?.name || '--',
  transportType: row.transportType || row.transport_type || row.service_type || row.module || '--',
  tripStatus: String(row.tripStatus || row.trip_status || row.status || '').toUpperCase(),
  paymentOption: String(row.paymentOption || row.payment_option || row.payment_method || 'CASH').toUpperCase(),
});
const TripDetailsModal = ({ trip, onClose }) => {
  if (!trip) return null;
  return (
    <Overlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4">
        <Div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <H2 className="text-lg font-bold text-gray-900">Trip Details</H2>
          <Button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <UiIcon as={X} size={20} />
          </Button>
        </Div>
        <ScrollDiv className="p-6 space-y-5">
          <Div className="grid grid-cols-2 gap-y-5 gap-x-4">
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Request ID</P>
              <P className="text-[13px] font-bold text-gray-900 font-mono">{trip.requestId}</P>
            </Div>
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Date</P>
              <P className="text-[13px] font-bold text-gray-900">{formatDate(trip.date)}</P>
            </Div>
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">User Name</P>
              <P className="text-[13px] font-bold text-gray-900">{trip.userName}</P>
            </Div>
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Driver Name</P>
              <P className="text-[13px] font-bold text-gray-900">{trip.driverName}</P>
            </Div>
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Transport Type</P>
              <P className="text-[13px] font-bold text-gray-900 capitalize">{String(trip.transportType).toLowerCase()}</P>
            </Div>
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Payment Option</P>
              <P className="text-[13px] font-bold text-gray-900 capitalize">{String(trip.paymentOption).toLowerCase()}</P>
            </Div>
            <Div className="col-span-2 pt-2 border-t border-gray-50">
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-2">Trip Status</P>
              <Span
                className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded capitalize tracking-wide ${STATUS_STYLES[trip.tripStatus] || 'bg-gray-100 text-gray-600'}`}
              >
                {String(trip.tripStatus).toLowerCase()}
              </Span>
            </Div>
          </Div>
        </ScrollDiv>
        <Div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-end">
          <Button onClick={onClose} className="px-6 py-2 bg-black text-white text-sm font-bold rounded-lg shadow-sm hover:bg-gray-900 transition-colors">
            Close
          </Button>
        </Div>
      </Div>
    </Overlay>
  );
};
const handlePrintInvoice = (trip) => {
  const formattedDate = formatDate(trip.date);
  printHtml(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - ${trip.requestId}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 30px; margin-bottom: 30px; }
          .title { font-size: 28px; font-weight: 800; margin: 0; color: #111827; letter-spacing: 1px; }
          .subtitle { color: #6b7280; font-size: 14px; margin-top: 8px; }
          .details { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .details th, .details td { padding: 16px 12px; border-bottom: 1px solid #f3f4f6; text-align: left; }
          .details th { width: 35%; color: #6b7280; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
          .details td { font-size: 15px; font-weight: 500; }
          .footer { text-align: center; color: #9ca3af; font-size: 13px; margin-top: 60px; padding-top: 20px; border-top: 1px dashed #e5e7eb; }
          .highlight { font-weight: bold; color: #000; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">TRIP INVOICE</h1>
          <p class="subtitle">Request ID: <span class="highlight">${trip.requestId}</span></p>
        </div>
        <table class="details">
          <tr><th>Date</th><td>${formattedDate}</td></tr>
          <tr><th>Customer</th><td>${trip.userName}</td></tr>
          <tr><th>Driver</th><td>${trip.driverName}</td></tr>
          <tr><th>Transport Type</th><td style="text-transform: capitalize;">${String(trip.transportType).toLowerCase()}</td></tr>
          <tr><th>Payment Method</th><td style="text-transform: capitalize;">${String(trip.paymentOption).toLowerCase()}</td></tr>
          <tr><th>Trip Status</th><td style="text-transform: capitalize;">${String(trip.tripStatus).toLowerCase()}</td></tr>
        </table>
        <div class="footer">
          Thank you for choosing our service.<br/>
          This is a computer generated invoice and requires no signature.
        </div>
      </body>
    </html>
  `);
};

// Use Portal for dropdowns or handle within table row? Handling relative to table row.
const ActionMenu = ({ row, onViewDetails, onPrintInvoice }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isCompleted = row.tripStatus === 'COMPLETED';
  const isCancelled = row.tripStatus === 'CANCELLED';
  const isOngoing = row.tripStatus === 'ONGOING' || row.tripStatus === 'ACCEPTED';
  const hasDriver = row.driverName !== '--';
  return (
    <Div className="relative">
      <Button onClick={() => setIsOpen(!isOpen)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
        <UiIcon as={MoreVertical} size={18} />
      </Button>

      {isOpen && (
        <Div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 overflow-hidden">
          <Button
            onClick={() => {
              setIsOpen(false);
              onViewDetails();
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2"
          >
            <UiIcon as={Eye} size={14} /> View Details
          </Button>
          <Button
            disabled={isCompleted || isCancelled || isOngoing || hasDriver}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
          >
            <UiIcon as={UserPlus} size={14} /> Assign Driver
          </Button>
          <Button
            disabled={!isOngoing}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
          >
            <UiIcon as={MapPin} size={14} /> Track Trip
          </Button>
          <Button
            disabled={isCompleted || isCancelled}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white"
          >
            <UiIcon as={XCircle} size={14} /> Cancel Trip
          </Button>
          <Button
            onClick={() => {
              setIsOpen(false);
              onPrintInvoice();
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2 border-t border-gray-50 mt-1 pt-2"
          >
            <UiIcon as={FileText} size={14} /> Print Invoice
          </Button>
        </Div>
      )}
    </Div>
  );
};
const Trips = () => {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    transportType: '',
    paymentOption: '',
    driverAssigned: '',
    dateFrom: '',
    dateTo: '',
  });
  const [draftFilters, setDraftFilters] = useState({
    transportType: '',
    paymentOption: '',
    driverAssigned: '',
    dateFrom: '',
    dateTo: '',
  });
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput);
    }, 350);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);
  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminService.getRideRequests({
        page,
        limit,
        tab: normalizeTab(activeTab),
        search,
      });
      const payload = response?.data?.data || response?.data || response || {};
      const results = Array.isArray(payload?.results) ? payload.results : [];
      const paginator = payload?.paginator || {
        current_page: page,
        last_page: 1,
        total: results.length,
      };
      setRows(results.map(normalizeRow));
      setPagination({
        current_page: Number(paginator.current_page || page || 1),
        last_page: Math.max(1, Number(paginator.last_page || 1)),
        total: Math.max(0, Number(paginator.total || results.length || 0)),
      });
    } catch (err) {
      setRows([]);
      setPagination({
        current_page: 1,
        last_page: 1,
        total: 0,
      });
      setError(err?.message || 'Failed to load trip requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab, limit, page, search]);
  useEffect(() => {
    setPage(1);
  }, [activeTab, limit, search]);
  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Frontend Filtering
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (activeFilters.transportType && row.transportType.toLowerCase() !== activeFilters.transportType.toLowerCase()) return false;
      if (activeFilters.paymentOption && row.paymentOption.toLowerCase() !== activeFilters.paymentOption.toLowerCase()) return false;
      if (activeFilters.driverAssigned === 'assigned' && row.driverName === '--') return false;
      if (activeFilters.driverAssigned === 'unassigned' && row.driverName !== '--') return false;
      if (activeFilters.dateFrom || activeFilters.dateTo) {
        const rowDate = new Date(row.date);
        if (!isNaN(rowDate.getTime())) {
          if (activeFilters.dateFrom) {
            const fromDate = new Date(activeFilters.dateFrom);
            if (rowDate < fromDate) return false;
          }
          if (activeFilters.dateTo) {
            const toDate = new Date(activeFilters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (rowDate > toDate) return false;
          }
        }
      }
      return true;
    });
  }, [rows, activeFilters]);
  const applyFilters = () => {
    setActiveFilters(draftFilters);
    setShowFilters(false);
  };
  const resetFilters = () => {
    const emptyFilters = {
      transportType: '',
      paymentOption: '',
      driverAssigned: '',
      dateFrom: '',
      dateTo: '',
    };
    setDraftFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setShowFilters(false);
  };
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Div className="px-4 py-2 md:px-6 md:pt-2 md:pb-6 space-y-4 max-w-full">
        {/* Header */}
        <Div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100">
          <H1 className="text-xl font-bold tracking-tight text-gray-900">Trip Requests</H1>
          <Div className="hidden md:flex items-center gap-2 text-xs font-medium text-gray-400">
            <Span>Operations</Span>
            <UiIcon as={ChevronRight} size={14} className="text-gray-300" />
            <UiIcon as={ChevronRight} size={12} className="text-gray-300" />
            <Span className="text-gray-600">Trip Requests</Span>
          </Div>
        </Div>

        {/* Main Content Box */}
        <Div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col relative">
          {/* Controls Bar */}
          <Div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-3 lg:flex-row lg:items-center">
            <Div className="flex items-center gap-2 text-sm font-medium text-gray-500 shrink-0">
              <Span>Show</Span>
              <Select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="h-9 w-16 border border-gray-200 rounded-lg bg-gray-50 px-2 outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 text-gray-700"
              >
                <Option value={10}>10</Option>
                <Option value={25}>25</Option>
                <Option value={50}>50</Option>
              </Select>
            </Div>

            {/* Tabs */}
            <HScroll className="flex flex-1 items-center gap-1 no-scrollbar border-b border-gray-100 lg:border-b-0 pb-1 lg:pb-0 lg:justify-center">
              {TAB_SET.map((tab) => (
                <Button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap rounded-t-lg lg:rounded-lg ${activeTab === tab ? 'text-gray-900 bg-yellow-50 lg:bg-transparent' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="trip-tab" className="absolute -bottom-1 lg:-bottom-2 left-0 right-0 h-0.5 bg-yellow-400 rounded-t-full" />
                  )}
                </Button>
              ))}
            </HScroll>

            <Div className="flex items-center gap-3 shrink-0">
              <Div className="relative">
                <UiIcon as={Search} size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search requests..."
                  className="h-8 w-full sm:w-48 rounded-md border border-gray-200 bg-gray-50 pl-8 pr-3 text-[11px] outline-none focus:bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
                />
              </Div>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex h-8 items-center gap-1.5 px-3 rounded-md text-[11px] font-bold transition-colors border relative ${activeFilterCount > 0 ? 'bg-yellow-400 text-black border-yellow-400 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                <UiIcon as={Filter} size={13} /> Filters
                {activeFilterCount > 0 && (
                  <Span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </Span>
                )}
              </Button>
            </Div>
          </Div>

          {/* Filter Dropdown/Panel */}
          {showFilters && (
            <Div className="absolute right-0 top-[76px] lg:top-[68px] z-40 bg-white border border-gray-200 shadow-xl rounded-xl p-4 w-[280px] m-4 sm:m-0 sm:mr-5 animate-in slide-in-from-top-2">
              <Div className="flex items-center justify-between mb-3">
                <H3 className="font-bold text-gray-900 text-xs">Advanced Filters</H3>
                <Button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-900 bg-gray-50 p-1 rounded-md">
                  <UiIcon as={X} size={14} />
                </Button>
              </Div>

              <Div className="space-y-3">
                <Div>
                  <Label className="block text-[10px] font-bold text-gray-500 mb-1">Transport Type</Label>
                  <Select
                    value={draftFilters.transportType}
                    onChange={(e) =>
                      setDraftFilters({
                        ...draftFilters,
                        transportType: e.target.value,
                      })
                    }
                    className="w-full h-8 border border-gray-200 rounded-md bg-gray-50 px-2 text-xs outline-none focus:border-yellow-400"
                  >
                    <Option value="">All Types</Option>
                    <Option value="taxi">Taxi</Option>
                    <Option value="auto">Auto</Option>
                    <Option value="bike">Bike</Option>
                    <Option value="bus">Bus</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-[10px] font-bold text-gray-500 mb-1">Payment Option</Label>
                  <Select
                    value={draftFilters.paymentOption}
                    onChange={(e) =>
                      setDraftFilters({
                        ...draftFilters,
                        paymentOption: e.target.value,
                      })
                    }
                    className="w-full h-8 border border-gray-200 rounded-md bg-gray-50 px-2 text-xs outline-none focus:border-yellow-400"
                  >
                    <Option value="">All Methods</Option>
                    <Option value="cash">Cash</Option>
                    <Option value="online">Online</Option>
                    <Option value="wallet">Wallet</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-[10px] font-bold text-gray-500 mb-1">Driver Assignment</Label>
                  <Div className="flex bg-gray-50 p-1 rounded-md border border-gray-200">
                    <Button
                      onClick={() =>
                        setDraftFilters({
                          ...draftFilters,
                          driverAssigned: '',
                        })
                      }
                      className={`flex-1 py-1 text-[11px] font-bold rounded ${draftFilters.driverAssigned === '' ? 'bg-white shadow-sm text-gray-900 border border-gray-100' : 'text-gray-500'}`}
                    >
                      All
                    </Button>
                    <Button
                      onClick={() =>
                        setDraftFilters({
                          ...draftFilters,
                          driverAssigned: 'assigned',
                        })
                      }
                      className={`flex-1 py-1 text-[11px] font-bold rounded ${draftFilters.driverAssigned === 'assigned' ? 'bg-white shadow-sm text-gray-900 border border-gray-100' : 'text-gray-500'}`}
                    >
                      Assigned
                    </Button>
                    <Button
                      onClick={() =>
                        setDraftFilters({
                          ...draftFilters,
                          driverAssigned: 'unassigned',
                        })
                      }
                      className={`flex-1 py-1 text-[11px] font-bold rounded ${draftFilters.driverAssigned === 'unassigned' ? 'bg-white shadow-sm text-gray-900 border border-gray-100' : 'text-gray-500'}`}
                    >
                      Unassigned
                    </Button>
                  </Div>
                </Div>

                <Div className="grid grid-cols-2 gap-2">
                  <Div>
                    <Label className="block text-[10px] font-bold text-gray-500 mb-1">Date From</Label>
                    <Input
                      type="date"
                      value={draftFilters.dateFrom}
                      onChange={(e) =>
                        setDraftFilters({
                          ...draftFilters,
                          dateFrom: e.target.value,
                        })
                      }
                      className="w-full h-8 border border-gray-200 rounded-md bg-gray-50 px-2 text-xs outline-none focus:border-yellow-400"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-[10px] font-bold text-gray-500 mb-1">Date To</Label>
                    <Input
                      type="date"
                      value={draftFilters.dateTo}
                      onChange={(e) =>
                        setDraftFilters({
                          ...draftFilters,
                          dateTo: e.target.value,
                        })
                      }
                      className="w-full h-8 border border-gray-200 rounded-md bg-gray-50 px-2 text-xs outline-none focus:border-yellow-400"
                    />
                  </Div>
                </Div>
              </Div>

              <Div className="mt-4 flex items-center gap-2">
                <Button
                  onClick={resetFilters}
                  className="flex-1 py-1 bg-gray-100 text-gray-700 rounded text-[11px] font-bold hover:bg-gray-200 transition-colors"
                >
                  Reset
                </Button>
                <Button
                  onClick={applyFilters}
                  className="flex-1 py-1 bg-black text-white rounded text-[11px] font-bold hover:bg-gray-900 transition-colors shadow-sm"
                >
                  Apply Filters
                </Button>
              </Div>
            </Div>
          )}

          {/* Table Container */}
          <Div className="min-h-[400px]">
            <Table cols={[120, 150, 170, 170, 140, 130, 140, 60]} className="w-full text-left border-collapse whitespace-nowrap">
              <Thead>
                <Tr className="bg-gray-50/80 border-b border-gray-100">
                  {['Request ID', 'Date', 'User Name', 'Driver Name', 'Transport Type', 'Trip Status', 'Payment Option', 'Action'].map((heading, i) => (
                    <Th key={heading} className={`px-4 py-2.5 text-[11px] font-bold text-gray-600 tracking-wide ${i === 7 ? 'text-right pr-5' : ''}`}>
                      {heading}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody className="divide-y divide-gray-100">
                {loading ? (
                  <Tr>
                    <Td colSpan={8} className="py-24 text-center">
                      <UiIcon as={Loader2} className="animate-spin text-gray-300 mx-auto" size={32} />
                      <P className="mt-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">Loading Requests...</P>
                    </Td>
                  </Tr>
                ) : error ? (
                  <Tr>
                    <Td colSpan={8} className="py-20 text-center">
                      <Div className="inline-flex items-center justify-center p-3 bg-red-50 text-red-500 rounded-full mb-3">
                        <UiIcon as={XCircle} size={24} />
                      </Div>
                      <P className="text-sm font-bold text-red-600">{error}</P>
                    </Td>
                  </Tr>
                ) : filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <Tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                      <Td className="px-4 py-2 text-[13px] font-bold text-gray-900 font-mono">{row.requestId}</Td>
                      <Td className="px-4 py-2 text-[13px] font-medium text-gray-500">{formatDate(row.date)}</Td>
                      <Td className="px-4 py-2 text-[13px] font-bold text-gray-700">{row.userName}</Td>
                      <Td className="px-4 py-2 text-[13px] font-semibold text-gray-500">
                        {row.driverName !== '--' ? row.driverName : <Span className="text-gray-300 italic">Unassigned</Span>}
                      </Td>
                      <Td className="px-4 py-2 text-[13px] font-bold text-gray-700 capitalize">{row.transportType.toLowerCase()}</Td>
                      <Td className="px-4 py-2">
                        <Span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded capitalize tracking-wide ${STATUS_STYLES[row.tripStatus] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {row.tripStatus ? row.tripStatus.toLowerCase() : 'Unknown'}
                        </Span>
                      </Td>
                      <Td className="px-4 py-2">
                        <Span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded capitalize tracking-wide ${PAYMENT_STYLES[row.paymentOption] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                        >
                          {row.paymentOption ? row.paymentOption.toLowerCase() : 'Cash'}
                        </Span>
                      </Td>
                      <Td className="px-4 py-2 text-right">
                        <ActionMenu row={row} onViewDetails={() => setSelectedTrip(row)} onPrintInvoice={() => handlePrintInvoice(row)} />
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={8} className="py-24 text-center">
                      <Div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-3">
                        <UiIcon as={Filter} size={24} />
                      </Div>
                      <P className="text-sm font-bold text-gray-900">No requests found</P>
                      <P className="text-xs text-gray-400 font-medium mt-1">Try adjusting your active filters or search term.</P>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Div>

          {/* Pagination */}
          <Div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-[13px] text-gray-500 lg:flex-row lg:items-center lg:justify-between bg-gray-50/30">
            <P className="text-center lg:text-left font-medium">
              Showing page <Span className="font-bold text-gray-900">{pagination.current_page}</Span> of{' '}
              <Span className="font-bold text-gray-900">{pagination.last_page}</Span> for <Span className="font-bold text-gray-900">{pagination.total}</Span>{' '}
              entries
            </P>

            <Div className="flex justify-center items-center gap-2">
              <Button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || pagination.current_page <= 1}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:hover:bg-white shadow-sm transition-all"
              >
                Previous
              </Button>
              <Div className="min-w-[3rem] text-center font-bold text-gray-900 bg-gray-100 py-1.5 px-3 rounded-lg">{pagination.current_page}</Div>
              <Button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
                disabled={loading || pagination.current_page >= pagination.last_page}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:hover:bg-white shadow-sm transition-all"
              >
                Next
              </Button>
            </Div>
          </Div>
        </Div>
      </Div>

      <TripDetailsModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
    </ScrollDiv>
  );
};
export default Trips;
