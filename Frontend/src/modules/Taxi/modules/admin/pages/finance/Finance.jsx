import React from 'react';
import { 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Briefcase,
  BarChart4,
  Wallet,
  ShieldCheck
} from 'lucide-react';

import { adminService } from '../../services/adminService';

const Finance = () => {
  const [settlements, setSettlements] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchFinance = async () => {
      try {
        const response = await adminService.getWithdrawals();
        const results = response?.data?.results || [];
        
        const mapped = results.map(w => ({
          id: w.transactionId || `#WTH${Math.floor(Math.random()*1000)}`,
          driver: w.driver_id?.name || 'Unknown Driver',
          amount: `₹${w.amount || 0}`,
          method: w.payment_method || 'Bank Transfer',
          status: w.status ? w.status.charAt(0).toUpperCase() + w.status.slice(1) : 'Pending',
          date: w.createdAt ? new Date(w.createdAt).toLocaleDateString() : 'N/A'
        }));
        
        setSettlements(mapped);
      } catch (error) {
        console.error('Failed to load withdrawals', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFinance();
  }, []);


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Financial management</h1>
          <p className="text-neutral-500 text-xs mt-1 leading-none">Net Revenue, Commissions & Payouts</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="bg-neutral-50 border border-neutral-200 text-neutral-600 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-neutral-100 flex items-center gap-2">
             <Download size={16} /> Tax reports
           </button>
           <button className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-80 flex items-center gap-2">
             <Wallet size={16} /> Process payouts
           </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-xl border border-neutral-900/[0.08]">
            <p className="text-xs text-neutral-500">Total net revenue</p>
            <p className="text-3xl font-medium text-neutral-900 mt-2">₹12.4L</p>
            <div className="flex items-center gap-1 text-green-500 text-xs font-medium mt-2">
               <TrendingUp size={14} /> +12.4% <span className="text-neutral-300">vs last month</span>
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl border border-neutral-900/[0.08]">
            <p className="text-xs text-neutral-500">Platform commission</p>
            <p className="text-3xl font-medium text-neutral-900 mt-2">₹2.8L</p>
            <div className="flex items-center gap-1 text-green-500 text-xs font-medium mt-2">
               <TrendingUp size={14} /> +5.2% <span className="text-neutral-300">avg 15%</span>
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl border border-neutral-900/[0.08]">
            <p className="text-xs text-neutral-500">Driver earnings</p>
            <p className="text-3xl font-medium text-neutral-900 mt-2">₹9.6L</p>
            <div className="flex items-center gap-1 text-[#0a4d2b] text-xs font-medium mt-2 font-medium">
               84.2% <span className="text-neutral-300 font-medium ml-1">of GTV</span>
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl border border-neutral-900/[0.08]">
            <p className="text-xs text-neutral-500">Pending payouts</p>
            <p className="text-3xl font-medium text-primary mt-2">₹42.5k</p>
            <div className="flex items-center gap-1 text-orange-500 text-xs font-medium mt-2">
               <Clock size={14} /> 12 Requests <span className="text-neutral-300 ml-1">unprocessed</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
         {/* Monthly Trend Chart Placeholder */}
         <div className="col-span-2 bg-white rounded-xl border border-neutral-900/[0.08] p-8">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-lg font-medium text-neutral-900 flex items-center gap-2">
                  <BarChart4 size={20} className="text-primary" /> Revenue trending
               </h3>
               <div className="flex gap-2">
                  <button className="bg-neutral-50 text-xs font-medium px-3 py-1 rounded-lg">30 Days</button>
                  <button className="text-xs font-medium px-3 py-1 rounded-lg">90 Days</button>
               </div>
            </div>
            {/* Visual Placeholder for a Chart */}
            <div className="h-64 w-full flex items-end gap-3 px-4">
               {[40, 60, 45, 90, 65, 80, 50, 70, 85, 40, 55, 95].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                     <div 
                        className={`w-full rounded-t-lg transition-colors cursor-pointer ${i === 11 ? 'bg-primary' : 'bg-neutral-100 hover:bg-neutral-200'}`} 
                        style={{ height: `${h}%` }}
                     ></div>
                     <span className="text-xs text-neutral-500">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</span>
                  </div>
               ))}
            </div>
         </div>

         {/* Payout Channels Breakdown */}
         <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-8 flex flex-col justify-between">
            <div>
               <h3 className="text-lg font-medium text-neutral-900 mb-6 flex items-center gap-2">
                 <ShieldCheck size={20} className="text-green-500" /> Settlement quality
               </h3>
               <div className="space-y-6">
                  {[
                    { label: 'UPI Instant', value: 82, color: 'bg-primary' },
                    { label: 'Bank Transfer', value: 15, color: 'bg-neutral-900' },
                    { label: 'Cash Remittance', value: 3, color: 'bg-orange-500' },
                  ].map((chan, i) => (
                    <div key={i} className="space-y-2">
                       <div className="flex justify-between text-xs font-medium">
                          <span className="text-neutral-500">{chan.label}</span>
                          <span className="text-neutral-900">{chan.value}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-neutral-50 rounded-full overflow-hidden">
                          <div className={`${chan.color} h-full rounded-full`} style={{ width: `${chan.value}%` }}></div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
            <div className="mt-8 p-4 bg-neutral-50 rounded-xl border border-neutral-100 border-dashed">
               <p className="text-xs text-neutral-500 leading-relaxed">System Health: All financial gateways are operational. Next batch settlement in 4h 22m.</p>
            </div>
         </div>
      </div>

      {/* Recent Settlements Table */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
         <div className="p-6 border-b border-neutral-50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-neutral-900">Recent settlements</h3>
            <button className="text-xs font-medium text-primary hover:underline">Full statement</button>
         </div>
         <table className="w-full text-left">
            <thead>
               <tr className="bg-neutral-50/50 text-xs text-neutral-500 border-b border-neutral-50">
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Driver</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Processed on</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
               {settlements.map((st, i) => (
                  <tr key={i} className="hover:bg-neutral-50/50 transition-colors cursor-pointer">
                     <td className="px-6 py-4 text-[12px] font-medium text-neutral-900">{st.id}</td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-xs text-neutral-500">{st.driver[0]}</div>
                           <span className="text-[12px] font-medium text-neutral-700">{st.driver}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-[13px] font-medium text-neutral-900">{st.amount}</td>
                     <td className="px-6 py-4">
                        <div className="flex justify-center">
                           <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              st.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' :
                              st.status === 'Pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'
                           }`}>
                              {st.status}
                           </span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-right text-xs text-neutral-500">{st.date}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};

export default Finance;
