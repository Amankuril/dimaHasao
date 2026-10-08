/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/operations/Ongoing.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import {
  Filter,
  MoreVertical,
  Search,
  Loader2,
  ChevronRight,
  CheckCircle,
  MapPin,
  XCircle,
  Eye,
  UserPlus,
  FileText,
  User,
  Truck,
  CreditCard,
  X,
} from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
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
import { window } from '../../../../../lib/webShim';
const STATUS_STYLES = {
  ACCEPTED: 'bg-green-100 text-green-700 border border-green-200',
  UPCOMING: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  ONGOING: 'bg-blue-100 text-blue-700 border border-blue-200',
  ON_TRIP: 'bg-blue-100 text-blue-700 border border-blue-200',
  COMPLETED: 'bg-green-100 text-green-700 border border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border border-red-200',
};
const PAYMENT_STYLES = {
  CASH: 'bg-gray-100 text-gray-700 border border-gray-200',
  ONLINE: 'bg-blue-50 text-blue-600 border border-blue-100',
  UPI: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  CARD: 'bg-purple-50 text-purple-600 border border-purple-100',
  WALLET: 'bg-teal-50 text-teal-600 border border-teal-100',
};
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const optionsDate = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };
  const optionsTime = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  const dPart = d.toLocaleDateString('en-GB', optionsDate);
  const tPart = d.toLocaleTimeString('en-US', optionsTime);
  return `${dPart} • ${tPart}`;
};
const RequestDetailsModal = ({ request, onClose }) => {
  if (!request) return null;
  return (
    <Overlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Div className="bg-white w-full max-w-md shadow-2xl flex flex-col rounded-xl overflow-hidden max-h-[90vh] animate-in slide-in-from-bottom-4">
        <Div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <H2 className="text-xl font-bold text-gray-900 tracking-tight">Request Details</H2>
          <Button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
            <UiIcon as={X} size={20} />
          </Button>
        </Div>
        <ScrollDiv className="flex-1 p-6 space-y-8">
          <Div className="flex items-center justify-between">
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Request ID</P>
              <P className="text-[14px] font-bold text-gray-900 font-mono">{request.requestId || 'N/A'}</P>
            </Div>
            <Span
              className={`inline-flex items-center px-3 py-1 text-[11px] font-bold rounded-full capitalize tracking-wide ${STATUS_STYLES[request.tripStatus] || 'bg-gray-100 text-gray-600'}`}
            >
              {String(request.tripStatus || '').toLowerCase()}
            </Span>
          </Div>

          <Div className="grid grid-cols-2 gap-y-6 gap-x-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Date & Time</P>
              <P className="text-[13px] font-bold text-gray-900">{formatDate(request.date)}</P>
            </Div>
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Transport</P>
              <P className="text-[13px] font-bold text-gray-900 capitalize flex items-center gap-1">
                <UiIcon as={Truck} size={14} className="text-gray-400" />
                {String(request.transportType || '').toLowerCase()}
              </P>
            </Div>
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Customer</P>
              <P className="text-[13px] font-bold text-gray-900 flex items-center gap-1">
                <UiIcon as={User} size={14} className="text-gray-400" />
                {request.userName || 'N/A'}
              </P>
            </Div>
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Driver</P>
              <P className="text-[13px] font-bold text-gray-900 flex items-center gap-1">
                <UiIcon as={User} size={14} className="text-gray-400" />
                {request.driverName || 'N/A'}
              </P>
            </Div>
            <Div>
              <P className="text-[11px] uppercase tracking-wider font-bold text-gray-400 mb-1">Payment Option</P>
              <Span
                className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded capitalize tracking-wide ${PAYMENT_STYLES[request.paymentOption] || 'bg-gray-100 text-gray-600'}`}
              >
                {String(request.paymentOption || '').toLowerCase()}
              </Span>
            </Div>
          </Div>
        </ScrollDiv>
        <Div className="border-t border-gray-100 p-5 bg-white flex justify-end gap-3">
          <Button onClick={onClose} className="px-5 py-2 text-sm font-bold text-white bg-black rounded-lg shadow-sm hover:bg-gray-900 transition-colors">
            Close
          </Button>
        </Div>
      </Div>
    </Overlay>
  );
};
const ActionMenu = ({ row, onViewDetails, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleNotImplemented = (action) => {
    toast.error(`Backend API for '${action}' is not implemented yet.`);
    setIsOpen(false);
  };
  const isCompleted = row.tripStatus === 'COMPLETED';
  const isCancelled = row.tripStatus === 'CANCELLED';
  const isOngoing = row.tripStatus === 'ON_TRIP' || row.tripStatus === 'ONGOING';
  const hasDriver = row.driverName && row.driverName !== '--' && row.driverName !== 'N/A';
  return (
    <Div className="relative">
      <Button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
      >
        <UiIcon as={MoreVertical} size={18} />
      </Button>

      {isOpen && (
        <Div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
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
            onClick={() => handleNotImplemented('Assign Driver')}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
          >
            <UiIcon as={UserPlus} size={14} /> Assign Driver
          </Button>
          <Button
            onClick={() => handleNotImplemented('Change Status')}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2"
          >
            <UiIcon as={CheckCircle} size={14} /> Change Status
          </Button>
          <Button
            disabled={!isOngoing}
            onClick={() => handleNotImplemented('Track Request')}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700"
          >
            <UiIcon as={MapPin} size={14} /> Track Request
          </Button>
          <Div className="h-px bg-gray-100 my-1"></Div>
          <Button
            disabled={isCompleted || isCancelled}
            onClick={() => handleNotImplemented('Cancel Request')}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white"
          >
            <UiIcon as={XCircle} size={14} /> Cancel Request
          </Button>
          <Button
            onClick={() => {
              setIsOpen(false);
              onDelete(row);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <UiIcon as={XCircle} size={14} /> Delete Request
          </Button>
        </Div>
      )}
    </Div>
  );
};
const Ongoing = () => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftFilters, setDraftFilters] = useState({
    status: '',
    transportType: '',
    paymentType: '',
    driverAssigned: '',
    dateFrom: '',
    dateTo: '',
  });
  const [activeFilters, setActiveFilters] = useState({
    status: '',
    transportType: '',
    paymentType: '',
    driverAssigned: '',
    dateFrom: '',
    dateTo: '',
  });
  const loadRows = React.useCallback(async () => {
    let active = true;
    setLoading(true);
    setError('');
    try {
      const response = await adminService.getOngoingRides({
        limit,
        tab: activeTab.toLowerCase(),
        search,
        ...activeFilters,
      });
      const data = response?.data?.data || response?.data || response;
      if (!active) return;
      setRows(data?.results || []);
    } catch (err) {
      if (active) {
        setError(err?.message || 'Failed to load ongoing rides');
        setRows([]);
      }
    } finally {
      if (active) setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [activeTab, limit, search, activeFilters]);
  useEffect(() => {
    const cleanup = loadRows();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [loadRows]);
  const handleDelete = async (request) => {
    const confirmed = await window.confirmAsync(`Delete request ${request.requestId}? This will remove it for both rider and driver.`);
    if (!confirmed) return;
    try {
      await adminService.deleteOngoingRide(request.id);
      toast.success('Request deleted successfully');
      setRows((prev) => prev.filter((row) => row.id !== request.id));
    } catch (err) {
      toast.error(err?.message || 'Failed to delete request');
    }
  };
  const applyFilters = () => {
    setActiveFilters(draftFilters);
    setShowFilters(false);
  };
  const resetFilters = () => {
    const emptyFilters = {
      status: '',
      transportType: '',
      paymentType: '',
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
      <Div className="px-4 py-2 md:px-6 md:pt-2 md:pb-6 space-y-3 max-w-full">
        {/* Header */}
        <Div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
          <Div>
            <H1 className="text-lg font-bold tracking-tight text-gray-900">Ongoing Requests</H1>
            <P className="text-xs text-gray-500 mt-0.5 font-medium">Manage and track active rides and deliveries.</P>
          </Div>
          <Div className="hidden md:flex items-center gap-2 text-xs font-medium text-gray-400">
            <Span>Operations</Span>
            <UiIcon as={ChevronRight} size={14} className="text-gray-300" />
            <Span className="text-gray-600">Ongoing Requests</Span>
          </Div>
        </Div>

        {/* Main Content Box */}
        <Div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col relative">
          {/* Controls Bar */}
          <Div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-2.5 lg:flex-row lg:items-center">
            <Div className="flex items-center gap-2 text-xs font-medium text-gray-500 shrink-0">
              <Span>Show</Span>
              <Select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="h-8 w-14 border border-gray-200 rounded-md bg-gray-50 px-1.5 outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 text-gray-700 font-bold text-[11px]"
              >
                <Option value={10}>10</Option>
                <Option value={25}>25</Option>
                <Option value={50}>50</Option>
              </Select>
              <Span>Entries</Span>
            </Div>

            {/* Tabs */}
            <HScroll className="flex flex-1 items-center gap-1 no-scrollbar border-b border-gray-100 lg:border-b-0 pb-1 lg:pb-0 lg:justify-center">
              {['All', 'Accepted', 'Upcoming', 'Ongoing'].map((tab) => (
                <Button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap rounded-t-md lg:rounded-md ${activeTab === tab ? 'text-gray-900 bg-yellow-50 lg:bg-transparent' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  {tab}
                  {activeTab === tab && <Div className="absolute -bottom-1 lg:-bottom-2 left-0 right-0 h-0.5 bg-yellow-400 rounded-t-full hidden lg:block" />}
                </Button>
              ))}
            </HScroll>

            <Div className="flex items-center gap-2 shrink-0">
              <Div className="relative w-full sm:w-40">
                <UiIcon as={Search} size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requests..."
                  className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 pl-7 pr-2 text-[10px] outline-none focus:bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all font-medium"
                />
              </Div>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex h-7 items-center gap-1 px-2.5 rounded-md text-[10px] font-bold transition-colors border relative ${activeFilterCount > 0 ? 'bg-yellow-400 text-black border-yellow-400 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                <UiIcon as={Filter} size={12} /> Filters
                {activeFilterCount > 0 && (
                  <Span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-black text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </Span>
                )}
              </Button>
            </Div>
          </Div>

          {/* Filter Dropdown */}
          {showFilters && (
            <Div className="absolute right-0 top-[110px] lg:top-[60px] z-40 bg-white border border-gray-200 shadow-xl rounded-xl p-4 w-[400px] max-w-[calc(100vw-2rem)] mr-4 lg:mr-6 animate-in slide-in-from-top-2">
              <Div className="flex items-center justify-between mb-4">
                <H3 className="text-sm font-bold text-gray-900 border-l-2 border-yellow-400 pl-2">Advanced Filters</H3>
                <Button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-800">
                  <UiIcon as={X} size={16} />
                </Button>
              </Div>

              <Div className="grid grid-cols-2 gap-3">
                <Div>
                  <Label className="block text-[10px] font-bold text-gray-500 mb-1">Status</Label>
                  <Select
                    value={draftFilters.status}
                    onChange={(e) =>
                      setDraftFilters({
                        ...draftFilters,
                        status: e.target.value,
                      })
                    }
                    className="w-full h-8 border border-gray-200 rounded-md bg-gray-50 px-2 text-xs outline-none focus:border-yellow-400 font-medium"
                  >
                    <Option value="">All Statuses</Option>
                    <Option value="accepted">Accepted</Option>
                    <Option value="upcoming">Upcoming</Option>
                    <Option value="ongoing">Ongoing</Option>
                  </Select>
                </Div>

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
                    className="w-full h-8 border border-gray-200 rounded-md bg-gray-50 px-2 text-xs outline-none focus:border-yellow-400 font-medium"
                  >
                    <Option value="">All Types</Option>
                    <Option value="taxi">Taxi</Option>
                    <Option value="bike">Bike</Option>
                    <Option value="auto">Auto</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-[10px] font-bold text-gray-500 mb-1">Payment Type</Label>
                  <Select
                    value={draftFilters.paymentType}
                    onChange={(e) =>
                      setDraftFilters({
                        ...draftFilters,
                        paymentType: e.target.value,
                      })
                    }
                    className="w-full h-8 border border-gray-200 rounded-md bg-gray-50 px-2 text-xs outline-none focus:border-yellow-400 font-medium"
                  >
                    <Option value="">All Methods</Option>
                    <Option value="cash">Cash</Option>
                    <Option value="online">Online</Option>
                    <Option value="wallet">Wallet</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-[10px] font-bold text-gray-500 mb-1">Driver Assignment</Label>
                  <Div className="flex bg-gray-50 p-1 rounded-md border border-gray-200 h-8 items-center">
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
                    className="w-full h-8 border border-gray-200 rounded-md bg-gray-50 px-2 text-[10px] outline-none focus:border-yellow-400 font-medium"
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
                    className="w-full h-8 border border-gray-200 rounded-md bg-gray-50 px-2 text-[10px] outline-none focus:border-yellow-400 font-medium"
                  />
                </Div>
              </Div>

              <Div className="mt-3 flex items-center gap-2">
                <Button
                  onClick={resetFilters}
                  className="flex-1 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-bold hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </Button>
                <Button
                  onClick={applyFilters}
                  className="flex-1 py-1 bg-black text-white rounded text-[10px] font-bold hover:bg-gray-900 transition-colors shadow-sm"
                >
                  Apply Filters
                </Button>
              </Div>
            </Div>
          )}

          {/* Table Container */}
          <Div className="min-h-[400px]">
            <Table cols={[120, 150, 170, 170, 140, 130, 140, 60]} className="w-full text-left border-collapse whitespace-nowrap">
              <Thead className="bg-white">
                <Tr className="bg-gray-50/80 border-b border-gray-100">
                  {['Request ID', 'Date', 'User Name', 'Driver Name', 'Transport Type', 'Trip Status', 'Payment Option', 'Action'].map((heading, i) => (
                    <Th key={heading} className={`px-4 py-2.5 text-[11px] font-bold text-gray-600 tracking-wide ${i === 7 ? 'text-right pr-6' : ''}`}>
                      {heading}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <Tr>
                    <Td colSpan={8} className="py-24 text-center">
                      <UiIcon as={Loader2} className="animate-spin text-yellow-400 mx-auto" size={32} />
                      <P className="mt-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Requests...</P>
                    </Td>
                  </Tr>
                ) : error ? (
                  <Tr>
                    <Td colSpan={8} className="py-24 text-center">
                      <Div className="bg-red-50 text-red-500 p-4 rounded-lg inline-block border border-red-100">
                        <UiIcon as={XCircle} size={24} className="mx-auto mb-2" />
                        <P className="text-sm font-bold">{error}</P>
                        <Button onClick={loadRows} className="mt-3 px-4 py-1.5 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200">
                          Retry
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ) : rows.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} className="py-24 text-center">
                      <Div className="mx-auto flex flex-col items-center justify-center opacity-50">
                        <UiIcon as={Truck} size={48} className="text-gray-300 mb-3" />
                        <P className="text-sm font-bold text-gray-500">No Ongoing Requests Found</P>
                        <P className="text-xs text-gray-400 font-medium mt-1">Try adjusting your filters or search term.</P>
                      </Div>
                    </Td>
                  </Tr>
                ) : (
                  rows.map((row, rowIndex) => (
                    <Tr
                      key={row.id || row.requestId || rowIndex}
                      className="hover:bg-yellow-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedRequest(row)}
                    >
                      <Td className="px-4 py-2 text-[13px] font-bold text-gray-900 font-mono">{row.requestId || '-'}</Td>
                      <Td className="px-4 py-2 text-[12px] font-medium text-gray-600">{formatDate(row.date)}</Td>
                      <Td className="px-4 py-2 text-[13px] font-bold text-gray-800">{row.userName || '-'}</Td>
                      <Td className="px-4 py-2 text-[13px] font-medium text-gray-700">{row.driverName || '--'}</Td>
                      <Td className="px-4 py-2 text-[13px] font-bold text-gray-700 capitalize">{String(row.transportType || '').toLowerCase()}</Td>
                      <Td className="px-4 py-2">
                        <Span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded capitalize tracking-wide ${STATUS_STYLES[row.tripStatus] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                        >
                          {row.tripStatus ? String(row.tripStatus).replace('_', ' ').toLowerCase() : 'Unknown'}
                        </Span>
                      </Td>
                      <Td className="px-4 py-2">
                        <Span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded capitalize tracking-wide ${PAYMENT_STYLES[row.paymentOption] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                        >
                          {row.paymentOption ? String(row.paymentOption).toLowerCase() : 'Cash'}
                        </Span>
                      </Td>
                      <Td className="px-4 py-2 text-right">
                        <ActionMenu row={row} onViewDetails={() => setSelectedRequest(row)} onDelete={handleDelete} />
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Div>
        </Div>
      </Div>

      <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
    </ScrollDiv>
  );
};
export default Ongoing;
