/* Ported from Frontend/src/modules/Food/pages/admin/ContactMessages.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Search, Settings, Eye, Star, MessageSquare } from 'lucide-react-native';
import { toast } from '../../../lib/notify';
import { adminAPI } from '../../../api/food';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/shadcn';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/shadcn';
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
  Pagination,
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../admin/ui';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const COLS = [60, 150, 200, 230, 120, 56];
export default function ContactMessages() {
  const { tablet } = useLayoutWidth();
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
        setLoadError(null);
      } else {
        setFeedbacks([]);
        setTotalPages(1);
        setLoadError(null);
      }
    } catch (error) {
      debugError('Error fetching reviews:', error);
      setFeedbacks([]);
      setTotalPages(1);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load reviews.';
      setLoadError(errorMessage);
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
      stars.push(<UiIcon as={Star} key={i} size={18} className="fill-amber-500 text-amber-500" />);
    }
    return stars;
  };
  const getRatingBadge = (rating) => {
    const stars = [];
    const count = Math.floor(rating || 0);
    for (let i = 0; i < count; i++) {
      stars.push(<UiIcon as={Star} key={i} size={12} className="fill-amber-500 text-amber-500" />);
    }
    return (
      <Div className="flex-row items-center self-start gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C6' }}>
        <Div className="flex-row items-center">{stars}</Div>
        <Span className="text-xs font-semibold" style={{ color: '#BB4D00' }}>
          {rating}
        </Span>
      </Div>
    );
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={MessageSquare}
        title="User Feedback"
        subtitle="Ratings and comments customers left after an order"
        breadcrumb={[{ label: 'Food' }, { label: 'Customers' }, { label: 'User feedback' }]}
      />

      <Card className="mb-4">
        <SectionTitle action={loading ? null : <Span className="text-xs font-semibold text-slate-500">{feedbacks.length} on this page</Span>}>Filters</SectionTitle>
        <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
          <Field label="Rating">
            <Select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={INPUT}
            >
              <Option value="all">All Ratings</Option>
              <Option value="5">5 Stars</Option>
              <Option value="4">4 Stars</Option>
              <Option value="3">3 Stars</Option>
              <Option value="2">2 Stars</Option>
              <Option value="1">1 Star</Option>
            </Select>
          </Field>
          <Field label="Search" hint="Name, email, order ID, restaurant or food item">
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input
                type="text"
                placeholder="Ex: search by name or email"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={`${INPUT} flex-1`}
              />
            </Div>
          </Field>
        </Div>
      </Card>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : loadError ? (
        <ErrorState title="Could not load feedback" message={loadError} onRetry={fetchFeedbacks} />
      ) : feedbacks.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No feedback found" message="Feedback appears here once customers rate their orders." actionLabel="Refresh" onAction={fetchFeedbacks} />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['SI', 'Name', 'Email', 'Feedback', 'Rating', '']} />
            <TBody>
              {feedbacks.map((feedback, index, arr) => (
                <Row key={feedback._id} last={index === arr.length - 1}>
                  <Cell width={COLS[0]}>{String((currentPage - 1) * 10 + index + 1)}</Cell>
                  <Cell width={COLS[1]}>
                    <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                      {feedback.customer?.name || 'NA'}
                    </Span>
                  </Cell>
                  <Cell width={COLS[2]}>{feedback.customer?.email || 'NA'}</Cell>
                  <Cell width={COLS[3]}>{feedback.comment || 'No comment provided'}</Cell>
                  <Cell width={COLS[4]}>{getRatingBadge(feedback.rating)}</Cell>
                  <Cell width={COLS[5]} align="center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Row actions">
                          <UiIcon as={Settings} size={16} className="text-slate-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewFeedback(feedback)}>
                          <UiIcon as={Eye} size={16} className="mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
          {totalPages > 1 && (
            <Pagination
              page={currentPage}
              pages={totalPages}
              onPrev={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              onNext={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            />
          )}
        </>
      )}

      {/* View Feedback Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-lg font-bold text-slate-900">Feedback Details</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-0.5">Complete information about the user and their feedback</DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <Div className="px-4 py-4 gap-3">
              <Card className="bg-slate-50 gap-3">
                <SectionTitle className="mb-0">Customer information</SectionTitle>
                <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
                  <Div className="gap-0.5">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer name</Span>
                    <P className="text-sm font-semibold text-slate-900">{selectedFeedback.customer?.name || 'NA'}</P>
                  </Div>
                  <Div className="gap-0.5">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email address</Span>
                    <P className="text-sm font-semibold text-slate-900">{selectedFeedback.customer?.email || 'NA'}</P>
                  </Div>
                  {selectedFeedback.customer?.phone && (
                    <Div className="gap-0.5">
                      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone number</Span>
                      <P className="text-sm font-semibold text-slate-900">{selectedFeedback.customer.phone}</P>
                    </Div>
                  )}
                </Div>
              </Card>

              <Card className="gap-2">
                <SectionTitle className="mb-0">Rating</SectionTitle>
                <Div className="flex-row items-center gap-2">
                  <Div className="flex-row items-center gap-0.5">{renderStars(selectedFeedback.rating)}</Div>
                  <Span className="text-base font-semibold text-slate-900">{selectedFeedback.rating} / 5</Span>
                </Div>
              </Card>

              {selectedFeedback.comment && (
                <Card className="gap-2">
                  <SectionTitle className="mb-0">Feedback comment</SectionTitle>
                  <P className="text-sm text-slate-700">{selectedFeedback.comment}</P>
                </Card>
              )}

              <Card className="gap-1">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted at</Span>
                <P className="text-sm font-semibold text-slate-900">
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
              </Card>

              <Toolbar className="justify-end mb-0">
                <Button onClick={() => setIsViewDialogOpen(false)} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Close</Span>
                </Button>
              </Toolbar>
            </Div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
