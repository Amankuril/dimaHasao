/**
 * Step 4 — the vehicle the driver will work with.
 *
 * This screen was 1,685 lines. Most of that was a third-party RC lookup that
 * autofilled the make, model and year, a second lookup for the driving licence,
 * and a branch of owner-only company fields — all of it gone. What is left is
 * the eight fields the ride flow actually needs.
 *
 * The admin can still rename, reorder and make fields optional: the labels,
 * placeholders and required flags come from the vehicle-field templates, and
 * anything an admin adds beyond the built-in keys is collected into
 * `customFields` so a new field can never lock a driver out of onboarding.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Hash, Loader2, MapPin, Palette, Calendar, FileText } from 'lucide-react';

import {
  getDriverServiceLocations,
  getDriverVehicleFieldTemplates,
  getDriverVehicleTypes,
  getStoredDriverRegistrationSession,
  saveDriverRegistrationSession,
  saveDriverVehicle,
} from '../../services/registrationService';
import OnboardingShell from './OnboardingShell';
import { ChipGroup, Field, SelectField } from './OnboardingFields';

const unwrap = (response) => response?.data?.data || response?.data || response;
const listOf = (payload) =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];

/** Built-in keys this screen renders itself; anything else is a custom field. */
const BUILT_IN_KEYS = new Set([
  'locationId',
  'serviceCategories',
  'vehicleTypeId',
  'make',
  'model',
  'year',
  'number',
  'color',
]);

const SERVICE_CATEGORIES = [
  { value: 'taxi', label: 'City rides' },
  { value: 'outstation', label: 'Outstation' },
];

const PLATE_PATTERNS = [
  /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/,
  /^[A-Z]{2}\d{1,2}[A-Z]{4}\d{4}$/,
];

const currentYear = new Date().getFullYear();

export default function StepVehicle() {
  const navigate = useNavigate();
  const session = getStoredDriverRegistrationSession();
  const phone = String(session.phone || '').replace(/\D/g, '').slice(-10);
  const registrationId = String(session.registrationId || '').trim();
  const saved = session.vehicle || {};

  const [locations, setLocations] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [form, setForm] = useState({
    locationId: saved.locationId || '',
    serviceCategories: saved.serviceCategories || ['taxi'],
    vehicleTypeId: saved.vehicleTypeId || '',
    rcNumber: saved.rcNumber || '',
    make: saved.make || '',
    model: saved.model || '',
    year: saved.year || '',
    number: saved.number || '',
    color: saved.color || '',
    customFields: saved.customFields || {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phone || !registrationId) {
      navigate('/taxi/driver/login', { replace: true });
    }
  }, [navigate, phone, registrationId]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [locationResponse, typeResponse, templateResponse] = await Promise.all([
          getDriverServiceLocations(),
          getDriverVehicleTypes(),
          getDriverVehicleFieldTemplates('driver').catch(() => null),
        ]);

        if (!active) return;

        setLocations(listOf(unwrap(locationResponse)));
        setVehicleTypes(listOf(unwrap(typeResponse)));
        setTemplates(listOf(unwrap(templateResponse)));
      } catch {
        // The form still works with free-text entry if an option list fails;
        // blocking the whole step on a dropdown would be worse.
      } finally {
        if (active) setOptionsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveDriverRegistrationSession({
      ...getStoredDriverRegistrationSession(),
      vehicle: form,
    });
  }, [form]);

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const setCustom = (key) => (value) =>
    setForm((current) => ({ ...current, customFields: { ...current.customFields, [key]: value } }));

  /** What the admin has configured, keyed for label and required lookups. */
  const fieldConfig = useMemo(() => {
    const map = new Map();
    templates
      .filter((item) => item.active !== false && ['individual', 'both'].includes(String(item.account_type || 'both')))
      .forEach((item) => map.set(String(item.field_key || ''), item));
    return map;
  }, [templates]);

  const labelFor = (key, fallback) => fieldConfig.get(key)?.name || fallback;
  const placeholderFor = (key, fallback) => fieldConfig.get(key)?.placeholder || fallback;
  const requiredFor = (key) => fieldConfig.get(key)?.is_required !== false;

  const customFieldConfigs = useMemo(
    () => templates.filter((item) => item.active !== false && !BUILT_IN_KEYS.has(String(item.field_key || ''))),
    [templates],
  );

  const plate = String(form.number || '').toUpperCase();
  const plateValid = plate.length > 0 && PLATE_PATTERNS.some((pattern) => pattern.test(plate));
  const yearValid = /^\d{4}$/.test(String(form.year)) && Number(form.year) >= 1980 && Number(form.year) <= currentYear;

  const ready =
    Boolean(form.locationId) &&
    Boolean(form.vehicleTypeId) &&
    form.serviceCategories.length > 0 &&
    Boolean(String(form.rcNumber).trim()) &&
    (!requiredFor('make') || Boolean(form.make.trim())) &&
    (!requiredFor('model') || Boolean(form.model.trim())) &&
    (!requiredFor('color') || Boolean(form.color.trim())) &&
    (!requiredFor('year') || yearValid) &&
    (!requiredFor('number') || plateValid) &&
    customFieldConfigs.every(
      (config) => config.is_required === false || String(form.customFields?.[config.field_key] || '').trim(),
    );

  const handleContinue = async () => {
    if (requiredFor('number') && !plateValid) {
      setError('Enter the plate number as it appears on the vehicle, for example AS01AB1234.');
      return;
    }

    if (requiredFor('year') && !yearValid) {
      setError(`Enter a manufacturing year between 1980 and ${currentYear}.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectedLocation = locations.find((item) => String(item._id || item.id) === String(form.locationId));

      await saveDriverVehicle({
        registrationId,
        phone,
        registerFor: form.serviceCategories[0] || 'taxi',
        serviceCategories: form.serviceCategories,
        locationId: form.locationId,
        locationName: selectedLocation?.service_location_name || selectedLocation?.name || '',
        vehicleTypeId: form.vehicleTypeId,
        rcNumber: String(form.rcNumber).trim().toUpperCase(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: String(form.year).trim(),
        number: plate,
        color: form.color.trim(),
        customFields: form.customFields,
      });

      navigate('/taxi/driver/step-documents');
    } catch (saveError) {
      setError(saveError?.message || 'Could not save your vehicle details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (optionsLoading) {
    return (
      <div className="dh-onboarding flex min-h-dvh items-center justify-center">
        <Loader2 size={26} className="animate-spin text-[var(--dh-primary)]" />
      </div>
    );
  }

  return (
    <OnboardingShell
      step="vehicle"
      eyebrow="Your vehicle"
      title="What will you drive?"
      subtitle="An admin checks these against your papers before you go live."
      error={error}
      onBack={() => navigate('/taxi/driver/step-personal')}
      primaryDisabled={!ready}
      primaryLoading={loading}
      onPrimary={handleContinue}
    >
      <div className="dh-card space-y-4 p-5">
        <SelectField
          label={labelFor('locationId', 'Operating city')}
          icon={MapPin}
          value={form.locationId}
          onChange={set('locationId')}
          placeholder="Where will you drive?"
          options={locations.map((item) => ({
            value: String(item._id || item.id),
            label: item.service_location_name || item.name || 'Unnamed',
          }))}
        />

        <ChipGroup
          label={labelFor('serviceCategories', 'Trips you will take')}
          value={form.serviceCategories[0] || ''}
          onChange={(value) => set('serviceCategories')([value])}
          options={SERVICE_CATEGORIES}
          columns={2}
        />

        <SelectField
          label={labelFor('vehicleTypeId', 'Vehicle type')}
          icon={Car}
          value={form.vehicleTypeId}
          onChange={set('vehicleTypeId')}
          placeholder="Pick your vehicle"
          options={vehicleTypes.map((item) => ({
            value: String(item._id || item.id),
            label: item.name || 'Vehicle',
          }))}
        />
      </div>

      <div className="dh-card space-y-4 p-5">
        <Field
          label="RC number"
          icon={FileText}
          value={form.rcNumber}
          onChange={(value) => set('rcNumber')(value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
          placeholder="Registration certificate number"
          valid={Boolean(String(form.rcNumber).trim())}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label={labelFor('make', 'Brand')}
            value={form.make}
            onChange={set('make')}
            placeholder={placeholderFor('make', 'Maruti Suzuki')}
            valid={Boolean(form.make.trim())}
          />
          <Field
            label={labelFor('model', 'Model')}
            value={form.model}
            onChange={set('model')}
            placeholder={placeholderFor('model', 'Swift')}
            valid={Boolean(form.model.trim())}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label={labelFor('year', 'Year')}
            icon={Calendar}
            inputMode="numeric"
            maxLength={4}
            value={form.year}
            onChange={(value) => set('year')(value.replace(/\D/g, ''))}
            placeholder={String(currentYear)}
            valid={yearValid}
            invalid={Boolean(form.year) && !yearValid}
          />
          <Field
            label={labelFor('color', 'Colour')}
            icon={Palette}
            value={form.color}
            onChange={set('color')}
            placeholder={placeholderFor('color', 'White')}
            valid={Boolean(form.color.trim())}
          />
        </div>

        <Field
          label={labelFor('number', 'Plate number')}
          icon={Hash}
          value={plate}
          onChange={(value) => set('number')(value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
          placeholder={placeholderFor('number', 'AS01AB1234')}
          valid={plateValid}
          invalid={plate.length > 0 && !plateValid}
          hint={plate.length > 0 && !plateValid ? 'Use the format AS01AB1234.' : ''}
        />
      </div>

      {customFieldConfigs.length > 0 && (
        <div className="dh-card space-y-4 p-5">
          {customFieldConfigs.map((config) => (
            <Field
              key={config.field_key}
              label={config.name || config.field_key}
              value={form.customFields?.[config.field_key] || ''}
              onChange={setCustom(config.field_key)}
              placeholder={config.placeholder || ''}
              hint={config.help_text || ''}
              valid={Boolean(String(form.customFields?.[config.field_key] || '').trim())}
            />
          ))}
        </div>
      )}
    </OnboardingShell>
  );
}
