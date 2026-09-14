/**
 * Operator payout settlement.
 *
 * Requesting a payout debits the operator's wallet immediately, so a request
 * nobody settles leaves them out of pocket. Failing or cancelling one puts the
 * money back — the server does that, and refuses to reopen a closed request.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, RefreshCw } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatusPill, currency, shortDate } from '../components/ui';
import toast from 'react-hot-toast';

const FILTERS = ['all', 'pending', 'processing', 'completed', 'failed', 'cancelled'];

/** Mirrors the server's state machine so the UI never offers a rejected move. */
const NEXT_STATUSES = {
  pending: ['processing', 'completed', 'failed', 'cancelled'],
  processing: ['completed', 'failed'],
  completed: [],
  failed: [],
  cancelled: [],
};

const Payouts = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [summary, setSummary] = useState({});
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getWithdrawals({ status });
      setWithdrawals(data.withdrawals || []);
      setSummary(data.summary || {});
    } catch (error) {
      toast.error(error.message || 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const awaiting = useMemo(
    () => (summary.pending?.amount || 0) + (summary.processing?.amount || 0),
    [summary],
  );

  const apply = async (withdrawal, next) => {
    const payload = { status: next };

    if (next === 'completed') {
      const utr = window.prompt('Bank reference (UTR) for this payout:', '');
      if (!utr || !utr.trim()) return;
      payload.utrNumber = utr.trim();
    }
    if (next === 'failed' || next === 'cancelled') {
      const reason = window.prompt(`Why is this payout being marked ${next}? The money goes back to the operator's wallet.`, '');
      if (reason === null) return;
      if (reason.trim()) payload.remarks = reason.trim();
    }

    try {
      setBusyId(withdrawal._id);
      await adminService.updateWithdrawalStatus(withdrawal._id, payload);
      toast.success(`Payout marked ${next}`);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this payout');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Operator Payouts"
        subtitle={`${currency(awaiting)} awaiting settlement${summary.completed ? ` · ${currency(summary.completed.amount)} paid out` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-black">
              {FILTERS.map((v) => <option key={v} value={v}>{v === 'all' ? 'All statuses' : v}</option>)}
            </select>
            <button type="button" onClick={load} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50" aria-label="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Banknote size={18} className="text-[#0a4d2b]" />
          <h3 className="font-bold text-gray-900 text-sm">Payout requests</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[48rem]">
            <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="p-4 font-semibold">Payout</th>
                <th className="p-4 font-semibold">Operator</th>
                <th className="p-4 font-semibold">Bank</th>
                <th className="p-4 font-semibold text-right">Amount</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Settle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6"><Spinner /></td></tr>
              ) : withdrawals.length === 0 ? (
                <tr><td colSpan="6"><EmptyState message="No payout requests." /></td></tr>
              ) : (
                withdrawals.map((w) => {
                  const moves = NEXT_STATUSES[w.status] || [];
                  return (
                    <tr key={w._id} className="hover:bg-gray-50/60">
                      <td className="p-4">
                        <p className="font-mono text-[11px] font-bold text-gray-900">{w.withdrawalId}</p>
                        <p className="text-[10px] text-gray-400">{shortDate(w.createdAt)}</p>
                        {w.processingDetails?.utrNumber && (
                          <p className="text-[10px] text-emerald-700 font-semibold">UTR {w.processingDetails.utrNumber}</p>
                        )}
                      </td>
                      <td className="p-4 text-xs">
                        <p className="font-semibold text-gray-900">{(w.ownerId || {}).agencyName || (w.ownerId || {}).name || '—'}</p>
                        <p className="text-[10px] text-gray-400">{(w.ownerId || {}).phone || '—'}</p>
                      </td>
                      <td className="p-4 text-xs text-gray-600">
                        <p>{w.bankDetails?.accountHolderName || '—'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {w.bankDetails?.accountNumber || '—'} · {w.bankDetails?.ifscCode || '—'}
                        </p>
                      </td>
                      <td className="p-4 text-right font-bold text-gray-900">{currency(w.amount)}</td>
                      <td className="p-4">
                        <StatusPill status={w.status} />
                        {w.processingDetails?.remarks && (
                          <p className="text-[10px] text-gray-400 mt-1 max-w-[14rem]">{w.processingDetails.remarks}</p>
                        )}
                      </td>
                      <td className="p-4">
                        {moves.length === 0 ? (
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Closed</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {moves.map((next) => (
                              <button key={next} type="button" disabled={busyId === w._id} onClick={() => apply(w, next)}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors disabled:opacity-50 ${
                                  next === 'completed' ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : next === 'processing' ? 'bg-blue-600 text-white hover:bg-blue-700'
                                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}>
                                {next}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payouts;
