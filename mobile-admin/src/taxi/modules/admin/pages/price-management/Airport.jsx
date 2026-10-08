/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/Airport.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { EditablePolygon, GMap, Marker, fromLatLng, regionFor, toLatLng } from '../../../../../components/maps';
import PlaceSearchField from './PlaceSearchField';
import { ArrowLeft, Edit2, Loader2, Plus, Save, Search, Trash2, Plane, Filter, Info, MapPinned, CheckCircle2, XCircle } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { DISTRICT_CENTER, useDrawingGoogleMapsLoader } from '../../utils/googleMaps';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
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
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
const AIRPORT_COLS = [210, 170, 150, 96];
const AIRPORT_LABELS = ['Airport', 'Service location', 'Status', 'Actions'];
const AIRPORT_STATUS_OPTIONS = [
  {
    value: '',
    label: 'All statuses',
  },
  {
    value: 'active',
    label: 'Active',
  },
  {
    value: 'inactive',
    label: 'Inactive',
  },
];
const AIRPORT_FORM_STATUS_OPTIONS = AIRPORT_STATUS_OPTIONS.filter((option) => option.value);
const defaultFormData = {
  name: '',
  service_location_id: '',
  status: 'active',
  latitude: '',
  longitude: '',
  airport_surge: '',
  support_airport_fee: '',
};
const Airport = ({ mode: initialMode = 'list' }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [view, setView] = useState(initialMode);
  const [airports, setAirports] = useState([]);
  const [serviceLocations, setServiceLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedAirportId, setSelectedAirportId] = useState(id || null);
  const [formData, setFormData] = useState(defaultFormData);
  const [mapCenter, setMapCenter] = useState(DISTRICT_CENTER);
  const [boundaryCoords, setBoundaryCoords] = useState([]);
  // The web draws the boundary with Google's DrawingManager polygon tool; here
  // the tool is a mode in which each map tap appends a vertex (guide §3, Maps).
  const [drawingBoundary, setDrawingBoundary] = useState(false);
  const [filters, setFilters] = useState({
    service_location_id: '',
    status: '',
  });
  const mapRef = useRef(null);
  const { columns, tablet } = useLayoutWidth();
  const { isLoaded, loadError } = useDrawingGoogleMapsLoader();
  useEffect(() => {
    setView(initialMode);
    if (initialMode === 'list') {
      resetFormState();
    }
  }, [initialMode]);
  const resetFormState = (serviceLocationId = '', serviceLocation = null) => {
    setSelectedAirportId(null);
    setFormData({
      ...defaultFormData,
      service_location_id: serviceLocationId,
    });
    setBoundaryCoords([]);
    if (serviceLocation) {
      const lat = Number(serviceLocation.latitude);
      const lng = Number(serviceLocation.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setMapCenter({
          lat,
          lng,
        });
        return;
      }
    }
    setMapCenter(DISTRICT_CENTER);
  };
  const fetchData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [airportsRes, serviceLocationsRes] = await Promise.allSettled([adminService.getAirports(), adminService.getServiceLocations()]);
      const nextAirports =
        airportsRes.status === 'fulfilled'
          ? airportsRes.value?.data?.airports ||
            airportsRes.value?.data ||
            airportsRes.value?.results ||
            (Array.isArray(airportsRes.value) ? airportsRes.value : [])
          : [];
      const nextServiceLocations =
        serviceLocationsRes.status === 'fulfilled'
          ? serviceLocationsRes.value?.data?.service_locations ||
            serviceLocationsRes.value?.data ||
            serviceLocationsRes.value?.results ||
            (Array.isArray(serviceLocationsRes.value) ? serviceLocationsRes.value : [])
          : [];
      setAirports(Array.isArray(nextAirports) ? nextAirports : []);
      setServiceLocations(Array.isArray(nextServiceLocations) ? nextServiceLocations : []);
      if (id && initialMode === 'edit') {
        const airportToEdit = nextAirports.find((a) => (a._id || a.id) === id);
        if (airportToEdit) handleEdit(airportToEdit);
      }
    } catch (error) {
      console.error('Airport fetch error:', error);
      setErrorMessage(`Failed to connect to backend.`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    if (id && airports.length > 0 && initialMode === 'edit') {
      const airportToEdit = airports.find((a) => (a._id || a.id) === id);
      if (airportToEdit) handleEdit(airportToEdit);
    }
  }, [id, airports]);
  const filteredAirports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return airports.filter((airport) => {
      const matchesSearch =
        !query ||
        [airport.name, airport.code, airport.terminal, airport.service_location_id?.name, airport.service_location_id?.service_location_name]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query));
      const airportServiceLocationId = String(airport.service_location_id?._id || airport.service_location_id || '');
      const matchesServiceLocation = !filters.service_location_id || airportServiceLocationId === String(filters.service_location_id);
      const matchesStatus = !filters.status || String(airport.status || 'active').toLowerCase() === filters.status;
      return matchesSearch && matchesServiceLocation && matchesStatus;
    });
  }, [airports, filters, searchTerm]);
  const updatePinnedLocation = (lat, lng) => {
    const nextLat = Number(lat);
    const nextLng = Number(lng);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
    setFormData((prev) => ({
      ...prev,
      latitude: nextLat.toFixed(6),
      longitude: nextLng.toFixed(6),
    }));
    setMapCenter({
      lat: nextLat,
      lng: nextLng,
    });
  };
  const handleMapClick = (event) => {
    const point = fromLatLng(event.nativeEvent.coordinate);
    if (drawingBoundary) {
      setBoundaryCoords((prev) => [...prev, point]);
      return;
    }
    updatePinnedLocation(point.lat, point.lng);
  };
  const handleMarkerDragEnd = (event) => {
    const point = fromLatLng(event.nativeEvent.coordinate);
    updatePinnedLocation(point.lat, point.lng);
  };
  const panTo = (center) => {
    mapRef.current?.animateToRegion(
      {
        ...toLatLng(center),
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      400,
    );
  };
  const handlePlaceChanged = (place) => {
    const lat = place.geometry?.location?.lat?.();
    const lng = place.geometry?.location?.lng?.();
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      updatePinnedLocation(lat, lng);
      panTo({
        lat,
        lng,
      });
    }
  };
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.service_location_id) {
      alert('Airport name and service location are required.');
      return;
    }
    if (formData.airport_surge && Number(formData.airport_surge) < 0) {
      alert('Airport surge fee must be greater than or equal to 0.');
      return;
    }
    if (formData.support_airport_fee && Number(formData.support_airport_fee) < 0) {
      alert('Support airport fee must be greater than or equal to 0.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        boundary_coordinates: boundaryCoords,
      };
      const res = selectedAirportId ? await adminService.updateAirport(selectedAirportId, payload) : await adminService.createAirport(payload);
      if (res?.success || res?.status === 200 || res?.status === 201) {
        navigate('/taxi/admin/pricing/airport');
        fetchData();
        resetFormState();
      } else {
        alert(res?.data?.message || res?.message || 'Failed to save airport');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Server error occurred');
    } finally {
      setSaving(false);
    }
  };
  const handleEdit = (airport) => {
    setSelectedAirportId(airport._id || airport.id);
    setFormData({
      name: airport.name || '',
      service_location_id: airport.service_location_id?._id || airport.service_location_id || '',
      latitude: airport.latitude ?? '',
      longitude: airport.longitude ?? '',
      airport_surge: airport.airport_surge ?? '',
      support_airport_fee: airport.support_airport_fee ?? '',
      status: airport.status || 'active',
    });
    setBoundaryCoords(Array.isArray(airport.boundary_coordinates) ? airport.boundary_coordinates : []);
    if (airport.latitude && airport.longitude)
      setMapCenter({
        lat: Number(airport.latitude),
        lng: Number(airport.longitude),
      });
  };
  const handleDelete = async (id) => {
    if (await window.confirmAsync('Delete this airport permanently?')) {
      try {
        const res = await adminService.deleteAirport(id);
        if (res?.success) setAirports((prev) => prev.filter((a) => a._id !== id && a.id !== id));
      } catch (err) {
        alert('Delete failed');
      }
    }
  };
  const handleStatusUpdate = async (airport, nextStatus) => {
    const airportId = airport._id || airport.id;
    try {
      const res = await adminService.updateAirport(airportId, {
        status: nextStatus,
      });
      const updatedAirport = res?.data || res;
      if (res?.success || res?.status === 200 || updatedAirport?._id || updatedAirport?.id) {
        setAirports((prev) =>
          prev.map((item) => {
            if ((item._id || item.id) !== airportId) {
              return item;
            }
            return {
              ...item,
              ...updatedAirport,
              status: updatedAirport?.status || nextStatus,
              active: updatedAirport?.active ?? nextStatus === 'active',
            };
          }),
        );
      } else {
        alert(res?.message || 'Failed to update airport status');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update airport status');
    }
  };
  const clearBoundary = () => {
    setBoundaryCoords([]);
    setDrawingBoundary(false);
  };
  const clearFilters = () =>
    setFilters({
      service_location_id: '',
      status: '',
    });
  const totalAirports = airports.length;
  const activeAirports = airports.filter((a) => (a.status || 'active').toLowerCase() === 'active' || a.active).length;
  const inactiveAirports = airports.filter((a) => (a.status || '').toLowerCase() === 'inactive' || a.active === false).length;
  const locationsCovered = new Set(airports.map((a) => a.service_location_id?._id || a.service_location_id).filter(Boolean)).size;
  if (view === 'list') {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Plane}
          title="Airport Management"
          subtitle="Airport pickup zones, surge and support fees"
          breadcrumb={[{ label: 'Taxi' }, { label: 'Pricing' }, { label: 'Airports' }]}
          actions={
            <Button type="button" onClick={() => navigate('/taxi/admin/pricing/airport/create')} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add airport</Span>
            </Button>
          }
        />

        <StatGrid className="mb-4">
          <StatCard label="Total airports" value={String(totalAirports)} icon={Plane} tone="info" />
          <StatCard label="Active" value={String(activeAirports)} icon={CheckCircle2} tone="success" />
          <StatCard label="Inactive" value={String(inactiveAirports)} icon={XCircle} tone="danger" />
          <StatCard label="Locations covered" value={String(locationsCovered)} icon={MapPinned} tone="warning" hint="Service locations with an airport" />
        </StatGrid>

        <Card className="mb-4">
          <SectionTitle
            action={
              <Button
                type="button"
                onClick={() => setIsFilterOpen((current) => !current)}
                accessibilityLabel={isFilterOpen ? 'Hide filters' : 'Show filters'}
                className={BTN_SECONDARY}
              >
                <UiIcon as={Filter} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>{isFilterOpen ? 'Hide filters' : 'Filters'}</Span>
              </Button>
            }
          >
            Search
          </SectionTitle>
          <Toolbar className="mb-0">
            <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search airports"
                className="flex-1 text-sm text-slate-900"
              />
            </Div>
            <Select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className={`${INPUT} w-32`}>
              <Option value={10}>10 per page</Option>
              <Option value={20}>20 per page</Option>
              <Option value={50}>50 per page</Option>
            </Select>
          </Toolbar>
          {isFilterOpen ? (
            <Div className={`grid grid-cols-${columns} gap-3 mt-3`}>
              <Field label="Service location">
                <Select
                  value={filters.service_location_id}
                  onChange={(e) =>
                    setFilters((current) => ({
                      ...current,
                      service_location_id: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  <Option value="">All service locations</Option>
                  {serviceLocations.map((sl) => (
                    <Option key={sl._id || sl.id} value={sl._id || sl.id}>
                      {sl.name || sl.service_location_name}
                    </Option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((current) => ({
                      ...current,
                      status: e.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  {AIRPORT_STATUS_OPTIONS.map((option) => (
                    <Option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Field>
              <Div className="justify-end">
                <Button type="button" onClick={clearFilters} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Reset filters</Span>
                </Button>
              </Div>
            </Div>
          ) : null}
        </Card>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : errorMessage ? (
          <ErrorState title="Could not load airports" message={errorMessage} onRetry={fetchData} />
        ) : filteredAirports.length === 0 ? (
          <EmptyState
            icon={Plane}
            title={airports.length ? 'No airports match these filters' : 'No airports yet'}
            message={airports.length ? 'Clear the search or filters to see every airport.' : 'Create your first airport to enable airport pricing.'}
            actionLabel={airports.length ? 'Reset filters' : 'Add airport'}
            onAction={airports.length ? clearFilters : () => navigate('/taxi/admin/pricing/airport/create')}
          />
        ) : (
          <DataTable cols={AIRPORT_COLS}>
            <THead cols={AIRPORT_COLS} labels={AIRPORT_LABELS} />
            <TBody>
              {filteredAirports.slice(0, entriesPerPage).map((airport, i, all) => (
                <Row key={airport._id || airport.id} last={i === all.length - 1}>
                  <Cell width={AIRPORT_COLS[0]}>
                    <Span className="text-sm font-semibold text-slate-900">{airport.name || 'Unnamed airport'}</Span>
                    {airport.code ? <Span className="text-xs text-slate-500 mt-0.5">{String(airport.code).toUpperCase()}</Span> : null}
                  </Cell>
                  <Cell width={AIRPORT_COLS[1]}>{airport.service_location_id?.name || '—'}</Cell>
                  <Cell width={AIRPORT_COLS[2]}>
                    <Select
                      value={String(airport.status || 'active').toLowerCase()}
                      onChange={(event) => handleStatusUpdate(airport, event.target.value)}
                      className={`${INPUT} w-full`}
                    >
                      {AIRPORT_FORM_STATUS_OPTIONS.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Cell>
                  <Cell width={AIRPORT_COLS[3]}>
                    <Div className="flex-row items-center gap-1">
                      <Button
                        type="button"
                        accessibilityLabel={`Edit ${airport.name || 'airport'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/taxi/admin/pricing/airport/edit/${airport._id || airport.id}`);
                        }}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                      >
                        <UiIcon as={Edit2} size={16} className="text-slate-600" />
                      </Button>
                      <Button
                        type="button"
                        accessibilityLabel={`Delete ${airport.name || 'airport'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(airport._id || airport.id);
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
        )}
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Plane}
        title={id ? 'Edit airport' : 'Add airport'}
        subtitle="Pin the terminal, draw its boundary and set the airport fees"
        breadcrumb={[{ label: 'Taxi' }, { label: 'Pricing' }, { label: 'Airports' }, { label: id ? 'Edit' : 'Create' }]}
        actions={
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/taxi/admin/pricing/airport');
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
        <SectionTitle>Airport details</SectionTitle>
        <Div className={`grid grid-cols-${columns} gap-3`}>
          <Field label="Service location" required>
            <Select
              value={formData.service_location_id}
              onChange={(e) => {
                const sid = e.target.value;
                setFormData((p) => ({
                  ...p,
                  service_location_id: sid,
                }));
                const loc = serviceLocations.find((l) => (l._id || l.id) === sid);
                if (loc) {
                  const center = {
                    lat: Number(loc.latitude),
                    lng: Number(loc.longitude),
                  };
                  setMapCenter(center);
                  panTo(center);
                }
              }}
              className={INPUT}
            >
              <Option value="">Select service location</Option>
              {serviceLocations.map((sl) => (
                <Option key={sl._id || sl.id} value={sl._id || sl.id}>
                  {sl.name}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Airport name" required>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  name: e.target.value,
                }))
              }
              placeholder="Enter airport name"
              className={INPUT}
            />
          </Field>

          <Field label="Airport surge fee" hint="Extra pickup/drop charge for airport trips">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.airport_surge}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  airport_surge: e.target.value,
                }))
              }
              placeholder="0.00"
              className={INPUT}
            />
          </Field>

          <Field label="Support airport fee" hint="Additional operational airport support fee">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.support_airport_fee}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  support_airport_fee: e.target.value,
                }))
              }
              placeholder="0.00"
              className={INPUT}
            />
          </Field>

          <Field label="Status">
            <Select
              value={formData.status}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  status: e.target.value,
                }))
              }
              className={INPUT}
            >
              {AIRPORT_FORM_STATUS_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Field>
        </Div>
      </Card>

      <Card className="mb-4">
        <SectionTitle
          action={
            boundaryCoords.length > 0 ? (
              <Button type="button" onClick={clearBoundary} className={BTN_SECONDARY}>
                <Span className="text-sm font-semibold text-red-600">Clear boundary</Span>
              </Button>
            ) : null
          }
        >
          Location &amp; boundary
        </SectionTitle>
        {loadError ? (
          <ErrorState title="Map could not load" message="Check the Google Maps key, then try again." />
        ) : isLoaded ? (
          <Div className="gap-3">
            <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <PlaceSearchField placeholder="Search for a city or airport" onPlace={handlePlaceChanged} icon={null} className="flex-1 text-sm text-slate-900" />
            </Div>
            <Button type="button" onClick={() => setDrawingBoundary((current) => !current)} className={drawingBoundary ? BTN_PRIMARY : BTN_SECONDARY}>
              <Span className={drawingBoundary ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{drawingBoundary ? 'Done drawing' : 'Draw boundary'}</Span>
            </Button>
            <GMap
              ref={mapRef}
              className="w-full h-[360px] rounded-lg"
              initialRegion={regionFor(boundaryCoords.length ? boundaryCoords : [mapCenter])}
              mapType="standard"
              onPress={handleMapClick}
            >
              {boundaryCoords.length > 0 ? (
                <EditablePolygon
                  points={boundaryCoords}
                  onChange={setBoundaryCoords}
                  editable={drawingBoundary}
                  strokeColor="#155DFC"
                  fillColor="rgba(21,93,252,0.1)"
                  onVertexPress={(index) => {
                    if (drawingBoundary) setBoundaryCoords((prev) => prev.filter((_, i) => i !== index));
                  }}
                />
              ) : null}

              <Marker
                coordinate={toLatLng({
                  lat: Number(formData.latitude || mapCenter.lat),
                  lng: Number(formData.longitude || mapCenter.lng),
                })}
                draggable
                pinColor="#155DFC"
                onDragEnd={handleMarkerDragEnd}
              />
            </GMap>
            <Div className="flex-row items-start gap-2 p-3 rounded-lg bg-blue-50">
              <UiIcon as={Info} size={16} className="text-blue-700 shrink-0 mt-0.5" />
              <Span className="text-xs text-slate-700 flex-1">
                Tap Draw boundary, then tap the map to add each corner of the operational boundary. Drag the pin to move the terminal itself.
              </Span>
            </Div>
          </Div>
        ) : (
          <Div className="h-[360px] rounded-lg bg-slate-100 items-center justify-center">
            <UiIcon as={Loader2} size={28} className="text-slate-400" />
            <Span className="text-sm text-slate-500 mt-2">Loading map…</Span>
          </Div>
        )}
      </Card>

      <Card className={`${tablet ? 'flex-row justify-end' : ''} gap-3`}>
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate('/taxi/admin/pricing/airport');
            setView('list');
          }}
          className={BTN_SECONDARY}
        >
          <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
          <UiIcon as={Save} size={16} className="text-white" />
          <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : id ? 'Update airport' : 'Save airport'}</Span>
        </Button>
      </Card>
    </AdminPage>
  );
};
export default Airport;
