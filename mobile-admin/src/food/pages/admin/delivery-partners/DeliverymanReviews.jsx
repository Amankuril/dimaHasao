/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/DeliverymanReviews.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Search, Download, ChevronDown, Star, ArrowUpDown, Settings, FileText, FileSpreadsheet, Code, Check, Columns, Loader2, Eye } from 'lucide-react-native';
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
import { A, Button, Div, H1, H3, Input, Label, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
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
  const getRatingBadge = (rating) => {
    return (
      <Div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg w-fit">
        <Span className="text-sm font-bold text-amber-700 leading-none">{rating}</Span>
        <UiIcon as={Star} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
      </Div>
    );
  };
  const renderStars = (rating) => {
    const stars = [];
    const count = Math.floor(rating || 0);
    for (let i = 0; i < count; i++) {
      stars.push(<UiIcon as={Star} key={i} className="w-5 h-5 fill-amber-500 text-amber-500" />);
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
    si: 80,
    orderId: 150,
    deliveryman: 180,
    deliverymanId: 200,
    customer: 180,
    review: 240,
    rating: 120,
    date: 180,
  };
  const tableCols = Object.keys(COLUMN_WIDTHS)
    .filter((key) => visibleColumns[key])
    .map((key) => COLUMN_WIDTHS[key]);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-3">
              <UiIcon as={Star} className="w-5 h-5 text-orange-500" />
              <Div className="flex items-center gap-2">
                <H1 className="text-2xl font-bold text-slate-900">Deliveryman Reviews</H1>
                <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
                  {isLoading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : totalItems}
                </Span>
              </Div>
            </Div>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Ex : search delivery man"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                    <UiIcon as={Download} className="w-4 h-4" />
                    <Span className="text-black font-bold">Export</Span>
                    <UiIcon as={ChevronDown} className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                >
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                    <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                    <UiIcon as={FileSpreadsheet} className="w-4 h-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                    <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">
                    <UiIcon as={Code} className="w-4 h-4 mr-2" />
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
              >
                <UiIcon as={Settings} className="w-5 h-5" />
              </Button>
            </Div>
          </Div>

          <Div>
            {isLoading ? (
              <Div className="space-y-3 py-2">
                {Array.from({
                  length: 6,
                }).map((_, idx) => (
                  <Div key={idx} className="flex items-center gap-4 px-2 py-3 border-b border-slate-100">
                    <Span className="w-8 h-4 rounded bg-slate-200 animate-pulse" />
                    <Span className="w-24 h-4 rounded bg-slate-200 animate-pulse" />
                    <Span className="w-32 h-4 rounded bg-slate-200 animate-pulse" />
                    <Span className="flex-1 h-4 rounded bg-slate-200 animate-pulse" />
                    <Span className="w-20 h-6 rounded-lg bg-slate-200 animate-pulse" />
                    <Span className="w-28 h-4 rounded bg-slate-200 animate-pulse" />
                  </Div>
                ))}
              </Div>
            ) : reviews.length === 0 ? (
              <Div className="text-center py-12">
                <P className="text-slate-500">No reviews found</P>
              </Div>
            ) : (
              <Table className="w-full" cols={tableCols}>
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    {visibleColumns.si && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>S.No.</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.orderId && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Order ID</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.deliveryman && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Deliveryman</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.deliverymanId && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Delivery Boy ID</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.customer && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Customer</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.review && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Review</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.rating && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Rating</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.date && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Date & Time</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {reviews.map((review, index) => (
                    <Tr key={review.sl || review.orderId || index} className="hover:bg-slate-50 transition-colors">
                      {visibleColumns.si && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Span>
                        </Td>
                      )}
                      {visibleColumns.orderId && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm font-mono text-slate-700">{review.orderId || 'N/A'}</Span>
                        </Td>
                      )}
                      {visibleColumns.deliveryman && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <A href={`/admin/delivery-partners/${review.deliverymanId}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                            {review.deliveryman}
                          </A>
                        </Td>
                      )}
                      {visibleColumns.deliverymanId && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Span className="text-sm font-mono text-slate-600">
                            {review.deliverymanId
                              ? typeof review.deliverymanId === 'object'
                                ? review.deliverymanId.toString()
                                : review.deliverymanId.toString()
                              : 'N/A'}
                          </Span>
                        </Td>
                      )}
                      {visibleColumns.customer && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <A href={`/admin/users/${review.customerId}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                            {review.customer}
                          </A>
                        </Td>
                      )}
                      {visibleColumns.review && (
                        <Td className="px-6 py-4">
                          <Div className="flex items-center gap-2">
                            <Span className="text-sm text-slate-700 flex-1 truncate max-w-xs">{review.review || 'No review text'}</Span>
                            {review.review && review.review.trim() && (
                              <Button
                                onClick={() => {
                                  setSelectedReview(review);
                                  setIsReviewModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900 flex-shrink-0"
                              >
                                <UiIcon as={Eye} className="w-4 h-4" />
                              </Button>
                            )}
                          </Div>
                        </Td>
                      )}
                      {visibleColumns.rating && <Td className="px-6 py-4 whitespace-nowrap">{getRatingBadge(review.rating)}</Td>}
                      {visibleColumns.date && (
                        <Td className="px-6 py-4 whitespace-nowrap">
                          <Div className="flex flex-col">
                            <Span className="text-sm text-slate-700">{formatDateTime(review.submittedAt || review.deliveredAt)}</Span>
                          </Div>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Div>

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
          />
        </Div>
      </Div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Settings} className="w-5 h-5" />
              Table Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6 space-y-4">
            <Div>
              <H3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <UiIcon as={Columns} className="w-4 h-4" />
                Visible Columns
              </H3>
              <Div className="space-y-2">
                {Object.entries(columnsConfig).map(([key, label]) => (
                  <Label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <Span className="text-sm text-slate-700">{label}</Span>
                    {visibleColumns[key] && <UiIcon as={Check} className="w-4 h-4 text-emerald-600 ml-auto" />}
                  </Label>
                ))}
              </Div>
            </Div>
            <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={resetColumns}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
              >
                Apply
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>

      {/* Review Detail Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UiIcon as={Eye} className="w-5 h-5 text-slate-600" />
              Review Details
            </DialogTitle>
          </DialogHeader>

          {selectedReview && (
            <Div className="px-6 py-6 space-y-6">
              <Div className="grid grid-cols-2 gap-4">
                <Div className="bg-slate-50 rounded-lg p-4">
                  <P className="text-xs text-slate-500 mb-1">Order ID</P>
                  <P className="text-sm font-semibold text-slate-900 font-mono">{selectedReview.orderId || 'N/A'}</P>
                </Div>
                <Div className="bg-slate-50 rounded-lg p-4">
                  <P className="text-xs text-slate-500 mb-1">Delivery Boy ID</P>
                  <P className="text-sm font-semibold text-slate-900 font-mono">
                    {selectedReview.deliverymanId
                      ? typeof selectedReview.deliverymanId === 'object'
                        ? selectedReview.deliverymanId.toString()
                        : selectedReview.deliverymanId.toString()
                      : 'N/A'}
                  </P>
                </Div>
              </Div>

              <Div className="grid grid-cols-2 gap-4">
                <Div className="bg-blue-50 rounded-lg p-4">
                  <P className="text-xs text-blue-600 mb-1">Deliveryman</P>
                  <A href={`/admin/delivery-partners/${selectedReview.deliverymanId}`} className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                    {selectedReview.deliveryman}
                  </A>
                  {selectedReview.deliverymanPhone && <P className="text-xs text-blue-500 mt-1">{selectedReview.deliverymanPhone}</P>}
                </Div>
                <Div className="bg-purple-50 rounded-lg p-4">
                  <P className="text-xs text-purple-600 mb-1">Customer</P>
                  <A href={`/admin/users/${selectedReview.customerId}`} className="text-sm font-semibold text-purple-700 hover:text-purple-800">
                    {selectedReview.customer}
                  </A>
                  {selectedReview.customerPhone && <P className="text-xs text-purple-500 mt-1">{selectedReview.customerPhone}</P>}
                </Div>
              </Div>

              <Div className="bg-orange-50 rounded-lg p-4">
                <P className="text-xs text-orange-600 mb-2 font-semibold">Rating</P>
                <Div className="flex items-center gap-3">
                  <Div className="flex items-center gap-1">{renderStars(selectedReview.rating)}</Div>
                  <Span className="text-lg font-bold text-orange-700">{selectedReview.rating} / 5</Span>
                </Div>
              </Div>

              <Div className="bg-slate-50 rounded-lg p-4">
                <P className="text-xs text-slate-600 mb-2 font-semibold">Review Feedback</P>
                <P className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{selectedReview.review || 'No review text provided'}</P>
              </Div>

              <Div className="bg-slate-50 rounded-lg p-4">
                <P className="text-xs text-slate-600 mb-1">Submitted At</P>
                <P className="text-sm font-medium text-slate-900">{formatDateTime(selectedReview.submittedAt || selectedReview.deliveredAt)}</P>
                {selectedReview.deliveredAt && (
                  <>
                    <P className="text-xs text-slate-600 mb-1 mt-3">Delivered At</P>
                    <P className="text-sm font-medium text-slate-900">{formatDateTime(selectedReview.deliveredAt)}</P>
                  </>
                )}
              </Div>
            </Div>
          )}

          <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-200">
            <Button
              onClick={() => setIsReviewModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
