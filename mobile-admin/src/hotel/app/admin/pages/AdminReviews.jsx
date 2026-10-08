/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminReviews.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import { Star, MoreVertical, Trash2, CheckCircle, XCircle, ThumbsUp, Flag, Download } from 'lucide-react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, Div, Link, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  StatusBadge,
  Pagination,
  TableSkeleton,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { saveTextFile } from '../../../../lib/files';
const StarRating = ({ rating }) => (
  <Div className="flex-row gap-0.5" accessibilityLabel={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <UiIcon as={Star} key={star} size={14} className={star <= rating ? 'text-amber-600' : 'text-slate-300'} fill={star <= rating ? '#BB4D00' : 'none'} />
    ))}
  </Div>
);
const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
        setLoadError(null);
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
        setLoadError(error?.response?.data?.message || error?.message || 'Failed to load reviews.');
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
  const hasFilters = !!(filters.status || filters.rating);
  return (
    <AdminPage maxWidth={900}>
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

      <PageHeader
        icon={Star}
        title="Review Management"
        subtitle={`${totalReviews} reviews across all properties — monitor and moderate them here.`}
        breadcrumb={[{ label: 'Hotel' }, { label: 'Reviews' }]}
        actions={
          <Button onClick={handleExportCSV} className={BTN_SECONDARY}>
            <UiIcon as={Download} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Export CSV</Span>
          </Button>
        }
      />

      <Card className="mb-3">
        <Toolbar className="mb-0">
          <Select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className={`${INPUT} flex-1 min-w-[150px]`}>
            <Option value="">All statuses</Option>
            <Option value="approved">Approved</Option>
            <Option value="pending">Pending</Option>
            <Option value="flagged">Flagged</Option>
            <Option value="rejected">Rejected</Option>
          </Select>

          <Select value={filters.rating} onChange={(e) => handleFilterChange('rating', e.target.value)} className={`${INPUT} flex-1 min-w-[150px]`}>
            <Option value="">All ratings</Option>
            <Option value="5">5 Stars</Option>
            <Option value="4">4 Stars</Option>
            <Option value="3">3 Stars</Option>
            <Option value="2">2 Stars</Option>
            <Option value="1">1 Star</Option>
          </Select>
        </Toolbar>
      </Card>

      {loadError ? (
        <ErrorState title="Could not load reviews" message={loadError} onRetry={() => fetchReviews(currentPage, filters)} />
      ) : loading ? (
        <TableSkeleton rows={4} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews found"
          message={hasFilters ? 'No reviews match the current filters.' : 'Guest reviews appear here once they are submitted.'}
          actionLabel={hasFilters ? 'Clear filters' : undefined}
          onAction={hasFilters ? () => setFilters({ status: '', rating: '' }) : undefined}
        />
      ) : (
        <>
          <Div className="gap-3">
            <AnimatePresence>
              {reviews.map((review, index) => (
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
                  style={{ zIndex: activeDropdown === review._id ? 10 : 0 }}
                >
                  <Card>
                    <Div className="flex-row items-start justify-between gap-3">
                      <Div className="flex-1 min-w-0">
                        <Div className="flex-row flex-wrap items-center gap-2 mb-1">
                          <P numberOfLines={1} className="text-base font-semibold text-slate-900">
                            {review.userId?.name || 'Guest'}
                          </P>
                          <StarRating rating={review.rating} />
                          <StatusBadge status={review.status} />
                        </Div>
                        <P numberOfLines={2} className="text-xs text-slate-500 mb-2">
                          Reviewed{' '}
                          <Link to={`/hotel/admin/properties/${review.hotelId?._id}`} className="text-xs font-semibold text-blue-600">
                            {review.hotelId?.name || 'Deleted Hotel'}
                          </Link>{' '}
                          · {new Date(review.createdAt).toLocaleDateString()}
                        </P>

                        <P className="text-sm text-slate-700 mb-3">{review.comment}</P>

                        <Div className="flex-row flex-wrap items-center gap-4">
                          <Div className="flex-row items-center gap-1">
                            <UiIcon as={ThumbsUp} size={14} className="text-slate-400" />
                            <Span className="text-xs text-slate-500">Helpful: {review.helpful || 0}</Span>
                          </Div>
                          {review.reportedCount > 0 ? (
                            <Div className="flex-row items-center gap-1">
                              <UiIcon as={Flag} size={14} className="text-red-600" />
                              <Span className="text-xs font-semibold text-red-600">Reports: {review.reportedCount}</Span>
                            </Div>
                          ) : null}
                        </Div>
                      </Div>

                      <Div className="shrink-0">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === review._id ? null : review._id);
                          }}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                          accessibilityLabel="Review actions"
                        >
                          <UiIcon as={MoreVertical} size={18} className="text-slate-500" />
                        </Button>

                        {activeDropdown === review._id ? (
                          <Div className="absolute right-0 top-12 w-48 bg-white border border-slate-200 rounded-lg z-20 py-1">
                            {review.status !== 'approved' ? (
                              <Button onClick={() => handleApprove(review)} className="w-full flex-row items-center gap-2 px-3 h-11">
                                <UiIcon as={CheckCircle} size={16} className="text-green-700" />
                                <Span className="text-sm font-semibold text-slate-700">Approve</Span>
                              </Button>
                            ) : null}
                            {review.status !== 'rejected' ? (
                              <Button onClick={() => handleReject(review)} className="w-full flex-row items-center gap-2 px-3 h-11">
                                <UiIcon as={XCircle} size={16} className="text-amber-700" />
                                <Span className="text-sm font-semibold text-slate-700">Reject</Span>
                              </Button>
                            ) : null}
                            <Button onClick={() => handleDelete(review)} className="w-full flex-row items-center gap-2 px-3 h-11">
                              <UiIcon as={Trash2} size={16} className="text-red-600" />
                              <Span className="text-sm font-semibold text-red-600">Delete</Span>
                            </Button>
                          </Div>
                        ) : null}
                      </Div>
                    </Div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </Div>

          <Pagination
            page={currentPage}
            pages={totalPages}
            total={totalReviews}
            onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        </>
      )}
    </AdminPage>
  );
};
export default AdminReviews;
