/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/geo/GodsEye.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GMap, Heatmap, VehicleMarker } from '../../../../../components/maps';
import {
  Search,
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
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, HScroll, Img, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';

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

const GodsEye = () => {
  const navigate = useNavigate();
  const { tablet } = useLayoutWidth();
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
  const half = tablet ? 'flex-1' : '';
  const toggleBtn = (active) => `w-11 h-11 rounded-lg items-center justify-center ${active ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`;
  const toggleIcon = (active) => (active ? 'text-white' : 'text-slate-600');
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={MapIcon}
        title="God's Eye dashboard"
        subtitle={
          lastSync
            ? `Live fleet monitoring · synced ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            : 'Live fleet monitoring'
        }
        breadcrumb={[{ label: 'Taxi' }, { label: 'Geo' }, { label: "God's Eye" }]}
        actions={
          <>
            <Button onClick={fetchMapData} className={BTN_PRIMARY}>
              <UiIcon as={RefreshCw} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Force refresh</Span>
            </Button>
            {!controls.fullscreen ? (
              <Button onClick={() => navigate('/taxi/admin/dashboard')} className={BTN_SECONDARY}>
                <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Back</Span>
              </Button>
            ) : null}
          </>
        }
      />

      <StatGrid className="mb-4">
        <StatCard label="Online drivers" value={String(metrics.online)} icon={Users} tone="success" />
        <StatCard label="Busy / idle" value={`${metrics.busy} / ${metrics.idle}`} icon={Car} tone="info" />
        <StatCard label="Live trips" value={String(metrics.liveTrips)} icon={Activity} tone="info" />
        <StatCard label="SOS alerts" value={String(metrics.sos)} icon={ShieldAlert} tone={metrics.sos > 0 ? 'danger' : 'neutral'} />
        <StatCard label="Revenue today" value={`₹${metrics.revenue.toLocaleString()}`} icon={IndianRupee} tone="success" />
        <StatCard label="Trips today" value={String(metrics.tripsToday)} icon={Clock} tone="neutral" />
      </StatGrid>

      <Card className="mb-4 gap-3">
        <SectionTitle className="mb-0">Filters</SectionTitle>
        <Div className="flex-row items-center h-11 px-3 rounded-lg border border-slate-300 bg-white gap-2">
          <UiIcon as={Search} size={16} className="text-slate-400" />
          <Input
            type="text"
            placeholder="Search driver…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm text-slate-900"
          />
        </Div>

        <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
          <Field label="Driver status" className={half}>
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="all">All Drivers</Option>
              <Option value="online">Online Only</Option>
              <Option value="offline">Offline Only</Option>
              <Option value="busy">Busy (On Trip)</Option>
              <Option value="idle">Idle (Waiting)</Option>
            </Select>
          </Field>

          <Field label="Vehicle type" className={half}>
            <Select
              value={filters.vehicleType}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  vehicleType: e.target.value,
                }))
              }
              className={INPUT}
            >
              <Option value="all">All Types</Option>
              <Option value="car">Car (Taxi)</Option>
              <Option value="bike">Bike</Option>
              <Option value="auto">Auto</Option>
            </Select>
          </Field>
        </Div>

        <Field label="Refresh mode" hint="How often the live map re-reads driver positions.">
          <Select
            value={filters.refreshMode}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                refreshMode: e.target.value,
              }))
            }
            className={INPUT}
          >
            <Option value="15">Every 15s</Option>
            <Option value="30">Every 30s</Option>
            <Option value="60">Every 1m</Option>
            <Option value="300">Every 5m</Option>
            <Option value="manual">Manual</Option>
          </Select>
        </Field>

        <Toolbar className="mb-0">
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
            className={BTN_SECONDARY}
          >
            <Span className={BTN_TEXT_SECONDARY}>Reset filters</Span>
          </Button>
        </Toolbar>
      </Card>

      <Card className="mb-4 gap-3">
        <SectionTitle className="mb-0">Live map · {filteredDrivers.length} drivers</SectionTitle>

        <Toolbar className="mb-0">
          <Button
            onClick={() =>
              setControls((c) => ({
                ...c,
                cluster: !c.cluster,
              }))
            }
            accessibilityLabel="Toggle clustering"
            className={toggleBtn(controls.cluster)}
          >
            <UiIcon as={Layers} size={18} className={toggleIcon(controls.cluster)} />
          </Button>
          <Button
            onClick={() =>
              setControls((c) => ({
                ...c,
                traffic: !c.traffic,
              }))
            }
            accessibilityLabel="Toggle traffic layer"
            className={toggleBtn(controls.traffic)}
          >
            <UiIcon as={Navigation} size={18} className={toggleIcon(controls.traffic)} />
          </Button>
          <Button
            onClick={() =>
              setControls((c) => ({
                ...c,
                heatmap: !c.heatmap,
              }))
            }
            accessibilityLabel="Toggle heatmap"
            className={toggleBtn(controls.heatmap)}
          >
            <UiIcon as={Flame} size={18} className={toggleIcon(controls.heatmap)} />
          </Button>
          <Button
            onClick={() =>
              setControls((c) => ({
                ...c,
                autoFollow: !c.autoFollow,
              }))
            }
            accessibilityLabel="Toggle auto-follow"
            className={toggleBtn(controls.autoFollow)}
          >
            <UiIcon as={Crosshair} size={18} className={toggleIcon(controls.autoFollow)} />
          </Button>
          <Button onClick={toggleFullscreen} accessibilityLabel="Toggle fullscreen" className={toggleBtn(controls.fullscreen)}>
            <UiIcon as={controls.fullscreen ? Minimize : Maximize} size={18} className={toggleIcon(controls.fullscreen)} />
          </Button>
          <Button onClick={recenterMap} accessibilityLabel="Recenter map" className={toggleBtn(false)}>
            <UiIcon as={MapPin} size={18} className="text-slate-600" />
          </Button>
        </Toolbar>

        {loadError ? (
          <ErrorState
            className="border-0"
            title="Map failed to load"
            message="Check the maps key and whether the Maps API is enabled."
            onRetry={fetchMapData}
          />
        ) : HAS_VALID_GOOGLE_MAPS_KEY && isLoaded ? (
          <GMap
            ref={mapRef}
            className="w-full h-[360px] rounded-lg overflow-hidden"
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
                <VehicleMarker
                  key={driver._id || driver.id}
                  coordinate={{
                    latitude: Number(driver.latitude),
                    longitude: Number(driver.longitude),
                  }}
                  onPress={() => handleMarkerClick(driver)}
                  icon={getMapIconForVehicle(driver.vehicle_icon_type || driver.vehicle_type)}
                />
              ))}
          </GMap>
        ) : (
          <EmptyState className="border-0" icon={MapIcon} title="Map offline" message="The live map needs a Google Maps key to render." />
        )}

        {loading ? (
          <LoadingState label="Syncing fleet positions…" className="border-0" />
        ) : filteredDrivers.length === 0 ? (
          <EmptyState
            className="border-0"
            icon={Car}
            title="No live fleet available"
            message="Waiting for GPS updates, or adjust your filters."
            actionLabel="Force refresh"
            onAction={fetchMapData}
          />
        ) : null}
      </Card>

      <Card className="mb-4">
        <SectionTitle className="mb-3">Real-time event timeline · {timelineEvents.length}</SectionTitle>
        {timelineEvents.length === 0 ? (
          <EmptyState className="border-0" icon={Activity} title="No recent events" message="Trip starts and SOS alerts show up here as they happen." />
        ) : (
          <HScroll contentClassName="flex-row items-stretch gap-3">
            {timelineEvents.map((evt) => (
              <Div key={evt.id} className="w-[200px] bg-slate-50 border border-slate-200 rounded-lg p-3 gap-2">
                <Div className="flex-row items-center gap-2">
                  <Div className={`w-9 h-9 bg-white rounded-lg border border-slate-200 items-center justify-center ${evt.color}`}>{evt.icon}</Div>
                  <Div className="flex-1 min-w-0">
                    <Span className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                      {evt.type}
                    </Span>
                    <Span className="text-xs text-slate-500" numberOfLines={1}>
                      {evt.time.toLocaleTimeString()}
                    </Span>
                  </Div>
                </Div>
                <Span className="text-xs text-slate-500" numberOfLines={3}>
                  {evt.desc}
                </Span>
              </Div>
            ))}
          </HScroll>
        )}
      </Card>

      {selectedDriver && (
        <Card className="mb-4 gap-4">
          <Div className="flex-row items-center gap-3">
            <Span className="text-base font-semibold text-slate-900 flex-1">Driver telemetry</Span>
            <Button onClick={() => setSelectedDriver(null)} accessibilityLabel="Close driver telemetry" className="w-11 h-11 items-center justify-center">
              <UiIcon as={X} size={18} className="text-slate-600" />
            </Button>
          </Div>

          <Div className="flex-row items-center gap-3">
            <Div className="w-14 h-14 bg-slate-100 rounded-full border border-slate-200 overflow-hidden items-center justify-center shrink-0">
              {selectedDriver.profile_image ? (
                <Img src={selectedDriver.profile_image} alt={selectedDriver.name} className="w-full h-full" contentFit="cover" />
              ) : (
                <UiIcon as={UserIcon} size={24} className="text-slate-400" />
              )}
            </Div>
            <Div className="flex-1 min-w-0 gap-1">
              <Span className="text-base font-semibold text-slate-900" numberOfLines={1}>
                {selectedDriver.name || 'Unknown Driver'}
              </Span>
              <Div className="flex-row items-center gap-1.5">
                <UiIcon as={Phone} size={12} className="text-slate-400" />
                <Span className="text-sm text-slate-500" numberOfLines={1}>
                  {selectedDriver.phone || 'No Phone'}
                </Span>
              </Div>
              <Div className="flex-row flex-wrap items-center gap-2">
                <StatusBadge
                  status={selectedDriver.isOnline ? 'online' : 'offline'}
                  icon={selectedDriver.isOnline ? CheckCircle2 : XCircle}
                  label={selectedDriver.isOnline ? 'Online' : 'Offline'}
                />
                {selectedDriver.isOnRide ? <StatusBadge tone="warning" label="On trip" /> : null}
              </Div>
            </Div>
          </Div>

          <Div className="gap-2">
            <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vehicle information</Span>
            <Div className="bg-slate-50 rounded-lg p-3 gap-2 border border-slate-200">
              <Div className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-500">Model</Span>
                <Span className="text-sm font-semibold text-slate-900">{selectedDriver.vehicle_model || selectedDriver.vehicle_type || 'N/A'}</Span>
              </Div>
              <Div className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-500">Number plate</Span>
                <Span className="text-sm font-semibold text-slate-900">{selectedDriver.vehicle_number || 'N/A'}</Span>
              </Div>
              <Div className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-500">City / zone</Span>
                <Span className="text-sm font-semibold text-slate-900">{selectedDriver.city || selectedDriver.service_location_name || 'N/A'}</Span>
              </Div>
            </Div>
          </Div>

          <Div className="gap-2">
            <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live telemetry</Span>
            <StatGrid>
              <StatCard label="Speed" value={`${selectedDriver.speed || '0'} km/h`} icon={Gauge} tone="neutral" />
              <StatCard label="Heading" value={`${selectedDriver.heading || 'N/A'}°`} icon={Navigation} tone="neutral" />
              <StatCard label="Accuracy" value={`± ${selectedDriver.accuracy || '5'} m`} icon={MapPin} tone="neutral" />
              <StatCard label="Battery" value={String(selectedDriver.battery || 'N/A')} icon={Battery} tone="neutral" />
            </StatGrid>
          </Div>

          {selectedDriver.isOnRide && (
            <Div className="gap-2">
              <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active trip</Span>
              <Div className="bg-amber-100 rounded-lg p-3 gap-2 border border-amber-200">
                <Div className="flex-row items-center justify-between gap-3">
                  <Span className="text-sm text-slate-700">Passenger</Span>
                  <Span className="text-sm font-semibold text-slate-900">{selectedDriver.passenger_name || 'N/A'}</Span>
                </Div>
                <Div className="flex-row items-center justify-between gap-3">
                  <Span className="text-sm text-slate-700">Started</Span>
                  <Span className="text-sm font-semibold text-slate-900">Just now</Span>
                </Div>
              </Div>
            </Div>
          )}

          <Div className="gap-2">
            <Button className={BTN_PRIMARY}>
              <UiIcon as={Search} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Locate vehicle</Span>
            </Button>
            <Button
              onClick={() => navigate(`/taxi/admin/owner-management/manage-owners/${selectedDriver._id || selectedDriver.id}`)}
              className={BTN_SECONDARY}
            >
              <UiIcon as={UserIcon} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>View driver profile</Span>
            </Button>
          </Div>
        </Card>
      )}
    </AdminPage>
  );
};
export default GodsEye;
