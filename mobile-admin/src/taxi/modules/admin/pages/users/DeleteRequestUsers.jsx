/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/DeleteRequestUsers.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../../../../../lib/webRouter';
import { ArrowLeft, CheckCircle2, ChevronRight, Eye, Loader2, Search, Trash2, XCircle } from 'lucide-react-native';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import { Button, Div, H1, H3, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const inputClass =
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';
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
  if (isLoading) {
    return (
      <ScrollDiv className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <UiIcon as={Loader2} className="w-7 h-7 text-indigo-600 animate-spin" />
        <P className="text-sm text-gray-400">Loading delete requests...</P>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <Div className="mb-4">
        <Div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <Span>Users</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700 font-medium">Delete Requests</Span>
        </Div>

        <Div className="flex items-center justify-between gap-4">
          <H1 className="text-lg text-gray-900 font-bold">Delete Requests</H1>
          <Button
            type="button"
            onClick={() => navigate('/taxi/admin/users')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        </Div>
      </Div>

      {error && <Div className="mb-6 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</Div>}

      <Div>
        <Div>
          <Div className="bg-white rounded-xl border border-gray-200 p-6">
            <Div className="flex flex-col gap-4 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
              <Div className="flex items-center gap-3">
                <Div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <UiIcon as={Trash2} size={18} />
                </Div>
                <Div>
                  <H3 className="text-sm text-gray-900 font-bold">Pending Requests</H3>
                  <P className="text-xs text-gray-400">Review customer account deletion requests</P>
                </Div>
              </Div>

              <Div className="relative w-full md:w-80">
                <UiIcon as={Search} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search delete requests..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className={`${inputClass} pl-10`}
                />
              </Div>
            </Div>

            <Div className="mt-5">
              <Table cols={[220, 240, 150, 120, 132]} className="w-full">
                <Thead>
                  <Tr className="bg-gray-50 border-b border-gray-100">
                    <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">User</Th>
                    <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Reason</Th>
                    <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Requested Date</Th>
                    <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">Status</Th>
                    <Th className="px-4 py-3 text-right text-xs font-semibold text-gray-900">Action</Th>
                  </Tr>
                </Thead>
                <Tbody className="divide-y divide-gray-50">
                  {filteredUsers.length === 0 ? (
                    <Tr>
                      <Td colSpan="5" className="px-4 py-14 text-center text-sm font-medium text-gray-400">
                        No pending delete requests found.
                      </Td>
                    </Tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <Tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                        <Td className="px-4 py-4">
                          <Div className="flex items-center gap-3">
                            <Div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 font-medium text-xs flex items-center justify-center">
                              {getInitials(user.name || user.user_id?.name)}
                            </Div>
                            <Div>
                              <Button
                                type="button"
                                onClick={() => navigate(`/taxi/admin/users/${user._id}`)}
                                className="text-left text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline transition-colors"
                              >
                                {user.name || user.user_id?.name || 'Unknown'}
                              </Button>
                              <P className="text-xs text-gray-400">{user.email || user.user_id?.email || 'N/A'}</P>
                            </Div>
                          </Div>
                        </Td>
                        <Td className="px-4 py-4 text-sm text-gray-700">
                          <Span className="block max-w-[220px] truncate">{user.deletionRequest?.reason || 'N/A'}</Span>
                        </Td>
                        <Td className="px-4 py-4 text-sm text-gray-500">{formatDate(user.deletionRequest?.requestedAt)}</Td>
                        <Td className="px-4 py-4">
                          <Span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <Span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Pending
                          </Span>
                        </Td>
                        <Td className="px-4 py-4 text-right">
                          <Div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => navigate(`/taxi/admin/users/${user._id}`)}
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <UiIcon as={Eye} size={16} />
                            </Button>
                            <Button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleReject(user._id)}
                              className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <UiIcon as={XCircle} size={16} />
                            </Button>
                            <Button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleApprove(user._id)}
                              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <UiIcon as={CheckCircle2} size={16} />
                            </Button>
                          </Div>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Div>

            <Div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
              <Span>
                Showing {filteredUsers.length ? 1 : 0} to {filteredUsers.length} of {filteredUsers.length} entries
              </Span>
              <Div className="flex items-center gap-2">
                <Button className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg disabled:opacity-50" disabled>
                  Prev
                </Button>
                <Button className="px-4 py-2 text-sm text-white bg-indigo-600 border border-indigo-600 rounded-lg">1</Button>
                <Button className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg disabled:opacity-50" disabled>
                  Next
                </Button>
              </Div>
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default DeleteRequestUsers;
