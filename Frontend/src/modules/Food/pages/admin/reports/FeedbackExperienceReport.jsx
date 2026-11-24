import { useState, useEffect } from "react"
import { Search, Download, ChevronDown, Filter, Star, RefreshCw, Calendar, Trash2, Eye, User, Mail, Phone, MessageSquare } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@food/components/ui/dialog"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
import { exportReportsToCSV, exportReportsToExcel, exportReportsToPDF, exportReportsToJSON } from "@food/components/admin/reports/reportsExportUtils"
import AdminListPagination from "@food/components/admin/AdminListPagination"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function FeedbackExperienceReport() {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem("admin_feedback_report_pageSize")) || 20
    } catch {
      return 20
    }
  })
  const [totalItems, setTotalItems] = useState(0)
  const [feedbackExperiences, setFeedbackExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState(null)
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    rating: "",
    experience: "",
    module: "",
  })
  const [isFilterOpen, setIsFilterOpen] = useState(true)

  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, debouncedSearch])

  // Fetch feedback experiences
  useEffect(() => {
    fetchFeedbackExperiences()
  }, [filters, debouncedSearch, currentPage, pageSize])

  const fetchFeedbackExperiences = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        ...(filters.fromDate && { startDate: filters.fromDate }),
        ...(filters.toDate && { endDate: filters.toDate }),
        ...(filters.rating && { rating: filters.rating }),
        ...(filters.experience && { experience: filters.experience }),
        ...(filters.module && { module: filters.module }),
      }
      const response = await adminAPI.getFeedbackExperiences(params)
      if (response.data && response.data.data) {
        const rawData = response.data.data.feedbacks || []
        const formattedData = rawData.map(fb => ({
          _id: fb._id,
          userName: fb.userName || 'N/A',
          userEmail: fb.userEmail || 'N/A',
          userPhone: fb.userPhone || 'N/A',
          restaurantName: fb.restaurantId?.restaurantName || 'N/A',
          rating: fb.rating,
          experience: fb.comment || 'N/A',
          module: fb.module,
          createdAt: fb.createdAt
        }))
        setFeedbackExperiences(formattedData)
        setTotalItems(response.data.data.pagination?.total ?? 0)
        setStatistics(response.data.data.statistics || null)
      }
    } catch (error) {
      debugError('Error fetching feedback experiences:', error)
      if (error.response?.status !== 401) {
        toast.error('Failed to fetch feedback experiences')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      rating: "",
      experience: "",
      module: "",
    })
    setSearchQuery("")
    setCurrentPage(1)
  }

  const handleExport = (format) => {
    if (feedbackExperiences.length === 0) {
      toast.error("No data to export")
      return
    }
    const headers = [
      { key: "sl", label: "SI" },
      { key: "userName", label: "User Name" },
      { key: "userEmail", label: "Email" },
      { key: "userPhone", label: "Phone" },
      { key: "rating", label: "Rating" },
      { key: "experience", label: "Experience" },
      { key: "module", label: "Module" },
      { key: "createdAt", label: "Date" },
    ]
    const exportData = feedbackExperiences.map((fb, idx) => ({
      sl: (currentPage - 1) * pageSize + idx + 1,
      userName: fb.userName || 'N/A',
      userEmail: fb.userEmail || 'N/A',
      userPhone: fb.userPhone || 'N/A',
      rating: fb.rating,
      experience: fb.experience || 'N/A',
      module: fb.module || 'N/A',
      createdAt: new Date(fb.createdAt).toLocaleString(),
    }))
    switch (format) {
      case "csv": exportReportsToCSV(exportData, headers, "feedback_experience_report"); break;
      case "excel": exportReportsToExcel(exportData, headers, "feedback_experience_report"); break;
      case "pdf": exportReportsToPDF(exportData, headers, "feedback_experience_report", "Feedback Experience Report"); break;
      case "json": exportReportsToJSON(exportData, "feedback_experience_report"); break;
    }
  }

  const handleDelete = async (id) => {
    try {
      await adminAPI.deleteFeedbackExperience(id)
      toast.success('Feedback deleted successfully')
      fetchFeedbackExperiences()
    } catch (error) {
      debugError('Error deleting feedback:', error)
      if (error.response?.status !== 401) {
        toast.error('Failed to delete feedback')
      }
    }
  }

  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback)
    setShowDetailsDialog(true)
  }

  const getRatingColor = (rating) => {
    // Rating is 1-5 scale. Map colors accordingly.
    if (rating <= 1) return 'bg-red-100 text-red-700'
    if (rating <= 2) return 'bg-orange-100 text-orange-700'
    if (rating <= 3) return 'bg-yellow-100 text-yellow-700'
    if (rating <= 4) return 'bg-neutral-100 text-[#0a4d2b]'
    return 'bg-green-100 text-green-700'
  }

  const getExperienceLabel = (experience) => {
    const labels = {
      very_bad: 'Very Bad',
      bad: 'Bad',
      below_average: 'Below Average',
      average: 'Average',
      above_average: 'Above Average',
      good: 'Good',
      very_good: 'Very Good'
    }
    return labels[experience] || experience
  }

  const activeFiltersCount = (filters.fromDate ? 1 : 0) + (filters.toDate ? 1 : 0) + 
    (filters.rating ? 1 : 0) + (filters.experience ? 1 : 0) + (filters.module ? 1 : 0)

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen overflow-x-hidden">
      <div className="w-full max-w-full">
        {/* Page Header */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-medium text-neutral-900">Feedback experience report</h1>
          </div>
        </div>

        {/* Filter Options Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center justify-between w-full mb-4"
          >
            <h3 className="text-sm font-medium text-neutral-700">Filter options</h3>
            <ChevronDown
              className={`w-5 h-5 text-neutral-600 transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
            />
          </button>
          
          {isFilterOpen && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    From date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="date"
                      value={filters.fromDate}
                      max={today}
                      onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value > today ? today : e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    To date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="date"
                      value={filters.toDate}
                      max={today}
                      onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value > today ? today : e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Rating
                  </label>
                  <select
                    value={filters.rating}
                    onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                  >
                    <option value="">All Ratings</option>
                    {[0, 1, 2, 3, 4, 5].map(r => (
                      <option key={r} value={r}>{r}/5</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Experience
                  </label>
                  <select
                    value={filters.experience}
                    onChange={(e) => setFilters(prev => ({ ...prev, experience: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                  >
                    <option value="">All Experiences</option>
                    <option value="very_bad">Very Bad</option>
                    <option value="bad">Bad</option>
                    <option value="below_average">Below Average</option>
                    <option value="average">Average</option>
                    <option value="above_average">Above Average</option>
                    <option value="good">Good</option>
                    <option value="very_good">Very Good</option>
                  </select>
                  <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Module
                  </label>
                  <select
                    value={filters.module}
                    onChange={(e) => setFilters(prev => ({ ...prev, module: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-8 text-sm rounded-lg border border-neutral-300 bg-white text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                  >
                    <option value="">All Modules</option>
                    <option value="user">User</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="delivery">Delivery</option>
                  </select>
                  <ChevronDown className="absolute right-2 bottom-2.5 w-4 h-4 text-neutral-500 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg border border-[#0a4d2b] text-[#0a4d2b] bg-white hover:bg-neutral-50 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
                <button 
                  onClick={fetchFeedbackExperiences}
                  className={`px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-900 transition-colors flex items-center gap-2 relative ${
                    activeFiltersCount > 0 ? "ring-2 ring-[#0a4d2b]/30" : ""
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0a4d2b] text-white rounded-full text-xs flex items-center justify-center font-medium">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Total feedback</p>
                  <p className="text-2xl font-medium text-neutral-900">{statistics.totalFeedback || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center bg-neutral-100 text-neutral-500">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Average rating</p>
                  <p className="text-2xl font-medium text-neutral-900">
                    {statistics.averageRating ? statistics.averageRating.toFixed(1) : '0.0'}/5
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                  <Star className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Min rating</p>
                  <p className="text-2xl font-medium text-neutral-900">{statistics.minRating || 0}/5</p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                  <Star className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Max rating</p>
                  <p className="text-2xl font-medium text-neutral-900">{statistics.maxRating || 0}/5</p>
                </div>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                  <Star className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Export Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user name, email, phone"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-2 transition-colors">
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>Json</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Feedback Table Section */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-medium text-neutral-900">Feedback experiences</h2>
            <p className="text-sm text-neutral-600">Total: {totalItems}</p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <p className="text-neutral-600">Loading...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">SI</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Experience</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Module</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-100">
                  {feedbackExperiences.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-lg font-medium text-neutral-700 mb-1">No data found</p>
                          <p className="text-sm text-neutral-500">No feedback experiences match your search</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    feedbackExperiences.map((feedback, idx) => (
                      <tr key={feedback._id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-neutral-700">{(currentPage - 1) * pageSize + idx + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-neutral-900">{feedback.userName || 'N/A'}</span>
                            {feedback.userEmail && (
                              <span className="text-xs text-neutral-500">{feedback.userEmail}</span>
                            )}
                            {feedback.userPhone && (
                              <span className="text-xs text-neutral-500">{feedback.userPhone}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRatingColor(feedback.rating)}`}>
                                  {feedback.rating}/5
                                </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-neutral-700">{getExperienceLabel(feedback.experience)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-[#0a4d2b] capitalize">
                            {feedback.module || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-neutral-700">
                            {new Date(feedback.createdAt).toLocaleDateString()} {new Date(feedback.createdAt).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(feedback)}
                              className="p-1.5 rounded-lg hover:bg-neutral-50 text-[#0a4d2b] transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(feedback._id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              try {
                localStorage.setItem("admin_feedback_report_pageSize", String(size))
              } catch {}
              setCurrentPage(1)
            }}
            itemLabel="feedbacks"
          />
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-neutral-200">
            <DialogTitle className="text-xl font-medium text-neutral-900">Feedback details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="px-6 py-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">User name</label>
                    <p className="text-sm text-neutral-900 mt-1">{selectedFeedback.userName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">Email</label>
                    <p className="text-sm text-neutral-900 mt-1 break-words">{selectedFeedback.userEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">Experience</label>
                    <p className="text-sm text-neutral-900 mt-1">{getExperienceLabel(selectedFeedback.experience)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">Date</label>
                    <p className="text-sm text-neutral-900 mt-1">
                      {new Date(selectedFeedback.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">Rating</label>
                    <p className="text-sm text-neutral-900 mt-1">
                      <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${getRatingColor(selectedFeedback.rating)}`}>
                        {selectedFeedback.rating}/10
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">Phone</label>
                    <p className="text-sm text-neutral-900 mt-1">{selectedFeedback.userPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">Module</label>
                    <p className="text-sm text-neutral-900 mt-1">
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-[#0a4d2b] capitalize">
                        {selectedFeedback.module || 'N/A'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="px-6 pb-6 pt-4 border-t border-neutral-200">
            <button
              onClick={() => setShowDetailsDialog(false)}
              className="px-6 py-2.5 text-sm font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-sm"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


