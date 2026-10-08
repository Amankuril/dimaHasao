/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/ViewZone.jsx (tools/port.js first pass). */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from '../../../../lib/webRouter';
import { MapPin, ArrowLeft } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { getGoogleMapsApiKey } from '../../../utils/googleMapsApiKey';
// PORT: @googlemaps/js-api-loader: rebuild with react-native-maps (MapView PROVIDER_GOOGLE, Marker, Polygon, Polyline, Circle)
import { Loader } from '@googlemaps/js-api-loader';
import { Button, Div, H1, H2, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function ViewZone() {
  const navigate = useNavigate();
  const { id } = useParams();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonRef = useRef(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [zone, setZone] = useState(null);
  const [loading, setLoading] = useState(true);

  // Memoize zone dependencies to keep dependency array stable
  const zoneId = useMemo(() => zone?._id || null, [zone?._id]);
  const coordinatesLength = useMemo(() => zone?.coordinates?.length || 0, [zone?.coordinates?.length]);
  useEffect(() => {
    fetchZone();
    // Load Google Maps immediately
    loadGoogleMaps();
  }, [id]);

  // Trigger map resize when component is fully mounted
  useEffect(() => {
    if (mapInstanceRef.current && !mapLoading) {
      const timer = setTimeout(() => {
        if (window.google && window.google.maps && mapInstanceRef.current) {
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mapLoading]);
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
      debugLog('Loading Google Maps...');
      const apiKey = await getGoogleMapsApiKey();
      setGoogleMapsApiKey(apiKey || 'loaded');

      // Wait for Google Maps to be loaded from main.jsx if it's loading
      let retries = 0;
      const maxRetries = 50;
      while (!window.google && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries++;
      }
      if (window.google && window.google.maps) {
        debugLog('Google Maps already loaded, initializing map...');
        // Wait a bit for DOM to be ready
        setTimeout(() => {
          initializeMap(window.google);
        }, 100);
        return;
      }
      if (apiKey) {
        debugLog('Loading Google Maps with Loader...');
        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['geometry'],
        });
        const google = await loader.load();
        debugLog('Google Maps loaded, initializing map...');
        // Wait a bit for DOM to be ready
        setTimeout(() => {
          initializeMap(google);
        }, 100);
      } else {
        debugLog('No API key found');
        setMapLoading(false);
      }
    } catch (error) {
      debugError('Error loading Google Maps:', error);
      setMapLoading(false);
    }
  };
  const initializeMap = (google) => {
    debugLog('initializeMap called, mapRef.current:', mapRef.current);
    if (!mapRef.current) {
      debugLog('Map ref not available, retrying...');
      setTimeout(() => initializeMap(google), 300);
      return;
    }

    // Check if container has dimensions, retry if not
    const container = mapRef.current;
    debugLog('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      debugLog('Map container has no dimensions, retrying...');
      setTimeout(() => initializeMap(google), 300);
      return;
    }
    try {
      // Initial location (India center)
      const initialLocation = {
        lat: 20.5937,
        lng: 78.9629,
      };
      debugLog('Creating Google Map with container:', container);

      // Create map
      const map = new google.maps.Map(container, {
        center: initialLocation,
        zoom: 5,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_RIGHT,
          mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE],
        },
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        scrollwheel: true,
        gestureHandling: 'greedy',
        disableDoubleClickZoom: false,
      });
      mapInstanceRef.current = map;
      debugLog('Map instance created successfully, map:', map);

      // Wait for map to be ready before hiding loading
      google.maps.event.addListenerOnce(map, 'idle', () => {
        debugLog('Map is idle, hiding loading overlay');
        setMapLoading(false);

        // Trigger resize to ensure map renders properly
        setTimeout(() => {
          if (mapInstanceRef.current) {
            google.maps.event.trigger(mapInstanceRef.current, 'resize');
            debugLog('Map resize triggered after idle');

            // Draw zone polygon if zone data is available
            if (zone && zone.coordinates && zone.coordinates.length >= 3) {
              debugLog('Drawing zone polygon from initializeMap');
              drawZonePolygon(google, mapInstanceRef.current, zone.coordinates);
            }
          }
        }, 200);
      });

      // Fallback: hide loading after timeout
      setTimeout(() => {
        if (mapLoading) {
          debugLog('Fallback: hiding loading overlay after timeout');
          setMapLoading(false);
        }
      }, 2000);
    } catch (error) {
      debugError('Error initializing map:', error);
      setMapLoading(false);
    }
  };
  const drawZonePolygon = (google, map, coordinates) => {
    if (!coordinates || coordinates.length < 3) {
      debugLog('Not enough coordinates to draw polygon:', coordinates?.length);
      return;
    }
    debugLog('Drawing zone polygon with', coordinates.length, 'coordinates');
    try {
      // Convert coordinates to LatLng array
      const path = coordinates
        .map((coord) => {
          const lat = typeof coord === 'object' ? coord.latitude || coord.lat : null;
          const lng = typeof coord === 'object' ? coord.longitude || coord.lng : null;
          if (lat === null || lng === null) {
            debugError('Invalid coordinate:', coord);
            return null;
          }
          return new google.maps.LatLng(lat, lng);
        })
        .filter(Boolean);
      if (path.length < 3) {
        debugError('Not enough valid coordinates after conversion');
        return;
      }

      // Clear existing polygon
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }

      // Create polygon
      const polygon = new google.maps.Polygon({
        paths: path,
        strokeColor: '#9333ea',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: '#9333ea',
        fillOpacity: 0.35,
        editable: false,
        draggable: false,
        clickable: false,
      });
      polygon.setMap(map);
      polygonRef.current = polygon;
      debugLog('Polygon created and added to map');

      // Fit map to polygon bounds
      const bounds = new google.maps.LatLngBounds();
      path.forEach((latLng) => bounds.extend(latLng));
      map.fitBounds(bounds);
      debugLog('Map fitted to polygon bounds');

      // Add markers for each point
      coordinates.forEach((coord, index) => {
        const lat = typeof coord === 'object' ? coord.latitude || coord.lat : null;
        const lng = typeof coord === 'object' ? coord.longitude || coord.lng : null;
        if (lat !== null && lng !== null) {
          new google.maps.Marker({
            position: {
              lat,
              lng,
            },
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#9333ea',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            zIndex: 1000,
            title: `Point ${index + 1}`,
          });
        }
      });
      debugLog('Markers added to map');
    } catch (error) {
      debugError('Error drawing zone polygon:', error);
    }
  };

  // Redraw polygon when zone data loads and map is ready
  useEffect(() => {
    debugLog('Polygon drawing useEffect triggered', {
      hasZone: !!zone,
      hasCoordinates: !!zone?.coordinates,
      coordinatesLength: zone?.coordinates?.length,
      hasMap: !!mapInstanceRef.current,
      hasGoogle: !!window.google,
      mapLoading,
    });

    // Only draw if map is not loading
    if (zone && zone.coordinates && zone.coordinates.length >= 3 && mapInstanceRef.current && window.google && !mapLoading) {
      debugLog('All conditions met, drawing polygon...');
      // Small delay to ensure map is fully rendered
      setTimeout(() => {
        if (mapInstanceRef.current) {
          debugLog('Drawing polygon now');
          // Clear existing polygon
          if (polygonRef.current) {
            polygonRef.current.setMap(null);
          }
          drawZonePolygon(window.google, mapInstanceRef.current, zone.coordinates);
        }
      }, 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, coordinatesLength]);

  // Draw polygon when map finishes loading
  useEffect(() => {
    if (!mapLoading && zone && zone.coordinates && zone.coordinates.length >= 3 && mapInstanceRef.current && window.google) {
      debugLog('Map finished loading, drawing polygon...');
      setTimeout(() => {
        if (mapInstanceRef.current) {
          if (polygonRef.current) {
            polygonRef.current.setMap(null);
          }
          drawZonePolygon(window.google, mapInstanceRef.current, zone.coordinates);
        }
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoading]);
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
  // PORT: inline style object: check every property is valid in React Native (no backgroundImage, cursor, gridTemplate..., strings like "1rem")
  // PORT: ref on a host element: check what the web did with it (scrollIntoView, focus, measure, DOM reads)
  return (
    <ScrollDiv className="min-h-screen bg-slate-50">
      <Div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <Div className="flex items-center gap-4 mb-6">
          <Button onClick={() => navigate('/admin/food/zone-setup')} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <UiIcon as={ArrowLeft} className="w-5 h-5 text-slate-600" />
          </Button>
          <Div className="flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
              <UiIcon as={MapPin} className="w-5 h-5 text-white" />
            </Div>
            <Div>
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

              <Div
                className="relative"
                style={{
                  height: '600px',
                  minHeight: '600px',
                }}
              >
                <Div
                  ref={mapRef}
                  className="w-full h-full rounded-lg"
                  style={{
                    width: '100%',
                    height: '600px',
                    minHeight: '600px',
                    backgroundColor: '#e5e7eb',
                    position: 'relative',
                  }}
                />

                {mapLoading && (
                  <Div
                    className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg"
                    style={{
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  >
                    <Div className="text-center">
                      <Div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></Div>
                      <P className="text-slate-600">Loading map...</P>
                    </Div>
                  </Div>
                )}

                {!googleMapsApiKey && !mapLoading && (
                  <Div
                    className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg"
                    style={{
                      zIndex: 10,
                    }}
                  >
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
