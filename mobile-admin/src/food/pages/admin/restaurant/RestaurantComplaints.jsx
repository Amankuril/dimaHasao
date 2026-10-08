/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantComplaints.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { MessageSquareWarning, Edit } from 'lucide-react-native';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/shadcn';
import { Button, Div, Input, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Toolbar, StatusBadge, Pagination, TableSkeleton, EmptyState, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'All Status',
  },
  {
    value: 'pending',
    label: 'Pending',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
  },
  {
    value: 'resolved',
    label: 'Resolved',
  },
  {
    value: 'rejected',
    label: 'Rejected',
  },
];
const COMPLAINT_TYPE_OPTIONS = [
  {
    value: 'all',
    label: 'All Types',
  },
  {
    value: 'food_quality',
    label: 'Food Quality',
  },
  {
    value: 'wrong_item',
    label: 'Wrong Item',
  },
  {
    value: 'missing_item',
    label: 'Missing Item',
  },
  {
    value: 'delivery_issue',
    label: 'Delivery Issue',
  },
  {
    value: 'packaging',
    label: 'Packaging',
  },
  {
    value: 'pricing',
    label: 'Pricing',
  },
  {
    value: 'service',
    label: 'Service',
  },
  {
    value: 'other',
    label: 'Other',
  },
];
const STATUS_TONES = { pending: 'warning', in_progress: 'info', resolved: 'success', rejected: 'danger' };
const statusLabel = (status) => STATUS_OPTIONS.find((o) => o.value === status)?.label || String(status || 'Unknown');
export default function RestaurantComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
  });
  const [filters, setFilters] = useState({
    status: 'all',
    complaintType: 'all',
    search: '',
    page: 1,
    limit: 50,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  });
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [updateData, setUpdateData] = useState({
    status: '',
    adminResponse: '',
  });
  useEffect(() => {
    fetchComplaints();
  }, [filters]);
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.complaintType && filters.complaintType !== 'all') params.complaintType = filters.complaintType;
      if (filters.search) params.search = filters.search;
      const response = await adminAPI.getRestaurantComplaints(params);
      if (response?.data?.success) {
        setComplaints(response.data.data.complaints || []);
        setStats(response.data.data.stats || stats);
        setPagination({
          page: response.data.data.page || 1,
          limit: response.data.data.limit || 50,
          total: response.data.data.total || 0,
          pages: Math.ceil((response.data.data.total || 0) / (response.data.data.limit || 50)),
        });
      }
    } catch (error) {
      debugError('Error fetching complaints:', error);
      toast.error('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };
  const handleOpenModal = (complaint) => {
    setEditingComplaint(complaint);
    setUpdateData({
      status: complaint.status,
      adminResponse: complaint.adminResponse || '',
    });
  };
  const handleUpdateComplaint = async () => {
    if (!editingComplaint) return;
    try {
      const response = await adminAPI.updateRestaurantComplaint(editingComplaint._id, updateData);
      if (response?.data?.success) {
        toast.success('Complaint updated');
        setEditingComplaint(null);
        fetchComplaints(); // Refresh list
      }
    } catch (error) {
      debugError('Error updating complaint:', error);
      toast.error('Failed to update complaint');
    }
  };
  const { tablet } = useLayoutWidth();
  return (
    <AdminPage maxWidth={1000}>
      <PageHeader
        icon={MessageSquareWarning}
        title="Restaurant Complaints"
        subtitle="Manage and track customer complaints"
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Complaints' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Toolbar className="mb-0">
          <Input
            type="text"
            placeholder="Search by order, customer, restaurant…"
            value={filters.search}
            onChange={(e) =>
              setFilters({
                ...filters,
                search: e.target.value.replace(/\s/g, ''),
                page: 1,
              })
            }
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
          <Div className={tablet ? 'flex-row gap-2' : 'w-full flex-row gap-2'}>
            <Div className="flex-1 min-w-[140px]">
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value,
                    page: 1,
                  })
                }
              >
                <SelectTrigger className={INPUT}>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Div>
            <Div className="flex-1 min-w-[140px]">
              <Select
                value={filters.complaintType || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    complaintType: value,
                    page: 1,
                  })
                }
              >
                <SelectTrigger className={INPUT}>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Div>
          </Div>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="No complaints found"
          message="No customer complaints match these filters. Clear the search or pick another status."
        />
      ) : (
        <Div className="gap-3">
          {complaints.map((complaint) => (
            <Card key={complaint._id} className="gap-3">
              <Div className="flex-row items-start gap-3">
                <Div className="flex-1 min-w-0 gap-1.5">
                  <Span className="text-base font-semibold text-slate-900">{complaint.subject || (complaint.issueType || 'other').replace('_', ' ')}</Span>
                  <StatusBadge status={complaint.status} tone={STATUS_TONES[complaint.status]} label={statusLabel(complaint.status)} />
                </Div>
                <Button
                  onClick={() => handleOpenModal(complaint)}
                  className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center shrink-0"
                  accessibilityLabel="Update complaint"
                >
                  <UiIcon as={Edit} size={16} className="text-slate-600" />
                </Button>
              </Div>

              <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
                {[
                  ['Order', `#${complaint.orderId?.orderId || 'N/A'}`],
                  ['Customer', complaint.userId?.name || 'Customer'],
                  ['Restaurant', complaint.restaurantId?.restaurantName || 'Restaurant'],
                  ['Type', (complaint.issueType || 'other').replace('_', ' ')],
                ].map(([label, value]) => (
                  <Div key={label} className="min-w-[140px] flex-1 gap-0.5">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
                    <Span className="text-sm text-slate-700">{value}</Span>
                  </Div>
                ))}
              </Div>

              {complaint.description ? <Span className="text-sm text-slate-700">{complaint.description}</Span> : null}

              {complaint.restaurantResponse ? (
                <Div className="rounded-lg bg-slate-100 p-3 gap-1">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Restaurant response</Span>
                  <Span className="text-sm text-slate-700">{complaint.restaurantResponse}</Span>
                </Div>
              ) : null}
              {complaint.adminResponse ? (
                <Div className="rounded-lg bg-blue-50 p-3 gap-1">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Admin response</Span>
                  <Span className="text-sm text-slate-700">{complaint.adminResponse}</Span>
                </Div>
              ) : null}

              <Span className="text-xs text-slate-500">
                {new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Span>
            </Card>
          ))}
        </Div>
      )}

      {pagination.pages > 1 && (
        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onPrev={() =>
            setFilters({
              ...filters,
              page: filters.page - 1,
            })
          }
          onNext={() =>
            setFilters({
              ...filters,
              page: filters.page + 1,
            })
          }
        />
      )}

      {/* Update Modal */}
      <Dialog open={!!editingComplaint} onOpenChange={(open) => !open && setEditingComplaint(null)}>
        <DialogContent className="max-w-lg p-4">
          <DialogHeader>
            <DialogTitle>Update Complaint</DialogTitle>
            <DialogDescription>Update the status and provide a response for this complaint.</DialogDescription>
          </DialogHeader>
          <Div className="gap-3 py-3">
            <Field label="Status">
              <Select
                value={updateData.status}
                onValueChange={(val) =>
                  setUpdateData({
                    ...updateData,
                    status: val,
                  })
                }
              >
                <SelectTrigger className={INPUT}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter((o) => o.value !== 'all').map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Admin Response" hint="The customer sees this response.">
              <Textarea
                className="w-full min-h-[100px] p-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                placeholder="Type your response here…"
                value={updateData.adminResponse}
                onChange={(e) =>
                  setUpdateData({
                    ...updateData,
                    adminResponse: e.target.value,
                  })
                }
              />
            </Field>
          </Div>
          <DialogFooter className="flex-row flex-wrap justify-end gap-2">
            <Button onClick={() => setEditingComplaint(null)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={handleUpdateComplaint} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Save changes</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
