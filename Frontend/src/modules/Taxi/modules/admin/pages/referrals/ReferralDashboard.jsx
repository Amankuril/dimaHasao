import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ArrowUpRight, 
  ChevronRight,
  UserCheck,
  Zap,
  IndianRupee,
  Loader2
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';
import { useSettings } from '../../../../shared/context/SettingsContext';

const StatCard = ({ title, value, change, icon: Icon }) => (
  <div className="bg-white rounded-xl p-5 border border-neutral-900/[0.08] flex flex-col justify-between h-full group hover:border-yellow-200 hover:shadow-md transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex flex-col">
        <p className="text-sm text-neutral-500 mb-1">{title}</p>
        <h3 className="text-2xl font-medium text-neutral-900 leading-none">{value}</h3>
      </div>
      <div className={`p-2.5 rounded-xl bg-yellow-50 text-[#0a4d2b] group-hover:bg-[#0a4d2b] text-white group-hover:text-black transition-colors`}>
        <Icon size={20} />
      </div>
    </div>
    {change && (
      <div className="mt-4 flex items-center gap-1.5">
         <div className="flex items-center gap-0.5 text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-1 rounded-full">
            <ArrowUpRight size={14} /> 
            <span>{change}%</span>
         </div>
      </div>
    )}
  </div>
);

const ChartContainer = ({ title, children, fullWidth }) => (
  <div className={`bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col ${fullWidth ? 'col-span-12' : 'col-span-12 lg:col-span-6'}`}>
    <div className="px-5 py-4 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
      <h3 className="text-sm font-medium text-neutral-900">
        {title}
      </h3>
    </div>
    <div className="p-6 flex-1 min-h-[300px] flex flex-col">
      {children}
    </div>
  </div>
);

const PieChartMock = ({ color1, color2, label1, label2, val1, val2 }) => {
  const isZero = val1 === 0 && val2 === 0;
  const total = (val1 + val2) || 1;
  const p1 = isZero ? 0 : (val1 / total) * 100;
  
  if (isZero) {
    return (
      <div className="flex flex-col items-center justify-center h-full flex-1 text-center py-10">
        <div className="w-24 h-24 rounded-full border-8 border-neutral-100 mb-4 flex items-center justify-center bg-neutral-50">
           <span className="text-neutral-500 text-sm">No data</span>
        </div>
        <p className="text-sm text-neutral-500">No referrals found yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full flex-1">
      <div className="relative w-48 h-48 rounded-full flex items-center justify-center border-[16px] border-neutral-100 overflow-hidden shadow-inner">
         <div 
           className="absolute inset-0 rounded-full border-[16px]" 
           style={{ 
             borderColor: color1, 
             clipPath: `polygon(50% 50%, 50% 0%, ${p1 > 50 ? '100% 0%, 100% 100%, 0% 100%, 0% 0%,' : ''} ${50 + 50 * Math.sin(2 * Math.PI * (p1/100))}% ${50 - 50 * Math.cos(2 * Math.PI * (p1/100))}%)` 
           }} 
         />
         <div className="text-center z-10 bg-white w-full h-full rounded-full flex flex-col items-center justify-center">
            <p className="text-xs text-neutral-500">{label1}</p>
            <p className="text-2xl font-medium text-neutral-900">{val1}</p>
         </div>
      </div>
      <div className="mt-8 flex items-center gap-6">
         <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-full border border-neutral-100">
            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color1 }}></div>
            <span className="text-xs font-medium text-neutral-700">{label1}</span>
         </div>
         <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-full border border-neutral-100">
            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: color2 }}></div>
            <span className="text-xs font-medium text-neutral-700">{label2}</span>
         </div>
      </div>
    </div>
  );
};

const LineChartMock = ({ color, data }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxVal = Math.max(...data, 2) || 2;
  const isZero = data.every(val => val === 0);

  if (isZero) {
    return (
      <div className="flex flex-col items-center justify-center h-full flex-1 text-center py-10">
        <div className="flex items-end gap-2 h-24 mb-4 opacity-50">
           {[1,2,3,4,5].map(i => (
             <div key={i} className="w-4 bg-neutral-100 rounded-t-sm" style={{ height: `${Math.random() * 40 + 10}%` }}></div>
           ))}
        </div>
        <p className="text-sm text-neutral-500">No monthly data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between flex-1">
      <div className="flex-1 flex items-end justify-between gap-2 relative pt-6 min-h-[160px]">
         {/* Grid Lines */}
         <div className="absolute inset-x-0 top-0 h-px bg-neutral-100"></div>
         <div className="absolute inset-x-0 bottom-0 h-px bg-neutral-200"></div>
         <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-50 border-t border-dashed border-neutral-200"></div>
         
         {/* Bars */}
         {data.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
               <div 
                 className="w-full max-w-[24px] rounded-t-md transition-colors duration-700 relative z-10 hover:opacity-80"
                 style={{ 
                   height: `${(val / maxVal) * 100}%`,
                   backgroundColor: val > 0 ? color : '#F3F4F6',
                   minHeight: val > 0 ? '4px' : '2px'
                 }}
               >
                 {val > 0 && (
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs font-medium py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-20">
                      {val} Referrals
                    </div>
                 )}
               </div>
            </div>
         ))}
      </div>
      <div className="flex items-center justify-between mt-4 px-1 border-t border-neutral-100 pt-3">
         {months.map(m => (
           <span key={m} className="text-xs text-neutral-500">{m}</span>
         ))}
      </div>
    </div>
  );
};

const ReferralDashboard = () => {
  const { settings } = useSettings();
  const appName = settings.general?.app_name || 'App';
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await adminService.getReferralDashboard();
        if (res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50/10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#0a4d2b]" size={32} />
          <span className="text-sm text-neutral-500">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  // Monthly data defaults
  const emptyMonthly = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 font-sans text-neutral-900 pb-6 max-w-full overflow-x-hidden p-4 bg-neutral-50 min-h-screen">

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total drivers" 
          value={data?.total_drivers || "0"} 
          icon={Users} 
        />
        <StatCard 
          title="Total users" 
          value={data?.total_users || "0"} 
          icon={UserCheck} 
        />
        <StatCard 
          title="Active referrals" 
          value={data?.active_referrals || "0"} 
          icon={Zap} 
        />
        <StatCard 
          title="Referral earning" 
          value={data?.referral_earning ? `₹ ${data.referral_earning}` : "₹ 0"} 
          icon={IndianRupee} 
        />
      </div>

      {/* USER REFERRALS SECTION */}
      <div className="mt-5">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartContainer title="User referrals overview">
               <PieChartMock 
                 color1="#FBBF24" /* yellow-400 */
                 color2="#E5E7EB" /* gray-200 */
                 label1="Referral User" 
                 label2="Normal User" 
                 val1={data?.user_referrals?.referral_user || 0}
                 val2={data?.user_referrals?.normal_user || 0}
               />
            </ChartContainer>
            <ChartContainer title="User monthly referrals">
               <LineChartMock 
                 color="#FBBF24" /* yellow-400 */
                 data={data?.user_referrals?.monthly || emptyMonthly} 
               />
            </ChartContainer>
         </div>
      </div>

      {/* DRIVER REFERRALS SECTION */}
      <div className="mt-5">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartContainer title="Driver referrals overview">
               <PieChartMock 
                 color1="#FACC15" /* yellow-400 */
                 color2="#E5E7EB" /* gray-200 */
                 label1="Referral Driver" 
                 label2="Normal Driver" 
                 val1={data?.driver_referrals?.referral_driver || 0}
                 val2={data?.driver_referrals?.normal_driver || 0}
               />
            </ChartContainer>
            <ChartContainer title="Driver monthly referrals">
               <LineChartMock 
                 color="#FACC15" /* yellow-400 */
                 data={data?.driver_referrals?.monthly || emptyMonthly} 
               />
            </ChartContainer>
         </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 border-t border-neutral-200 pt-4">
         <div>2026 © {appName}.</div>
         <div className="flex items-center gap-6">
           <span>Design & develop by {appName}</span>
           <span>App version 2.3</span>
         </div>
      </footer>
    </div>
  );
};

export default ReferralDashboard;


