import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Zap, 
  IndianRupee, 
  ArrowUpRight, 
  ChevronRight,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  ArrowRight
} from 'lucide-react';

const StatCard = ({ title, value, change, icon: Icon, color }) => (
  <div className="bg-white rounded-xl p-8 border border-neutral-900/[0.08] hover:shadow-md transition-colors duration-300 flex flex-col justify-between h-full group">
    <div className="flex items-start justify-between">
      <div className={`p-4 rounded-2xl ${color} bg-opacity-10  transition-transform duration-500`}>
        <Icon size={24} className={`${color.replace('bg-', 'text-')}`} />
      </div>
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">
          <ArrowUpRight size={14} /> {change}%
        </div>
      </div>
    </div>
    <div className="mt-8">
      <p className="text-xs text-neutral-500 leading-none mb-3">{title}</p>
      <h3 className="text-4xl font-medium text-neutral-950 leading-none">{value}</h3>
    </div>
  </div>
);

const ChartSection = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden flex flex-col h-full">
    <div className="px-8 py-6 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/30">
      <h3 className="text-[13px] font-medium text-neutral-950 flex items-center gap-3">
        <div className="w-2 h-2 bg-neutral-900 rounded-full" />
        {title}
      </h3>
      <button className="text-xs text-neutral-500 hover:text-[#0a4d2b] transition-colors flex items-center gap-1">
        Details <ArrowRight size={14} />
      </button>
    </div>
    <div className="p-10 flex-1 flex flex-col items-center justify-center">
      {children}
    </div>
  </div>
);

const ReferralDashboard = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('adminToken') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YzdiZTZhYmJlOTJlYjYwMGYwMmQxNiIsImVtYWlsIjoiYWRtaW5AYWRtaW4uY29tIiwibW9iaWxlIjoiOTk5OTk5OTk5OSIsInJvbGUiOiJzdXBlci1hZG1pbiIsImlhdCI6MTc3NTA0OTExNywiZXhwIjoxODA2NTg1MTE3fQ.5KJmXJwaVefWhnc97EqtArkA1z7ZOhsJwA9fbyRVPdQ';
        const res = await fetch(globalThis.__LEGACY_BACKEND_ORIGIN__ + '/api/v1/admin/referral/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50/30 p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-neutral-200 border-t-[#0a4d2b] rounded-full animate-spin"></div>
          <p className="text-[14px] text-neutral-500 animate-pulse">Syncing Viral Growth Metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 p-2 animate-in fade-in zoom-in-95 duration-700 font-sans text-neutral-950">
      {/* HEADER */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-6xl font-medium text-neutral-950 mb-3 leading-none">Referral<span className="text-[#0a4d2b]">.</span></h1>
          <div className="flex items-center gap-3 text-[12px] text-neutral-500">
            <span className="bg-neutral-100 text-neutral-950 px-3 py-1 rounded-full text-xs">Referral dashboard</span>
            <ChevronRight size={14} />
            <span className="text-xs">Analytics overview</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-white px-6 py-3 rounded-full border border-neutral-100 shadow-sm flex items-center gap-3">
              <Activity size={18} className="text-[#0a4d2b]" />
              <span className="text-xs text-neutral-500">Live Status:</span>
              <span className="text-xs font-medium text-emerald-500">Active</span>
           </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total drivers" 
          value={data?.total_drivers || "0"} 
          change="12" 
          icon={Users} 
          color="bg-neutral-900" 
        />
        <StatCard 
          title="Total users" 
          value={data?.total_users || "0"} 
          change="8" 
          icon={UserCheck} 
          color="bg-rose-500" 
        />
        <StatCard 
          title="Active referrals" 
          value={data?.active_referrals || "0"} 
          change="24" 
          icon={Zap} 
          color="bg-[#0a4d2b] text-white" 
        />
        <StatCard 
          title="Referral earnings" 
          value={data?.referral_earning ? `₹${data.referral_earning}` : "₹ 0"} 
          change="18" 
          icon={IndianRupee} 
          color="bg-emerald-500" 
        />
      </div>

      {/* CHARTS ROW - USER REFERRALS */}
      <div className="space-y-6">
         <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <h2 className="text-[15px] text-neutral-500">User referrals overview</h2>
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[500px]">
           <div className="lg:col-span-4">
              <ChartSection title="User distribution">
                 <div className="relative w-64 h-64 rounded-full border-[1.5em] border-[#0a4d2b] flex items-center justify-center shadow-2xl transform transition-transform duration-700">
                    <div className="absolute inset-0 rounded-full border-[1.5em] border-rose-500 border-t-transparent border-l-transparent -rotate-45"></div>
                    <div className="text-center">
                       <p className="text-xs text-neutral-500 mb-1">Ratio</p>
                       <p className="text-4xl font-medium text-neutral-950">72/28</p>
                    </div>
                 </div>
                 <div className="mt-12 flex flex-col gap-4 w-full">
                    <div className="flex items-center justify-between p-4 bg-neutral-50/50 rounded-2xl border border-neutral-50">
                       <div className="flex items-center gap-3">
                         <div className="w-3 h-3 bg-neutral-900 rounded-full shadow-sm"></div>
                         <span className="text-xs text-neutral-500">Normal user</span>
                       </div>
                       <span className="text-[13px] font-medium text-neutral-950">1,240</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-neutral-50/50 rounded-2xl border border-neutral-50">
                       <div className="flex items-center gap-3">
                         <div className="w-3 h-3 bg-rose-500 rounded-full shadow-sm shadow-rose-200"></div>
                         <span className="text-xs text-neutral-500">Referral user</span>
                       </div>
                       <span className="text-[13px] font-medium text-neutral-950">460</span>
                    </div>
                 </div>
              </ChartSection>
           </div>
           
           <div className="lg:col-span-8">
              <ChartSection title="Monthly growth trend">
                 <div className="w-full flex-1 flex flex-col justify-end gap-12">
                   <div className="h-full flex items-end justify-between gap-4 px-4">
                      {[30, 45, 60, 40, 80, 55, 90, 70, 85, 50, 65, 75].map((val, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-4 group">
                           <div 
                             className="w-full bg-neutral-900 rounded-t-2xl shadow-xl group-hover:bg-rose-500 transition-colors duration-500 transform origin-bottom"
                             style={{ height: `${val}%` }}
                           ></div>
                           <span className="text-xs font-medium text-neutral-300 transform -rotate-45 lg:rotate-0 mt-4 group-hover:text-[#0a4d2b] transition-colors">
                             {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][idx]}
                           </span>
                        </div>
                      ))}
                   </div>
                 </div>
              </ChartSection>
           </div>
         </div>
      </div>

      {/* DRIVER REFERRALS ROW */}
      <div className="space-y-6 opacity-80 filter grayscale hover:grayscale-0 transition-colors duration-700">
         <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <h2 className="text-[15px] text-neutral-500">Driver referrals overview</h2>
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[500px]">
           <div className="lg:col-span-4">
              <ChartSection title="Driver segmentation">
                 <div className="relative w-64 h-64 rounded-full border-[1.5em] border-[#0a4d2b] flex items-center justify-center transform transition-transform duration-1000">
                    <div className="absolute inset-0 rounded-full border-[1.5em] border-neutral-200 border-t-transparent border-r-transparent rotate-45"></div>
                    <div className="text-center">
                       <p className="text-xs font-medium text-white/50 mb-1">Segments</p>
                       <p className="text-4xl font-medium text-neutral-950">54 : 46</p>
                    </div>
                 </div>
                 <div className="mt-12 flex flex-col gap-4 w-full">
                    <div className="flex items-center justify-between p-4 bg-neutral-900 rounded-2xl">
                       <div className="flex items-center gap-3">
                         <div className="w-3 h-3 bg-white rounded-full"></div>
                         <span className="text-xs font-medium text-white/70">Master drivers</span>
                       </div>
                       <span className="text-[13px] font-medium text-white">820</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                       <div className="flex items-center gap-3">
                         <div className="w-3 h-3 bg-neutral-200 rounded-full"></div>
                         <span className="text-xs text-neutral-500">Referral network</span>
                       </div>
                       <span className="text-[13px] font-medium text-neutral-950">695</span>
                    </div>
                 </div>
              </ChartSection>
           </div>
           
           <div className="lg:col-span-8">
              <ChartSection title="Operational trajectory">
                 <div className="w-full h-full flex flex-col">
                    <div className="flex-1 flex items-center justify-center p-12">
                       <div className="w-full h-full flex items-end">
                          <svg className="w-full h-full" viewBox="0 0 1000 300">
                             <defs>
                                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="0%" stopColor="#0a4d2b" stopOpacity="0.2" />
                                   <stop offset="100%" stopColor="#0a4d2b" stopOpacity="0" />
                                </linearGradient>
                             </defs>
                             <path 
                               d="M0,250 Q100,200 200,220 T400,150 T600,100 T800,120 T1000,50 L1000,300 L0,300 Z" 
                               fill="url(#lineGrad)" 
                             />
                             <path 
                               d="M0,250 Q100,200 200,220 T400,150 T600,100 T800,120 T1000,50" 
                               fill="none" 
                               stroke="#0a4d2b" 
                               strokeWidth="8" 
                               strokeLinecap="round"
                             />
                          </svg>
                       </div>
                    </div>
                    <div className="grid grid-cols-12 px-8 mb-10 gap-4">
                      {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m) => (
                        <div key={m} className="text-center text-xs font-medium text-neutral-300 hover:text-[#0a4d2b] transition-colors cursor-help">{m}</div>
                      ))}
                    </div>
                 </div>
              </ChartSection>
           </div>
         </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;

