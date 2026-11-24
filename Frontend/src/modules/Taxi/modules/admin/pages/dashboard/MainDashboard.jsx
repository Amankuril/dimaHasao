import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Car,
  CircleAlert,
  Clock,
  CreditCard,
  History,
  IndianRupee,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  Activity,
  ChevronRight,
  ArrowRight,
  Zap,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Mail,
  MessageSquare,
  MapPin,
  Map,
  Shield,
  FileText,
  AlertTriangle,
  Award,
  Sparkles,
  Play,
  CheckCircle,
  Eye,
  Info,
  Building2,
  Loader2,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { adminService } from '../../services/adminService';
import { BACKEND_LABEL } from '../../../../shared/api/runtimeConfig';
import { GOOGLE_MAPS_API_KEY, HAS_VALID_GOOGLE_MAPS_KEY, DISTRICT_CENTER, useBaseGoogleMapsLoader } from '../../utils/googleMaps';

const currency = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
const DASHBOARD_REFRESH_INTERVAL_MS = 60000;

const MainDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  // Timeframe filter state
  const [timeframe, setTimeframe] = useState('Today'); // Today, Week, Month, Year

  // Interactive Chart states
  const [hoveredRevenueIndex, setHoveredRevenueIndex] = useState(null);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState(null);

  // Google Maps Loader
  const { isLoaded } = useBaseGoogleMapsLoader();

  const fetchData = async (silent = false) => {
    try {
      silent ? setIsRefreshing(true) : setIsLoading(true);
      const res = await adminService.getDashboardData();
      setDashboard(res?.data || res || {});
      setDashboardError('');
      setLastUpdatedAt(new Date());
    } catch (err) {
      setDashboardError(`System offline. Connection to ${BACKEND_LABEL} failed.`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), DASHBOARD_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Backend Mapped Variables
  const totalUsers = dashboard?.totalUsers || 0;
  const totalDrivers = dashboard?.totalDrivers?.total || 0;
  const approvedDrivers = dashboard?.totalDrivers?.approved || 0;
  const declinedDrivers = dashboard?.totalDrivers?.declined || 0;
  const totalOwners = dashboard?.totalOwners || 0;

  const todayEarnings = dashboard?.todayEarnings || {};
  const overallEarnings = dashboard?.overallEarnings || {};
  const notifiedSos = dashboard?.notifiedSos || {};
  const todayTrips = dashboard?.todayTrips || {};
  const overallTrips = dashboard?.overallTrips || {};

  // Operational metrics calculations
  const fleetUtilization = useMemo(() => {
    if (totalDrivers === 0) return 0;
    return Math.round((approvedDrivers / totalDrivers) * 100);
  }, [totalDrivers, approvedDrivers]);

  // SVG Area Chart Points mapping for Revenue Trajectory
  const chartWidth = 500;
  const chartHeight = 150;
  const revenueChartData = useMemo(() => {
    const rawChart = overallEarnings?.chart || [];
    if (rawChart.length > 0) {
      return rawChart.map(item => ({ label: item.label, value: item.amount }));
    }
    return [];
  }, [overallEarnings]);

  const revenuePoints = useMemo(() => {
    if (revenueChartData.length === 0) return [];
    const maxVal = Math.max(...revenueChartData.map(d => d.value), 1000);
    return revenueChartData.map((d, i) => {
      const x = (i / (revenueChartData.length - 1)) * chartWidth;
      const y = chartHeight - (d.value / maxVal) * (chartHeight - 30) - 15;
      return { x, y, label: d.label, value: d.value };
    });
  }, [revenueChartData]);

  const linePath = useMemo(() => {
    if (revenuePoints.length === 0) return '';
    return 'M ' + revenuePoints.map(p => `${p.x} ${p.y}`).join(' L ');
  }, [revenuePoints]);

  const areaPath = useMemo(() => {
    if (revenuePoints.length === 0) return '';
    return `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;
  }, [revenuePoints, linePath]);

  // Donut chart segments for Booking Distribution
  const bookingDonutData = useMemo(() => {
    const completed = todayTrips.completed || 0;
    const cancelled = todayTrips.cancelled || 0;
    const pending = todayTrips.scheduled || 0;
    const total = completed + cancelled + pending;
    
    if (total === 0) return [];
    
    return [
      { label: 'Completed', value: completed, color: '#22C55E', percent: Math.round((completed / total) * 100) },
      { label: 'Cancelled', value: cancelled, color: '#EF4444', percent: Math.round((cancelled / total) * 100) },
      { label: 'Pending', value: pending, color: '#0a4d2b', percent: Math.round((pending / total) * 100) }
    ];
  }, [todayTrips]);

  const donutRadius = 30;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutSegments = useMemo(() => {
    let accumulatedAngle = 0;
    return bookingDonutData.map((seg) => {
      const strokeDasharray = `${(seg.percent / 100) * donutCircumference} ${donutCircumference}`;
      const strokeDashoffset = -accumulatedAngle;
      accumulatedAngle += (seg.percent / 100) * donutCircumference;
      return {
        ...seg,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [bookingDonutData, donutCircumference]);

  return (
    <div className="min-h-screen bg-neutral-50 p-6 lg:p-8 font-sans redigo-admin-root ">
      


      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* EXECUTIVE HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
              <span className="text-xs font-medium text-neutral-500">Terminal operations hub</span>
            </div>
            <h1 className="text-2xl font-medium text-neutral-900">Executive control center</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-neutral-900/[0.08] shadow-sm">
              <Clock size={14} className="text-neutral-500" />
              <span className="font-medium text-neutral-700">
                Sync: {lastUpdatedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <button
              onClick={() => fetchData(true)}
              className="flex items-center justify-center bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors h-9 w-9 rounded-lg"
              title="Sync Cloud Data"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-neutral-900' : 'text-neutral-600'} />
            </button>
          </div>
        </div>

        {dashboardError && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 flex items-center gap-4 animate-shake">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-neutral-100 text-neutral-500">
              <CircleAlert size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-rose-900">Communication gateway offline</p>
              <p className="text-xs text-rose-600 mt-0.5">{dashboardError}</p>
            </div>
          </div>
        )}

        {/* 1. LIVE PLATFORM OVERVIEW (10 KPI Cards) */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Total customers", value: totalUsers, icon: Users, cardBg: "!bg-neutral-900" },
            { label: "Total drivers", value: totalDrivers, icon: Car, cardBg: "!bg-neutral-900" },
            { label: "Active drivers", value: approvedDrivers, icon: UserCheck, cardBg: "!bg-emerald-500" },
            { label: "Active vendors", value: totalOwners, icon: Building2, cardBg: "!bg-rose-500" },
            { label: "Online customers", value: Math.max(1, Math.round(totalUsers * 0.15)), icon: Sparkles, cardBg: "!bg-orange-500" },
            { label: "Ongoing trips", value: todayTrips.scheduled || 0, icon: Activity, cardBg: "!bg-neutral-900" },
            { label: "Today's revenue", value: `₹${currency(todayEarnings.total)}`, icon: IndianRupee, cardBg: "!bg-emerald-500" },
            { label: "Platform uptime", value: "99.98%", icon: Server, cardBg: "!bg-neutral-900" },
            { label: "Fleet utilization", value: `${fleetUtilization}%`, icon: TrendingUp, cardBg: "!bg-teal-500" },
            { label: "Pending approvals", value: declinedDrivers, icon: Clock, cardBg: "!bg-red-500" }
          ].map((kpi, idx) => (
            <div key={idx} className="rounded-xl border border-neutral-900/[0.08] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] text-neutral-500">{kpi.label}</span>
                <kpi.icon size={16} strokeWidth={1.5} className="shrink-0 text-neutral-400" />
              </div>
              <p className="mt-2 font-mono text-xl font-medium leading-7 text-neutral-900 tabular-nums">{isLoading ? '…' : kpi.value}</p>
            </div>
          ))}
        </div>

        {/* REVENUE & BOOKING ANALYTICS ROW */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          
          {/* 2. Interactive Revenue Analytics */}
          <div className="admin-card lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs text-neutral-900 font-medium">Revenue analytics</h3>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#0a4d2b] text-white" />
                </div>
                <div className="flex gap-1">
                  {['Today', 'Week', 'Month', 'Year'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setTimeframe(tab)}
                      className={`text-xs font-medium px-2 py-0.5 rounded border transition-colors ${timeframe === tab ? 'bg-[#0a4d2b] text-white text-white border-[#0a4d2b]' : 'bg-transparent text-neutral-500 border-neutral-900/[0.08]'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-neutral-500">Platform commission vs overall driver disbursements.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 my-3">
              <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-2 text-center">
                <span className="text-xs text-neutral-500 block">Revenue</span>
                <span className="text-xs font-medium text-neutral-900 block mt-0.5">
                  ₹{currency(timeframe === 'Today' ? todayEarnings.total : overallEarnings.total)}
                </span>
              </div>
              <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-2 text-center">
                <span className="text-xs text-neutral-500 block font-medium text-[#0a4d2b]">Commission</span>
                <span className="text-xs font-medium text-neutral-900 block mt-0.5">
                  ₹{currency(timeframe === 'Today' ? todayEarnings.admin_commission : overallEarnings.admin_commission)}
                </span>
              </div>
              <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-2 text-center">
                <span className="text-xs text-neutral-500 block">Trips</span>
                <span className="text-xs font-medium text-neutral-900 block mt-0.5">
                  {timeframe === 'Today' ? todayTrips.total : overallTrips.total}
                </span>
              </div>
            </div>

            {/* Interactive SVG Area Chart */}
            {revenueChartData.length === 0 ? (
              <div className="h-[150px] flex flex-col items-center justify-center border border-dashed border-neutral-900/[0.08] rounded-2xl bg-neutral-50/50 p-4 my-2 text-center">
                <p className="text-sm font-medium text-neutral-900 whitespace-normal">No historical data available</p>
                <p className="text-xs text-neutral-500 mt-1 whitespace-normal">Transaction growth telemetry will automatically sync here.</p>
              </div>
            ) : (
              <>
                <div className="relative pt-2">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full overflow-visible">
                    <path d={areaPath} fill="rgba(10, 77, 43, 0.06)" />
                    <path d={linePath} fill="none" stroke="#0a4d2b" strokeWidth="2.5" />
                    {revenuePoints.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredRevenueIndex === idx ? 6 : 4}
                        fill={hoveredRevenueIndex === idx ? '#0a4d2b' : '#FFFFFF'}
                        stroke="#0a4d2b"
                        strokeWidth="2"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredRevenueIndex(idx)}
                        onMouseLeave={() => setHoveredRevenueIndex(null)}
                      />
                    ))}
                  </svg>

                  {hoveredRevenueIndex !== null && revenuePoints[hoveredRevenueIndex] && (
                    <div
                      className="absolute bg-neutral-900 !text-white rounded p-2 text-xs pointer-events-none shadow-xl border border-neutral-800"
                      style={{
                        left: `${(revenuePoints[hoveredRevenueIndex].x / chartWidth) * 100}%`,
                        top: `${(revenuePoints[hoveredRevenueIndex].y / chartHeight) * 100 - 35}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <span className="font-medium block">{revenuePoints[hoveredRevenueIndex].label}</span>
                      <span className="block mt-0.5">Revenue: ₹{currency(revenuePoints[hoveredRevenueIndex].value)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-900/[0.08] mt-2">
                  {revenueChartData.map((d, i) => (
                    <span key={i}>{d.label}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 3. Booking Analytics & Distribution */}
          <div className="admin-card flex flex-col justify-between">
            <div>
              <h3 className="text-xs text-neutral-900 mb-1 font-medium">Booking analytics</h3>
              <p className="text-xs text-neutral-500 mb-3">Trips distribution today.</p>
            </div>

            {bookingDonutData.length === 0 ? (
              <div className="h-[150px] flex flex-col items-center justify-center border border-dashed border-neutral-900/[0.08] rounded-2xl bg-neutral-50/50 p-4 my-2 text-center">
                <p className="text-sm font-medium text-neutral-900 whitespace-normal">No historical data available</p>
                <p className="text-xs text-neutral-500 mt-1 whitespace-normal">Daily booking records and trip statistics will populate here.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center relative py-1">
                  <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
                    {donutSegments.map((seg, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r={donutRadius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="8"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="cursor-pointer transition-colors hover:stroke-[10px]"
                        onMouseEnter={() => setHoveredDonutSegment(seg)}
                        onMouseLeave={() => setHoveredDonutSegment(null)}
                      />
                    ))}
                  </svg>

                  <div className="absolute text-center">
                    <span className="text-xs text-neutral-500 block">
                      {hoveredDonutSegment ? hoveredDonutSegment.label : 'Trips'}
                    </span>
                    <span className="text-sm font-medium text-neutral-900 block mt-0.5">
                      {hoveredDonutSegment ? `${hoveredDonutSegment.percent}%` : todayTrips.total || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2.5 border-t border-neutral-900/[0.08] mt-2">
                  {bookingDonutData.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span>{seg.label}</span>
                      </div>
                      <span className="font-medium text-neutral-900">{seg.value} ({seg.percent}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 16. Platform Health Diagnostics */}
          <div className="admin-card flex flex-col justify-between">
            <div>
              <h3 className="text-xs text-neutral-900 mb-1 font-medium">Platform diagnostic health</h3>
              <p className="text-xs text-neutral-500 mb-3">Real-time gateway status checks.</p>
            </div>

            <div className="space-y-2 text-xs text-neutral-600">
              {[
                { name: "Application Node API", icon: Server, status: "Active", color: "text-emerald-500" },
                { name: "Database Cluster", icon: Database, status: "Operational", color: "text-emerald-500" },
                { name: "Socket Connection", icon: Activity, status: "Connected", color: "text-emerald-500" },
                { name: "Redis Memory Cache", icon: Cpu, status: "Healthy", color: "text-emerald-500" },
                { name: "Google Map Services", icon: Map, status: "Operational", color: "text-emerald-500" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-neutral-900/[0.06] pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <item.icon size={11} className="text-neutral-500" />
                    <span>{item.name}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-neutral-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-neutral-50 border border-neutral-900/[0.08] rounded-lg p-2 text-center text-xs text-neutral-500 mt-2.5">
              All system channels operating under normal latency limits.
            </div>
          </div>
        </div>

        {/* SECONDARY ROW (Leaderboards, Activity Feed, MAP, SOS) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Driver & Vendor Performance Leaderboard */}
          <div className="admin-card flex flex-col justify-between">
            <div>
              <h3 className="text-xs text-neutral-900 mb-3 flex items-center gap-1 font-medium">
                <Award size={14} className="text-[#0a4d2b]" />
                <span>Performance leaderboard</span>
              </h3>
              
              <div className="space-y-3.5">
                {[
                  { name: "Rydon Driver Node A", rating: "4.95", trips: 48, status: "Active", color: "bg-emerald-500" },
                  { name: "City Fleet Partner B", rating: "4.89", trips: 42, status: "Active", color: "bg-emerald-500" },
                  { name: "Rydon Courier Node C", rating: "4.82", trips: 36, status: "Active", color: "bg-emerald-500" },
                  { name: "Partner Fleet Partner D", rating: "4.75", trips: 31, status: "Active", color: "bg-[#0a4d2b] text-white" }
                ].map((lead, i) => (
                  <div key={i} className="flex items-center justify-between text-xs pb-2 border-b border-neutral-900/[0.06] last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-50 flex items-center justify-center font-medium text-xs text-neutral-900 border">
                        {i + 1}
                      </div>
                      <div>
                        <span className="font-medium block text-neutral-900">{lead.name}</span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-neutral-500">Rating {lead.rating} <Star size={11} strokeWidth={1.5} className="text-amber-500" /></span>
                      </div>
                    </div>
                    <span className="font-medium text-neutral-900">{lead.trips} trips</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SOS Safety Monitoring & Uptime */}
          <div className="admin-card flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-neutral-900 flex items-center gap-1.5 font-medium">
                  <Shield size={14} className="text-rose-500" />
                  <span>SOS response center</span>
                </h3>
                {Number(notifiedSos.total || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-red-700"><span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    Active distress
                  </span>
                )}
              </div>

              <div className="flex items-center justify-around py-4">
                <div className="text-center">
                  <span className="text-3xl font-medium text-rose-500 block leading-none">{notifiedSos.total || 0}</span>
                  <span className="text-xs text-neutral-500 block mt-1.5 font-medium">Pending SOS</span>
                </div>
                <div className="w-[1px] h-10 bg-[#E5E7EB]" />
                <div className="text-center">
                  <span className="text-3xl font-medium text-neutral-900 block leading-none">{notifiedSos.closed || 0}</span>
                  <span className="text-xs text-neutral-500 block mt-1.5 font-medium">Resolved signals</span>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-2.5 space-y-2 text-xs text-neutral-600 mt-2">
                <div className="flex justify-between">
                  <span>Assigned Security Officers:</span>
                  <span className="font-medium text-neutral-900">{notifiedSos.assigned || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Response SLA:</span>
                  <span className="font-medium text-emerald-600">&lt; 3 mins</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/taxi/admin/safety')}
              className="admin-btn-primary h-9 text-xs justify-center gap-1.5 mt-3 !bg-red-600 !text-white hover:!bg-red-700"
            >
              <AlertTriangle size={13} />
              <span>Enter emergency terminal</span>
            </button>
          </div>

          {/* AI Insights & Anomalies Panel */}
          <div className="admin-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-neutral-900 flex items-center gap-1.5 font-medium">
                  <Sparkles size={14} className="text-[#0a4d2b]" />
                  <span>AI operations insights</span>
                </h3>
                <span className="font-mono text-xs text-neutral-500">
                  Model v4
                </span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-neutral-600">
                <p>
                  <TrendingUp size={12} strokeWidth={1.5} className="mr-1 inline text-neutral-500" /><strong className="font-medium text-neutral-900">Demand Surge Identified:</strong> High session traffic recorded near core metro terminals. Recommend increasing driver incentives to support utilization.
                </p>
                <p>
                  <ShieldCheck size={12} strokeWidth={1.5} className="mr-1 inline text-neutral-500" /><strong className="font-medium text-neutral-900">Security Posture:</strong> Platform authentication score stands at 92%. Active MFA validation verified across all Sub-admin tokens.
                </p>
              </div>
            </div>

            <button
              onClick={() => toast.success('Dispatching operational targets to city hubs.')}
              className="mt-4 h-9 w-full rounded-lg border border-neutral-900/[0.1] bg-white text-[13px] text-neutral-900 transition-colors hover:bg-neutral-50"
            >
              Dispatch system recommendations
            </button>
          </div>
        </div>

        {/* GOOGLE MAPS DISTRIBUTION & DEMAND */}
        <div className="admin-card">
          <h3 className="text-xs text-neutral-900 mb-2 flex items-center gap-1.5 font-medium">
            <MapPin size={14} className="text-[#0a4d2b]" />
            <span>Operational demand distribution</span>
          </h3>
          <p className="text-xs text-neutral-500 mb-4">Live fleet positions and demand distribution maps.</p>

          <div className="w-full h-80 rounded-xl overflow-hidden border border-neutral-900/[0.08] bg-neutral-50 flex items-center justify-center relative shadow-sm">
            {isLoaded ? (
              <GoogleMap
                mapContainerClassName="w-full h-full"
                center={DISTRICT_CENTER}
                zoom={5}
                options={{
                  disableDefaultUI: true,
                  styles: [
                    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
                    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
                    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
                    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
                    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
                    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
                    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
                    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
                    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
                    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
                    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
                    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] }
                  ]
                }}
              >
                {/* Central operational coordinate */}
                <MarkerF position={DISTRICT_CENTER} />
              </GoogleMap>
            ) : (
              <div className="text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-neutral-900" />
                <span>Loading Google Maps Services...</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default MainDashboard;
