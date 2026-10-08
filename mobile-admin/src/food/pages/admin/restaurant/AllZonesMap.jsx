/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/AllZonesMap.jsx (tools/port.js first pass). */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { MapPin, ArrowLeft, Search } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { getGoogleMapsApiKey } from '../../../utils/googleMapsApiKey';
// PORT: @googlemaps/js-api-loader: rebuild with react-native-maps (MapView PROVIDER_GOOGLE, Marker, Polygon, Polyline, Circle)
import { Loader } from '@googlemaps/js-api-loader';
import { Button, Div, H1, H3, Input, P, ScrollDiv, Span, Strong, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function AllZonesMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const zonesPolygonsRef = useRef([]);
  const infoWindowsRef = useRef([]);
  const restaurantMarkersRef = useRef([]);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationSearch, setLocationSearch] = useState('');
  const autocompleteInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  useEffect(() => {
    fetchZones();
    fetchRestaurants();
    loadGoogleMaps();
  }, []);

  // Initialize Places Autocomplete when map is loaded
  useEffect(() => {
    if (!mapLoading && mapInstanceRef.current && autocompleteInputRef.current && window.google?.maps?.places && !autocompleteRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        componentRestrictions: {
          country: 'in',
        }, // Restrict to India
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location && mapInstanceRef.current) {
          const location = place.geometry.location;
          mapInstanceRef.current.setCenter(location);
          mapInstanceRef.current.setZoom(12); // Zoom in when location is selected

          // Set the search input value
          setLocationSearch(place.formatted_address || place.name || '');
        }
      });
      autocompleteRef.current = autocomplete;
    }
  }, [mapLoading]);

  // Draw zones and restaurant markers when map and data are ready
  useEffect(() => {
    if (!mapLoading && mapInstanceRef.current && window.google) {
      if (zones.length > 0 && restaurants.length > 0) {
        drawAllZonesOnMap(window.google, mapInstanceRef.current);
      }
      if (restaurants.length > 0) {
        drawRestaurantMarkers(window.google, mapInstanceRef.current);
      }
    }
  }, [zones, mapLoading, restaurants]);
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

      // Wait for Google Maps to be loaded from main.jsx if it's loading
      let retries = 0;
      const maxRetries = 50; // Wait up to 5 seconds (50 * 100ms)

      while (!window.google && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries++;
      }

      // If Google Maps is already loaded (from main.jsx), use it directly
      if (window.google && window.google.maps) {
        initializeMap(window.google);
        return;
      }

      // If Google Maps is not loaded yet and we have an API key, use Loader as fallback
      if (apiKey) {
        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places', 'drawing', 'geometry'],
        });
        const google = await loader.load();
        initializeMap(google);
      } else {
        setMapLoading(false);
      }
    } catch (error) {
      debugError('Error loading Google Maps:', error);
      setMapLoading(false);
    }
  };
  const initializeMap = (google) => {
    if (!mapRef.current) return;

    // Initial location (India center)
    const initialLocation = {
      lat: 20.5937,
      lng: 78.9629,
    };

    // Create map
    const map = new google.maps.Map(mapRef.current, {
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
    setMapLoading(false);
  };

  // Draw all zones on the map
  const drawAllZonesOnMap = (google, map) => {
    if (!zones || zones.length === 0) {
      // Clear zones if no zones exist
      zonesPolygonsRef.current.forEach((polygon) => {
        if (polygon) polygon.setMap(null);
      });
      zonesPolygonsRef.current = [];
      return;
    }

    // Clear previous polygons and info windows
    zonesPolygonsRef.current.forEach((polygon) => {
      if (polygon) polygon.setMap(null);
    });
    zonesPolygonsRef.current = [];
    infoWindowsRef.current.forEach((infoWindow) => {
      if (infoWindow) infoWindow.close();
    });
    infoWindowsRef.current = [];

    // Colors for different zones
    const colors = [
      '#3b82f6',
      // Blue
      '#10b981',
      // Green
      '#f59e0b',
      // Orange
      '#ef4444',
      // Red
      '#8b5cf6',
      // Purple
      '#ec4899',
      // Pink
      '#06b6d4',
      // Cyan
      '#84cc16', // Lime
    ];
    const bounds = new google.maps.LatLngBounds();
    zones.forEach((zone, index) => {
      if (!zone.coordinates || zone.coordinates.length < 3) return;

      // Convert coordinates to LatLng array
      const path = zone.coordinates
        .map((coord) => {
          const lat = typeof coord === 'object' ? coord.latitude || coord.lat : null;
          const lng = typeof coord === 'object' ? coord.longitude || coord.lng : null;
          if (lat === null || lng === null) return null;
          const latLng = new google.maps.LatLng(lat, lng);
          bounds.extend(latLng);
          return latLng;
        })
        .filter(Boolean);
      if (path.length < 3) return;

      // Select color based on index
      const color = colors[index % colors.length];

      // Create polygon for zone
      const polygon = new google.maps.Polygon({
        paths: path,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.25,
        editable: false,
        draggable: false,
        clickable: true,
        zIndex: 1,
      });
      polygon.setMap(map);
      zonesPolygonsRef.current.push(polygon);

      // Add info window on click
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">
              ${zone.name || zone.zoneName || 'Unnamed Zone'}
            </h3>
            <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
              <div style="margin-bottom: 4px;">
                <strong>Country:</strong> ${zone.country || 'N/A'}
              </div>
              <div style="margin-bottom: 4px;">
                <strong>Unit:</strong> ${zone.unit || 'km'}
              </div>
              <div style="margin-bottom: 4px;">
                <strong>Points:</strong> ${zone.coordinates.length}
              </div>
              <div>
                <strong>Status:</strong> 
                <span style="color: ${zone.isActive ? '#10b981' : '#ef4444'}; font-weight: 600;">
                  ${zone.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        `,
      });
      polygon.addListener('click', () => {
        // Close all other info windows
        infoWindowsRef.current.forEach((iw) => {
          if (iw && iw !== infoWindow) iw.close();
        });
        infoWindow.setPosition(path[0]);
        infoWindow.open(map);
        infoWindowsRef.current.push(infoWindow);
      });
    });

    // Fit map to show all zones
    if (zones.length > 0) {
      map.fitBounds(bounds);
      // Add some padding
      const padding = {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      };
      map.fitBounds(bounds, padding);
    }
  };

  // Draw restaurant markers on the map
  const drawRestaurantMarkers = (google, map) => {
    if (!restaurants || restaurants.length === 0) return;

    // Clear previous markers
    restaurantMarkersRef.current.forEach((marker) => {
      if (marker) marker.setMap(null);
    });
    restaurantMarkersRef.current = [];
    restaurants.forEach((restaurant) => {
      if (!restaurant.location) return;

      // Get coordinates from restaurant location
      let lat = null;
      let lng = null;
      if (restaurant.location.coordinates && Array.isArray(restaurant.location.coordinates) && restaurant.location.coordinates.length >= 2) {
        lng = restaurant.location.coordinates[0];
        lat = restaurant.location.coordinates[1];
      } else if (restaurant.location.latitude && restaurant.location.longitude) {
        lat = parseFloat(restaurant.location.latitude);
        lng = parseFloat(restaurant.location.longitude);
      }

      // Skip if no valid coordinates
      if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        return;
      }

      // Validate coordinates are in valid range
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return;
      }

      // Create custom icon for restaurant
      const restaurantIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#ef4444',
        // Red color
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      };

      // Create marker
      const marker = new google.maps.Marker({
        position: {
          lat,
          lng,
        },
        map: map,
        icon: restaurantIcon,
        title: restaurant.name || 'Restaurant',
        zIndex: 1000, // Show above zones
      });

      // Create info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">
              ${restaurant.name || 'Unnamed Restaurant'}
            </h3>
            <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
              ${restaurant.location?.formattedAddress || restaurant.location?.address || restaurant.location?.area || 'Location not specified'}
            </div>
            ${
              restaurant.ownerName
                ? `
              <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">
                <strong>Owner:</strong> ${restaurant.ownerName}
              </div>
            `
                : ''
            }
          </div>
        `,
      });

      // Add click listener to show info window
      marker.addListener('click', () => {
        // Close all other info windows
        infoWindowsRef.current.forEach((iw) => {
          if (iw && iw !== infoWindow) iw.close();
        });
        infoWindow.open(map, marker);
        infoWindowsRef.current.push(infoWindow);
      });
      restaurantMarkersRef.current.push(marker);
    });
  };
  // PORT: ref on a host element: check what the web did with it (scrollIntoView, focus, measure, DOM reads)
  // PORT: inline style object: check every property is valid in React Native (no backgroundImage, cursor, gridTemplate..., strings like "1rem")
  return (
    <ScrollDiv className="min-h-screen bg-slate-50">
      <Div className="p-4 lg:p-6">
        {/* Header */}
        <Div className="flex items-center gap-4 mb-6">
          <Button onClick={() => navigate('/admin/food/zone-setup')} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <UiIcon as={ArrowLeft} className="w-5 h-5 text-slate-600" />
          </Button>
          <Div className="flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <UiIcon as={MapPin} className="w-5 h-5 text-white" />
            </Div>
            <Div>
              <H1 className="text-2xl font-bold text-slate-900">All Zones Map</H1>
              <P className="text-sm text-slate-600">View all restaurant delivery zones on map</P>
            </Div>
          </Div>
        </Div>

        {/* Search Bar */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
          <Div className="relative">
            <UiIcon as={Search} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              ref={autocompleteInputRef}
              type="text"
              placeholder="Search location on map..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Div>
        </Div>

        {/* Map Container */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <Div
            className="relative"
            style={{
              height: 'calc(100vh - 250px)',
              minHeight: '600px',
            }}
          >
            <Div ref={mapRef} className="w-full h-full rounded-lg" />

            {mapLoading && (
              <Div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
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
