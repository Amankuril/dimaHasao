import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, Search, Filter, MoreVertical, Eye, Trash2,
    CheckCircle, XCircle, AlertTriangle, ThumbsUp, ThumbsDown, Flag, Loader2,
    ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';
import StatusDot from '../components/StatusDot';

const StarRating = ({ rating }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                size={14}
                className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-300'}
            />
        ))}
    </div>
);

const StatusBadge = ({ status }) => <StatusDot status={status} />;

const AdminReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalReviews, setTotalReviews] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        status: '',
        rating: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchReviews = useCallback(async (page, currentFilters) => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
                status: currentFilters.status,
                rating: currentFilters.rating
            };
            const data = await adminService.getReviews(params);
            if (data.success) {
                setReviews(data.reviews);
                setTotalReviews(data.total);
                setTotalPages(Math.ceil(data.total / limit));
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchReviews(currentPage, filters);
    }, [currentPage, filters, fetchReviews]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleUpdateStatus = async (reviewId, newStatus) => {
        try {
            const res = await adminService.updateReviewStatus(reviewId, newStatus);
            if (res.success) {
                toast.success(`Review ${newStatus} successfully`);
                fetchReviews(currentPage, filters);
            }
        } catch {
            toast.error('Failed to update review status');
        }
    };

    const handleApprove = (review) => {
        setModalConfig({
            isOpen: true,
            title: 'Approve review?',
            message: `This will make the review visible to all users.`,
            type: 'success',
            confirmText: 'Approve',
            onConfirm: () => handleUpdateStatus(review._id, 'approved')
        });
    };

    const handleReject = (review) => {
        setModalConfig({
            isOpen: true,
            title: 'Reject review?',
            message: `This review will be hidden from users.`,
            type: 'danger',
            confirmText: 'Reject',
            onConfirm: () => handleUpdateStatus(review._id, 'rejected')
        });
    };

    const handleDelete = (review) => {
        setModalConfig({
            isOpen: true,
            title: 'Delete review?',
            message: `Are you sure you want to permanently delete this review? This action cannot be undone.`,
            type: 'danger',
            confirmText: 'Delete review',
            onConfirm: async () => {
                try {
                    const res = await adminService.deleteReview(review._id);
                    if (res.success) {
                        toast.success('Review deleted successfully');
                        fetchReviews(currentPage, filters);
                    }
                } catch {
                    toast.error('Failed to delete review');
                }
            }
        });
    };

    const handleExportCSV = () => {
        if (reviews.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'User', 'Hotel', 'Rating', 'Comment', 'Status', 'Helpful', 'Reports', 'Date'];
        const csvContent = [
            headers.join(','),
            ...reviews.map(r => [
                r._id,
                `"${r.userId?.name || 'Guest'}"`,
                `"${r.hotelId?.name || 'Deleted hotel'}"`,
                r.rating,
                `"${(r.comment || '').replace(/"/g, '""')}"`,
                r.status,
                r.helpful || 0,
                r.reportedCount || 0,
                new Date(r.createdAt).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reviews-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    return (
        <div className="space-y-6 pb-10" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-medium text-neutral-900">Review management ({totalReviews})</h2>
                    <p className="mt-1 text-sm text-neutral-500">Guest reviews waiting for moderation and already published</p>
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
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-neutral-50 border border-transparent rounded-lg text-sm outline-none focus:bg-white focus:border-neutral-400 transition-colors"
                    >
                        <option value="">All statuses</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="flagged">Flagged</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    <select
                        value={filters.rating}
                        onChange={(e) => handleFilterChange('rating', e.target.value)}
                        className="px-4 py-2 bg-neutral-50 border border-transparent rounded-lg text-sm outline-none focus:bg-white focus:border-neutral-400 transition-colors"
                    >
                        <option value="">All ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4 min-h-[400px]">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-40 bg-neutral-50 animate-pulse rounded-2xl"></div>)
                ) : (
                    <AnimatePresence>
                        {reviews.length > 0 ? (
                            reviews.map((review, index) => (
                                <motion.div
                                    key={review._id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="bg-white border border-neutral-900/[0.08] rounded-xl p-6 hover:shadow-md transition-shadow relative font-medium"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="font-medium text-neutral-900">{review.userId?.name || 'Guest'}</h4>
                                                        <StarRating rating={review.rating} />
                                                    </div>
                                                    <p className="text-xs text-neutral-500">
                                                        Reviewed <Link to={`/hotel/admin/properties/${review.hotelId?._id}`} className="text-black font-medium hover:underline">{review.hotelId?.name || 'Deleted hotel'}</Link> • {new Date(review.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <StatusBadge status={review.status} />
                                            </div>

                                            <p className="text-sm text-neutral-700 leading-relaxed mb-4">{review.comment}</p>

                                            <div className="flex items-center gap-6 text-xs text-neutral-500">
                                                <span className="flex items-center gap-1">
                                                    <ThumbsUp size={14} />
                                                    Helpful: {review.helpful || 0}
                                                </span>
                                                {review.reportedCount > 0 && (
                                                    <span className="flex items-center gap-1 text-red-600">
                                                        <Flag size={14} />
                                                        Reports: {review.reportedCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === review._id ? null : review._id); }}
                                                className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-black transition-colors"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {activeDropdown === review._id && (
                                                <div className="absolute right-0 top-10 w-48 bg-white border border-neutral-200 rounded-lg shadow-xl z-20 py-1">
                                                    {review.status !== 'approved' && (
                                                        <button
                                                            onClick={() => handleApprove(review)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 text-xs font-medium text-green-600"
                                                        >
                                                            <CheckCircle size={14} /> Approve
                                                        </button>
                                                    )}
                                                    {review.status !== 'rejected' && (
                                                        <button
                                                            onClick={() => handleReject(review)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 text-xs font-medium text-amber-600"
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(review)}
                                                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-medium text-red-600"
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center">
                                <Star size={48} className="mx-auto text-neutral-300 mb-4" />
                                <h3 className="text-xs font-medium text-neutral-900 mb-2">No reviews found</h3>
                                <p className="text-xs text-neutral-500">
                                    No reviews to display matching filters.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Pagination */}
            {!loading && reviews.length > 0 && (
                <div className="p-4 border border-neutral-100 rounded-2xl bg-white flex items-center justify-between">
                    <p className="text-xs text-neutral-500">
                        Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalReviews)} of {totalReviews} reviews
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
    );
};

export default AdminReviews;
