/* Ported from Frontend/src/modules/Hotel/app/admin/components/PayoutSettlements.jsx (tools/port.js first pass). */
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
import { Banknote, Loader2, RefreshCw, Search } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, Div, H3, Input, Option, P, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import usePrompt from './usePrompt';
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
  const { prompt, promptElement } = usePrompt();
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getWithdrawals({
        status,
        search: search.trim() || undefined,
      });
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
  const pendingTotal = useMemo(() => (summary.pending?.amount || 0) + (summary.processing?.amount || 0), [summary]);
  const applyStatus = async (withdrawal, next) => {
    const payload = {
      status: next,
    };
    if (next === 'completed') {
      // The server requires this, and it is what the partner will quote back.
      const utr = await prompt('Bank reference (UTR) for this payout:', '');
      if (!utr || !utr.trim()) return;
      payload.utrNumber = utr.trim();
    }
    if (next === 'failed' || next === 'cancelled') {
      const reason = await prompt(`Why is this payout being marked ${next}? The amount goes back to the partner's wallet.`, '');
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
    <Div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <Div className="px-4 py-4 border-b border-gray-100 flex flex-col justify-between gap-4">
        <Div>
          <Div className="flex flex-row items-center gap-2">
            <UiIcon as={Banknote} size={18} className="text-emerald-600" />
            <H3 className="font-bold text-gray-900 text-lg">Partner Payouts</H3>
          </Div>
          <P className="text-[11px] text-gray-500 mt-0.5">
            {currency(pendingTotal)} awaiting settlement
            {summary.completed ? ` · ${currency(summary.completed.amount)} paid out` : ''}
          </P>
        </Div>

        <Div className="flex flex-wrap items-center gap-2">
          <Div className="relative justify-center">
            <UiIcon as={Search} size={14} className="absolute left-3 z-10 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Partner or payout ID"
              className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-black w-56"
            />
          </Div>
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-black"
          >
            {STATUS_FILTERS.map((value) => (
              <Option key={value} value={value}>
                {value === 'all' ? 'All statuses' : value}
              </Option>
            ))}
          </Select>
          <Button
            type="button"
            onClick={load}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            accessibilityLabel="Refresh payouts"
          >
            <UiIcon as={RefreshCw} size={14} />
          </Button>
        </Div>
      </Div>

      <Table cols={[130, 160, 190, 110, 150, 230]} className="w-full text-left text-sm">
          <Thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
            <Tr>
              <Th className="p-4 font-semibold">Payout</Th>
              <Th className="p-4 font-semibold">Partner</Th>
              <Th className="p-4 font-semibold">Bank</Th>
              <Th className="p-4 font-semibold text-right">Amount</Th>
              <Th className="p-4 font-semibold">Status</Th>
              <Th className="p-4 font-semibold">Settle</Th>
            </Tr>
          </Thead>
          <Tbody className="divide-y divide-gray-100">
            {loading ? (
              <Tr>
                <Td colSpan="6" className="p-10 text-center text-gray-400">
                  <UiIcon as={Loader2} size={20} className="text-gray-400" />
                </Td>
              </Tr>
            ) : withdrawals.length === 0 ? (
              <Tr>
                <Td colSpan="6" className="p-10 text-center text-gray-400 text-xs">
                  No payout requests{status === 'all' ? '' : ` with status "${status}"`}.
                </Td>
              </Tr>
            ) : (
              withdrawals.map((withdrawal) => {
                const moves = NEXT_STATUSES[withdrawal.status] || [];
                return (
                  <Tr key={withdrawal._id} className="hover:bg-gray-50/60">
                    <Td className="p-4">
                      <P className="font-mono text-xs font-bold text-gray-900">{withdrawal.withdrawalId}</P>
                      <P className="text-[10px] text-gray-400">{new Date(withdrawal.createdAt).toLocaleDateString('en-GB')}</P>
                      {withdrawal.processingDetails?.utrNumber && (
                        <P className="text-[10px] text-emerald-700 font-semibold">UTR {withdrawal.processingDetails.utrNumber}</P>
                      )}
                    </Td>
                    <Td className="p-4">
                      <P className="font-semibold text-gray-900 text-xs">{withdrawal.partner?.name || 'Unknown partner'}</P>
                      <P className="text-[10px] text-gray-400">{withdrawal.partner?.phone || '—'}</P>
                    </Td>
                    <Td className="p-4 text-xs text-gray-600">
                      <P>{withdrawal.bankDetails?.accountHolderName || '—'}</P>
                      <P className="text-[10px] text-gray-400 font-mono">
                        {withdrawal.bankDetails?.accountNumber || '—'} · {withdrawal.bankDetails?.ifscCode || '—'}
                      </P>
                    </Td>
                    <Td className="p-4 text-right font-bold text-gray-900">{currency(withdrawal.amount)}</Td>
                    <Td className="p-4">
                      <Span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLE[withdrawal.status] || 'bg-gray-100 text-gray-600'}`}>
                        {withdrawal.status}
                      </Span>
                      {withdrawal.processingDetails?.remarks && (
                        <P className="text-[10px] text-gray-400 mt-1 max-w-[14rem]">{withdrawal.processingDetails.remarks}</P>
                      )}
                    </Td>
                    <Td className="p-4">
                      {moves.length === 0 ? (
                        <Span className="text-[10px] text-gray-400 uppercase font-bold">Closed</Span>
                      ) : (
                        <Div className="flex flex-wrap gap-1.5">
                          {moves.map((next) => (
                            <Button
                              key={next}
                              type="button"
                              disabled={busyId === withdrawal._id}
                              onClick={() => applyStatus(withdrawal, next)}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors disabled:opacity-50 ${next === 'completed' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : next === 'processing' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                              {next}
                            </Button>
                          ))}
                        </Div>
                      )}
                    </Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
      </Table>
      {promptElement}
    </Div>
  );
};
export default PayoutSettlements;
