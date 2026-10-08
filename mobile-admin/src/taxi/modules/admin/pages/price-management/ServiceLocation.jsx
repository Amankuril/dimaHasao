/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/ServiceLocation.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Edit2, Globe2, Plus, Save, Search, Trash2, Globe, MapPin, Clock, DollarSign } from 'lucide-react-native';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import countryMetadata from '../../constants/countries.json';
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
  StatusBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  TableSkeleton,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Form, HScroll, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
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
const LOC_COLS = [200, 150, 130, 160, 100];
const LOC_LABELS = ['Location', 'Jurisdiction', 'Currency', 'Timezone', 'Actions'];
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
  const [loadError, setLoadError] = useState('');
  const { columns, tablet } = useLayoutWidth();
  const fetchData = async () => {
    setLoading(true);
    setLoadError('');
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
      setLoadError(error?.response?.data?.message || 'Failed to load service locations');
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
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={Globe2}
          title="Market jurisdictions"
          subtitle="Each jurisdiction, the service locations inside it, and its currency and timezone coverage"
          breadcrumb={[
            { label: 'Taxi' },
            { label: 'Service locations', onPress: () => navigate('/taxi/admin/pricing/service-location') },
            { label: 'Jurisdictions' },
          ]}
          actions={
            <Button type="button" onClick={() => navigate('/taxi/admin/pricing/service-location')} className={BTN_SECONDARY}>
              <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Back to locations</Span>
            </Button>
          }
        />

        <StatGrid className="mb-4">
          <StatCard label="Jurisdictions" value={String(jurisdictionSummary.length)} icon={Globe2} tone="info" />
          <StatCard label="Covered hubs" value={String(locations.length)} icon={MapPin} tone="success" />
          <StatCard
            label="Currency profiles"
            value={String([...new Set(jurisdictionSummary.flatMap((item) => item.currencies))].filter(Boolean).length)}
            icon={DollarSign}
            tone="warning"
          />
        </StatGrid>

        <Card className="mb-4">
          <Toolbar className="mb-0">
            <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search jurisdictions"
                className="flex-1 text-sm text-slate-900"
              />
            </Div>
          </Toolbar>
        </Card>

        {loading ? (
          <LoadingState label="Loading jurisdictions…" />
        ) : loadError ? (
          <ErrorState title="Could not load jurisdictions" message={loadError} onRetry={fetchData} />
        ) : filteredJurisdictions.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No jurisdictions found"
            message="Add service locations first — this page then summarises each market jurisdiction automatically."
            actionLabel="Add location"
            onAction={() => navigate('/taxi/admin/pricing/service-location/add')}
          />
        ) : (
          <Div className="gap-3">
            {selectedJurisdiction ? (
              <Card>
                <SectionTitle>{selectedJurisdiction.name}</SectionTitle>
                <Span className="text-sm text-slate-500 mb-3">
                  {`This jurisdiction contains ${selectedJurisdiction.locationCount} service location${selectedJurisdiction.locationCount === 1 ? '' : 's'}.`}
                </Span>
                <Div className={`grid grid-cols-${columns} gap-3`}>
                  <Div>
                    <Span className="text-xs font-semibold uppercase text-slate-500">Currency coverage</Span>
                    <Div className="flex-row flex-wrap gap-2 mt-2">
                      {selectedJurisdiction.currencies.length ? (
                        selectedJurisdiction.currencies.map((currency) => <StatusBadge key={currency} label={currency} tone="info" />)
                      ) : (
                        <Span className="text-sm text-slate-400">No currencies mapped</Span>
                      )}
                    </Div>
                  </Div>
                  <Div>
                    <Span className="text-xs font-semibold uppercase text-slate-500">Timezone coverage</Span>
                    <Div className="flex-row flex-wrap gap-2 mt-2">
                      {selectedJurisdiction.timezones.length ? (
                        selectedJurisdiction.timezones.map((timezone) => <StatusBadge key={timezone} label={timezone} tone="success" />)
                      ) : (
                        <Span className="text-sm text-slate-400">No timezones mapped</Span>
                      )}
                    </Div>
                  </Div>
                </Div>

                <Span className="text-xs font-semibold uppercase text-slate-500 mt-4 mb-2">Service locations here</Span>
                <Div className={`grid grid-cols-${columns} gap-3`}>
                  {selectedJurisdictionLocations.map((location) => (
                    <Button
                      key={location._id || location.id}
                      type="button"
                      onClick={() => navigate(`/taxi/admin/pricing/service-location/edit/${location._id || location.id}`)}
                      className="flex-row items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <Div className="flex-1 min-w-0">
                        <Span className="text-sm font-semibold text-slate-900">{location.name || location.service_location_name}</Span>
                        <Span className="text-xs text-slate-500">{location.timezone || 'Timezone not set'}</Span>
                      </Div>
                      <Div className="items-end">
                        <Span className="text-xs font-semibold text-slate-700">{location.currency_code || 'N/A'}</Span>
                        <Span className="text-xs text-slate-500">{location.currency_symbol || 'No symbol'}</Span>
                      </Div>
                    </Button>
                  ))}
                </Div>
              </Card>
            ) : null}

            <Div className={`grid grid-cols-${columns} gap-3`}>
              {filteredJurisdictions.map((item) => (
                <Button
                  key={item.name}
                  type="button"
                  onClick={() => navigate(`/taxi/admin/pricing/service-location/jurisdictions/${encodeURIComponent(item.name)}`)}
                  className={`p-4 rounded-xl border bg-white ${selectedJurisdiction?.name === item.name ? 'border-blue-600' : 'border-slate-200'}`}
                >
                  <Div className="flex-row items-center justify-between gap-3">
                    <Div className="flex-row items-center gap-2 flex-1 min-w-0">
                      <UiIcon as={Globe2} size={18} className="text-slate-500" />
                      <Span className="text-base font-semibold text-slate-900">{item.name}</Span>
                    </Div>
                    <Div className="items-end">
                      <Span className="text-xs text-slate-500">Locations</Span>
                      <Span className="text-base font-semibold text-slate-900">{String(item.locationCount)}</Span>
                    </Div>
                  </Div>
                  <Div className="flex-row flex-wrap gap-2 mt-3">
                    {item.currencies.length ? (
                      item.currencies.map((currency) => <StatusBadge key={currency} label={currency} tone="info" />)
                    ) : (
                      <Span className="text-xs text-slate-400">No currency assigned</Span>
                    )}
                  </Div>
                  <Div className="flex-row flex-wrap gap-2 mt-2">
                    {item.timezones.length ? (
                      item.timezones.map((timezone) => <StatusBadge key={timezone} label={timezone} tone="success" />)
                    ) : (
                      <Span className="text-xs text-slate-400">No timezone assigned</Span>
                    )}
                  </Div>
                </Button>
              ))}
            </Div>
          </Div>
        )}
      </AdminPage>
    );
  }
  if (isList) {
    const jurisdictionCount = Array.isArray(locations)
      ? [...new Set(locations.map((l) => (typeof l.country === 'object' ? l.country?.name : l.country)))].filter(Boolean).length
      : 0;
    const currencyCount = Array.isArray(locations) ? [...new Set(locations.map((l) => l.currency_code))].filter(Boolean).length : 0;
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={MapPin}
          title="Service locations"
          subtitle="Localized settings: currency, timezone and regional clusters"
          breadcrumb={[{ label: 'Taxi' }, { label: 'Pricing' }, { label: 'Service locations' }]}
          actions={
            <Button type="button" onClick={() => navigate('/taxi/admin/pricing/service-location/add')} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add location</Span>
            </Button>
          }
        />

        <StatGrid className="mb-4">
          <StatCard
            label="Market jurisdictions"
            value={String(jurisdictionCount)}
            icon={Globe}
            tone="info"
            hint="Tap to browse"
            onPress={() => navigate('/taxi/admin/pricing/service-location/jurisdictions')}
          />
          <StatCard label="Operational hubs" value={String(Array.isArray(locations) ? locations.length : 0)} icon={MapPin} tone="success" />
          <StatCard label="Active currencies" value={String(currencyCount)} icon={DollarSign} tone="warning" />
        </StatGrid>

        <Card className="mb-4">
          <Toolbar className="mb-0">
            <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search locations"
                className="flex-1 text-sm text-slate-900"
              />
            </Div>
          </Toolbar>
        </Card>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : loadError ? (
          <ErrorState title="Could not load service locations" message={loadError} onRetry={fetchData} />
        ) : filteredLocations.length === 0 ? (
          <EmptyState
            icon={Globe}
            title={locations.length ? 'No locations match your search' : 'No service locations yet'}
            message={locations.length ? 'Try a different name or country.' : 'Add a service location to define where taxi service runs.'}
            actionLabel={locations.length ? undefined : 'Add location'}
            onAction={locations.length ? undefined : () => navigate('/taxi/admin/pricing/service-location/add')}
          />
        ) : (
          <DataTable cols={LOC_COLS}>
            <THead cols={LOC_COLS} labels={LOC_LABELS} />
            <TBody>
              {filteredLocations.map((l, i, all) => (
                <Row key={l._id || l.id} last={i === all.length - 1}>
                  <Cell width={LOC_COLS[0]}>
                    <Span className="text-sm font-semibold text-slate-900">{l.name || l.service_location_name || 'Unnamed'}</Span>
                  </Cell>
                  <Cell width={LOC_COLS[1]}>
                    <Button
                      type="button"
                      onClick={() => navigate(`/taxi/admin/pricing/service-location/jurisdictions/${encodeURIComponent(getCountryName(l.country).trim())}`)}
                      className="h-11 justify-center"
                    >
                      <Span className="text-sm font-semibold text-blue-700">{(typeof l.country === 'object' ? l.country?.name : l.country) || '—'}</Span>
                    </Button>
                  </Cell>
                  <Cell width={LOC_COLS[2]}>{`${l.currency_code || '—'} ${l.currency_symbol || ''}`.trim()}</Cell>
                  <Cell width={LOC_COLS[3]}>
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={Clock} size={14} className="text-slate-400" />
                      <Span className="text-sm text-slate-700 flex-1">{l.timezone || 'Not set'}</Span>
                    </Div>
                  </Cell>
                  <Cell width={LOC_COLS[4]}>
                    <Div className="flex-row items-center gap-1">
                      <Button
                        type="button"
                        accessibilityLabel={`Edit ${l.name || 'location'}`}
                        onClick={() => navigate(`/taxi/admin/pricing/service-location/edit/${l._id || l.id}`)}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                      >
                        <UiIcon as={Edit2} size={16} className="text-slate-600" />
                      </Button>
                      <Button
                        type="button"
                        accessibilityLabel={`Delete ${l.name || 'location'}`}
                        onClick={() => handleDelete(l._id || l.id)}
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
  const formHeader = (
    <PageHeader
      icon={MapPin}
      title={isCreate ? 'Create service location' : 'Edit service location'}
      subtitle="Name, country, currency and timezone for this market"
      breadcrumb={[
        { label: 'Taxi' },
        { label: 'Service locations', onPress: () => navigate('/taxi/admin/pricing/service-location') },
        { label: isCreate ? 'Create' : 'Edit' },
      ]}
      actions={
        <Button type="button" onClick={() => navigate('/taxi/admin/pricing/service-location')} className={BTN_SECONDARY}>
          <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>Back</Span>
        </Button>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {formHeader}
        <LoadingState label="Loading service location…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {formHeader}
        <ErrorState title="Could not load this location" message={loadError} onRetry={fetchData} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={720}>
      {formHeader}

      <Card className="mb-4">
        <SectionTitle>Language</SectionTitle>
        <HScroll contentClassName="flex-row gap-2">
          {ADMIN_LANGUAGE_OPTIONS.map((lang) => (
            <Button key={lang} type="button" onClick={() => setActiveLangTab(lang)} className={activeLangTab === lang ? BTN_PRIMARY : BTN_SECONDARY}>
              <Span className={activeLangTab === lang ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{lang}</Span>
            </Button>
          ))}
        </HScroll>
      </Card>

      <Form onSubmit={handleSave}>
        <Card className="mb-4">
          <SectionTitle>Location details</SectionTitle>
          <Div className={`grid grid-cols-${columns} gap-3`}>
            <Field label="Name" required>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    name: e.target.value,
                  }))
                }
                placeholder={`Enter name in ${activeLangTab}`}
                className={INPUT}
                required
              />
            </Field>

            <Field label="Country" required>
              <Select
                value={formData.country}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    country: e.target.value,
                  }))
                }
                className={INPUT}
                required
              >
                <Option value="">Choose country</Option>
                {countries.map((c) => (
                  <Option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Field>

            <Field label="Currency code" required hint="Filled in from the country where known">
              <Input
                value={formData.currency_code}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    currency_code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="INR"
                className={INPUT}
                required
              />
            </Field>

            <Field label="Currency symbol" required>
              <Input
                value={formData.currency_symbol}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    currency_symbol: e.target.value,
                  }))
                }
                placeholder="₹"
                className={INPUT}
                required
              />
            </Field>

            <Field label="Timezone" required>
              <Select
                value={formData.timezone}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    timezone: e.target.value,
                  }))
                }
                className={INPUT}
                required
              >
                <Option value="">Choose timezone</Option>
                {DEFAULT_TIMEZONES.map((tz) => (
                  <Option key={tz} value={tz}>
                    {tz}
                  </Option>
                ))}
              </Select>
            </Field>
          </Div>
        </Card>

        <Card className={`${tablet ? 'flex-row justify-end' : ''} gap-3`}>
          <Button type="button" onClick={() => navigate('/taxi/admin/pricing/service-location')} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
          <Button type="submit" disabled={saving} className={BTN_PRIMARY}>
            <UiIcon as={Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : isEdit ? 'Update' : 'Save'}</Span>
          </Button>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default ServiceLocation;
