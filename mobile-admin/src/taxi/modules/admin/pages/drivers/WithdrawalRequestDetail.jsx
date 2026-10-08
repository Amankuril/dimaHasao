/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/WithdrawalRequestDetail.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Car,
  CheckCircle2,
  ChevronRight,
  IndianRupee,
  Mail,
  MapPin,
  MoreHorizontal,
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
  A,
  Button,
  Div,
  H1,
  H3,
  H4,
  Input,
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
} from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;
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
const getStatusClasses = (status) => {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  if (status === 'cancelled') return 'bg-rose-50 text-rose-600 border-rose-200';
  return 'bg-amber-50 text-amber-600 border-amber-200';
};
const WithdrawalRequestDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const requestId = new URLSearchParams(location.search).get('requestId');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeMenu, setActiveMenu] = useState(null);
  const [history, setHistory] = useState([]);
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState('');
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
  useEffect(() => {
    const handleClose = () => setActiveMenu(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);
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
  const toggleMenu = (event, requestId) => {
    event.stopPropagation();
    setActiveMenu((current) => (current === requestId ? null : requestId));
  };
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
      setActiveMenu(null);
      await loadData();
    } catch (error) {
      console.error(`Unable to ${action} withdrawal request`, error);
      setFeedback(error?.response?.data?.message || `Unable to ${action} this withdrawal request right now.`);
    } finally {
      setActionLoadingId('');
    }
  };
  return (
    <ScrollDiv className="space-y-8 p-1 animate-in fade-in duration-700 font-sans text-gray-950 max-w-7xl mx-auto pb-20">
      <Div className="flex items-center justify-between">
        <Div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/taxi/admin/drivers/wallet/withdrawals')}
            className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 text-gray-400 hover:text-gray-950 transition-all shadow-sm"
          >
            <UiIcon as={ArrowLeft} size={20} />
          </Button>
          <Div>
            <H1 className="text-xl font-black text-gray-900 tracking-tight uppercase leading-none mb-1.5">Withdrawal Details</H1>
            <Div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <Span>Wallet</Span>
              <UiIcon as={ChevronRight} size={10} />
              <Span>Withdrawal</Span>
              <UiIcon as={ChevronRight} size={10} />
              <Span className="text-indigo-600">Driver Request</Span>
            </Div>
          </Div>
        </Div>
      </Div>

      {feedback ? (
        <Div className="flex items-start gap-3 rounded-3xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm font-semibold text-indigo-700">
          <UiIcon as={AlertCircle} size={18} className="mt-0.5 shrink-0" />
          <Span>{feedback}</Span>
        </Div>
      ) : null}

      <Div className="grid grid-cols-12 gap-8 items-start">
        <Div className="col-span-12 lg:col-span-4 space-y-6">
          <Div className="bg-indigo-950 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
            <Div className="absolute top-0 right-0 p-10 opacity-10 scale-[2] -rotate-12 translate-x-4">
              <UiIcon as={IndianRupee} size={100} strokeWidth={1} />
            </Div>
            <Div className="relative z-10">
              <P className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2 italic">Current Wallet Balance</P>
              <P className="text-5xl font-black tracking-tighter leading-none mb-6">{formatMoney(driver?.wallet?.balance)}</P>
              <Div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-2xl border border-white/5">
                <UiIcon as={ShieldCheck} size={18} className="text-indigo-400" />
                <Span className="text-[12px] font-bold uppercase tracking-widest">{driver?.wallet?.isBlocked ? 'Wallet blocked' : 'Wallet verified'}</Span>
              </Div>
            </Div>
          </Div>

          <Div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-6">
            <Div className="flex items-center gap-3">
              <Div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <UiIcon as={User} size={20} />
              </Div>
              <H4 className="text-[14px] font-black text-gray-900 uppercase tracking-widest leading-none">Driver Details</H4>
            </Div>

            <Div className="space-y-4">
              <Div className="flex items-start gap-3">
                <UiIcon as={User} size={16} className="mt-1 text-gray-400" />
                <Div>
                  <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</P>
                  <P className="text-sm font-black text-gray-950 uppercase tracking-tight">{driver?.name || '-'}</P>
                </Div>
              </Div>
              <Div className="flex items-start gap-3">
                <UiIcon as={Phone} size={16} className="mt-1 text-gray-400" />
                <Div>
                  <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</P>
                  <P className="text-sm font-bold text-gray-800">{driver?.mobile || '-'}</P>
                </Div>
              </Div>
              <Div className="flex items-start gap-3">
                <UiIcon as={Mail} size={16} className="mt-1 text-gray-400" />
                <Div>
                  <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</P>
                  <P className="text-sm font-bold text-gray-800 break-all">{driver?.email || '-'}</P>
                </Div>
              </Div>
              <Div className="flex items-start gap-3">
                <UiIcon as={MapPin} size={16} className="mt-1 text-gray-400" />
                <Div>
                  <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">City</P>
                  <P className="text-sm font-bold text-gray-800">{driver?.city || '-'}</P>
                </Div>
              </Div>
              <Div className="flex items-start gap-3">
                <UiIcon as={Car} size={16} className="mt-1 text-gray-400" />
                <Div>
                  <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle</P>
                  <P className="text-sm font-bold text-gray-800">
                    {driver?.vehicle_type || '-'}
                    {driver?.vehicle_number ? ` • ${driver.vehicle_number}` : ''}
                  </P>
                </Div>
              </Div>
            </Div>
          </Div>

          <Div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
            <Div className="flex items-center gap-3 mb-6">
              <Div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <UiIcon as={Building} size={20} />
              </Div>
              <H4 className="text-[14px] font-black text-gray-900 uppercase tracking-widest leading-none">Request Snapshot</H4>
            </Div>

            <Div className="grid grid-cols-2 gap-4">
              <Div className="rounded-3xl border border-gray-100 bg-gray-50/70 px-4 py-4">
                <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending Count</P>
                <P className="mt-2 text-2xl font-black text-gray-950">{pendingCount}</P>
              </Div>
              <Div className="rounded-3xl border border-gray-100 bg-gray-50/70 px-4 py-4">
                <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending Amount</P>
                <P className="mt-2 text-2xl font-black text-gray-950">{formatMoney(pendingAmount)}</P>
              </Div>
              <Div className="col-span-2 rounded-3xl border border-gray-100 bg-gray-50/70 px-4 py-4">
                <Div className="flex items-center gap-3">
                  <UiIcon as={Wallet} size={16} className="text-gray-400" />
                  <Div>
                    <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transfer Method</P>
                    <P className="mt-1 text-sm font-black uppercase text-gray-950">{String(latestPaymentMethod || 'bank_transfer').replace(/_/g, ' ')}</P>
                  </Div>
                </Div>
              </Div>
            </Div>
          </Div>

          <Div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-6">
            <Div className="flex items-center gap-3">
              <Div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
                <UiIcon as={Building} size={20} />
              </Div>
              <H4 className="text-[14px] font-black text-gray-900 uppercase tracking-widest leading-none">Bank Details</H4>
            </Div>

            <Div className="space-y-4">
              <Div>
                <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Holder Name</P>
                <P className="mt-1 text-sm font-bold text-gray-800">{bankDetails.accountHolderName || '-'}</P>
              </Div>
              <Div>
                <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UPI ID</P>
                <P className="mt-1 text-sm font-bold text-gray-800 break-all">{bankDetails.upiId || '-'}</P>
              </Div>
              <Div>
                <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Number</P>
                <P className="mt-1 text-sm font-bold text-gray-800">{maskedAccountNumber || '-'}</P>
              </Div>
              <Div>
                <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">IFSC</P>
                <P className="mt-1 text-sm font-bold text-gray-800">{bankDetails.ifsc || '-'}</P>
              </Div>
              <Div>
                <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch Name</P>
                <P className="mt-1 text-sm font-bold text-gray-800">{bankDetails.branchName || '-'}</P>
              </Div>
              <Div>
                <P className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UPI QR Code</P>
                {bankDetails.qrCodeImage ? (
                  <A
                    href={bankDetails.qrCodeImage}
                    className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-700"
                  >
                    <UiIcon as={QrCode} size={14} />
                    View QR Code
                  </A>
                ) : (
                  <P className="mt-1 text-sm font-bold text-gray-800">-</P>
                )}
              </Div>
            </Div>
          </Div>
        </Div>

        <Div className="col-span-12 lg:col-span-8 space-y-6">
          <Div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <Div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <H3 className="text-[14px] font-black text-gray-900 uppercase tracking-widest leading-none">Withdrawal Request History</H3>
              <Span className="rounded-full bg-gray-50 border border-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {history.length} records
              </Span>
            </Div>

            <Div className="p-6 bg-gray-50/10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-50">
              <Div className="flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-gray-400">
                show
                <Select
                  value={itemsPerPage}
                  onChange={(event) => setItemsPerPage(Number(event.target.value) || 10)}
                  className="bg-white border border-gray-100 rounded-lg px-2 py-1 outline-none text-gray-950 font-black cursor-pointer shadow-sm"
                >
                  <Option value={10}>10</Option>
                  <Option value={25}>25</Option>
                  <Option value={50}>50</Option>
                </Select>
                entries
              </Div>
              <Div className="relative group">
                <UiIcon as={Search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Filter history..."
                  className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-[12px] font-bold outline-none ring-offset-2 focus:ring-4 focus:ring-gray-100 transition-all w-64 shadow-sm"
                />
              </Div>
            </Div>

            <Div>
              <Table cols={[140, 180, 150, 120, 140, 130, 90]} className="w-full text-left">
                <Thead>
                  <Tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                    <Th className="px-8 py-5">Date</Th>
                    <Th className="px-5 py-5">Name</Th>
                    <Th className="px-5 py-5">Mobile Number</Th>
                    <Th className="px-5 py-5">Amount</Th>
                    <Th className="px-5 py-5">Method</Th>
                    <Th className="px-5 py-5 text-center">Status</Th>
                    <Th className="px-8 py-5 text-right w-10">Action</Th>
                  </Tr>
                </Thead>
                <Tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <Tr>
                      <Td colSpan={7} className="px-8 py-16 text-center text-sm font-semibold text-gray-400">
                        Loading withdrawal details...
                      </Td>
                    </Tr>
                  ) : filteredHistory.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} className="px-8 py-16 text-center text-sm font-semibold text-gray-400">
                        No withdrawal requests found.
                      </Td>
                    </Tr>
                  ) : (
                    filteredHistory.map((request) => (
                      <Tr key={request.id} className="hover:bg-gray-50/20 transition-all group">
                        <Td className="px-8 py-6">
                          <Span className="text-[12px] font-bold text-gray-500 tracking-tight">{formatDateTime(request.createdAt)}</Span>
                        </Td>
                        <Td className="px-5 py-6">
                          <Span className="text-[13px] font-black text-gray-950 uppercase tracking-tight">{request.name}</Span>
                        </Td>
                        <Td className="px-5 py-6 text-[13px] font-bold text-gray-700">{request.phone}</Td>
                        <Td className="px-5 py-6 font-black text-[13px] text-gray-900 tracking-tight">{formatMoney(request.amount)}</Td>
                        <Td className="px-5 py-6 text-[12px] font-bold uppercase text-gray-500">
                          {String(request.paymentMethod || 'bank_transfer').replace(/_/g, ' ')}
                        </Td>
                        <Td className="px-5 py-6 text-center">
                          <Span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${getStatusClasses(request.status)}`}
                          >
                            {request.status}
                          </Span>
                        </Td>
                        <Td className="px-8 py-6 text-right">
                          <Div className="relative">
                            <Button
                              onClick={(event) => toggleMenu(event, request.id)}
                              disabled={actionLoadingId === request.id}
                              className="p-2.5 text-gray-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm group-hover:shadow-md border border-transparent hover:border-gray-50 disabled:opacity-60"
                            >
                              <UiIcon as={MoreHorizontal} size={18} />
                            </Button>

                            {activeMenu === request.id && request.status === 'pending' ? (
                              <Div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <Button
                                  onClick={() => handleAction(request.id, 'approve')}
                                  className="w-full text-left px-4 py-2.5 text-[12px] font-black text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                >
                                  <UiIcon as={CheckCircle2} size={16} /> Approve
                                </Button>
                                <Button
                                  onClick={() => handleAction(request.id, 'reject')}
                                  className="w-full text-left px-4 py-2.5 text-[12px] font-black text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                >
                                  <UiIcon as={XCircle} size={16} /> Reject
                                </Button>
                              </Div>
                            ) : null}
                          </Div>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Div>

            <Div className="p-8 border-t border-gray-50 bg-gray-50/20 text-center">
              <P className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Showing 1 to {filteredHistory.length} of {history.length} entries
              </P>
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default WithdrawalRequestDetail;
