/* Ported from Frontend/src/modules/Food/pages/admin/system/DiningRequests.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, UtensilsCrossed, Loader2, MapPin } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { AdminPage, PageHeader, Card, StatusBadge, LoadingState, EmptyState, ErrorState, BTN_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
import { toast } from '../../../../lib/notify';
import { Button, Div, Img, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { window } from '../../../../lib/webShim';
const debugError = (...args) => {};
export default function DiningRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  const { tablet } = useLayoutWidth();
  const factWidth = tablet ? { width: '31.5%' } : { width: '100%' };
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
    <AdminPage>
      <PageHeader
        icon={UtensilsCrossed}
        title="Dining Category Requests"
        subtitle="Review and approve restaurant dining setting updates"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Dining requests' }]}
      />

      {error ? <ErrorState message={error} onRetry={fetchRequests} className="mb-4" /> : null}

      {loading ? (
        <LoadingState label="Loading pending requests…" />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No pending requests"
          message="All dining settings updates have been processed."
          actionLabel="Refresh"
          onAction={fetchRequests}
        />
      ) : (
        <Div className="gap-3">
          {requests.map((request) => {
            const busy = processingId === request._id;
            return (
              <Card key={request._id} className="gap-3">
                <Div className="flex-row items-start gap-3">
                  {request.restaurant?.profileImage?.url ? (
                    <Img src={request.restaurant.profileImage.url} alt={request.restaurant.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                  ) : (
                    <Div className="w-12 h-12 rounded-lg bg-slate-100 items-center justify-center border border-slate-200">
                      <UiIcon as={UtensilsCrossed} size={20} className="text-slate-400" />
                    </Div>
                  )}
                  <Div className="flex-1 min-w-0 gap-1">
                    <Text style={tw`text-base font-semibold text-slate-900`} numberOfLines={2}>
                      {request.restaurant?.name || 'Unknown Restaurant'}
                    </Text>
                    <Div className="flex-row items-start gap-1">
                      <UiIcon as={MapPin} size={12} className="text-slate-400 mt-0.5" />
                      <Text style={tw`text-sm text-slate-500 flex-1`} numberOfLines={2}>
                        {request.restaurant?.address || 'No address provided'}
                      </Text>
                    </Div>
                  </Div>
                  <StatusBadge status="pending" label="Pending" />
                </Div>

                <Div className="flex-row flex-wrap gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <Div style={factWidth} className="gap-1">
                    <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`}>Dining Status</Text>
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={request.requestedSettings?.isEnabled ? CheckCircle2 : XCircle} size={14} className={request.requestedSettings?.isEnabled ? 'text-green-700' : 'text-slate-400'} />
                      <Text style={tw`text-sm font-semibold text-slate-900`}>{request.requestedSettings?.isEnabled ? 'Enabled' : 'Disabled'}</Text>
                    </Div>
                  </Div>
                  <Div style={factWidth} className="gap-1">
                    <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`}>Requested Category</Text>
                    <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={3}>
                      {(() => {
                        const raw = request.requestedSettings?.diningType;
                        if (!raw) return 'Not specified';
                        // Handle array or string by converting to string and splitting everything
                        const allSlugs = String(raw)
                          .split(',')
                          .map((s) => s.trim());
                        return [...new Set(allSlugs)].filter(Boolean).join(', ');
                      })()}
                    </Text>
                  </Div>
                  <Div style={factWidth} className="gap-1">
                    <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`}>Max Guests Limit</Text>
                    <Text style={tw`text-sm font-semibold text-slate-900`}>{request.requestedSettings?.maxGuests || 'No limit'} Guests</Text>
                  </Div>
                </Div>

                <Div className="flex-row flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <Text style={tw`text-xs text-slate-500`}>Requested on {new Date(request.createdAt).toLocaleString()}</Text>
                  <Div className="flex-row items-center gap-2">
                    <Button onClick={() => handleReject(request._id)} disabled={busy} className={`${BTN_SECONDARY} border-red-200`}>
                      {busy ? <UiIcon as={Loader2} size={16} className="text-red-600" /> : <Span className="text-sm font-semibold text-red-600">Reject</Span>}
                    </Button>
                    <Button onClick={() => handleApprove(request._id)} disabled={busy} className="flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg bg-blue-600">
                      {busy ? <UiIcon as={Loader2} size={16} className="text-white" /> : <Span className="text-sm font-semibold text-white">Approve Changes</Span>}
                    </Button>
                  </Div>
                </Div>
              </Card>
            );
          })}
        </Div>
      )}
    </AdminPage>
  );
}
