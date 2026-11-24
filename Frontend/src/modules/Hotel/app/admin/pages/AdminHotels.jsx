import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Building2, Search, MoreVertical, MapPin,
    CheckCircle, XCircle, Clock, ShieldAlert, Trash2, Eye,
    ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';
import StatusDot from '../components/StatusDot';

const HotelStatusBadge = ({ status }) => <StatusDot status={status} />;

const AdminHotels = () => {
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalHotels, setTotalHotels] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        search: '',
        status: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchHotels = useCallback(async (page, currentFilters) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            setLoading(true);
            const params = {
                page,
                limit,
                search: currentFilters.search,
                status: currentFilters.status
            };
            const data = await adminService.getHotels(params);
            if (data.success) {
                setHotels(data.hotels);
                setTotalHotels(data.total);
                setTotalPages(Math.ceil(data.total / limit));
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Error fetching hotels:', error);
                toast.error('Failed to load hotels');
            }
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchHotels(currentPage, filters);
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchHotels]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleAction = (action, hotel) => {
        setActiveDropdown(null);
        if (action === 'approve' || action === 'reject') {
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            setModalConfig({
                isOpen: true,
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} hotel?`,
                message: `Are you sure you want to ${action} "${hotel.name}"?`,
                type: action === 'approve' ? 'success' : 'warning',
                confirmText: action.charAt(0).toUpperCase() + action.slice(1),
                onConfirm: async () => {
                    try {
                        const res = await adminService.updateHotelStatus(hotel._id, newStatus);
                        if (res.success) {
                            toast.success(`Hotel ${action}ed successfully`);
                            fetchHotels(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to update status');
                    }
                }
            });
        } else if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete hotel?',
                message: `Are you sure you want to delete "${hotel.name}"? This action cannot be undone and all data related to this hotel (including bookings) will be affected.`,
                type: 'danger',
                confirmText: 'Delete hotel',
                onConfirm: async () => {
                    try {
                        const res = await adminService.deleteHotel(hotel._id);
                        if (res.success) {
                            toast.success('Hotel deleted successfully');
                            fetchHotels(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to delete hotel');
                    }
                }
            });
        }
    };

    const handleExportCSV = () => {
        if (hotels.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Hotel Name', 'Owner', 'Status', 'City', 'Price'];
        const csvContent = [
            headers.join(','),
            ...hotels.map(h => [
                h._id,
                `"${h.name}"`,
                `"${h.ownerId?.name}"`,
                h.status,
                `"${h.address?.city}"`,
                h.price
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `hotels-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    return (
        <div className="space-y-6 relative" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-medium text-neutral-900">Hotel partners ({totalHotels})</h2>
                    <p className="mt-1 text-sm text-neutral-500">Every listed stay, with its approval status</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 border border-neutral-900/[0.08] rounded-xl flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search hotels by name or city"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-neutral-400 outline-none transition-colors"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-neutral-50 border border-transparent rounded-lg text-sm outline-none focus:bg-white focus:border-neutral-400 transition-colors"
                    >
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>
            </div>

            <div className="bg-white border border-neutral-900/[0.08] rounded-xl overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
                                <th className="p-4">Hotel name</th>
                                <th className="p-4">Owner</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Rooms</th>
                                <th className="p-4">Pricing</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 font-medium">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-4"><div className="h-10 bg-neutral-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {hotels.length > 0 ? (
                                        hotels.map((hotel, index) => (
                                            <motion.tr
                                                key={hotel._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.18 }}
                                                className="hover:bg-neutral-50/50 transition-colors group relative"
                                            >
                                                <td className="p-4">
                                                    <Link to={`/hotel/admin/properties/${hotel._id}`} className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 border border-white shadow-sm">
                                                            <Building2 size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-neutral-900">{hotel.name || 'Untitled'}</p>
                                                            <div className="flex items-center text-xs text-neutral-500 mt-0.5">
                                                                <MapPin size={10} className="mr-1" />
                                                                {hotel.address?.city || 'No address'}, {hotel.address?.state || ''}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-xs text-neutral-700 font-medium">{hotel.ownerId?.name || 'Unknown partner'}</p>
                                                    <p className="text-xs text-neutral-500">ID: {hotel._id.slice(-6)}</p>
                                                </td>
                                                <td className="p-4">
                                                    <HotelStatusBadge status={hotel.status} />
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-xs text-neutral-700 font-medium">{hotel.rooms?.length || 0} Categories</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm font-medium text-neutral-900">₹{hotel.price?.toLocaleString() || 0}<span className="text-xs text-neutral-500 ml-1">/NIGHT</span></p>
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === hotel._id ? null : hotel._id); }}
                                                        className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === hotel._id && (
                                                        <div className="absolute right-8 top-8 w-40 bg-white border border-neutral-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <Link to={`/hotel/admin/properties/${hotel._id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 text-xs font-medium text-neutral-700">
                                                                <Eye size={14} /> View details
                                                            </Link>
                                                            {hotel.status === 'pending' && (
                                                                <>
                                                                    <button onClick={() => handleAction('approve', hotel)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-xs font-medium text-green-700">
                                                                        <CheckCircle size={14} /> Approve
                                                                    </button>
                                                                    <button onClick={() => handleAction('reject', hotel)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-medium text-red-700">
                                                                        <XCircle size={14} /> Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            <div className="h-px bg-neutral-100 my-1"></div>
                                                            <button
                                                                onClick={() => handleAction('delete', hotel)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-medium text-red-600"
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-neutral-500 text-xs">
                                                No properties match these filters
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && hotels.length > 0 && (
                    <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
                        <p className="text-xs text-neutral-500">
                            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalHotels)} of {totalHotels} properties
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-neutral-200 rounded-lg text-neutral-500 hover:text-black disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-10 h-10 rounded-lg text-xs font-medium  transition-colors ${currentPage === i + 1 ? 'bg-neutral-900 text-white shadow-sm' : 'hover:bg-neutral-100 text-neutral-600 border border-transparent hover:border-neutral-200'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-neutral-200 rounded-lg text-neutral-500 hover:text-black disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminHotels;
