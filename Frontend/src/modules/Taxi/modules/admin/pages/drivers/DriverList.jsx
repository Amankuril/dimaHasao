import React, { useState, useEffect } from 'react';
import {
  Search,
  MoreVertical,
  FileText,
  Star,
  Plus,
  Eye,
  Edit2,
  Key,
  XCircle,
  Trash2,
  Lock,
  Loader2,
  ChevronRight,
  Filter,
  List,
  LayoutGrid
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { AnimatePresence } from 'framer-motion';

const ACTION_MENU_WIDTH = 220;
const ACTION_MENU_GAP = 8;
const ACTION_MENU_MAX_HEIGHT = 260;

const DriverList = ({ mode = 'approved' }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ dateRange: '', vehicleType: '' });
  const [passwordModal, setPasswordModal] = useState({ isOpen: false, driverId: null, password: '', isSubmitting: false });
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [paginator, setPaginator] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchDrivers = async ({ nextPage = page, nextLimit = itemsPerPage, nextSearch = searchTerm } = {}) => {
    setIsLoading(true);
    setError('');
    try {
      const responseData = await adminService.getDrivers(nextPage, nextLimit, {
        ...(mode === 'active' ? { isOnline: true } : { approve: true }),
        search: String(nextSearch || '').trim(),
      });
      const driversList = responseData.data?.results || [];
      if (responseData.success) {
        const visibleDrivers = mode === 'active'
          ? driversList.filter((d) => Boolean(d.isOnline))
          : driversList;

        const approved = visibleDrivers.map((d) => ({
          id: d._id,
          name: d.name || 'Unknown',
          driverCode: d.driver_code || d.referralCode || (d.phone ? `DRV${String(d.phone).slice(-4)}${String(d._id || d.id || '').slice(-6).toUpperCase()}`.replace(/\W/g, '') : 'N/A'),
          serviceLocation: d.service_location_name || d.city || d.service_location?.name || 'India',
          phone: d.phone || d.mobile || 'N/A',
          transportType: d.transport_type || d.register_for || d.vehicle_type || 'All - Bike',
          rating: Number(d.rating_count || d.ratingCount || 0) > 0
            ? Number(d.rating || d.average_rating || d.avg_rating || 0)
            : 0,
          isOnline: Boolean(d.isOnline),
          onlineSelfieImage: d.online_selfie_image || '',
          onlineSelfieCapturedAt: d.online_selfie_captured_at || null,
          registeredAt: d.createdAt || null,
          status: mode === 'active' ? 'Online' : (d.approve ? 'Approved' : (d.status || 'Approved')),
        }));
        setDrivers(approved);
        setPaginator(responseData.data?.paginator || null);
      } else {
        setError(responseData.message || 'Failed to fetch drivers');
      }
    } catch (err) {
      setError(err.message || 'Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers({ nextPage: 1, nextLimit: itemsPerPage, nextSearch: searchTerm });
    setPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchDrivers({ nextPage: 1, nextLimit: itemsPerPage, nextSearch: searchTerm });
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    fetchDrivers({ nextPage: page, nextLimit: itemsPerPage, nextSearch: searchTerm });
  }, [page]);

  const closeMenu = () => {
    setActiveMenu(null);
    setMenuPosition(null);
  };

  const toggleMenu = (e, userId) => {
    e.stopPropagation();
    if (activeMenu === userId) {
      closeMenu();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const spaceBelow = window.innerHeight - rect.bottom - ACTION_MENU_GAP;
    const spaceAbove = rect.top - ACTION_MENU_GAP;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;

    const left = Math.min(
      Math.max(viewportPadding, rect.right - ACTION_MENU_WIDTH),
      window.innerWidth - ACTION_MENU_WIDTH - viewportPadding,
    );

    setMenuPosition({
      left,
      ...(openUp
        ? { bottom: Math.max(viewportPadding, window.innerHeight - rect.top + ACTION_MENU_GAP) }
        : {
            top: Math.max(
              viewportPadding,
              Math.min(
                rect.bottom + ACTION_MENU_GAP,
                window.innerHeight - ACTION_MENU_MAX_HEIGHT - viewportPadding,
              ),
            ),
          }),
    });
    setActiveMenu(userId);
  };

  useEffect(() => {
    if (!activeMenu) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };

    const handleReset = () => closeMenu();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReset, true);
    window.addEventListener('resize', handleReset);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReset, true);
      window.removeEventListener('resize', handleReset);
    };
  }, [activeMenu]);

  const handleAction = async (action, driverId) => {
    const confirmMsg = action === 'delete' ? 'Are you sure you want to delete this driver?' : 'Are you sure you want to disapprove this driver?';
    if (action !== 'password' && !window.confirm(confirmMsg)) return;

    try {
      let resData;
      if (action === 'delete') {
        resData = await adminService.deleteDriver(driverId);
      } else if (action === 'disapprove') {
        resData = await adminService.updateDriverStatus(driverId, { approve: false, status: 'disapproved', active: false });
      } else if (action === 'password') {
        setPasswordModal(prev => ({ ...prev, isSubmitting: true }));
        resData = await adminService.updateDriverPassword(driverId, passwordModal.password);
      }

      if (resData.success) {
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful`);
        if (action === 'delete' || action === 'disapprove') {
          setDrivers(prev => prev.filter(d => d.id !== driverId));
        }
        if (action === 'password') {
          setPasswordModal({ isOpen: false, driverId: null, password: '', isSubmitting: false });
        }
      } else {
        alert(resData.message || `Failed to ${action}`);
        if (action === 'password') setPasswordModal(prev => ({ ...prev, isSubmitting: false }));
      }
    } catch (err) {
      alert(err.message || `Network error during ${action}`);
      if (action === 'password') setPasswordModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const totalPages = Math.max(1, Number(paginator?.last_page || 1));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const totalEntries = Number(paginator?.total || 0);
  const perPage = Number(paginator?.per_page || itemsPerPage);
  const startIndex = (safePage - 1) * perPage;
  const showingFrom = totalEntries === 0 ? 0 : startIndex + 1;
  const showingTo = totalEntries === 0 ? 0 : Math.min(startIndex + drivers.length, totalEntries);

  return (
    <div className="min-h-screen bg-neutral-50 p-3 lg:p-4 font-sans text-neutral-900">
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </div>
      )}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-0.5">
          <span>Drivers</span>
          <ChevronRight size={10} />
          <span className="text-neutral-700 font-medium">{mode === 'active' ? 'Active Drivers' : 'Approved Drivers'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-base text-neutral-900 font-medium">{mode === 'active' ? 'Active Drivers' : 'Approved Drivers'}</h1>
          {mode !== 'active' ? (
            <button
              onClick={() => navigate('/taxi/admin/drivers/create')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white font-medium bg-[#0a4d2b] rounded-md shadow-sm hover:bg-[#06381e] transition-colors"
            >
              <Plus size={14} /> Add drivers
            </button>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 p-3 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-auto">
             <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
             <input
               className="w-full sm:w-[280px] pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0a4d2b]/30 focus:border-[#0a4d2b]"
               placeholder="Search by name, phone, or location"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
                className="border border-neutral-200 rounded-md px-1.5 py-1 text-xs text-neutral-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#0a4d2b]/30 focus:border-[#0a4d2b]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-md shadow-sm hover:bg-neutral-50 transition-colors ml-auto sm:ml-0"
            >
              <Filter size={14} /> Filters
            </button>
          </div>
        </div>
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Date range</label>
              <select 
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-xs text-neutral-700 bg-neutral-50 outline-none focus:border-[#0a4d2b] focus:bg-white"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Vehicle type</label>
              <select 
                value={filters.vehicleType}
                onChange={(e) => setFilters({...filters, vehicleType: e.target.value})}
                className="w-full border border-neutral-200 rounded-md px-2 py-1.5 text-xs text-neutral-700 bg-neutral-50 outline-none focus:border-[#0a4d2b] focus:bg-white"
              >
                <option value="">All Types</option>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="hatchback">Hatchback</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Mobile</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Selfie</th>
                <th className="px-3 py-2 text-center">Docs</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2">Rating</th>
                <th className="px-3 py-2">Registered</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs text-neutral-700">
              {isLoading ? (
                <tr>
                  <td colSpan="11" className="px-3 py-6 text-center text-neutral-500">Loading drivers...</td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-3 py-6 text-center text-neutral-500">No drivers found</td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-3 py-1.5 font-medium text-neutral-900">{driver.name}</td>
                    <td className="px-3 py-1.5">
                      <span className="font-mono text-xs font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {driver.driverCode}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-neutral-600">{driver.serviceLocation}</td>
                    <td className="px-3 py-1.5 font-medium">{driver.phone}</td>
                    <td className="px-3 py-1.5 text-neutral-600">{driver.transportType}</td>
                    <td className="px-3 py-1.5">
                      {driver.onlineSelfieImage ? (
                        <button
                          type="button"
                          onClick={() => window.open(driver.onlineSelfieImage, '_blank', 'noopener,noreferrer')}
                          className="flex items-center gap-1.5 rounded border border-neutral-200 bg-white px-1.5 py-0.5 hover:bg-neutral-50 transition-colors"
                        >
                          <img src={driver.onlineSelfieImage} alt={`${driver.name} selfie`} className="h-5 w-5 rounded object-cover" />
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-500">No selfie</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button
                        onClick={() => navigate(`/taxi/admin/drivers/${driver.id}?tab=Documents`)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded border border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors"
                        title="View documents"
                      >
                        <FileText size={12} />
                      </button>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 capitalize">
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={10} className={s <= Math.round(driver.rating) ? "fill-[#0a4d2b] text-[#0a4d2b]" : "text-neutral-200"} />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-neutral-500 whitespace-nowrap">{formatDate(driver.registeredAt)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="relative inline-block">
                        <button 
                          onClick={(e) => toggleMenu(e, driver.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-500 transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!isLoading && drivers.length > 0 && (
          <div className="p-3 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100 bg-neutral-50/50">
            <span>Showing {showingFrom} to {showingTo} of {totalEntries} entries</span>
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 font-medium hover:text-black disabled:opacity-50"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Prev
              </button>
              <button className="px-2.5 py-1 rounded bg-[#0a4d2b] text-white font-medium">{safePage}</button>
              <button
                className="px-2 py-1 font-medium hover:text-black disabled:opacity-50"
                disabled={safePage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {activeMenu && menuPosition && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-transparent" onClick={closeMenu} />
          <div
            className="fixed z-[9999] bg-white rounded-xl border border-neutral-900/[0.08] p-1.5 overflow-y-auto transform origin-top-right transition-colors"
            style={{
              width: ACTION_MENU_WIDTH,
              maxHeight: `min(${ACTION_MENU_MAX_HEIGHT}px, calc(100vh - 24px))`,
              ...menuPosition,
            }}
          >
            <button
              onClick={() => {
                closeMenu();
                handleAction('disapprove', activeMenu);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 hover:text-red-700 text-neutral-700 rounded-lg transition-colors text-sm font-medium"
            >
              <XCircle size={15} className="text-red-600" /> Disapprove
            </button>
            <button
              onClick={() => {
                closeMenu();
                navigate(`/taxi/admin/drivers/edit/${activeMenu}`);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors text-sm font-medium"
            >
              <Edit2 size={15} className="text-[#0a4d2b]" /> Edit details
            </button>
            <button
              onClick={() => {
                closeMenu();
                setPasswordModal({ isOpen: true, driverId: activeMenu, password: '', isSubmitting: false });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors text-sm font-medium"
            >
              <Key size={15} className="text-[#0a4d2b]" /> Reset password
            </button>
            <button
              onClick={() => {
                closeMenu();
                navigate(`/taxi/admin/drivers/${activeMenu}`);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 text-neutral-700 rounded-lg transition-colors text-sm font-medium"
            >
              <Eye size={15} className="text-neutral-500" /> View profile
            </button>
            <div className="h-px bg-neutral-100 my-1 mx-1" />
            <button
              onClick={() => {
                closeMenu();
                handleAction('delete', activeMenu);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 hover:text-red-700 text-neutral-700 rounded-lg transition-colors text-sm font-medium"
            >
              <Trash2 size={15} className="text-red-600" /> Delete driver
            </button>
          </div>
        </>,
        document.body,
      )}

      {/* Password Modal */}
      <AnimatePresence>
        {passwordModal.isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-sm border border-neutral-900/[0.08] overflow-hidden p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-neutral-900">Update password</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Set a new password for this driver</p>
                </div>
                <button 
                  onClick={() => setPasswordModal({ isOpen: false, driverId: null, password: '', isSubmitting: false })}
                  className="text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">New password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Enter new password"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#0a4d2b]/30 focus:border-[#0a4d2b] transition-colors"
                    value={passwordModal.password}
                    onChange={(e) => setPasswordModal(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1.5">Minimum 8 characters required</p>
              </div>

              <button 
                onClick={() => {
                  if (passwordModal.password.length < 4) { alert('Password too short'); return; }
                  handleAction('password', passwordModal.driverId);
                }}
                disabled={passwordModal.isSubmitting || !passwordModal.password}
                className="w-full py-2 bg-[#0a4d2b] text-white rounded-lg text-sm font-medium shadow-sm hover:bg-[#06381e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {passwordModal.isSubmitting ? <Loader2 className="animate-spin" size={15} /> : <Key size={15} />}
                Update Password
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DriverList;
