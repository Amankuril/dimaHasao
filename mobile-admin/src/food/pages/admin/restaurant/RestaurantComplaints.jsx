/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantComplaints.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Search, Filter, AlertCircle, CheckCircle, Clock, XCircle, FileText, Edit } from 'lucide-react-native';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/shadcn';
import { Button, Div, H1, H3, Input, Label, P, ScrollDiv, Textarea, Icon as UiIcon } from '../../../../components/web';
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
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <UiIcon as={Clock} className="w-4 h-4 text-yellow-600" />;
      case 'in_progress':
        return <UiIcon as={AlertCircle} className="w-4 h-4 text-blue-600" />;
      case 'resolved':
        return <UiIcon as={CheckCircle} className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <UiIcon as={XCircle} className="w-4 h-4 text-red-600" />;
      default:
        return <UiIcon as={FileText} className="w-4 h-4 text-gray-600" />;
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  return (
    <ScrollDiv className="p-6 space-y-6">
      <Div>
        <Div className="flex items-center gap-3">
          <H1 className="text-2xl font-bold text-gray-900">Restaurant Complaints</H1>
        </Div>
        <P className="text-sm text-gray-500 mt-1">Manage and track customer complaints</P>
      </Div>

      {/* Filters */}
      <Div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
        <Div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Div className="w-full md:max-w-md">
            <Input
              type="text"
              placeholder="Search by order, customer, restaurant..."
              value={filters.search}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  search: e.target.value.replace(/\s/g, ''),
                  page: 1,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </Div>
          <Div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              <SelectTrigger className="w-full sm:w-[140px]">
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
              <SelectTrigger className="w-full sm:w-[140px]">
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
      </Div>

      {/* Complaints List */}
      <Div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <Div className="p-12 text-center">
            <P className="text-gray-500">Loading complaints...</P>
          </Div>
        ) : complaints.length === 0 ? (
          <Div className="p-12 text-center">
            <UiIcon as={FileText} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <P className="text-gray-500">No complaints found</P>
          </Div>
        ) : (
          <Div className="divide-y divide-gray-200">
            {complaints.map((complaint) => (
              <Div key={complaint._id} className="p-4 hover:bg-gray-50 transition-colors">
                <Div className="flex items-start justify-between mb-3">
                  <Div className="flex-1">
                    <Div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(complaint.status)}
                      <H3 className="font-semibold text-gray-900">{complaint.subject || complaint.issueType?.replace('_', ' ')}</H3>
                    </Div>
                    <Div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <Div>
                        <P className="text-xs text-gray-500">Order</P>
                        <P className="font-medium">#{complaint.orderId?.orderId || 'N/A'}</P>
                      </Div>
                      <Div>
                        <P className="text-xs text-gray-500">Customer</P>
                        <P className="font-medium">{complaint.userId?.name || 'Customer'}</P>
                      </Div>
                      <Div>
                        <P className="text-xs text-gray-500">Restaurant</P>
                        <P className="font-medium">{complaint.restaurantId?.restaurantName || 'Restaurant'}</P>
                      </Div>
                      <Div>
                        <P className="text-xs text-gray-500">Type</P>
                        <P className="font-medium capitalize">{(complaint.issueType || 'other').replace('_', ' ')}</P>
                      </Div>
                    </Div>
                  </Div>
                  <Button onClick={() => handleOpenModal(complaint)} className="p-2 rounded-md hover:bg-gray-200">
                    <UiIcon as={Edit} className="w-4 h-4 text-gray-600" />
                  </Button>
                </Div>
                <P className="text-sm text-gray-700 mb-3">{complaint.description}</P>
                {complaint.restaurantResponse && (
                  <Div className="bg-blue-50 rounded p-3 mb-3">
                    <P className="text-xs font-semibold text-blue-700 mb-1">Restaurant Response:</P>
                    <P className="text-sm text-blue-800">{complaint.restaurantResponse}</P>
                  </Div>
                )}
                {complaint.adminResponse && (
                  <Div className="bg-green-50 rounded p-3 mb-3">
                    <P className="text-xs font-semibold text-green-700 mb-1">Admin Response:</P>
                    <P className="text-sm text-green-800">{complaint.adminResponse}</P>
                  </Div>
                )}
                <P className="text-xs text-gray-400">
                  {new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </P>
              </Div>
            ))}
          </Div>
        )}
      </Div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Div className="flex items-center justify-between">
          <P className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
            complaints
          </P>
          <Div className="flex gap-2">
            <Button
              onClick={() =>
                setFilters({
                  ...filters,
                  page: filters.page - 1,
                })
              }
              disabled={filters.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                setFilters({
                  ...filters,
                  page: filters.page + 1,
                })
              }
              disabled={filters.page >= pagination.pages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </Button>
          </Div>
        </Div>
      )}

      {/* Update Modal */}
      <Dialog open={!!editingComplaint} onOpenChange={(open) => !open && setEditingComplaint(null)}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>Update Complaint</DialogTitle>
            <DialogDescription>Update the status and provide a response for this complaint.</DialogDescription>
          </DialogHeader>
          <Div className="space-y-4 py-4">
            <Div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={updateData.status}
                onValueChange={(val) =>
                  setUpdateData({
                    ...updateData,
                    status: val,
                  })
                }
              >
                <SelectTrigger>
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
            </Div>
            <Div className="space-y-2">
              <Label className="text-sm font-medium">Admin Response</Label>
              <Textarea
                className="w-full min-h-[100px] p-3 border rounded-md"
                placeholder="Type your response here..."
                value={updateData.adminResponse}
                onChange={(e) =>
                  setUpdateData({
                    ...updateData,
                    adminResponse: e.target.value,
                  })
                }
              />
            </Div>
          </Div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button onClick={() => setEditingComplaint(null)} className="px-4 py-2 border rounded-md">
              Cancel
            </Button>
            <Button onClick={handleUpdateComplaint} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
