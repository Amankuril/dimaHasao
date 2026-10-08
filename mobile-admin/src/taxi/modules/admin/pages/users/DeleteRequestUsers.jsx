/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/DeleteRequestUsers.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../../../../../lib/webRouter';
import { ArrowLeft, CheckCircle2, Eye, Search, Trash2, XCircle } from 'lucide-react-native';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  Pagination,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../../../../admin/ui';

const formatDate = (date) => {
  if (!date) return 'Unknown';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Unknown' : parsed.toLocaleDateString();
};
const getInitials = (name) =>
  String(name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

const COLS = [190, 200, 130, 110, 140];
const LABELS = ['User', 'Reason', 'Requested', 'Status', 'Action'];

const DeleteRequestUsers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fetchDeleteRequests = async () => {
    setIsLoading(true);
    setError('');
    try {
      const requestData = await adminService.getUserDeleteRequests();
      const requestList = requestData.data?.results || [];
      setUsers(requestList);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch delete requests');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchDeleteRequests();
  }, []);
  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const query = searchTerm.toLowerCase();
        const name = user.name || user.user_id?.name || '';
        const email = user.email || user.user_id?.email || '';
        const reason = user.deletionRequest?.reason || '';
        return name.toLowerCase().includes(query) || email.toLowerCase().includes(query) || reason.toLowerCase().includes(query);
      }),
    [searchTerm, users],
  );
  const handleReject = async (id) => {
    if (!(await window.confirmAsync('Reject this account deletion request?'))) return;
    setIsSubmitting(true);
    try {
      const data = await adminService.rejectUserDeleteRequest(id);
      if (data.success) {
        toast.success('Delete request rejected');
        fetchDeleteRequests();
      }
    } catch (rejectError) {
      toast.error(rejectError.message || 'Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleApprove = async (id) => {
    if (!(await window.confirmAsync('Approve this account deletion request? The user will be logged out and deactivated.'))) return;
    setIsSubmitting(true);
    try {
      const data = await adminService.approveUserDeleteRequest(id);
      if (data.success) {
        toast.success('Delete request approved');
        fetchDeleteRequests();
      }
    } catch (approveError) {
      toast.error(approveError.message || 'Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const header = (
    <PageHeader
      icon={Trash2}
      title="Delete Requests"
      subtitle="Review customer account deletion requests"
      breadcrumb={[{ label: 'Users' }, { label: 'Delete Requests' }]}
      actions={
        <Button type="button" onClick={() => navigate('/taxi/admin/users')} className="flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg border border-slate-300 bg-white" accessibilityLabel="Back to users">
          <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
          <Span className="text-sm font-semibold text-slate-700">Back</Span>
        </Button>
      }
    />
  );

  if (isLoading) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        <LoadingState label="Loading delete requests…" />
      </AdminPage>
    );
  }

  return (
    <AdminPage maxWidth={1200}>
      {header}

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, email or reason"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
        </Toolbar>
      </Card>

      {error ? (
        <ErrorState title="Could not load delete requests" message={error} onRetry={fetchDeleteRequests} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title={searchTerm ? 'No matching requests' : 'No pending delete requests'}
          message={searchTerm ? 'No request matches that name, email or reason.' : 'Account deletion requests from riders show up here for review.'}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={LABELS} />
            <TBody>
              {filteredUsers.map((user, i) => (
                <Row key={user._id} last={i === filteredUsers.length - 1}>
                  <Cell width={COLS[0]}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                        <Span className="text-xs font-semibold text-slate-600">{getInitials(user.name || user.user_id?.name)}</Span>
                      </Div>
                      <Button type="button" onClick={() => navigate(`/taxi/admin/users/${user._id}`)} className="flex-1 min-w-0 py-1">
                        <Span className="text-sm font-medium text-slate-900" numberOfLines={1}>
                          {user.name || user.user_id?.name || 'Unknown'}
                        </Span>
                        <Span className="text-xs text-slate-500" numberOfLines={1}>
                          {user.email || user.user_id?.email || 'N/A'}
                        </Span>
                      </Button>
                    </Div>
                  </Cell>
                  <Cell width={COLS[1]} numberOfLines={3}>
                    {user.deletionRequest?.reason || 'N/A'}
                  </Cell>
                  <Cell width={COLS[2]}>{formatDate(user.deletionRequest?.requestedAt)}</Cell>
                  <Cell width={COLS[3]}>
                    <StatusBadge status="pending" label="Pending" />
                  </Cell>
                  <Cell width={COLS[4]}>
                    <Div className="flex-row items-center gap-1">
                      <Button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => navigate(`/taxi/admin/users/${user._id}`)}
                        accessibilityLabel="View this user"
                        className={`w-11 h-11 items-center justify-center rounded-lg ${isSubmitting ? 'opacity-50' : ''}`}
                      >
                        <UiIcon as={Eye} size={18} className="text-slate-500" />
                      </Button>
                      <Button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleReject(user._id)}
                        accessibilityLabel="Reject this request"
                        className={`w-11 h-11 items-center justify-center rounded-lg ${isSubmitting ? 'opacity-50' : ''}`}
                      >
                        <UiIcon as={XCircle} size={18} className="text-red-600" />
                      </Button>
                      <Button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleApprove(user._id)}
                        accessibilityLabel="Approve this request"
                        className={`w-11 h-11 items-center justify-center rounded-lg ${isSubmitting ? 'opacity-50' : ''}`}
                      >
                        <UiIcon as={CheckCircle2} size={18} className="text-green-700" />
                      </Button>
                    </Div>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
          <Pagination page={1} pages={1} total={filteredUsers.length} />
        </>
      )}
    </AdminPage>
  );
};
export default DeleteRequestUsers;
