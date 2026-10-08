/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/geo/GodsEye.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GMap, Heatmap, Marker } from '../../../../../components/maps';
import {
  Search,
  Filter,
  Activity,
  Users,
  Car,
  AlertTriangle,
  IndianRupee,
  Clock,
  Map as MapIcon,
  X,
  Maximize,
  Minimize,
  Crosshair,
  Layers,
  Flame,
  Navigation,
  ArrowLeft,
  RefreshCw,
  Battery,
  Gauge,
  MapPin,
  Phone,
  User as UserIcon,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { useBaseGoogleMapsLoader, HAS_VALID_GOOGLE_MAPS_KEY } from '../../utils/googleMaps';
import { adminService } from '../../services/adminService';
import CarIcon from '../../../../assets/icons/car.png';
import BikeIcon from '../../../../assets/icons/bike.png';
import AutoIcon from '../../../../assets/icons/auto.png';
import { Button, Div, H1, H2, H3, H4, Hr, HScroll, Img, Input, Label, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';

const DISTRICT_CENTER = {
  lat: 22.7196,
  lng: 75.8577,
};
const mapOptions = {
  disableDefaultUI: true,
  // we build our own floating controls
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      elementType: 'geometry',
      stylers: [
        {
          color: '#f5f5f5',
        },
      ],
    },
    {
      elementType: 'labels.icon',
      stylers: [
        {
          visibility: 'off',
        },
      ],
    },
    {
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#616161',
        },
      ],
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [
        {
          color: '#f5f5f5',
        },
      ],
    },
    {
      featureType: 'administrative.land_parcel',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#bdbdbd',
        },
      ],
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [
        {
          color: '#eeeeee',
        },
      ],
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#757575',
        },
      ],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [
        {
          color: '#ffffff',
        },
      ],
    },
    {
      featureType: 'road.arterial',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#757575',
        },
      ],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [
        {
          color: '#dadada',
        },
      ],
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#616161',
        },
      ],
    },
    {
      featureType: 'road.local',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#9e9e9e',
        },
      ],
    },
    {
      featureType: 'transit.line',
      elementType: 'geometry',
      stylers: [
        {
          color: '#e5e5e5',
        },
      ],
    },
    {
      featureType: 'transit.station',
      elementType: 'geometry',
      stylers: [
        {
          color: '#eeeeee',
        },
      ],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [
        {
          color: '#c9c9c9',
        },
      ],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#9e9e9e',
        },
      ],
    },
  ],
};
const getMapIconForVehicle = (iconType = '') => {
  const value = String(iconType || '')
    .trim()
    .toLowerCase();
  if (value.includes('bike')) return BikeIcon;
  if (value.includes('auto')) return AutoIcon;
  return CarIcon;
};
const hasUsableCoordinates = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
};

// Generic white/black/yellow/grey theme classes
const btnClass = 'flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors border shadow-sm';
const btnPrimary = `${btnClass} bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-500`;
const btnSecondary = `${btnClass} bg-white text-slate-800 border-slate-200 hover:bg-slate-50`;
const GodsEye = () => {
  const navigate = useNavigate();
  const { isLoaded, loadError } = useBaseGoogleMapsLoader();
  const mapRef = useRef(null);

  // Data States
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dashboardData, setDashboardData] = useState({});
  const [earningsData, setEarningsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    // all, online, offline, busy, idle
    vehicleType: 'all',
    serviceType: 'all',
    city: 'all',
    zone: 'all',
    refreshMode: '30', // seconds, 'manual'
  });

  // Map Controls State
  const [controls, setControls] = useState({
    traffic: false,
    heatmap: false,
    cluster: true,
    autoFollow: false,
    fullscreen: false,
  });

  // Selection
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Fetch Logic
  const fetchMapData = useCallback(async () => {
    setLoading(true);
    try {
      const [drvRes, ridesRes, alertsRes, dashRes, earnRes] = await Promise.allSettled([
        adminService.getDrivers(1, 1000, {}).catch(() => ({
          data: {
            results: [],
          },
        })),
        adminService.getOngoingRides().catch(() => ({
          data: {
            results: [],
          },
        })),
        adminService.getSafetyAlerts().catch(() => ({
          data: {
            results: [],
          },
        })),
        adminService.getDashboardData().catch(() => ({
          data: {},
        })),
        adminService.getTodayEarnings().catch(() => ({
          data: {},
        })),
      ]);
      const drvList = drvRes.status === 'fulfilled' ? drvRes.value?.data?.results || drvRes.value?.data || [] : [];
      const ridesList = ridesRes.status === 'fulfilled' ? ridesRes.value?.data?.results || ridesRes.value?.data || [] : [];
      const alertsList = alertsRes.status === 'fulfilled' ? alertsRes.value?.data?.results || alertsRes.value?.data || [] : [];
      setDrivers(Array.isArray(drvList) ? drvList : []);
      setRides(Array.isArray(ridesList) ? ridesList : []);
      setAlerts(Array.isArray(alertsList) ? alertsList : []);
      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value?.data || {});
      if (earnRes.status === 'fulfilled') setEarningsData(earnRes.value?.data || {});
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to fetch Gods Eye data', error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);
  useEffect(() => {
    if (filters.refreshMode === 'manual') return;
    const seconds = parseInt(filters.refreshMode, 10);
    if (!isNaN(seconds) && seconds > 0) {
      const interval = setInterval(fetchMapData, seconds * 1000);
      return () => clearInterval(interval);
    }
  }, [filters.refreshMode, fetchMapData]);

  /*
   * The web asks the browser for fullscreen (document.requestFullscreen) and
   * mirrors it into controls.fullscreen. There is no browser chrome here, so
   * the button toggles the same flag directly — it still hides the page's own
   * back button and swaps the icon, as on the web.
   */
  const toggleFullscreen = () => {
    setControls((prev) => ({
      ...prev,
      fullscreen: !prev.fullscreen,
    }));
  };

  // Derived Data
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      if (!hasUsableCoordinates(d.latitude, d.longitude)) return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          String(d.name || '')
            .toLowerCase()
            .includes(q) ||
          String(d.phone || '')
            .toLowerCase()
            .includes(q) ||
          String(d.vehicle_number || '')
            .toLowerCase()
            .includes(q);
        if (!match) return false;
      }

      // Status
      if (filters.status !== 'all') {
        const isOnline = Boolean(d.isOnline);
        const isBusy = Boolean(d.isOnRide);
        if (filters.status === 'online' && !isOnline) return false;
        if (filters.status === 'offline' && isOnline) return false;
        if (filters.status === 'busy' && !isBusy) return false;
        if (filters.status === 'idle' && (!isOnline || isBusy)) return false;
      }

      // Vehicle Type
      if (filters.vehicleType !== 'all') {
        const vt = String(d.vehicle_icon_type || d.vehicle_type || d.transport_type || '').toLowerCase();
        if (!vt.includes(filters.vehicleType)) return false;
      }

      // Service Type, City, Zone (Assuming fields exist, simplified matching)
      if (filters.city !== 'all' && d.city !== filters.city) return false;
      if (filters.zone !== 'all' && d.zone_name !== filters.zone) return false;
      return true;
    });
  }, [drivers, filters, searchQuery]);

  // Timelines
  const timelineEvents = useMemo(() => {
    const events = [];
    rides.forEach((r) => {
      if (r.createdAt) {
        events.push({
          id: `r-${r._id}`,
          time: new Date(r.createdAt),
          type: 'Trip Started',
          desc: `Trip ${r._id?.slice(-4)} started.`,
          icon: <UiIcon as={Activity} size={14} />,
          color: 'text-yellow-600',
        });
      }
    });
    alerts.forEach((a) => {
      if (a.createdAt) {
        events.push({
          id: `a-${a._id}`,
          time: new Date(a.createdAt),
          type: 'SOS Alert',
          desc: `Emergency alert from ${a.user?.name || 'User'}`,
          icon: <UiIcon as={AlertTriangle} size={14} />,
          color: 'text-red-500',
        });
      }
    });
    return events.sort((a, b) => b.time - a.time).slice(0, 50); // Most recent 50
  }, [rides, alerts]);

  // Metrics (Derived or from dashboardData)
  const metrics = {
    online: drivers.filter((d) => d.isOnline).length,
    offline: drivers.filter((d) => !d.isOnline).length,
    busy: drivers.filter((d) => d.isOnRide).length,
    idle: drivers.filter((d) => d.isOnline && !d.isOnRide).length,
    liveTrips: rides.length,
    sos: alerts.filter((a) => a.status === 'active').length,
    revenue: earningsData?.today || 0,
    tripsToday: dashboardData?.totalTripsToday || 0,
  };
  const handleMarkerClick = useCallback(
    (driver) => {
      setSelectedDriver(driver);
      if (mapRef.current && controls.autoFollow) {
        mapRef.current.animateCamera({
          center: {
            latitude: Number(driver.latitude),
            longitude: Number(driver.longitude),
          },
        });
      }
    },
    [controls.autoFollow],
  );
  const recenterMap = () => {
    if (mapRef.current && filteredDrivers.length > 0) {
      mapRef.current.animateCamera({
        center: {
          latitude: Number(filteredDrivers[0].latitude),
          longitude: Number(filteredDrivers[0].longitude),
        },
        zoom: 12,
      });
    }
  };
  const mapCenter =
    filteredDrivers.length > 0 && controls.autoFollow && selectedDriver
      ? {
          lat: Number(selectedDriver.latitude),
          lng: Number(selectedDriver.longitude),
        }
      : filteredDrivers.length > 0
        ? {
            lat: Number(filteredDrivers[0].latitude),
            lng: Number(filteredDrivers[0].longitude),
          }
        : DISTRICT_CENTER;
  return (
    <Div className={`flex flex-col h-screen bg-gray-50 font-sans ${controls.fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* TOP NAVIGATION / KPI STRIP */}
      <Div className="bg-white border-b border-gray-200 px-3 py-1.5 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
        <Div className="flex items-center gap-3">
          {!controls.fullscreen && (
            <Button onClick={() => navigate('/taxi/admin/dashboard')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <UiIcon as={ArrowLeft} size={18} />
            </Button>
          )}
          <Div>
            <H1 className="text-base font-bold text-gray-900">God&apos;s Eye Dashboard</H1>
            <P className="text-xs font-semibold text-gray-500">
              Live Fleet Monitoring{' '}
              {lastSync &&
                ` • Synced ${lastSync.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}`}
            </P>
          </Div>
        </Div>

        {/* Dynamic Metrics Strip */}
        <Div className="hidden lg:flex items-center gap-4">
          <Div className="flex flex-col items-end">
            <Span className="text-[9px] font-bold text-gray-500 uppercase">Online</Span>
            <Span className="text-xs font-black text-black">{metrics.online}</Span>
          </Div>
          <Div className="flex flex-col items-end">
            <Span className="text-[9px] font-bold text-gray-500 uppercase">Busy / Idle</Span>
            <Span className="text-xs font-black text-black">
              <Span className="text-yellow-600">{metrics.busy}</Span> / {metrics.idle}
            </Span>
          </Div>
          <Div className="flex flex-col items-end">
            <Span className="text-[9px] font-bold text-gray-500 uppercase">Live Trips</Span>
            <Span className="text-xs font-black text-black">{metrics.liveTrips}</Span>
          </Div>
          <Div className="flex flex-col items-end">
            <Span className="text-[9px] font-bold text-gray-500 uppercase">SOS Alerts</Span>
            <Span className={`text-xs font-black ${metrics.sos > 0 ? 'text-red-500 animate-pulse' : 'text-black'}`}>{metrics.sos}</Span>
          </Div>
          <Div className="flex flex-col items-end">
            <Span className="text-[9px] font-bold text-gray-500 uppercase">Revenue (Today)</Span>
            <Span className="text-xs font-black text-black">₹{metrics.revenue.toLocaleString()}</Span>
          </Div>
        </Div>
      </Div>

      {/* MAIN CONTENT SPLIT */}
      <Div className="flex flex-col flex-1 relative">
        {/* LEFT SIDEBAR - FILTERS */}
        <ScrollDiv className="w-full max-h-[280px] bg-white border-b border-gray-200 p-3 flex flex-col gap-3 z-10 flex-shrink-0">
          {/* Search */}
          <Div className="relative">
            <UiIcon as={Search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-all placeholder:text-gray-400 text-black font-medium"
            />
          </Div>

          <Hr className="border-gray-100" />

          {/* Filter Group */}
          <Div className="space-y-3">
            <Div>
              <Label className="block text-xs font-semibold capitalize text-gray-500 mb-1">Driver Status</Label>
              <Select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-black outline-none focus:border-yellow-400"
              >
                <Option value="all">All Drivers</Option>
                <Option value="online">Online Only</Option>
                <Option value="offline">Offline Only</Option>
                <Option value="busy">Busy (On Trip)</Option>
                <Option value="idle">Idle (Waiting)</Option>
              </Select>
            </Div>

            <Div>
              <Label className="block text-xs font-semibold capitalize text-gray-500 mb-1">Vehicle Type</Label>
              <Select
                value={filters.vehicleType}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    vehicleType: e.target.value,
                  }))
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-black outline-none focus:border-yellow-400"
              >
                <Option value="all">All Types</Option>
                <Option value="car">Car (Taxi)</Option>
                <Option value="bike">Bike</Option>
                <Option value="auto">Auto</Option>
              </Select>
            </Div>

            <Div>
              <Label className="block text-xs font-semibold capitalize text-gray-500 mb-1">Refresh Mode</Label>
              <Select
                value={filters.refreshMode}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    refreshMode: e.target.value,
                  }))
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-black outline-none focus:border-yellow-400"
              >
                <Option value="15">Every 15s</Option>
                <Option value="30">Every 30s</Option>
                <Option value="60">Every 1m</Option>
                <Option value="300">Every 5m</Option>
                <Option value="manual">Manual</Option>
              </Select>
            </Div>
          </Div>

          <Div className="mt-auto space-y-2 pt-4">
            <Button onClick={fetchMapData} className={btnPrimary + ' w-full'}>
              <UiIcon as={RefreshCw} size={14} className={loading ? 'animate-spin' : ''} />
              Force Refresh
            </Button>
            <Button
              onClick={() =>
                setFilters({
                  status: 'all',
                  vehicleType: 'all',
                  serviceType: 'all',
                  city: 'all',
                  zone: 'all',
                  refreshMode: '30',
                })
              }
              className={btnSecondary + ' w-full'}
            >
              Reset Filters
            </Button>
          </Div>
        </ScrollDiv>

        {/* MAP CANVAS */}
        <Div className="flex-1 relative bg-gray-200 flex flex-col">
          {/* FLOATING MAP CONTROLS */}
          <Div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <Button
              onClick={() =>
                setControls((c) => ({
                  ...c,
                  cluster: !c.cluster,
                }))
              }
              className={`p-2.5 rounded-lg shadow-md transition-colors ${controls.cluster ? 'bg-yellow-400 text-black' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <UiIcon as={Layers} size={18} />
            </Button>
            <Button
              onClick={() =>
                setControls((c) => ({
                  ...c,
                  traffic: !c.traffic,
                }))
              }
              className={`p-2.5 rounded-lg shadow-md transition-colors ${controls.traffic ? 'bg-yellow-400 text-black' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <UiIcon as={Navigation} size={18} />
            </Button>
            <Button
              onClick={() =>
                setControls((c) => ({
                  ...c,
                  heatmap: !c.heatmap,
                }))
              }
              className={`p-2.5 rounded-lg shadow-md transition-colors ${controls.heatmap ? 'bg-yellow-400 text-black' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <UiIcon as={Flame} size={18} />
            </Button>
            <Button
              onClick={() =>
                setControls((c) => ({
                  ...c,
                  autoFollow: !c.autoFollow,
                }))
              }
              className={`p-2.5 rounded-lg shadow-md transition-colors ${controls.autoFollow ? 'bg-yellow-400 text-black' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <UiIcon as={Crosshair} size={18} />
            </Button>
          </Div>

          <Div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <Button onClick={toggleFullscreen} className="p-2.5 bg-white text-gray-600 hover:bg-gray-50 rounded-lg shadow-md transition-colors">
              {controls.fullscreen ? <UiIcon as={Minimize} size={18} /> : <UiIcon as={Maximize} size={18} />}
            </Button>
            <Button onClick={recenterMap} className="p-2.5 bg-white text-gray-600 hover:bg-gray-50 rounded-lg shadow-md transition-colors">
              <UiIcon as={MapPin} size={18} />
            </Button>
          </Div>

          {/* Google Map */}
          <Div className="flex-1 w-full h-[420px] relative">
            {loadError ? (
              <Div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-red-500 font-bold uppercase tracking-widest text-sm">
                Map Load Error
              </Div>
            ) : HAS_VALID_GOOGLE_MAPS_KEY && isLoaded ? (
              <GMap
                ref={mapRef}
                className="w-full h-[420px]"
                customMapStyle={mapOptions.styles}
                initialRegion={{
                  latitude: mapCenter.lat,
                  longitude: mapCenter.lng,
                  latitudeDelta: 0.08,
                  longitudeDelta: 0.08,
                }}
                showsTraffic={controls.traffic}
                showsPointsOfInterest={false}
                onPress={() => setSelectedDriver(null)}
              >
                {controls.heatmap && (
                  <Heatmap
                    points={filteredDrivers.map((d) => ({
                      latitude: Number(d.latitude),
                      longitude: Number(d.longitude),
                      weight: 1,
                    }))}
                    radius={40}
                    opacity={0.6}
                  />
                )}

                {!controls.heatmap &&
                  filteredDrivers.map((driver) => (
                    <Marker
                      key={driver._id || driver.id}
                      coordinate={{
                        latitude: Number(driver.latitude),
                        longitude: Number(driver.longitude),
                      }}
                      onPress={() => handleMarkerClick(driver)}
                      anchor={{ x: 0.5, y: 0.5 }}
                      image={getMapIconForVehicle(driver.vehicle_icon_type || driver.vehicle_type)}
                    />
                  ))}
              </GMap>
            ) : (
              <Div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
                <UiIcon as={MapIcon} size={48} className="text-gray-300 mb-4" />
                <P className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Map Offline</P>
              </Div>
            )}

            {/* Empty State Overlay */}
            {filteredDrivers.length === 0 && !loading && (
              <Div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <Div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-xl border border-gray-200 flex flex-col items-center text-center max-w-sm">
                  <Div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3">
                    <UiIcon as={Car} size={24} />
                  </Div>
                  <H3 className="text-base font-black text-black mb-1">No live fleet available</H3>
                  <P className="text-xs text-gray-500 font-medium">Waiting for GPS updates or adjust your filters.</P>
                </Div>
              </Div>
            )}
          </Div>

          {/* BOTTOM TIMELINE */}
          <Div className="h-36 bg-white border-t border-gray-200 flex flex-col flex-shrink-0 z-10">
            <Div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <H3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Real-Time Event Timeline</H3>
              <Span className="text-[10px] font-bold text-gray-400">{timelineEvents.length} Recent Events</Span>
            </Div>
            <HScroll className="flex-1 p-3 flex items-start gap-3">
              {timelineEvents.length === 0 ? (
                <Div className="flex w-full h-full items-center justify-center text-[10px] text-gray-400 font-medium">No recent events logged.</Div>
              ) : (
                timelineEvents.map((evt) => (
                  <Div key={evt.id} className="inline-flex flex-col min-w-[180px] bg-gray-50 border border-gray-100 rounded-lg p-2 shadow-sm">
                    <Div className="flex items-center gap-2 mb-2">
                      <Div className={`p-1.5 bg-white rounded-lg shadow-sm ${evt.color}`}>{evt.icon}</Div>
                      <Div>
                        <P className="text-xs font-black text-black">{evt.type}</P>
                        <P className="text-[9px] text-gray-500 font-bold">{evt.time.toLocaleTimeString()}</P>
                      </Div>
                    </Div>
                    <P className="text-[10px] text-gray-600 font-medium whitespace-normal leading-tight">{evt.desc}</P>
                  </Div>
                ))
              )}
            </HScroll>
          </Div>
        </Div>

        {/* RIGHT DRAWER - SELECTED MARKER */}
        {selectedDriver && (
          <Div className="w-72 bg-white border-l border-gray-200 flex flex-col z-20 shadow-2xl flex-shrink-0 absolute right-0 top-0 bottom-0 lg:relative slide-in-from-right animate-in duration-300">
            {/* Drawer Header */}
            <Div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-yellow-400 text-black">
              <H2 className="text-xs font-black uppercase tracking-wider">Driver Telemetry</H2>
              <Button onClick={() => setSelectedDriver(null)} className="p-1 hover:bg-yellow-500 rounded-md transition-colors">
                <UiIcon as={X} size={16} />
              </Button>
            </Div>

            <ScrollDiv className="flex-1 p-3 space-y-4">
              {/* Driver Profile Summary */}
              <Div className="flex items-center gap-3">
                <Div className="w-14 h-14 bg-gray-100 rounded-full border-2 border-gray-200 overflow-hidden flex items-center justify-center text-gray-400 flex-shrink-0">
                  {selectedDriver.profile_image ? (
                    <Img src={selectedDriver.profile_image} alt={selectedDriver.name} className="w-full h-full object-cover" />
                  ) : (
                    <UiIcon as={UserIcon} size={24} />
                  )}
                </Div>
                <Div>
                  <H3 className="text-base font-black text-black leading-tight">{selectedDriver.name || 'Unknown Driver'}</H3>
                  <P className="text-xs text-gray-500 font-medium">{selectedDriver.phone || 'No Phone'}</P>
                  <Div className="flex items-center gap-1 mt-1">
                    {selectedDriver.isOnline ? (
                      <>
                        <UiIcon as={CheckCircle2} size={12} className="text-green-500" />
                        <Span className="text-[10px] font-bold text-green-600">ONLINE</Span>
                      </>
                    ) : (
                      <>
                        <UiIcon as={XCircle} size={12} className="text-gray-400" />
                        <Span className="text-[10px] font-bold text-gray-500">OFFLINE</Span>
                      </>
                    )}
                    {selectedDriver.isOnRide && <Span className="text-[10px] font-bold text-yellow-600 ml-1">• ON TRIP</Span>}
                  </Div>
                </Div>
              </Div>

              <Hr className="border-gray-100" />

              {/* Vehicle Info */}
              <Div className="space-y-2">
                <H4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Vehicle Information</H4>
                <Div className="bg-gray-50 rounded-lg p-2.5 flex flex-col gap-1.5 border border-gray-100">
                  <Div className="flex justify-between items-center">
                    <Span className="text-xs text-gray-500 font-medium">Model</Span>
                    <Span className="text-xs font-black text-black">{selectedDriver.vehicle_model || selectedDriver.vehicle_type || 'N/A'}</Span>
                  </Div>
                  <Div className="flex justify-between items-center">
                    <Span className="text-xs text-gray-500 font-medium">Number Plate</Span>
                    <Span className="text-xs font-black text-black bg-yellow-100 px-1.5 py-0.5 rounded">{selectedDriver.vehicle_number || 'N/A'}</Span>
                  </Div>
                  <Div className="flex justify-between items-center">
                    <Span className="text-xs text-gray-500 font-medium">City / Zone</Span>
                    <Span className="text-xs font-bold text-gray-700">{selectedDriver.city || selectedDriver.service_location_name || 'N/A'}</Span>
                  </Div>
                </Div>
              </Div>

              {/* Telemetry Stats */}
              <Div className="space-y-2">
                <H4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Live Telemetry</H4>
                <Div className="grid grid-cols-2 gap-2">
                  <Div className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center gap-2 shadow-sm">
                    <Div className="text-gray-400">
                      <UiIcon as={Gauge} size={16} />
                    </Div>
                    <Div>
                      <P className="text-[9px] font-bold text-gray-400 uppercase">Speed</P>
                      <P className="text-sm font-black text-black">
                        {selectedDriver.speed || '0'} <Span className="text-[10px]">km/h</Span>
                      </P>
                    </Div>
                  </Div>
                  <Div className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center gap-2 shadow-sm">
                    <Div className="text-gray-400">
                      <UiIcon as={Navigation} size={16} />
                    </Div>
                    <Div>
                      <P className="text-[9px] font-bold text-gray-400 uppercase">Heading</P>
                      <P className="text-sm font-black text-black">{selectedDriver.heading || 'N/A'}°</P>
                    </Div>
                  </Div>
                  <Div className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center gap-2 shadow-sm">
                    <Div className="text-gray-400">
                      <UiIcon as={MapPin} size={16} />
                    </Div>
                    <Div>
                      <P className="text-[9px] font-bold text-gray-400 uppercase">Accuracy</P>
                      <P className="text-sm font-black text-black">± {selectedDriver.accuracy || '5'}m</P>
                    </Div>
                  </Div>
                  <Div className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center gap-2 shadow-sm">
                    <Div className="text-gray-400">
                      <UiIcon as={Battery} size={16} />
                    </Div>
                    <Div>
                      <P className="text-[9px] font-bold text-gray-400 uppercase">Battery</P>
                      <P className="text-sm font-black text-black">{selectedDriver.battery || 'N/A'}</P>
                    </Div>
                  </Div>
                </Div>
              </Div>

              {/* Trip Info if on trip */}
              {selectedDriver.isOnRide && (
                <Div className="space-y-2">
                  <H4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-yellow-600">Active Trip</H4>
                  <Div className="bg-yellow-50 rounded-lg p-2.5 flex flex-col gap-1.5 border border-yellow-100">
                    <Div className="flex justify-between items-center">
                      <Span className="text-xs text-yellow-700 font-medium">Passenger</Span>
                      <Span className="text-xs font-black text-black">{selectedDriver.passenger_name || 'N/A'}</Span>
                    </Div>
                    <Div className="flex justify-between items-center">
                      <Span className="text-xs text-yellow-700 font-medium">Started</Span>
                      <Span className="text-xs font-black text-black">Just now</Span>
                    </Div>
                  </Div>
                </Div>
              )}
            </ScrollDiv>

            {/* Drawer Footer Actions */}
            <Div className="p-3 border-t border-gray-100 bg-gray-50 flex flex-col gap-2 mt-auto">
              <Button className={btnPrimary + ' w-full'}>
                <UiIcon as={Search} size={14} /> Locate Vehicle
              </Button>
              <Button
                onClick={() => navigate(`/taxi/admin/owner-management/manage-owners/${selectedDriver._id || selectedDriver.id}`)}
                className={btnSecondary + ' w-full'}
              >
                <UiIcon as={UserIcon} size={14} /> View Driver Profile
              </Button>
            </Div>
          </Div>
        )}
      </Div>
    </Div>
  );
};
export default GodsEye;
