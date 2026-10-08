/* Ported from Frontend/src/modules/Food/pages/admin/SafetyEmergencyReports.jsx (tools/port.js first pass). */
import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, Settings, Folder, ChevronDown, Eye, Trash2, AlertTriangle, Loader2 } from 'lucide-react-native';
import { toast } from '../../../lib/notify';
import { adminAPI } from '../../../api/food';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/shadcn';
import { Button as ShButton } from '../../../components/shadcn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/shadcn';
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
export default function SafetyEmergencyReports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter]);
  useEffect(() => {
    fetchReports();
  }, [statusFilter, priorityFilter, currentPage, searchQuery]);
  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        search: searchQuery.trim() || undefined,
      };

      // Remove undefined params
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);
      const response = await adminAPI.getSafetyEmergencyReports(params);
      if (response.data && response.data.success) {
        setReports(response.data.data?.safetyEmergencies || []);
        setTotalPages(response.data.data?.pagination?.pages || 1);
      } else {
        setReports([]);
        setTotalPages(1);
      }
    } catch (error) {
      debugError('Error fetching safety emergency reports:', error);
      debugError('Error response:', error.response);
      setReports([]);
      setTotalPages(1);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to load safety emergency reports. Please check your connection and try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
  };
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const response = await adminAPI.updateSafetyEmergencyStatus(id, newStatus);
      if (response.data.success) {
        toast.success('Status updated successfully');
        fetchReports();
      }
    } catch (error) {
      debugError('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };
  const handleUpdatePriority = async (id, newPriority) => {
    try {
      const response = await adminAPI.updateSafetyEmergencyPriority(id, newPriority);
      if (response.data.success) {
        toast.success('Priority updated successfully');
        fetchReports();
      }
    } catch (error) {
      debugError('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };
  const handleDelete = async (id) => {
    try {
      const response = await adminAPI.deleteSafetyEmergencyReport(id);
      if (response.data.success) {
        toast.success('Safety emergency report deleted successfully');
        fetchReports();
      }
    } catch (error) {
      debugError('Error deleting report:', error);
      toast.error('Failed to delete safety emergency report');
    }
  };
  const filteredReports = useMemo(() => {
    // Search is handled by the API globally — use server results as-is
    return reports;
  }, [reports]);
  const getStatusBadge = (status) => {
    const statusConfig = {
      unread: {
        label: 'Unread',
        className: 'bg-blue-100 text-blue-700',
      },
      read: {
        label: 'Read',
        className: 'bg-slate-100 text-slate-700',
      },
      resolved: {
        label: 'Resolved',
        className: 'bg-green-100 text-green-700',
      },
      urgent: {
        label: 'Urgent',
        className: 'bg-red-100 text-red-700',
      },
    };
    const config = statusConfig[status] || statusConfig.unread;
    return <Span className={`px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</Span>;
  };
  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: {
        label: 'Low',
        className: 'bg-gray-100 text-gray-700',
      },
      medium: {
        label: 'Medium',
        className: 'bg-yellow-100 text-yellow-700',
      },
      high: {
        label: 'High',
        className: 'bg-orange-100 text-orange-700',
      },
      critical: {
        label: 'Critical',
        className: 'bg-red-100 text-red-700 font-bold',
      },
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return <Span className={`px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</Span>;
  };
  if (loading && reports.length === 0) {
    return (
      <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <Div className="text-center">
          <UiIcon as={Loader2} className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
          <P className="text-slate-600">Loading safety emergency reports...</P>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Div className="flex items-center gap-2">
            <UiIcon as={AlertTriangle} className="h-6 w-6 text-red-600" />
            <H1 className="text-2xl font-bold text-slate-900">Safety Emergency Reports</H1>
            <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
              {loading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : reports.length}
            </Span>
          </Div>

          <Div className="flex gap-3">
            {/* Priority Filter */}
            <Select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            >
              <Option value="all">All Priority</Option>
              <Option value="low">Low</Option>
              <Option value="medium">Medium</Option>
              <Option value="high">High</Option>
              <Option value="critical">Critical</Option>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            >
              <Option value="all">All Status</Option>
              <Option value="unread">Unread</Option>
              <Option value="read">Read</Option>
              <Option value="urgent">Urgent</Option>
              <Option value="resolved">Resolved</Option>
            </Select>

            {/* Search */}
            <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
              <Input
                type="text"
                placeholder="Ex: Search by name or email"
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
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table className="w-full" cols={[70, 170, 210, 130, 130, 80]}>
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
                    <Span>Priority</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>Status</Span>
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
              {filteredReports.length === 0 ? (
                <Tr>
                  <Td colSpan={6} className="px-6 py-20">
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
                      <P className="text-lg font-semibold text-slate-700">No Safety Emergency Reports Found</P>
                    </Div>
                  </Td>
                </Tr>
              ) : (
                filteredReports.map((report, index) => (
                  <Tr key={report._id} className={`hover:bg-slate-50 transition-colors ${report.priority === 'critical' ? 'bg-red-50/50' : ''}`}>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * 10 + index + 1}</Span>
                    </Td>
                    <Td className="px-6 py-4">
                      <Span className="text-sm font-medium text-slate-900">{report.userName}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">{report.userEmail}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">{getPriorityBadge(report.priority)}</Td>
                    <Td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(report.status)}</Td>
                    <Td className="px-6 py-4 whitespace-nowrap text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors">
                            <UiIcon as={Settings} className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="bottom" sideOffset={8} collisionPadding={12} className="max-h-[70vh] overflow-y-auto">
                          <DropdownMenuItem onClick={() => handleViewReport(report)}>
                            <UiIcon as={Eye} className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />

                          <DropdownMenuLabel>Update status</DropdownMenuLabel>
                          {['unread', 'read', 'urgent', 'resolved'].map((status) => (
                            <DropdownMenuItem
                              key={`status-${status}`}
                              onClick={() => handleUpdateStatus(report._id, status)}
                              className={report.status === status ? 'font-semibold' : undefined}
                              inset
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />

                          <DropdownMenuLabel>Update priority</DropdownMenuLabel>
                          {['low', 'medium', 'high', 'critical'].map((priority) => (
                            <DropdownMenuItem
                              key={`priority-${priority}`}
                              onClick={() => handleUpdatePriority(report._id, priority)}
                              className={report.priority === priority ? 'font-semibold' : undefined}
                              inset
                            >
                              {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </DropdownMenuItem>
                          ))}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(report._id)} className="text-red-600">
                            <UiIcon as={Trash2} className="w-4 h-4 mr-2" />
                            Delete
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

      {/* View Report Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UiIcon as={AlertTriangle} className="h-6 w-6 text-red-600" />
              Safety Emergency Report Details
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Complete information about the safety emergency report
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <Div className="px-6 py-6 space-y-6">
              {/* User Information Section */}
              <Div className="bg-slate-100 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <H3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-3">
                  <Div className="w-1 h-6 bg-blue-600 rounded-full"></Div>
                  User Information
                </H3>
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Name</Label>
                    <P className="text-base font-semibold text-slate-900 dark:text-white">{selectedReport.userName || 'N/A'}</P>
                  </Div>
                  <Div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</Label>
                    <P className="text-base font-semibold text-slate-900 dark:text-white break-all">{selectedReport.userEmail || 'N/A'}</P>
                  </Div>
                  {selectedReport.userId?.phone && (
                    <Div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</Label>
                      <P className="text-base font-semibold text-slate-900 dark:text-white">{selectedReport.userId.phone}</P>
                    </Div>
                  )}
                </Div>
              </Div>

              {/* Emergency Report Section */}
              <Div className="bg-red-50 rounded-xl p-5 border border-red-200 dark:border-red-800">
                <H3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-3">
                  <Div className="w-1 h-6 bg-red-500 rounded-full"></Div>
                  Safety Emergency Report
                </H3>
                <Div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <P className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedReport.message}</P>
                </Div>
              </Div>

              {/* Priority and Status Section */}
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Priority</Label>
                  <Div>{getPriorityBadge(selectedReport.priority)}</Div>
                </Div>
                <Div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Status</Label>
                  <Div>{getStatusBadge(selectedReport.status)}</Div>
                </Div>
              </Div>

              {/* Metadata Section */}
              <Div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Reported At</Label>
                <P className="text-sm font-semibold text-slate-900 dark:text-white">
                  {new Date(selectedReport.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </P>
              </Div>

              {/* Admin Response Section */}
              {selectedReport.adminResponse && (
                <Div className="bg-green-50 rounded-xl p-5 border border-green-200 dark:border-green-800">
                  <H3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-3">
                    <Div className="w-1 h-6 bg-green-500 rounded-full"></Div>
                    Admin Response
                  </H3>
                  <Div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <P className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedReport.adminResponse}</P>
                  </Div>
                  <Div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {selectedReport.respondedAt && (
                      <Span>
                        Responded on:{' '}
                        {new Date(selectedReport.respondedAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Span>
                    )}
                    {selectedReport.respondedBy?.name && (
                      <Span>
                        Responded by: <Span className="font-semibold text-slate-700 dark:text-slate-300">{selectedReport.respondedBy.name}</Span>
                      </Span>
                    )}
                  </Div>
                </Div>
              )}

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
