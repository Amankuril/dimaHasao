/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverWallet.jsx (tools/port.js first pass). */
import React, { useState } from 'react';
import { Wallet, Search, Download, Filter, Clock, CheckCircle2, Zap, ReceiptText, TrendingUp } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, SectionTitle, StatCard, StatGrid, Toolbar, DataTable, THead, TBody, Row, Cell, StatusBadge, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../../admin/ui';
import { Button, Div, Input, P, Span, Icon as UiIcon } from '../../../../../components/web';

const COLS = [120, 140, 150, 110, 120];

const DriverWallet = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [walletStats] = useState({
    totalBalance: '₹42,15,000',
    pendingPayouts: '₹8,42,000',
    processedToday: '₹12,45,000',
    failedTransactions: 12,
  });
  const [ledger] = useState([
    {
      id: 'TXN-101',
      driver: 'Rahul S.',
      type: 'Credit',
      category: 'Ride Earning',
      amount: '+₹420',
      date: 'Mar 31, 2024',
      status: 'Success',
    },
    {
      id: 'TXN-102',
      driver: 'Vijay P.',
      type: 'Debit',
      category: 'Admin Comm.',
      amount: '-₹42',
      date: 'Mar 31, 2024',
      status: 'Success',
    },
    {
      id: 'TXN-103',
      driver: 'Anil D.',
      type: 'Credit',
      category: 'Referral Bonus',
      amount: '+₹1,000',
      date: 'Mar 30, 2024',
      status: 'Success',
    },
    {
      id: 'TXN-104',
      driver: 'Suresh K.',
      type: 'Debit',
      category: 'Subscription Fee',
      amount: '-₹999',
      date: 'Mar 30, 2024',
      status: 'Success',
    },
    {
      id: 'TXN-105',
      driver: 'Rajesh M.',
      type: 'Credit',
      category: 'Cash Trip Audit',
      amount: '+₹150',
      date: 'Mar 29, 2024',
      status: 'Failed',
    },
  ]);
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Wallet}
        title="Fleet Ledger"
        subtitle="Driver wallet balances and transaction audit"
        breadcrumb={[{ label: 'Finance Control' }, { label: 'Transaction Audit' }]}
        actions={
          <>
            <Button className={BTN_PRIMARY}>
              <UiIcon as={Zap} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Bulk settle payouts</Span>
            </Button>
            <Button className={BTN_SECONDARY}>
              <UiIcon as={Download} size={16} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>Export CSV</Span>
            </Button>
          </>
        }
      />

      <StatGrid className="mb-4">
        <StatCard label="Total balance pool" value={walletStats.totalBalance} hint="+24% growth (MTD)" icon={Wallet} tone="success" />
        <StatCard label="Pending payouts" value={walletStats.pendingPayouts} hint="Awaiting settlement" icon={Clock} tone="warning" />
        <StatCard label="Processed today" value={walletStats.processedToday} hint="Cleared to bank" icon={CheckCircle2} tone="info" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle>Stream ledger</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by driver or txn ID"
              className={`${INPUT} flex-1`}
            />
          </Div>
          <Button accessibilityLabel="Filter ledger" className={BTN_SECONDARY}>
            <UiIcon as={Filter} size={16} className="text-slate-700" />
            <Span className={BTN_TEXT_SECONDARY}>Filters</Span>
          </Button>
        </Toolbar>
      </Card>

      {ledger.length === 0 ? (
        <EmptyState icon={Wallet} title="No transactions found" message="There are no ledger records for the current criteria." />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Transaction', 'Driver', 'Category', 'Amount', 'Status']} />
          <TBody>
            {ledger.map((txn, i) => (
              <Row key={txn.id} last={i === ledger.length - 1}>
                <Cell width={COLS[0]}>
                  <Div className="gap-0.5">
                    <P className="text-sm font-semibold text-slate-900">{txn.id}</P>
                    <P className="text-xs text-slate-500">{txn.date}</P>
                  </Div>
                </Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm text-slate-700">{txn.driver}</Span>
                </Cell>
                <Cell width={COLS[2]}>
                  <Div className="flex-row items-center gap-2">
                    <UiIcon as={ReceiptText} size={14} className="text-slate-400" />
                    <Span className="text-sm text-slate-700 flex-1">{txn.category}</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[3]} align="right">
                  <Span className={txn.type === 'Credit' ? 'text-sm font-semibold text-green-700' : 'text-sm font-semibold text-red-700'}>{txn.amount}</Span>
                </Cell>
                <Cell width={COLS[4]}>
                  <StatusBadge status={txn.status} />
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      <Card className="mt-4 flex-row items-center gap-3">
        <Div className="w-10 h-10 rounded-lg bg-green-100 items-center justify-center shrink-0">
          <UiIcon as={TrendingUp} size={20} className="text-green-700" />
        </Div>
        <Div className="flex-1 min-w-0">
          <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Liquidity trend</P>
          <P className="text-base font-semibold text-slate-900">Positive</P>
        </Div>
      </Card>
    </AdminPage>
  );
};
export default DriverWallet;
