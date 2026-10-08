/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/ViewZone.jsx. */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from '../../../../lib/webRouter';
import { MapPin, ArrowLeft } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { getGoogleMapsApiKey } from '../../../utils/googleMapsApiKey';
import { GMap, Polygon, regionFor } from '../../../../components/maps';
import { Button, Div, H1, H2, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
import { DotMarker, INDIA_REGION, MapTypeToggle, useMapTouchLock, zonePath } from './zoneMapParts';
const debugError = (...args) => {};
export default function ViewZone() {
  const navigate = useNavigate();
  const { id } = useParams();
  const mapInstanceRef = useRef(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [zone, setZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrollEnabled, touchLock] = useMapTouchLock();
  useEffect(() => {
    fetchZone();
    loadGoogleMaps();
  }, [id]);
  const fetchZone = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getZoneById(id);
      if (response.data?.success && response.data.data?.zone) {
        setZone(response.data.data.zone);
      }
    } catch (error) {
      debugError('Error fetching zone:', error);
      alert('Failed to load zone');
      navigate('/admin/food/zone-setup');
    } finally {
      setLoading(false);
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
  const path = zonePath(zone?.coordinates);

  // Fit the map to the polygon once both the map and the zone are ready (fitBounds).
  useEffect(() => {
    if (!mapLoading && path.length >= 3 && mapInstanceRef.current) {
      mapInstanceRef.current.animateToRegion(regionFor(path, { padding: 1.3, minDelta: 0.005 }), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoading, zone?._id, zone?.coordinates?.length]);
  if (loading) {
    return (
      <ScrollDiv className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Div className="text-center">
          <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></Div>
          <P className="text-slate-600">Loading zone...</P>
        </Div>
      </ScrollDiv>
    );
  }
  if (!zone) {
    return (
      <ScrollDiv className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Div className="text-center">
          <P className="text-slate-600">Zone not found</P>
          <Button onClick={() => navigate('/admin/food/zone-setup')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Zones
          </Button>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-slate-50" scrollEnabled={scrollEnabled}>
      <Div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <Div className="flex items-center gap-4 mb-6">
          <Button onClick={() => navigate('/admin/food/zone-setup')} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <UiIcon as={ArrowLeft} className="w-5 h-5 text-slate-600" />
          </Button>
          <Div className="flex-1 flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
              <UiIcon as={MapPin} className="w-5 h-5 text-white" />
            </Div>
            <Div className="flex-1">
              <H1 className="text-2xl font-bold text-slate-900">View Zone</H1>
              <P className="text-sm text-slate-600">{zone.name || zone.serviceLocation}</P>
            </Div>
          </Div>
        </Div>

        <Div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Zone Details */}
          <Div className="lg:col-span-1">
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <H2 className="text-lg font-semibold text-slate-900 mb-4">Zone Details</H2>

              <Div className="space-y-4">
                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-1">Name</Label>
                  <P className="text-sm text-slate-900">{zone.name || 'N/A'}</P>
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-1">Country</Label>
                  <P className="text-sm text-slate-900">{zone.country || 'N/A'}</P>
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-1">Unit</Label>
                  <P className="text-sm text-slate-900">{zone.unit || 'kilometer'}</P>
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-1">Status</Label>
                  <Span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${zone.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}
                  >
                    {zone.isActive ? 'Active' : 'Inactive'}
                  </Span>
                </Div>

                {zone.coordinates && zone.coordinates.length > 0 && (
                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-1">Points</Label>
                    <P className="text-sm text-slate-900">{zone.coordinates.length}</P>
                  </Div>
                )}
              </Div>
            </Div>
          </Div>

          {/* Map */}
          <Div className="lg:col-span-2">
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <H2 className="text-lg font-semibold text-slate-900 mb-4">Zone Map</H2>

              <Div className="relative h-[600px]" {...touchLock}>
                <GMap
                  ref={mapInstanceRef}
                  className="w-full h-full rounded-lg bg-[#e5e7eb]"
                  initialRegion={INDIA_REGION}
                  mapType={mapType}
                  zoomControlEnabled
                  onMapReady={() => setMapLoading(false)}
                >
                  {path.length >= 3 ? (
                    <Polygon coordinates={path} strokeColor="rgba(147,51,234,0.8)" strokeWidth={3} fillColor="rgba(147,51,234,0.35)" tappable={false} />
                  ) : null}
                  {path.length >= 3 ? path.map((c, index) => <DotMarker key={`p${index}`} coordinate={c} title={`Point ${index + 1}`} />) : null}
                </GMap>
                <MapTypeToggle value={mapType} onChange={setMapType} />

                {mapLoading && (
                  <Div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg" pointerEvents="none">
                    <Div className="text-center">
                      <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></Div>
                      <P className="text-slate-600">Loading map...</P>
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
              </Div>
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
