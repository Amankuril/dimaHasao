/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/DeliveryBoyViewMap.jsx . */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { MapPin, ArrowLeft, Search, Bike } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { getGoogleMapsApiKey } from '../../../utils/googleMapsApiKey';
import { subscribeAllDeliveryLocations } from '../../../realtimeTracking';
import bikeLogo from '../../../assets/bikelogo.png';
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
import { INDIA_REGION, ImageMarker, InfoCard, MapTypeToggle, ZONE_COLORS, regionAtZoom, useMapTouchLock, withAlpha, zonePath } from './zoneMapParts';
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
export default function DeliveryBoyViewMap() {
  const navigate = useNavigate();
  const mapInstanceRef = useRef(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [info, setInfo] = useState(null); // { kind: 'zone' | 'boy', item }
  const [scrollEnabled, touchLock] = useMapTouchLock();
  const { tablet, width } = useLayoutWidth();
  const [zones, setZones] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const deliveryMetaByIdRef = useRef(new Map());
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchZones();
    fetchDeliveryPartnerDirectory();
    loadGoogleMaps();
    const unsubscribeRealtime = subscribeAllDeliveryLocations(
      (deliveryNode) => {
        const nextDeliveryBoys = Object.entries(deliveryNode || {})
          .map(([deliveryId, payload]) => {
            const location = payload?.location || {};
            const lat = Number(location?.lat);
            const lng = Number(location?.lng);
            const isOnline = location?.isOnline === true || location?.status === 'online' || location?.status === 'busy';
            if (!isOnline || !Number.isFinite(lat) || !Number.isFinite(lng)) {
              return null;
            }
            const meta = deliveryMetaByIdRef.current.get(String(deliveryId)) || {};
            return {
              _id: String(deliveryId),
              name: meta.name || meta.fullName || 'Delivery Partner',
              phone: meta.phone || 'N/A',
              availability: {
                isOnline: true,
                currentLocation: {
                  type: 'Point',
                  coordinates: [lng, lat],
                  heading: Number(location?.heading) || 0,
                  speed: Number(location?.speed) || 0,
                  lastUpdate: Number(location?.timestamp || location?.last_updated) || Date.now(),
                },
                lastLocationUpdate: Number(location?.timestamp || location?.last_updated) || Date.now(),
              },
            };
          })
          .filter(Boolean);
        setDeliveryBoys(nextDeliveryBoys);
        setLoading(false);
      },
      (error) => {
        debugError('Firebase delivery listener failed:', error);
      },
    );
    return () => {
      if (typeof unsubscribeRealtime === 'function') unsubscribeRealtime();
    };
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getZones({
        limit: 1000,
      });
      if (response.data?.success && response.data.data?.zones) {
        setZones(response.data.data.zones);
      }
    } catch (error) {
      debugError('Error fetching zones:', error);
      setZones([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchDeliveryPartnerDirectory = async () => {
    try {
      const response = await adminAPI.getDeliveryPartners({
        limit: 1000,
        status: 'approved',
        isActive: true,
        includeAvailability: false,
      });
      if (response.data?.success && response.data.data?.deliveryPartners) {
        const nextMap = new Map();
        response.data.data.deliveryPartners.forEach((boy) => {
          const boyId = boy?._id || boy?.id || boy?.deliveryId || boy?.fullData?._id || boy?.fullData?.id;
          if (!boyId) return;
          nextMap.set(String(boyId), {
            name: boy?.name || boy?.fullData?.name || 'Delivery Partner',
            fullName: boy?.fullName || boy?.fullData?.fullName || '',
            phone: boy?.phone || boy?.fullData?.phone || 'N/A',
          });
        });
        deliveryMetaByIdRef.current = nextMap;
      }
    } catch (error) {
      debugError('Error fetching delivery partner directory:', error);
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

  // All zones as polygons.
  const zonePolygons = useMemo(
    () =>
      zones
        .map((zone, index) => {
          if (!zone.coordinates || zone.coordinates.length < 3) return null;
          const path = zonePath(zone.coordinates);
          if (path.length < 3) return null;
          return { zone, path, color: ZONE_COLORS[index % ZONE_COLORS.length] };
        })
        .filter(Boolean),
    [zones],
  );

  // Fit map to show all zones (fitBounds with 50px padding).
  useEffect(() => {
    if (mapLoading || !mapInstanceRef.current || zonePolygons.length === 0) return;
    const coords = zonePolygons.flatMap((z) => z.path);
    mapInstanceRef.current.fitToCoordinates(coords, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
  }, [zonePolygons, mapLoading]);

  // Delivery boy markers (bikes), rotated to their heading rounded to 5 degrees.
  const bikeMarkers = useMemo(() => {
    const processedIds = new Set();
    const list = [];
    for (const boy of deliveryBoys) {
      const fullData = boy.fullData || boy;
      const boyId = boy._id || boy.id || boy.deliveryId || fullData?._id || fullData?.id || fullData?.deliveryId;
      if (!boyId) continue;
      const idString = boyId.toString();
      // Skip if we've already processed this delivery boy
      if (processedIds.has(idString)) continue;
      processedIds.add(idString);
      const availability = boy.availability || fullData?.availability;
      const currentLocation = availability?.currentLocation;
      if (!currentLocation?.coordinates) continue;
      const coords = currentLocation.coordinates;
      // Handle both [lng, lat] and [lat, lng] formats
      let lat;
      let lng;
      if (Array.isArray(coords) && coords.length >= 2) {
        if (coords[0] > -180 && coords[0] < 180 && coords[1] > -90 && coords[1] < 90) {
          lng = coords[0];
          lat = coords[1];
        } else {
          lat = coords[0];
          lng = coords[1];
        }
      } else {
        continue;
      }
      if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
      const heading = currentLocation.heading || 0;
      list.push({
        id: idString,
        coordinate: { latitude: Number(lat), longitude: Number(lng) },
        rotation: Math.round(heading / 5) * 5,
        name: fullData.name || 'Delivery Boy',
        phone: fullData.phone || 'N/A',
        lastUpdate: availability?.lastLocationUpdate || currentLocation?.lastUpdate,
      });
    }
    return list;
  }, [deliveryBoys]);
  // A map tall enough to read on a phone, capped so a tablet keeps the legend in view.
  const mapHeight = Math.max(360, Math.min(tablet ? 620 : 460, Math.round(width * 1.2)));
  return (
    <AdminPage maxWidth={1200} scrollEnabled={scrollEnabled}>
      <PageHeader
        icon={Bike}
        title="Delivery Boy View"
        subtitle="Zones and the delivery partners online right now"
        breadcrumb={[{ label: 'Food' }, { label: 'Zone setup', onPress: () => navigate('/admin/food/zone-setup') }, { label: 'Delivery boy view' }]}
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
                mapInstanceRef.current.animateToRegion(regionAtZoom(lat, lng, 12), 300);
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
            {bikeMarkers.map((boy) => (
              <ImageMarker
                key={boy.id}
                coordinate={boy.coordinate}
                source={bikeLogo}
                rotation={boy.rotation}
                title={boy.name}
                onPress={() => setInfo({ kind: 'boy', item: boy })}
              />
            ))}
          </GMap>
          <MapTypeToggle value={mapType} onChange={setMapType} />
          {info?.kind === 'zone' ? (
            <InfoCard onClose={() => setInfo(null)}>
              <Text style={tw`text-base font-semibold text-slate-900 mb-2`} numberOfLines={2}>
                {info.item.name || 'Unnamed Zone'}
              </Text>
              <Div className="gap-1">
                <InfoLine label="Location">{info.item.serviceLocation || 'N/A'}</InfoLine>
                <InfoLine label="Unit">{info.item.unit || 'km'}</InfoLine>
                <InfoLine label="Points">{String(info.item.coordinates?.length ?? 0)}</InfoLine>
                <InfoLine label="Status">
                  <StatusBadge status={info.item.isActive ? 'active' : 'inactive'} label={info.item.isActive ? 'Active' : 'Inactive'} />
                </InfoLine>
              </Div>
            </InfoCard>
          ) : null}
          {info?.kind === 'boy' ? (
            <InfoCard onClose={() => setInfo(null)}>
              <Text style={tw`text-base font-semibold text-slate-900 mb-2`} numberOfLines={2}>
                {info.item.name}
              </Text>
              <Div className="gap-1">
                <InfoLine label="Phone">{info.item.phone}</InfoLine>
                <InfoLine label="Status">
                  <StatusBadge status="online" label="Online" />
                </InfoLine>
                {info.item.lastUpdate ? (
                  <Text style={tw`text-xs text-slate-500 mt-1`}>Last updated: {new Date(info.item.lastUpdate).toLocaleTimeString()}</Text>
                ) : null}
              </Div>
            </InfoCard>
          ) : null}

          {mapLoading && (
            <Div className="absolute inset-0 items-center justify-center bg-slate-100" pointerEvents="none">
              <LoadingState label="Loading map…" className="border-0 bg-transparent" />
            </Div>
          )}

          {loading && !mapLoading && (
            <Div className="absolute inset-0 items-center justify-center bg-slate-100">
              <LoadingState label="Loading zones and partners…" className="border-0 bg-transparent" />
            </Div>
          )}

          {!googleMapsApiKey && !mapLoading && (
            <Div className="absolute inset-0 items-center justify-center bg-slate-100 px-6">
              <UiIcon as={MapPin} size={28} className="text-slate-400 mb-2" />
              <Text style={tw`text-sm text-slate-500 text-center`}>Google Maps API key not found</Text>
            </Div>
          )}

          {!loading && !mapLoading && zones.length === 0 && deliveryBoys.length === 0 && (
            <Div className="absolute inset-0 items-center justify-center bg-slate-100">
              <EmptyState
                icon={MapPin}
                title="Nothing on the map yet"
                message="Delivery partners appear here when they go online, and zones once you create one."
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
            {zones.length > 0 && <Text style={tw`text-xs text-slate-500`}>Tap any zone to see its details. Total zones: {zones.length}</Text>}
            {deliveryBoys.length > 0 && (
              <Text style={tw`text-xs text-slate-500`}>Tap a bike marker to see the partner details. Online partners: {deliveryBoys.length}</Text>
            )}
            {deliveryBoys.length === 0 && (
              <Text style={tw`text-xs text-slate-500`}>No delivery partners are online. They appear here as soon as they go online.</Text>
            )}
          </Div>
        )}
      </Card>
    </AdminPage>
  );
}
