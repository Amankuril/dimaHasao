import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, Filter, Edit, Trash, Check, X, Shield, Globe, Car, Bike, Info, LayoutGrid,
  Trash2, ChevronRight, MapPin, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
  Settings2, Package, Zap, ArrowRight, Edit3, MoreHorizontal, Rocket
} from 'lucide-react';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';

// ─── Tiny helpers ──────────────────────────────────────────────────────────────
const Tog = ({ on, onToggle }) => (
  <button onClick={onToggle} className={`transition-colors ${on ? 'text-emerald-500' : 'text-neutral-200'}`}>
    {on ? <ToggleRight size={26} strokeWidth={2} /> : <ToggleLeft size={26} strokeWidth={2} />}
  </button>
);

const Pill = ({ label, variant = 'gray' }) => {
  const cls = {
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50  text-amber-600  border-amber-100',
    gray:  'bg-neutral-100  text-neutral-500   border-neutral-200',
    blue:  'bg-neutral-50   text-[#0a4d2b]   border-neutral-200',
    dark:  'bg-neutral-950  text-white       border-neutral-950',
  }[variant];
  return <span className={`px-2 py-0.5 text-xs font-medium   border rounded-md ${cls}`}>{label}</span>;
};

const getLucideIcon = (iconId, size = 18) => {
  switch(iconId) {
    case 'taxi_icon': return <Car size={size} />;
    case 'bike_icon': return <Bike size={size} />;
    case 'delivery_icon': return <Package size={size} />;
    case 'auto_icon': return <Zap size={size} />;
    case 'cab_icon': return <Car size={size} />;
    default: return <Car size={size} />;
  }
};

// ─── Modal shell ───────────────────────────────────────────────────────────────
const Modal = ({ title, subtitle, onClose, children, footer }) => (
  <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
      <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-neutral-50">
        <div>
          <h3 className="text-[16px] font-medium text-neutral-950 leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-800">
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
      {footer && <div className="px-6 pb-6">{footer}</div>}
    </div>
  </div>
);

const Field = ({ label, ...props }) => (
  <div>
    <label className="text-xs text-neutral-500 mb-1.5 block">{label}</label>
    <input
      {...props}
      className="w-full h-11 border border-neutral-100 bg-neutral-50 rounded-xl px-3.5 text-[13px] font-medium text-neutral-900 focus:outline-none focus:border-neutral-300 focus:bg-white transition-colors"
    />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
const ServiceConfig = () => {
  const [services, setServices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('services');
  const [selLocId, setSelLocId] = useState(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('adminToken') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YzdiZTZhYmJlOTJlYjYwMGYwMmQxNiIsImVtYWlsIjoiYWRtaW5AYWRtaW4uY29tIiwibW9iaWxlIjoiOTk5OTk5OTk5OSIsInJvbGUiOiJzdXBlci1hZG1pbiIsImlhdCI6MTc3NTA0OTExNywiZXhwIjoxODA2NTg1MTE3fQ.5KJmXJwaVefWhnc97EqtArkA1z7ZOhsJwA9fbyRVPdQ';
        
        const [locRes, rideRes] = await Promise.all([
          fetch(API_BASE_URL + '/admin/service-locations', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(API_BASE_URL + '/common/ride_modules', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const locData = await locRes.json();
        const rideData = await rideRes.json();

        if (locData.success) {
          const locs = (locData.data || []).map(l => ({
            id: l._id,
            city: l.service_location_name || 'Unknown',
            state: l.country?.name || 'India',
            active: l.active,
            vehicles: [] 
          }));
          setLocations(locs);
          if (locs.length > 0) setSelLocId(locs[0].id);
        }

        if (rideData.success) {
          const raw = rideData.data;
          const rideArray = Array.isArray(raw) ? raw : Object.keys(raw).map(key => ({ 
            id: key, 
            label: key.charAt(0).toUpperCase() + key.slice(1), 
            active: true,
            desc: `Core ${key} services`
          }));
          setServices(rideArray);
        }
      } catch (err) {
        console.error('Service Config Fetch Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch Vehicles when selection changes
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!selLocId) return;
      try {
        const token = localStorage.getItem('adminToken') || '';
        const res = await fetch(`${API_BASE_URL}/types/${selLocId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          const vList = (data.data || []).map(v => ({
            id: v._id,
            label: v.name,
            icon: v.transport_type === 'bike' ? 'bike_icon' : 'taxi_icon',
            services: [v.transport_type],
            active: true
          }));
          setLocations(prev => prev.map(l => l.id === selLocId ? { ...l, vehicles: vList } : l));
        }
      } catch (err) { console.error("Vehicle fetch error:", err); }
    };
    fetchVehicles();
  }, [selLocId]);

  // modal state
  const [modal, setModal] = useState(null); // null | 'service' | 'location' | 'vehicle'
  const [draft, setDraft] = useState({});

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const openModal = (type, init = {}) => { setDraft(init); setModal(type); };
  const closeModal = () => { setModal(null); setDraft({}); };

  // ── Service actions ──────────────────────────────────────────────────────────
  const toggleService = (id) => {
    setServices(p => p.map(s => s.id === id ? { ...s, active: !s.active } : s));
    showToast('Service updated');
  };
  const deleteService = (id) => { setServices(p => p.filter(s => s.id !== id)); showToast('Service removed'); };
  const saveService = () => {
    if (!draft.label?.trim()) return;
    if (draft._edit) {
      setServices(p => p.map(s => s.id === draft.id ? { ...s, label: draft.label, emoji: draft.emoji || '🚗', desc: draft.desc } : s));
      showToast('Service updated');
    } else {
      const id = draft.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
      setServices(p => [...p, { id, label: draft.label, emoji: draft.emoji || '🚗', desc: draft.desc || '', active: true }]);
      showToast('Service added');
    }
    closeModal();
  };

  // ── Location actions ─────────────────────────────────────────────────────────
  const toggleLocation = (id) => {
    setLocations(p => p.map(l => l.id === id ? { ...l, active: !l.active } : l));
    showToast('Location updated');
  };
  const deleteLocation = (id) => {
    setLocations(p => p.filter(l => l.id !== id));
    if (selLocId === id) setSelLocId(locations.find(l => l.id !== id)?.id || null);
    showToast('Location removed');
  };
  const saveLocation = () => {
    if (!draft.city?.trim()) return;
    const id = draft.city.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newLoc = { id, city: draft.city, state: draft.state || '', active: true, vehicles: [] };
    setLocations(p => [...p, newLoc]);
    setSelLocId(id);
    showToast('Location added');
    closeModal();
  };

  // ── Vehicle actions ──────────────────────────────────────────────────────────
  const toggleVehicle = (locId, vId) => {
    setLocations(p => p.map(l =>
      l.id === locId ? { ...l, vehicles: l.vehicles.map(v => v.id === vId ? { ...v, active: !v.active } : v) } : l
    ));
    showToast('Vehicle updated');
  };
  const deleteVehicle = (locId, vId) => {
    setLocations(p => p.map(l =>
      l.id === locId ? { ...l, vehicles: l.vehicles.filter(v => v.id !== vId) } : l
    ));
    showToast('Vehicle removed');
  };
  const saveVehicle = () => {
    if (!draft.label?.trim() || !selLocId) return;
    const id = draft.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const v = { id, label: draft.label, emoji: draft.emoji || '🚗', services: draft.services || [], active: true };
    setLocations(p => p.map(l => l.id === selLocId ? { ...l, vehicles: [...l.vehicles, v] } : l));
    showToast('Vehicle added');
    closeModal();
  };

  const toggleDraftService = (sid) => {
    setDraft(p => ({
      ...p,
      services: (p.services || []).includes(sid)
        ? (p.services || []).filter(s => s !== sid)
        : [...(p.services || []), sid],
    }));
  };

  const selLoc    = locations.find(l => l.id === selLocId);
  const filtered  = locations.filter(l => l.city.toLowerCase().includes(search.toLowerCase()) || l.state.toLowerCase().includes(search.toLowerCase()));

  // Summary stats
  const totalVehicles  = locations.reduce((a, l) => a + l.vehicles.length, 0);
  const activeVehicles = locations.reduce((a, l) => a + l.vehicles.filter(v => v.active).length, 0);
  const activeServices  = services.filter(s => s.active).length;
  const activeLocs      = locations.filter(l => l.active).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-neutral-100 border-t-black rounded-full animate-spin"></div>
        <p className="text-[12px] text-neutral-500">Loading Configuration...</p>
      </div>
    );
  }

  return (
    <div className="font-sans text-neutral-950 animate-in fade-in duration-500 space-y-7">

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed top-5 right-6 z-[300] flex items-center gap-2.5 bg-neutral-950 text-white px-4 py-2.5 rounded-2xl text-[12px] font-medium shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 size={14} className="text-emerald-400" /> {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-neutral-900 leading-none">Service config</h1>
          <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-neutral-500">
            <span className="text-neutral-700 font-medium">Driver mgmt</span>
            <ChevronRight size={12} />
            <span>Registration setup</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live — Captains see changes instantly
        </div>
      </div>

      {/* ── STAT ROW ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Service Types', value: services.length, sub: `${activeServices} active`, accent: 'text-[#0a4d2b]', bg: 'bg-neutral-50' },
          { label: 'Active Zones',  value: activeLocs,      sub: `of ${locations.length} cities`, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Vehicle Types', value: totalVehicles,   sub: `${activeVehicles} visible`,     accent: 'text-[#0a4d2b]', bg: 'bg-neutral-50' },
          { label: 'Inactive Zones',value: locations.filter(l => !l.active).length, sub: 'not serving', accent: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-neutral-900/[0.08] rounded-xl p-5">
            <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <Settings2 size={15} className={s.accent} />
            </div>
            <p className="text-2xl font-medium text-neutral-950 leading-none">{s.value}</p>
            <p className="text-xs text-neutral-500 mt-1.5">{s.label}</p>
            <p className={`text-xs font-medium ${s.accent} mt-1  `}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-neutral-50 border border-neutral-100 rounded-2xl p-1 w-fit">
        {[
          { id: 'services',  label: <div className="flex items-center gap-2"><LayoutGrid size={14} /> Service types</div> },
          { id: 'locations', label: <div className="flex items-center gap-2"><MapPin size={14} /> Locations & vehicles</div> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-[12px] font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-neutral-950 shadow-sm border border-neutral-100'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════ SERVICE TYPES TAB ══════════════════════════════ */}
      {tab === 'services' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-medium text-neutral-900">Service types</h2>
              <p className="text-[12px] text-neutral-500 mt-0.5">Captains pick from these options when registering</p>
            </div>
            <button
              onClick={() => openModal('service')}
              className="flex items-center gap-2 bg-neutral-950 text-white px-4 py-2.5 rounded-xl text-[12px] font-medium hover:opacity-90 transition-colors shadow-sm"
            >
              <Plus size={14} /> Add type
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Fixed "Both" card */}
            <div className="rounded-2xl p-5 text-white shadow-xl bg-neutral-950">
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl text-primary"><Rocket size={32} /></span>
                <Pill label="Always On" variant="green" />
              </div>
              <h3 className="text-[16px] font-medium leading-none">Both services</h3>
              <p className="text-xs text-neutral-500 mt-1">Taxi + Delivery combined</p>
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-xs text-neutral-500">Fixed — cannot be removed</span>
              </div>
            </div>

            {services.map(s => (
              <div key={s.id} className={`bg-white border rounded-2xl p-5 shadow-sm transition-colors ${s.active ? 'border-neutral-100' : 'border-neutral-100 opacity-50'}`}>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl text-primary">{getLucideIcon(s.icon_id || 'taxi_icon', 32)}</span>
                  <div className="flex items-center gap-2">
                    <Pill label={s.active ? 'Active' : 'Off'} variant={s.active ? 'green' : 'gray'} />
                    <button
                      onClick={() => openModal('service', { ...s, _edit: true })}
                      className="p-1 text-neutral-300 hover:text-neutral-700 transition-colors"
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
                </div>
                <h3 className="text-[15px] font-medium text-neutral-950 leading-none">{s.label}</h3>
                <p className="text-xs text-neutral-500 mt-1">{s.desc}</p>
                <div className="mt-5 pt-3 border-t border-neutral-50 flex items-center justify-between">
                  <Tog on={s.active} onToggle={() => toggleService(s.id)} />
                  <button onClick={() => deleteService(s.id)} className="p-1.5 rounded-lg text-neutral-200 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add card */}
            <button
              onClick={() => openModal('service')}
              className="border-2 border-dashed border-neutral-150 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-neutral-300 hover:border-neutral-300 hover:text-neutral-500 transition-colors min-h-[160px] group"
            >
              <Plus size={24} className="transition-transform" />
              <span className="text-xs font-medium">Add service</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════ LOCATIONS TAB ══════════════════════════════ */}
      {tab === 'locations' && (
        <div className="grid grid-cols-[280px,1fr] gap-6">

          {/* LEFT — location list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-medium text-neutral-900">Cities</h2>
              <button onClick={() => openModal('location')} className="flex items-center gap-1 bg-neutral-950 text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:opacity-90 transition-colors">
                <Plus size={12} /> Add
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300" size={13} />
              <input
                type="text"
                placeholder="Search city"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 bg-neutral-50 border border-neutral-100 rounded-xl text-[12px] font-medium focus:outline-none focus:border-neutral-300 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              {filtered.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelLocId(loc.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    selLocId === loc.id
                      ? 'bg-neutral-950 border-neutral-950 text-white shadow-sm'
                      : 'bg-white border-neutral-100 text-neutral-700 hover:border-neutral-200 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${selLocId === loc.id ? 'bg-white/10' : 'bg-neutral-50'}`}>
                    <MapPin size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium leading-tight truncate ${selLocId === loc.id ? 'text-white' : 'text-neutral-950'}`}>{loc.city}</p>
                    <p className={`text-xs font-medium ${selLocId === loc.id ? 'text-neutral-500' : 'text-neutral-500'}`}>{loc.state} · {loc.vehicles.length}v</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${loc.active ? 'bg-emerald-400' : 'bg-neutral-300'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT — vehicle config for selected location */}
          {!selLoc ? (
            <div className="flex flex-col items-center justify-center gap-3 text-neutral-300 border-2 border-dashed border-neutral-100 rounded-2xl min-h-[300px]">
              <MapPin size={36} strokeWidth={1} />
              <p className="text-[12px] font-medium">Select a city</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Selected location header */}
              <div className="bg-white border border-neutral-900/[0.08] rounded-xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl text-primary"><MapPin size={24} /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[17px] font-medium text-neutral-950">{selLoc.city}</h2>
                      <Pill label={selLoc.active ? 'Active' : 'Inactive'} variant={selLoc.active ? 'green' : 'gray'} />
                    </div>
                    <p className="text-xs text-neutral-500">{selLoc.state} · {selLoc.vehicles.length} vehicle types</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tog on={selLoc.active} onToggle={() => toggleLocation(selLoc.id)} />
                  <button onClick={() => deleteLocation(selLoc.id)} className="p-2 rounded-xl text-neutral-200 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2.5 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="text-[#0a4d2b] mt-0.5 shrink-0" />
                <p className="text-xs font-medium text-[#0a4d2b]">
                  Captains registering in <strong>{selLoc.city}</strong> will only see vehicles matching their chosen service type.
                </p>
              </div>

              {/* Vehicle header + add */}
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-medium text-neutral-900">Vehicle types in {selLoc.city}</h3>
                <button
                  onClick={() => openModal('vehicle', { services: [] })}
                  className="flex items-center gap-1.5 bg-neutral-950 text-white px-3.5 py-2 rounded-xl text-xs font-medium hover:opacity-90 transition-colors shadow-sm"
                >
                  <Plus size={13} /> Add vehicle
                </button>
              </div>

              {selLoc.vehicles.length === 0 ? (
                <div className="border-2 border-dashed border-neutral-100 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-neutral-300">
                  <Car size={36} strokeWidth={1} />
                  <p className="text-[12px] font-medium">No vehicles configured</p>
                  <button onClick={() => openModal('vehicle', { services: [] })} className="px-4 py-2 bg-neutral-950 text-white rounded-xl text-xs font-medium mt-1 hover:opacity-90">+ Add first vehicle</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {selLoc.vehicles.map(v => (
                    <div
                      key={v.id}
                      className={`bg-white border rounded-2xl p-4 shadow-sm transition-colors hover:shadow-md ${v.active ? 'border-neutral-100' : 'border-neutral-100 opacity-50'}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-2xl text-primary">{getLucideIcon(v.icon_id || 'taxi_icon', 24)}</span>
                        <Tog on={v.active} onToggle={() => toggleVehicle(selLoc.id, v.id)} />
                      </div>
                      <h4 className="text-[14px] font-medium text-neutral-950 leading-none">{v.label}</h4>

                      {/* Service tags */}
                      <div className="flex flex-wrap gap-1 mt-2 mb-3">
                        {v.services.map(sid => {
                          const svc = services.find(s => s.id === sid);
                          return svc ? (
                            <span key={sid} className="text-xs font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200 flex items-center gap-1.5">
                              {getLucideIcon(svc.icon_id || 'taxi_icon', 10)} {svc.label}
                            </span>
                          ) : null;
                        })}
                        {v.services.length === 0 && (
                          <span className="text-xs font-medium text-neutral-300">No service</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-neutral-50">
                        <Pill label={v.active ? 'Visible' : 'Hidden'} variant={v.active ? 'green' : 'gray'} />
                        <button onClick={() => deleteVehicle(selLoc.id, v.id)} className="p-1 rounded-lg text-neutral-200 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════ MODALS ══════════════════════════════ */}

      {/* Service modal */}
      {modal === 'service' && (
        <Modal
          title={draft._edit ? 'Edit Service' : 'New Service Type'}
          subtitle="Captains will see this in the registration form"
          onClose={closeModal}
          footer={
            <div className="flex gap-2 mt-1">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-neutral-100 rounded-xl text-[12px] text-neutral-500 hover:bg-neutral-50 transition-colors">Cancel</button>
              <button onClick={saveService} className="flex-1 py-2.5 bg-neutral-950 text-white rounded-xl text-[12px] font-medium hover:opacity-90 transition-colors shadow-sm">{draft._edit ? 'Save' : 'Add Service'}</button>
            </div>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-500 mb-1.5 block">Emoji</label>
              <input
                type="text" maxLength={2} value={draft.emoji || ''}
                onChange={e => setDraft(p => ({ ...p, emoji: e.target.value }))}
                className="w-full h-11 border border-neutral-100 bg-neutral-50 rounded-xl px-3 text-xl text-center focus:outline-none focus:border-neutral-300 transition-colors"
                placeholder="e.g., taxi_icon"
              />
            </div>
            <div className="col-span-2">
              <Field label="Service Name" placeholder="e.g. Taxi, delivery" value={draft.label || ''} onChange={e => setDraft(p => ({ ...p, label: e.target.value }))} />
            </div>
          </div>
          <Field label="Short Description" placeholder="City rides, courier drops" value={draft.desc || ''} onChange={e => setDraft(p => ({ ...p, desc: e.target.value }))} />
        </Modal>
      )}

      {/* Location modal */}
      {modal === 'location' && (
        <Modal
          title="Add city"
          subtitle="New service zone where captains can register"
          onClose={closeModal}
          footer={
            <div className="flex gap-2 mt-1">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-neutral-100 rounded-xl text-[12px] text-neutral-500 hover:bg-neutral-50 transition-colors">Cancel</button>
              <button onClick={saveLocation} className="flex-1 py-2.5 bg-neutral-950 text-white rounded-xl text-[12px] font-medium hover:opacity-90 transition-colors shadow-sm">Add city</button>
            </div>
          }
        >
          <Field label="City Name" placeholder="Indore, bhopal" value={draft.city || ''} onChange={e => setDraft(p => ({ ...p, city: e.target.value }))} />
          <Field label="State" placeholder="Madhya pradesh" value={draft.state || ''} onChange={e => setDraft(p => ({ ...p, state: e.target.value }))} />
        </Modal>
      )}

      {/* Vehicle modal */}
      {modal === 'vehicle' && selLoc && (
        <Modal
          title={`Add Vehicle — ${selLoc.city}`}
          subtitle="Only shown for the matching service type"
          onClose={closeModal}
          footer={
            <div className="flex gap-2 mt-1">
              <button onClick={closeModal} className="flex-1 py-2.5 border border-neutral-100 rounded-xl text-[12px] text-neutral-500 hover:bg-neutral-50 transition-colors">Cancel</button>
              <button onClick={saveVehicle} className="flex-1 py-2.5 bg-neutral-950 text-white rounded-xl text-[12px] font-medium hover:opacity-90 transition-colors shadow-sm">Add vehicle</button>
            </div>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-500 mb-1.5 block">Emoji</label>
              <input
                type="text" maxLength={2} value={draft.emoji || ''}
                onChange={e => setDraft(p => ({ ...p, emoji: e.target.value }))}
                className="w-full h-11 border border-neutral-100 bg-neutral-50 rounded-xl px-3 text-xl text-center focus:outline-none focus:border-neutral-300 transition-colors"
                placeholder="e.g., taxi_icon"
              />
            </div>
            <div className="col-span-2">
              <Field label="Vehicle Name" placeholder="Bike, auto, cab" value={draft.label || ''} onChange={e => setDraft(p => ({ ...p, label: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500 mb-2 block">Link to services</label>
            <div className="flex flex-wrap gap-2">
              {services.filter(s => s.active).map(svc => (
                   <button
                    key={svc.id}
                    type="button"
                    onClick={() => toggleDraftService(svc.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      (draft.services || []).includes(svc.id)
                        ? 'bg-neutral-950 text-white border-neutral-950 shadow-sm'
                        : 'bg-neutral-50 text-neutral-500 border-neutral-100 hover:border-neutral-300'
                    }`}
                  >
                    {getLucideIcon(svc.icon_id || 'taxi_icon', 12)} {svc.label}
                  </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ServiceConfig;
