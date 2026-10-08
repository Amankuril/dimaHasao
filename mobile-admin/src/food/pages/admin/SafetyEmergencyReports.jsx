/* Ported from Frontend/src/modules/Food/pages/admin/SafetyEmergencyReports.jsx (tools/port.js first pass). */
import { useState, useEffect, useMemo } from 'react';
import { Search, Settings, Eye, Trash2, AlertTriangle } from 'lucide-react-native';
import { toast } from '../../../lib/notify';
import { adminAPI } from '../../../api/food';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/shadcn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/shadcn';
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
  Pagination,
  LoadingState,
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
const COLS = [60, 160, 210, 120, 120, 56];
const PRIORITY_TONE = { low: 'neutral', medium: 'warning', high: 'warning', critical: 'danger' };
const STATUS_TONE = { unread: 'info', read: 'neutral', resolved: 'success', urgent: 'danger' };
export default function SafetyEmergencyReports() {
  const { tablet } = useLayoutWidth();
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
        setLoadError(null);
      } else {
        setReports([]);
        setTotalPages(1);
        setLoadError(null);
      }
    } catch (error) {
      debugError('Error fetching safety emergency reports:', error);
      debugError('Error response:', error.response);
      setReports([]);
      setTotalPages(1);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to load safety emergency reports. Please check your connection and try again.';
      setLoadError(errorMessage);
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
    const label = { unread: 'Unread', read: 'Read', resolved: 'Resolved', urgent: 'Urgent' }[status] || 'Unread';
    return <StatusBadge tone={STATUS_TONE[status] || 'info'} label={label} />;
  };
  const getPriorityBadge = (priority) => {
    const label = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }[priority] || 'Medium';
    return <StatusBadge tone={PRIORITY_TONE[priority] || 'warning'} label={label} />;
  };
  if (loading && reports.length === 0) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={AlertTriangle}
          title="Safety Emergency Reports"
          subtitle="Emergency reports raised by customers"
          breadcrumb={[{ label: 'Food' }, { label: 'Customers' }, { label: 'Safety reports' }]}
        />
        <LoadingState label="Loading safety emergency reports…" />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={AlertTriangle}
        title="Safety Emergency Reports"
        subtitle="Emergency reports raised by customers"
        breadcrumb={[{ label: 'Food' }, { label: 'Customers' }, { label: 'Safety reports' }]}
      />

      <Card className="mb-4">
        <SectionTitle action={loading ? null : <Span className="text-xs font-semibold text-slate-500">{reports.length} on this page</Span>}>Filters</SectionTitle>
        <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
          <Field label="Priority">
            <Select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={INPUT}
            >
              <Option value="all">All Priority</Option>
              <Option value="low">Low</Option>
              <Option value="medium">Medium</Option>
              <Option value="high">High</Option>
              <Option value="critical">Critical</Option>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={INPUT}
            >
              <Option value="all">All Status</Option>
              <Option value="unread">Unread</Option>
              <Option value="read">Read</Option>
              <Option value="urgent">Urgent</Option>
              <Option value="resolved">Resolved</Option>
            </Select>
          </Field>
          <Field label="Search" hint="Name or email">
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
        <TableSkeleton rows={6} />
      ) : loadError ? (
        <ErrorState title="Could not load reports" message={loadError} onRetry={fetchReports} />
      ) : filteredReports.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No safety emergency reports found"
          message="Nothing matches these filters. Reports raised from the customer app appear here."
          actionLabel="Refresh"
          onAction={fetchReports}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['SI', 'Name', 'Email', 'Priority', 'Status', '']} />
            <TBody>
              {filteredReports.map((report, index, arr) => (
                <Row key={report._id} last={index === arr.length - 1} className={report.priority === 'critical' ? 'bg-red-50' : null}>
                  <Cell width={COLS[0]}>{String((currentPage - 1) * 10 + index + 1)}</Cell>
                  <Cell width={COLS[1]}>
                    <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                      {report.userName}
                    </Span>
                  </Cell>
                  <Cell width={COLS[2]}>{report.userEmail}</Cell>
                  <Cell width={COLS[3]}>{getPriorityBadge(report.priority)}</Cell>
                  <Cell width={COLS[4]}>{getStatusBadge(report.status)}</Cell>
                  <Cell width={COLS[5]} align="center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Row actions">
                          <UiIcon as={Settings} size={16} className="text-slate-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="bottom" sideOffset={8} collisionPadding={12} className="max-h-[70vh]">
                        <DropdownMenuItem onClick={() => handleViewReport(report)}>
                          <UiIcon as={Eye} size={16} className="mr-2" />
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
                          <UiIcon as={Trash2} size={16} className="mr-2" />
                          Delete
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

      {/* View Report Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-lg font-bold text-slate-900">Safety Emergency Report Details</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-0.5">Complete information about the safety emergency report</DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <Div className="px-4 py-4 gap-3">
              <Card className="bg-slate-50 gap-3">
                <SectionTitle className="mb-0">User information</SectionTitle>
                <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
                  <Div className="gap-0.5">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">User name</Span>
                    <P className="text-sm font-semibold text-slate-900">{selectedReport.userName || 'N/A'}</P>
                  </Div>
                  <Div className="gap-0.5">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email address</Span>
                    <P className="text-sm font-semibold text-slate-900">{selectedReport.userEmail || 'N/A'}</P>
                  </Div>
                  {selectedReport.userId?.phone && (
                    <Div className="gap-0.5">
                      <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone number</Span>
                      <P className="text-sm font-semibold text-slate-900">{selectedReport.userId.phone}</P>
                    </Div>
                  )}
                </Div>
              </Card>

              <Card className="gap-2">
                <SectionTitle className="mb-0">Report</SectionTitle>
                <P className="text-sm text-slate-700">{selectedReport.message}</P>
              </Card>

              <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
                <Card className="gap-2">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</Span>
                  {getPriorityBadge(selectedReport.priority)}
                </Card>
                <Card className="gap-2">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</Span>
                  {getStatusBadge(selectedReport.status)}
                </Card>
              </Div>

              <Card className="gap-1">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reported at</Span>
                <P className="text-sm font-semibold text-slate-900">
                  {new Date(selectedReport.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </P>
              </Card>

              {selectedReport.adminResponse && (
                <Card className="gap-2">
                  <SectionTitle className="mb-0">Admin response</SectionTitle>
                  <P className="text-sm text-slate-700">{selectedReport.adminResponse}</P>
                  <Div className="flex-row flex-wrap gap-3">
                    {selectedReport.respondedAt && (
                      <Span className="text-xs text-slate-500">
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
                    {selectedReport.respondedBy?.name && <Span className="text-xs text-slate-500">Responded by: {selectedReport.respondedBy.name}</Span>}
                  </Div>
                </Card>
              )}

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
