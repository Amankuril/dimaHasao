/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/AddZone.jsx . */
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from '../../../../lib/webRouter';
import { MapPin, ArrowLeft, Save, X, Shapes, Search } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { getGoogleMapsApiKey } from '../../../utils/googleMapsApiKey';
import { EditablePolygon, GMap, Polygon, fromLatLng, regionFor, toLatLng } from '../../../../components/maps';
import { Button, Div, Form, Input, Option, Select, Span, Strong, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  LoadingState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
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
  const { tablet, width } = useLayoutWidth();

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
  // The map fills the width it is given, tall enough to draw on without filling a tablet screen.
  const mapHeight = Math.max(320, Math.min(tablet ? 520 : 420, Math.round(width * 1.1)));
  return (
    <AdminPage maxWidth={1200} scrollEnabled={scrollEnabled}>
      <PageHeader
        icon={MapPin}
        title={isEditMode ? 'Edit Zone' : 'Add New Zone'}
        subtitle={isEditMode ? 'Update this delivery zone' : 'Create a delivery zone for customers'}
        breadcrumb={[
          { label: 'Food' },
          { label: 'Zone setup', onPress: () => navigate('/admin/food/zone-setup') },
          { label: isEditMode ? 'Edit zone' : 'Add zone' },
        ]}
        actions={
          <Button onClick={() => navigate('/admin/food/zone-setup')} className={BTN_SECONDARY}>
            <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Back to Zones</Span>
          </Button>
        }
      />

      <Form onSubmit={handleSubmit}>
        <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
          {/* Zone details */}
          <Card className="gap-4">
            <SectionTitle>Zone Details</SectionTitle>
            <Field label="Country" required>
              <Select value={formData.country} onChange={(e) => handleInputChange('country', e.target.value)} className={INPUT} required>
                <Option value="India">India</Option>
              </Select>
            </Field>
            <Field label="Zone name" required hint="Shown to admins when assigning restaurants">
              <Input
                type="text"
                value={formData.zoneName}
                onChange={(e) => handleInputChange('zoneName', e.target.value)}
                placeholder="Enter zone name"
                className={INPUT}
                required
              />
            </Field>
            <Field label="Unit" required>
              <Select value={formData.unit} onChange={(e) => handleInputChange('unit', e.target.value)} className={INPUT} required>
                <Option value="kilometer">Kilometers (km)</Option>
                <Option value="miles">Miles (mi)</Option>
              </Select>
            </Field>
          </Card>

          {/* Map */}
          <Card className="gap-3">
            <SectionTitle
              action={
                <Div className="flex-row items-center gap-2">
                  <Button type="button" onClick={toggleDrawingMode} className={isDrawing ? BTN_DANGER : BTN_PRIMARY}>
                    <UiIcon as={Shapes} size={16} className="text-white" />
                    <Span className={BTN_TEXT_PRIMARY}>{isDrawing ? 'Finish' : 'Draw'}</Span>
                  </Button>
                  {coordinates.length > 0 && (
                    <Button type="button" onClick={clearDrawing} className={BTN_SECONDARY}>
                      <UiIcon as={X} size={16} className="text-slate-600" />
                      <Span className={BTN_TEXT_SECONDARY}>Clear</Span>
                    </Button>
                  )}
                </Div>
              }
            >
              Draw Zone on Map
            </SectionTitle>

            <Div className="gap-2">
              <Div className="flex-row items-center gap-2">
                <UiIcon as={Search} size={16} className="text-slate-400" />
                <PlacesSearchInput
                  placeholder="Search location on map"
                  className={`${INPUT} flex-1`}
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
                <Text style={tw`text-xs text-blue-600`}>
                  Tap the map to add points ({MIN_POINTS}–{MAX_POINTS}), then tap Finish.
                </Text>
              )}
              {coordinates.length > 0 && (
                <Text style={tw`text-xs text-slate-500`}>
                  Points drawn: {coordinates.length}
                  {coordinates.length < 3 ? ' · minimum 3 required' : ''}
                </Text>
              )}
            </Div>

            <Div className="relative rounded-lg overflow-hidden" style={{ height: mapHeight }} {...touchLock}>
              <GMap
                ref={mapInstanceRef}
                className="w-full h-full bg-slate-100"
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
                  <Strong className="text-sm font-semibold text-slate-900">{infoZone.name || infoZone.zoneName || 'Unnamed Zone'}</Strong>
                  <Span className="text-xs text-slate-500">Country: {infoZone.country || 'N/A'}</Span>
                </InfoCard>
              ) : null}

              {mapLoading && (
                <Div className="absolute inset-0 items-center justify-center bg-slate-100" pointerEvents="none">
                  <LoadingState label="Loading map…" className="border-0 bg-transparent" />
                </Div>
              )}

              {!googleMapsApiKey && !mapLoading && (
                <Div className="absolute inset-0 items-center justify-center bg-slate-100 px-6">
                  <UiIcon as={MapPin} size={28} className="text-slate-400 mb-2" />
                  <Text style={tw`text-sm text-slate-500 text-center`}>Google Maps API key not found</Text>
                </Div>
              )}
            </Div>
          </Card>
        </Div>

        {/* Actions */}
        <Div className="flex-row flex-wrap items-center justify-end gap-2 mt-4">
          <Button type="button" onClick={() => navigate('/admin/food/zone-setup')} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
          <Button
            type="submit"
            disabled={loading || coordinates.length < 3 || !formData.zoneName || !formData.country}
            className={`${BTN_PRIMARY} ${loading || coordinates.length < 3 || !formData.zoneName || !formData.country ? 'opacity-50' : ''}`}
          >
            <UiIcon as={Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{loading ? 'Saving…' : 'Save Zone'}</Span>
          </Button>
        </Div>
      </Form>
    </AdminPage>
  );
}
