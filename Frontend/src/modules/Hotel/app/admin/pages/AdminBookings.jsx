import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Search, Filter, MoreVertical,
    CheckCircle, XCircle, Clock, ArrowRight, X, AlertTriangle, Eye,
    FileText, Download, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';
import StatusDot from '../components/StatusDot';
import ViewTabs, { useListView } from '../components/ViewTabs';

const BookingStatusBadge = ({ status }) => <StatusDot status={status} />;

const MetricCard = ({ label, value, subLabel, loading }) => (
    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex-1">
        <p className="text-neutral-500 text-xs mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
            {loading ? (
                <div className="h-8 w-16 bg-neutral-50 animate-pulse rounded-md"></div>
            ) : (
                <h3 className="text-2xl font-medium text-neutral-900">
                    {typeof value === 'number' && label.toLowerCase().includes('revenue') ? `₹${(value ?? 0).toLocaleString()}` : (value ?? 0).toLocaleString()}
                </h3>
            )}
            {subLabel && <span className="text-xs text-neutral-500">{subLabel}</span>}
        </div>
    </div>
);

const BOOKING_VIEWS = [
    { value: 'requests', label: 'Needs action', title: 'Booking requests', hint: 'Waiting for payment or confirmation' },
    { value: 'upcoming', label: 'Upcoming', title: 'Upcoming stays', hint: 'Confirmed bookings, soonest check-in first' },
    { value: 'inhouse', label: 'In-house', title: 'Guests in-house', hint: 'Checked in and currently staying' },
    { value: 'completed', label: 'Completed', title: 'Completed stays', hint: 'Checked out' },
    { value: 'cancelled', label: 'Cancelled', title: 'Cancelled bookings', hint: 'Cancelled, rejected or no-show' },
    { value: 'all', label: 'All', title: 'All bookings', hint: 'Every stay booked across the district, newest first' },
];

const AdminBookings = () => {
    const [view, setView] = useListView('upcoming');
    const [counts, setCounts] = useState({});
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalBookings, setTotalBookings] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        search: '',
        status: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    // For metrics, we still fetch all or get from a dashboard sync.
    // Assuming we want fresh metrics for current view or global stats from a separate call.
    // For now, let's just use the current page for simple stats if needed, or better, another call.
    // For simplicity, let's keep a metric card for global stats.
    const [globalStats, setGlobalStats] = useState({ total: 0, confirmed: 0, completed: 0, pending: 0 });

    const fetchBookings = useCallback(async (page, currentFilters) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            setLoading(true);
            const [bookingsRes, statsRes] = await Promise.all([
                adminService.getBookings({
                    page,
                    limit,
                    search: currentFilters.search,
                    status: currentFilters.status,
                    view: currentFilters.view === 'all' ? undefined : currentFilters.view
                }),
                adminService.getDashboardStats()
            ]);

            if (bookingsRes.success) {
                setBookings(bookingsRes.bookings);
                if (bookingsRes.counts) setCounts(bookingsRes.counts);
                setTotalBookings(bookingsRes.total);
                setTotalPages(Math.ceil(bookingsRes.total / limit));
            }

            if (statsRes.success) {
                // The stats endpoint has no confirmed/pending fields; its
                // per-status breakdown (charts.status) is where those counts live.
                const byStatus = Object.fromEntries(
                    (statsRes.charts?.status || []).map((s) => [String(s.name).toLowerCase(), s.value || 0])
                );
                setGlobalStats({
                    total: statsRes.stats.totalBookings || 0,
                    confirmed: byStatus.confirmed || 0,
                    completed: byStatus.completed || 0,
                    pending: byStatus.pending || 0,
                });
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Error fetching bookings:', error);
                toast.error('Failed to load bookings');
            }
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchBookings(currentPage, { ...filters, view });
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchBookings, view]);

    useEffect(() => {
        setCurrentPage(1);
        setFilters((prev) => ({ ...prev, status: '' }));
    }, [view]);

    const viewMeta = BOOKING_VIEWS.find((v) => v.value === view) || BOOKING_VIEWS[BOOKING_VIEWS.length - 1];

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleUpdateStatus = async (bookingId, newStatus) => {
        try {
            const res = await adminService.updateBookingStatus(bookingId, newStatus);
            if (res.success) {
                toast.success(`Booking ${newStatus} successfully`);
                fetchBookings(currentPage, { ...filters, view });
            }
        } catch {
            toast.error('Failed to update booking status');
        }
    };

    const handleAction = (action, booking) => {
        setActiveDropdown(null);
        if (action === 'cancel') {
            setModalConfig({
                isOpen: true,
                title: 'Cancel booking?',
                message: `Are you sure you want to cancel booking #${booking.bookingId}? This will notify both the guest and the partner.`,
                type: 'danger',
                confirmText: 'Cancel booking',
                onConfirm: () => handleUpdateStatus(booking._id, 'cancelled')
            });
        }
    };

    const handleExportCSV = () => {
        if (bookings.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Booking ID', 'Hotel', 'Guest', 'Phone', 'Check-In', 'Check-Out', 'Status', 'Amount'];
        const csvContent = [
            headers.join(','),
            ...bookings.map(b => [
                b._id,
                b.bookingId,
                `"${b.propertyId?.propertyName || 'Deleted hotel'}"`,
                `"${b.userId?.name || 'Guest details missing'}"`,
                b.userId?.phone || 'N/A',
                new Date(b.checkInDate).toLocaleDateString(),
                new Date(b.checkOutDate).toLocaleDateString(),
                b.bookingStatus,
                b.totalAmount
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `bookings-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    return (
        <div className="space-y-6 relative pb-10" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-medium text-neutral-900">{viewMeta.title} ({totalBookings})</h2>
                    <p className="mt-1 text-sm text-neutral-500">{viewMeta.hint}</p>
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

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <MetricCard label="Total bookings" value={globalStats.total} loading={loading} />
                <MetricCard label="Confirmed" value={globalStats.confirmed} loading={loading} />
                <MetricCard label="Pending" value={globalStats.pending} loading={loading} />
            </div>

            <ViewTabs
                value={view}
                onChange={setView}
                tabs={BOOKING_VIEWS.map((v) => ({ value: v.value, label: v.label, count: v.value === 'all' ? undefined : counts[v.value] }))}
            />

            <div className="bg-white p-4 border border-neutral-900/[0.08] rounded-xl flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search by booking ID, guest or property"
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
                        <option value="pending">Pending</option>
                        <option value="awaiting_payment">Awaiting payment</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked in</option>
                        <option value="checked_out">Checked out</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="rejected">Rejected</option>
                        <option value="no_show">No-show</option>
                    </select>
                    ) : null}
                </div>
            </div>

            <div className="bg-white border border-neutral-900/[0.08] rounded-xl overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
                                <th className="p-4">Booking ID</th>
                                <th className="p-4">Hotel name</th>
                                <th className="p-4">Guest info</th>
                                <th className="p-4">Dates</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="p-4"><div className="h-10 bg-neutral-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {bookings.length > 0 ? (
                                        bookings.map((booking, index) => (
                                            <motion.tr
                                                key={booking._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.18 }}
                                                className="hover:bg-neutral-50 transition-colors group relative"
                                            >
                                                <td className="p-4">
                                                    <Link to={`/hotel/admin/bookings/${booking._id}`} className="font-mono text-xs font-medium text-neutral-900 hover:underline">
                                                        #{booking.bookingId || booking._id.slice(-6)}
                                                    </Link>
                                                    <p className="text-xs text-neutral-500 mt-0.5">
                                                        {new Date(booking.createdAt).toLocaleDateString()}
                                                    </p>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-neutral-900">
                                                            {booking.propertyId?.propertyName || 'Deleted hotel'}
                                                        </span>
                                                        <span className="text-xs text-neutral-500">
                                                            {booking.propertyId?.address?.city || 'No city'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-medium text-neutral-900">
                                                            {booking.userId?.name || 'Guest'}
                                                        </p>
                                                        <p className="text-xs text-neutral-500">
                                                            {booking.userId?.email || 'No email'}
                                                        </p>
                                                        <p className="text-xs text-neutral-500">
                                                            {booking.userId?.phone || 'No phone'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs text-neutral-600 flex flex-col gap-1 font-medium">
                                                        <span className="flex items-center gap-1">
                                                            In {booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : '—'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            Out {booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : '—'}
                                                        </span>
                                                        <span className="text-neutral-500 font-normal">
                                                            {booking.totalNights ? `${booking.totalNights} night${booking.totalNights > 1 ? 's' : ''}` : ''}
                                                            {booking.roomTypeId?.name ? ` · ${booking.roomTypeId.name}` : ''}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <BookingStatusBadge status={booking.bookingStatus} />
                                                </td>
                                                <td className="p-4 text-right font-mono text-sm text-neutral-900 tabular-nums">
                                                    ₹{booking.totalAmount?.toLocaleString('en-IN')}
                                                    <p className="font-sans text-[11px] text-neutral-500 capitalize">{booking.paymentStatus || 'pending'}{booking.paymentMethod ? ` · ${booking.paymentMethod}` : ''}</p>
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === booking._id ? null : booking._id); }}
                                                        className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === booking._id && (
                                                        <div className="absolute right-8 top-8 w-48 bg-white border border-neutral-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <Link to={`/hotel/admin/bookings/${booking._id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 text-xs font-medium text-neutral-700">
                                                                <Eye size={14} /> View details
                                                            </Link>
                                                            {(booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'pending') && (
                                                                <button
                                                                    onClick={() => handleAction('cancel', booking)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-medium text-red-600"
                                                                >
                                                                    <XCircle size={14} /> Cancel booking
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-neutral-500 text-xs">
                                                No bookings match these filters
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && bookings.length > 0 && (
                    <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
                        <p className="text-xs text-neutral-500">
                            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalBookings)} of {totalBookings} bookings
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

export default AdminBookings;
