/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/dashboard/MainDashboard.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../../../../../lib/webRouter';
import {
  Car,
  CircleAlert,
  Clock,
  IndianRupee,
  UserCheck,
  Users,
  Activity,
  TrendingUp,
  RefreshCw,
  Server,
  Database,
  Cpu,
  MapPin,
  Map,
  Shield,
  AlertTriangle,
  Award,
  Sparkles,
  Building2,
  Loader2,
} from 'lucide-react-native';
import { GMap, Marker, toLatLng } from '../../../../../components/maps';
import { adminService } from '../../services/adminService';
import { BACKEND_LABEL } from '../../../../shared/api/runtimeConfig';
import { DISTRICT_CENTER, useBaseGoogleMapsLoader } from '../../utils/googleMaps';
import { toast } from '../../../../../lib/notify';
import { Button, Div, H1, H3, H4, P, ScrollDiv, Span, Strong, Icon as UiIcon } from '../../../../../components/web';
import { Circle, Path, Svg } from 'react-native-svg';

/*
 * The web styles the dashboard map through the Maps JavaScript API's `styles`
 * option; react-native-maps takes the same JSON as `customMapStyle`.
 */
const MAP_STYLE = [
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
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

/* The web's <GoogleMap center={DISTRICT_CENTER} zoom={5}>: ~11 degrees across. */
const MAP_REGION = { ...toLatLng(DISTRICT_CENTER), latitudeDelta: 11, longitudeDelta: 11 };
const currency = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
  });
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

  // The web's <svg className="w-full" viewBox="0 0 500 150"> scales to its box;
  // react-native-svg needs the pixel width, so measure the wrapper.
  const [chartBoxWidth, setChartBoxWidth] = useState(0);

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
      return rawChart.map((item) => ({
        label: item.label,
        value: item.amount,
      }));
    }
    return [];
  }, [overallEarnings]);
  const revenuePoints = useMemo(() => {
    if (revenueChartData.length === 0) return [];
    const maxVal = Math.max(...revenueChartData.map((d) => d.value), 1000);
    return revenueChartData.map((d, i) => {
      const x = (i / (revenueChartData.length - 1)) * chartWidth;
      const y = chartHeight - (d.value / maxVal) * (chartHeight - 30) - 15;
      return {
        x,
        y,
        label: d.label,
        value: d.value,
      };
    });
  }, [revenueChartData]);
  const linePath = useMemo(() => {
    if (revenuePoints.length === 0) return '';
    return 'M ' + revenuePoints.map((p) => `${p.x} ${p.y}`).join(' L ');
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
      {
        label: 'Completed',
        value: completed,
        color: '#22C55E',
        percent: Math.round((completed / total) * 100),
      },
      {
        label: 'Cancelled',
        value: cancelled,
        color: '#EF4444',
        percent: Math.round((cancelled / total) * 100),
      },
      {
        label: 'Pending',
        value: pending,
        color: '#FFC400',
        percent: Math.round((pending / total) * 100),
      },
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
        strokeDashoffset,
      };
    });
  }, [bookingDonutData, donutCircumference]);
  const chartScale = chartBoxWidth > 0 ? chartBoxWidth / chartWidth : 0;
  const chartBoxHeight = chartHeight * chartScale;
  return (
    <ScrollDiv className="min-h-screen bg-[#F6F8FC] p-6 lg:p-8 font-sans redigo-admin-root animate-in fade-in duration-300">
      <Div className="max-w-7xl mx-auto space-y-6">
        {/* EXECUTIVE HEADER */}
        <Div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Div>
            <Div className="flex items-center gap-2.5 mb-1.5">
              <Div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
              <Span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#64748B]">Terminal Operations Hub</Span>
            </Div>
            <H1>Executive Control Center</H1>
          </Div>
          <Div className="flex items-center gap-3 text-xs">
            <Div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-[#E5E7EB] shadow-sm">
              <UiIcon as={Clock} size={14} className="text-[#64748B]" />
              <Span className="font-semibold text-slate-700">
                Sync:{' '}
                {lastUpdatedAt?.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </Span>
            </Div>
            <Button
              onClick={() => fetchData(true)}
              className="flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 transition-colors h-9 w-9 rounded-lg"
            >
              <UiIcon as={RefreshCw} size={15} className={isRefreshing ? 'animate-spin text-slate-900' : 'text-slate-600'} />
            </Button>
          </Div>
        </Div>

        {dashboardError && (
          <Div className="rounded-xl bg-rose-50 border border-rose-100 p-4 flex items-center gap-4 animate-shake">
            <Div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-rose-500 shadow-sm shrink-0">
              <UiIcon as={CircleAlert} size={20} />
            </Div>
            <Div>
              <P className="text-xs font-bold text-rose-900">Communication Gateway Offline</P>
              <P className="text-[10px] text-rose-600 mt-0.5 uppercase tracking-wider">{dashboardError}</P>
            </Div>
          </Div>
        )}

        {/* 1. LIVE PLATFORM OVERVIEW (10 KPI Cards) */}
        <Div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              label: 'Total Customers',
              value: totalUsers,
              icon: Users,
              cardBg: '!bg-violet-500',
            },
            {
              label: 'Total Drivers',
              value: totalDrivers,
              icon: Car,
              cardBg: '!bg-sky-500',
            },
            {
              label: 'Active Drivers',
              value: approvedDrivers,
              icon: UserCheck,
              cardBg: '!bg-emerald-500',
            },
            {
              label: 'Active Vendors',
              value: totalOwners,
              icon: Building2,
              cardBg: '!bg-rose-500',
            },
            {
              label: 'Online Customers',
              value: Math.max(1, Math.round(totalUsers * 0.15)),
              icon: Sparkles,
              cardBg: '!bg-orange-500',
            },
            {
              label: 'Ongoing Trips',
              value: todayTrips.scheduled || 0,
              icon: Activity,
              cardBg: '!bg-blue-500',
            },
            {
              label: "Today's Revenue",
              value: `₹${currency(todayEarnings.total)}`,
              icon: IndianRupee,
              cardBg: '!bg-emerald-500',
            },
            {
              label: 'Platform Uptime',
              value: '99.98%',
              icon: Server,
              cardBg: '!bg-violet-500',
            },
            {
              label: 'Fleet Utilization',
              value: `${fleetUtilization}%`,
              icon: TrendingUp,
              cardBg: '!bg-teal-500',
            },
            {
              label: 'Pending Approvals',
              value: declinedDrivers,
              icon: Clock,
              cardBg: '!bg-red-500',
            },
          ].map((kpi, idx) => (
            <Div key={idx} className={`admin-card !p-4 border-none !text-white hover:scale-[1.02] transition-transform shadow-lg ${kpi.cardBg}`}>
              <Div className="flex items-center justify-between mb-2">
                <Span className="card-label text-[10px] font-bold opacity-80 uppercase tracking-wider">{kpi.label}</Span>
                <Div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                  <UiIcon as={kpi.icon} size={16} strokeWidth={2.5} />
                </Div>
              </Div>
              <H4 className="text-xl font-black tracking-tight mt-1">{isLoading ? '...' : kpi.value}</H4>
            </Div>
          ))}
        </Div>

        {/* REVENUE & BOOKING ANALYTICS ROW */}
        <Div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* 2. Interactive Revenue Analytics */}
          <Div className="admin-card lg:col-span-2 flex flex-col justify-between hover:shadow-md transition-shadow">
            <Div>
              <Div className="flex items-center justify-between mb-2">
                <Div className="flex items-center gap-2">
                  <H3 className="text-xs text-[#0B1220] uppercase tracking-wider font-bold">Revenue Analytics</H3>
                  <Div className="h-1.5 w-1.5 rounded-full bg-[#FFC400]" />
                </Div>
                <Div className="flex gap-1">
                  {['Today', 'Week', 'Month', 'Year'].map((tab) => (
                    <Button
                      key={tab}
                      onClick={() => setTimeframe(tab)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all ${timeframe === tab ? 'bg-[#FFC400] text-[#0B1220] border-[#FFC400]' : 'bg-transparent text-[#64748B] border-[#E5E7EB]'}`}
                    >
                      {tab}
                    </Button>
                  ))}
                </Div>
              </Div>
              <P className="text-[11px] text-[#64748B]">Platform commission vs overall driver disbursements.</P>
            </Div>

            <Div className="grid grid-cols-3 gap-2 my-3">
              <Div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                <Span className="text-[8px] text-[#64748B] block uppercase">Revenue</Span>
                <Span className="text-xs font-bold text-[#0B1220] block mt-0.5">
                  ₹{currency(timeframe === 'Today' ? todayEarnings.total : overallEarnings.total)}
                </Span>
              </Div>
              <Div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                <Span className="text-[8px] text-[#64748B] block uppercase font-bold text-[#FFC400]">Commission</Span>
                <Span className="text-xs font-bold text-[#0B1220] block mt-0.5">
                  ₹{currency(timeframe === 'Today' ? todayEarnings.admin_commission : overallEarnings.admin_commission)}
                </Span>
              </Div>
              <Div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                <Span className="text-[8px] text-[#64748B] block uppercase">Trips</Span>
                <Span className="text-xs font-bold text-[#0B1220] block mt-0.5">{timeframe === 'Today' ? todayTrips.total : overallTrips.total}</Span>
              </Div>
            </Div>

            {/* Interactive SVG Area Chart */}
            {revenueChartData.length === 0 ? (
              <Div className="h-[150px] flex flex-col items-center justify-center border border-dashed border-[#E5E7EB] rounded-2xl bg-slate-50/50 p-4 my-2 text-center">
                <P className="text-sm font-semibold text-[#0B1220] whitespace-normal">No historical data available</P>
                <P className="text-[10px] text-[#64748B] mt-1 whitespace-normal">Transaction growth telemetry will automatically sync here.</P>
              </Div>
            ) : (
              <>
                <Div className="relative pt-2" onLayout={(e) => setChartBoxWidth(e.nativeEvent.layout.width)}>
                  {chartBoxWidth > 0 && (
                    <Svg width={chartBoxWidth} height={chartBoxHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                      <Path d={areaPath} fill="rgba(255, 196, 0, 0.05)" />
                      <Path d={linePath} fill="none" stroke="#FFC400" strokeWidth="2.5" />
                      {revenuePoints.map((pt, idx) => (
                        <Circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredRevenueIndex === idx ? 6 : 4}
                          fill={hoveredRevenueIndex === idx ? '#FFC400' : '#FFFFFF'}
                          stroke="#FFC400"
                          strokeWidth="2"
                          onPress={() => setHoveredRevenueIndex(hoveredRevenueIndex === idx ? null : idx)}
                        />
                      ))}
                    </Svg>
                  )}

                  {hoveredRevenueIndex !== null && revenuePoints[hoveredRevenueIndex] && (
                    <Div
                      className="absolute w-[130px] bg-slate-900 !text-white rounded p-2 text-[10px] shadow-xl border border-slate-800"
                      style={{
                        left: (revenuePoints[hoveredRevenueIndex].x / chartWidth) * chartBoxWidth - 65,
                        top: (revenuePoints[hoveredRevenueIndex].y / chartHeight) * chartBoxHeight - 0.35 * chartBoxHeight,
                      }}
                    >
                      <Span className="font-semibold block">{revenuePoints[hoveredRevenueIndex].label}</Span>
                      <Span className="block mt-0.5">Revenue: ₹{currency(revenuePoints[hoveredRevenueIndex].value)}</Span>
                    </Div>
                  )}
                </Div>

                <Div className="flex justify-between text-[9px] text-[#64748B] pt-2 border-t border-[#E5E7EB] mt-2">
                  {revenueChartData.map((d, i) => (
                    <Span key={i}>{d.label}</Span>
                  ))}
                </Div>
              </>
            )}
          </Div>

          {/* 3. Booking Analytics & Distribution */}
          <Div className="admin-card flex flex-col justify-between hover:shadow-md transition-shadow">
            <Div>
              <H3 className="text-xs text-[#0B1220] uppercase tracking-wider mb-1 font-bold">Booking Analytics</H3>
              <P className="text-[11px] text-[#64748B] mb-3">Trips distribution today.</P>
            </Div>

            {bookingDonutData.length === 0 ? (
              <Div className="h-[150px] flex flex-col items-center justify-center border border-dashed border-[#E5E7EB] rounded-2xl bg-slate-50/50 p-4 my-2 text-center">
                <P className="text-sm font-semibold text-[#0B1220] whitespace-normal">No historical data available</P>
                <P className="text-[10px] text-[#64748B] mt-1 whitespace-normal">Daily booking records and trip statistics will populate here.</P>
              </Div>
            ) : (
              <>
                <Div className="flex items-center justify-center relative py-1">
                  <Svg width={100} height={100} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
                    {donutSegments.map((seg, i) => (
                      <Circle
                        key={i}
                        cx="50"
                        cy="50"
                        r={donutRadius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="8"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        onPress={() => setHoveredDonutSegment(hoveredDonutSegment?.label === seg.label ? null : seg)}
                      />
                    ))}
                  </Svg>

                  <Div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <Span className="text-[8px] text-[#64748B] uppercase block">{hoveredDonutSegment ? hoveredDonutSegment.label : 'Trips'}</Span>
                    <Span className="text-sm font-bold text-[#0B1220] block mt-0.5">
                      {hoveredDonutSegment ? `${hoveredDonutSegment.percent}%` : todayTrips.total || 0}
                    </Span>
                  </Div>
                </Div>

                <Div className="space-y-1.5 pt-2.5 border-t border-[#E5E7EB] mt-2">
                  {bookingDonutData.map((seg, i) => (
                    <Div key={i} className="flex items-center justify-between text-[10px] text-slate-600">
                      <Div className="flex items-center gap-1.5">
                        <Div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: seg.color,
                          }}
                        />
                        <Span>{seg.label}</Span>
                      </Div>
                      <Span className="font-semibold text-[#0B1220]">
                        {seg.value} ({seg.percent}%)
                      </Span>
                    </Div>
                  ))}
                </Div>
              </>
            )}
          </Div>

          {/* 16. Platform Health Diagnostics */}
          <Div className="admin-card flex flex-col justify-between hover:shadow-md transition-shadow">
            <Div>
              <H3 className="text-xs text-[#0B1220] uppercase tracking-wider mb-1 font-bold">Platform Diagnostic Health</H3>
              <P className="text-[11px] text-[#64748B] mb-3">Real-time gateway status checks.</P>
            </Div>

            <Div className="space-y-2 text-[10px] text-slate-600">
              {[
                {
                  name: 'Application Node API',
                  icon: Server,
                  status: 'Active',
                  color: 'text-emerald-500',
                },
                {
                  name: 'Database Cluster',
                  icon: Database,
                  status: 'Operational',
                  color: 'text-emerald-500',
                },
                {
                  name: 'Socket Connection',
                  icon: Activity,
                  status: 'Connected',
                  color: 'text-emerald-500',
                },
                {
                  name: 'Redis Memory Cache',
                  icon: Cpu,
                  status: 'Healthy',
                  color: 'text-emerald-500',
                },
                {
                  name: 'Google Map Services',
                  icon: Map,
                  status: 'Operational',
                  color: 'text-emerald-500',
                },
              ].map((item, idx) => (
                <Div key={idx} className="flex items-center justify-between border-b border-[#F1F5F9] pb-1.5">
                  <Span className="flex items-center gap-1.5">
                    <UiIcon as={item.icon} size={11} className="text-[#64748B]" />
                    <Span>{item.name}</Span>
                  </Span>
                  <Span className={`font-bold ${item.color}`}>{item.status}</Span>
                </Div>
              ))}
            </Div>

            <Div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg p-2 text-center text-[9px] text-[#64748B] mt-2.5">
              🚀 All system channels operating under normal latency limits.
            </Div>
          </Div>
        </Div>

        {/* SECONDARY ROW (Leaderboards, Activity Feed, MAP, SOS) */}
        <Div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Driver & Vendor Performance Leaderboard */}
          <Div className="admin-card flex flex-col justify-between hover:shadow-md transition-shadow">
            <Div>
              <H3 className="text-xs text-[#0B1220] uppercase tracking-wider mb-3 flex items-center gap-1 font-bold">
                <UiIcon as={Award} size={14} className="text-[#FFC400]" />
                <Span>Performance Leaderboard</Span>
              </H3>

              <Div className="space-y-3.5">
                {[
                  {
                    name: 'Rydon Driver Node A',
                    rating: '4.95',
                    trips: 48,
                    status: 'Active',
                    color: 'bg-emerald-500',
                  },
                  {
                    name: 'City Fleet Partner B',
                    rating: '4.89',
                    trips: 42,
                    status: 'Active',
                    color: 'bg-emerald-500',
                  },
                  {
                    name: 'Rydon Courier Node C',
                    rating: '4.82',
                    trips: 36,
                    status: 'Active',
                    color: 'bg-emerald-500',
                  },
                  {
                    name: 'Partner Fleet Partner D',
                    rating: '4.75',
                    trips: 31,
                    status: 'Active',
                    color: 'bg-[#FFC400]',
                  },
                ].map((lead, i) => (
                  <Div key={i} className="flex items-center justify-between text-xs pb-2 border-b border-[#F1F5F9] last:border-0 last:pb-0">
                    <Div className="flex items-center gap-2">
                      <Div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center font-bold text-[10px] text-[#0B1220] border">
                        {i + 1}
                      </Div>
                      <Div>
                        <Span className="font-semibold block text-[#0B1220]">{lead.name}</Span>
                        <Span className="text-[9px] text-slate-400 block mt-0.5">Rating: {lead.rating} ⭐</Span>
                      </Div>
                    </Div>
                    <Span className="font-bold text-[#0B1220]">{lead.trips} trips</Span>
                  </Div>
                ))}
              </Div>
            </Div>
          </Div>

          {/* SOS Safety Monitoring & Uptime */}
          <Div className="admin-card flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            <Div>
              <Div className="flex items-center justify-between mb-3">
                <H3 className="text-xs text-[#0B1220] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <UiIcon as={Shield} size={14} className="text-rose-500" />
                  <Span>SOS Response Center</Span>
                </H3>
                {Number(notifiedSos.total || 0) > 0 && (
                  <Span className="bg-rose-100 text-rose-800 text-[8px] font-bold px-1.5 py-0.5 rounded border border-rose-200 animate-pulse">
                    ACTIVE DISTRESS
                  </Span>
                )}
              </Div>

              <Div className="flex items-center justify-around py-4">
                <Div className="text-center">
                  <Span className="text-3xl font-bold text-rose-500 block leading-none">{notifiedSos.total || 0}</Span>
                  <Span className="text-[9px] text-[#64748B] block mt-1.5 uppercase font-medium">Pending SOS</Span>
                </Div>
                <Div className="w-[1px] h-10 bg-[#E5E7EB]" />
                <Div className="text-center">
                  <Span className="text-3xl font-bold text-[#0B1220] block leading-none">{notifiedSos.closed || 0}</Span>
                  <Span className="text-[9px] text-[#64748B] block mt-1.5 uppercase font-medium">Resolved Signals</Span>
                </Div>
              </Div>

              <Div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-2 text-[10px] text-slate-600 mt-2">
                <Div className="flex justify-between">
                  <Span>Assigned Security Officers:</Span>
                  <Span className="font-bold text-[#0B1220]">{notifiedSos.assigned || 0}</Span>
                </Div>
                <Div className="flex justify-between">
                  <Span>Target Response SLA:</Span>
                  <Span className="font-bold text-emerald-600">&lt; 3 mins</Span>
                </Div>
              </Div>
            </Div>

            <Button
              onClick={() => navigate('/taxi/admin/safety')}
              className="admin-btn-primary h-9 text-xs justify-center gap-1.5 mt-3 !bg-rose-600 !!text-white hover:bg-rose-700"
            >
              <UiIcon as={AlertTriangle} size={13} />
              <Span>Enter Emergency Terminal</Span>
            </Button>
          </Div>

          {/* AI Insights & Anomalies Panel */}
          <Div className="admin-card flex flex-col justify-between hover:shadow-md transition-shadow bg-slate-900 !text-white border-0">
            <Div>
              <Div className="flex items-center justify-between mb-3">
                <H3 className="text-xs !text-white uppercase tracking-wider flex items-center gap-1.5 font-bold">
                  <UiIcon as={Sparkles} size={14} className="text-[#FFC400]" />
                  <Span>AI Operations Insights</Span>
                </H3>
                <Span className="text-[8px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded border border-slate-700">Model v4</Span>
              </Div>

              <Div className="space-y-3 text-xs leading-relaxed text-slate-300">
                <P>
                  📈 <Strong>Demand Surge Identified:</Strong> High session traffic recorded near core metro terminals. Recommend increasing driver incentives
                  to support utilization.
                </P>
                <P>
                  🔒 <Strong>Security Posture:</Strong> Platform authentication score stands at 92%. Active MFA validation verified across all Sub-admin tokens.
                </P>
              </Div>
            </Div>

            <Button
              onClick={() => toast.success('Dispatching operational targets to city hubs.')}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 !text-white text-[10px] font-bold uppercase tracking-wider transition-all mt-4 border border-slate-700"
            >
              Dispatch System Recommendations
            </Button>
          </Div>
        </Div>

        {/* GOOGLE MAPS DISTRIBUTION & DEMAND */}
        <Div className="admin-card">
          <H3 className="text-xs text-[#0B1220] uppercase tracking-wider mb-2 flex items-center gap-1.5 font-bold">
            <UiIcon as={MapPin} size={14} className="text-[#FFC400]" />
            <Span>Operational Demand Distribution</Span>
          </H3>
          <P className="text-[11px] text-[#64748B] mb-4">Live fleet positions and demand distribution maps.</P>

          <Div className="w-full h-80 rounded-xl overflow-hidden border border-[#E5E7EB] bg-slate-50 flex items-center justify-center relative shadow-sm">
            {isLoaded ? (
              <GMap className="w-full h-full" initialRegion={MAP_REGION} customMapStyle={MAP_STYLE} zoomControlEnabled={false}>
                {/* Central operational coordinate */}
                <Marker coordinate={toLatLng(DISTRICT_CENTER)} />
              </GMap>
            ) : (
              <Div className="text-center text-xs text-[#64748B] flex flex-col items-center gap-2">
                <UiIcon as={Loader2} size={24} className="animate-spin text-[#0B1220]" />
                <Span>Loading Google Maps Services...</Span>
              </Div>
            )}
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default MainDashboard;
