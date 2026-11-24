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
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';

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
        const response = await adminService.getDriverWithdrawals(id, { limit: itemsPerPage });
        applyPayload(response?.data || response || {});
      } catch {
        const fallbackResponse = await adminService.getDriverWithdrawalContextByRequestId(
          requestId || id,
          {
            limit: itemsPerPage,
          },
        );
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
    const query = String(searchTerm || '').trim().toLowerCase();
    if (!query) return history;
    return history.filter((item) =>
      [
        item.name,
        item.phone,
        item.status,
        item.paymentMethod,
        formatMoney(item.amount),
        formatDateTime(item.createdAt),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [history, searchTerm]);

  const pendingCount = useMemo(
    () => history.filter((item) => item.status === 'pending').length,
    [history],
  );

  const pendingAmount = useMemo(
    () =>
      history
        .filter((item) => item.status === 'pending')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [history],
  );

  const latestPaymentMethod = useMemo(
    () => history.find((item) => item.paymentMethod)?.paymentMethod || 'bank_transfer',
    [history],
  );
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

    return hasSnapshotValue ? snapshot : (driver?.bankDetails || {});
  }, [driver?.bankDetails, selectedRequest]);
  const maskedAccountNumber = bankDetails.accountNumber
    ? bankDetails.accountNumber.slice(-4).padStart(bankDetails.accountNumber.length, '*')
    : '';

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
      setFeedback(
        error?.response?.data?.message ||
          `Unable to ${action} this withdrawal request right now.`,
      );
    } finally {
      setActionLoadingId('');
    }
  };

  return (
    <div className="space-y-8 p-1 animate-in fade-in duration-700 font-sans text-neutral-950 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/taxi/admin/drivers/wallet/withdrawals')}
            className="p-3 bg-white border border-neutral-900/[0.08] rounded-xl hover:bg-neutral-50 text-neutral-500 hover:text-neutral-950 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-medium text-neutral-900 leading-none mb-1.5">
              Withdrawal details
            </h1>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>Wallet</span>
              <ChevronRight size={10} />
              <span>Withdrawal</span>
              <ChevronRight size={10} />
              <span className="text-[#0a4d2b]">Driver request</span>
            </div>
          </div>
        </div>
      </div>

      {feedback ? (
        <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm font-medium text-[#0a4d2b]">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{feedback}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-neutral-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10 scale-[2] -rotate-12 translate-x-4">
              <IndianRupee size={100} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-medium text-neutral-400 mb-2">
                Current wallet balance
              </p>
              <p className="text-5xl font-medium leading-none mb-6">
                {formatMoney(driver?.wallet?.balance)}
              </p>
              <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm">
                <ShieldCheck size={18} className="text-neutral-400" />
                <span className="text-[12px] font-medium">
                  {driver?.wallet?.isBlocked ? 'Wallet blocked' : 'Wallet verified'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-neutral-50 text-[#0a4d2b] rounded-2xl">
                <User size={20} />
              </div>
              <h4 className="text-[14px] font-medium text-neutral-900 leading-none">
                Driver details
              </h4>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User size={16} className="mt-1 text-neutral-500" />
                <div>
                  <p className="text-xs text-neutral-500">Name</p>
                  <p className="text-sm font-medium text-neutral-950">
                    {driver?.name || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={16} className="mt-1 text-neutral-500" />
                <div>
                  <p className="text-xs text-neutral-500">Phone</p>
                  <p className="text-sm font-medium text-neutral-800">{driver?.mobile || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={16} className="mt-1 text-neutral-500" />
                <div>
                  <p className="text-xs text-neutral-500">Email</p>
                  <p className="text-sm font-medium text-neutral-800 break-all">{driver?.email || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="mt-1 text-neutral-500" />
                <div>
                  <p className="text-xs text-neutral-500">City</p>
                  <p className="text-sm font-medium text-neutral-800">{driver?.city || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Car size={16} className="mt-1 text-neutral-500" />
                <div>
                  <p className="text-xs text-neutral-500">Vehicle</p>
                  <p className="text-sm font-medium text-neutral-800">
                    {driver?.vehicle_type || '-'}
                    {driver?.vehicle_number ? ` • ${driver.vehicle_number}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Building size={20} />
              </div>
              <h4 className="text-[14px] font-medium text-neutral-900 leading-none">
                Request snapshot
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-4">
                <p className="text-xs text-neutral-500">Pending count</p>
                <p className="mt-2 text-2xl font-medium text-neutral-950">{pendingCount}</p>
              </div>
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-4">
                <p className="text-xs text-neutral-500">Pending amount</p>
                <p className="mt-2 text-2xl font-medium text-neutral-950">{formatMoney(pendingAmount)}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Wallet size={16} className="text-neutral-500" />
                  <div>
                    <p className="text-xs text-neutral-500">Transfer method</p>
                    <p className="mt-1 text-sm font-medium text-neutral-950">
                      {String(latestPaymentMethod || 'bank_transfer').replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-neutral-50 text-[#0a4d2b] rounded-2xl">
                <Building size={20} />
              </div>
              <h4 className="text-[14px] font-medium text-neutral-900 leading-none">
                Bank details
              </h4>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-neutral-500">Account holder name</p>
                <p className="mt-1 text-sm font-medium text-neutral-800">{bankDetails.accountHolderName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">UPI ID</p>
                <p className="mt-1 text-sm font-medium text-neutral-800 break-all">{bankDetails.upiId || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Account number</p>
                <p className="mt-1 text-sm font-medium text-neutral-800">{maskedAccountNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">IFSC</p>
                <p className="mt-1 text-sm font-medium text-neutral-800">{bankDetails.ifsc || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Branch name</p>
                <p className="mt-1 text-sm font-medium text-neutral-800">{bankDetails.branchName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">UPI QR code</p>
                {bankDetails.qrCodeImage ? (
                  <a
                    href={bankDetails.qrCodeImage}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700"
                  >
                    <QrCode size={14} />
                    View QR code
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-medium text-neutral-800">-</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden min-h-[400px]">
            <div className="p-8 border-b border-neutral-50 flex items-center justify-between">
              <h3 className="text-[14px] font-medium text-neutral-900 leading-none">
                Withdrawal request history
              </h3>
              <span className="rounded-full bg-neutral-50 border border-neutral-100 px-3 py-1 text-xs text-neutral-500">
                {history.length} records
              </span>
            </div>

            <div className="p-6 bg-neutral-50/10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-neutral-50">
              <div className="flex items-center gap-3 text-[12px] text-neutral-500">
                show
                <select
                  value={itemsPerPage}
                  onChange={(event) => setItemsPerPage(Number(event.target.value) || 10)}
                  className="bg-white border border-neutral-100 rounded-lg px-2 py-1 outline-none text-neutral-950 font-medium cursor-pointer shadow-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                entries
              </div>
              <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Filter history"
                  className="pl-10 pr-4 py-2 bg-white border border-neutral-900/[0.08] rounded-xl text-[12px] font-medium outline-none ring-offset-2 focus:ring-4 focus:ring-neutral-100 transition-colors w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50/50 text-xs text-neutral-500 border-b border-neutral-50">
                    <th className="px-8 py-5">Date</th>
                    <th className="px-5 py-5">Name</th>
                    <th className="px-5 py-5">Mobile number</th>
                    <th className="px-5 py-5">Amount</th>
                    <th className="px-5 py-5">Method</th>
                    <th className="px-5 py-5 text-center">Status</th>
                    <th className="px-8 py-5 text-right w-10">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-16 text-center text-sm text-neutral-500">
                        Loading withdrawal details...
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-16 text-center text-sm text-neutral-500">
                        No withdrawal requests found
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((request) => (
                      <tr key={request.id} className="hover:bg-neutral-50/20 transition-colors group">
                        <td className="px-8 py-6">
                          <span className="text-[12px] text-neutral-500">
                            {formatDateTime(request.createdAt)}
                          </span>
                        </td>
                        <td className="px-5 py-6">
                          <span className="text-[13px] font-medium text-neutral-950">
                            {request.name}
                          </span>
                        </td>
                        <td className="px-5 py-6 text-[13px] font-medium text-neutral-700">
                          {request.phone}
                        </td>
                        <td className="px-5 py-6 font-medium text-[13px] text-neutral-900">
                          {formatMoney(request.amount)}
                        </td>
                        <td className="px-5 py-6 text-[12px] text-neutral-500">
                          {String(request.paymentMethod || 'bank_transfer').replace(/_/g, ' ')}
                        </td>
                        <td className="px-5 py-6 text-center">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium   ${getStatusClasses(request.status)}`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="relative">
                            <button
                              onClick={(event) => toggleMenu(event, request.id)}
                              disabled={actionLoadingId === request.id}
                              className="p-2.5 text-neutral-300 hover:text-[#0a4d2b] hover:bg-white rounded-xl transition-colors shadow-sm group-hover:shadow-md border border-transparent hover:border-neutral-50 disabled:opacity-60"
                            >
                              <MoreHorizontal size={18} />
                            </button>

                            {activeMenu === request.id && request.status === 'pending' ? (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-neutral-900/[0.08] py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <button
                                  onClick={() => handleAction(request.id, 'approve')}
                                  className="w-full text-left px-4 py-2.5 text-[12px] font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors"
                                >
                                  <CheckCircle2 size={16} /> Approve
                                </button>
                                <button
                                  onClick={() => handleAction(request.id, 'reject')}
                                  className="w-full text-left px-4 py-2.5 text-[12px] font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                                >
                                  <XCircle size={16} /> Reject
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-8 border-t border-neutral-50 bg-neutral-50/20 text-center">
              <p className="text-xs text-neutral-500">
                Showing 1 to {filteredHistory.length} of {history.length} entries
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalRequestDetail;
