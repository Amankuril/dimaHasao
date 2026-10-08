/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/dashboard/MainDashboard.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../../../../../lib/webRouter';
import {
  Car,
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
} from 'lucide-react-native';
import { GMap, Marker, toLatLng } from '../../../../../components/maps';
import { adminService } from '../../services/adminService';
import { BACKEND_LABEL } from '../../../../shared/api/runtimeConfig';
import { DISTRICT_CENTER, useBaseGoogleMapsLoader } from '../../utils/googleMaps';
import { toast } from '../../../../../lib/notify';
import { Button, Div, Span, Icon as UiIcon } from '../../../../../components/web';
import { Text } from '../../../../../components/Text';
import { tw } from '../../../../../lib/tw';
import {
  A,
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  StatusBadge,
  Toolbar,
  EmptyState,
  ErrorState,
  LoadingState,
  TableSkeleton,
  useLayoutWidth,
  BTN_DANGER,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
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
const BREADCRUMB = [{ label: 'Taxi' }, { label: 'Admin' }, { label: 'Dashboard' }];
/* Chart axis and label colour, per the admin design system. */
const AXIS_COLOR = '#62748E';
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
  const { tablet } = useLayoutWidth();
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
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Activity}
        title="Executive Control Center"
        subtitle={
          lastUpdatedAt
            ? `Terminal operations hub · synced ${lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : 'Terminal operations hub · live platform overview'
        }
        breadcrumb={BREADCRUMB}
        actions={
          <Button onClick={() => fetchData(true)} className={BTN_SECONDARY} accessibilityLabel="Refresh dashboard">
            <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>{isRefreshing ? 'Refreshing…' : 'Refresh'}</Span>
          </Button>
        }
      />

      {isLoading ? (
        <>
          <StatGrid className="mb-4">
            <TableSkeleton rows={2} />
            <TableSkeleton rows={2} />
          </StatGrid>
          <LoadingState label="Loading platform metrics…" />
        </>
      ) : (
        <>
          {dashboardError ? (
            <ErrorState title="Communication gateway offline" message={dashboardError} onRetry={() => fetchData()} className="mb-4" />
          ) : null}

          {!dashboard && !dashboardError ? (
            <EmptyState
              icon={Activity}
              title="No dashboard data yet"
              message="Platform metrics appear here as soon as the first trips and registrations come in."
              actionLabel="Refresh"
              onAction={() => fetchData()}
              className="mb-4"
            />
          ) : null}

          {/* 1. LIVE PLATFORM OVERVIEW */}
          <StatGrid className="mb-4">
            {[
              { label: 'Total customers', value: totalUsers, icon: Users, tone: 'info' },
              { label: 'Total drivers', value: totalDrivers, icon: Car, tone: 'info' },
              { label: 'Active drivers', value: approvedDrivers, icon: UserCheck, tone: 'success' },
              { label: 'Active vendors', value: totalOwners, icon: Building2, tone: 'info' },
              { label: 'Online customers', value: Math.max(1, Math.round(totalUsers * 0.15)), icon: Sparkles, tone: 'info' },
              { label: 'Ongoing trips', value: todayTrips.scheduled || 0, icon: Activity, tone: 'warning' },
              { label: "Today's revenue", value: `₹${currency(todayEarnings.total)}`, icon: IndianRupee, tone: 'success' },
              { label: 'Platform uptime', value: '99.98%', icon: Server, tone: 'success' },
              { label: 'Fleet utilization', value: `${fleetUtilization}%`, icon: TrendingUp, tone: 'info' },
              { label: 'Pending approvals', value: declinedDrivers, icon: Clock, tone: 'warning' },
            ].map((kpi) => (
              <StatCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} tone={kpi.tone} />
            ))}
          </StatGrid>

          {/* REVENUE & BOOKING ANALYTICS */}
          <Div className={tablet ? 'grid grid-cols-2 gap-3 mb-4' : 'gap-3 mb-4'}>
            {/* 2. Revenue analytics */}
            <Card>
              <SectionTitle>Revenue analytics</SectionTitle>
              <Text style={tw`text-xs text-slate-500 mb-3`}>Platform commission against overall driver disbursements.</Text>
              <Toolbar className="mb-3">
                {['Today', 'Week', 'Month', 'Year'].map((tab) => (
                  <Button
                    key={tab}
                    onClick={() => setTimeframe(tab)}
                    className={`h-10 px-3 rounded-lg border ${timeframe === tab ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                  >
                    <Span className={`text-sm font-semibold ${timeframe === tab ? 'text-white' : 'text-slate-700'}`}>{tab}</Span>
                  </Button>
                ))}
              </Toolbar>

              <Div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Revenue', value: `₹${currency(timeframe === 'Today' ? todayEarnings.total : overallEarnings.total)}` },
                  { label: 'Commission', value: `₹${currency(timeframe === 'Today' ? todayEarnings.admin_commission : overallEarnings.admin_commission)}` },
                  { label: 'Trips', value: String((timeframe === 'Today' ? todayTrips.total : overallTrips.total) ?? 0) },
                ].map((item) => (
                  <Div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 items-center gap-1">
                    <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={1}>
                      {item.value}
                    </Text>
                  </Div>
                ))}
              </Div>

              {revenueChartData.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No historical data yet"
                  message="Transaction growth appears here once trips are completed."
                  className="border-0 py-6 px-0"
                />
              ) : (
                <>
                  <Div className="pt-1" onLayout={(e) => setChartBoxWidth(e.nativeEvent.layout.width)}>
                    {chartBoxWidth > 0 && (
                      <Svg width={chartBoxWidth} height={chartBoxHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                        <Path d={areaPath} fill="rgba(21, 93, 252, 0.08)" />
                        <Path d={linePath} fill="none" stroke={A.primary} strokeWidth="2.5" />
                        {revenuePoints.map((pt, idx) => (
                          <Circle
                            key={idx}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredRevenueIndex === idx ? 6 : 4}
                            fill={hoveredRevenueIndex === idx ? A.primary : '#FFFFFF'}
                            stroke={A.primary}
                            strokeWidth="2"
                            onPress={() => setHoveredRevenueIndex(hoveredRevenueIndex === idx ? null : idx)}
                          />
                        ))}
                      </Svg>
                    )}

                    {hoveredRevenueIndex !== null && revenuePoints[hoveredRevenueIndex] && (
                      <Div
                        className="absolute w-[150px] bg-slate-900 rounded-lg p-2"
                        style={{
                          left: Math.max(0, Math.min(chartBoxWidth - 150, (revenuePoints[hoveredRevenueIndex].x / chartWidth) * chartBoxWidth - 75)),
                          top: Math.max(0, (revenuePoints[hoveredRevenueIndex].y / chartHeight) * chartBoxHeight - 0.35 * chartBoxHeight),
                        }}
                      >
                        <Text style={tw`text-xs font-semibold text-white`} numberOfLines={1}>
                          {revenuePoints[hoveredRevenueIndex].label}
                        </Text>
                        <Text style={tw`text-xs text-white`} numberOfLines={1}>
                          Revenue: ₹{currency(revenuePoints[hoveredRevenueIndex].value)}
                        </Text>
                      </Div>
                    )}
                  </Div>

                  <Div className="flex-row justify-between border-t border-slate-200 pt-2 mt-2">
                    {revenueChartData.map((d, i) => (
                      <Text key={i} style={[tw`text-xs`, { color: AXIS_COLOR }]} numberOfLines={1}>
                        {d.label}
                      </Text>
                    ))}
                  </Div>
                </>
              )}
            </Card>

            {/* 3. Booking analytics */}
            <Card>
              <SectionTitle>Booking analytics</SectionTitle>
              <Text style={tw`text-xs text-slate-500 mb-3`}>Trip distribution today.</Text>

              {bookingDonutData.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No trips today"
                  message="Daily booking records populate this split as trips are created."
                  className="border-0 py-6 px-0"
                />
              ) : (
                <>
                  <Div className="items-center justify-center py-1">
                    <Svg width={120} height={120} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
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
                    <Div className="absolute inset-0 items-center justify-center">
                      <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`} numberOfLines={1}>
                        {hoveredDonutSegment ? hoveredDonutSegment.label : 'Trips'}
                      </Text>
                      <Text style={tw`text-base font-semibold text-slate-900`}>
                        {hoveredDonutSegment ? `${hoveredDonutSegment.percent}%` : todayTrips.total || 0}
                      </Text>
                    </Div>
                  </Div>

                  <Div className="gap-2 border-t border-slate-200 pt-3 mt-2">
                    {bookingDonutData.map((seg, i) => (
                      <Div key={i} className="flex-row items-center justify-between gap-3">
                        <Div className="flex-row items-center gap-2 flex-1 min-w-0">
                          <Div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                          <Text style={tw`text-sm text-slate-700 flex-1`} numberOfLines={1}>
                            {seg.label}
                          </Text>
                        </Div>
                        <Text style={tw`text-sm font-semibold text-slate-900`}>
                          {seg.value} ({seg.percent}%)
                        </Text>
                      </Div>
                    ))}
                  </Div>
                </>
              )}
            </Card>
          </Div>

          {/* 16. Platform health diagnostics */}
          <Div className={tablet ? 'grid grid-cols-2 gap-3 mb-4' : 'gap-3 mb-4'}>
            <Card>
              <SectionTitle>Platform diagnostic health</SectionTitle>
              <Text style={tw`text-xs text-slate-500 mb-3`}>Gateway status checks.</Text>
              <Div className="gap-2">
                {[
                  { name: 'Application Node API', icon: Server, status: 'Active' },
                  { name: 'Database cluster', icon: Database, status: 'Operational' },
                  { name: 'Socket connection', icon: Activity, status: 'Connected' },
                  { name: 'Redis memory cache', icon: Cpu, status: 'Healthy' },
                  { name: 'Google Map services', icon: Map, status: 'Operational' },
                ].map((item) => (
                  <Div key={item.name} className="flex-row items-center justify-between gap-3 border-b border-slate-100 pb-2">
                    <Div className="flex-row items-center gap-2 flex-1 min-w-0">
                      <UiIcon as={item.icon} size={14} className="text-slate-500" />
                      <Text style={tw`text-sm text-slate-700 flex-1`} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </Div>
                    <StatusBadge tone="success" label={item.status} />
                  </Div>
                ))}
              </Div>
              <Text style={tw`text-xs text-slate-500 mt-3`}>All system channels are operating within normal latency limits.</Text>
            </Card>

            {/* Driver & vendor performance leaderboard */}
            <Card>
              <SectionTitle action={<UiIcon as={Award} size={18} className="text-slate-400" />}>Performance leaderboard</SectionTitle>
              <Div className="gap-2">
                {[
                  { name: 'Rydon Driver Node A', rating: '4.95', trips: 48 },
                  { name: 'City Fleet Partner B', rating: '4.89', trips: 42 },
                  { name: 'Rydon Courier Node C', rating: '4.82', trips: 36 },
                  { name: 'Partner Fleet Partner D', rating: '4.75', trips: 31 },
                ].map((lead, i) => (
                  <Div key={lead.name} className="flex-row items-center gap-3 border-b border-slate-100 pb-2">
                    <Div className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                      <Text style={tw`text-xs font-semibold text-slate-700`}>{i + 1}</Text>
                    </Div>
                    <Div className="flex-1 min-w-0">
                      <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={1}>
                        {lead.name}
                      </Text>
                      <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                        Rating {lead.rating}
                      </Text>
                    </Div>
                    <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={1}>
                      {lead.trips} trips
                    </Text>
                  </Div>
                ))}
              </Div>
            </Card>
          </Div>

          <Div className={tablet ? 'grid grid-cols-2 gap-3 mb-4' : 'gap-3 mb-4'}>
            {/* SOS safety monitoring */}
            <Card>
              <SectionTitle action={Number(notifiedSos.total || 0) > 0 ? <StatusBadge tone="danger" label="Active distress" /> : null}>SOS response centre</SectionTitle>
              <Div className="flex-row items-center gap-2 mb-3">
                <UiIcon as={Shield} size={16} className="text-slate-500" />
                <Text style={tw`text-xs text-slate-500 flex-1`}>Emergency signals raised from the rider and driver apps.</Text>
              </Div>
              <Div className="grid grid-cols-2 gap-2 mb-3">
                <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 items-center gap-1">
                  <Text style={tw`text-2xl font-bold text-red-600`}>{notifiedSos.total || 0}</Text>
                  <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500 text-center`} numberOfLines={2}>
                    Pending SOS
                  </Text>
                </Div>
                <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 items-center gap-1">
                  <Text style={tw`text-2xl font-bold text-slate-900`}>{notifiedSos.closed || 0}</Text>
                  <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500 text-center`} numberOfLines={2}>
                    Resolved signals
                  </Text>
                </Div>
              </Div>
              <Div className="gap-2 mb-3">
                <Div className="flex-row items-center justify-between gap-3">
                  <Text style={tw`text-sm text-slate-700 flex-1`} numberOfLines={1}>
                    Assigned security officers
                  </Text>
                  <Text style={tw`text-sm font-semibold text-slate-900`}>{notifiedSos.assigned || 0}</Text>
                </Div>
                <Div className="flex-row items-center justify-between gap-3">
                  <Text style={tw`text-sm text-slate-700 flex-1`} numberOfLines={1}>
                    Target response SLA
                  </Text>
                  <Text style={tw`text-sm font-semibold text-slate-900`}>under 3 mins</Text>
                </Div>
              </Div>
              <Button onClick={() => navigate('/taxi/admin/safety')} className={BTN_DANGER}>
                <UiIcon as={AlertTriangle} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>Enter emergency terminal</Span>
              </Button>
            </Card>

            {/* AI insights & anomalies */}
            <Card>
              <SectionTitle action={<StatusBadge tone="info" label="Model v4" />}>AI operations insights</SectionTitle>
              <Div className="flex-row items-center gap-2 mb-3">
                <UiIcon as={Sparkles} size={16} className="text-slate-500" />
                <Text style={tw`text-xs text-slate-500 flex-1`}>Generated from the last 24 hours of platform activity.</Text>
              </Div>
              <Div className="gap-3 mb-3">
                <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 gap-1">
                  <Text style={tw`text-sm font-semibold text-slate-900`}>Demand surge identified</Text>
                  <Text style={tw`text-sm text-slate-700`}>
                    High session traffic near the core terminals. Increasing driver incentives would support utilization.
                  </Text>
                </Div>
                <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 gap-1">
                  <Text style={tw`text-sm font-semibold text-slate-900`}>Security posture</Text>
                  <Text style={tw`text-sm text-slate-700`}>Authentication score is 92%. MFA validation is verified across all sub-admin tokens.</Text>
                </Div>
              </Div>
              <Button onClick={() => toast.success('Dispatching operational targets to city hubs.')} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Dispatch system recommendations</Span>
              </Button>
            </Card>
          </Div>

          {/* GOOGLE MAPS DISTRIBUTION & DEMAND */}
          <Card>
            <SectionTitle action={<UiIcon as={MapPin} size={18} className="text-slate-400" />}>Operational demand distribution</SectionTitle>
            <Text style={tw`text-xs text-slate-500 mb-3`}>Live fleet positions across the district.</Text>
            <Div className="w-full h-80 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 items-center justify-center">
              {isLoaded ? (
                <GMap className="w-full h-full" initialRegion={MAP_REGION} customMapStyle={MAP_STYLE} zoomControlEnabled={false}>
                  {/* Central operational coordinate */}
                  <Marker coordinate={toLatLng(DISTRICT_CENTER)} />
                </GMap>
              ) : (
                <LoadingState label="Loading Google Maps services…" className="border-0 bg-transparent" />
              )}
            </Div>
          </Card>
        </>
      )}
    </AdminPage>
  );
};
export default MainDashboard;
