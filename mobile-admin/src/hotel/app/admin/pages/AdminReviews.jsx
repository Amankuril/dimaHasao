/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminReviews.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import {
  Star,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, Div, H2, H3, H4, Link, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { saveTextFile } from '../../../../lib/files';
const StarRating = ({ rating }) => (
  <Div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <UiIcon as={Star} key={star} size={14} className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
    ))}
  </Div>
);
const StatusBadge = ({ status }) => {
  const styles = {
    approved: 'bg-green-100 text-green-700 border-green-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    flagged: 'bg-red-100 text-red-700 border-red-200',
    rejected: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  const icons = {
    approved: <UiIcon as={CheckCircle} size={10} />,
    pending: <UiIcon as={AlertTriangle} size={10} />,
    flagged: <UiIcon as={Flag} size={10} />,
    rejected: <UiIcon as={XCircle} size={10} />,
  };
  return (
    <Div className={`flex items-center gap-1 self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${styles[status] || styles.pending}`}>
      {icons[status] || icons.pending}
      {status}
    </Div>
  );
};
const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalReviews, setTotalReviews] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    status: '',
    rating: '',
  });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {},
  });
  const fetchReviews = useCallback(
    async (page, currentFilters) => {
      try {
        setLoading(true);
        const params = {
          page,
          limit,
          status: currentFilters.status,
          rating: currentFilters.rating,
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
    },
    [limit],
  );
  useEffect(() => {
    fetchReviews(currentPage, filters);
  }, [currentPage, filters, fetchReviews]);
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
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
    setActiveDropdown(null);
    setModalConfig({
      isOpen: true,
      title: 'Approve Review?',
      message: `This will make the review visible to all users.`,
      type: 'success',
      confirmText: 'Approve',
      onConfirm: () => handleUpdateStatus(review._id, 'approved'),
    });
  };
  const handleReject = (review) => {
    setActiveDropdown(null);
    setModalConfig({
      isOpen: true,
      title: 'Reject Review?',
      message: `This review will be hidden from users.`,
      type: 'danger',
      confirmText: 'Reject',
      onConfirm: () => handleUpdateStatus(review._id, 'rejected'),
    });
  };
  const handleDelete = (review) => {
    setActiveDropdown(null);
    setModalConfig({
      isOpen: true,
      title: 'Delete Review?',
      message: `Are you sure you want to permanently delete this review? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete Review',
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
      },
    });
  };
  const handleExportCSV = async () => {
    if (reviews.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['ID', 'User', 'Hotel', 'Rating', 'Comment', 'Status', 'Helpful', 'Reports', 'Date'];
    const csvContent = [
      headers.join(','),
      ...reviews.map((r) =>
        [
          r._id,
          `"${r.userId?.name || 'Guest'}"`,
          `"${r.hotelId?.name || 'Deleted Hotel'}"`,
          r.rating,
          `"${(r.comment || '').replace(/"/g, '""')}"`,
          r.status,
          r.helpful || 0,
          r.reportedCount || 0,
          new Date(r.createdAt).toLocaleDateString(),
        ].join(','),
      ),
    ].join('\n');
    await saveTextFile(`reviews-export-${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv;charset=utf-8;');
    toast.success('CSV exported successfully');
  };
  return (
    <ScrollDiv className="space-y-6 pb-10 uppercase tracking-tight">
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() =>
          setModalConfig({
            ...modalConfig,
            isOpen: false,
          })
        }
        {...modalConfig}
      />

      <Div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Div>
          <H2 className="text-2xl font-bold text-gray-900 uppercase">Review Management ({totalReviews})</H2>
          <P className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Monitor and moderate user reviews across all hotels.</P>
        </Div>
        <Div className="flex gap-2">
          <Button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <UiIcon as={Download} size={14} /> Export CSV
          </Button>
        </Div>
      </Div>

      <Div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <Div className="flex gap-2 w-full md:w-auto">
          <Select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
          >
            <Option value="">All Status</Option>
            <Option value="approved">Approved</Option>
            <Option value="pending">Pending</Option>
            <Option value="flagged">Flagged</Option>
            <Option value="rejected">Rejected</Option>
          </Select>

          <Select
            value={filters.rating}
            onChange={(e) => handleFilterChange('rating', e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
          >
            <Option value="">All Ratings</Option>
            <Option value="5">5 Stars</Option>
            <Option value="4">4 Stars</Option>
            <Option value="3">3 Stars</Option>
            <Option value="2">2 Stars</Option>
            <Option value="1">1 Star</Option>
          </Select>
        </Div>
      </Div>

      <Div className="space-y-4 min-h-[400px]">
        {loading ? (
          [1, 2, 3].map((i) => <Div key={i} className="h-40 bg-gray-50 animate-pulse rounded-2xl"></Div>)
        ) : (
          <AnimatePresence>
            {reviews.length > 0 ? (
              reviews.map((review, index) => (
                <motion.div
                  key={review._id}
                  layout
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                  }}
                  transition={{
                    delay: index * 0.05,
                  }}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative font-bold"
                  style={{ zIndex: activeDropdown === review._id ? 10 : 0 }}
                >
                  <Div className="flex items-start justify-between gap-4">
                    <Div className="flex-1">
                      <Div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <Div>
                          <Div className="flex flex-wrap items-center gap-3 mb-1">
                            <H4 className="font-bold text-gray-900 uppercase tracking-tight">{review.userId?.name || 'Guest'}</H4>
                            <StarRating rating={review.rating} />
                          </Div>
                          <P className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                            Reviewed{' '}
                            <Link to={`/hotel/admin/properties/${review.hotelId?._id}`} className="text-black font-bold hover:underline">
                              {review.hotelId?.name || 'Deleted Hotel'}
                            </Link>{' '}
                            • {new Date(review.createdAt).toLocaleDateString()}
                          </P>
                        </Div>
                        <StatusBadge status={review.status} />
                      </Div>

                      <P className="text-sm text-gray-700 leading-relaxed mb-4 uppercase tracking-tight">{review.comment}</P>

                      <Div className="flex items-center gap-6 text-[10px] font-bold uppercase text-gray-400">
                        <Div className="flex items-center gap-1">
                          <UiIcon as={ThumbsUp} size={14} />
                          <Span>Helpful: {review.helpful || 0}</Span>
                        </Div>
                        {review.reportedCount > 0 && (
                          <Div className="flex items-center gap-1 text-red-600">
                            <UiIcon as={Flag} size={14} />
                            <Span>Reports: {review.reportedCount}</Span>
                          </Div>
                        )}
                      </Div>
                    </Div>

                    <Div className="relative">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === review._id ? null : review._id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                      >
                        <UiIcon as={MoreVertical} size={16} />
                      </Button>

                      {activeDropdown === review._id && (
                        <Div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1">
                          {review.status !== 'approved' && (
                            <Button
                              onClick={() => handleApprove(review)}
                              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-green-600"
                            >
                              <UiIcon as={CheckCircle} size={14} /> Approve
                            </Button>
                          )}
                          {review.status !== 'rejected' && (
                            <Button
                              onClick={() => handleReject(review)}
                              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-amber-600"
                            >
                              <UiIcon as={XCircle} size={14} /> Reject
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDelete(review)}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-600"
                          >
                            <UiIcon as={Trash2} size={14} /> Delete
                          </Button>
                        </Div>
                      )}
                    </Div>
                  </Div>
                </motion.div>
              ))
            ) : (
              <Div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                <UiIcon as={Star} size={48} className="self-center text-gray-300 mb-4" />
                <H3 className="text-[10px] font-bold uppercase text-gray-900 mb-2">No Reviews Found</H3>
                <P className="text-[10px] font-bold uppercase text-gray-500">No reviews to display matching filters.</P>
              </Div>
            )}
          </AnimatePresence>
        )}
      </Div>

      {/* Pagination */}
      {!loading && reviews.length > 0 && (
        <Div className="p-4 border border-gray-100 rounded-2xl bg-white flex flex-col gap-3">
          <P className="text-[10px] font-bold uppercase text-gray-500 tracking-tight">
            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalReviews)} of {totalReviews} reviews
          </P>
          <Div className="flex flex-wrap items-center gap-1">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
            >
              <UiIcon as={ChevronLeft} size={16} />
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 items-center justify-center rounded-lg text-[10px] font-bold uppercase transition-all ${currentPage === i + 1 ? 'bg-black text-white shadow-md' : 'hover:bg-gray-100 text-gray-600 border border-transparent hover:border-gray-200'}`}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
            >
              <UiIcon as={ChevronRight} size={16} />
            </Button>
          </Div>
        </Div>
      )}
    </ScrollDiv>
  );
};
export default AdminReviews;
