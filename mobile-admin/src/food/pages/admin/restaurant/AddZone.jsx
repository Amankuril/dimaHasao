/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/AddZone.jsx . */
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from '../../../../lib/webRouter';
import { MapPin, ArrowLeft, Save, X, Shapes, Search } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { getGoogleMapsApiKey } from '../../../utils/googleMapsApiKey';
import { EditablePolygon, GMap, Polygon, fromLatLng, regionFor, toLatLng } from '../../../../components/maps';
import { Button, Div, Form, H1, H2, Input, Label, Option, P, ScrollDiv, Select, Small, Span, Strong, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
import PlacesSearchInput from './PlacesSearchInput';
import { DotMarker, INDIA_REGION, InfoCard, MapTypeToggle, regionAtZoom, useMapTouchLock, zonePath } from './zoneMapParts';
const debugLog = (...args) => {};
const debugError = (...args) => {};

// Zone drawing limits.
const MIN_POINTS = 3;
const MAX_POINTS = 10;

// Order points radially (by angle around their centroid) so the polygon edges never
// self-intersect, while KEEPING every clicked point (unlike a convex hull, which would
// drop points that fall inside the shape). Accepts LatLng objects or {lat,lng} and
// returns an array of {lat, lng}.
const orderPointsRadially = (pts) => {
  const points = pts
    .map((p) => ({
      lat: typeof p.lat === 'function' ? p.lat() : p.lat,
      lng: typeof p.lng === 'function' ? p.lng() : p.lng,
    }))
    .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
  if (points.length < 3) return points;
  const cx = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.lat, 0) / points.length;
  return [...points].sort((a, b) => Math.atan2(a.lat - cy, a.lng - cx) - Math.atan2(b.lat - cy, b.lng - cx));
};
export default function AddZone() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { pathname } = useLocation();
  const isEditMode = !!id && !pathname.includes('/view/');
  const mapInstanceRef = useRef(null);
  // Manual drawing state (each map tap adds a vertex while drawing).
  const isDrawingRef = useRef(false);
  const [drawPoints, setDrawPoints] = useState([]); // {lat,lng}[] collected while drawing, in tap order
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [scrollEnabled, touchLock] = useMapTouchLock();

  // Form state
  const [formData, setFormData] = useState({
    country: 'India',
    zoneName: '',
    unit: 'kilometer',
  });
  const [coordinates, setCoordinates] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [existingZones, setExistingZones] = useState([]);
  const [infoZone, setInfoZone] = useState(null);
  useEffect(() => {
    fetchExistingZones();
    loadGoogleMaps();
    if (isEditMode && id) {
      fetchZone();
    }
  }, [id, isEditMode]);

  // Fit the map to the existing polygon in edit mode once map and coordinates are ready.
  useEffect(() => {
    if (isEditMode && coordinates.length >= 3 && mapInstanceRef.current && !mapLoading) {
      isDrawingRef.current = false;
      setIsDrawing(false);
      fitTo(coordinates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, coordinates.length >= 3, mapLoading]);
  const fitTo = (coords) => {
    const path = zonePath(coords);
    if (path.length < 3 || !mapInstanceRef.current) return;
    mapInstanceRef.current.animateToRegion(regionFor(path, { padding: 1.3, minDelta: 0.005 }), 300);
  };
  const fetchExistingZones = async () => {
    try {
      const response = await adminAPI.getZones({
        limit: 1000,
      });
      if (response.data?.success && response.data.data?.zones) {
        // Filter out the current zone if in edit mode
        const zones = isEditMode && id ? response.data.data.zones.filter((zone) => zone._id !== id) : response.data.data.zones;
        setExistingZones(zones);
      }
    } catch (error) {
      debugError('Error fetching existing zones:', error);
      setExistingZones([]);
    }
  };
  const fetchZone = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getZoneById(id);
      if (response.data?.success && response.data.data?.zone) {
        const zoneData = response.data.data.zone;
        setFormData({
          country: zoneData.country || 'India',
          zoneName: zoneData.name || zoneData.zoneName || '',
          unit: zoneData.unit || 'kilometer',
        });
        if (zoneData.coordinates && zoneData.coordinates.length > 0) {
          setCoordinates(zoneData.coordinates);
        }
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
      if (!apiKey) {
        setMapLoading(false);
      }
    } catch (error) {
      debugError('Error loading Google Maps:', error);
      setMapLoading(false);
    }
  };

  // While drawing, each map tap appends a vertex.
  const handleMapPress = (event) => {
    if (!isDrawingRef.current) return;
    const coordinate = event?.nativeEvent?.coordinate;
    if (!coordinate) return;
    // Enforce maximum number of points.
    if (drawPoints.length >= MAX_POINTS) {
      alert(`You can add at most ${MAX_POINTS} points. Click "Finish Drawing" to complete the zone.`);
      return;
    }
    const points = [...drawPoints, fromLatLng(coordinate)];
    setDrawPoints(points);
    // Order points radially around their centroid so edges never overlap, while still
    // keeping every tapped point. Below 3 points just use them as-is.
    const ordered = points.length >= 3 ? orderPointsRadially(points) : points;
    setCoordinates(
      ordered.map((p) => ({
        latitude: parseFloat(p.lat.toFixed(6)),
        longitude: parseFloat(p.lng.toFixed(6)),
      })),
    );
  };

  // Convert the in-progress points into a final editable polygon.
  const finishDrawing = () => {
    if (drawPoints.length < MIN_POINTS) {
      // Not enough points yet — keep drawing mode on.
      alert(`Please click at least ${MIN_POINTS} points on the map to form a zone.`);
      return false;
    }
    // Radially order so the final polygon has no overlapping edges, keeping all points.
    const ordered = orderPointsRadially(drawPoints);
    const coords = ordered.map((p) => ({
      latitude: parseFloat(p.lat.toFixed(6)),
      longitude: parseFloat(p.lng.toFixed(6)),
    }));
    setCoordinates(coords);
    setDrawPoints([]);
    fitTo(coords);
    return true;
  };
  const toggleDrawingMode = () => {
    if (!mapInstanceRef.current || mapLoading) {
      alert('Map is still loading. Please wait a moment and try again.');
      return;
    }
    if (isDrawing) {
      // Finish drawing -> finalize the polygon.
      const ok = finishDrawing();
      if (ok === false) return; // not enough points; stay in drawing mode
      isDrawingRef.current = false;
      setIsDrawing(false);
    } else {
      // Start a fresh drawing session.
      clearDrawing();
      setInfoZone(null);
      isDrawingRef.current = true;
      setIsDrawing(true);
    }
  };
  const clearDrawing = () => {
    setDrawPoints([]);
    setCoordinates([]);
  };

  // A vertex of the finished polygon was dragged.
  const handlePolygonEdit = (points) => {
    setCoordinates(
      points.map((p) => ({
        latitude: Number(p.lat ?? p.latitude),
        longitude: Number(p.lng ?? p.longitude),
      })),
    );
  };
  const drawingPreview = drawPoints.length >= 3 ? orderPointsRadially(drawPoints) : drawPoints;
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.zoneName) {
      alert('Please enter a zone name');
      return;
    }
    if (!formData.country) {
      alert('Please select a country');
      return;
    }
    if (coordinates.length < 3) {
      alert('Please draw at least 3 points on the map to create a zone');
      return;
    }
    try {
      setLoading(true);

      // Validate coordinates format
      if (!coordinates || coordinates.length < 3) {
        alert('Please draw at least 3 points on the map');
        setLoading(false);
        return;
      }

      // Ensure coordinates have correct format
      const validCoordinates = coordinates.map((coord) => {
        if (typeof coord === 'object' && coord.latitude !== undefined && coord.longitude !== undefined) {
          return {
            latitude: parseFloat(coord.latitude),
            longitude: parseFloat(coord.longitude),
          };
        }
        return coord;
      });
      const zoneData = {
        name: formData.zoneName,
        zoneName: formData.zoneName,
        country: formData.country,
        unit: formData.unit || 'kilometer',
        coordinates: validCoordinates,
        isActive: true,
      };
      debugLog('Sending zone data:', zoneData);
      if (isEditMode && id) {
        // Update existing zone
        const response = await adminAPI.updateZone(id, zoneData);
        debugLog('Zone updated successfully:', response);
        alert('Zone updated successfully!');
      } else {
        // Create new zone
        const response = await adminAPI.createZone(zoneData);
        debugLog('Zone created successfully:', response);
        alert('Zone created successfully!');
      }
      navigate('/admin/food/zone-setup');
    } catch (error) {
      debugError('Error creating zone:', error);

      // Handle different types of errors
      let errorMessage = 'Failed to create zone. Please try again.';
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
        // Network error - backend not running or CORS issue
        errorMessage = 'Cannot connect to server. Please make sure the backend server is running.';
        debugError('Network error: Backend server might not be running');
      } else if (error.response) {
        // API error with response
        errorMessage = error.response.data?.message || error.response.data?.error || error.message || `Server error: ${error.response.status}`;
        debugError('API error:', error.response.data);
        debugError('Error status:', error.response.status);
      } else {
        // Other errors
        errorMessage = error.message || errorMessage;
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };
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
              <H1 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Zone' : 'Add New Zone'}</H1>
              <P className="text-sm text-slate-600">{isEditMode ? 'Update delivery zone for customer' : 'Create a delivery zone for customer'}</P>
            </Div>
          </Div>
        </Div>

        <Form onSubmit={handleSubmit}>
          <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Form */}
            <Div className="space-y-6">
              <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <H2 className="text-lg font-semibold text-slate-900 mb-4">Zone Details</H2>

                <Div className="space-y-4">
                  {/* Country Selection */}
                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">
                      Country <Span className="text-red-500">*</Span>
                    </Label>
                    <Select
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <Option value="India">India</Option>
                    </Select>
                  </Div>

                  {/* Zone Name */}
                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">
                      Create Zone name <Span className="text-red-500">*</Span>
                    </Label>
                    <Input
                      type="text"
                      value={formData.zoneName}
                      onChange={(e) => handleInputChange('zoneName', e.target.value)}
                      placeholder="Enter zone name"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </Div>

                  {/* Select Unit */}
                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Unit <Span className="text-red-500">*</Span>
                    </Label>
                    <Select
                      value={formData.unit}
                      onChange={(e) => handleInputChange('unit', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <Option value="kilometer">Kilometers (km)</Option>
                      <Option value="miles">Miles (mi)</Option>
                    </Select>
                  </Div>
                </Div>
              </Div>
            </Div>

            {/* Right Panel - Map */}
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <Div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <H2 className="text-lg font-semibold text-slate-900">Draw Zone on Map</H2>
                <Div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={toggleDrawingMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDrawing ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    <UiIcon as={Shapes} className="w-4 h-4" />
                    <Span>{isDrawing ? 'Finish Drawing' : 'Start Drawing'}</Span>
                  </Button>
                  {coordinates.length > 0 && (
                    <Button
                      type="button"
                      onClick={clearDrawing}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <UiIcon as={X} className="w-4 h-4" />
                      <Span>Clear</Span>
                    </Button>
                  )}
                </Div>
              </Div>

              <Div className="mb-4">
                <Div className="relative">
                  <UiIcon as={Search} className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <PlacesSearchInput
                    placeholder="Search location on map..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg"
                    onPlace={(place) => {
                      const lat = place?.geometry?.location?.lat?.();
                      const lng = place?.geometry?.location?.lng?.();
                      if (Number.isFinite(lat) && Number.isFinite(lng) && mapInstanceRef.current) {
                        mapInstanceRef.current.animateToRegion(regionAtZoom(lat, lng, 15), 300); // Zoom in when location is selected
                      }
                    }}
                  />
                </Div>
                {isDrawing && (
                  <P className="text-xs text-blue-600 mt-2">
                    Click on the map to add points ({MIN_POINTS}&ndash;{MAX_POINTS}), then click <Strong>Finish Drawing</Strong>.
                  </P>
                )}
                {coordinates.length > 0 && (
                  <P className="text-xs text-slate-600 mt-2">
                    Points drawn: <Strong>{coordinates.length}</Strong>
                    {coordinates.length < 3 && <Span className="text-red-600 ml-2"> (Minimum 3 points required)</Span>}
                  </P>
                )}
              </Div>

              <Div className="relative h-[600px]" {...touchLock}>
                <GMap
                  ref={mapInstanceRef}
                  className="w-full h-full rounded-lg"
                  initialRegion={INDIA_REGION}
                  mapType={mapType}
                  zoomControlEnabled
                  onMapReady={() => setMapLoading(false)}
                  onPress={handleMapPress}
                >
                  {existingZones.map((zone) => {
                    const path = zonePath(zone.coordinates);
                    if (path.length < 3) return null;
                    return (
                      <Polygon
                        key={zone._id || zone.id}
                        coordinates={path}
                        strokeColor="rgba(59,130,246,0.6)"
                        strokeWidth={2}
                        fillColor="rgba(59,130,246,0.15)"
                        zIndex={0}
                        tappable={!isDrawing}
                        onPress={() => setInfoZone(zone)}
                      />
                    );
                  })}
                  {isDrawing ? (
                    <>
                      {drawingPreview.length >= 2 ? (
                        <Polygon coordinates={drawingPreview.map(toLatLng)} strokeColor="#9333ea" strokeWidth={2} fillColor="rgba(147,51,234,0.35)" zIndex={1} tappable={false} />
                      ) : null}
                      {drawPoints.map((p, i) => (
                        <DotMarker key={`d${i}`} coordinate={toLatLng(p)} title={`Point ${i + 1}`} />
                      ))}
                    </>
                  ) : coordinates.length >= 3 ? (
                    <EditablePolygon
                      points={coordinates}
                      onChange={handlePolygonEdit}
                      strokeColor="rgba(147,51,234,0.8)"
                      strokeWidth={3}
                      fillColor="rgba(147,51,234,0.35)"
                      vertexColor="#9333ea"
                    />
                  ) : null}
                </GMap>
                <MapTypeToggle value={mapType} onChange={setMapType} />
                {infoZone && !isDrawing ? (
                  <InfoCard onClose={() => setInfoZone(null)}>
                    <Strong className="text-sm text-slate-900">{infoZone.name || infoZone.zoneName || 'Unnamed Zone'}</Strong>
                    <Small className="text-xs text-slate-600">Country: {infoZone.country || 'N/A'}</Small>
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

          {/* Action Buttons */}
          <Div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              onClick={() => navigate('/admin/food/zone-setup')}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || coordinates.length < 3 || !formData.zoneName || !formData.country}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></Div>
                  <Span>Saving...</Span>
                </>
              ) : (
                <>
                  <UiIcon as={Save} className="w-4 h-4" />
                  <Span>Save Zone</Span>
                </>
              )}
            </Button>
          </Div>
        </Form>
      </Div>
    </ScrollDiv>
  );
}
