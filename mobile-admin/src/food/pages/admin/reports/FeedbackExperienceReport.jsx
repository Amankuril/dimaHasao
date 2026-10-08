/* Ported from Frontend/src/modules/Food/pages/admin/reports/FeedbackExperienceReport.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Search, Download, ChevronDown, Filter, Star, RefreshCw, Calendar, Trash2, Eye, User, Mail, Phone, MessageSquare } from 'lucide-react-native';
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
  Button,
  Div,
  H1,
  H2,
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
} from '../../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function FeedbackExperienceReport() {
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
  const getRatingColor = (rating) => {
    // Rating is 1-5 scale. Map colors accordingly.
    if (rating <= 1) return 'bg-red-100 text-red-700';
    if (rating <= 2) return 'bg-orange-100 text-orange-700';
    if (rating <= 3) return 'bg-yellow-100 text-yellow-700';
    if (rating <= 4) return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
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
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen overflow-x-hidden">
      <Div className="w-full max-w-full">
        {/* Page Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <UiIcon as={MessageSquare} className="w-5 h-5 text-white" />
            </Div>
            <H1 className="text-2xl font-bold text-slate-900">Feedback Experience Report</H1>
          </Div>
        </Div>

        {/* Filter Options Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center justify-between w-full mb-4">
            <H3 className="text-sm font-semibold text-slate-700">Filter Options</H3>
            <UiIcon as={ChevronDown} className={`w-5 h-5 text-slate-600 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </Button>

          {isFilterOpen && (
            <Div className="space-y-4">
              <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Div className="relative">
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">From Date</Label>
                  <Div className="relative">
                    <UiIcon as={Calendar} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
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
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>

                <Div className="relative">
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">To Date</Label>
                  <Div className="relative">
                    <UiIcon as={Calendar} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
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
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>
              </Div>

              <Div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Div className="relative">
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">Rating</Label>
                  <Select
                    value={filters.rating}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        rating: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Option value="">All Ratings</Option>
                    {[0, 1, 2, 3, 4, 5].map((r) => (
                      <Option key={r} value={r}>
                        {r}/5
                      </Option>
                    ))}
                  </Select>
                  <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </Div>

                <Div className="relative">
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">Experience</Label>
                  <Select
                    value={filters.experience}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        experience: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </Div>

                <Div className="relative">
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">Module</Label>
                  <Select
                    value={filters.module}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        module: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Option value="">All Modules</Option>
                    <Option value="user">User</Option>
                    <Option value="restaurant">Restaurant</Option>
                    <Option value="delivery">Delivery</Option>
                  </Select>
                  <UiIcon as={ChevronDown} className="absolute right-2 bottom-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </Div>
              </Div>

              <Div className="flex items-center justify-end gap-3">
                <Button
                  onClick={handleReset}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg border border-blue-500 text-blue-600 bg-white hover:bg-blue-50 transition-all flex items-center gap-2"
                >
                  <UiIcon as={RefreshCw} className="w-4 h-4" />
                  Reset
                </Button>
                <Button
                  onClick={fetchFeedbackExperiences}
                  className={`px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-2 relative ${activeFiltersCount > 0 ? 'ring-2 ring-blue-300' : ''}`}
                >
                  <UiIcon as={Filter} className="w-4 h-4" />
                  Filter
                  {activeFiltersCount > 0 && (
                    <Span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                      {activeFiltersCount}
                    </Span>
                  )}
                </Button>
              </Div>
            </Div>
          )}
        </Div>

        {/* Summary Cards */}
        {statistics && (
          <Div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <Div className="flex items-center justify-between">
                <Div>
                  <P className="text-sm font-medium text-slate-600 mb-1">Total Feedback</P>
                  <P className="text-2xl font-bold text-slate-900">{statistics.totalFeedback || 0}</P>
                </Div>
                <Div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <UiIcon as={MessageSquare} className="w-6 h-6 text-purple-600" />
                </Div>
              </Div>
            </Div>

            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <Div className="flex items-center justify-between">
                <Div>
                  <P className="text-sm font-medium text-slate-600 mb-1">Average Rating</P>
                  <P className="text-2xl font-bold text-slate-900">{statistics.averageRating ? statistics.averageRating.toFixed(1) : '0.0'}/5</P>
                </Div>
                <Div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <UiIcon as={Star} className="w-6 h-6 text-yellow-600" />
                </Div>
              </Div>
            </Div>

            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <Div className="flex items-center justify-between">
                <Div>
                  <P className="text-sm font-medium text-slate-600 mb-1">Min Rating</P>
                  <P className="text-2xl font-bold text-slate-900">{statistics.minRating || 0}/5</P>
                </Div>
                <Div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <UiIcon as={Star} className="w-6 h-6 text-red-600" />
                </Div>
              </Div>
            </Div>

            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <Div className="flex items-center justify-between">
                <Div>
                  <P className="text-sm font-medium text-slate-600 mb-1">Max Rating</P>
                  <P className="text-2xl font-bold text-slate-900">{statistics.maxRating || 0}/5</P>
                </Div>
                <Div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <UiIcon as={Star} className="w-6 h-6 text-green-600" />
                </Div>
              </Div>
            </Div>
          </Div>
        )}

        {/* Search and Export Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Div className="relative flex-1 max-w-md">
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user name, email, phone..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </Div>

            <DropdownMenu>
              <DropdownMenuTrigger className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                <UiIcon as={Download} className="w-4 h-4" />
                <Span>Export</Span>
                <UiIcon as={ChevronDown} className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Div>
        </Div>

        {/* Feedback Table Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <H2 className="text-xl font-bold text-slate-900">Feedback Experiences</H2>
            <P className="text-sm text-slate-600">Total: {totalItems}</P>
          </Div>

          {loading ? (
            <Div className="text-center py-20">
              <P className="text-slate-600">Loading...</P>
            </Div>
          ) : (
              <Table cols={[70, 180, 110, 220, 110, 140, 80]} className="w-full">
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">User</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Rating</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Experience</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Module</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Date</Th>
                    <Th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {feedbackExperiences.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} className="px-6 py-20 text-center">
                        <Div className="flex flex-col items-center justify-center">
                          <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                          <P className="text-sm text-slate-500">No feedback experiences match your search</P>
                        </Div>
                      </Td>
                    </Tr>
                  ) : (
                    feedbackExperiences.map((feedback, idx) => (
                      <Tr key={feedback._id} className="hover:bg-slate-50 transition-colors">
                        <Td className="px-4 py-3 whitespace-nowrap">
                          <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * pageSize + idx + 1}</Span>
                        </Td>
                        <Td className="px-4 py-3">
                          <Div className="flex flex-col">
                            <Span className="text-sm font-medium text-slate-900">{feedback.userName || 'N/A'}</Span>
                            {feedback.userEmail && <Span className="text-xs text-slate-500">{feedback.userEmail}</Span>}
                            {feedback.userPhone && <Span className="text-xs text-slate-500">{feedback.userPhone}</Span>}
                          </Div>
                        </Td>
                        <Td className="px-4 py-3 whitespace-nowrap">
                          <Span className={`px-3 py-1 rounded-full text-xs font-medium ${getRatingColor(feedback.rating)}`}>{feedback.rating}/5</Span>
                        </Td>
                        <Td className="px-4 py-3 whitespace-nowrap">
                          <Span className="text-sm text-slate-700">{getExperienceLabel(feedback.experience)}</Span>
                        </Td>
                        <Td className="px-4 py-3 whitespace-nowrap">
                          <Span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">{feedback.module || 'N/A'}</Span>
                        </Td>
                        <Td className="px-4 py-3 whitespace-nowrap">
                          <Span className="text-xs text-slate-700">
                            {new Date(feedback.createdAt).toLocaleDateString()} {new Date(feedback.createdAt).toLocaleTimeString()}
                          </Span>
                        </Td>
                        <Td className="px-4 py-3 whitespace-nowrap">
                          <Div className="flex items-center gap-2">
                            <Button onClick={() => handleViewDetails(feedback)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                              <UiIcon as={Eye} className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => handleDelete(feedback._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
                              <UiIcon as={Trash2} className="w-4 h-4" />
                            </Button>
                          </Div>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
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
        </Div>
      </Div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <DialogTitle className="text-xl font-bold text-slate-900">Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <Div className="px-6 py-6">
              <Div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <Div className="space-y-5">
                  <Div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1 block">User Name</Label>
                    <P className="text-sm text-slate-900 mt-1">{selectedFeedback.userName || 'N/A'}</P>
                  </Div>
                  <Div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1 block">Email</Label>
                    <P className="text-sm text-slate-900 mt-1 break-words">{selectedFeedback.userEmail || 'N/A'}</P>
                  </Div>
                  <Div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1 block">Experience</Label>
                    <P className="text-sm text-slate-900 mt-1">{getExperienceLabel(selectedFeedback.experience)}</P>
                  </Div>
                  <Div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1 block">Date</Label>
                    <P className="text-sm text-slate-900 mt-1">{new Date(selectedFeedback.createdAt).toLocaleString()}</P>
                  </Div>
                </Div>

                {/* Right Column */}
                <Div className="space-y-5">
                  <Div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1 block">Rating</Label>
                    <P className="text-sm text-slate-900 mt-1">
                      <Span className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${getRatingColor(selectedFeedback.rating)}`}>
                        {selectedFeedback.rating}/10
                      </Span>
                    </P>
                  </Div>
                  <Div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1 block">Phone</Label>
                    <P className="text-sm text-slate-900 mt-1">{selectedFeedback.userPhone || 'N/A'}</P>
                  </Div>
                  <Div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1 block">Module</Label>
                    <P className="text-sm text-slate-900 mt-1">
                      <Span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {selectedFeedback.module || 'N/A'}
                      </Span>
                    </P>
                  </Div>
                </Div>
              </Div>
            </Div>
          )}
          <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-200">
            <Button
              onClick={() => setShowDetailsDialog(false)}
              className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
