import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Autocomplete, DrawingManager, GoogleMap, MarkerF, Polygon } from '@react-google-maps/api';
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
  Info
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { DISTRICT_CENTER, useDrawingGoogleMapsLoader } from '../../utils/googleMaps';

const inputClass = "w-full border border-neutral-200 rounded-lg px-4 py-2.5 text-sm text-neutral-800 bg-white focus:border-neutral-400 focus:ring-1 focus:ring-[#0a4d2b]/30 outline-none transition-colors";
const labelClass = "block text-xs font-medium text-neutral-500 mb-1.5";
const cardClass = "bg-white rounded-xl border border-neutral-200 p-6";
const AIRPORT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];
const AIRPORT_FORM_STATUS_OPTIONS = AIRPORT_STATUS_OPTIONS.filter((option) => option.value);

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

const defaultFormData = {
  name: '',
  service_location_id: '',
  status: 'active',
  latitude: '',
  longitude: '',
  airport_surge: '',
  support_airport_fee: '',
};

const Airport = ({ mode: initialMode = "list" }) => {
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
  const [autocomplete, setAutocomplete] = useState(null);
  const [boundaryCoords, setBoundaryCoords] = useState([]);
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
    setFormData({ ...defaultFormData, service_location_id: serviceLocationId });
    setBoundaryCoords([]);
    if (serviceLocation) {
      const lat = Number(serviceLocation.latitude);
      const lng = Number(serviceLocation.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setMapCenter({ lat, lng });
        return;
      }
    }
    setMapCenter(DISTRICT_CENTER);
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [airportsRes, serviceLocationsRes] = await Promise.allSettled([
        adminService.getAirports(),
        adminService.getServiceLocations(),
      ]);

      const nextAirports = airportsRes.status === 'fulfilled' ? (airportsRes.value?.data?.airports || airportsRes.value?.data || airportsRes.value?.results || (Array.isArray(airportsRes.value) ? airportsRes.value : [])) : [];
      const nextServiceLocations = serviceLocationsRes.status === 'fulfilled' ? (serviceLocationsRes.value?.data?.service_locations || serviceLocationsRes.value?.data || serviceLocationsRes.value?.results || (Array.isArray(serviceLocationsRes.value) ? serviceLocationsRes.value : [])) : [];

      setAirports(Array.isArray(nextAirports) ? nextAirports : []);
      setServiceLocations(Array.isArray(nextServiceLocations) ? nextServiceLocations : []);

      if (id && initialMode === 'edit') {
        const airportToEdit = nextAirports.find(a => (a._id || a.id) === id);
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
      const airportToEdit = airports.find(a => (a._id || a.id) === id);
      if (airportToEdit) handleEdit(airportToEdit);
    }
  }, [id, airports]);

  const filteredAirports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return airports.filter((airport) => {
      const matchesSearch = !query || [
        airport.name,
        airport.code,
        airport.terminal,
        airport.service_location_id?.name,
        airport.service_location_id?.service_location_name,
      ].filter(Boolean).some((val) => String(val).toLowerCase().includes(query));
      const airportServiceLocationId = String(airport.service_location_id?._id || airport.service_location_id || '');
      const matchesServiceLocation =
        !filters.service_location_id || airportServiceLocationId === String(filters.service_location_id);
      const matchesStatus =
        !filters.status || String(airport.status || 'active').toLowerCase() === filters.status;

      return matchesSearch && matchesServiceLocation && matchesStatus;
    });
  }, [airports, filters, searchTerm]);

  const updatePinnedLocation = (lat, lng) => {
    const nextLat = Number(lat);
    const nextLng = Number(lng);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
    setFormData(prev => ({ ...prev, latitude: nextLat.toFixed(6), longitude: nextLng.toFixed(6) }));
    setMapCenter({ lat: nextLat, lng: nextLng });
  };

  const handleMapClick = (event) => updatePinnedLocation(event.latLng?.lat(), event.latLng?.lng());
  const handleMarkerDragEnd = (event) => updatePinnedLocation(event.latLng?.lat(), event.latLng?.lng());

  const handlePlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    const lat = place.geometry?.location?.lat?.();
    const lng = place.geometry?.location?.lng?.();
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      updatePinnedLocation(lat, lng);
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(15);
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
        navigate("/taxi/admin/pricing/airport");
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
    if (airport.latitude && airport.longitude) setMapCenter({ lat: Number(airport.latitude), lng: Number(airport.longitude) });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this airport permanently?')) {
      try {
        const res = await adminService.deleteAirport(id);
        if (res?.success) setAirports(prev => prev.filter(a => a._id !== id && a.id !== id));
      } catch (err) { alert('Delete failed'); }
    }
  };

  const handleStatusUpdate = async (airport, nextStatus) => {
    const airportId = airport._id || airport.id;
    try {
      const res = await adminService.updateAirport(airportId, { status: nextStatus });
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
              active: updatedAirport?.active ?? (nextStatus === 'active'),
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

  const handleBoundaryComplete = (polygon) => {
    setBoundaryCoords(polygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() })));
    polygon.setMap(null);
  };

  const clearBoundary = () => { setBoundaryCoords([]); };
  const clearFilters = () => setFilters({ service_location_id: '', status: '' });

  return (
    <div className="min-h-screen bg-neutral-50 p-6 lg:p-8 animate-in fade-in duration-500 font-sans">
      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="max-w-7xl mx-auto space-y-6"
          >
            <div className="mb-6">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
                <span>Pricing</span>
                <ChevronRight size={12} />
                <span className="text-neutral-700">Airport management</span>
              </div>
              <div className="flex items-center justify-between">
                <h1 className="text-xl text-neutral-900 font-medium">Airport management</h1>
                <button 
                  type="button"
                  onClick={() => navigate("create")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0a4d2b] text-white rounded-lg text-sm font-medium hover:brightness-95 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Add airport
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
               <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-5">
                 <p className="text-xs text-neutral-500 mb-1">Total airports</p>
                 <h3 className="text-2xl font-medium text-neutral-900">{airports.length}</h3>
               </div>
               <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-5">
                 <p className="text-xs text-neutral-500 mb-1">Active airports</p>
                 <h3 className="text-2xl font-medium text-neutral-900">{airports.filter(a => (a.status || 'active').toLowerCase() === 'active' || a.active).length}</h3>
               </div>
               <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-5">
                 <p className="text-xs text-neutral-500 mb-1">Inactive airports</p>
                 <h3 className="text-2xl font-medium text-neutral-900">{airports.filter(a => (a.status || '').toLowerCase() === 'inactive' || a.active === false).length}</h3>
               </div>
               <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-5">
                 <p className="text-xs text-neutral-500 mb-1">Locations covered</p>
                 <h3 className="text-2xl font-medium text-neutral-900">{new Set(airports.map(a => a.service_location_id?._id || a.service_location_id).filter(Boolean)).size}</h3>
               </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/30">
                <div className="flex items-center gap-3 text-sm text-neutral-500">
                  <span>Show</span>
                  <select 
                    value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                    className="border border-neutral-200 rounded px-2 py-1 bg-white outline-none focus:border-neutral-400"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>entries</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input 
                      type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search airports" 
                      className="pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm outline-none focus:border-neutral-400 transition-colors w-64"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen((current) => !current)}
                    aria-expanded={isFilterOpen}
                    aria-label={isFilterOpen ? 'Hide filters' : 'Show filters'}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      isFilterOpen
                        ? 'border-neutral-200 bg-neutral-50 text-[#0a4d2b]'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-200 hover:bg-neutral-50 hover:text-[#0a4d2b]'
                    }`}
                  >
                    <Filter size={18} />
                    <span>{isFilterOpen ? 'Hide Filters' : 'Filters'}</span>
                  </button>
                </div>
              </div>

              {isFilterOpen ? (
                <div className="grid grid-cols-1 gap-4 border-b border-neutral-100 bg-white px-4 py-4 md:grid-cols-3">
                  <div>
                    <label className={labelClass}>Service location</label>
                    <select
                      value={filters.service_location_id}
                      onChange={(e) => setFilters((current) => ({ ...current, service_location_id: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">All service locations</option>
                      {serviceLocations.map((sl) => (
                        <option key={sl._id || sl.id} value={sl._id || sl.id}>
                          {sl.name || sl.service_location_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
                      className={inputClass}
                    >
                      {AIRPORT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value || 'all'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="h-[42px] w-full rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                    >
                      Reset filters
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-6 py-4 text-left font-medium text-neutral-700">Airport name</th>
                      <th className="px-6 py-4 text-left font-medium text-neutral-700">Service location</th>
                      <th className="px-6 py-4 text-center font-medium text-neutral-700">Status</th>
                      <th className="px-6 py-4 text-right font-medium text-neutral-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="py-20 text-center text-neutral-500">
                          <Loader2 className="animate-spin mx-auto mb-2" />
                          <span>Loading data...</span>
                        </td>
                      </tr>
                    ) : filteredAirports.length > 0 ? (
                      filteredAirports.slice(0, entriesPerPage).map(airport => (
                        <tr key={airport._id || airport.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-neutral-50 flex items-center justify-center text-[#0a4d2b]">
                                <Plane size={14} />
                              </div>
                              <span className="font-medium text-neutral-900">
                                {airport.name}
                                {airport.code && <span className="ml-2 text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">{airport.code}</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-neutral-600">
                            {airport.service_location_id?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <select
                              value={String(airport.status || 'active').toLowerCase()}
                              onChange={(event) => handleStatusUpdate(airport, event.target.value)}
                              className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 outline-none transition-colors hover:border-neutral-200 focus:border-neutral-400"
                            >
                              {AIRPORT_FORM_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 text-neutral-500 relative z-50">
                              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`edit/${airport._id || airport.id}`); }} className="p-1.5 hover:text-neutral-900 hover:bg-[#06381e] rounded-lg transition-colors text-white"><Edit2 size={14} /></button>
                              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(airport._id || airport.id); }} className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-24 text-center">
                          <Plane size={48} className="mx-auto mb-4 text-neutral-300" />
                          <h3 className="text-neutral-900 mb-1 font-medium">No airports available</h3>
                          <p className="text-sm text-neutral-500 mb-6">Create your first airport to enable airport pricing</p>
                          <button 
                            type="button"
                            onClick={() => navigate("create")}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a4d2b] text-white rounded-lg text-sm font-medium hover:brightness-95 transition-colors shadow-sm"
                          >
                            <Plus size={16} /> Add airport
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="max-w-7xl mx-auto space-y-6"
          >
            <div className="mb-6">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
                <span>Pricing</span>
                <ChevronRight size={12} />
                <span>Airport management</span>
                <ChevronRight size={12} />
                <span className="text-neutral-700">{id ? 'Edit' : 'Create'}</span>
              </div>
              <div className="flex items-center justify-between">
                <h1 className="text-xl text-neutral-900 font-medium">{id ? 'Edit Airport' : 'Add Airport'}</h1>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate("/taxi/admin/pricing/airport"); setView('list'); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm relative z-50"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-12 lg:xl:col-span-5 space-y-6">
                <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
                   <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                        <Plane size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm text-neutral-900 font-medium">Airport details</h3>
                        <p className="text-xs text-neutral-500">Configure core airport terminal data</p>
                      </div>
                   </div>

                   <div className="space-y-5">
                      <div>
                        <label className={labelClass}>
                          <MapPin size={12} className="inline mr-1 text-neutral-500" />
                          Service Location *
                        </label>
                        <select 
                          value={formData.service_location_id}
                          onChange={(e) => {
                            const sid = e.target.value;
                            setFormData(p => ({ ...p, service_location_id: sid }));
                            const loc = serviceLocations.find(l => (l._id || l.id) === sid);
                            if (loc) {
                              const center = { lat: Number(loc.latitude), lng: Number(loc.longitude) };
                              setMapCenter(center);
                              mapRef.current?.panTo(center);
                            }
                          }}
                          className={inputClass}
                        >
                          <option value="">Select Service Location</option>
                          {serviceLocations.map(sl => <option key={sl._id || sl.id} value={sl._id || sl.id}>{sl.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>
                          <Tag size={12} className="inline mr-1 text-neutral-500" />
                          Airport Name *
                        </label>
                        <input 
                          type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                          placeholder="Enter airport name"
                          className={inputClass}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>
                            <Globe size={12} className="inline mr-1 text-neutral-500" />
                            Airport surge fee
                          </label>
                          <p className="text-xs text-neutral-500 mb-2">Extra pickup/drop charge for airport trips</p>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.airport_surge}
                            onChange={(e) => setFormData(p => ({ ...p, airport_surge: e.target.value }))}
                            placeholder="Enter airport surge fee"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass}>
                            <Globe size={12} className="inline mr-1 text-neutral-500" />
                            Support airport fee
                          </label>
                          <p className="text-xs text-neutral-500 mb-2">Additional operational airport support fee</p>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.support_airport_fee}
                            onChange={(e) => setFormData(p => ({ ...p, support_airport_fee: e.target.value }))}
                            placeholder="Enter support airport fee"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>
                          <Tag size={12} className="inline mr-1 text-neutral-500" />
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                          className={inputClass}
                        >
                          {AIRPORT_FORM_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-3">
                   <button 
                     type="button"
                     onClick={handleSave} disabled={saving}
                     className="w-full py-3 bg-[#0a4d2b] text-white rounded-lg text-sm font-medium hover:brightness-95 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                     {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     {id ? 'Update Airport' : 'Save Airport'}
                   </button>
                   <button 
                     type="button"
                     onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate("/taxi/admin/pricing/airport"); setView('list'); }}
                     className="w-full py-3 bg-neutral-50 text-neutral-600 border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-100 transition-colors"
                   >
                     Cancel
                   </button>
                </div>
              </div>

<div className="xl:col-span-12 lg:xl:col-span-7">
                <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-2 h-[600px] relative overflow-hidden">
                  {isLoaded ? (
                    <div className="w-full h-full rounded-lg overflow-hidden relative">
                       <div className="absolute inset-x-4 top-4 z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="w-full md:max-w-md">
                            <div className="flex h-12 w-full items-center gap-3 rounded-2xl border border-neutral-100 bg-white/95 px-4 shadow-xl backdrop-blur-sm">
                              <Search className="text-neutral-500" size={18} />
                              <Autocomplete
                                onLoad={(a) => setAutocomplete(a)}
                                onPlaceChanged={handlePlaceChanged}
                                className="flex-1"
                              >
                                <input
                                  type="text"
                                  placeholder="Search for a city or airport"
                                  className="w-full bg-transparent text-sm font-medium text-neutral-800 outline-none placeholder:text-neutral-500"
                                />
                              </Autocomplete>
                            </div>
                          </div>

                          {boundaryCoords.length > 0 ? (
                            <button
                              type="button"
                              onClick={clearBoundary}
                              className="self-start rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-rose-600 transition-colors border border-neutral-900/[0.08] hover:bg-rose-50"
                            >
                              Clear boundary
                            </button>
                          ) : null}
                       </div>
                       
                       <GoogleMap
                         mapContainerStyle={MAP_CONTAINER_STYLE}
                         center={mapCenter} zoom={13}
                         onLoad={m => { mapRef.current = m; }}
                         onClick={handleMapClick}
                         options={{
                            mapTypeId: 'roadmap',
                            disableDefaultUI: false,
                            zoomControl: true,
                            mapTypeControl: true,
                            clickableIcons: true,
                            streetViewControl: false,
                            fullscreenControl: true
                         }}
                       >
                         {boundaryCoords.length > 0 && <Polygon paths={boundaryCoords} options={{ fillColor: '#0a4d2b', strokeColor: '#0a4d2b', fillOpacity: 0.1, strokeWeight: 2 }} />}
                         
                         <MarkerF 
                            position={{ lat: Number(formData.latitude || mapCenter.lat), lng: Number(formData.longitude || mapCenter.lng) }} 
                            draggable onDragEnd={handleMarkerDragEnd}
                            icon={window.google ? {
                              path: window.google.maps.SymbolPath.CIRCLE,
                              scale: 6,
                              fillColor: "#0a4d2b",
                              fillOpacity: 1,
                              strokeColor: "white",
                              strokeWeight: 2
                            } : undefined}
                         />

                         <DrawingManager
                            onPolygonComplete={handleBoundaryComplete}
                            options={{
                              drawingControl: true,
                              drawingControlOptions: {
                                position: window.google ? window.google.maps.ControlPosition.RIGHT_TOP : 6,
                                drawingModes: ['polygon']
                              },
                              polygonOptions: { fillColor: '#0a4d2b', strokeColor: '#0a4d2b', fillOpacity: 0.1, strokeWeight: 2 }
                            }}
                         />
                       </GoogleMap>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-neutral-50 rounded-lg">
                       <Loader2 className="animate-spin text-neutral-300" size={32} />
                    </div>
                  )}
                </div>

                <div className="mt-6 bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-start gap-3">
                   <Info size={18} className="text-[#0a4d2b] shrink-0 mt-0.5" />
                   <p className="text-xs text-neutral-900 leading-relaxed font-medium">
                     Use the polygon tool at the top of the map to define the precise operational boundary for this airport. This allows for automated geofencing of ride requests.
                   </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Airport;
