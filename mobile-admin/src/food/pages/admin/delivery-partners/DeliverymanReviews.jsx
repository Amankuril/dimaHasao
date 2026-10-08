/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/DeliverymanReviews.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Download, ChevronDown, Star, Settings, FileText, FileSpreadsheet, Code, Check, Columns, Eye } from 'lucide-react-native';
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
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { A, Button, CheckBox, Div, Input, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const debugError = (...args) => {};
export default function DeliverymanReviews() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_deliveryman_reviews_pageSize')) || 20;
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
    deliveryman: true,
    deliverymanId: true,
    customer: true,
    review: true,
    rating: true,
    date: true,
  });
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
        const response = await adminAPI.getDeliverymanReviews({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch || undefined,
        });
        if (response?.data?.success && response?.data?.data?.reviews) {
          setReviews(response.data.data.reviews);
          setTotalItems(response.data.data.total ?? response.data.data.pagination?.total ?? response.data.data.reviews.length);
        } else {
          setReviews([]);
          setTotalItems(0);
          toast.error('Failed to load reviews: Unexpected response format');
        }
      } catch (error) {
        debugError('Error fetching deliveryman reviews:', error);
        setReviews([]);
        setTotalItems(0);
        const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to load deliveryman reviews';
        toast.error(`Error: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, [currentPage, pageSize, debouncedSearch]);
  const handleExport = (format) => {
    if (reviews.length === 0) {
      alert('No data to export');
      return;
    }
    switch (format) {
      case 'csv':
        exportReviewsToCSV(reviews);
        break;
      case 'excel':
        exportReviewsToExcel(reviews);
        break;
      case 'pdf':
        exportReviewsToPDF(reviews);
        break;
      case 'json':
        exportReviewsToJSON(reviews);
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
      deliveryman: true,
      deliverymanId: true,
      customer: true,
      review: true,
      rating: true,
      date: true,
    });
  };
  const columnsConfig = {
    si: 'S.No.',
    orderId: 'Order ID',
    deliveryman: 'Deliveryman',
    deliverymanId: 'Delivery Boy ID',
    customer: 'Customer',
    review: 'Review',
    rating: 'Rating',
    date: 'Date & Time',
  };
  const renderStars = (rating) => {
    const stars = [];
    const count = Math.floor(rating || 0);
    for (let i = 0; i < count; i++) {
      stars.push(<UiIcon as={Star} key={i} size={18} className="text-amber-500" fill="#F0B100" />);
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
    } catch {
      return 'Invalid Date';
    }
  };
  const COLUMN_WIDTHS = {
    si: 60,
    orderId: 140,
    deliveryman: 170,
    deliverymanId: 190,
    customer: 170,
    review: 240,
    rating: 110,
    date: 170,
  };
  const activeKeys = Object.keys(COLUMN_WIDTHS).filter((key) => visibleColumns[key]);
  const tableCols = activeKeys.map((key) => COLUMN_WIDTHS[key]);
  const tableLabels = activeKeys.map((key) => columnsConfig[key]);
  const widthOf = (key) => COLUMN_WIDTHS[key];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Star}
        title="Deliveryman Reviews"
        subtitle={isLoading ? 'Loading reviews…' : `${totalItems} customer review${totalItems === 1 ? '' : 's'} of delivery partners`}
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery partners' }, { label: 'Reviews' }]}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className={BTN_SECONDARY}>
                  <UiIcon as={Download} size={16} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                  <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <UiIcon as={FileSpreadsheet} size={16} className="mr-2 text-slate-500" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <UiIcon as={Code} size={16} className="mr-2 text-slate-500" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setIsSettingsOpen(true)} accessibilityLabel="Table settings" className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center">
              <UiIcon as={Settings} size={18} className="text-slate-600" />
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Input
            type="text"
            placeholder="Search delivery partner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
        </Toolbar>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          message={debouncedSearch ? 'No review matches this search.' : 'Reviews appear here once customers rate their deliveries.'}
        />
      ) : tableCols.length === 0 ? (
        <EmptyState
          icon={Columns}
          title="All columns are hidden"
          message="Turn a column back on to see the reviews."
          actionLabel="Table settings"
          onAction={() => setIsSettingsOpen(true)}
        />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={tableLabels} />
          <TBody>
            {reviews.map((review, index) => (
              <Row key={review.sl || review.orderId || index} last={index === reviews.length - 1}>
                {visibleColumns.si && <Cell width={widthOf('si')}>{String((currentPage - 1) * pageSize + index + 1)}</Cell>}
                {visibleColumns.orderId && <Cell width={widthOf('orderId')}>{review.orderId || 'N/A'}</Cell>}
                {visibleColumns.deliveryman && (
                  <Cell width={widthOf('deliveryman')}>
                    <A href={`/admin/delivery-partners/${review.deliverymanId}`} className="text-sm font-medium text-blue-600">
                      {review.deliveryman}
                    </A>
                  </Cell>
                )}
                {visibleColumns.deliverymanId && (
                  <Cell width={widthOf('deliverymanId')}>{review.deliverymanId ? String(review.deliverymanId) : 'N/A'}</Cell>
                )}
                {visibleColumns.customer && (
                  <Cell width={widthOf('customer')}>
                    <A href={`/admin/users/${review.customerId}`} className="text-sm font-medium text-blue-600">
                      {review.customer}
                    </A>
                  </Cell>
                )}
                {visibleColumns.review && (
                  <Cell width={widthOf('review')}>
                    <Div className="flex-row items-center gap-2">
                      <Span className="text-sm text-slate-700 flex-1" numberOfLines={2}>
                        {review.review || 'No review text'}
                      </Span>
                      {review.review && review.review.trim() ? (
                        <Button
                          onClick={() => {
                            setSelectedReview(review);
                            setIsReviewModalOpen(true);
                          }}
                          accessibilityLabel="View full review"
                          className="w-11 h-11 rounded-lg items-center justify-center shrink-0"
                        >
                          <UiIcon as={Eye} size={16} className="text-slate-500" />
                        </Button>
                      ) : null}
                    </Div>
                  </Cell>
                )}
                {visibleColumns.rating && (
                  <Cell width={widthOf('rating')}>
                    <StatusBadge tone="warning" label={`${review.rating ?? '—'} ★`} />
                  </Cell>
                )}
                {visibleColumns.date && <Cell width={widthOf('date')}>{formatDateTime(review.submittedAt || review.deliveredAt)}</Cell>}
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
            localStorage.setItem('admin_deliveryman_reviews_pageSize', String(size));
          } catch {
            /* ignore */
          }
        }}
        itemLabel="reviews"
        className="mt-3 rounded-xl border border-slate-200"
      />

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-5 gap-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Table Settings</DialogTitle>
          </DialogHeader>
          <SectionTitle className="mb-1">Visible columns</SectionTitle>
          <ScrollDiv className="max-h-72" contentClassName="gap-1">
            {Object.entries(columnsConfig).map(([key, label]) => (
              <Label key={key} className="flex-row items-center gap-3 h-11 px-2 rounded-lg" onClick={() => toggleColumn(key)}>
                <CheckBox checked={visibleColumns[key]} onChange={() => toggleColumn(key)} />
                <Span className="text-sm text-slate-700 flex-1">{label}</Span>
                {visibleColumns[key] ? <UiIcon as={Check} size={16} className="text-blue-600" /> : null}
              </Label>
            ))}
          </ScrollDiv>
          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button onClick={resetColumns} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
            </Button>
            <Button onClick={() => setIsSettingsOpen(false)} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Detail Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-5 gap-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Review Details</DialogTitle>
          </DialogHeader>

          {selectedReview && (
            <Div className="gap-3">
              <Card className="gap-3" padded>
                <Div className="flex-row flex-wrap gap-4">
                  <Div className="flex-1 min-w-[140px] gap-0.5">
                    <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order ID</P>
                    <P className="text-sm font-medium text-slate-900">{selectedReview.orderId || 'N/A'}</P>
                  </Div>
                  <Div className="flex-1 min-w-[140px] gap-0.5">
                    <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery Boy ID</P>
                    <P className="text-sm font-medium text-slate-900">{selectedReview.deliverymanId ? String(selectedReview.deliverymanId) : 'N/A'}</P>
                  </Div>
                </Div>
                <Div className="flex-row flex-wrap gap-4">
                  <Div className="flex-1 min-w-[140px] gap-0.5">
                    <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deliveryman</P>
                    <A href={`/admin/delivery-partners/${selectedReview.deliverymanId}`} className="text-sm font-medium text-blue-600">
                      {selectedReview.deliveryman}
                    </A>
                    {selectedReview.deliverymanPhone ? <P className="text-xs text-slate-500">{selectedReview.deliverymanPhone}</P> : null}
                  </Div>
                  <Div className="flex-1 min-w-[140px] gap-0.5">
                    <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</P>
                    <A href={`/admin/users/${selectedReview.customerId}`} className="text-sm font-medium text-blue-600">
                      {selectedReview.customer}
                    </A>
                    {selectedReview.customerPhone ? <P className="text-xs text-slate-500">{selectedReview.customerPhone}</P> : null}
                  </Div>
                </Div>
              </Card>

              <Card className="gap-2">
                <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rating</P>
                <Div className="flex-row items-center gap-2">
                  <Div className="flex-row items-center gap-1">{renderStars(selectedReview.rating)}</Div>
                  <Span className="text-base font-semibold text-slate-900">{selectedReview.rating} / 5</Span>
                </Div>
              </Card>

              <Card className="gap-2">
                <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review feedback</P>
                <P className="text-sm text-slate-700">{selectedReview.review || 'No review text provided'}</P>
              </Card>

              <Card className="gap-2">
                <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted at</P>
                <P className="text-sm text-slate-900">{formatDateTime(selectedReview.submittedAt || selectedReview.deliveredAt)}</P>
                {selectedReview.deliveredAt ? (
                  <>
                    <P className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-1">Delivered at</P>
                    <P className="text-sm text-slate-900">{formatDateTime(selectedReview.deliveredAt)}</P>
                  </>
                ) : null}
              </Card>
            </Div>
          )}

          <DialogFooter className="flex-row justify-end pt-2">
            <Button onClick={() => setIsReviewModalOpen(false)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Close</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
