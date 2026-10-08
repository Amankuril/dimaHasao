/* Ported from Frontend/src/modules/Food/pages/admin/system/DiningRequests.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, UtensilsCrossed, Loader2, AlertCircle, CheckCircle2, ChevronRight, User, MapPin } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { Button } from '../../../../components/shadcn';
import { Badge } from '../../../../components/shadcn';
import { toast } from '../../../../lib/notify';
import { Div, H1, H3, Img, P, ScrollDiv, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';
const debugError = (...args) => {};
export default function DiningRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchRequests();
  }, []);
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDiningRequests();
      if (response.data.success) {
        const data = response.data.data;
        const list = Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : [];
        setRequests(list);
      }
    } catch (err) {
      debugError('Error fetching dining requests:', err);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };
  const handleApprove = async (requestId) => {
    if (!(await window.confirmAsync('Approve this dining settings update?'))) return;
    try {
      setProcessingId(requestId);
      const response = await adminAPI.approveDiningRequest(requestId);
      if (response.data.success) {
        toast.success('Request approved successfully');
        setRequests(requests.filter((r) => r._id !== requestId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };
  const handleReject = async (requestId) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return; // Cancelled prompt

    try {
      setProcessingId(requestId);
      const response = await adminAPI.rejectDiningRequest(requestId, reason);
      if (response.data.success) {
        toast.success('Request rejected');
        setRequests(requests.filter((r) => r._id !== requestId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-plum-600 flex items-center justify-center">
              <UiIcon as={UtensilsCrossed} className="w-5 h-5 text-white" />
            </Div>
            <Div>
              <H1 className="text-2xl font-bold text-slate-900">Dining Category Requests</H1>
              <P className="text-sm text-slate-600 mt-1">Review and approve restaurant dining setting updates</P>
            </Div>
          </Div>
        </Div>

        {error && (
          <Div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 max-w-2xl">
            <UiIcon as={AlertCircle} className="w-5 h-5" />
            {error}
            <Button variant="link" onClick={fetchRequests} className="text-red-800 font-bold p-0 ml-auto">
              Retry
            </Button>
          </Div>
        )}

        {loading ? (
          <Div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-dashed border-slate-300">
            <UiIcon as={Loader2} className="w-10 h-10 animate-spin text-plum-600 mb-4" />
            <P className="text-slate-500 font-medium">Loading pending requests...</P>
          </Div>
        ) : requests.length === 0 ? (
          <Div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-dashed border-slate-300">
            <Div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <UiIcon as={CheckCircle2} className="w-8 h-8 text-slate-400" />
            </Div>
            <H3 className="text-lg font-bold text-slate-900">No Pending Requests</H3>
            <P className="text-slate-500 text-center max-w-xs mt-1">All dining settings updates have been processed.</P>
          </Div>
        ) : (
          <Div className="grid gap-6">
            {requests.map((request) => (
              <Div key={request._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Div className="p-6">
                  <Div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <Div className="flex items-center gap-4">
                      {request.restaurant?.profileImage?.url ? (
                        <Img
                          src={request.restaurant.profileImage.url}
                          alt={request.restaurant.name}
                          className="w-14 h-14 rounded-lg object-cover border border-slate-100"
                        />
                      ) : (
                        <Div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-100">
                          <UiIcon as={UtensilsCrossed} className="w-6 h-6 text-slate-400" />
                        </Div>
                      )}
                      <Div>
                        <H3 className="text-lg font-bold text-slate-900">{request.restaurant?.name || 'Unknown Restaurant'}</H3>
                        <Div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <UiIcon as={MapPin} className="w-3.5 h-3.5" />
                          {request.restaurant?.address || 'No address provided'}
                        </Div>
                      </Div>
                    </Div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 py-1 px-3">
                      <UiIcon as={Clock} className="w-3.5 h-3.5" />
                      Pending
                    </Badge>
                  </Div>

                  <Div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <Div className="space-y-1">
                      <P className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dining Status</P>
                      <P className="font-semibold text-slate-900 flex items-center gap-2">
                        {request.requestedSettings?.isEnabled ? (
                          <>
                            <UiIcon as={CheckCircle2} className="w-4 h-4 text-green-500" /> Enabled
                          </>
                        ) : (
                          <>
                            <UiIcon as={XCircle} className="w-4 h-4 text-slate-400" /> Disabled
                          </>
                        )}
                      </P>
                    </Div>
                    <Div className="space-y-1">
                      <P className="text-xs font-bold text-slate-400 uppercase tracking-wider">Requested Category</P>
                      <P className="font-semibold text-slate-900">
                        {(() => {
                          const raw = request.requestedSettings?.diningType;
                          if (!raw) return 'Not specified';
                          // Handle array or string by converting to string and splitting everything
                          const allSlugs = String(raw)
                            .split(',')
                            .map((s) => s.trim());
                          return [...new Set(allSlugs)].filter(Boolean).join(', ');
                        })()}
                      </P>
                    </Div>
                    <Div className="space-y-1">
                      <P className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Guests Limit</P>
                      <P className="font-semibold text-slate-900">{request.requestedSettings?.maxGuests || 'No limit'} Guests</P>
                    </Div>
                  </Div>

                  <Div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                    <Div className="text-sm text-slate-500 italic">Requested on: {new Date(request.createdAt).toLocaleString()}</Div>
                    <Div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleReject(request._id)}
                        disabled={processingId === request._id}
                        className="border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-semibold"
                      >
                        {processingId === request._id ? <UiIcon as={Loader2} className="w-4 h-4 animate-spin" /> : 'Reject'}
                      </Button>
                      <Button
                        onClick={() => handleApprove(request._id)}
                        disabled={processingId === request._id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-sm shadow-emerald-200 transition-all"
                      >
                        {processingId === request._id ? <UiIcon as={Loader2} className="w-4 h-4 animate-spin" /> : 'Approve Changes'}
                      </Button>
                    </Div>
                  </Div>
                </Div>
              </Div>
            ))}
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
}
