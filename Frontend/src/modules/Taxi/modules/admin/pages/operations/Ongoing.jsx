import React, { useState, useEffect, useRef } from 'react';
import { Filter, MoreVertical, Search, Loader2, ChevronRight, CheckCircle, MapPin, XCircle, Eye, UserPlus, FileText, User, Truck, CreditCard, X } from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  ACCEPTED: 'bg-green-100 text-green-700 border border-green-200',
  UPCOMING: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  ONGOING: 'bg-neutral-100 text-[#0a4d2b] border border-neutral-200',
  ON_TRIP: 'bg-neutral-100 text-[#0a4d2b] border border-neutral-200',
  COMPLETED: 'bg-green-100 text-green-700 border border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border border-red-200',
};

const PAYMENT_STYLES = {
  CASH: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
  ONLINE: 'bg-neutral-50 text-[#0a4d2b] border border-neutral-200',
  UPI: 'bg-neutral-50 text-[#0a4d2b] border border-neutral-200',
  CARD: 'bg-neutral-50 text-[#0a4d2b] border border-neutral-200',
  WALLET: 'bg-teal-50 text-teal-600 border border-teal-100',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const optionsDate = { day: '2-digit', month: 'short', year: 'numeric' };
  const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: true };
  const dPart = d.toLocaleDateString('en-GB', optionsDate);
  const tPart = d.toLocaleTimeString('en-US', optionsTime);
  return `${dPart} • ${tPart}`;
};

const RequestDetailsModal = ({ request, onClose }) => {
  if (!request) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md shadow-2xl flex flex-col rounded-xl overflow-hidden max-h-[90vh] animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
          <h2 className="text-xl font-medium text-neutral-900">Request details</h2>
          <button onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Request ID</p>
              <p className="text-[14px] font-medium text-neutral-900 font-mono">{request.requestId || 'N/A'}</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full capitalize  ${STATUS_STYLES[request.tripStatus] || 'bg-neutral-100 text-neutral-600'}`}>
              {String(request.tripStatus || '').toLowerCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-6 gap-x-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Date & time</p>
              <p className="text-[13px] font-medium text-neutral-900">{formatDate(request.date)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Transport</p>
              <p className="text-[13px] font-medium text-neutral-900 capitalize flex items-center gap-1">
                <Truck size={14} className="text-neutral-500"/>
                {String(request.transportType || '').toLowerCase()}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Customer</p>
              <p className="text-[13px] font-medium text-neutral-900 flex items-center gap-1">
                <User size={14} className="text-neutral-500"/>
                {request.userName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Driver</p>
              <p className="text-[13px] font-medium text-neutral-900 flex items-center gap-1">
                <User size={14} className="text-neutral-500"/>
                {request.driverName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Payment option</p>
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded capitalize  ${PAYMENT_STYLES[request.paymentOption] || 'bg-neutral-100 text-neutral-600'}`}>
                {String(request.paymentOption || '').toLowerCase()}
              </span>
            </div>
          </div>
          
        </div>
        <div className="border-t border-neutral-100 p-5 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg shadow-sm hover:bg-neutral-900 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ActionMenu = ({ row, onViewDetails, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotImplemented = (action) => {
    toast.error(`Backend API for '${action}' is not implemented yet.`);
    setIsOpen(false);
  };

  const isCompleted = row.tripStatus === 'COMPLETED';
  const isCancelled = row.tripStatus === 'CANCELLED';
  const isOngoing = row.tripStatus === 'ON_TRIP' || row.tripStatus === 'ONGOING';
  const hasDriver = row.driverName && row.driverName !== '--' && row.driverName !== 'N/A';

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-neutral-900/[0.08] py-1.5 z-50">
          <button 
            onClick={() => { setIsOpen(false); onViewDetails(); }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2"
          >
            <Eye size={14} /> View details
          </button>
          <button 
            disabled={isCompleted || isCancelled || isOngoing || hasDriver}
            onClick={() => handleNotImplemented('Assign Driver')}
            className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-neutral-700"
          >
            <UserPlus size={14} /> Assign driver
          </button>
          <button 
            onClick={() => handleNotImplemented('Change Status')}
            className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2"
          >
            <CheckCircle size={14} /> Change status
          </button>
          <button 
            disabled={!isOngoing}
            onClick={() => handleNotImplemented('Track Request')}
            className="w-full text-left px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-yellow-50 hover:text-yellow-900 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-neutral-700"
          >
            <MapPin size={14} /> Track request
          </button>
          <div className="h-px bg-neutral-100 my-1"></div>
          <button 
            disabled={isCompleted || isCancelled}
            onClick={() => handleNotImplemented('Cancel Request')}
            className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-white"
          >
            <XCircle size={14} /> Cancel request
          </button>
          <button 
            onClick={() => { setIsOpen(false); onDelete(row); }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <XCircle size={14} /> Delete request
          </button>
        </div>
      )}
    </div>
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
    dateTo: ''
  });
  
  const [activeFilters, setActiveFilters] = useState({
    status: '',
    transportType: '',
    paymentType: '',
    driverAssigned: '',
    dateFrom: '',
    dateTo: ''
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
        ...activeFilters
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
    return () => { active = false; };
  }, [activeTab, limit, search, activeFilters]);

  useEffect(() => {
    const cleanup = loadRows();
    return () => { if(typeof cleanup === 'function') cleanup(); };
  }, [loadRows]);

  const handleDelete = async (request) => {
    const confirmed = window.confirm(`Delete request ${request.requestId}? This will remove it for both rider and driver.`);
    if (!confirmed) return;
    try {
      await adminService.deleteOngoingRide(request.id);
      toast.success("Request deleted successfully");
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
    const emptyFilters = { status: '', transportType: '', paymentType: '', driverAssigned: '', dateFrom: '', dateTo: '' };
    setDraftFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setShowFilters(false);
  };

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      <div className="px-4 py-2 md:px-6 md:pt-2 md:pb-6 space-y-3 max-w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-neutral-900/[0.08]">
          <div>
            <h1 className="text-lg font-medium text-neutral-900">Ongoing requests</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Manage and track active rides and deliveries</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-neutral-500">
            <span>Operations</span>
            <ChevronRight size={14} className="text-neutral-300" />
            <span className="text-neutral-600">Ongoing requests</span>
          </div>
        </div>

        {/* Main Content Box */}
        <div className="rounded-xl border border-neutral-900/[0.08] bg-white flex flex-col relative">
          
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-2.5 lg:flex-row lg:items-center">
            
            <div className="flex items-center gap-2 text-xs text-neutral-500 shrink-0">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="h-8 w-14 border border-neutral-200 rounded-md bg-neutral-50 px-1.5 outline-none focus:ring-1 focus:ring-[#0a4d2b]/30 focus:border-[#0a4d2b] text-neutral-700 font-medium text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>Entries</span>
            </div>

            {/* Tabs */}
            <div className="flex flex-1 items-center gap-1 overflow-x-auto no-scrollbar border-b border-neutral-100 lg:border-b-0 pb-1 lg:pb-0 lg:justify-center">
              {['All', 'Accepted', 'Upcoming', 'Ongoing'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap rounded-t-md lg:rounded-md ${
                    activeTab === tab ? 'text-neutral-900 bg-yellow-50 lg:bg-transparent' : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute -bottom-1 lg:-bottom-2 left-0 right-0 h-0.5 bg-[#0a4d2b] rounded-t-full hidden lg:block text-white" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-full sm:w-40">
                <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requests"
                  className="h-7 w-full rounded-md border border-neutral-200 bg-neutral-50 pl-7 pr-2 text-xs outline-none focus:bg-white focus:border-[#0a4d2b] focus:ring-1 focus:ring-[#0a4d2b]/30 transition-colors font-medium"
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex h-7 items-center gap-1 px-2.5 rounded-md text-xs font-medium transition-colors border relative ${activeFilterCount > 0 ? 'bg-[#0a4d2b] text-white text-white border-[#0a4d2b] shadow-sm' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}`}
              >
                <Filter size={12} /> Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-neutral-900 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter Dropdown */}
          {showFilters && (
            <div className="absolute right-0 top-[110px] lg:top-[60px] z-40 bg-white border border-neutral-900/[0.08] rounded-xl p-4 w-[400px] max-w-[calc(100vw-2rem)] mr-4 lg:mr-6 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-900 border-l-2 border-[#0a4d2b] pl-2">Advanced filters</h3>
                <button onClick={() => setShowFilters(false)} className="text-neutral-500 hover:text-neutral-800"><X size={16}/></button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Status</label>
                  <select 
                    value={draftFilters.status} 
                    onChange={e => setDraftFilters({...draftFilters, status: e.target.value})}
                    className="w-full h-8 border border-neutral-200 rounded-md bg-neutral-50 px-2 text-xs outline-none focus:border-[#0a4d2b] font-medium"
                  >
                    <option value="">All Statuses</option>
                    <option value="accepted">Accepted</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Transport type</label>
                  <select 
                    value={draftFilters.transportType} 
                    onChange={e => setDraftFilters({...draftFilters, transportType: e.target.value})}
                    className="w-full h-8 border border-neutral-200 rounded-md bg-neutral-50 px-2 text-xs outline-none focus:border-[#0a4d2b] font-medium"
                  >
                    <option value="">All Types</option>
                    <option value="taxi">Taxi</option>
                    <option value="bike">Bike</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Payment type</label>
                  <select 
                    value={draftFilters.paymentType} 
                    onChange={e => setDraftFilters({...draftFilters, paymentType: e.target.value})}
                    className="w-full h-8 border border-neutral-200 rounded-md bg-neutral-50 px-2 text-xs outline-none focus:border-[#0a4d2b] font-medium"
                  >
                    <option value="">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                    <option value="wallet">Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Driver assignment</label>
                  <div className="flex bg-neutral-50 p-1 rounded-md border border-neutral-200 h-8 items-center">
                    <button onClick={() => setDraftFilters({...draftFilters, driverAssigned: ''})} className={`flex-1 py-1 text-xs font-medium rounded ${draftFilters.driverAssigned === '' ? 'bg-white shadow-sm text-neutral-900 border border-neutral-100' : 'text-neutral-500'}`}>All</button>
                    <button onClick={() => setDraftFilters({...draftFilters, driverAssigned: 'assigned'})} className={`flex-1 py-1 text-xs font-medium rounded ${draftFilters.driverAssigned === 'assigned' ? 'bg-white shadow-sm text-neutral-900 border border-neutral-100' : 'text-neutral-500'}`}>Assigned</button>
                    <button onClick={() => setDraftFilters({...draftFilters, driverAssigned: 'unassigned'})} className={`flex-1 py-1 text-xs font-medium rounded ${draftFilters.driverAssigned === 'unassigned' ? 'bg-white shadow-sm text-neutral-900 border border-neutral-100' : 'text-neutral-500'}`}>Unassigned</button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Date from</label>
                  <input type="date" value={draftFilters.dateFrom} onChange={e => setDraftFilters({...draftFilters, dateFrom: e.target.value})} className="w-full h-8 border border-neutral-200 rounded-md bg-neutral-50 px-2 text-xs outline-none focus:border-[#0a4d2b] font-medium" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Date to</label>
                  <input type="date" value={draftFilters.dateTo} onChange={e => setDraftFilters({...draftFilters, dateTo: e.target.value})} className="w-full h-8 border border-neutral-200 rounded-md bg-neutral-50 px-2 text-xs outline-none focus:border-[#0a4d2b] font-medium" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button onClick={resetFilters} className="flex-1 py-1 bg-neutral-100 text-neutral-700 rounded text-xs font-medium hover:bg-neutral-200 transition-colors">Clear filters</button>
                <button onClick={applyFilters} className="flex-1 py-1 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-900 transition-colors shadow-sm">Apply filters</button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="bg-neutral-50/80 border-b border-neutral-100">
                  {['Request ID', 'Date', 'User Name', 'Driver Name', 'Transport Type', 'Trip Status', 'Payment Option', 'Action'].map((heading, i) => (
                    <th key={heading} className={`px-4 py-2.5 text-xs font-medium text-neutral-600  ${i === 7 ? 'text-right pr-6' : ''}`}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-24 text-center">
                      <Loader2 className="animate-spin text-[#0a4d2b] mx-auto" size={32} />
                      <p className="mt-3 text-xs text-neutral-500">Loading Requests...</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="py-24 text-center">
                      <div className="bg-red-50 text-red-500 p-4 rounded-lg inline-block border border-red-100">
                        <XCircle size={24} className="mx-auto mb-2" />
                        <p className="text-sm font-medium">{error}</p>
                        <button onClick={loadRows} className="mt-3 px-4 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200">
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-24 text-center">
                      <div className="mx-auto flex flex-col items-center justify-center opacity-50">
                        <Truck size={48} className="text-neutral-300 mb-3" />
                        <p className="text-sm text-neutral-500">No ongoing requests found</p>
                        <p className="text-xs text-neutral-500 mt-1">Try adjusting your filters or search term</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id || row.requestId || Math.random()} className="hover:bg-yellow-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedRequest(row)}>
                      <td className="px-4 py-2 text-[13px] font-medium text-neutral-900 font-mono">{row.requestId || '-'}</td>
                      <td className="px-4 py-2 text-[12px] font-medium text-neutral-600">{formatDate(row.date)}</td>
                      <td className="px-4 py-2 text-[13px] font-medium text-neutral-800">{row.userName || '-'}</td>
                      <td className="px-4 py-2 text-[13px] font-medium text-neutral-700">{row.driverName || '--'}</td>
                      <td className="px-4 py-2 text-[13px] font-medium text-neutral-700 capitalize">{String(row.transportType || '').toLowerCase()}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded capitalize  ${STATUS_STYLES[row.tripStatus] || 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>
                          {row.tripStatus ? String(row.tripStatus).replace('_', ' ').toLowerCase() : 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded capitalize  ${PAYMENT_STYLES[row.paymentOption] || 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>
                          {row.paymentOption ? String(row.paymentOption).toLowerCase() : 'Cash'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <ActionMenu 
                          row={row} 
                          onViewDetails={() => setSelectedRequest(row)} 
                          onDelete={handleDelete}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RequestDetailsModal 
        request={selectedRequest} 
        onClose={() => setSelectedRequest(null)} 
      />
    </div>
  );
};

export default Ongoing;
