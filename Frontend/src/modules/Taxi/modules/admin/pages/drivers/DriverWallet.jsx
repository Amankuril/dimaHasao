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
  ReceiptText
} from 'lucide-react';

const DriverWallet = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const [walletStats] = useState({
    totalBalance: '₹42,15,000',
    pendingPayouts: '₹8,42,000',
    processedToday: '₹12,45,000',
    failedTransactions: 12
  });

  const [ledger] = useState([
    { id: 'TXN-101', driver: 'Rahul S.', type: 'Credit', category: 'Ride Earning', amount: '+₹420', date: 'Mar 31, 2024', status: 'Success' },
    { id: 'TXN-102', driver: 'Vijay P.', type: 'Debit', category: 'Admin Comm.', amount: '-₹42', date: 'Mar 31, 2024', status: 'Success' },
    { id: 'TXN-103', driver: 'Anil D.', type: 'Credit', category: 'Referral Bonus', amount: '+₹1,000', date: 'Mar 30, 2024', status: 'Success' },
    { id: 'TXN-104', driver: 'Suresh K.', type: 'Debit', category: 'Subscription Fee', amount: '-₹999', date: 'Mar 30, 2024', status: 'Success' },
    { id: 'TXN-105', driver: 'Rajesh M.', type: 'Credit', category: 'Cash Trip Audit', amount: '+₹150', date: 'Mar 29, 2024', status: 'Failed' },
  ]);

  return (
    <div className="space-y-10 p-1 animate-in fade-in duration-700 font-sans text-neutral-950">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
         <div>
            <h1 className="text-4xl font-medium text-neutral-900 mb-2 leading-none">Fleet ledger</h1>
            <div className="flex items-center gap-2 text-[13px] text-neutral-500">
               <span className="text-neutral-950">Finance control</span>
               <ChevronRight size={14} />
               <span>Transaction audit</span>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <button className="bg-white border border-neutral-900/[0.08] text-neutral-950 px-5 py-2.5 rounded-xl text-[12px] font-medium flex items-center gap-2 hover:bg-neutral-50 transition-colors">
               <Download size={16} className="text-neutral-500" /> Export CSV
            </button>
            <button className="bg-[#0a4d2b] text-white px-5 py-2.5 rounded-xl text-[12px] font-medium flex items-center gap-2 hover:bg-[#06381e] transition-colors shadow-sm">
               <Zap size={16} /> Bulk settle payouts
            </button>
         </div>
      </div>

      {/* WALLET SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="bg-[#0a4d2b] p-8 rounded-[40px] text-white shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 scale-[2.5] -rotate-12 translate-x-4"><Wallet size={80} strokeWidth={1} /></div>
            <p className="text-xs font-medium text-neutral-700 mb-6 relative z-10">Total balance pool</p>
            <div className="relative z-10 mb-8">
               <p className="text-4xl font-medium leading-none mb-2">{walletStats.totalBalance}</p>
               <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5 leading-none">
                  <ArrowUpRight size={14} /> +24% <span className="text-neutral-700">Growth (MTD)</span>
               </p>
            </div>
         </div>

         <div className="bg-white p-8 rounded-xl border border-neutral-50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 scale-[2] -rotate-12 translate-x-4"><Clock size={80} strokeWidth={1} /></div>
            <p className="text-xs text-neutral-500 mb-6 relative z-10">Pending payouts</p>
            <div className="relative z-10">
               <p className="text-3xl font-medium text-neutral-950 leading-none mb-2">{walletStats.pendingPayouts}</p>
               <p className="text-xs font-medium text-[#0a4d2b] flex items-center gap-1.5 leading-none mt-4">
                  Awaiting settlement
               </p>
            </div>
         </div>

         <div className="bg-white p-8 rounded-xl border border-neutral-50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 scale-[2] -rotate-12 translate-x-4 transition-transform duration-1000"><CheckCircle2 size={80} strokeWidth={1} /></div>
            <p className="text-xs text-neutral-500 mb-6 relative z-10">Processed today</p>
            <div className="relative z-10">
               <p className="text-3xl font-medium text-neutral-950 leading-none mb-2">{walletStats.processedToday}</p>
               <p className="text-xs font-medium text-emerald-600 flex items-center gap-1.5 leading-none mt-4">
                  Cleared to bank
               </p>
            </div>
         </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="space-y-8">
         <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-2xl font-medium text-neutral-900 leading-none">Stream ledger</h2>
            <div className="flex items-center gap-3">
               <div className="relative w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                  <input type="text" placeholder="Search by driver or txn ID" className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-100 rounded-xl text-[12px] font-medium focus:ring-2 focus:ring-neutral-100 outline-none transition-colors" />
               </div>
               <button className="p-3 bg-white border border-neutral-900/[0.08] text-neutral-500 rounded-xl hover:text-neutral-950"><Filter size={18} /></button>
            </div>
         </div>

         <div className="bg-white rounded-xl border border-neutral-50 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-neutral-50 text-xs text-neutral-500 bg-neutral-50/20">
                        <th className="px-8 py-6">Transaction ID</th>
                        <th className="px-6 py-6">Operator</th>
                        <th className="px-6 py-6">Categorization</th>
                        <th className="px-6 py-6 text-center">Amount</th>
                        <th className="px-6 py-6 text-center">Status</th>
                        <th className="px-8 py-6 text-right w-10"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                     {ledger.length === 0 ? (
                        <tr>
                           <td colSpan="6" className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center text-neutral-500">
                                 <Wallet size={48} className="mb-4 text-neutral-300 opacity-50" />
                                 <p className="text-[14px] font-medium text-neutral-900">No transactions found</p>
                                 <p className="text-[12px] mt-1 text-neutral-500">There are no ledger records for the current criteria</p>
                              </div>
                           </td>
                        </tr>
                     ) : (
                     ledger.map((txn, i) => (
                        <tr key={i} className="hover:bg-neutral-50/20 transition-colors cursor-pointer group">
                           <td className="px-8 py-6">
                              <p className="text-xs text-neutral-500">{txn.id}</p>
                              <p className="text-xs font-medium text-neutral-300 mt-1">{txn.date}</p>
                           </td>
                           <td className="px-6 py-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-950 font-medium text-xs flex items-center justify-center">
                                    {txn.driver.split(' ').map(n => n[0]).join('')}
                                 </div>
                                 <span className="text-[13px] font-medium text-neutral-950">{txn.driver}</span>
                              </div>
                           </td>
                           <td className="px-6 py-6 font-medium text-[13px] text-neutral-800">
                              <div className="flex items-center gap-2">
                                 <ReceiptText size={16} className="text-neutral-300" /> {txn.category}
                              </div>
                           </td>
                           <td className="px-6 py-6 text-center">
                              <span className={`text-[15px] font-medium ${txn.type === 'Credit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {txn.amount}
                              </span>
                           </td>
                           <td className="px-6 py-6 text-center">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-medium   border ${txn.status === 'Success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                 {txn.status}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <button className="p-2.5 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 rounded-xl transition-colors shadow-sm">
                                 <MoreHorizontal size={18} />
                              </button>
                           </td>
                        </tr>
                     )))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      {/* FOOTER STATS */}
      <div className="p-8 bg-white border border-neutral-50 rounded-xl flex items-center justify-between">
         <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl border border-emerald-100"><TrendingUp size={24} /></div>
               <div>
                  <p className="text-xs text-neutral-500 leading-none mb-1.5 focus:outline-none">Liquidity trend</p>
                  <p className="text-xl font-medium text-neutral-950 leading-none">Positive</p>
               </div>
            </div>
         </div>
         <button className="flex items-center gap-2 px-8 py-4 bg-neutral-50 text-neutral-500 text-xs rounded-2xl hover:bg-neutral-100 hover:text-neutral-950 transition-colors border border-neutral-100 shadow-sm group">
            Audit full ledger trail <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
         </button>
      </div>
    </div>
  );
};

export default DriverWallet;
