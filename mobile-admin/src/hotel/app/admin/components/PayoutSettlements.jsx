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
import { Banknote, RefreshCw, Search } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
import {
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import usePrompt from './usePrompt';
const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const STATUS_FILTERS = ['all', 'pending', 'processing', 'completed', 'failed', 'cancelled'];
const COLS = [150, 160, 200, 110, 150, 240];

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
    <Card className="gap-3">
      <SectionTitle className="mb-0">
        <Div className="flex-row items-center gap-2">
          <UiIcon as={Banknote} size={18} className="text-slate-500" />
          <Span className="text-base font-semibold text-slate-900">Partner Payouts</Span>
        </Div>
      </SectionTitle>
      <P className="text-sm text-slate-500">
        {currency(pendingTotal)} awaiting settlement
        {summary.completed ? ` · ${currency(summary.completed.amount)} paid out` : ''}
      </P>

      <Toolbar className="mb-0">
        <Div className="flex-1 min-w-[180px] justify-center">
          <UiIcon as={Search} size={16} className="absolute left-3 z-10 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Partner or payout ID" className={`${INPUT} pl-9`} />
        </Div>
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className={INPUT}>
          {STATUS_FILTERS.map((value) => (
            <Option key={value} value={value}>
              {value === 'all' ? 'All statuses' : value}
            </Option>
          ))}
        </Select>
        <Button type="button" onClick={load} className={BTN_SECONDARY} accessibilityLabel="Refresh payouts">
          <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
        </Button>
      </Toolbar>

      {loading ? (
        <TableSkeleton rows={3} className="border-0 p-0" />
      ) : withdrawals.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No payout requests"
          message={status === 'all' ? 'Partner withdrawal requests appear here once they are raised.' : `No payouts with status "${status}".`}
          actionLabel={status === 'all' ? undefined : 'Show all statuses'}
          onAction={status === 'all' ? undefined : () => setStatus('all')}
          className="border-0"
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Payout', 'Partner', 'Bank', 'Amount', 'Status', 'Settle']} />
          <TBody>
            {withdrawals.map((withdrawal, index) => {
              const moves = NEXT_STATUSES[withdrawal.status] || [];
              return (
                <Row key={withdrawal._id} last={index === withdrawals.length - 1}>
                  <Cell width={COLS[0]}>
                    <Span numberOfLines={1} className="text-sm font-semibold text-slate-900">
                      {withdrawal.withdrawalId}
                    </Span>
                    <Span className="text-xs text-slate-500">{new Date(withdrawal.createdAt).toLocaleDateString('en-GB')}</Span>
                    {withdrawal.processingDetails?.utrNumber ? (
                      <Span numberOfLines={1} className="text-xs text-slate-500">
                        UTR {withdrawal.processingDetails.utrNumber}
                      </Span>
                    ) : null}
                  </Cell>
                  <Cell width={COLS[1]}>
                    <Span numberOfLines={1} className="text-sm font-semibold text-slate-900">
                      {withdrawal.partner?.name || 'Unknown partner'}
                    </Span>
                    <Span className="text-xs text-slate-500">{withdrawal.partner?.phone || '—'}</Span>
                  </Cell>
                  <Cell width={COLS[2]}>
                    <Span numberOfLines={1} className="text-sm text-slate-700">
                      {withdrawal.bankDetails?.accountHolderName || '—'}
                    </Span>
                    <Span numberOfLines={2} className="text-xs text-slate-500">
                      {withdrawal.bankDetails?.accountNumber || '—'} · {withdrawal.bankDetails?.ifscCode || '—'}
                    </Span>
                  </Cell>
                  <Cell width={COLS[3]} align="right">
                    <Span className="text-sm font-semibold text-slate-900">{currency(withdrawal.amount)}</Span>
                  </Cell>
                  <Cell width={COLS[4]}>
                    <StatusBadge status={withdrawal.status} />
                    {withdrawal.processingDetails?.remarks ? (
                      <Span numberOfLines={2} className="text-xs text-slate-500 mt-1">
                        {withdrawal.processingDetails.remarks}
                      </Span>
                    ) : null}
                  </Cell>
                  <Cell width={COLS[5]}>
                    {moves.length === 0 ? (
                      <Span className="text-sm text-slate-400">Closed</Span>
                    ) : (
                      <Div className="flex-row flex-wrap gap-2">
                        {moves.map((next) => {
                          const strong = next === 'completed' || next === 'processing';
                          return (
                            <Button
                              key={next}
                              type="button"
                              disabled={busyId === withdrawal._id}
                              onClick={() => applyStatus(withdrawal, next)}
                              className={strong ? BTN_PRIMARY : BTN_SECONDARY}
                            >
                              <Span className={strong ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{next}</Span>
                            </Button>
                          );
                        })}
                      </Div>
                    )}
                  </Cell>
                </Row>
              );
            })}
          </TBody>
        </DataTable>
      )}
      {promptElement}
    </Card>
  );
};
export default PayoutSettlements;
