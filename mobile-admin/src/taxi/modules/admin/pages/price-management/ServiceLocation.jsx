/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/ServiceLocation.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Globe2,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  ChevronRight,
  Globe,
  Tag,
  MapPin,
  Clock,
  DollarSign,
  Activity,
  Info,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react-native';
import { AnimatePresence, motion } from '../../../../../lib/motion';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import countryMetadata from '../../constants/countries.json';
import {
  Button,
  Div,
  Form,
  H1,
  H2,
  H3,
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
const DEFAULT_TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];
const ADMIN_LANGUAGE_OPTIONS = ['English', 'Hindi', 'Arabic', 'French', 'Spanish'];
const defaultFormData = {
  name: '',
  country: '',
  currency_code: '',
  currency_symbol: '',
  timezone: '',
};
const inputClass =
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-800 bg-white focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20 outline-none transition-all placeholder:text-gray-300';
const labelClass = 'block text-xs font-bold text-gray-500 mb-2';
const getCountryName = (value) => {
  if (value == null) return '';
  let strVal = typeof value === 'object' ? value.name || value.label || value.country || '' : String(value);
  const found = countryMetadata.find((c) => String(c.id) === String(strVal) || c.name === strVal || c.code === strVal);
  return found ? found.name : String(strVal);
};
const ServiceLocation = ({ mode }) => {
  const navigate = useNavigate();
  const { id, jurisdictionName } = useParams();
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const isJurisdictions = mode === 'jurisdictions';
  const isList = !isCreate && !isEdit;
  const [locations, setLocations] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLangTab, setActiveLangTab] = useState('English');
  const [formData, setFormData] = useState(defaultFormData);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [locationsRes, countriesRes] = await Promise.allSettled([adminService.getServiceLocations(), adminService.getCountries()]);
      const nextLocations =
        locationsRes.status === 'fulfilled'
          ? Array.isArray(locationsRes.value?.data)
            ? locationsRes.value.data
            : locationsRes.value?.data?.results || locationsRes.value?.results || []
          : [];
      let nextCountries =
        countriesRes.status === 'fulfilled'
          ? Array.isArray(countriesRes.value?.data?.results)
            ? countriesRes.value.data.results
            : Array.isArray(countriesRes.value?.data)
              ? countriesRes.value.data
              : countriesRes.value?.results || []
          : [];
      const allowedCountries = ['India', 'United Arab Emirates', 'United Kingdom', 'United States'];
      nextCountries = nextCountries
        .map((c) => {
          const realName = getCountryName(c);
          return {
            ...c,
            name: realName,
          };
        })
        .filter((c) => allowedCountries.includes(c.name));
      const uniqueNextLocations = [];
      const seenLocations = new Set();
      (Array.isArray(nextLocations) ? nextLocations : []).forEach((l) => {
        const countryName = getCountryName(l.country);
        const name = l.name || l.service_location_name || '';
        const key = `${name.trim().toLowerCase()}-${countryName.trim().toLowerCase()}`;
        if (!seenLocations.has(key)) {
          seenLocations.add(key);
          uniqueNextLocations.push(l);
        }
      });
      setLocations(uniqueNextLocations);
      setCountries(Array.isArray(nextCountries) ? nextCountries : []);
      if (isEdit && id) {
        const item = nextLocations.find((l) => String(l._id || l.id) === String(id));
        if (item) {
          const matchedCountry = nextCountries.find((c) => (c._id || c.id) === item.country || c.name === item.country || c.name === item.country?.name);
          setFormData({
            name: item.name || item.service_location_name || '',
            country: matchedCountry?._id || matchedCountry?.id || '',
            currency_code: item.currency_code || '',
            currency_symbol: item.currency_symbol || '',
            timezone: item.timezone || '',
          });
        }
      } else if (isCreate) {
        if (Array.isArray(nextCountries) && nextCountries.length > 0) {
          const defaultCountry = nextCountries.find((c) => c.name?.toLowerCase() === 'india') || nextCountries[0];
          setFormData((p) => ({
            ...p,
            country: defaultCountry?._id || defaultCountry?.id || '',
          }));
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (formData.country && countries.length > 0) {
      // 1. Try to find in the dynamic API data
      let matched = countries.find((c) => String(c._id || c.id) === String(formData.country));

      // 2. Fallback to local master metadata
      if (!matched?.currency_code) {
        const countryName = matched?.name || '';
        matched = countryMetadata.find((c) => c.name === countryName || c.code === matched?.code);
      }
      if (matched?.currency_code) {
        setFormData((prev) => ({
          ...prev,
          currency_code: matched.currency_code,
          currency_symbol: matched.currency_symbol,
          timezone: matched.name === 'India' ? 'Asia/Kolkata' : prev.timezone,
        }));
      }
    }
  }, [formData.country, countries]);
  useEffect(() => {
    fetchData();
  }, [mode, id]);
  const filteredLocations = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!Array.isArray(locations)) return [];
    return locations.filter((l) => {
      const countryName = getCountryName(l.country);
      return [l.name, l.service_location_name, countryName].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(q),
      );
    });
  }, [locations, searchTerm]);
  const jurisdictionSummary = useMemo(() => {
    const grouped = new Map();
    locations.forEach((location) => {
      const countryName = getCountryName(location.country).trim();
      if (!countryName) return;
      if (!grouped.has(countryName)) {
        grouped.set(countryName, {
          name: countryName,
          locationCount: 0,
          timezones: new Set(),
          currencies: new Set(),
        });
      }
      const current = grouped.get(countryName);
      current.locationCount += 1;
      if (location.timezone) current.timezones.add(location.timezone);
      if (location.currency_code) current.currencies.add(location.currency_code);
    });
    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        timezones: Array.from(item.timezones),
        currencies: Array.from(item.currencies),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);
  const filteredJurisdictions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return jurisdictionSummary;
    return jurisdictionSummary.filter((item) => {
      const haystack = [item.name, item.timezones.join(' '), item.currencies.join(' '), String(item.locationCount)].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [jurisdictionSummary, searchTerm]);
  const decodedJurisdictionName = useMemo(() => decodeURIComponent(jurisdictionName || '').trim(), [jurisdictionName]);
  const selectedJurisdiction = useMemo(() => {
    if (decodedJurisdictionName) {
      const matched = jurisdictionSummary.find((item) => item.name.toLowerCase() === decodedJurisdictionName.toLowerCase());
      if (matched) return matched;
    }
    return filteredJurisdictions[0] || null;
  }, [decodedJurisdictionName, filteredJurisdictions, jurisdictionSummary]);
  const selectedJurisdictionLocations = useMemo(() => {
    if (!selectedJurisdiction) return [];
    return locations.filter((location) => getCountryName(location.country).trim().toLowerCase() === selectedJurisdiction.name.toLowerCase());
  }, [locations, selectedJurisdiction]);
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.country) return alert('Required fields missing');
    setSaving(true);
    try {
      const selectedCountry = countries.find((c) => (c._id || c.id) === formData.country);
      const payload = {
        ...formData,
        currency_code: formData.currency_code.toUpperCase(),
        country: selectedCountry?.name || formData.country,
        currency_name: formData.currency_code.toUpperCase(),
      };
      const res = isEdit ? await adminService.updateServiceLocation(id, payload) : await adminService.createServiceLocation(payload);
      if (res?.success) {
        navigate('/taxi/admin/pricing/service-location');
      } else {
        alert(res?.message || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (itemId) => {
    if (!(await window.confirmAsync('Delete this service area?'))) return;
    try {
      const res = await adminService.deleteServiceLocation(itemId);
      if (res?.success) fetchData();
    } catch (err) {}
  };
  if (isJurisdictions) {
    return (
      <ScrollDiv className="min-h-screen bg-gray-50 p-3 lg:p-4 animate-in fade-in duration-500 font-sans">
        <Div className="max-w-7xl mx-auto space-y-6">
          <Div className="flex items-center justify-between gap-4">
            <Div>
              <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2 font-medium uppercase tracking-widest">
                <Span>Pricing</Span>
                <UiIcon as={ChevronRight} size={12} />
                <Button
                  type="button"
                  onClick={() => navigate('/taxi/admin/pricing/service-location')}
                  className="text-gray-500 transition-colors hover:text-gray-700"
                >
                  Service Locations
                </Button>
                <UiIcon as={ChevronRight} size={12} />
                <Span className="text-gray-700">Market Jurisdictions</Span>
              </Div>
              <H1 className="text-xl font-bold text-gray-900 tracking-tight">Market Jurisdictions</H1>
              <P className="text-xs text-gray-500 mt-1 font-medium">
                Browse each jurisdiction, how many service locations sit inside it, and the currency and timezone coverage.
              </P>
            </Div>

            <Button
              type="button"
              onClick={() => navigate('/taxi/admin/pricing/service-location')}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-yellow- hover:text-yellow-"
            >
              <UiIcon as={ArrowLeft} size={16} />
              Back To Locations
            </Button>
          </Div>

          <Div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Div className="rounded-lg border border-yellow- bg-white p-3 shadow-sm">
              <P className="text-[10px] font-black uppercase tracking-widest text-yellow-">Jurisdictions</P>
              <H3 className="mt-2 text-xl font-black text-gray-900">{jurisdictionSummary.length}</H3>
            </Div>
            <Div className="rounded-lg border border-emerald-100 bg-white p-3 shadow-sm">
              <P className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Covered Hubs</P>
              <H3 className="mt-2 text-xl font-black text-gray-900">{locations.length}</H3>
            </Div>
            <Div className="rounded-lg border border-yellow- bg-white p-3 shadow-sm">
              <P className="text-[10px] font-black uppercase tracking-widest text-yellow-">Currency Profiles</P>
              <H3 className="mt-2 text-xl font-black text-gray-900">
                {[...new Set(jurisdictionSummary.flatMap((item) => item.currencies))].filter(Boolean).length}
              </H3>
            </Div>
          </Div>

          <Div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Div className="border-b border-gray-100 bg-gray-50/50 p-4">
              <Div className="relative w-full max-w-sm">
                <UiIcon as={Search} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search jurisdictions..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium transition-all focus:border-yellow- focus:outline-none focus:ring-2 focus:ring-yellow-/10"
                />
              </Div>
            </Div>

            {loading ? (
              <Div className="flex flex-col items-center justify-center gap-3 py-24">
                <UiIcon as={Loader2} className="animate-spin text-yellow-" size={32} />
                <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Jurisdictions</P>
              </Div>
            ) : filteredJurisdictions.length > 0 ? (
              <Div className="space-y-5 p-3">
                {selectedJurisdiction ? (
                  <Div className="rounded-xl border border-yellow- bg-white p-3 shadow-sm">
                    <Div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <Div className="flex items-start gap-4">
                        <Div className="flex h-10 w-10 items-center justify-center rounded-lg border border-yellow- bg-white text-yellow- shadow-sm">
                          <UiIcon as={Globe2} size={24} />
                        </Div>
                        <Div>
                          <P className="text-[10px] font-black uppercase tracking-widest text-yellow-">Selected Jurisdiction</P>
                          <H2 className="mt-1 text-2xl font-black text-gray-900">{selectedJurisdiction.name}</H2>
                          <P className="mt-2 text-xs font-medium text-gray-500">
                            This jurisdiction currently contains {selectedJurisdiction.locationCount} service location
                            {selectedJurisdiction.locationCount === 1 ? '' : 's'}.
                          </P>
                        </Div>
                      </Div>

                      <Div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Div className="rounded-xl border border-white/80 bg-white px-4 py-3 shadow-sm">
                          <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Locations</P>
                          <P className="mt-1 text-xl font-black text-gray-900">{selectedJurisdiction.locationCount}</P>
                        </Div>
                        <Div className="rounded-xl border border-white/80 bg-white px-4 py-3 shadow-sm">
                          <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Currencies</P>
                          <P className="mt-1 text-xl font-black text-gray-900">{selectedJurisdiction.currencies.length}</P>
                        </Div>
                        <Div className="rounded-xl border border-white/80 bg-white px-4 py-3 shadow-sm">
                          <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Timezones</P>
                          <P className="mt-1 text-xl font-black text-gray-900">{selectedJurisdiction.timezones.length}</P>
                        </Div>
                      </Div>
                    </Div>

                    <Div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Div className="rounded-lg border border-yellow- bg-white p-3 shadow-sm">
                        <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Currency Coverage</P>
                        <Div className="mt-3 flex flex-wrap gap-2">
                          {selectedJurisdiction.currencies.length ? (
                            selectedJurisdiction.currencies.map((currency) => (
                              <Span key={currency} className="rounded-full bg-yellow- px-3 py-1.5 text-xs font-bold text-yellow-">
                                {currency}
                              </Span>
                            ))
                          ) : (
                            <Span className="text-xs font-semibold text-gray-400">No currencies mapped</Span>
                          )}
                        </Div>
                      </Div>

                      <Div className="rounded-lg border border-emerald-100 bg-white p-3 shadow-sm">
                        <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Timezone Coverage</P>
                        <Div className="mt-3 flex flex-wrap gap-2">
                          {selectedJurisdiction.timezones.length ? (
                            selectedJurisdiction.timezones.map((timezone) => (
                              <Span key={timezone} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                {timezone}
                              </Span>
                            ))
                          ) : (
                            <Span className="text-xs font-semibold text-gray-400">No timezones mapped</Span>
                          )}
                        </Div>
                      </Div>
                    </Div>

                    <Div className="mt-6 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                      <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Service Locations In This Jurisdiction</P>
                      <Div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {selectedJurisdictionLocations.map((location) => (
                          <Button
                            key={location._id || location.id}
                            type="button"
                            onClick={() => navigate(`/taxi/admin/pricing/service-location/edit/${location._id || location.id}`)}
                            className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/70 px-4 py-3 text-left transition-all hover:border-yellow- hover:bg-yellow-/40"
                          >
                            <Div>
                              <P className="text-sm font-bold text-gray-900">{location.name || location.service_location_name}</P>
                              <P className="mt-1 text-xs font-medium text-gray-500">{location.timezone || 'Timezone not set'}</P>
                            </Div>
                            <Div className="text-right">
                              <P className="text-xs font-black uppercase tracking-widest text-yellow-">{location.currency_code || 'N/A'}</P>
                              <P className="mt-1 text-xs font-semibold text-gray-400">{location.currency_symbol || 'No symbol'}</P>
                            </Div>
                          </Button>
                        ))}
                      </Div>
                    </Div>
                  </Div>
                ) : null}

                <Div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {filteredJurisdictions.map((item) => (
                    <Button
                      key={item.name}
                      type="button"
                      onClick={() => navigate(`/taxi/admin/pricing/service-location/jurisdictions/${encodeURIComponent(item.name)}`)}
                      className={`rounded-lg border p-3 text-left shadow-sm transition-all ${selectedJurisdiction?.name === item.name ? 'border-yellow- bg-yellow-/70' : 'border-gray-100 bg-gray-50/60 hover:border-[#FFC400] hover:bg-[#FFC400]/10'}`}
                    >
                      <Div className="flex items-start justify-between gap-4">
                        <Div className="flex items-center gap-3">
                          <Div className="flex h-11 w-11 items-center justify-center rounded-xl border border-yellow- bg-yellow- text-yellow-">
                            <UiIcon as={Globe2} size={20} />
                          </Div>
                          <Div>
                            <P className="text-[10px] font-black uppercase tracking-widest text-yellow-">Jurisdiction</P>
                            <H3 className="text-lg font-black text-gray-900">{item.name}</H3>
                          </Div>
                        </Div>

                        <Div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-right">
                          <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Locations</P>
                          <P className="text-lg font-black text-gray-900">{item.locationCount}</P>
                        </Div>
                      </Div>

                      <Div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Div className="rounded-xl border border-gray-200 bg-white p-4">
                          <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Currencies</P>
                          <Div className="mt-2 flex flex-wrap gap-2">
                            {item.currencies.length ? (
                              item.currencies.map((currency) => (
                                <Span key={currency} className="rounded-full bg-yellow- px-2.5 py-1 text-[11px] font-bold text-yellow-">
                                  {currency}
                                </Span>
                              ))
                            ) : (
                              <Span className="text-xs font-semibold text-gray-400">Not assigned</Span>
                            )}
                          </Div>
                        </Div>

                        <Div className="rounded-xl border border-gray-200 bg-white p-4">
                          <P className="text-[10px] font-black uppercase tracking-widest text-gray-400">Timezones</P>
                          <Div className="mt-2 flex flex-wrap gap-2">
                            {item.timezones.length ? (
                              item.timezones.map((timezone) => (
                                <Span key={timezone} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                  {timezone}
                                </Span>
                              ))
                            ) : (
                              <Span className="text-xs font-semibold text-gray-400">Not assigned</Span>
                            )}
                          </Div>
                        </Div>
                      </Div>
                    </Button>
                  ))}
                </Div>
              </Div>
            ) : (
              <Div className="py-24 text-center">
                <Div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-200">
                  <UiIcon as={Globe} size={32} />
                </Div>
                <H3 className="text-sm font-bold text-gray-900">No Jurisdictions Found</H3>
                <P className="mx-auto mt-1 max-w-xs text-xs text-gray-400">
                  Add service locations first, then this page will summarize each market jurisdiction automatically.
                </P>
              </Div>
            )}
          </Div>
        </Div>
      </ScrollDiv>
    );
  }
  if (isList) {
    return (
      <ScrollDiv className="min-h-screen bg-gray-50 p-3 lg:p-4 animate-in fade-in duration-500 font-sans">
        <Div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <Div>
            <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2 font-medium uppercase tracking-widest">
              <Span>Pricing</Span>
              <UiIcon as={ChevronRight} size={12} />
              <Span className="text-gray-700">Service Locations</Span>
            </Div>
            <Div className="flex items-center justify-between">
              <Div>
                <H1 className="text-lg font-bold text-gray-900 tracking-tight">Active Service Areas</H1>
                <P className="text-xs text-gray-500 mt-1 font-medium">Manage localized settings including currency, timezone, and regional clusters.</P>
              </Div>
              <Button
                onClick={() => navigate('/taxi/admin/pricing/service-location/add')}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FFC400] text-[#0B1220] rounded-xl text-sm font-semibold hover:brightness-95 transition-all shadow-md active:scale-95"
              >
                <UiIcon as={Plus} size={18} /> Add Location
              </Button>
            </Div>
          </Div>

          {/* Stats */}
          <Div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                label: 'Market Jurisdictions',
                value: Array.isArray(locations)
                  ? [...new Set(locations.map((l) => (typeof l.country === 'object' ? l.country?.name : l.country)))].filter(Boolean).length
                  : 0,
                icon: Globe,
                color: 'indigo',
              },
              {
                label: 'Operational Hubs',
                value: Array.isArray(locations) ? locations.length : 0,
                icon: MapPin,
                color: 'emerald',
              },
              {
                label: 'Active Currencies',
                value: Array.isArray(locations) ? [...new Set(locations.map((l) => l.currency_code))].filter(Boolean).length : 0,
                icon: DollarSign,
                color: 'blue',
              },
            ].map((stat, i) => (
              <Button
                key={i}
                type="button"
                onClick={i === 0 ? () => navigate('/taxi/admin/pricing/service-location/jurisdictions') : undefined}
                className={`bg-white p-2 rounded-lg border border-gray-100 shadow-sm flex items-center gap-4 group transition-colors text-left ${i === 0 ? 'cursor-pointer hover:border-[#FFC400] hover:bg-[#FFC400]/10 active:scale-[0.99]' : 'cursor-default'}`}
              >
                <Div
                  className={`w-8 h-8 rounded-lg bg-[#FFC400]/10 flex items-center justify-center text-[#FFC400] border border-[#FFC400]/20 shadow-sm group-hover:scale-110 transition-transform`}
                >
                  <UiIcon as={stat.icon} size={16} />
                </Div>
                <Div>
                  <P className={`text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'text-[#FFC400]' : 'text-gray-400'}`}>{stat.label}</P>
                  <H3 className="text-xl font-black text-gray-900">{stat.value}</H3>
                </Div>
              </Button>
            ))}
          </Div>

          {/* List Table */}
          <Div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <Div className="p-4 bg-gray-50/50 border-b border-gray-100">
              <Div className="relative w-full max-w-sm">
                <UiIcon as={Search} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search locations..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-/10 focus:border-yellow- transition-all font-medium"
                />
              </Div>
            </Div>

            <Div>
              {loading ? (
                <Div className="flex flex-col items-center justify-center py-24 gap-3">
                  <UiIcon as={Loader2} className="animate-spin text-yellow-" size={32} />
                  <P className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Validating Market Access</P>
                </Div>
              ) : filteredLocations.length > 0 ? (
                <Table cols={[220, 170, 130, 160, 110]} className="w-full text-left">
                  <Thead>
                    <Tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                      <Th className="px-4 py-3">Sector Name</Th>
                      <Th className="px-4 py-3">Jurisdiction</Th>
                      <Th className="px-4 py-3 text-center">Settlement</Th>
                      <Th className="px-4 py-3">Temporal Zone</Th>
                      <Th className="px-4 py-3 text-right">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="divide-y divide-gray-100">
                    {filteredLocations.map((l) => (
                      <Tr key={l._id || l.id} className="hover:bg-gray-50/20 transition-colors group">
                        <Td className="px-4 py-3">
                          <Div className="flex items-center gap-3">
                            <Div className="w-10 h-10 rounded-xl bg-[#FFC400]/10 flex items-center justify-center text-[#FFC400] border border-[#FFC400]/20 shadow-sm group-hover:rotate-6 transition-transform">
                              <UiIcon as={MapPin} size={18} />
                            </Div>
                            <Span className="text-sm font-bold text-gray-900 leading-tight">{l.name || l.service_location_name}</Span>
                          </Div>
                        </Td>
                        <Td className="px-4 py-3">
                          <Button
                            type="button"
                            onClick={() =>
                              navigate(`/taxi/admin/pricing/service-location/jurisdictions/${encodeURIComponent(getCountryName(l.country).trim())}`)
                            }
                            className="text-xs font-bold uppercase tracking-wider text-gray-900 transition-colors hover:text-black hover:underline"
                          >
                            {typeof l.country === 'object' ? l.country?.name : l.country || '-'}
                          </Button>
                        </Td>
                        <Td className="px-4 py-3 text-center">
                          <Div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg">
                            <Span className="text-[10px] font-black text-gray-900">{l.currency_code}</Span>
                            <Span className="text-xs font-bold text-gray-400">{l.currency_symbol}</Span>
                          </Div>
                        </Td>
                        <Td className="px-4 py-3">
                          <Div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                            <UiIcon as={Clock} size={14} className="text-gray-400" />
                            {l.timezone}
                          </Div>
                        </Td>
                        <Td className="px-4 py-3">
                          <Div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => navigate(`/taxi/admin/pricing/service-location/edit/${l._id || l.id}`)}
                              className="p-2 text-gray-400 hover:text-[#0B1220] hover:bg-[#FFC400] rounded-xl transition-all shadow-sm"
                            >
                              <UiIcon as={Edit2} size={16} />
                            </Button>
                            <Button
                              onClick={() => handleDelete(l._id || l.id)}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"
                            >
                              <UiIcon as={Trash2} size={16} />
                            </Button>
                          </Div>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Div className="py-24 text-center">
                  <Div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-gray-200 mx-auto mb-4 tracking-tighter">
                    <UiIcon as={Globe} size={32} />
                  </Div>
                  <H3 className="text-sm font-bold text-gray-900 mb-1">No Hubs Discovered</H3>
                  <P className="text-xs text-gray-400 max-w-xs mx-auto">Initialize service locations to define your operational footprint.</P>
                </Div>
              )}
            </Div>
          </Div>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-3 lg:p-4 animate-in fade-in duration-500 font-sans">
      <Div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Matching Image */}
        <Div className="flex items-center justify-between mb-4">
          <H1 className="text-lg font-black text-gray-900 tracking-tight">{isCreate ? 'Create Service Location' : 'Edit Service Location'}</H1>
          <Div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            <Span>Service Location</Span>
            <UiIcon as={ChevronRight} size={12} className="text-gray-300" />
            <Span className="text-gray-900">{isCreate ? 'Create' : 'Edit'}</Span>
          </Div>
        </Div>

        {/* Form Card - Matching Image */}
        <Div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden p-10">
          {/* Language Tabs */}
          <HScroll className="flex items-center gap-4 border-b border-gray-100 mb-10">
            {ADMIN_LANGUAGE_OPTIONS.map((lang) => (
              <Button
                key={lang}
                onClick={() => setActiveLangTab(lang)}
                className={`pb-4 text-[13px] font-bold transition-all relative ${activeLangTab === lang ? 'text-emerald-500' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {lang}
                {activeLangTab === lang && <motion.div layoutId="lang-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
              </Button>
            ))}
          </HScroll>

          <Form onSubmit={handleSave} className="space-y-8">
            <Div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <Div className="md:col-span-1 space-y-2">
                <Label className={labelClass}>
                  Name <Span className="text-rose-400">*</Span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      name: e.target.value,
                    }))
                  }
                  placeholder={`Enter Name in ${activeLangTab}`}
                  className={inputClass}
                  required
                />
              </Div>

              <Div className="md:col-span-1 border-0" />

              <Div className="space-y-2">
                <Label className={labelClass}>
                  Select Country <Span className="text-rose-400">*</Span>
                </Label>
                <Div className="relative">
                  <Select
                    value={formData.country}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        country: e.target.value,
                      }))
                    }
                    className={inputClass + ' appearance-none cursor-pointer'}
                    required
                  >
                    <Option value="">Choose Country</Option>
                    {countries.map((c) => (
                      <Option key={c._id || c.id} value={c._id || c.id}>
                        {c.name}
                      </Option>
                    ))}
                  </Select>
                  <UiIcon as={ChevronDown} size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </Div>
              </Div>

              <Div className="space-y-2">
                <Label className={labelClass}>
                  Currency Code <Span className="text-rose-400">*</Span>
                </Label>
                <Input
                  value={formData.currency_code}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      currency_code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Enter Currency Code"
                  className={inputClass}
                  required
                />
              </Div>

              <Div className="space-y-2">
                <Label className={labelClass}>
                  Currency Symbol <Span className="text-rose-400">*</Span>
                </Label>
                <Input
                  value={formData.currency_symbol}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      currency_symbol: e.target.value,
                    }))
                  }
                  placeholder="Enter Currency Symbol"
                  className={inputClass}
                  required
                />
              </Div>

              <Div className="space-y-2">
                <Label className={labelClass}>
                  Select Timezone <Span className="text-rose-400">*</Span>
                </Label>
                <Div className="relative">
                  <Select
                    value={formData.timezone}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        timezone: e.target.value,
                      }))
                    }
                    className={inputClass + ' appearance-none cursor-pointer'}
                    required
                  >
                    <Option value="">Choose Timezone</Option>
                    {DEFAULT_TIMEZONES.map((tz) => (
                      <Option key={tz} value={tz}>
                        {tz}
                      </Option>
                    ))}
                  </Select>
                  <UiIcon as={ChevronDown} size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </Div>
              </Div>
            </Div>

            <Div className="pt-10 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="px-10 py-3 bg-yellow-400 text-black rounded-lg text-sm font-bold hover:bg-yellow-500 transition-all shadow-sm active:scale-95 flex items-center gap-2"
              >
                {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : null}
                {isEdit ? 'Update' : 'Save'}
              </Button>
            </Div>
          </Form>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default ServiceLocation;
