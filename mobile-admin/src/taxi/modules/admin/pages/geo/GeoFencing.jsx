/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/geo/GeoFencing.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Crosshair,
  Layers,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useLocation } from '../../../../../lib/webRouter';
import { GMap, Marker, Polygon, regionFor, toLatLng as toMapCoord } from '../../../../../components/maps';
import { geocodeAPI } from '../../../../../api/geocode';
import { adminService } from '../../services/adminService';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader } from '../../utils/googleMaps';
import {
  AdminPage,
  StatusBadge,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  LoadingState,
  EmptyState,
  ErrorState,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
import { Button, Div, Input, Link, Span, Icon as UiIcon } from '../../../../../components/web';
const DEFAULT_CENTER = {
  lat: 22.7196,
  lng: 75.8577,
};
/*
 * The web passes fillOpacity / strokeOpacity next to the colour; react-native-maps
 * wants the alpha inside the colour, so fold it in.
 */
const withOpacity = (hex, opacity) => {
  const match = /^#([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!match) return hex;
  const int = parseInt(match[1], 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${opacity})`;
};
/* The web's DEFAULT_ZOOM of 12 as a region span. */
const DEFAULT_SPAN = 0.08;
const GEO_NAV_ITEMS = [
  {
    label: 'Heat Map',
    path: '/taxi/admin/geo/heatmap',
  },
  {
    label: "God's Eye",
    path: '/taxi/admin/geo/gods-eye',
  },
  {
    label: 'Peak Zone',
    path: '/taxi/admin/geo/peak-zone',
  },
];
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  streetViewControl: false,
  clickableIcons: false,
  styles: [
    {
      elementType: 'geometry',
      stylers: [
        {
          color: '#eef2ff',
        },
      ],
    },
    {
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#334155',
        },
      ],
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [
        {
          color: '#ffffff',
        },
      ],
    },
    {
      featureType: 'poi',
      stylers: [
        {
          visibility: 'off',
        },
      ],
    },
    {
      featureType: 'transit',
      stylers: [
        {
          visibility: 'off',
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
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [
        {
          color: '#c7d2fe',
        },
      ],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [
        {
          color: '#bfdbfe',
        },
      ],
    },
  ],
};
const zonePalette = [
  {
    fill: '#2563EB',
    stroke: '#1D4ED8',
    marker: '#2563EB',
  },
  {
    fill: '#F97316',
    stroke: '#EA580C',
    marker: '#F97316',
  },
  {
    fill: '#10B981',
    stroke: '#059669',
    marker: '#10B981',
  },
  {
    fill: '#E11D48',
    stroke: '#BE123C',
    marker: '#E11D48',
  },
  {
    fill: '#7C3AED',
    stroke: '#6D28D9',
    marker: '#7C3AED',
  },
];
const toLatLng = (point) => {
  if (Array.isArray(point) && point.length >= 2) {
    return {
      lat: Number(point[1]),
      lng: Number(point[0]),
    };
  }
  if (point && typeof point === 'object') {
    const lat = Number(point.lat ?? point.latitude);
    const lng = Number(point.lng ?? point.longitude ?? point.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        lat,
        lng,
      };
    }
  }
  return null;
};
const normalizeCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) {
    return [];
  }
  if (coordinates.length > 0 && Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
    return coordinates[0].map(toLatLng).filter(Boolean);
  }
  return coordinates.map(toLatLng).filter(Boolean);
};
const getPolygonCenter = (path) => {
  if (!path.length) {
    return DEFAULT_CENTER;
  }
  const total = path.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    {
      lat: 0,
      lng: 0,
    },
  );
  return {
    lat: total.lat / path.length,
    lng: total.lng / path.length,
  };
};
const formatZone = (zone, index) => {
  const coordinates = normalizeCoordinates(zone.coordinates);
  const center = coordinates.length ? getPolygonCenter(coordinates) : DEFAULT_CENTER;
  const palette = zonePalette[index % zonePalette.length];
  const isActive = zone.status === 1 || zone.status === 'active' || zone.active === true;
  return {
    id: zone._id || zone.id || `zone-${index}`,
    name: zone.name || zone.zone_name || 'Unnamed Zone',
    surge: Number(zone.surge_multiplier || zone.peak_zone_surge_percentage || 1).toFixed(1),
    status: isActive ? 'Active' : 'Inactive',
    type: zone.type || 'Main',
    center,
    coordinates,
    palette,
  };
};
const createFleetMarkers = (zones) =>
  zones.slice(0, 12).flatMap((zone, index) => {
    const offsetBase = (index % 4) * 0.006 + 0.004;
    return [
      {
        id: `${zone.id}-driver`,
        label: `Driver near ${zone.name}`,
        position: {
          lat: zone.center.lat + offsetBase,
          lng: zone.center.lng - offsetBase * 0.7,
        },
        kind: 'driver',
      },
      {
        id: `${zone.id}-rider`,
        label: `Demand in ${zone.name}`,
        position: {
          lat: zone.center.lat - offsetBase * 0.5,
          lng: zone.center.lng + offsetBase * 0.55,
        },
        kind: 'demand',
      },
    ];
  });
const ZoneCard = ({ zone, selected, onSelect }) => (
  <Button
    type="button"
    onClick={() => onSelect(zone)}
    className={`w-full p-4 rounded-xl border bg-white gap-3 ${selected ? 'border-blue-600' : 'border-slate-200'}`}
  >
    <Div className="flex-row items-center gap-2">
      <Div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.palette.marker }} />
      <Span className="text-sm font-semibold text-slate-900 flex-1" numberOfLines={1}>
        {zone.name}
      </Span>
      <StatusBadge tone="neutral" label={zone.type} />
    </Div>

    <Div className="flex-row items-center justify-between gap-3">
      <Div className="gap-1">
        <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Surge</Span>
        <Div className="flex-row items-center gap-1.5">
          <UiIcon as={TrendingUp} size={14} className="text-blue-600" />
          <Span className="text-sm font-semibold text-slate-900">{zone.surge}x</Span>
        </Div>
      </Div>
      <Div className="gap-1 items-end">
        <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</Span>
        <StatusBadge status={zone.status} />
      </Div>
    </Div>
  </Button>
);
const GeoFencing = () => {
  const location = useLocation();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zonesError, setZonesError] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const mapRef = useRef(null);
  const [searchValue, setSearchValue] = useState('');
  const currentView = useMemo(() => {
    if (location.pathname.includes('/peak-zone')) return 'peak-zone';
    if (location.pathname.includes('/heatmap')) return 'heatmap';
    return 'gods-eye';
  }, [location.pathname]);
  const { isLoaded, loadError } = useAppGoogleMapsLoader();
  const fetchZones = async () => {
    setLoading(true);
    setZonesError(null);
    try {
      const response = await adminService.getZones();
      const rawZones = response?.data?.results || response?.data || [];
      const mappedZones = (Array.isArray(rawZones) ? rawZones : []).map(formatZone);
      setZones(mappedZones);
      setSelectedZoneId((current) => current || mappedZones[0]?.id || null);
    } catch (error) {
      console.error('Failed to fetch zones', error);
      setZonesError(error?.message || 'Failed to load zones');
      setZones([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchZones();
  }, []);
  const filteredZones = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) {
      return zones;
    }
    return zones.filter((zone) => zone.name.toLowerCase().includes(query));
  }, [searchValue, zones]);
  const selectedZone =
    filteredZones.find((zone) => zone.id === selectedZoneId) || zones.find((zone) => zone.id === selectedZoneId) || filteredZones[0] || zones[0] || null;
  const mapCenter = selectedZone?.center || zones[0]?.center || DEFAULT_CENTER;
  const fleetMarkers = useMemo(() => createFleetMarkers(zones), [zones]);
  const onlineCount = fleetMarkers.filter((marker) => marker.kind === 'driver').length;
  const activeZoneCount = zones.filter((zone) => zone.status === 'Active').length;
  const averageSurge = zones.length > 0 ? (zones.reduce((sum, zone) => sum + Number(zone.surge || 1), 0) / zones.length).toFixed(1) : '1.0';
  const fitZoneBounds = (zone) => {
    if (!mapRef.current || !zone?.coordinates?.length) {
      return;
    }
    mapRef.current.animateToRegion(regionFor(zone.coordinates), 400);
  };
  useEffect(() => {
    if (selectedZone) {
      fitZoneBounds(selectedZone);
    }
  }, [selectedZone]);
  /*
   * The web uses the Places Autocomplete widget on this input. There is no
   * widget on native, so the same query goes through the geocode proxy on
   * submit and the camera moves to the first result.
   */
  const handlePlaceChanged = async () => {
    const query = searchValue.trim();
    if (!query || !mapRef.current) {
      return;
    }
    try {
      const res = await geocodeAPI.textSearch({ textQuery: query });
      const place = res?.data?.data?.places?.[0];
      const lat = Number(place?.location?.latitude);
      const lng = Number(place?.location?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      mapRef.current.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 400);
    } catch (error) {
      console.error('Place search failed', error);
    }
  };
  const renderMarkers = currentView === 'gods-eye';
  const polygonOpacity = currentView === 'heatmap' ? 0.18 : 0.28;
  const renderMapCanvas = () => {
    if (loadError) {
      return (
        <ErrorState
          className="border-0"
          title="Google Maps failed to load"
          message="Check the maps key, the allowed referrers, and whether the Maps API is enabled."
          onRetry={fetchZones}
        />
      );
    }
    if (HAS_VALID_GOOGLE_MAPS_KEY && isLoaded) {
      return (
        <GMap
          ref={mapRef}
          className="w-full h-[360px] rounded-lg overflow-hidden"
          customMapStyle={mapOptions.styles}
          initialRegion={{ latitude: mapCenter.lat, longitude: mapCenter.lng, latitudeDelta: DEFAULT_SPAN, longitudeDelta: DEFAULT_SPAN }}
          zoomControlEnabled
          mapType="standard"
          showsPointsOfInterest={false}
        >
          {zones.map((zone) =>
            zone.coordinates.length ? (
              <Polygon
                key={zone.id}
                coordinates={zone.coordinates.map(toMapCoord)}
                fillColor={withOpacity(zone.palette.fill, polygonOpacity)}
                strokeColor={withOpacity(zone.palette.stroke, zone.id === selectedZone?.id ? 1 : 0.7)}
                strokeWidth={zone.id === selectedZone?.id ? 3 : 2}
                zIndex={zone.id === selectedZone?.id ? 3 : 2}
                tappable
                onPress={() => setSelectedZoneId(zone.id)}
              />
            ) : null,
          )}

          {zones.map((zone) => (
            <Marker
              key={`${zone.id}-label`}
              coordinate={toMapCoord(zone.center)}
              onPress={() => setSelectedZoneId(zone.id)}
              title={zone.name}
              pinColor={zone.palette.marker}
            />
          ))}

          {renderMarkers &&
            fleetMarkers.map((marker) => (
              <Marker
                key={marker.id}
                coordinate={toMapCoord(marker.position)}
                title={marker.label}
                pinColor={marker.kind === 'driver' ? '#10B981' : '#F97316'}
              />
            ))}
        </GMap>
      );
    }
    return (
      <Div className="gap-3">
        <EmptyState
          className="border-0"
          icon={MapIcon}
          title="Google Maps is not configured"
          message="Add a maps browser key and the live zone map renders here."
        />
        <StatGrid>
          <StatCard label="Zones loaded" value={String(zones.length)} icon={Layers} tone="info" />
          <StatCard label="Selected" value={selectedZone?.name || 'None'} icon={MapPin} tone="neutral" />
          <StatCard label="Map center" value={`${mapCenter.lat.toFixed(3)}, ${mapCenter.lng.toFixed(3)}`} icon={Crosshair} tone="neutral" />
        </StatGrid>
      </Div>
    );
  };
  const zoneSearch = (
    <Div className="flex-row items-center flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white gap-2">
      <UiIcon as={Search} size={16} className="text-slate-400" />
      <Input
        type="text"
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder="Search zone…"
        className="flex-1 text-sm text-slate-900"
      />
      <UiIcon as={MapPin} size={14} className="text-slate-400" />
    </Div>
  );
  const placeSearch =
    HAS_VALID_GOOGLE_MAPS_KEY && isLoaded ? (
      <Div className="flex-row items-center h-11 px-3 rounded-lg border border-slate-300 bg-white gap-2">
        <UiIcon as={Search} size={16} className="text-slate-400" />
        <Input
          type="text"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handlePlaceChanged()}
          placeholder="Search city or locality"
          className="flex-1 text-sm text-slate-900"
        />
      </Div>
    ) : (
      <Div className="flex-row items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-100 border border-amber-200">
        <UiIcon as={AlertTriangle} size={14} className="text-amber-700" />
        <Span className="text-xs font-semibold text-amber-700 flex-1">Set the Google Maps API key to load the live map here.</Span>
      </Div>
    );
  const zoneList = loading ? (
    <LoadingState label="Syncing map data…" />
  ) : zonesError ? (
    <ErrorState title="Could not load zones" message={zonesError} onRetry={fetchZones} />
  ) : filteredZones.length > 0 ? (
    <Div className="gap-3">
      {filteredZones.map((zone) => (
        <ZoneCard key={zone.id} zone={zone} selected={zone.id === selectedZoneId} onSelect={(nextZone) => setSelectedZoneId(nextZone.id)} />
      ))}
    </Div>
  ) : (
    <EmptyState
      icon={MapPin}
      title={searchValue ? 'No zones match your search' : 'No zones yet'}
      message={searchValue ? 'Try a different zone name.' : 'Zones added in the taxi admin appear here.'}
    />
  );
  const overlayLabel =
    currentView === 'gods-eye' ? 'Fleet + zone overlay' : currentView === 'heatmap' ? 'Demand intensity overlay' : 'Peak pricing overlay';
  const mapCard = (
    <Card className="mb-4 gap-3">
      <SectionTitle className="mb-0">{selectedZone?.name || 'Live geo coverage'}</SectionTitle>
      {placeSearch}
      {renderMapCanvas()}
      <Toolbar className="mb-0">
        <Button type="button" onClick={() => fitZoneBounds(selectedZone)} className={BTN_SECONDARY}>
          <UiIcon as={LocateFixed} size={16} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>Focus zone</Span>
        </Button>
        <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg bg-slate-100">
          <UiIcon
            as={currentView === 'peak-zone' ? ShieldAlert : Layers}
            size={16}
            className={currentView === 'peak-zone' ? 'text-red-600' : 'text-blue-600'}
          />
          <Span className="text-sm text-slate-700">{overlayLabel}</Span>
        </Div>
      </Toolbar>
    </Card>
  );
  const statsGrid = (
    <StatGrid className="mb-4">
      <StatCard label="Online fleet" value={String(onlineCount)} icon={Users} tone="success" />
      <StatCard label="Active zones" value={String(activeZoneCount)} icon={Layers} tone="info" />
      <StatCard label="Avg surge" value={`${averageSurge}x`} icon={TrendingUp} tone="warning" />
    </StatGrid>
  );
  if (currentView === 'gods-eye') {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Navigation}
          title="God's Eye"
          subtitle="Dedicated live map for zone intelligence and fleet spread"
          breadcrumb={[{ label: 'Taxi' }, { label: 'Geo' }, { label: "God's Eye" }]}
          actions={
            <Button type="button" onClick={fetchZones} accessibilityLabel="Refresh zones" className={BTN_SECONDARY}>
              <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
            </Button>
          }
        />

        {statsGrid}
        {mapCard}

        <Card className="mb-4">
          <SectionTitle className="mb-0">Live focus</SectionTitle>
          <Div className="gap-2 mt-3">
            <Div className="flex-row items-center justify-between gap-3">
              <Span className="text-sm text-slate-500">Selected zone</Span>
              <Span className="text-sm font-semibold text-slate-900">{selectedZone?.name || 'None'}</Span>
            </Div>
            <Div className="flex-row items-center justify-between gap-3">
              <Span className="text-sm text-slate-500">Current surge</Span>
              <Span className="text-sm font-semibold text-slate-900">{selectedZone?.surge || averageSurge}x</Span>
            </Div>
            <Div className="flex-row items-center justify-between gap-3">
              <Span className="text-sm text-slate-500">Map center</Span>
              <Span className="text-sm font-semibold text-slate-900">
                {mapCenter.lat.toFixed(3)}, {mapCenter.lng.toFixed(3)}
              </Span>
            </Div>
          </Div>
          <Div className="flex-row items-start gap-2 mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <UiIcon as={ShieldAlert} size={16} className="text-slate-600" />
            <Span className="text-xs text-slate-500 flex-1">
              Keep zone boundaries clean and verify surge changes against the live fleet spread before pricing moves.
            </Span>
          </Div>
        </Card>

        <Card className="mb-4">
          <SectionTitle className="mb-0">Zone watchlist · {filteredZones.length}</SectionTitle>
          <Toolbar className="mt-3 mb-3">{zoneSearch}</Toolbar>
          {zoneList}
        </Card>
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={MapIcon}
        title="Geo operations"
        subtitle="Live spatial view for zones, demand and fleet coverage"
        breadcrumb={[{ label: 'Taxi' }, { label: 'Geo' }]}
        actions={
          <Button type="button" onClick={fetchZones} accessibilityLabel="Refresh zones" className={BTN_SECONDARY}>
            <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Div className="flex-row flex-wrap gap-2">
          {GEO_NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 h-11 rounded-lg items-center justify-center text-sm font-semibold ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </Div>
      </Card>

      {statsGrid}
      {mapCard}

      <Card>
        <SectionTitle className="mb-0">Zone watchlist · {filteredZones.length}</SectionTitle>
        <Toolbar className="mt-3 mb-3">{zoneSearch}</Toolbar>
        {zoneList}
      </Card>
    </AdminPage>
  );
};
export default GeoFencing;
