/* Ported from Frontend/src/modules/Food/pages/admin/ContactMessages.jsx (tools/port.js first pass). */
import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, Settings, Folder, ChevronDown, Eye, Loader2, Star } from 'lucide-react-native';
import { toast } from '../../../lib/notify';
import { adminAPI } from '../../../api/food';
import { TableSkeleton } from '../../components/admin/orders/TableSkeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/shadcn';
import { Button as ShButton } from '../../../components/shadcn';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/shadcn';
import {
  Button,
  Div,
  H1,
  H3,
  Input,
  Label,
  Option,
  P,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function ContactMessages() {
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, ratingFilter]);
  useEffect(() => {
    fetchFeedbacks();
  }, [ratingFilter, currentPage, searchQuery]);
  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        rating: ratingFilter !== 'all' ? ratingFilter : undefined,
        search: searchQuery.trim() || undefined,
      };
      const response = await adminAPI.getContactMessages(params);
      if (response.data && response.data.success) {
        setFeedbacks(response.data.data?.reviews || []);
        setTotalPages(response.data.data?.pagination?.totalPages || 1);
      } else {
        setFeedbacks([]);
        setTotalPages(1);
      }
    } catch (error) {
      debugError('Error fetching reviews:', error);
      setFeedbacks([]);
      setTotalPages(1);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load reviews.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handleViewFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setIsViewDialogOpen(true);
  };
  const renderStars = (rating) => {
    const stars = [];
    const count = Math.floor(rating || 0);
    for (let i = 0; i < count; i++) {
      stars.push(<UiIcon as={Star} key={i} className="w-5 h-5 fill-amber-500 text-amber-500" />);
    }
    return stars;
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Div className="flex items-center gap-2">
            <H1 className="text-2xl font-bold text-slate-900">User Feedback</H1>
            <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
              {loading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : feedbacks.length}
            </Span>
          </Div>

          <Div className="flex gap-3">
            {/* Rating Filter */}
            <Select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            >
              <Option value="all">All Ratings</Option>
              <Option value="5">5 Stars</Option>
              <Option value="4">4 Stars</Option>
              <Option value="3">3 Stars</Option>
              <Option value="2">2 Stars</Option>
              <Option value="1">1 Star</Option>
            </Select>

            {/* Search */}
            <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
              <Input
                type="text"
                placeholder="Ex: Search by name, email, order ID, restaurant, food items"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </Div>
          </Div>
        </Div>
      </Div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <Table className="w-full" cols={[70, 170, 210, 250, 120, 80]}>
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-2">
                      <Span>SI</Span>
                      <UiIcon as={ChevronDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-2">
                      <Span>Name</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-2">
                      <Span>Email</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-2">
                      <Span>Feedback</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center gap-2">
                      <Span>Rating</Span>
                      <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                    </Div>
                  </Th>
                  <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <Div className="flex items-center justify-center gap-2">
                      <Span>Action</Span>
                      <UiIcon as={Settings} className="w-3 h-3 text-slate-400" />
                    </Div>
                  </Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {feedbacks.length === 0 ? (
                  <Tr>
                    <Td colSpan={10} className="px-6 py-20">
                      <Div className="flex flex-col items-center justify-center">
                        <Div className="relative mb-6">
                          <Div className="w-32 h-32 bg-slate-200 rounded-2xl flex items-center justify-center shadow-inner">
                            <Div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-md relative overflow-visible">
                              <UiIcon as={Folder} className="w-12 h-12 text-slate-400" />
                              <Div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 bg-orange-500 rounded-t-md z-10"></Div>
                              <Div className="absolute top-3 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center z-10">
                                <Span className="text-white text-xs font-bold">!</Span>
                              </Div>
                            </Div>
                          </Div>
                        </Div>
                        <P className="text-lg font-semibold text-slate-700">No Feedback Found</P>
                      </Div>
                    </Td>
                  </Tr>
                ) : (
                  feedbacks.map((feedback, index) => (
                    <Tr key={feedback._id} className="hover:bg-slate-50 transition-colors">
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * 10 + index + 1}</Span>
                      </Td>
                      <Td className="px-6 py-4">
                        <Span className="text-sm font-medium text-slate-900">{feedback.customer?.name || 'NA'}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">
                        <Span className="text-sm text-slate-700">{feedback.customer?.email || 'NA'}</Span>
                      </Td>
                      <Td className="px-6 py-4 max-w-md">
                        <Span className="text-sm text-slate-700 line-clamp-2">{feedback.comment || 'No comment provided'}</Span>
                      </Td>
                      <Td className="px-6 py-4 whitespace-nowrap">{getRatingBadge(feedback.rating)}</Td>
                      <Td className="px-6 py-4 whitespace-nowrap text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors">
                              <UiIcon as={Settings} className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewFeedback(feedback)}>
                              <UiIcon as={Eye} className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <Div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <Div className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </Div>
              <Div className="flex gap-2">
                <ShButton variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                  Previous
                </ShButton>
                <ShButton
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </ShButton>
              </Div>
            </Div>
          )}
        </Div>
      )}

      {/* View Feedback Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">Feedback Details</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Complete information about the user and their feedback
            </DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <Div className="px-6 py-6 space-y-6">
              {/* User Information Section */}
              <Div className="bg-slate-100 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <H3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-3">
                  <Div className="w-1 h-6 bg-blue-600 rounded-full"></Div>
                  Customer Information
                </H3>
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer Name</Label>
                    <P className="text-base font-semibold text-slate-900 dark:text-white">{selectedFeedback.customer?.name || 'NA'}</P>
                  </Div>
                  <Div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</Label>
                    <P className="text-base font-semibold text-slate-900 dark:text-white break-all">{selectedFeedback.customer?.email || 'NA'}</P>
                  </Div>
                  {selectedFeedback.customer?.phone && (
                    <Div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</Label>
                      <P className="text-base font-semibold text-slate-900 dark:text-white">{selectedFeedback.customer.phone}</P>
                    </Div>
                  )}
                </Div>
              </Div>

              {/* Rating Section */}
              <Div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200 dark:border-yellow-800">
                <H3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-3">
                  <Div className="w-1 h-6 bg-orange-500 rounded-full"></Div>
                  Rating
                </H3>
                <Div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <Div className="flex items-center gap-3">
                    <Div className="flex items-center gap-1">{renderStars(selectedFeedback.rating)}</Div>
                    <Span className="text-lg font-bold text-slate-900 dark:text-white">{selectedFeedback.rating} / 5</Span>
                  </Div>
                </Div>
              </Div>

              {/* Feedback Message Section */}
              {selectedFeedback.comment && (
                <Div className="bg-blue-50 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                  <H3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-3">
                    <Div className="w-1 h-6 bg-indigo-600 rounded-full"></Div>
                    Feedback Comment
                  </H3>
                  <Div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <P className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedFeedback.comment}</P>
                  </Div>
                </Div>
              )}

              {/* Order Details Section */}
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Submitted At</Label>
                  <P className="text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedFeedback.submittedAt
                      ? new Date(selectedFeedback.submittedAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </P>
                </Div>
              </Div>

              {/* Close Button */}
              <Div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                <ShButton variant="outline" onClick={() => setIsViewDialogOpen(false)} className="min-w-[100px]">
                  Close
                </ShButton>
              </Div>
            </Div>
          )}
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
