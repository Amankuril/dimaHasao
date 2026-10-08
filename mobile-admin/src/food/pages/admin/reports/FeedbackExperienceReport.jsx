/* Ported from Frontend/src/modules/Food/pages/admin/reports/FeedbackExperienceReport.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Search, Download, ChevronDown, Filter, Star, RefreshCw, Trash2, Eye, MessageSquare } from 'lucide-react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from '../../../components/admin/reports/reportsExportUtils';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
const COLS = [60, 190, 100, 220, 120, 150, 110];
const LABELS = ['SI', 'User', 'Rating', 'Experience', 'Module', 'Date', 'Actions'];
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function FeedbackExperienceReport() {
  const { tablet } = useLayoutWidth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_feedback_report_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [feedbackExperiences, setFeedbackExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    rating: '',
    experience: '',
    module: '',
  });
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const today = new Date().toISOString().split('T')[0];
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearch]);

  // Fetch feedback experiences
  useEffect(() => {
    fetchFeedbackExperiences();
  }, [filters, debouncedSearch, currentPage, pageSize]);
  const fetchFeedbackExperiences = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        ...(filters.fromDate && {
          startDate: filters.fromDate,
        }),
        ...(filters.toDate && {
          endDate: filters.toDate,
        }),
        ...(filters.rating && {
          rating: filters.rating,
        }),
        ...(filters.experience && {
          experience: filters.experience,
        }),
        ...(filters.module && {
          module: filters.module,
        }),
      };
      const response = await adminAPI.getFeedbackExperiences(params);
      if (response.data && response.data.data) {
        const rawData = response.data.data.feedbacks || [];
        const formattedData = rawData.map((fb) => ({
          _id: fb._id,
          userName: fb.userName || 'N/A',
          userEmail: fb.userEmail || 'N/A',
          userPhone: fb.userPhone || 'N/A',
          restaurantName: fb.restaurantId?.restaurantName || 'N/A',
          rating: fb.rating,
          experience: fb.comment || 'N/A',
          module: fb.module,
          createdAt: fb.createdAt,
        }));
        setFeedbackExperiences(formattedData);
        setTotalItems(response.data.data.pagination?.total ?? 0);
        setStatistics(response.data.data.statistics || null);
      }
    } catch (error) {
      debugError('Error fetching feedback experiences:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to fetch feedback experiences');
      }
    } finally {
      setLoading(false);
    }
  };
  const handleReset = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      rating: '',
      experience: '',
      module: '',
    });
    setSearchQuery('');
    setCurrentPage(1);
  };
  const handleExport = (format) => {
    if (feedbackExperiences.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = [
      {
        key: 'sl',
        label: 'SI',
      },
      {
        key: 'userName',
        label: 'User Name',
      },
      {
        key: 'userEmail',
        label: 'Email',
      },
      {
        key: 'userPhone',
        label: 'Phone',
      },
      {
        key: 'rating',
        label: 'Rating',
      },
      {
        key: 'experience',
        label: 'Experience',
      },
      {
        key: 'module',
        label: 'Module',
      },
      {
        key: 'createdAt',
        label: 'Date',
      },
    ];
    const exportData = feedbackExperiences.map((fb, idx) => ({
      sl: (currentPage - 1) * pageSize + idx + 1,
      userName: fb.userName || 'N/A',
      userEmail: fb.userEmail || 'N/A',
      userPhone: fb.userPhone || 'N/A',
      rating: fb.rating,
      experience: fb.experience || 'N/A',
      module: fb.module || 'N/A',
      createdAt: new Date(fb.createdAt).toLocaleString(),
    }));
    switch (format) {
      case 'csv':
        exportReportsToCSV(exportData, headers, 'feedback_experience_report');
        break;
      case 'excel':
        exportReportsToExcel(exportData, headers, 'feedback_experience_report');
        break;
      case 'pdf':
        exportReportsToPDF(exportData, headers, 'feedback_experience_report', 'Feedback Experience Report');
        break;
      case 'json':
        exportReportsToJSON(exportData, 'feedback_experience_report');
        break;
    }
  };
  const handleDelete = async (id) => {
    try {
      await adminAPI.deleteFeedbackExperience(id);
      toast.success('Feedback deleted successfully');
      fetchFeedbackExperiences();
    } catch (error) {
      debugError('Error deleting feedback:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to delete feedback');
      }
    }
  };
  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setShowDetailsDialog(true);
  };
  const ratingTone = (rating) => {
    // Rating is 1-5 scale. Map tones accordingly.
    if (rating <= 2) return 'danger';
    if (rating <= 3) return 'warning';
    if (rating <= 4) return 'info';
    return 'success';
  };
  const getExperienceLabel = (experience) => {
    const labels = {
      very_bad: 'Very Bad',
      bad: 'Bad',
      below_average: 'Below Average',
      average: 'Average',
      above_average: 'Above Average',
      good: 'Good',
      very_good: 'Very Good',
    };
    return labels[experience] || experience;
  };
  const activeFiltersCount =
    (filters.fromDate ? 1 : 0) + (filters.toDate ? 1 : 0) + (filters.rating ? 1 : 0) + (filters.experience ? 1 : 0) + (filters.module ? 1 : 0);
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={MessageSquare}
        title="Feedback Experience Report"
        subtitle="What customers, restaurants and riders report back"
        breadcrumb={[{ label: 'Food' }, { label: 'Reports' }, { label: 'Feedback experience' }]}
      />

      <Card className="mb-4">
        <SectionTitle
          action={
            <Button onClick={() => setIsFilterOpen(!isFilterOpen)} accessibilityLabel={isFilterOpen ? 'Hide filters' : 'Show filters'} className="w-11 h-11 items-center justify-center rounded-lg">
              <UiIcon as={ChevronDown} size={18} className="text-slate-600" />
            </Button>
          }
        >
          Filter options
        </SectionTitle>

        {isFilterOpen && (
          <>
            <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
              <Field label="From date">
                <Input
                  type="date"
                  value={filters.fromDate}
                  max={today}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      fromDate: e.target.value > today ? today : e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>

              <Field label="To date">
                <Input
                  type="date"
                  value={filters.toDate}
                  max={today}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      toDate: e.target.value > today ? today : e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>

              <Field label="Rating">
                <Select
                  value={filters.rating}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      rating: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  <Option value="">All Ratings</Option>
                  {[0, 1, 2, 3, 4, 5].map((r) => (
                    <Option key={r} value={r}>
                      {r}/5
                    </Option>
                  ))}
                </Select>
              </Field>

              <Field label="Experience">
                <Select
                  value={filters.experience}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      experience: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  <Option value="">All Experiences</Option>
                  <Option value="very_bad">Very Bad</Option>
                  <Option value="bad">Bad</Option>
                  <Option value="below_average">Below Average</Option>
                  <Option value="average">Average</Option>
                  <Option value="above_average">Above Average</Option>
                  <Option value="good">Good</Option>
                  <Option value="very_good">Very Good</Option>
                </Select>
              </Field>

              <Field label="Module">
                <Select
                  value={filters.module}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      module: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  <Option value="">All Modules</Option>
                  <Option value="user">User</Option>
                  <Option value="restaurant">Restaurant</Option>
                  <Option value="delivery">Delivery</Option>
                </Select>
              </Field>
            </Div>

            <Toolbar className="mt-3 mb-0">
              <Button onClick={fetchFeedbackExperiences} className={BTN_PRIMARY}>
                <UiIcon as={Filter} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>{activeFiltersCount > 0 ? `Filter (${activeFiltersCount})` : 'Filter'}</Span>
              </Button>
              <Button onClick={handleReset} className={BTN_SECONDARY}>
                <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
              </Button>
            </Toolbar>
          </>
        )}
      </Card>

      {statistics && (
        <StatGrid className="mb-4">
          <StatCard label="Total feedback" value={statistics.totalFeedback || 0} icon={MessageSquare} tone="info" />
          <StatCard label="Average rating" value={`${statistics.averageRating ? statistics.averageRating.toFixed(1) : '0.0'}/5`} icon={Star} tone="warning" />
          <StatCard label="Min rating" value={`${statistics.minRating || 0}/5`} icon={Star} tone="danger" />
          <StatCard label="Max rating" value={`${statistics.maxRating || 0}/5`} icon={Star} tone="success" />
        </StatGrid>
      )}

      <Card className="mb-4">
        <SectionTitle>Feedback experiences ({totalItems})</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center flex-1 min-w-[200px] gap-2">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user name, email, phone…"
              className={`${INPUT} flex-1`}
            />
            <UiIcon as={Search} size={16} className="text-slate-400" />
          </Div>

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
              <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : feedbackExperiences.length === 0 ? (
        <EmptyState
          title="No feedback yet"
          message="No feedback experiences match your search or filters."
          actionLabel="Reset filters"
          onAction={handleReset}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {feedbackExperiences.map((feedback, idx, all) => (
              <Row key={feedback._id} last={idx === all.length - 1}>
                <Cell width={COLS[0]}>{(currentPage - 1) * pageSize + idx + 1}</Cell>
                <Cell width={COLS[1]}>
                  <Div>
                    <Span className="text-sm font-medium text-slate-900">{feedback.userName || 'N/A'}</Span>
                    {feedback.userEmail ? <Span className="text-xs text-slate-500">{feedback.userEmail}</Span> : null}
                    {feedback.userPhone ? <Span className="text-xs text-slate-500">{feedback.userPhone}</Span> : null}
                  </Div>
                </Cell>
                <Cell width={COLS[2]}>
                  <StatusBadge tone={ratingTone(feedback.rating)} label={`${feedback.rating}/5`} />
                </Cell>
                <Cell width={COLS[3]} numberOfLines={3}>
                  {getExperienceLabel(feedback.experience)}
                </Cell>
                <Cell width={COLS[4]}>
                  <StatusBadge tone="info" label={feedback.module || 'N/A'} />
                </Cell>
                <Cell width={COLS[5]}>
                  <Span className="text-xs text-slate-700">
                    {new Date(feedback.createdAt).toLocaleDateString()} {new Date(feedback.createdAt).toLocaleTimeString()}
                  </Span>
                </Cell>
                <Cell width={COLS[6]}>
                  <Div className="flex-row items-center gap-1">
                    <Button onClick={() => handleViewDetails(feedback)} accessibilityLabel="View feedback" className="w-11 h-11 rounded-lg items-center justify-center">
                      <UiIcon as={Eye} size={16} className="text-blue-600" />
                    </Button>
                    <Button onClick={() => handleDelete(feedback._id)} accessibilityLabel="Delete feedback" className="w-11 h-11 rounded-lg items-center justify-center">
                      <UiIcon as={Trash2} size={16} className="text-red-600" />
                    </Button>
                  </Div>
                </Cell>
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
            localStorage.setItem('admin_feedback_report_pageSize', String(size));
          } catch {}
          setCurrentPage(1);
        }}
        itemLabel="feedbacks"
      />

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-900">Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <Div className="px-4 py-4 gap-3">
              <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
                <Field label="User name">
                  <P className="text-sm text-slate-900">{selectedFeedback.userName || 'N/A'}</P>
                </Field>
                <Field label="Rating">
                  <StatusBadge tone={ratingTone(selectedFeedback.rating)} label={`${selectedFeedback.rating}/10`} />
                </Field>
                <Field label="Email">
                  <P className="text-sm text-slate-900">{selectedFeedback.userEmail || 'N/A'}</P>
                </Field>
                <Field label="Phone">
                  <P className="text-sm text-slate-900">{selectedFeedback.userPhone || 'N/A'}</P>
                </Field>
                <Field label="Experience">
                  <P className="text-sm text-slate-900">{getExperienceLabel(selectedFeedback.experience)}</P>
                </Field>
                <Field label="Module">
                  <StatusBadge tone="info" label={selectedFeedback.module || 'N/A'} />
                </Field>
                <Field label="Date">
                  <P className="text-sm text-slate-900">{new Date(selectedFeedback.createdAt).toLocaleString()}</P>
                </Field>
              </Div>
            </Div>
          )}
          <DialogFooter className="px-4 pb-4 pt-3 border-t border-slate-200">
            <Button onClick={() => setShowDetailsDialog(false)} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Close</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
