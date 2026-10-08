/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/AllZonesMap.jsx . */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { MapPin, ArrowLeft, Search } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { getGoogleMapsApiKey } from '../../../utils/googleMapsApiKey';
import { GMap, Polygon } from '../../../../components/maps';
import { Button, Div, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatusBadge,
  LoadingState,
  EmptyState,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import PlacesSearchInput from './PlacesSearchInput';
import { DotMarker, INDIA_REGION, InfoCard, MapTypeToggle, ZONE_COLORS, regionAtZoom, useMapTouchLock, withAlpha, zonePath } from './zoneMapParts';
const debugError = (...args) => {};

/** A label/value line inside a map info card. */
function InfoLine({ label, children }) {
  return (
    <Div className="flex-row items-center gap-1.5 flex-wrap">
      <Text style={tw`text-xs font-semibold text-slate-500`}>{label}</Text>
      {typeof children === 'string' || typeof children === 'number' ? <Text style={tw`text-xs text-slate-700`}>{children}</Text> : children}
    </Div>
  );
}
export default function AllZonesMap() {
  const navigate = useNavigate();
  const mapInstanceRef = useRef(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [zones, setZones] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null); // { kind: 'zone' | 'restaurant', item }
  const [scrollEnabled, touchLock] = useMapTouchLock();
  const { tablet, width } = useLayoutWidth();
  useEffect(() => {
    fetchZones();
    fetchRestaurants();
    loadGoogleMaps();
  }, []);
  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getZones({
        limit: 1000,
      });
      const zoneData = response?.data?.data;
      const list = Array.isArray(zoneData?.zones) ? zoneData.zones : Array.isArray(zoneData) ? zoneData : [];
      if (response.data?.success) {
        setZones(list);
      }
    } catch (error) {
      debugError('Error fetching zones:', error);
      setZones([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchRestaurants = async () => {
    try {
      const response = await adminAPI.getRestaurants({
        limit: 1000,
      });
      const restaurantData = response?.data?.data;
      const list = Array.isArray(restaurantData?.restaurants) ? restaurantData.restaurants : Array.isArray(restaurantData) ? restaurantData : [];
      if (response.data?.success) {
        setRestaurants(list);
      }
    } catch (error) {
      debugError('Error fetching restaurants:', error);
    }
  };
  const loadGoogleMaps = async () => {
    try {
      const apiKey = await getGoogleMapsApiKey();
      setGoogleMapsApiKey(apiKey || 'loaded');
    } catch (error) {
      debugError('Error loading Google Maps:', error);
      setMapLoading(false);
    }
  };

  // As on the web, zones are drawn once both zones and restaurants have loaded.
  const zonePolygons = useMemo(() => {
    if (zones.length === 0 || restaurants.length === 0) return [];
    return zones
      .map((zone, index) => {
        if (!zone.coordinates || zone.coordinates.length < 3) return null;
        const path = zonePath(zone.coordinates);
        if (path.length < 3) return null;
        return { zone, path, color: ZONE_COLORS[index % ZONE_COLORS.length] };
      })
      .filter(Boolean);
  }, [zones, restaurants]);

  // Restaurant markers: GeoJSON [lng, lat] or { latitude, longitude }.
  const restaurantMarkers = useMemo(
    () =>
      restaurants
        .map((restaurant, index) => {
          if (!restaurant.location) return null;
          let lat = null;
          let lng = null;
          if (restaurant.location.coordinates && Array.isArray(restaurant.location.coordinates) && restaurant.location.coordinates.length >= 2) {
            lng = restaurant.location.coordinates[0];
            lat = restaurant.location.coordinates[1];
          } else if (restaurant.location.latitude && restaurant.location.longitude) {
            lat = parseFloat(restaurant.location.latitude);
            lng = parseFloat(restaurant.location.longitude);
          }
          if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
          return { key: restaurant._id || restaurant.id || `r${index}`, restaurant, coordinate: { latitude: Number(lat), longitude: Number(lng) } };
        })
        .filter(Boolean),
    [restaurants],
  );

  // Fit map to show all zones (fitBounds with 50px padding).
  useEffect(() => {
    if (mapLoading || !mapInstanceRef.current || zonePolygons.length === 0) return;
    const coords = zonePolygons.flatMap((z) => z.path);
    mapInstanceRef.current.fitToCoordinates(coords, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
  }, [zonePolygons, mapLoading]);
  // A map tall enough to read on a phone, capped so a tablet keeps the legend in view.
  const mapHeight = Math.max(360, Math.min(tablet ? 620 : 460, Math.round(width * 1.2)));
  return (
    <AdminPage maxWidth={1200} scrollEnabled={scrollEnabled}>
      <PageHeader
        icon={MapPin}
        title="All Zones Map"
        subtitle="Every restaurant delivery zone on one map"
        breadcrumb={[{ label: 'Food' }, { label: 'Zone setup', onPress: () => navigate('/admin/food/zone-setup') }, { label: 'All zones map' }]}
        actions={
          <Button onClick={() => navigate('/admin/food/zone-setup')} className={BTN_SECONDARY}>
            <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Back to Zones</Span>
          </Button>
        }
      />

      {/* Search */}
      <Card className="mb-4">
        <Div className="flex-row items-center gap-2">
          <UiIcon as={Search} size={16} className="text-slate-400" />
          <PlacesSearchInput
            placeholder="Search location on map"
            className={`${INPUT} flex-1`}
            onPlace={(place) => {
              const lat = place?.geometry?.location?.lat?.();
              const lng = place?.geometry?.location?.lng?.();
              if (Number.isFinite(lat) && Number.isFinite(lng) && mapInstanceRef.current) {
                mapInstanceRef.current.animateToRegion(regionAtZoom(lat, lng, 12), 300); // Zoom in when location is selected
              }
            }}
          />
        </Div>
      </Card>

      {/* Map */}
      <Card>
        <Div className="relative rounded-lg overflow-hidden" style={{ height: mapHeight }} {...touchLock}>
          <GMap
            ref={mapInstanceRef}
            className="w-full h-full bg-slate-100"
            initialRegion={INDIA_REGION}
            mapType={mapType}
            zoomControlEnabled
            onMapReady={() => setMapLoading(false)}
          >
            {zonePolygons.map(({ zone, path, color }, index) => (
              <Polygon
                key={zone._id || zone.id || `z${index}`}
                coordinates={path}
                strokeColor={withAlpha(color, 0.8)}
                strokeWidth={2}
                fillColor={withAlpha(color, 0.25)}
                zIndex={1}
                tappable
                onPress={() => setInfo({ kind: 'zone', item: zone })}
              />
            ))}
            {restaurantMarkers.map(({ key, restaurant, coordinate }) => (
              <DotMarker
                key={key}
                coordinate={coordinate}
                color="#ef4444"
                title={restaurant.name || 'Restaurant'}
                onPress={() => setInfo({ kind: 'restaurant', item: restaurant })}
              />
            ))}
          </GMap>
          <MapTypeToggle value={mapType} onChange={setMapType} />
          {info?.kind === 'zone' ? (
            <InfoCard onClose={() => setInfo(null)}>
              <Text style={tw`text-base font-semibold text-slate-900 mb-2`} numberOfLines={2}>
                {info.item.name || info.item.zoneName || 'Unnamed Zone'}
              </Text>
              <Div className="gap-1">
                <InfoLine label="Country">{info.item.country || 'N/A'}</InfoLine>
                <InfoLine label="Unit">{info.item.unit || 'km'}</InfoLine>
                <InfoLine label="Points">{String(info.item.coordinates?.length ?? 0)}</InfoLine>
                <InfoLine label="Status">
                  <StatusBadge status={info.item.isActive ? 'active' : 'inactive'} label={info.item.isActive ? 'Active' : 'Inactive'} />
                </InfoLine>
              </Div>
            </InfoCard>
          ) : null}
          {info?.kind === 'restaurant' ? (
            <InfoCard onClose={() => setInfo(null)}>
              <Text style={tw`text-base font-semibold text-slate-900 mb-2`} numberOfLines={2}>
                {info.item.name || 'Unnamed Restaurant'}
              </Text>
              <Text style={tw`text-xs text-slate-500`} numberOfLines={3}>
                {info.item.location?.formattedAddress || info.item.location?.address || info.item.location?.area || 'Location not specified'}
              </Text>
              {info.item.ownerName ? <InfoLine label="Owner">{info.item.ownerName}</InfoLine> : null}
            </InfoCard>
          ) : null}

          {mapLoading && (
            <Div className="absolute inset-0 items-center justify-center bg-slate-100" pointerEvents="none">
              <LoadingState label="Loading map…" className="border-0 bg-transparent" />
            </Div>
          )}

          {loading && !mapLoading && (
            <Div className="absolute inset-0 items-center justify-center bg-slate-100">
              <LoadingState label="Loading zones…" className="border-0 bg-transparent" />
            </Div>
          )}

          {!googleMapsApiKey && !mapLoading && (
            <Div className="absolute inset-0 items-center justify-center bg-slate-100 px-6">
              <UiIcon as={MapPin} size={28} className="text-slate-400 mb-2" />
              <Text style={tw`text-sm text-slate-500 text-center`}>Google Maps API key not found</Text>
            </Div>
          )}

          {!loading && !mapLoading && zones.length === 0 && (
            <Div className="absolute inset-0 items-center justify-center bg-slate-100">
              <EmptyState
                icon={MapPin}
                title="No zones yet"
                message="Create a delivery zone and it will be drawn on this map."
                actionLabel="Add Zone"
                onAction={() => navigate('/admin/food/zone-setup/add')}
                className="border-0 bg-transparent"
              />
            </Div>
          )}
        </Div>

        {/* Legend */}
        {!mapLoading && (
          <Div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 gap-1.5">
            <SectionTitle className="mb-1">Map Information</SectionTitle>
            {zones.length > 0 && (
              <Text style={tw`text-xs text-slate-500`}>
                Tap any zone to see its details. Total zones: {zones.length}
              </Text>
            )}
            {restaurants.length > 0 && (
              <Text style={tw`text-xs text-slate-500`}>
                Tap a red marker to see the restaurant details. Total restaurants: {restaurants.length}
              </Text>
            )}
            {zones.length === 0 && restaurants.length === 0 && <Text style={tw`text-xs text-slate-500`}>Nothing to show on the map yet.</Text>}
          </Div>
        )}
      </Card>
    </AdminPage>
  );
}
