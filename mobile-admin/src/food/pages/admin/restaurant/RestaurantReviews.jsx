/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantReviews.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import {
  Download,
  ChevronDown,
  Star,
  Settings,
  FileText,
  FileSpreadsheet,
  Code,
  Check,
  Columns,
  Eye,
  Utensils,
} from 'lucide-react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import {
  exportReviewsToCSV,
  exportReviewsToExcel,
  exportReviewsToPDF,
  exportReviewsToJSON,
} from '../../../components/admin/deliveryman/deliverymanExportUtils';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { AdminPage, PageHeader, Card, Toolbar, DataTable, THead, TBody, Row, Cell, TableSkeleton, EmptyState, INPUT, BTN_SECONDARY, BTN_PRIMARY, BTN_TEXT_SECONDARY, BTN_TEXT_PRIMARY } from '../../../../admin/ui';
import { alert } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function RestaurantReviews() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_restaurant_reviews_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    orderId: true,
    restaurant: true,
    customer: true,
    review: true,
    rating: true,
    date: true,
  });
  const filteredReviews = reviews;
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        const response = await adminAPI.getRestaurantReviews({
          search: debouncedSearch || undefined,
          page: currentPage,
          limit: pageSize,
        });
        if (response?.data?.success && response?.data?.data?.reviews) {
          setReviews(response.data.data.reviews);
          setTotalItems(response?.data?.data?.total ?? response?.data?.total ?? response.data.data.reviews.length);
        } else {
          setReviews([]);
          setTotalItems(0);
        }
      } catch (error) {
        debugError('Error fetching restaurant reviews:', error);
        setReviews([]);
        setTotalItems(0);
        toast.error('Failed to load restaurant reviews');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, [debouncedSearch, currentPage, pageSize]);
  const handleExport = (format) => {
    if (filteredReviews.length === 0) {
      alert('No data to export');
      return;
    }
    // Reuse deliveryman export utils or create new ones if needed
    switch (format) {
      case 'csv':
        exportReviewsToCSV(filteredReviews);
        break;
      case 'excel':
        exportReviewsToExcel(filteredReviews);
        break;
      case 'pdf':
        exportReviewsToPDF(filteredReviews);
        break;
      case 'json':
        exportReviewsToJSON(filteredReviews);
        break;
    }
  };
  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      orderId: true,
      restaurant: true,
      customer: true,
      review: true,
      rating: true,
      date: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    orderId: 'Order ID',
    restaurant: 'Restaurant',
    customer: 'Customer',
    review: 'Review',
    rating: 'Rating',
    date: 'Date & Time',
  };
  const getRatingBadge = (rating) => (
    <Div className="flex-row items-center self-start gap-1.5 px-2 py-1 rounded-full bg-amber-50">
      <UiIcon as={Star} size={12} className="text-amber-600" fill="#BB4D00" />
      <Span className="text-xs font-semibold text-amber-700">{rating ?? 0}</Span>
    </Div>
  );
  const renderStars = (rating) => {
    const stars = [];
    const count = Math.floor(rating || 0);
    for (let i = 0; i < count; i++) {
      stars.push(<UiIcon as={Star} key={i} size={18} className="text-amber-600" fill="#BB4D00" />);
    }
    return stars;
  };
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = date
        .toLocaleDateString('en-US', {
          month: 'short',
        })
        .toUpperCase();
      const year = date.getFullYear();
      const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${day} ${month} ${year}, ${time}`;
    } catch (e) {
      return 'Invalid Date';
    }
  };
  const COL_W = { si: 60, orderId: 130, restaurant: 180, customer: 160, review: 220, rating: 110, date: 170 };
  const COL_LABEL = { si: 'SI', orderId: 'Order ID', restaurant: 'Restaurant', customer: 'Customer', review: 'Review', rating: 'Rating', date: 'Date & time' };
  const shownKeys = Object.keys(COL_W).filter((k) => visibleColumns[k]);
  const tableCols = shownKeys.map((k) => COL_W[k]);
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Utensils}
        title="Restaurant Reviews"
        subtitle={isLoading ? 'Loading reviews…' : `${totalItems} review${totalItems === 1 ? '' : 's'} from customers`}
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Reviews' }]}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className={BTN_SECONDARY}>
                  <UiIcon as={Download} size={16} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                  <UiIcon as={ChevronDown} size={14} className="text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg">
                <DropdownMenuLabel>Export format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <UiIcon as={FileText} size={16} className="mr-2 text-slate-600" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <UiIcon as={FileSpreadsheet} size={16} className="mr-2 text-slate-600" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <UiIcon as={FileText} size={16} className="mr-2 text-slate-600" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <UiIcon as={Code} size={16} className="mr-2 text-slate-600" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setIsSettingsOpen(true)} className={BTN_SECONDARY} accessibilityLabel="Table column settings">
              <UiIcon as={Settings} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Columns</Span>
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Input
            type="search"
            placeholder="Search by restaurant or customer"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
        </Toolbar>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews found"
          message={debouncedSearch ? 'No review matches this search. Try another restaurant or customer name.' : 'Reviews appear here once customers rate their orders.'}
        />
      ) : tableCols.length === 0 ? (
        <EmptyState icon={Columns} title="Every column is hidden" message="Turn a column back on to see the reviews." actionLabel="Reset columns" onAction={resetColumns} />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={shownKeys.map((k) => COL_LABEL[k])} />
          <TBody>
            {filteredReviews.map((review, idx) => (
              <Row key={review.sl || review.orderId} last={idx === filteredReviews.length - 1}>
                {shownKeys.map((key) => {
                  const w = COL_W[key];
                  if (key === 'si') return <Cell key={key} width={w} numberOfLines={1}>{String(review.sl ?? '')}</Cell>;
                  if (key === 'orderId') return <Cell key={key} width={w} numberOfLines={1}>{String(review.orderId ?? '')}</Cell>;
                  if (key === 'restaurant') return <Cell key={key} width={w}>{String(review.restaurant ?? '')}</Cell>;
                  if (key === 'customer') return <Cell key={key} width={w}>{String(review.customer ?? '')}</Cell>;
                  if (key === 'review')
                    return (
                      <Cell key={key} width={w}>
                        <Div className="flex-row items-center gap-1">
                          <Span className="text-sm text-slate-700 flex-1">{review.review || 'No review'}</Span>
                          <Button
                            onClick={() => {
                              setSelectedReview(review);
                              setIsReviewModalOpen(true);
                            }}
                            className="w-11 h-11 rounded-lg items-center justify-center shrink-0"
                            accessibilityLabel="View full review"
                          >
                            <UiIcon as={Eye} size={16} className="text-slate-600" />
                          </Button>
                        </Div>
                      </Cell>
                    );
                  if (key === 'rating')
                    return (
                      <Cell key={key} width={w}>
                        {getRatingBadge(review.rating)}
                      </Cell>
                    );
                  return <Cell key={key} width={w}>{formatDateTime(review.submittedAt)}</Cell>;
                })}
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      <AdminListPagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          try {
            localStorage.setItem('admin_restaurant_reviews_pageSize', String(size));
          } catch {}
          setCurrentPage(1);
        }}
        itemLabel="reviews"
      />

      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle>Review details</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <Div className="px-4 py-4 gap-3">
              <Div className="flex-row flex-wrap gap-3">
                {[
                  ['Order ID', String(selectedReview.orderId ?? '')],
                  ['Restaurant', String(selectedReview.restaurant ?? '')],
                  ['Customer', String(selectedReview.customer ?? '')],
                ].map(([label, value]) => (
                  <Div key={label} className="flex-1 min-w-[140px] rounded-lg bg-slate-50 p-3 gap-1">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
                    <Span className="text-sm font-semibold text-slate-900">{value}</Span>
                  </Div>
                ))}
              </Div>
              <Div className="rounded-lg bg-slate-50 p-3 gap-1">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rating</Span>
                <Div className="flex-row items-center gap-2">
                  <Div className="flex-row items-center gap-0.5">{renderStars(selectedReview.rating)}</Div>
                  <Span className="text-base font-semibold text-slate-900">{selectedReview.rating} / 5</Span>
                </Div>
              </Div>
              <Div className="rounded-lg bg-slate-50 p-3 gap-1">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review feedback</Span>
                <Span className="text-sm text-slate-700">{selectedReview.review || 'No review text provided'}</Span>
              </Div>
              <Div className="rounded-lg bg-slate-50 p-3 gap-1">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted at</Span>
                <Span className="text-sm text-slate-700">{formatDateTime(selectedReview.submittedAt)}</Span>
              </Div>
            </Div>
          )}
          <DialogFooter className="px-4 pb-4 pt-3 border-t border-slate-200">
            <Button onClick={() => setIsReviewModalOpen(false)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Close</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-lg bg-white p-0 overflow-hidden">
          <DialogHeader className="border-b border-slate-200 px-4 py-3">
            <DialogTitle>Review table columns</DialogTitle>
          </DialogHeader>
          <Div className="gap-2 px-4 py-4">
            {Object.entries(columnsConfig).map(([columnKey, label]) => (
              <Button
                key={columnKey}
                type="button"
                onClick={() => toggleColumn(columnKey)}
                className="w-full flex-row items-center justify-between rounded-lg border border-slate-200 bg-white px-4 h-11"
                accessibilityLabel={`Toggle ${label} column`}
              >
                <Span className="text-sm font-medium text-slate-700 flex-1">{label}</Span>
                <Div className={`w-5 h-5 items-center justify-center rounded border ${visibleColumns[columnKey] ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                  {visibleColumns[columnKey] ? <UiIcon as={Check} size={14} className="text-white" /> : null}
                </Div>
              </Button>
            ))}
          </Div>
          <DialogFooter className="border-t border-slate-200 px-4 py-3 flex-row justify-end gap-2">
            <Button type="button" onClick={resetColumns} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
            </Button>
            <Button type="button" onClick={() => setIsSettingsOpen(false)} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Done</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
