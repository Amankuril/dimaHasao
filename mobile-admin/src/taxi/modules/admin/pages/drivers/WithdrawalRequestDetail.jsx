/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/WithdrawalRequestDetail.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Car,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  User,
  Wallet,
  XCircle,
} from 'lucide-react-native';
import { useLocation, useNavigate, useParams } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { A, Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../../components/web';
const formatMoney = (value) => `₹ ${Number(value || 0).toFixed(2)}`;
const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const COLS = [140, 150, 130, 110, 130, 110, 100];
const DetailRow = ({ icon, label, value }) => (
  <Div className="flex-row items-start gap-2">
    {icon ? <UiIcon as={icon} size={14} className="text-slate-400 mt-0.5" /> : null}
    <Div className="flex-1 min-w-0">
      <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</P>
      <P className="text-sm text-slate-900">{value || '—'}</P>
    </Div>
  </Div>
);
const WithdrawalRequestDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const requestId = new URLSearchParams(location.search).get('requestId');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [history, setHistory] = useState([]);
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState('');
  const { tablet } = useLayoutWidth();
  const applyPayload = (payload = {}) => {
    setDriver(payload.driver || null);
    setHistory(
      (payload.results || []).map((item) => ({
        id: item._id,
        createdAt: item.createdAt,
        name: payload.driver?.name || 'Unknown',
        phone: payload.driver?.mobile || 'N/A',
        amount: Number(item.amount || 0),
        currency: item.requested_currency || 'INR',
        status: item.status || 'pending',
        paymentMethod: item.payment_method || 'bank_transfer',
        bankDetailsSnapshot: item.bank_details_snapshot || {},
      })),
    );
  };
  const loadData = async () => {
    try {
      setIsLoading(true);
      setFeedback('');
      try {
        const response = await adminService.getDriverWithdrawals(id, {
          limit: itemsPerPage,
        });
        applyPayload(response?.data || response || {});
      } catch {
        const fallbackResponse = await adminService.getDriverWithdrawalContextByRequestId(requestId || id, {
          limit: itemsPerPage,
        });
        applyPayload(fallbackResponse?.data || fallbackResponse || {});
      }
    } catch (error) {
      console.error('Unable to load driver withdrawal detail', error);
      setDriver(null);
      setHistory([]);
      setFeedback(error?.response?.data?.message || 'Unable to load withdrawal details right now.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, [id, itemsPerPage, requestId]);
  const filteredHistory = useMemo(() => {
    const query = String(searchTerm || '')
      .trim()
      .toLowerCase();
    if (!query) return history;
    return history.filter((item) =>
      [item.name, item.phone, item.status, item.paymentMethod, formatMoney(item.amount), formatDateTime(item.createdAt)]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [history, searchTerm]);
  const pendingCount = useMemo(() => history.filter((item) => item.status === 'pending').length, [history]);
  const pendingAmount = useMemo(() => history.filter((item) => item.status === 'pending').reduce((sum, item) => sum + Number(item.amount || 0), 0), [history]);
  const latestPaymentMethod = useMemo(() => history.find((item) => item.paymentMethod)?.paymentMethod || 'bank_transfer', [history]);
  const selectedRequest = useMemo(() => {
    if (requestId) {
      const matched = history.find((item) => String(item.id) === String(requestId));
      if (matched) {
        return matched;
      }
    }
    return history[0] || null;
  }, [history, requestId]);
  const bankDetails = useMemo(() => {
    const snapshot = selectedRequest?.bankDetailsSnapshot || {};
    const hasSnapshotValue = [
      snapshot.accountHolderName,
      snapshot.upiId,
      snapshot.qrCodeImage,
      snapshot.accountNumber,
      snapshot.ifsc,
      snapshot.branchName,
    ].some((value) => String(value || '').trim());
    return hasSnapshotValue ? snapshot : driver?.bankDetails || {};
  }, [driver?.bankDetails, selectedRequest]);
  const maskedAccountNumber = bankDetails.accountNumber ? bankDetails.accountNumber.slice(-4).padStart(bankDetails.accountNumber.length, '*') : '';
  const handleAction = async (requestId, action) => {
    try {
      setActionLoadingId(requestId);
      setFeedback('');
      if (action === 'approve') {
        await adminService.approveDriverWithdrawalRequest(requestId);
        setFeedback('Withdrawal request approved and deducted from driver wallet.');
      } else {
        await adminService.rejectDriverWithdrawalRequest(requestId);
        setFeedback('Withdrawal request rejected.');
      }
      await loadData();
    } catch (error) {
      console.error(`Unable to ${action} withdrawal request`, error);
      setFeedback(error?.response?.data?.message || `Unable to ${action} this withdrawal request right now.`);
    } finally {
      setActionLoadingId('');
    }
  };
  const showError = !isLoading && !driver && feedback;
  const header = (
    <PageHeader
      icon={Wallet}
      title="Withdrawal Details"
      subtitle="Driver payout request and history"
      breadcrumb={[
        { label: 'Wallet' },
        { label: 'Withdrawals', onPress: () => navigate('/taxi/admin/drivers/wallet/withdrawals') },
        { label: 'Driver Request' },
      ]}
      actions={
        <Button onClick={() => navigate('/taxi/admin/drivers/wallet/withdrawals')} className={BTN_SECONDARY}>
          <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
          <Span className={BTN_TEXT_SECONDARY}>Back</Span>
        </Button>
      }
    />
  );
  if (showError) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        <ErrorState title="Could not load withdrawal details" message={feedback} onRetry={loadData} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200}>
      {header}

      {feedback ? (
        <Card className="mb-4 flex-row items-start gap-2">
          <UiIcon as={AlertCircle} size={16} className="text-blue-600 mt-0.5" />
          <Span className="text-sm text-slate-700 flex-1">{feedback}</Span>
        </Card>
      ) : null}

      <StatGrid className="mb-4">
        <StatCard label="Current wallet balance" value={formatMoney(driver?.wallet?.balance)} hint={driver?.wallet?.isBlocked ? 'Wallet blocked' : 'Wallet verified'} icon={ShieldCheck} tone={driver?.wallet?.isBlocked ? 'danger' : 'success'} />
        <StatCard label="Pending requests" value={pendingCount} icon={Wallet} tone="warning" />
        <StatCard label="Pending amount" value={formatMoney(pendingAmount)} hint={String(latestPaymentMethod || 'bank_transfer').replace(/_/g, ' ')} icon={Building} tone="info" />
      </StatGrid>

      <Div className={tablet ? 'flex-row items-start gap-4 mb-4' : 'gap-4 mb-4'}>
        <Card className={tablet ? 'gap-3 flex-1' : 'gap-3'}>
          <SectionTitle>Driver details</SectionTitle>
          <DetailRow icon={User} label="Name" value={driver?.name} />
          <DetailRow icon={Phone} label="Phone" value={driver?.mobile} />
          <DetailRow icon={Mail} label="Email" value={driver?.email} />
          <DetailRow icon={MapPin} label="City" value={driver?.city} />
          <DetailRow
            icon={Car}
            label="Vehicle"
            value={driver?.vehicle_type ? `${driver.vehicle_type}${driver?.vehicle_number ? ` · ${driver.vehicle_number}` : ''}` : driver?.vehicle_number}
          />
        </Card>

        <Card className={tablet ? 'gap-3 flex-1' : 'gap-3'}>
          <SectionTitle>Bank details</SectionTitle>
          <DetailRow label="Account holder name" value={bankDetails.accountHolderName} />
          <DetailRow label="UPI ID" value={bankDetails.upiId} />
          <DetailRow label="Account number" value={maskedAccountNumber} />
          <DetailRow label="IFSC" value={bankDetails.ifsc} />
          <DetailRow label="Branch name" value={bankDetails.branchName} />
          <Div>
            <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">UPI QR code</P>
            {bankDetails.qrCodeImage ? (
              <A href={bankDetails.qrCodeImage} className="flex-row items-center gap-2 mt-1">
                <UiIcon as={QrCode} size={14} className="text-blue-600" />
                <Span className="text-sm font-semibold text-blue-600">View QR code</Span>
              </A>
            ) : (
              <P className="text-sm text-slate-900">—</P>
            )}
          </Div>
        </Card>
      </Div>

      <Card className="mb-4">
        <SectionTitle>Withdrawal request history</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter history"
              className={`${INPUT} flex-1`}
            />
          </Div>
          <Select value={itemsPerPage} onChange={(event) => setItemsPerPage(Number(event.target.value) || 10)} className={INPUT}>
            <Option value={10}>Show 10</Option>
            <Option value={25}>Show 25</Option>
            <Option value={50}>Show 50</Option>
          </Select>
        </Toolbar>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : filteredHistory.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No withdrawal requests"
          message={searchTerm ? 'No request matches this filter.' : 'This driver has not requested a payout yet.'}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['Date', 'Name', 'Mobile', 'Amount', 'Method', 'Status', 'Actions']} />
            <TBody>
              {filteredHistory.map((request, i) => (
                <Row key={request.id} last={i === filteredHistory.length - 1}>
                  <Cell width={COLS[0]}>{formatDateTime(request.createdAt)}</Cell>
                  <Cell width={COLS[1]}>
                    <Span className="text-sm font-semibold text-slate-900">{request.name}</Span>
                  </Cell>
                  <Cell width={COLS[2]}>{request.phone}</Cell>
                  <Cell width={COLS[3]} align="right">
                    <Span className="text-sm font-semibold text-slate-900">{formatMoney(request.amount)}</Span>
                  </Cell>
                  <Cell width={COLS[4]}>{String(request.paymentMethod || 'bank_transfer').replace(/_/g, ' ')}</Cell>
                  <Cell width={COLS[5]}>
                    <StatusBadge status={request.status} />
                  </Cell>
                  <Cell width={COLS[6]}>
                    {request.status === 'pending' ? (
                      <Div className="flex-row items-center gap-1">
                        <Button
                          onClick={() => handleAction(request.id, 'approve')}
                          disabled={actionLoadingId === request.id}
                          accessibilityLabel="Approve request"
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={CheckCircle2} size={16} className="text-green-700" />
                        </Button>
                        <Button
                          onClick={() => handleAction(request.id, 'reject')}
                          disabled={actionLoadingId === request.id}
                          accessibilityLabel="Reject request"
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={XCircle} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    ) : (
                      <Span className="text-sm text-slate-400">—</Span>
                    )}
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
          <P className="text-xs text-slate-500 mt-3">
            Showing {filteredHistory.length} of {history.length} entries
          </P>
        </>
      )}
    </AdminPage>
  );
};
export default WithdrawalRequestDetail;
