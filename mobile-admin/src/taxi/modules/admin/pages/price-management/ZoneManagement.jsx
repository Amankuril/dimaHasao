/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/ZoneManagement.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from '../../../../../lib/motion';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Navigation,
  Loader2,
  ChevronRight,
  Target,
  Zap,
  Tag,
  Save,
  ArrowLeft,
  Maximize2,
  Map as MapIcon,
  Globe,
  Info,
  Layers,
  MousePointer2,
  X,
  MapPin,
} from 'lucide-react-native';
import { Circle, EditablePolygon, GMap, Polygon, fromLatLng, regionFor, toLatLng } from '../../../../../components/maps';
import { useDrawingGoogleMapsLoader } from '../../utils/googleMaps';
import { adminService } from '../../services/adminService';
import { buildCountryBoundaryUrl, normalizeBoundaryRings, isDriverAvailable } from '../../utils/mapUtils';
import PlaceSearchField from './PlaceSearchField';
import {
  Button,
  Div,
  H1,
  H3,
  H4,
  HScroll,
  Input,
  Label,
  Option,
  P,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
const inputClass =
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-[#FFC400] focus:ring-1 focus:ring-[#FFC400] outline-none transition-colors';
const labelClass = 'block text-xs font-semibold text-gray-500 mb-1.5';
const cardClass = 'bg-white rounded-xl border border-gray-200 p-6 shadow-sm';
const ADMIN_LANGUAGE_OPTIONS = ['English', 'Hindi', 'Arabic', 'French', 'Spanish'];
const ZoneManagement = ({ mode: initialMode = 'list' }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [view, setView] = useState(initialMode);
  const [zones, setZones] = useState([]);
  const [serviceLocations, setServiceLocations] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [enablePeakZoneGlobal, setEnablePeakZoneGlobal] = useState(true);
  const [editingId, setEditingId] = useState(id || null);
  const [mapCenter, setMapCenter] = useState({
    lat: 21.1458,
    lng: 79.0882,
  });
  const [countryBoundaryPaths, setCountryBoundaryPaths] = useState([]);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const mapRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('English');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Map & Drawing States
  const [boundaryMode, setBoundaryMode] = useState('polygon');
  const [polygonCoords, setPolygonCoords] = useState([]);
  const [circleCenter, setCircleCenter] = useState(null);
  const [circleRadiusMeters, setCircleRadiusMeters] = useState('');
  const { isLoaded, loadError } = useDrawingGoogleMapsLoader();

  // Form State
  const [formData, setFormData] = useState({
    service_location_id: '',
    name: {
      English: '',
      Hindi: '',
      Arabic: '',
      French: '',
      Spanish: '',
    },
    unit: '',
    peak_zone_ride_count: '',
    peak_zone_radius: '',
    peak_zone_selection_duration: '',
    peak_zone_duration: '',
    peak_zone_surge_percentage: '',
    maximum_distance_for_regular_rides: '',
    maximum_distance_for_outstation_rides: '',
    status: 'active',
  });
  useEffect(() => {
    setView(initialMode === 'edit' || initialMode === 'create' || initialMode === 'view' ? 'form' : 'list');
    if (initialMode === 'list') {
      resetForm();
    }
  }, [initialMode]);
  const fetchData = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [zoneRes, slRes, driverRes] = await Promise.all([adminService.getZones(), adminService.getServiceLocations(), adminService.getDrivers(1, 200)]);
      /*
       * The web declares zoneData with `const` inside the `if (zoneRes)` block
       * and then reads it again in the `initialMode === 'edit'` block below,
       * which is a ReferenceError there: every edit-mode load fell into the
       * catch and showed "Zone data could not be loaded." It is declared in the
       * function scope here so the edit lookup runs, which is what the web's
       * [id, zones] effect below does anyway.
       */
      let zoneData = [];
      if (zoneRes) {
        zoneData = zoneRes.success ? zoneRes.data?.results || zoneRes.data : zoneRes;
        setZones(Array.isArray(zoneData) ? zoneData : []);
      }
      if (slRes) {
        const locs = slRes.success ? slRes.data?.results || slRes.data : slRes;
        setServiceLocations(Array.isArray(locs) ? locs : []);
      }
      if (driverRes) {
        const driverItems = driverRes.success ? driverRes.data?.results || driverRes.data : driverRes;
        setDrivers(Array.isArray(driverItems) ? driverItems : []);
      }
      if (id && initialMode === 'edit') {
        const zoneToEdit = Array.isArray(zoneData) && zoneData.find((z) => (z._id || z.id) === id);
        if (zoneToEdit) handleEdit(zoneToEdit);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setFetchError(`Zone data could not be loaded.`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    if (id && zones.length > 0 && initialMode === 'edit') {
      const zoneToEdit = zones.find((z) => (z._id || z.id) === id);
      if (zoneToEdit) handleEdit(zoneToEdit);
    }
  }, [id, zones]);
  const filteredZones = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return zones;
    return zones.filter((z) => (z.name || z.zone_name || '').toLowerCase().includes(query));
  }, [zones, searchTerm]);
  const totalZonePages = Math.max(1, Math.ceil(filteredZones.length / pageSize));
  const paginatedZones = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredZones.slice(start, start + pageSize);
  }, [filteredZones, currentPage, pageSize]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);
  useEffect(() => {
    if (currentPage > totalZonePages) {
      setCurrentPage(totalZonePages);
    }
  }, [currentPage, totalZonePages]);
  /* The web builds a google.maps.LatLngBounds and calls map.fitBounds(bounds, 40). */
  const fitMapToPaths = (paths) => {
    if (!mapRef.current || !Array.isArray(paths) || paths.length === 0) {
      return;
    }
    const points = paths.flat().filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng));
    if (points.length === 0) {
      return;
    }
    mapRef.current.animateToRegion(regionFor(points), 400);
  };
  /*
   * The web draws with Google's DrawingManager (polygon and circle modes in a
   * control on the map). There is no drawing manager in react-native-maps, so
   * the Boundary Shape buttons the form already has choose the mode and each
   * map tap draws: in polygon mode a tap appends a vertex (vertices are then
   * draggable, and a tap on one removes it); in circle mode a tap sets the
   * centre, with the radius coming from the Circle Boundary Radius field.
   */
  const handleMapPress = (event) => {
    const point = fromLatLng(event.nativeEvent.coordinate);
    if (boundaryMode === 'circle') {
      setCircleCenter(point);
      setPolygonCoords([]);
      return;
    }
    setPolygonCoords((prev) => [...prev, point]);
    setCircleCenter(null);
    setCircleRadiusMeters('');
  };
  /*
   * On the web these read the live geometry back out of the editable google.maps
   * overlays before saving. Here the drawn geometry is the state itself (the
   * draggable vertices and the radius field write straight to it), so the sync
   * is a read of what handleSave is about to send.
   */
  const syncPolygonState = () => polygonCoords;
  const syncCircleState = () => ({
    center: circleCenter,
    radiusMeters: circleRadiusMeters,
  });
  const onPlaceChanged = (place) => {
    if (place.geometry) {
      const loc = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      setMapCenter(loc);
      mapRef.current?.animateToRegion(
        {
          ...toLatLng(loc),
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        400,
      );
    }
  };
  const handleSave = async () => {
    const syncedPolygonCoords = boundaryMode === 'polygon' ? syncPolygonState() : polygonCoords;
    const syncedCircle =
      boundaryMode === 'circle'
        ? syncCircleState()
        : {
            center: circleCenter,
            radiusMeters: circleRadiusMeters,
          };
    const effectiveCircleCenter = syncedCircle?.center || circleCenter;
    const effectiveCircleRadiusMeters = syncedCircle?.radiusMeters || circleRadiusMeters;
    const hasPolygon = boundaryMode === 'polygon' && syncedPolygonCoords.length >= 3;
    const hasCircle =
      boundaryMode === 'circle' &&
      Number(effectiveCircleRadiusMeters) > 0 &&
      Number.isFinite(Number(effectiveCircleCenter?.lat)) &&
      Number.isFinite(Number(effectiveCircleCenter?.lng));
    if (!formData.name.English.trim() || (!hasPolygon && !hasCircle)) {
      alert('Please add a zone name and draw a polygon or circle boundary on the map.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        boundary_mode: boundaryMode,
        coordinates: boundaryMode === 'polygon' ? syncedPolygonCoords : undefined,
        circle_center: boundaryMode === 'circle' ? effectiveCircleCenter : undefined,
        circle_radius_meters: boundaryMode === 'circle' ? Number(effectiveCircleRadiusMeters) : undefined,
        name: formData.name.English,
      };
      const res = editingId ? await adminService.updateZone(editingId, payload) : await adminService.createZone(payload);
      if (res.success) {
        resetForm();
        navigate('/taxi/admin/pricing/zone');
        fetchData();
      } else {
        alert(res.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Error connecting to server.');
    } finally {
      setSaving(false);
    }
  };
  const resetForm = () => {
    setEditingId(null);
    setFormData({
      service_location_id: '',
      name: {
        English: '',
        Hindi: '',
        Arabic: '',
        French: '',
        Spanish: '',
      },
      unit: '',
      peak_zone_ride_count: '',
      peak_zone_radius: '',
      peak_zone_selection_duration: '',
      peak_zone_duration: '',
      peak_zone_surge_percentage: '',
      maximum_distance_for_regular_rides: '',
      maximum_distance_for_outstation_rides: '',
      status: 'active',
    });
    setBoundaryMode('polygon');
    setPolygonCoords([]);
    setCircleCenter(null);
    setCircleRadiusMeters('');
    setCountryBoundaryPaths([]);
  };
  const handleStatusToggle = async (zoneId, currentIsActive) => {
    try {
      const res = await adminService.toggleZoneStatus(zoneId);
      if (res.success) {
        setZones((prev) =>
          prev.map((z) =>
            z._id === zoneId || z.id === zoneId
              ? {
                  ...z,
                  active: !currentIsActive,
                }
              : z,
          ),
        );
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };
  const handleDelete = async (zoneId) => {
    if (!(await window.confirmAsync('Are you sure?'))) return;
    try {
      const res = await adminService.deleteZone(zoneId);
      if (res.success) {
        setZones((prev) => prev.filter((z) => z._id !== zoneId && z.id !== zoneId));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };
  const handleEdit = (zone) => {
    const zid = zone._id || zone.id;
    setEditingId(zid);
    const localizedNames = typeof zone.name === 'object' && zone.name !== null ? zone.name : {};
    let zoneName = typeof zone.name === 'string' ? zone.name : localizedNames.English || zone.zone_name || '';
    setFormData({
      service_location_id: zone.service_location_id || '',
      name: {
        English: zoneName,
        Hindi: localizedNames.Hindi || '',
        Arabic: localizedNames.Arabic || '',
        French: localizedNames.French || '',
        Spanish: localizedNames.Spanish || '',
      },
      unit: zone.unit || '',
      peak_zone_ride_count: zone.peak_zone_ride_count || '',
      peak_zone_radius: zone.peak_zone_radius || '',
      peak_zone_selection_duration: zone.peak_zone_selection_duration || '',
      peak_zone_duration: zone.peak_zone_duration || '',
      peak_zone_surge_percentage: zone.peak_zone_surge_percentage || '',
      maximum_distance_for_regular_rides: zone.maximum_distance_for_regular_rides || '',
      maximum_distance_for_outstation_rides: zone.maximum_distance_for_outstation_rides || '',
      status: zone.active ? 'active' : 'inactive',
    });
    let parsedCoords = [];
    if (Array.isArray(zone.coordinates)) {
      parsedCoords = zone.coordinates.map((coord) => {
        if (Array.isArray(coord))
          return {
            lat: coord[1],
            lng: coord[0],
          };
        if (coord && typeof coord === 'object')
          return {
            lat: Number(coord.lat),
            lng: Number(coord.lng),
          };
        return coord;
      });
    }
    if (parsedCoords.length > 0) setMapCenter(parsedCoords[0]);
    const nextBoundaryMode = zone.boundary_mode === 'circle' ? 'circle' : 'polygon';
    setBoundaryMode(nextBoundaryMode);
    setPolygonCoords(parsedCoords);
    setCircleCenter(
      zone.circle_center && Number.isFinite(Number(zone.circle_center?.lat)) && Number.isFinite(Number(zone.circle_center?.lng))
        ? {
            lat: Number(zone.circle_center.lat),
            lng: Number(zone.circle_center.lng),
          }
        : null,
    );
    setCircleRadiusMeters(zone.circle_radius_meters !== null && zone.circle_radius_meters !== undefined ? String(zone.circle_radius_meters) : '');
  };
  const handleExplore = (zone) => {
    handleEdit(zone);
    setView('form');
  };
  const selectedServiceLocation = serviceLocations.find((l) => String(l._id || l.id) === String(formData.service_location_id));
  const selectedCountry = selectedServiceLocation?.country || selectedServiceLocation?.name || '';
  useEffect(() => {
    if (view === 'list' || !selectedCountry) return;
    let cancelled = false;
    const loadCountryBoundary = async () => {
      setBoundaryLoading(true);
      try {
        const response = await fetch(buildCountryBoundaryUrl(selectedCountry));
        if (!response.ok) throw new Error();
        const payload = await response.json();
        const feature = Array.isArray(payload) ? payload[0] : null;
        const nextPaths = normalizeBoundaryRings(feature?.geojson);
        if (!cancelled) {
          setCountryBoundaryPaths(nextPaths);
          if (nextPaths.length > 0) fitMapToPaths(nextPaths);
        }
      } catch (error) {
        if (!cancelled) setCountryBoundaryPaths([]);
      } finally {
        if (!cancelled) setBoundaryLoading(false);
      }
    };
    loadCountryBoundary();
    return () => {
      cancelled = true;
    };
  }, [selectedCountry, view]);
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8 animate-in fade-in duration-500">
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
            className="max-w-7xl mx-auto space-y-6"
          >
            <Div className="mb-6">
              <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <Span>Pricing</Span>
                <UiIcon as={ChevronRight} size={12} />
                <Span className="text-gray-700">Zone Management</Span>
              </Div>
              <Div className="flex items-center justify-between">
                <Div>
                  <H1 className="text-xl text-gray-900 font-bold">Zone Management</H1>
                  <P className="text-xs text-gray-400 mt-1">Configure geofenced boundaries for operational control.</P>
                </Div>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/taxi/admin/pricing/zone/create');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FFC400] text-[#0B1220] rounded-lg text-sm font-medium hover:brightness-95 transition-colors shadow-sm relative z-50"
                >
                  <UiIcon as={Plus} size={16} /> Add Market Zone
                </Button>
              </Div>
            </Div>

            <Div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between shadow-sm">
              <Div className="flex items-center gap-4">
                <Div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${enablePeakZoneGlobal ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-300'}`}
                >
                  <UiIcon as={Zap} size={20} className={enablePeakZoneGlobal ? 'animate-pulse' : ''} />
                </Div>
                <Div>
                  <H3 className="text-sm text-gray-900 font-bold">Dynamic Peak Pricing</H3>
                  <P className="text-[11px] text-gray-400">Toggle surge modifiers across all zones globally</P>
                </Div>
              </Div>
              <Button
                onClick={() => setEnablePeakZoneGlobal(!enablePeakZoneGlobal)}
                className={`relative w-11 h-6 rounded-full transition-colors ${enablePeakZoneGlobal ? 'bg-[#FFC400]' : 'bg-gray-200'}`}
              >
                <Div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enablePeakZoneGlobal ? 'translate-x-5' : ''}`} />
              </Button>
            </Div>

            <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <Div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <Div className="relative w-full max-w-sm">
                  <UiIcon as={Search} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search zones..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FFC400] focus:border-[#FFC400] transition-all font-medium"
                  />
                </Div>
              </Div>

              <Div>
                {loading ? (
                  <Div className="flex flex-col items-center justify-center py-20">
                    <UiIcon as={Loader2} className="animate-spin text-[#FFC400] mb-2" size={32} />
                    <P className="text-xs text-gray-400 font-medium">Loading data...</P>
                  </Div>
                ) : filteredZones.length > 0 ? (
                  <Table cols={[80, 230, 130, 110]} className="w-full text-sm">
                    <Thead>
                      <Tr className="bg-gray-50/50 border-b border-gray-100">
                        <Th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">S.No</Th>
                        <Th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Market Zone Identity</Th>
                        <Th className="px-6 py-3.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</Th>
                        <Th className="px-6 py-3.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody className="divide-y divide-gray-100">
                      {paginatedZones.map((zone, idx) => (
                        <Tr key={zone._id || zone.id} className="hover:bg-gray-50/50 transition-colors group">
                          <Td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400">
                            {((currentPage - 1) * pageSize + idx + 1).toString().padStart(2, '0')}
                          </Td>
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex items-center gap-3">
                              <Div className="w-9 h-9 rounded-lg bg-[#FFC400]/10 flex items-center justify-center text-[#FFC400] shadow-sm border border-[#FFC400]/20 transition-transform group-hover:scale-105">
                                <UiIcon as={Target} size={16} />
                              </Div>
                              <Span className="font-semibold text-gray-900">{zone.name || zone.zone_name}</Span>
                            </Div>
                          </Td>
                          <Td className="px-6 py-4 whitespace-nowrap text-center">
                            <Button
                              onClick={() => handleStatusToggle(zone._id || zone.id, zone.active)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${zone.active ? 'bg-emerald-50 text-gray-900 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}
                            >
                              {zone.active ? 'Active' : 'Inactive'}
                            </Button>
                          </Td>
                          <Td className="px-6 py-4 whitespace-nowrap text-right">
                            <Div className="flex items-center justify-end gap-2 relative z-50">
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/taxi/admin/pricing/zone/edit/${zone._id || zone.id}`);
                                }}
                                className="p-2 text-gray-400 hover:text-[#0B1220] hover:bg-[#FFC400] rounded-lg transition-colors"
                              >
                                <UiIcon as={Edit2} size={14} />
                              </Button>
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(zone._id || zone.id);
                                }}
                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <UiIcon as={Trash2} size={14} />
                              </Button>
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleExplore(zone);
                                }}
                                className="p-2 text-gray-400 hover:text-[#0B1220] hover:bg-[#FFC400] rounded-lg transition-colors"
                              >
                                <UiIcon as={Globe} size={14} />
                              </Button>
                            </Div>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                ) : (
                  <Div className="py-20 text-center">
                    <Div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mx-auto mb-4">
                      <UiIcon as={Navigation} size={32} />
                    </Div>
                    <H3 className="text-sm text-gray-900 mb-1 font-bold">No Zones Configured</H3>
                    <P className="text-xs text-gray-400 max-w-xs mx-auto">Map your operational sector boundaries to initiate geofencing.</P>
                  </Div>
                )}
              </Div>

              {!loading && filteredZones.length > 0 && (
                <Div className="flex flex-col gap-4 border-t border-gray-100 bg-gray-50/40 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <Div className="flex items-center gap-3 text-xs text-gray-500">
                    <Span className="font-medium">
                      Showing {Math.min((currentPage - 1) * pageSize + 1, filteredZones.length)} to {Math.min(currentPage * pageSize, filteredZones.length)} of{' '}
                      {filteredZones.length} zones
                    </Span>
                    <Select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none transition-colors focus:border-[#FFC400]"
                    >
                      {[10, 20, 50].map((size) => (
                        <Option key={size} value={size}>
                          {size} / page
                        </Option>
                      ))}
                    </Select>
                  </Div>

                  <Div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-[#FFC400]/50 hover:text-[#0B1220] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </Button>
                    <Span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-700 border border-gray-200">
                      Page {currentPage} of {totalZonePages}
                    </Span>
                    <Button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalZonePages, page + 1))}
                      disabled={currentPage === totalZonePages}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-[#FFC400]/50 hover:text-[#0B1220] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </Button>
                  </Div>
                </Div>
              )}
            </Div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: -20,
            }}
            className="max-w-7xl mx-auto space-y-6 pb-20"
          >
            <Div className="mb-6">
              <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <Span>Pricing</Span>
                <UiIcon as={ChevronRight} size={12} />
                <Span>Zone Management</Span>
                <UiIcon as={ChevronRight} size={12} />
                <Span className="text-gray-700">{editingId ? 'Edit' : 'Create'}</Span>
              </Div>
              <Div className="flex items-center justify-between">
                <H1 className="text-xl text-gray-900 font-bold">{editingId ? 'Edit Market Zone' : 'Add Market Zone'}</H1>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/taxi/admin/pricing/zone');
                    setView('list');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm relative z-50"
                >
                  <UiIcon as={ArrowLeft} size={14} /> Back
                </Button>
              </Div>
            </Div>

            <Div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Form Section */}
              <Div className="xl:col-span-4 space-y-6">
                <Div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <Div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <Div className="w-9 h-9 rounded-lg bg-[#FFC400]/10 flex items-center justify-center text-[#FFC400]">
                      <UiIcon as={Tag} size={18} />
                    </Div>
                    <Div>
                      <H3 className="text-sm text-gray-900 font-bold">Zone Identity</H3>
                      <P className="text-xs text-gray-400">Basic identification settings</P>
                    </Div>
                  </Div>

                  <Div className="space-y-5">
                    <Div>
                      <Label className={labelClass}>Service Location</Label>
                      <Select
                        value={formData.service_location_id}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setFormData({
                            ...formData,
                            service_location_id: nextId,
                          });
                          const loc = serviceLocations.find((l) => String(l._id || l.id) === String(nextId));
                          if (loc?.latitude) {
                            const center = {
                              lat: Number(loc.latitude),
                              lng: Number(loc.longitude),
                            };
                            setMapCenter(center);
                            mapRef.current?.panTo(center);
                          }
                        }}
                        className={inputClass}
                      >
                        <Option value="">Select Service Location</Option>
                        {serviceLocations.map((sl) => (
                          <Option key={sl._id || sl.id} value={sl._id || sl.id}>
                            {sl.name || sl.service_location_name}
                          </Option>
                        ))}
                      </Select>
                    </Div>

                    <Div>
                      <HScroll className="flex items-center gap-1 border-b border-gray-100 mb-4 pb-1">
                        {ADMIN_LANGUAGE_OPTIONS.map((lang) => (
                          <Button
                            type="button"
                            key={lang}
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveTab(lang);
                            }}
                            className={`px-4 py-2 text-xs font-medium transition-colors relative whitespace-nowrap shrink-0 ${activeTab === lang ? 'text-[#FFC400]' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            {lang}
                            {activeTab === lang && <motion.div layoutId="activeTab" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#FFC400]" />}
                          </Button>
                        ))}
                      </HScroll>

                      <Div>
                        <Label className={labelClass}>Zone Name *</Label>
                        <Input
                          type="text"
                          value={formData.name[activeTab] || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              name: {
                                ...formData.name,
                                [activeTab]: e.target.value,
                              },
                            })
                          }
                          placeholder={`Name in ${activeTab}`}
                          className={inputClass}
                        />
                      </Div>
                    </Div>

                    <Div>
                      <Label className={labelClass}>Boundary Shape</Label>
                      <Div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            id: 'polygon',
                            label: 'Polygon Boundary',
                          },
                          {
                            id: 'circle',
                            label: 'Circle Radius',
                          },
                        ].map((option) => (
                          <Button
                            key={option.id}
                            type="button"
                            onClick={() => setBoundaryMode(option.id)}
                            className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${boundaryMode === option.id ? 'border-[#FFC400] bg-[#FFC400]/10 text-[#0B1220]' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </Div>
                    </Div>

                    {boundaryMode === 'circle' ? (
                      <Div>
                        <Label className={labelClass}>Circle Boundary Radius (meters)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={circleRadiusMeters}
                          onChange={(e) => setCircleRadiusMeters(e.target.value)}
                          placeholder="Enter circle radius in meters"
                          className={inputClass}
                        />
                      </Div>
                    ) : null}
                  </Div>
                </Div>

                <Div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 shadow-sm">
                  <Button
                    disabled={saving}
                    onClick={handleSave}
                    className="w-full py-3 bg-[#FFC400] text-[#0B1220] rounded-lg text-sm font-medium hover:brightness-95 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={Save} size={16} />}
                    {editingId ? 'Update Zone' : 'Save'}
                  </Button>
                  <Button
                    onClick={() => navigate('/taxi/admin/pricing/zone')}
                    className="w-full py-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </Button>
                </Div>
              </Div>

              {/* Map Section */}
              <Div className="xl:col-span-8 space-y-6">
                <Div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <Div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <Div className="w-full md:max-w-md">
                      <Div className="flex h-12 w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
                        <UiIcon as={Search} className="text-gray-400" size={18} />
                        {isLoaded ? (
                          <PlaceSearchField
                            onPlace={onPlaceChanged}
                            icon={null}
                            placeholder="Search for a city or zone"
                            className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none"
                          />
                        ) : (
                          <Input
                            type="text"
                            placeholder={loadError ? 'Google Maps failed to load' : 'Loading map search...'}
                            disabled
                            className="w-full bg-transparent text-sm font-semibold text-gray-400 outline-none placeholder:text-gray-400"
                          />
                        )}
                      </Div>
                    </Div>

                    <Div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                      <Div className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                        State and city labels remain visible while you draw zone boundaries.
                      </Div>
                      <Button
                        type="button"
                        onClick={() => {
                          setPolygonCoords([]);
                          setCircleCenter(null);
                          setCircleRadiusMeters('');
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-rose-600 shadow-sm transition-all border border-gray-200 hover:bg-rose-50 active:scale-95"
                      >
                        <UiIcon as={X} size={14} />
                        Clear Map
                      </Button>
                    </Div>
                  </Div>

                  <Div className="p-2">
                    {isLoaded ? (
                      <Div className="w-full rounded-lg overflow-hidden relative">
                        <Div className="pb-2">
                          <P className="text-[11px] font-semibold text-slate-500">
                            {boundaryMode === 'circle'
                              ? 'Tap the map to place the circle centre, then set its radius in the form.'
                              : 'Tap the map to add boundary points. Drag a point to move it, tap a point to remove it.'}
                          </P>
                        </Div>
                        <GMap
                          ref={mapRef}
                          className="w-full h-[460px] rounded-lg"
                          initialRegion={regionFor(polygonCoords.length ? polygonCoords : [mapCenter])}
                          mapType="standard"
                          onPress={handleMapPress}
                        >
                          {boundaryMode === 'polygon' && polygonCoords.length > 0 && (
                            <EditablePolygon
                              points={polygonCoords}
                              onChange={setPolygonCoords}
                              strokeColor="#FFC400"
                              fillColor="rgba(255,196,0,0.25)"
                              vertexColor="#FFC400"
                              onVertexPress={(index) => setPolygonCoords((prev) => prev.filter((_, i) => i !== index))}
                            />
                          )}
                          {boundaryMode === 'circle' && circleCenter && Number(circleRadiusMeters) > 0 ? (
                            <Circle
                              center={toLatLng(circleCenter)}
                              radius={Number(circleRadiusMeters)}
                              fillColor="rgba(255,196,0,0.18)"
                              strokeColor="#FFC400"
                              strokeWidth={2}
                            />
                          ) : null}
                          {countryBoundaryPaths.map((path, index) => (
                            <Polygon
                              key={index}
                              coordinates={path.map(toLatLng)}
                              strokeColor="#f43f5e"
                              fillColor="rgba(244,63,94,0.05)"
                              strokeWidth={1.5}
                              lineDashPattern={[5, 5]}
                              tappable={false}
                            />
                          ))}
                        </GMap>
                      </Div>
                    ) : (
                      <Div className="flex h-[460px] items-center justify-center bg-gray-50 rounded-lg">
                        <UiIcon as={Loader2} className="animate-spin text-gray-300" size={32} />
                      </Div>
                    )}
                  </Div>
                </Div>

                <Div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-amber-800 flex items-start gap-3 shadow-sm">
                  <UiIcon as={Info} size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <P className="text-sm font-medium">Avoid drawing multiple zones that overlap with each other.</P>
                </Div>

                <Div className="bg-gray-900 rounded-xl p-6 text-white overflow-hidden relative shadow-md">
                  <Div className="relative z-10">
                    <H4 className="text-sm mb-2 flex items-center gap-2 font-bold">
                      <UiIcon as={MapPin} size={16} className="text-[#FFC400]" /> Mapping Intelligence
                    </H4>
                    <P className="text-xs text-gray-300 leading-relaxed">
                      Use the polygon or circle tool at the top of the map to define your zone boundary. Click to place polygon vertices and close the shape, or
                      drop a circle and adjust its radius for a radial market boundary. The red dashed line represents the country boundary for reference.
                    </P>
                  </Div>
                </Div>
              </Div>
            </Div>
          </motion.div>
        )}
      </AnimatePresence>
    </ScrollDiv>
  );
};
export default ZoneManagement;
