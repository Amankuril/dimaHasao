/**
 * Partner payout settlement.
 *
 * Raising a withdrawal debits the partner's wallet immediately, so a request
 * that is never settled leaves them out of pocket with no way to chase it. The
 * automated RazorpayX path is optional and frequently unconfigured, which means
 * settlement is a manual step — this is where an admin performs it.
 *
 * Failing or cancelling a request credits the money back to the wallet; the
 * server does that, and refuses transitions out of a terminal state.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Loader2, RefreshCw, Search } from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STATUS_FILTERS = ['all', 'pending', 'processing', 'completed', 'failed', 'cancelled'];

const STATUS_STYLE = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
};

/** Mirrors the server's state machine so the UI never offers a move it will reject. */
const NEXT_STATUSES = {
    pending: ['processing', 'completed', 'failed', 'cancelled'],
    processing: ['completed', 'failed'],
    completed: [],
    failed: [],
    cancelled: [],
};

const PayoutSettlements = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [summary, setSummary] = useState({});
    const [status, setStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminService.getWithdrawals({ status, search: search.trim() || undefined });
            setWithdrawals(data.withdrawals || []);
            setSummary(data.summary || {});
        } catch (error) {
            if (error.response?.status !== 401) toast.error('Failed to load payouts');
        } finally {
            setLoading(false);
        }
    }, [status, search]);

    useEffect(() => {
        load();
    }, [load]);

    const pendingTotal = useMemo(
        () => (summary.pending?.amount || 0) + (summary.processing?.amount || 0),
        [summary],
    );

    const applyStatus = async (withdrawal, next) => {
        const payload = { status: next };

        if (next === 'completed') {
            // The server requires this, and it is what the partner will quote back.
            const utr = window.prompt('Bank reference (UTR) for this payout:', '');
            if (!utr || !utr.trim()) return;
            payload.utrNumber = utr.trim();
        }

        if (next === 'failed' || next === 'cancelled') {
            const reason = window.prompt(
                `Why is this payout being marked ${next}? The amount goes back to the partner's wallet.`,
                '',
            );
            if (reason === null) return;
            if (reason.trim()) payload.remarks = reason.trim();
        }

        try {
            setBusyId(withdrawal._id);
            await adminService.updateWithdrawalStatus(withdrawal._id, payload);
            toast.success(`Payout marked ${next}`);
            await load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update this payout');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        <Banknote size={18} className="text-emerald-600" /> Partner Payouts
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                        {currency(pendingTotal)} awaiting settlement
                        {summary.completed ? ` · ${currency(summary.completed.amount)} paid out` : ''}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Partner or payout ID"
                            className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-black w-56"
                        />
                    </div>
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-black"
                    >
                        {STATUS_FILTERS.map((value) => (
                            <option key={value} value={value}>
                                {value === 'all' ? 'All statuses' : value}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={load}
                        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                        aria-label="Refresh payouts"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[46rem]">
                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
                        <tr>
                            <th className="p-4 font-semibold">Payout</th>
                            <th className="p-4 font-semibold">Partner</th>
                            <th className="p-4 font-semibold">Bank</th>
                            <th className="p-4 font-semibold text-right">Amount</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Settle</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="p-10 text-center text-gray-400">
                                    <Loader2 size={20} className="animate-spin inline" />
                                </td>
                            </tr>
                        ) : withdrawals.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-10 text-center text-gray-400 text-xs">
                                    No payout requests{status === 'all' ? '' : ` with status "${status}"`}.
                                </td>
                            </tr>
                        ) : (
                            withdrawals.map((withdrawal) => {
                                const moves = NEXT_STATUSES[withdrawal.status] || [];
                                return (
                                    <tr key={withdrawal._id} className="hover:bg-gray-50/60">
                                        <td className="p-4">
                                            <p className="font-mono text-xs font-bold text-gray-900">{withdrawal.withdrawalId}</p>
                                            <p className="text-[10px] text-gray-400">
                                                {new Date(withdrawal.createdAt).toLocaleDateString('en-GB')}
                                            </p>
                                            {withdrawal.processingDetails?.utrNumber && (
                                                <p className="text-[10px] text-emerald-700 font-semibold">
                                                    UTR {withdrawal.processingDetails.utrNumber}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-semibold text-gray-900 text-xs">
                                                {withdrawal.partner?.name || 'Unknown partner'}
                                            </p>
                                            <p className="text-[10px] text-gray-400">{withdrawal.partner?.phone || '—'}</p>
                                        </td>
                                        <td className="p-4 text-xs text-gray-600">
                                            <p>{withdrawal.bankDetails?.accountHolderName || '—'}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">
                                                {withdrawal.bankDetails?.accountNumber || '—'} · {withdrawal.bankDetails?.ifscCode || '—'}
                                            </p>
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-900">{currency(withdrawal.amount)}</td>
                                        <td className="p-4">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    STATUS_STYLE[withdrawal.status] || 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {withdrawal.status}
                                            </span>
                                            {withdrawal.processingDetails?.remarks && (
                                                <p className="text-[10px] text-gray-400 mt-1 max-w-[14rem]">
                                                    {withdrawal.processingDetails.remarks}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {moves.length === 0 ? (
                                                <span className="text-[10px] text-gray-400 uppercase font-bold">Closed</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {moves.map((next) => (
                                                        <button
                                                            key={next}
                                                            type="button"
                                                            disabled={busyId === withdrawal._id}
                                                            onClick={() => applyStatus(withdrawal, next)}
                                                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors disabled:opacity-50 ${
                                                                next === 'completed'
                                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                                    : next === 'processing'
                                                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                        >
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
    );
};

export default PayoutSettlements;
