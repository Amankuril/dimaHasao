/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/AllZonesMap.jsx . */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { MapPin, ArrowLeft, Search } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { getGoogleMapsApiKey } from '../../../utils/googleMapsApiKey';
import { GMap, Polygon } from '../../../../components/maps';
import { Button, Div, H1, H3, P, ScrollDiv, Span, Strong, Icon as UiIcon } from '../../../../components/web';
import PlacesSearchInput from './PlacesSearchInput';
import { DotMarker, INDIA_REGION, InfoCard, MapTypeToggle, ZONE_COLORS, regionAtZoom, useMapTouchLock, withAlpha, zonePath } from './zoneMapParts';
const debugError = (...args) => {};
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
  return (
    <ScrollDiv className="min-h-screen bg-slate-50" scrollEnabled={scrollEnabled}>
      <Div className="p-4 lg:p-6">
        {/* Header */}
        <Div className="flex items-center gap-4 mb-6">
          <Button onClick={() => navigate('/admin/food/zone-setup')} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <UiIcon as={ArrowLeft} className="w-5 h-5 text-slate-600" />
          </Button>
          <Div className="flex-1 flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <UiIcon as={MapPin} className="w-5 h-5 text-white" />
            </Div>
            <Div className="flex-1">
              <H1 className="text-2xl font-bold text-slate-900">All Zones Map</H1>
              <P className="text-sm text-slate-600">View all restaurant delivery zones on map</P>
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
                  mapInstanceRef.current.animateToRegion(regionAtZoom(lat, lng, 12), 300); // Zoom in when location is selected
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
                <H3 className="text-base font-semibold text-slate-800 mb-2">{info.item.name || info.item.zoneName || 'Unnamed Zone'}</H3>
                <Div className="text-[13px] text-slate-500">
                  <P className="mb-1">
                    <Strong>Country:</Strong> {info.item.country || 'N/A'}
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
            {info?.kind === 'restaurant' ? (
              <InfoCard onClose={() => setInfo(null)}>
                <H3 className="text-base font-semibold text-slate-800 mb-2">{info.item.name || 'Unnamed Restaurant'}</H3>
                <P className="text-[13px] text-slate-500">
                  {info.item.location?.formattedAddress || info.item.location?.address || info.item.location?.area || 'Location not specified'}
                </P>
                {info.item.ownerName ? (
                  <P className="mt-2 text-xs text-slate-400">
                    <Strong>Owner:</Strong> {info.item.ownerName}
                  </P>
                ) : null}
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
                  <P className="text-slate-600">Loading zones...</P>
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

            {!loading && !mapLoading && zones.length === 0 && (
              <Div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
                <Div className="text-center p-6">
                  <UiIcon as={MapPin} className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <P className="text-sm text-slate-600">No zones found</P>
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
                {restaurants.length > 0 && (
                  <P>
                    Click on any <Span className="font-semibold text-red-600">red marker</Span> to view restaurant name and details. Total restaurants:{' '}
                    <Strong>{restaurants.length}</Strong>
                  </P>
                )}
              </Div>
            </Div>
          )}
        </Div>
      </Div>
    </ScrollDiv>
  );
}
