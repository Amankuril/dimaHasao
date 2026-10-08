/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/Airport.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from '../../../../../lib/motion';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { EditablePolygon, GMap, Marker, fromLatLng, regionFor, toLatLng } from '../../../../../components/maps';
import PlaceSearchField from './PlaceSearchField';
import {
  ArrowLeft,
  Edit2,
  Eraser,
  Loader2,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  ChevronRight,
  Plane,
  FileSearch,
  Maximize2,
  Filter,
  Globe,
  Tag,
  Info,
} from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { DISTRICT_CENTER, useDrawingGoogleMapsLoader } from '../../utils/googleMaps';
import {
  Button,
  Div,
  H1,
  H3,
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
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';
const labelClass = 'block text-xs font-semibold text-gray-500 mb-1.5';
const cardClass = 'bg-white rounded-xl border border-gray-200 p-6';
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
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8 animate-in fade-in duration-500 font-sans">
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
                <Span className="text-gray-700">Airport Management</Span>
              </Div>
              <Div className="flex items-center justify-between">
                <H1 className="text-xl text-gray-900 font-bold">Airport Management</H1>
                <Button
                  type="button"
                  onClick={() => navigate('/taxi/admin/pricing/airport/create')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FFC400] text-[#0B1220] rounded-lg text-sm font-medium hover:brightness-95 transition-colors shadow-sm"
                >
                  <UiIcon as={Plus} size={16} /> Add Airport
                </Button>
              </Div>
            </Div>

            {/* Summary Cards */}
            <Div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <P className="text-xs font-semibold text-gray-500 mb-1">Total Airports</P>
                <H3 className="text-2xl font-bold text-gray-900">{airports.length}</H3>
              </Div>
              <Div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <P className="text-xs font-semibold text-gray-500 mb-1">Active Airports</P>
                <H3 className="text-2xl font-bold text-gray-900">
                  {airports.filter((a) => (a.status || 'active').toLowerCase() === 'active' || a.active).length}
                </H3>
              </Div>
              <Div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <P className="text-xs font-semibold text-gray-500 mb-1">Inactive Airports</P>
                <H3 className="text-2xl font-bold text-gray-900">
                  {airports.filter((a) => (a.status || '').toLowerCase() === 'inactive' || a.active === false).length}
                </H3>
              </Div>
              <Div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <P className="text-xs font-semibold text-gray-500 mb-1">Locations Covered</P>
                <H3 className="text-2xl font-bold text-gray-900">
                  {new Set(airports.map((a) => a.service_location_id?._id || a.service_location_id).filter(Boolean)).size}
                </H3>
              </Div>
            </Div>

            <Div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <Div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <Div className="flex items-center gap-3 text-sm text-gray-500">
                  <Span>Show</Span>
                  <Select
                    value={entriesPerPage}
                    onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                    className="border border-gray-200 rounded px-2 py-1 bg-white outline-none focus:border-indigo-500"
                  >
                    <Option value={10}>10</Option>
                    <Option value={20}>20</Option>
                    <Option value={50}>50</Option>
                  </Select>
                  <Span>entries</Span>
                </Div>
                <Div className="flex items-center gap-2">
                  <Div className="relative">
                    <UiIcon as={Search} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search airports..."
                      className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-all w-64"
                    />
                  </Div>
                  <Button
                    type="button"
                    onClick={() => setIsFilterOpen((current) => !current)}
                    accessibilityLabel={isFilterOpen ? 'Hide filters' : 'Show filters'}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${isFilterOpen ? 'border-indigo-200 bg-indigo-50 text-indigo-600' : 'border-gray-200 bg-white text-gray-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'}`}
                  >
                    <UiIcon as={Filter} size={18} />
                    <Span>{isFilterOpen ? 'Hide Filters' : 'Filters'}</Span>
                  </Button>
                </Div>
              </Div>

              {isFilterOpen ? (
                <Div className="grid grid-cols-1 gap-4 border-b border-gray-100 bg-white px-4 py-4 md:grid-cols-3">
                  <Div>
                    <Label className={labelClass}>Service Location</Label>
                    <Select
                      value={filters.service_location_id}
                      onChange={(e) =>
                        setFilters((current) => ({
                          ...current,
                          service_location_id: e.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <Option value="">All service locations</Option>
                      {serviceLocations.map((sl) => (
                        <Option key={sl._id || sl.id} value={sl._id || sl.id}>
                          {sl.name || sl.service_location_name}
                        </Option>
                      ))}
                    </Select>
                  </Div>

                  <Div>
                    <Label className={labelClass}>Status</Label>
                    <Select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters((current) => ({
                          ...current,
                          status: e.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      {AIRPORT_STATUS_OPTIONS.map((option) => (
                        <Option key={option.value || 'all'} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                  </Div>

                  <Div className="flex items-end">
                    <Button
                      type="button"
                      onClick={clearFilters}
                      className="h-[42px] w-full rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      Reset Filters
                    </Button>
                  </Div>
                </Div>
              ) : null}

              <Table cols={[220, 170, 140, 110]} className="w-full text-sm">
                  <Thead>
                    <Tr className="bg-gray-50 border-b border-gray-200">
                      <Th className="px-6 py-4 text-left font-semibold text-gray-700">Airport Name</Th>
                      <Th className="px-6 py-4 text-left font-semibold text-gray-700">Service Location</Th>
                      <Th className="px-6 py-4 text-center font-semibold text-gray-700">Status</Th>
                      <Th className="px-6 py-4 text-right font-semibold text-gray-700">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <Tr>
                        <Td colSpan="4" className="py-20 text-center text-gray-400">
                          <UiIcon as={Loader2} className="animate-spin mx-auto mb-2" />
                          <Span>Loading data...</Span>
                        </Td>
                      </Tr>
                    ) : filteredAirports.length > 0 ? (
                      filteredAirports.slice(0, entriesPerPage).map((airport) => (
                        <Tr key={airport._id || airport.id} className="hover:bg-gray-50/50 transition-colors">
                          <Td className="px-6 py-4">
                            <Div className="flex items-center gap-3">
                              <Div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <UiIcon as={Plane} size={14} />
                              </Div>
                              <Span className="font-medium text-gray-900">
                                {airport.name}
                                {airport.code && (
                                  <Span className="ml-2 text-[10px] font-bold tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 uppercase">
                                    {airport.code}
                                  </Span>
                                )}
                              </Span>
                            </Div>
                          </Td>
                          <Td className="px-6 py-4 text-gray-600">{airport.service_location_id?.name || 'N/A'}</Td>
                          <Td className="px-6 py-4 text-center">
                            <Select
                              value={String(airport.status || 'active').toLowerCase()}
                              onChange={(event) => handleStatusUpdate(airport, event.target.value)}
                              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 outline-none transition-colors hover:border-indigo-200 focus:border-indigo-500"
                            >
                              {AIRPORT_FORM_STATUS_OPTIONS.map((option) => (
                                <Option key={option.value} value={option.value}>
                                  {option.label}
                                </Option>
                              ))}
                            </Select>
                          </Td>
                          <Td className="px-6 py-4 text-right">
                            <Div className="flex justify-end gap-2 text-gray-400 relative z-50">
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/taxi/admin/pricing/airport/edit/${airport._id || airport.id}`);
                                }}
                                className="p-1.5 hover:text-[#0B1220] hover:bg-[#FFC400] rounded-lg transition-colors"
                              >
                                <UiIcon as={Edit2} size={14} />
                              </Button>
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(airport._id || airport.id);
                                }}
                                className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <UiIcon as={Trash2} size={14} />
                              </Button>
                            </Div>
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr>
                        <Td colSpan="4" className="py-24 text-center">
                          <UiIcon as={Plane} size={48} className="mx-auto mb-4 text-gray-300" />
                          <H3 className="text-gray-900 mb-1 font-bold">No Airports Available</H3>
                          <P className="text-sm text-gray-500 mb-6">Create your first airport to enable airport pricing.</P>
                          <Button
                            type="button"
                            onClick={() => navigate('/taxi/admin/pricing/airport/create')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFC400] text-[#0B1220] rounded-lg text-sm font-medium hover:brightness-95 transition-colors shadow-sm"
                          >
                            <UiIcon as={Plus} size={16} /> Add Airport
                          </Button>
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
              </Table>
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
            className="max-w-7xl mx-auto space-y-6"
          >
            <Div className="mb-6">
              <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                <Span>Pricing</Span>
                <UiIcon as={ChevronRight} size={12} />
                <Span>Airport Management</Span>
                <UiIcon as={ChevronRight} size={12} />
                <Span className="text-gray-700">{id ? 'Edit' : 'Create'}</Span>
              </Div>
              <Div className="flex items-center justify-between">
                <H1 className="text-xl text-gray-900 font-bold">{id ? 'Edit Airport' : 'Add Airport'}</H1>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/taxi/admin/pricing/airport');
                    setView('list');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm relative z-50"
                >
                  <UiIcon as={ArrowLeft} size={14} /> Back
                </Button>
              </Div>
            </Div>

            <Div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <Div className="xl:col-span-12 lg:xl:col-span-5 space-y-6">
                <Div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <Div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <Div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <UiIcon as={Plane} size={18} />
                    </Div>
                    <Div>
                      <H3 className="text-sm text-gray-900 font-bold">Airport Details</H3>
                      <P className="text-xs text-gray-400">Configure core airport terminal data</P>
                    </Div>
                  </Div>

                  <Div className="space-y-5">
                    <Div>
                      <Label className={labelClass}>
                        <UiIcon as={MapPin} size={12} className="inline mr-1 text-gray-400" />
                        Service Location *
                      </Label>
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
                        className={inputClass}
                      >
                        <Option value="">Select Service Location</Option>
                        {serviceLocations.map((sl) => (
                          <Option key={sl._id || sl.id} value={sl._id || sl.id}>
                            {sl.name}
                          </Option>
                        ))}
                      </Select>
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        <UiIcon as={Tag} size={12} className="inline mr-1 text-gray-400" />
                        Airport Name *
                      </Label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Enter Airport Name"
                        className={inputClass}
                      />
                    </Div>

                    <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Div>
                        <Label className={labelClass}>
                          <UiIcon as={Globe} size={12} className="inline mr-1 text-gray-400" />
                          Airport Surge Fee
                        </Label>
                        <P className="text-[10px] text-gray-400 mb-2">Extra pickup/drop charge for airport trips.</P>
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
                          placeholder="Enter airport surge fee"
                          className={inputClass}
                        />
                      </Div>

                      <Div>
                        <Label className={labelClass}>
                          <UiIcon as={Globe} size={12} className="inline mr-1 text-gray-400" />
                          Support Airport Fee
                        </Label>
                        <P className="text-[10px] text-gray-400 mb-2">Additional operational airport support fee.</P>
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
                          placeholder="Enter support airport fee"
                          className={inputClass}
                        />
                      </Div>
                    </Div>

                    <Div>
                      <Label className={labelClass}>
                        <UiIcon as={Tag} size={12} className="inline mr-1 text-gray-400" />
                        Status
                      </Label>
                      <Select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            status: e.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        {AIRPORT_FORM_STATUS_OPTIONS.map((option) => (
                          <Option key={option.value} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </Div>
                  </Div>
                </Div>

                <Div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 bg-[#FFC400] text-[#0B1220] rounded-lg text-sm font-medium hover:brightness-95 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={Save} size={16} />}
                    {id ? 'Update Airport' : 'Save Airport'}
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate('/taxi/admin/pricing/airport');
                      setView('list');
                    }}
                    className="w-full py-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </Button>
                </Div>
              </Div>

              <Div className="xl:col-span-12 lg:xl:col-span-7">
                <Div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm relative overflow-hidden">
                  {isLoaded ? (
                    <Div className="w-full rounded-lg overflow-hidden relative">
                      <Div className="flex flex-col gap-3 pb-3">
                        <Div className="w-full">
                          <Div className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 shadow-sm">
                            <UiIcon as={Search} className="text-gray-400" size={18} />
                            <PlaceSearchField
                              placeholder="Search for a city or airport"
                              onPlace={handlePlaceChanged}
                              icon={null}
                              className="w-full bg-transparent text-sm font-semibold text-gray-800 outline-none"
                            />
                          </Div>
                        </Div>

                        <Div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => setDrawingBoundary((current) => !current)}
                            className={`rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest shadow-sm transition-all border ${drawingBoundary ? 'border-indigo-200 bg-indigo-600 text-white' : 'border-gray-100 bg-white text-indigo-600'}`}
                          >
                            {drawingBoundary ? 'Done Drawing' : 'Draw Boundary'}
                          </Button>
                          {boundaryCoords.length > 0 ? (
                            <Button
                              type="button"
                              onClick={clearBoundary}
                              className="rounded-xl bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-rose-600 shadow-sm transition-all border border-gray-100 active:scale-95"
                            >
                              Clear Boundary
                            </Button>
                          ) : null}
                        </Div>
                      </Div>

                      <GMap
                        ref={mapRef}
                        className="w-full h-[420px] rounded-lg"
                        initialRegion={regionFor(boundaryCoords.length ? boundaryCoords : [mapCenter])}
                        mapType="standard"
                        onPress={handleMapClick}
                      >
                        {boundaryCoords.length > 0 ? (
                          <EditablePolygon
                            points={boundaryCoords}
                            onChange={setBoundaryCoords}
                            editable={drawingBoundary}
                            strokeColor="#4f46e5"
                            fillColor="rgba(79,70,229,0.1)"
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
                          pinColor="#4f46e5"
                          onDragEnd={handleMarkerDragEnd}
                        />
                      </GMap>
                    </Div>
                  ) : (
                    <Div className="flex items-center justify-center h-[420px] bg-gray-50 rounded-lg">
                      <UiIcon as={Loader2} className="animate-spin text-gray-300" size={32} />
                    </Div>
                  )}
                </Div>

                <Div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                  <UiIcon as={Info} size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                  <P className="text-xs text-indigo-900 leading-relaxed font-medium">
                    Use the Draw Boundary button above the map and tap the map to define the precise operational boundary for this airport. This allows for
                    automated geofencing of ride requests.
                  </P>
                </Div>
              </Div>
            </Div>
          </motion.div>
        )}
      </AnimatePresence>
    </ScrollDiv>
  );
};
export default Airport;
