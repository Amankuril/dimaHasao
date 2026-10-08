/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverDeleteRequests.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { useNavigate } from '../../../../../lib/webRouter';
import { AlertCircle, ChevronRight, Search, UserX, CheckCircle2, XCircle } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { Br, Button, Div, H1, H2, H4, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
const DriverDeleteRequests = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fetchDeleteRequests = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await adminService.getDriverDeleteRequests();
      if (response?.success) {
        setDrivers(response?.data?.results || []);
      } else {
        setError(response?.message || 'Unable to load driver delete requests');
      }
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load driver delete requests');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchDeleteRequests();
  }, []);
  const handleApprove = async (id) => {
    if (!(await window.confirmAsync('Approve this driver account deletion request?'))) return;
    setIsSubmitting(true);
    try {
      const response = await adminService.approveDriverDeleteRequest(id);
      if (response?.success) {
        fetchDeleteRequests();
      } else {
        alert(response?.message || 'Failed to approve delete request');
      }
    } catch (requestError) {
      alert(requestError?.message || 'Failed to approve delete request');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleReject = async (id) => {
    if (!(await window.confirmAsync('Reject this driver account deletion request?'))) return;
    setIsSubmitting(true);
    try {
      const response = await adminService.rejectDriverDeleteRequest(id);
      if (response?.success) {
        fetchDeleteRequests();
      } else {
        alert(response?.message || 'Failed to reject delete request');
      }
    } catch (requestError) {
      alert(requestError?.message || 'Failed to reject delete request');
    } finally {
      setIsSubmitting(false);
    }
  };
  const filteredDrivers = drivers.filter((item) => {
    const name = String(item.name || '').toLowerCase();
    const mobile = String(item.mobile || item.phone || '');
    const reason = String(item.deletionRequest?.reason || '').toLowerCase();
    const needle = searchTerm.toLowerCase();
    return name.includes(needle) || mobile.includes(searchTerm) || reason.includes(needle);
  });
  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  if (isLoading) {
    return (
      <ScrollDiv className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Div className="w-12 h-12 border-4 border-gray-100 border-t-black rounded-full animate-spin"></Div>
        <P className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Loading delete requests...</P>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-[#F8FAFC] p-3 lg:p-4 font-sans text-gray-900 space-y-4">
      <Div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Div>
          <Div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-0.5">
            <Span>Driver Management</Span>
            <UiIcon as={ChevronRight} size={10} />
            <Span className="text-gray-700 font-medium">Delete Requests</Span>
          </Div>
          <H1 className="text-base font-bold text-gray-900">Delete requests</H1>
        </Div>
      </Div>

      {error ? <Div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</Div> : null}

      <Div className="bg-white rounded-lg border border-gray-200 p-3">
        <Div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Div className="flex items-center gap-3">
            <Div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
              <UiIcon as={AlertCircle} size={18} />
            </Div>
            <Div>
              <H2 className="text-sm font-bold text-gray-900">Delete requests</H2>
              <P className="text-xs text-gray-500">{drivers.length} pending requests</P>
            </Div>
          </Div>

          <Div className="relative w-full md:w-96">
            <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input
              type="text"
              placeholder="Search by driver name, mobile number or request ID"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 transition-colors"
            />
          </Div>
        </Div>
      </Div>

      <Div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Div>
          <Table cols={[220, 130, 200, 150, 180]} className="w-full text-left border-collapse whitespace-nowrap">
            <Thead>
              <Tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <Th className="px-3 py-2">Driver</Th>
                <Th className="px-3 py-2">Mobile</Th>
                <Th className="px-3 py-2">Reason</Th>
                <Th className="px-3 py-2">Requested at</Th>
                <Th className="px-3 py-2 text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {filteredDrivers.length === 0 ? (
                <Tr>
                  <Td colSpan="5" className="px-4 py-12 text-center">
                    <Div className="flex flex-col items-center justify-center gap-2">
                      <UiIcon as={UserX} size={32} className="text-gray-300 mb-2" />
                      <P className="text-sm font-bold text-gray-900">No delete requests</P>
                      <P className="text-xs text-gray-500 leading-relaxed">
                        There are currently no driver account deletion requests.
                        <Br />
                        New requests will automatically appear here.
                      </P>
                    </Div>
                  </Td>
                </Tr>
              ) : (
                filteredDrivers.map((item) => (
                  <Tr key={item._id} className="hover:bg-gray-50 transition-colors">
                    <Td className="px-3 py-2">
                      <Div className="flex items-center gap-2.5">
                        <Div className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-[10px] border border-gray-200">
                          {(item.name || 'D')[0]}
                        </Div>
                        <Div>
                          <Div className="flex items-center gap-1.5">
                            <P className="text-xs font-medium text-gray-900">{item.name || 'Unknown'}</P>
                            <Span className="font-mono text-[9px] font-semibold px-1 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                              {item.driver_code ||
                                item.referralCode ||
                                (item.mobile || item.phone
                                  ? `DRV${String(item.mobile || item.phone).slice(-4)}${String(item._id || '')
                                      .slice(-6)
                                      .toUpperCase()}`.replace(/\W/g, '')
                                  : 'N/A')}
                            </Span>
                          </Div>
                          <P className="text-[10px] text-gray-500 mt-0.5">{item.email || 'No email'}</P>
                        </Div>
                      </Div>
                    </Td>
                    <Td className="px-3 py-2 font-medium">{item.mobile || item.phone || 'N/A'}</Td>
                    <Td className="px-3 py-2 max-w-[200px]">
                      <P className="text-gray-600 truncate">{item.deletionRequest?.reason || 'N/A'}</P>
                    </Td>
                    <Td className="px-3 py-2 text-[10px] text-gray-500">{formatDate(item.deletionRequest?.requestedAt)}</Td>
                    <Td className="px-3 py-2 text-right">
                      <Div className="flex items-center justify-end gap-2">
                        <Button
                          disabled={isSubmitting}
                          onClick={() => handleApprove(item._id)}
                          className="px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-[10px] font-semibold hover:bg-green-100 transition-colors border border-green-200 disabled:opacity-50 flex items-center gap-1"
                        >
                          <UiIcon as={CheckCircle2} size={12} /> Approve
                        </Button>
                        <Button
                          disabled={isSubmitting}
                          onClick={() => handleReject(item._id)}
                          className="px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-[10px] font-semibold hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50 flex items-center gap-1"
                        >
                          <UiIcon as={XCircle} size={12} /> Reject
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Div>

        <Div className="p-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-sm">
          <Div>
            <P className="font-semibold text-gray-900 text-xs">Pending queue</P>
            <P className="text-[11px] text-gray-500">{filteredDrivers.length} requests waiting for review</P>
          </Div>
          <Button
            type="button"
            onClick={() => navigate('/taxi/admin/drivers')}
            className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            &larr; Back to Drivers
          </Button>
        </Div>
      </Div>

      <Div
        className="rounded-xl p-4 text-xs relative overflow-hidden"
        style={{
          backgroundColor: '#FFF8E1',
          borderColor: '#F4C542',
          borderWidth: 1,
        }}
      >
        <Div className="flex items-start gap-3 relative z-10">
          <Div className="text-yellow-600 shrink-0 mt-0.5">
            <UiIcon as={AlertCircle} size={16} />
          </Div>
          <Div>
            <H4 className="font-bold text-gray-900 mb-1">Delete review protocol</H4>
            <P className="text-gray-700 mb-1">{"Approving a request permanently deactivates the driver's account and removes access to the platform."}</P>
            <P className="text-gray-700">Rejecting a request keeps the account active. Please review all submitted information before taking action.</P>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default DriverDeleteRequests;
