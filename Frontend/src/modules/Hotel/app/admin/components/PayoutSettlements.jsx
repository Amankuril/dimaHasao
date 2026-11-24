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
import StatusDot from './StatusDot';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STATUS_FILTERS = ['all', 'pending', 'processing', 'completed', 'failed', 'cancelled'];

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
        <div className="bg-white border border-neutral-900/[0.08] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h3 className="font-medium text-neutral-900 text-lg flex items-center gap-2">
                        <Banknote size={18} className="text-emerald-600" /> Partner payouts
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        {currency(pendingTotal)} awaiting settlement
                        {summary.completed ? ` · ${currency(summary.completed.amount)} paid out` : ''}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Partner or payout ID"
                            className="pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs outline-none focus:border-neutral-400 w-56"
                        />
                    </div>
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium outline-none focus:border-neutral-400"
                    >
                        {STATUS_FILTERS.map((value) => (
                            <option key={value} value={value}>
                                {value === 'all' ? 'All statuses' : value.charAt(0).toUpperCase() + value.slice(1)}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={load}
                        className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                        aria-label="Refresh payouts"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[46rem]">
                    <thead className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
                        <tr>
                            <th className="p-4 font-medium">Payout</th>
                            <th className="p-4 font-medium">Partner</th>
                            <th className="p-4 font-medium">Bank</th>
                            <th className="p-4 font-medium text-right">Amount</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium">Settle</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="p-10 text-center text-neutral-500">
                                    <Loader2 size={20} className="animate-spin inline" />
                                </td>
                            </tr>
                        ) : withdrawals.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-10 text-center text-neutral-500 text-xs">
                                    No payout requests{status === 'all' ? '' : ` with status "${status}"`}.
                                </td>
                            </tr>
                        ) : (
                            withdrawals.map((withdrawal) => {
                                const moves = NEXT_STATUSES[withdrawal.status] || [];
                                return (
                                    <tr key={withdrawal._id} className="hover:bg-neutral-50/60">
                                        <td className="p-4">
                                            <p className="font-mono text-xs font-medium text-neutral-900">{withdrawal.withdrawalId}</p>
                                            <p className="text-xs text-neutral-500">
                                                {new Date(withdrawal.createdAt).toLocaleDateString('en-GB')}
                                            </p>
                                            {withdrawal.processingDetails?.utrNumber && (
                                                <p className="text-xs text-emerald-700 font-medium">
                                                    UTR {withdrawal.processingDetails.utrNumber}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-medium text-neutral-900 text-xs">
                                                {withdrawal.partner?.name || 'Unknown partner'}
                                            </p>
                                            <p className="text-xs text-neutral-500">{withdrawal.partner?.phone || '—'}</p>
                                        </td>
                                        <td className="p-4 text-xs text-neutral-600">
                                            <p>{withdrawal.bankDetails?.accountHolderName || '—'}</p>
                                            <p className="text-xs text-neutral-500 font-mono">
                                                {withdrawal.bankDetails?.accountNumber || '—'} · {withdrawal.bankDetails?.ifscCode || '—'}
                                            </p>
                                        </td>
                                        <td className="p-4 text-right font-medium text-neutral-900">{currency(withdrawal.amount)}</td>
                                        <td className="p-4">
                                            <StatusDot status={withdrawal.status} />
                                            {withdrawal.processingDetails?.remarks && (
                                                <p className="text-xs text-neutral-500 mt-1 max-w-[14rem]">
                                                    {withdrawal.processingDetails.remarks}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {moves.length === 0 ? (
                                                <span className="text-xs text-neutral-500">Closed</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {moves.map((next) => (
                                                        <button
                                                            key={next}
                                                            type="button"
                                                            disabled={busyId === withdrawal._id}
                                                            onClick={() => applyStatus(withdrawal, next)}
                                                            className={`px-2.5 py-1 rounded-md text-xs font-medium  transition-colors disabled:opacity-50 ${
                                                                next === 'completed'
                                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                                    : next === 'processing'
                                                                        ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                                                                        : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
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
