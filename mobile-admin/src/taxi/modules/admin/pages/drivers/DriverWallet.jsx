/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverWallet.jsx (tools/port.js first pass). */
import React, { useState } from 'react';
import {
  Wallet,
  Search,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  History,
  CreditCard,
  Download,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  ArrowRight,
  TrendingUp,
  ReceiptText,
} from 'lucide-react-native';
import { Button, Div, H1, H2, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
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
    <ScrollDiv className="space-y-10 p-1 animate-in fade-in duration-700 font-sans text-gray-950">
      {/* HEADER */}
      <Div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <Div>
          <H1 className="text-4xl font-black tracking-tight text-gray-900 mb-2 leading-none">Fleet Ledger</H1>
          <Div className="flex items-center gap-2 text-[13px] font-bold text-gray-400">
            <Span className="text-gray-950">Finance Control</Span>
            <UiIcon as={ChevronRight} size={14} />
            <Span>Transaction Audit</Span>
          </Div>
        </Div>
        <Div className="flex items-center gap-3">
          <Button className="bg-white border border-gray-100 text-gray-950 px-5 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
            <UiIcon as={Download} size={16} className="text-gray-400" /> Export CSV
          </Button>
          <Button className="bg-yellow-400 text-black px-5 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-sm">
            <UiIcon as={Zap} size={16} /> Bulk Settle Payouts
          </Button>
        </Div>
      </Div>

      {/* WALLET SUMMARY */}
      <Div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Div className="bg-yellow-400 p-8 rounded-[40px] text-black shadow-sm relative overflow-hidden group">
          <Div className="absolute top-0 right-0 p-6 opacity-20 scale-[2.5] -rotate-12 translate-x-4">
            <UiIcon as={Wallet} size={80} strokeWidth={1} />
          </Div>
          <P className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-6 relative z-10">Total Balance Pool</P>
          <Div className="relative z-10 mb-8">
            <P className="text-4xl font-black tracking-tighter leading-none mb-2">{walletStats.totalBalance}</P>
            <P className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5 leading-none">
              <UiIcon as={ArrowUpRight} size={14} /> +24% <Span className="text-gray-700 uppercase tracking-widest">Growth (MTD)</Span>
            </P>
          </Div>
        </Div>

        <Div className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm relative overflow-hidden group">
          <Div className="absolute top-0 right-0 p-6 opacity-5 scale-[2] -rotate-12 translate-x-4">
            <UiIcon as={Clock} size={80} strokeWidth={1} />
          </Div>
          <P className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 relative z-10">Pending Payouts</P>
          <Div className="relative z-10">
            <P className="text-3xl font-black text-gray-950 tracking-tight leading-none mb-2">{walletStats.pendingPayouts}</P>
            <P className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-1.5 leading-none mt-4">Awaiting Settlement</P>
          </Div>
        </Div>

        <Div className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm relative overflow-hidden group">
          <Div className="absolute top-0 right-0 p-6 opacity-5 scale-[2] -rotate-12 translate-x-4 group-hover:scale-[2.4] transition-transform duration-1000">
            <UiIcon as={CheckCircle2} size={80} strokeWidth={1} />
          </Div>
          <P className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 relative z-10">Processed Today</P>
          <Div className="relative z-10">
            <P className="text-3xl font-black text-gray-950 tracking-tight leading-none mb-2">{walletStats.processedToday}</P>
            <P className="text-[11px] font-bold text-emerald-600 uppercase flex items-center gap-1.5 leading-none mt-4">Cleared to Bank</P>
          </Div>
        </Div>
      </Div>

      {/* LEDGER TABLE */}
      <Div className="space-y-8">
        <Div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <H2 className="text-2xl font-black tracking-tight text-gray-900 leading-none">Stream Ledger</H2>
          <Div className="flex items-center gap-3">
            <Div className="relative w-80">
              <UiIcon as={Search} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                type="text"
                placeholder="Search by driver or txn ID..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-gray-100 outline-none transition-all"
              />
            </Div>
            <Button className="p-3 bg-white border border-gray-100 text-gray-400 rounded-xl hover:text-gray-950 shadow-sm">
              <UiIcon as={Filter} size={18} />
            </Button>
          </Div>
        </Div>

        <Div className="bg-white rounded-[40px] border border-gray-50 shadow-sm overflow-hidden">
          <Div>
            <Table cols={[140, 160, 180, 120, 130, 60]} className="w-full text-left">
              <Thead>
                <Tr className="border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50/20">
                  <Th className="px-8 py-6">Transaction ID</Th>
                  <Th className="px-6 py-6">Operator</Th>
                  <Th className="px-6 py-6">Categorization</Th>
                  <Th className="px-6 py-6 text-center">Amount</Th>
                  <Th className="px-6 py-6 text-center">Status</Th>
                  <Th className="px-8 py-6 text-right w-10"></Th>
                </Tr>
              </Thead>
              <Tbody className="divide-y divide-gray-50">
                {ledger.length === 0 ? (
                  <Tr>
                    <Td colSpan="6" className="px-6 py-20 text-center">
                      <Div className="flex flex-col items-center justify-center text-gray-400">
                        <UiIcon as={Wallet} size={48} className="mb-4 text-gray-300 opacity-50" />
                        <P className="text-[14px] font-bold text-gray-900">No transactions found</P>
                        <P className="text-[12px] mt-1 text-gray-500">There are no ledger records for the current criteria.</P>
                      </Div>
                    </Td>
                  </Tr>
                ) : (
                  ledger.map((txn, i) => (
                    <Tr key={i} className="hover:bg-gray-50/20 transition-all cursor-pointer group">
                      <Td className="px-8 py-6">
                        <P className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{txn.id}</P>
                        <P className="text-[10px] font-bold text-gray-300 mt-1 uppercase">{txn.date}</P>
                      </Td>
                      <Td className="px-6 py-6">
                        <Div className="flex items-center gap-3">
                          <Div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 text-gray-950 font-black text-[11px] flex items-center justify-center uppercase">
                            {txn.driver
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </Div>
                          <Span className="text-[13px] font-black text-gray-950">{txn.driver}</Span>
                        </Div>
                      </Td>
                      <Td className="px-6 py-6 font-bold text-[13px] text-gray-800">
                        <Div className="flex items-center gap-2">
                          <UiIcon as={ReceiptText} size={16} className="text-gray-300" /> {txn.category}
                        </Div>
                      </Td>
                      <Td className="px-6 py-6 text-center">
                        <Span className={`text-[15px] font-black ${txn.type === 'Credit' ? 'text-emerald-500' : 'text-rose-500'}`}>{txn.amount}</Span>
                      </Td>
                      <Td className="px-6 py-6 text-center">
                        <Span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${txn.status === 'Success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}
                        >
                          {txn.status}
                        </Span>
                      </Td>
                      <Td className="px-8 py-6 text-right">
                        <Button className="p-2.5 text-gray-400 hover:text-gray-950 hover:bg-gray-100 rounded-xl transition-all shadow-sm">
                          <UiIcon as={MoreHorizontal} size={18} />
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Div>
        </Div>
      </Div>

      {/* FOOTER STATS */}
      <Div className="p-8 bg-white border border-gray-50 rounded-[40px] shadow-sm flex items-center justify-between">
        <Div className="flex items-center gap-8">
          <Div className="flex items-center gap-3">
            <Div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl border border-emerald-100">
              <UiIcon as={TrendingUp} size={24} />
            </Div>
            <Div>
              <P className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5 focus:outline-none">Liquidity Trend</P>
              <P className="text-xl font-black text-gray-950 tracking-tighter leading-none">POSITIVE</P>
            </Div>
          </Div>
        </Div>
        <Button className="flex items-center gap-2 px-8 py-4 bg-gray-50 text-gray-400 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-100 hover:text-gray-950 transition-all border border-gray-100 shadow-sm group">
          Audit full ledger trail <UiIcon as={ArrowRight} size={16} className="group-hover:translate-x-1 transition-transform" />
        </Button>
      </Div>
    </ScrollDiv>
  );
};
export default DriverWallet;
