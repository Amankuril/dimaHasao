/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantReviews.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  Star,
  ArrowUpDown,
  Settings,
  FileText,
  FileSpreadsheet,
  Code,
  Check,
  Columns,
  Loader2,
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
import { Button, Div, H1, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
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
  const getRatingBadge = (rating) => {
    const stars = [];
    const count = Math.floor(rating || 0);
    for (let i = 0; i < count; i++) {
      stars.push(<UiIcon as={Star} key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />);
    }
    return (
      <Div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg w-fit">
        <Div className="flex items-center gap-0.5">{stars}</Div>
        <Span className="text-xs font-bold text-amber-700 leading-none">{rating}</Span>
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
    } catch (e) {
      return 'Invalid Date';
    }
  };
  const tableCols = [
    visibleColumns.si && 70,
    visibleColumns.orderId && 130,
    visibleColumns.restaurant && 180,
    visibleColumns.customer && 170,
    visibleColumns.review && 240,
    visibleColumns.rating && 120,
    visibleColumns.date && 170,
  ].filter(Boolean);
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-3">
              <UiIcon as={Utensils} className="w-5 h-5 text-emerald-500" />
              <Div className="flex items-center gap-2">
                <H1 className="text-2xl font-bold text-slate-900">Restaurant Reviews</H1>
                <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
                  {isLoading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : totalItems}
                </Span>
              </Div>
            </Div>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Search by restaurant or customer"
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
              <Div className="flex items-center justify-center py-12">
                <UiIcon as={Loader2} className="w-6 h-6 animate-spin text-slate-400" />
                <Span className="ml-2 text-sm text-slate-600">Loading reviews...</Span>
              </Div>
            ) : filteredReviews.length === 0 ? (
              <Div className="text-center py-12">
                <P className="text-slate-500">No reviews found</P>
              </Div>
            ) : (
              <Table className="w-full" cols={tableCols}>
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    {visibleColumns.si && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</Th>}
                    {visibleColumns.orderId && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Order ID</Th>}
                    {visibleColumns.restaurant && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Restaurant</Th>
                    )}
                    {visibleColumns.customer && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Customer</Th>}
                    {visibleColumns.review && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Review</Th>}
                    {visibleColumns.rating && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Rating</Th>}
                    {visibleColumns.date && <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Date & Time</Th>}
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {filteredReviews.map((review) => (
                    <Tr key={review.sl || review.orderId} className="hover:bg-slate-50 transition-colors">
                      {visibleColumns.si && <Td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{review.sl}</Td>}
                      {visibleColumns.orderId && <Td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-700">{review.orderId}</Td>}
                      {visibleColumns.restaurant && <Td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">{review.restaurant}</Td>}
                      {visibleColumns.customer && <Td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{review.customer}</Td>}
                      {visibleColumns.review && (
                        <Td className="px-6 py-4">
                          <Div className="flex items-center gap-2">
                            <Span className="text-sm text-slate-700 truncate max-w-xs">{review.review || 'No review'}</Span>
                            <Button
                              onClick={() => {
                                setSelectedReview(review);
                                setIsReviewModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                            >
                              <UiIcon as={Eye} className="w-4 h-4" />
                            </Button>
                          </Div>
                        </Td>
                      )}
                      {visibleColumns.rating && <Td className="px-6 py-4 whitespace-nowrap">{getRatingBadge(review.rating)}</Td>}
                      {visibleColumns.date && <Td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{formatDateTime(review.submittedAt)}</Td>}
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
                localStorage.setItem('admin_restaurant_reviews_pageSize', String(size));
              } catch {}
              setCurrentPage(1);
            }}
            itemLabel="reviews"
          />
        </Div>
      </Div>

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
                  <P className="text-sm font-semibold text-slate-900 font-mono">{selectedReview.orderId}</P>
                </Div>
                <Div className="bg-emerald-50 rounded-lg p-4">
                  <P className="text-xs text-emerald-600 mb-1">Restaurant</P>
                  <P className="text-sm font-semibold text-emerald-700">{selectedReview.restaurant}</P>
                </Div>
              </Div>
              <Div className="grid grid-cols-2 gap-4">
                <Div className="bg-purple-50 rounded-lg p-4">
                  <P className="text-xs text-purple-600 mb-1">Customer</P>
                  <P className="text-sm font-semibold text-purple-700">{selectedReview.customer}</P>
                </Div>
                <Div className="bg-orange-50 rounded-lg p-4">
                  <P className="text-xs text-orange-600 mb-2 font-semibold">Rating</P>
                  <Div className="flex items-center gap-3">
                    <Div className="flex items-center gap-1">{renderStars(selectedReview.rating)}</Div>
                    <Span className="text-lg font-bold text-orange-700">{selectedReview.rating} / 5</Span>
                  </Div>
                </Div>
              </Div>
              <Div className="bg-slate-50 rounded-lg p-4">
                <P className="text-xs text-slate-600 mb-2 font-semibold">Review Feedback</P>
                <P className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{selectedReview.review || 'No review text provided'}</P>
              </Div>
              <Div className="bg-slate-50 rounded-lg p-4">
                <P className="text-xs text-slate-600 mb-1">Submitted At</P>
                <P className="text-sm font-medium text-slate-900">{formatDateTime(selectedReview.submittedAt)}</P>
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

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-lg bg-white p-0 overflow-hidden">
          <DialogHeader className="border-b border-slate-200 px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
              <UiIcon as={Columns} className="w-5 h-5 text-slate-600" />
              Review Table Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
            {Object.entries(columnsConfig).map(([columnKey, label]) => (
              <Button
                key={columnKey}
                type="button"
                onClick={() => toggleColumn(columnKey)}
                className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <Span className="text-sm font-medium text-slate-700">{label}</Span>
                <Span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded border ${visibleColumns[columnKey] ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent'}`}
                >
                  <UiIcon as={Check} className="w-3.5 h-3.5" />
                </Span>
              </Button>
            ))}
          </Div>
          <DialogFooter className="border-t border-slate-200 px-6 py-4 gap-2">
            <Button
              type="button"
              onClick={resetColumns}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
