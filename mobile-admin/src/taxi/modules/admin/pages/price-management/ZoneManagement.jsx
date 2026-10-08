/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/ZoneManagement.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { Search, Plus, Edit2, Trash2, Navigation, Loader2, Target, Save, ArrowLeft, Globe, Info, Zap, X } from 'lucide-react-native';
import { Circle, EditablePolygon, GMap, Polygon, fromLatLng, regionFor, toLatLng } from '../../../../../components/maps';
import { useDrawingGoogleMapsLoader } from '../../utils/googleMaps';
import { adminService } from '../../services/adminService';
import { buildCountryBoundaryUrl, normalizeBoundaryRings, isDriverAvailable } from '../../utils/mapUtils';
import PlaceSearchField from './PlaceSearchField';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  Pagination,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, HScroll, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
const ADMIN_LANGUAGE_OPTIONS = ['English', 'Hindi', 'Arabic', 'French', 'Spanish'];
const ZONE_COLS = [60, 230, 130, 140];
const ZONE_LABELS = ['S.No', 'Market zone', 'Status', 'Actions'];
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
  const { columns, tablet } = useLayoutWidth();
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
  if (view === 'list') {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Target}
          title="Zone management"
          subtitle="Geofenced boundaries for operational control"
          breadcrumb={[{ label: 'Taxi' }, { label: 'Pricing' }, { label: 'Zones' }]}
          actions={
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/taxi/admin/pricing/zone/create');
              }}
              className={BTN_PRIMARY}
            >
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add market zone</Span>
            </Button>
          }
        />

        <Card className="mb-4">
          <Div className="flex-row items-center justify-between gap-3">
            <Div className="flex-1 min-w-0">
              <Span className="text-base font-semibold text-slate-900">Dynamic peak pricing</Span>
              <Span className="text-sm text-slate-500">Surge modifiers across every zone</Span>
            </Div>
            <Button
              type="button"
              accessibilityLabel={enablePeakZoneGlobal ? 'Turn off dynamic peak pricing' : 'Turn on dynamic peak pricing'}
              onClick={() => setEnablePeakZoneGlobal(!enablePeakZoneGlobal)}
              className="h-11 flex-row items-center gap-2"
            >
              <UiIcon as={Zap} size={16} className={enablePeakZoneGlobal ? 'text-green-700' : 'text-slate-400'} />
              <Div className={`w-12 h-7 rounded-full justify-center px-1 ${enablePeakZoneGlobal ? 'bg-green-600' : 'bg-slate-300'}`}>
                <Div className={`w-5 h-5 rounded-full bg-white ${enablePeakZoneGlobal ? 'self-end' : 'self-start'}`} />
              </Div>
            </Button>
          </Div>
        </Card>

        <Card className="mb-4">
          <Toolbar className="mb-0">
            <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search zones"
                className="flex-1 text-sm text-slate-900"
              />
            </Div>
            <Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className={`${INPUT} w-32`}>
              {[10, 20, 50].map((size) => (
                <Option key={size} value={size}>
                  {size} / page
                </Option>
              ))}
            </Select>
          </Toolbar>
        </Card>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : fetchError ? (
          <ErrorState title="Could not load zones" message={fetchError} onRetry={fetchData} />
        ) : filteredZones.length === 0 ? (
          <EmptyState
            icon={Navigation}
            title={zones.length ? 'No zones match your search' : 'No zones configured'}
            message={zones.length ? 'Try a different zone name.' : 'Map your operational boundaries to start geofencing.'}
            actionLabel={zones.length ? undefined : 'Add market zone'}
            onAction={zones.length ? undefined : () => navigate('/taxi/admin/pricing/zone/create')}
          />
        ) : (
          <>
            <DataTable cols={ZONE_COLS}>
              <THead cols={ZONE_COLS} labels={ZONE_LABELS} />
              <TBody>
                {paginatedZones.map((zone, idx, all) => (
                  <Row key={zone._id || zone.id} last={idx === all.length - 1}>
                    <Cell width={ZONE_COLS[0]}>{((currentPage - 1) * pageSize + idx + 1).toString().padStart(2, '0')}</Cell>
                    <Cell width={ZONE_COLS[1]}>
                      <Span className="text-sm font-semibold text-slate-900">{zone.name || zone.zone_name || 'Unnamed zone'}</Span>
                    </Cell>
                    <Cell width={ZONE_COLS[2]}>
                      <Button
                        type="button"
                        accessibilityLabel={`Toggle status for ${zone.name || zone.zone_name || 'zone'}`}
                        onClick={() => handleStatusToggle(zone._id || zone.id, zone.active)}
                        className="h-11 justify-center"
                      >
                        <StatusBadge status={zone.active ? 'active' : 'inactive'} />
                      </Button>
                    </Cell>
                    <Cell width={ZONE_COLS[3]}>
                      <Div className="flex-row items-center gap-1">
                        <Button
                          type="button"
                          accessibilityLabel={`Edit ${zone.name || 'zone'}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/taxi/admin/pricing/zone/edit/${zone._id || zone.id}`);
                          }}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Edit2} size={16} className="text-slate-600" />
                        </Button>
                        <Button
                          type="button"
                          accessibilityLabel={`Explore ${zone.name || 'zone'} on the map`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleExplore(zone);
                          }}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Globe} size={16} className="text-slate-600" />
                        </Button>
                        <Button
                          type="button"
                          accessibilityLabel={`Delete ${zone.name || 'zone'}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(zone._id || zone.id);
                          }}
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    </Cell>
                  </Row>
                ))}
              </TBody>
            </DataTable>
            <Pagination
              page={currentPage}
              pages={totalZonePages}
              total={filteredZones.length}
              onPrev={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNext={() => setCurrentPage((page) => Math.min(totalZonePages, page + 1))}
            />
          </>
        )}
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Target}
        title={editingId ? 'Edit market zone' : 'Add market zone'}
        subtitle="Name the zone, then draw its boundary on the map"
        breadcrumb={[{ label: 'Taxi' }, { label: 'Zones', onPress: () => navigate('/taxi/admin/pricing/zone') }, { label: editingId ? 'Edit' : 'Create' }]}
        actions={
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/taxi/admin/pricing/zone');
              setView('list');
            }}
            className={BTN_SECONDARY}
          >
            <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Back</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <SectionTitle>Zone identity</SectionTitle>
        <Div className={`grid grid-cols-${columns} gap-3`}>
          <Field label="Service location">
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
              className={INPUT}
            >
              <Option value="">Select service location</Option>
              {serviceLocations.map((sl) => (
                <Option key={sl._id || sl.id} value={sl._id || sl.id}>
                  {sl.name || sl.service_location_name}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label={`Zone name (${activeTab})`} required>
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
              className={INPUT}
            />
          </Field>
        </Div>

        <Span className="text-xs font-semibold uppercase text-slate-500 mt-3 mb-2">Language</Span>
        <HScroll contentClassName="flex-row gap-2">
          {ADMIN_LANGUAGE_OPTIONS.map((lang) => (
            <Button
              type="button"
              key={lang}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(lang);
              }}
              className={activeTab === lang ? BTN_PRIMARY : BTN_SECONDARY}
            >
              <Span className={activeTab === lang ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{lang}</Span>
            </Button>
          ))}
        </HScroll>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Boundary shape</SectionTitle>
        <Div className="flex-row gap-2">
          {[
            {
              id: 'polygon',
              label: 'Polygon boundary',
            },
            {
              id: 'circle',
              label: 'Circle radius',
            },
          ].map((option) => (
            <Button
              key={option.id}
              type="button"
              onClick={() => setBoundaryMode(option.id)}
              className={`${boundaryMode === option.id ? BTN_PRIMARY : BTN_SECONDARY} flex-1`}
            >
              <Span className={boundaryMode === option.id ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{option.label}</Span>
            </Button>
          ))}
        </Div>
        {boundaryMode === 'circle' ? (
          <Field label="Circle boundary radius (metres)" className="mt-3">
            <Input
              type="number"
              min="1"
              value={circleRadiusMeters}
              onChange={(e) => setCircleRadiusMeters(e.target.value)}
              placeholder="Enter radius in metres"
              className={INPUT}
            />
          </Field>
        ) : null}
      </Card>

      <Card className="mb-4">
        <SectionTitle
          action={
            <Button
              type="button"
              onClick={() => {
                setPolygonCoords([]);
                setCircleCenter(null);
                setCircleRadiusMeters('');
              }}
              className={BTN_SECONDARY}
            >
              <UiIcon as={X} size={16} className="text-red-600" />
              <Span className="text-sm font-semibold text-red-600">Clear map</Span>
            </Button>
          }
        >
          Boundary
        </SectionTitle>

        <Div className="gap-3">
          <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            {isLoaded ? (
              <PlaceSearchField onPlace={onPlaceChanged} icon={null} placeholder="Search for a city or zone" className="flex-1 text-sm text-slate-900" />
            ) : (
              <Input
                type="text"
                placeholder={loadError ? 'Google Maps failed to load' : 'Loading map search…'}
                disabled
                className="flex-1 text-sm text-slate-400"
              />
            )}
          </Div>

          <Span className="text-xs text-slate-500">
            {boundaryMode === 'circle'
              ? 'Tap the map to place the circle centre, then set its radius above.'
              : 'Tap the map to add boundary points. Drag a point to move it, tap a point to remove it.'}
          </Span>

          {loadError ? (
            <ErrorState title="Map could not load" message="Check the Google Maps key, then try again." />
          ) : isLoaded ? (
            <GMap
              ref={mapRef}
              className="w-full h-[400px] rounded-lg"
              initialRegion={regionFor(polygonCoords.length ? polygonCoords : [mapCenter])}
              mapType="standard"
              onPress={handleMapPress}
            >
              {boundaryMode === 'polygon' && polygonCoords.length > 0 && (
                <EditablePolygon
                  points={polygonCoords}
                  onChange={setPolygonCoords}
                  strokeColor="#155DFC"
                  fillColor="rgba(21,93,252,0.2)"
                  vertexColor="#155DFC"
                  onVertexPress={(index) => setPolygonCoords((prev) => prev.filter((_, i) => i !== index))}
                />
              )}
              {boundaryMode === 'circle' && circleCenter && Number(circleRadiusMeters) > 0 ? (
                <Circle
                  center={toLatLng(circleCenter)}
                  radius={Number(circleRadiusMeters)}
                  fillColor="rgba(21,93,252,0.15)"
                  strokeColor="#155DFC"
                  strokeWidth={2}
                />
              ) : null}
              {countryBoundaryPaths.map((path, index) => (
                <Polygon
                  key={index}
                  coordinates={path.map(toLatLng)}
                  strokeColor="#C10007"
                  fillColor="rgba(193,0,7,0.05)"
                  strokeWidth={1.5}
                  lineDashPattern={[5, 5]}
                  tappable={false}
                />
              ))}
            </GMap>
          ) : (
            <Div className="h-[400px] rounded-lg bg-slate-100 items-center justify-center">
              <UiIcon as={Loader2} size={28} className="text-slate-400" />
              <Span className="text-sm text-slate-500 mt-2">{boundaryLoading ? 'Loading boundary…' : 'Loading map…'}</Span>
            </Div>
          )}

          <Div className="flex-row items-start gap-2 p-3 rounded-lg bg-blue-50">
            <UiIcon as={Info} size={16} className="text-blue-700 shrink-0 mt-0.5" />
            <Span className="text-xs text-slate-700 flex-1">
              Avoid drawing zones that overlap. The red dashed line is the country boundary, shown for reference only.
            </Span>
          </Div>
        </Div>
      </Card>

      <Card className={`${tablet ? 'flex-row justify-end' : ''} gap-3`}>
        <Button type="button" onClick={() => navigate('/taxi/admin/pricing/zone')} className={BTN_SECONDARY}>
          <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
        </Button>
        <Button type="button" disabled={saving} onClick={handleSave} className={BTN_PRIMARY}>
          <UiIcon as={Save} size={16} className="text-white" />
          <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : editingId ? 'Update zone' : 'Save zone'}</Span>
        </Button>
      </Card>
    </AdminPage>
  );
};
export default ZoneManagement;
