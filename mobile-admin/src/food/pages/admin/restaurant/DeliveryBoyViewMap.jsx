/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/DeliveryBoyViewMap.jsx . */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { MapPin, ArrowLeft, Search, Bike } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { getGoogleMapsApiKey } from '../../../utils/googleMapsApiKey';
import { subscribeAllDeliveryLocations } from '../../../realtimeTracking';
import bikeLogo from '../../../assets/bikelogo.png';
import { GMap, Polygon } from '../../../../components/maps';
import { Button, Div, H1, H3, P, ScrollDiv, Span, Strong, Icon as UiIcon } from '../../../../components/web';
import PlacesSearchInput from './PlacesSearchInput';
import { INDIA_REGION, ImageMarker, InfoCard, MapTypeToggle, ZONE_COLORS, regionAtZoom, useMapTouchLock, withAlpha, zonePath } from './zoneMapParts';
const debugError = (...args) => {};
export default function DeliveryBoyViewMap() {
  const navigate = useNavigate();
  const mapInstanceRef = useRef(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [info, setInfo] = useState(null); // { kind: 'zone' | 'boy', item }
  const [scrollEnabled, touchLock] = useMapTouchLock();
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
  return (
    <ScrollDiv className="min-h-screen bg-slate-50" scrollEnabled={scrollEnabled}>
      <Div className="p-4 lg:p-6">
        {/* Header */}
        <Div className="flex items-center gap-4 mb-6">
          <Button onClick={() => navigate('/admin/food/zone-setup')} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <UiIcon as={ArrowLeft} className="w-5 h-5 text-slate-600" />
          </Button>
          <Div className="flex-1 flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <UiIcon as={Bike} className="w-5 h-5 text-white" />
            </Div>
            <Div className="flex-1">
              <H1 className="text-2xl font-bold text-slate-900">Delivery Boy View</H1>
              <P className="text-sm text-slate-600">View zones and online delivery boys on map</P>
            </Div>
          </Div>
        </Div>

        {/* Search Bar */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
          <Div className="relative">
            <UiIcon as={Search} className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <PlacesSearchInput
              placeholder="Search location on map..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg"
              onPlace={(place) => {
                const lat = place?.geometry?.location?.lat?.();
                const lng = place?.geometry?.location?.lng?.();
                if (Number.isFinite(lat) && Number.isFinite(lng) && mapInstanceRef.current) {
                  mapInstanceRef.current.animateToRegion(regionAtZoom(lat, lng, 12), 300);
                }
              }}
            />
          </Div>
        </Div>

        {/* Map Container */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <Div className="relative h-[600px]" {...touchLock}>
            <GMap
              ref={mapInstanceRef}
              className="w-full h-full rounded-lg"
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
                <H3 className="text-base font-semibold text-slate-800 mb-2">{info.item.name || 'Unnamed Zone'}</H3>
                <Div className="text-[13px] text-slate-500">
                  <P className="mb-1">
                    <Strong>Location:</Strong> {info.item.serviceLocation || 'N/A'}
                  </P>
                  <P className="mb-1">
                    <Strong>Unit:</Strong> {info.item.unit || 'km'}
                  </P>
                  <P className="mb-1">
                    <Strong>Points:</Strong> {info.item.coordinates.length}
                  </P>
                  <P>
                    <Strong>Status:</Strong>{' '}
                    <Span className={`font-semibold ${info.item.isActive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{info.item.isActive ? 'Active' : 'Inactive'}</Span>
                  </P>
                </Div>
              </InfoCard>
            ) : null}
            {info?.kind === 'boy' ? (
              <InfoCard onClose={() => setInfo(null)}>
                <H3 className="text-base font-semibold text-slate-800 mb-2">{info.item.name}</H3>
                <Div className="text-[13px] text-slate-500">
                  <P className="mb-1">
                    <Strong>Phone:</Strong> {info.item.phone}
                  </P>
                  <P className="mb-1">
                    <Strong>Status:</Strong> <Span className="font-semibold text-[#10b981]">Online</Span>
                  </P>
                  {info.item.lastUpdate ? <P className="mt-2 text-xs text-slate-400">Last updated: {new Date(info.item.lastUpdate).toLocaleTimeString()}</P> : null}
                </Div>
              </InfoCard>
            ) : null}

            {mapLoading && (
              <Div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg" pointerEvents="none">
                <Div className="text-center">
                  <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></Div>
                  <P className="text-slate-600">Loading map...</P>
                </Div>
              </Div>
            )}

            {loading && !mapLoading && (
              <Div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
                <Div className="text-center">
                  <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></Div>
                  <P className="text-slate-600">Loading data...</P>
                </Div>
              </Div>
            )}

            {!googleMapsApiKey && !mapLoading && (
              <Div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
                <Div className="text-center p-6">
                  <UiIcon as={MapPin} className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <P className="text-sm text-slate-600">Google Maps API key not found</P>
                </Div>
              </Div>
            )}

            {!loading && !mapLoading && zones.length === 0 && deliveryBoys.length === 0 && (
              <Div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
                <Div className="text-center p-6">
                  <UiIcon as={MapPin} className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <P className="text-sm text-slate-600">No zones or delivery boys found</P>
                </Div>
              </Div>
            )}
          </Div>

          {/* Legend */}
          {!mapLoading && (
            <Div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <H3 className="text-sm font-semibold text-slate-900 mb-2">Map Information</H3>
              <Div className="text-xs text-slate-600 space-y-1">
                {zones.length > 0 && (
                  <P>
                    Click on any <Span className="font-semibold text-blue-600">zone</Span> on the map to view details. Total zones:{' '}
                    <Strong>{zones.length}</Strong>
                  </P>
                )}
                {deliveryBoys.length > 0 && (
                  <P>
                    Click on any <Span className="font-semibold text-green-600">green bike icon</Span> to view delivery boy details. Online delivery boys:{' '}
                    <Strong>{deliveryBoys.length}</Strong>
                  </P>
                )}
                {deliveryBoys.length === 0 && <P className="text-amber-600">No online delivery boys found. Delivery boys will appear when they go online.</P>}
              </Div>
            </Div>
          )}
        </Div>
      </Div>
    </ScrollDiv>
  );
}
