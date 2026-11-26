import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Building2, Search, Filter, MoreVertical, MapPin,
    CheckCircle, XCircle, Clock, Star, ShieldAlert, Trash2, Edit, Eye, Loader2,
    ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { categoryService } from '../../../services/categoryService';
import toast from 'react-hot-toast';
import StatusDot from '../components/StatusDot';
import ViewTabs, { useListView } from '../components/ViewTabs';

const PropertyStatusBadge = ({ status }) => <StatusDot status={status} />;

const AdminProperties = () => {
    const [view, setView] = useListView('live');
    const [counts, setCounts] = useState({ requests: 0, live: 0 });
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalProperties, setTotalProperties] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        search: '',
        status: '',
        type: ''
    });

    const [dynamicCategories, setDynamicCategories] = useState([]);

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const cats = await categoryService.getActiveCategories();
                setDynamicCategories(cats || []);
            } catch (err) {
                console.error("Failed to fetch categories:", err);
            }
        };
        fetchCategories();
    }, []);

    const fetchProperties = useCallback(async (page, currentFilters) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            setLoading(true);
            const params = {
                page,
                limit,
                search: currentFilters.search,
                status: currentFilters.status,
                type: currentFilters.type || undefined,
                view: currentFilters.view === 'all' ? undefined : currentFilters.view
            };
            const data = await adminService.getHotels(params);
            if (data.success) {
                setProperties(data.hotels || []);
                if (data.counts) setCounts(data.counts);
                setTotalProperties(data.total || 0);
                setTotalPages(Math.ceil((data.total || 0) / limit));
            } else {
                setProperties([]);
                setTotalProperties(0);
                setTotalPages(0);
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Error fetching properties:', error);
                toast.error('Failed to load properties');
            }
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProperties(currentPage, { ...filters, view });
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchProperties, view]);

    useEffect(() => {
        setCurrentPage(1);
        setFilters((prev) => ({ ...prev, status: '' }));
    }, [view]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleAction = (action, property) => {
        setActiveDropdown(null);
        if (action === 'approve' || action === 'reject') {
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            setModalConfig({
                isOpen: true,
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} property?`,
                message: `Are you sure you want to ${action} "${property.propertyName}"?`,
                type: action === 'approve' ? 'success' : 'warning',
                confirmText: action.charAt(0).toUpperCase() + action.slice(1),
                onConfirm: async () => {
                    try {
                        const res = await adminService.updateHotelStatus(property._id, newStatus);
                        if (res.success) {
                            toast.success(`Property ${action}ed successfully`);
                            fetchProperties(currentPage, { ...filters, view });
                        }
                    } catch {
                        toast.error('Failed to update status');
                    }
                }
            });
        } else if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete property?',
                message: `Are you sure you want to delete "${property.propertyName}"? This action cannot be undone and all data related to this property (including bookings) will be affected.`,
                type: 'danger',
                confirmText: 'Delete property',
                onConfirm: async () => {
                    try {
                        const res = await adminService.deleteHotel(property._id);
                        if (res.success) {
                            toast.success('Property deleted successfully');
                            fetchProperties(currentPage, { ...filters, view });
                        }
                    } catch {
                        toast.error('Failed to delete property');
                    }
                }
            });
        }
    };

    const handleExportCSV = () => {
        if (properties.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Property Name', 'Type', 'Owner', 'Status', 'City'];
        const csvContent = [
            headers.join(','),
            ...properties.map(h => [
                h._id,
                `"${h.propertyName}"`,
                `"${h.propertyType}"`,
                `"${h.partnerId?.name || ''}"`,
                h.status,
                `"${h.address?.city || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `properties-export-${new Date().toISOString().split('T')[0]}.csv`);
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
                    <h2 className="text-2xl font-medium text-neutral-900">
                        {view === 'requests' ? 'Property requests' : view === 'live' ? 'Live properties' : 'All properties'} ({totalProperties})
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                        {view === 'requests'
                            ? 'New listings submitted by partners, waiting for review'
                            : view === 'live'
                              ? 'Approved stays guests can find and book'
                              : 'Every listed stay, including drafts'}
                    </p>
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

            <ViewTabs
                value={view}
                onChange={setView}
                tabs={[
                    { value: 'requests', label: 'Requests', count: counts.requests },
                    { value: 'live', label: 'Live', count: counts.live },
                    { value: 'all', label: 'All' },
                ]}
            />

            <div className="bg-white p-4 border border-neutral-900/[0.08] rounded-xl flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search properties by name or city"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-neutral-400 outline-none transition-colors"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {view === 'all' ? (
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-neutral-50 border border-transparent rounded-lg text-sm outline-none focus:bg-white focus:border-neutral-400 transition-colors"
                    >
                        <option value="">All statuses</option>
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    ) : null}
                    <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="px-4 py-2 bg-neutral-50 border border-transparent rounded-lg text-sm outline-none focus:bg-white focus:border-neutral-400 transition-colors"
                    >
                        <option value="">All types</option>
                        <option value="hotel">Hotel</option>
                        <option value="resort">Resort</option>
                        <option value="homestay">Homestay</option>
                        <option value="lodge">Lodge</option>
                        {dynamicCategories.map(cat => (
                            <option key={cat._id} value={cat._id}>{cat.displayName}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white border border-neutral-900/[0.08] rounded-xl overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
                                <th className="p-4">Property name</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Owner</th>
                                <th className="p-4">Bookings</th>
                                <th className="p-4">{view === 'requests' ? 'Submitted' : 'Listed'}</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 font-medium">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="p-4"><div className="h-10 bg-neutral-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {properties.length > 0 ? (
                                        properties.map((property, index) => (
                                            <motion.tr
                                                key={property._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.18 }}
                                                className="hover:bg-neutral-50/50 transition-colors group relative"
                                            >
                                                <td className="p-4">
                                                    <Link to={`/hotel/admin/properties/${property._id}`} className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 border border-white shadow-sm">
                                                            <Building2 size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-medium text-neutral-900">{property.propertyName || 'Untitled'}</p>
                                                                {property.avgRating > 0 && (
                                                                    <span className="flex items-center bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded text-xs font-medium border border-yellow-100">
                                                                        <Star size={8} className="fill-yellow-500 text-yellow-500 mr-0.5" />
                                                                        {property.avgRating?.toFixed(1)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center text-xs text-neutral-500 mt-0.5">
                                                                <MapPin size={10} className="mr-1" />
                                                                {property.address?.city || 'No address'}, {property.address?.state || ''}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-[13px] text-neutral-700 first-letter:uppercase">
                                                        {property.dynamicCategory?.displayName || property.propertyType || '—'}
                                                    </p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-xs text-neutral-700 font-medium mb-0.5">{property.partnerId?.name || 'Unknown partner'}</p>
                                                    <p className="text-xs text-neutral-500 normal-case">{property.partnerId?.email || 'No email'}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-[13px] text-neutral-700">{property.bookingCount || 0} total</p>
                                                    <p className="text-xs text-neutral-500">{property.upcomingBookingCount || 0} upcoming</p>
                                                </td>
                                                <td className="p-4 text-xs text-neutral-500">
                                                    {property.createdAt ? new Date(property.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                </td>
                                                <td className="p-4">
                                                    {view === 'requests' && property.status === 'pending' ? (
                                                        <div className="flex gap-2">
                                                            <button onClick={(e) => { e.stopPropagation(); handleAction('approve', property); }} className="px-3 py-1 rounded-md bg-[#0a4d2b] text-white text-xs font-medium hover:opacity-90">Approve</button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleAction('reject', property); }} className="px-3 py-1 rounded-md border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50">Reject</button>
                                                        </div>
                                                    ) : (
                                                        <PropertyStatusBadge status={property.status} />
                                                    )}
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === property._id ? null : property._id); }}
                                                        className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === property._id && (
                                                        <div className="absolute right-8 top-8 w-40 bg-white border border-neutral-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <Link to={`/hotel/admin/properties/${property._id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 text-xs font-medium text-neutral-700">
                                                                <Eye size={14} /> View details
                                                            </Link>
                                                            {property.status === 'pending' && (
                                                                <>
                                                                    <button onClick={() => handleAction('approve', property)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-xs font-medium text-green-700">
                                                                        <CheckCircle size={14} /> Approve
                                                                    </button>
                                                                    <button onClick={() => handleAction('reject', property)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-medium text-red-700">
                                                                        <XCircle size={14} /> Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            <div className="h-px bg-neutral-100 my-1"></div>
                                                            <button onClick={() => handleAction('delete', property)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-medium text-red-700">
                                                                <Trash2 size={14} /> Delete property
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-neutral-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Building2 size={32} className="text-neutral-300" />
                                                    <p className="text-xs font-medium">No properties found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
                        <p className="text-xs text-neutral-500">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default AdminProperties;
