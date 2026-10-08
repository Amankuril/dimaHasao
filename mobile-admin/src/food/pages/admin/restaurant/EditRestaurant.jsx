/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/EditRestaurant.jsx (tools/port.js first pass). */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '../../../../lib/webRouter';
import { adminAPI } from '../../../../api/food';
import PlacesSearchInput from './PlacesSearchInput';
import { ArrowLeft, Loader2 } from 'lucide-react-native';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  LoadingState,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Button as HButton, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
const debugError = (..._args) => {};
const toNumberOrEmpty = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : '';
};
const isNearZero = (n) => Math.abs(Number(n) || 0) < 0.000001;
const normalizeRestaurantId = (r) => r?._id || r?.id || r?.restaurantId || '';
const normalizeZoneId = (zoneId) => {
  if (!zoneId) return '';
  if (typeof zoneId === 'string') return zoneId;
  return zoneId?._id || zoneId?.id || '';
};
const normalizeLocationFormFromRestaurant = (restaurant) => {
  const loc = restaurant?.location || restaurant?.onboarding?.step1?.location || {};
  const lat = toNumberOrEmpty(loc?.latitude ?? restaurant?.latitude);
  const lng = toNumberOrEmpty(loc?.longitude ?? restaurant?.longitude);
  const hasValidCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && !isNearZero(lat) && !isNearZero(lng);
  const formattedAddress = loc?.formattedAddress || loc?.addressLine1 || restaurant?.formattedAddress || restaurant?.addressLine1 || restaurant?.address || '';
  return {
    zoneId: normalizeZoneId(restaurant?.zoneId),
    formattedAddress,
    addressLine1: loc?.addressLine1 || restaurant?.addressLine1 || formattedAddress,
    addressLine2: loc?.addressLine2 || restaurant?.addressLine2 || '',
    area: loc?.area || restaurant?.area || '',
    city: loc?.city || restaurant?.city || '',
    state: loc?.state || restaurant?.state || '',
    pincode: loc?.pincode || restaurant?.pincode || '',
    landmark: loc?.landmark || restaurant?.landmark || '',
    latitude: hasValidCoords ? lat : '',
    longitude: hasValidCoords ? lng : '',
  };
};
const normalizeDetailsFormFromRestaurant = (restaurant) => {
  return {
    name: restaurant?.name || restaurant?.restaurantName || '',
    pureVegRestaurant: typeof restaurant?.pureVegRestaurant === 'boolean' ? restaurant.pureVegRestaurant : false,
    ownerName: restaurant?.ownerName || '',
    ownerEmail: restaurant?.ownerEmail || '',
    ownerPhone: restaurant?.ownerPhone || '',
    primaryContactNumber: restaurant?.primaryContactNumber || '',
    email: restaurant?.email || '',
    cuisinesText: Array.isArray(restaurant?.cuisines) ? restaurant.cuisines.join(', ') : '',
    estimatedDeliveryTimeMinutes: restaurant?.estimatedDeliveryTimeMinutes ?? restaurant?.estimatedDeliveryTime ?? '',
    offer: restaurant?.offer || '',
    openingTime: restaurant?.openingTime || restaurant?.deliveryTimings?.openingTime || '',
    closingTime: restaurant?.closingTime || restaurant?.deliveryTimings?.closingTime || '',
    isActive: restaurant?.isActive !== false,
    takeawayEnabled: restaurant?.takeawaySettings?.isEnabled ?? false,
  };
};
export default function EditRestaurant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [error, setError] = useState('');
  const [restaurant, setRestaurant] = useState(null);
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [detailsForm, setDetailsForm] = useState(() => normalizeDetailsFormFromRestaurant(null));
  const [locationForm, setLocationForm] = useState(() => normalizeLocationFormFromRestaurant(null));
  const [locationError, setLocationError] = useState('');
  const restaurantId = useMemo(() => {
    if (id) return id;
    return normalizeRestaurantId(restaurant);
  }, [id, restaurant]);
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!restaurantId) return;
      try {
        setLoading(true);
        setError('');
        const res = await adminAPI.getRestaurantById(restaurantId);
        const data = res?.data?.data || null;
        if (!mounted) return;
        if (!res?.data?.success || !data) {
          setError(res?.data?.message || 'Failed to load restaurant');
          setRestaurant(null);
          return;
        }
        setRestaurant(data);
        setDetailsForm(normalizeDetailsFormFromRestaurant(data));
        setLocationForm(normalizeLocationFormFromRestaurant(data));
      } catch (e) {
        debugError(e);
        if (!mounted) return;
        setError(e?.response?.data?.message || 'Failed to load restaurant');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [restaurantId]);
  useEffect(() => {
    let mounted = true;
    setZonesLoading(true);
    adminAPI
      .getZones({
        limit: 1000,
      })
      .then((res) => {
        const list = res?.data?.data?.zones || res?.data?.data?.data?.zones || res?.data?.data || [];
        if (!mounted) return;
        setZones(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!mounted) return;
        setZones([]);
      })
      .finally(() => {
        if (!mounted) return;
        setZonesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const parsePlace = (place) => {
    const formattedAddress = place?.formatted_address || '';
    const comps = Array.isArray(place?.address_components) ? place.address_components : [];
    const get = (types) => comps.find((c) => types.some((t) => c.types?.includes(t)))?.long_name || '';
    const area = get(['sublocality_level_1', 'sublocality', 'neighborhood']) || get(['locality']);
    const city = get(['locality']) || get(['administrative_area_level_2']);
    const state = get(['administrative_area_level_1']);
    const pincode = get(['postal_code']);
    const lat = place?.geometry?.location?.lat?.();
    const lng = place?.geometry?.location?.lng?.();
    return {
      formattedAddress,
      area,
      city,
      state,
      pincode,
      latitude: Number.isFinite(lat) ? Number(lat.toFixed(6)) : '',
      longitude: Number.isFinite(lng) ? Number(lng.toFixed(6)) : '',
    };
  };
  const handlePlaceSelected = (place) => {
    setLocationError('');
    const parsed = parsePlace(place);
    setLocationForm((prev) => ({
      ...prev,
      formattedAddress: parsed.formattedAddress || prev.formattedAddress,
      addressLine1: parsed.formattedAddress || prev.addressLine1,
      area: parsed.area || prev.area,
      city: parsed.city || prev.city,
      state: parsed.state || prev.state,
      pincode: parsed.pincode || prev.pincode,
      latitude: parsed.latitude !== '' ? parsed.latitude : prev.latitude,
      longitude: parsed.longitude !== '' ? parsed.longitude : prev.longitude,
    }));
  };
  const currentZoneLabel = useMemo(() => {
    const zid = normalizeZoneId(locationForm.zoneId);
    if (!zid) return '';
    const z = zones.find((x) => normalizeZoneId(x?._id || x?.id) === zid);
    return z?.name || z?.zoneName || '';
  }, [locationForm.zoneId, zones]);
  const handleSaveDetails = async () => {
    if (!restaurantId) return;
    try {
      setSavingDetails(true);
      const cuisines = String(detailsForm.cuisinesText || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const payload = {
        name: detailsForm.name,
        pureVegRestaurant: detailsForm.pureVegRestaurant === true,
        ownerName: detailsForm.ownerName,
        ownerEmail: detailsForm.ownerEmail,
        ownerPhone: detailsForm.ownerPhone,
        primaryContactNumber: detailsForm.primaryContactNumber,
        email: detailsForm.email,
        cuisines,
        estimatedDeliveryTimeMinutes: detailsForm.estimatedDeliveryTimeMinutes === '' ? undefined : Number(detailsForm.estimatedDeliveryTimeMinutes),
        offer: detailsForm.offer,
        openingTime: detailsForm.openingTime,
        closingTime: detailsForm.closingTime,
        isActive: detailsForm.isActive !== false,
        takeawaySettings: {
          isEnabled: detailsForm.takeawayEnabled === true,
        },
      };
      const res = await adminAPI.updateRestaurant(restaurantId, payload);
      const updated = res?.data?.data?.restaurant || res?.data?.data || null;
      if (updated) {
        setRestaurant((prev) => ({
          ...(prev || {}),
          ...updated,
        }));
      }
      alert('Restaurant details updated successfully');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update restaurant details');
    } finally {
      setSavingDetails(false);
    }
  };
  const handleSaveLocation = async () => {
    if (!restaurantId) return;
    const latitude = Number(locationForm.latitude);
    const longitude = Number(locationForm.longitude);
    if (!locationForm.zoneId) {
      alert('Please select a zone');
      return;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !locationForm.formattedAddress) {
      alert('Please select a location from dropdown');
      return;
    }
    try {
      setSavingLocation(true);
      const payload = {
        zoneId: locationForm.zoneId,
        latitude,
        longitude,
        coordinates: [longitude, latitude],
        formattedAddress: locationForm.formattedAddress || '',
        address: locationForm.formattedAddress || '',
        addressLine1: locationForm.addressLine1 || locationForm.formattedAddress || '',
        addressLine2: locationForm.addressLine2 || '',
        area: locationForm.area || '',
        city: locationForm.city || '',
        state: locationForm.state || '',
        landmark: locationForm.landmark || '',
        pincode: locationForm.pincode || '',
        zipCode: locationForm.pincode || '',
        postalCode: locationForm.pincode || '',
      };
      const res = await adminAPI.updateRestaurantLocation(restaurantId, payload);
      const updatedRestaurant = res?.data?.data?.restaurant || null;
      if (updatedRestaurant) {
        setRestaurant((prev) => ({
          ...(prev || {}),
          ...updatedRestaurant,
        }));
      }
      alert('Restaurant location updated successfully');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update restaurant location');
    } finally {
      setSavingLocation(false);
    }
  };
  const { columns } = useLayoutWidth();
  const subtitle = restaurant?.name || restaurant?.restaurantName || restaurantId || '';
  const detailsCols = `grid grid-cols-${columns} gap-3`;
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        title="Edit Restaurant"
        subtitle={subtitle}
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants', onPress: () => navigate('/admin/food/restaurants') }, { label: 'Edit' }]}
        actions={
          <Button onClick={() => navigate('/admin/food/restaurants')} className={BTN_SECONDARY} accessibilityLabel="Back to restaurants list">
            <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
            <Span className={BTN_TEXT_SECONDARY}>Back to list</Span>
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading restaurant…" />
      ) : error ? (
        <ErrorState title="Could not load this restaurant" message={error} />
      ) : !restaurant ? (
        <EmptyState title="Restaurant not found" message="This restaurant is no longer available." actionLabel="Back to list" onAction={() => navigate('/admin/food/restaurants')} />
      ) : (
        <Div className="gap-3">
          <Card>
            <SectionTitle>Basic details</SectionTitle>

            <Div className={detailsCols}>
              <Div className="col-span-full">
                <Field label="Restaurant name">
                  <Input
                    value={detailsForm.name}
                    className={INPUT}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        name: e.target.value,
                      }))
                    }
                  />
                </Field>
              </Div>
              <Field label="Primary email">
                <Input
                  type="email"
                  value={detailsForm.email}
                  className={INPUT}
                  onChange={(e) =>
                    setDetailsForm((p) => ({
                      ...p,
                      email: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Owner name">
                <Input
                  value={detailsForm.ownerName}
                  className={INPUT}
                  onChange={(e) =>
                    setDetailsForm((p) => ({
                      ...p,
                      ownerName: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Owner email">
                <Input
                  type="email"
                  value={detailsForm.ownerEmail}
                  className={INPUT}
                  onChange={(e) =>
                    setDetailsForm((p) => ({
                      ...p,
                      ownerEmail: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Owner phone">
                <Input
                  value={detailsForm.ownerPhone}
                  className={INPUT}
                  onChange={(e) =>
                    setDetailsForm((p) => ({
                      ...p,
                      ownerPhone: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Primary contact number">
                <Input
                  value={detailsForm.primaryContactNumber}
                  className={INPUT}
                  onChange={(e) =>
                    setDetailsForm((p) => ({
                      ...p,
                      primaryContactNumber: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Estimated delivery time" hint="In minutes">
                <Input
                  type="number"
                  value={detailsForm.estimatedDeliveryTimeMinutes}
                  className={INPUT}
                  onChange={(e) =>
                    setDetailsForm((p) => ({
                      ...p,
                      estimatedDeliveryTimeMinutes: e.target.value,
                    }))
                  }
                />
              </Field>
              <Div className="col-span-full">
                <Field label="Cuisines" hint="Comma separated">
                  <Input
                    value={detailsForm.cuisinesText}
                    className={INPUT}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        cuisinesText: e.target.value,
                      }))
                    }
                  />
                </Field>
              </Div>
              <Div className="col-span-full">
                <Field label="Offer">
                  <Input
                    value={detailsForm.offer}
                    className={INPUT}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        offer: e.target.value,
                      }))
                    }
                  />
                </Field>
              </Div>
              <Field label="Pure veg">
                <Div className="flex-row flex-wrap items-center gap-2">
                  <HButton
                    type="button"
                    onClick={() =>
                      setDetailsForm((p) => ({
                        ...p,
                        pureVegRestaurant: true,
                      }))
                    }
                    className={`h-11 px-4 items-center justify-center rounded-full border ${detailsForm.pureVegRestaurant === true ? 'bg-green-600 border-green-600' : 'bg-white border-slate-300'}`}
                  >
                    <Span className={`text-sm font-semibold ${detailsForm.pureVegRestaurant === true ? 'text-white' : 'text-slate-700'}`}>Yes</Span>
                  </HButton>
                  <HButton
                    type="button"
                    onClick={() =>
                      setDetailsForm((p) => ({
                        ...p,
                        pureVegRestaurant: false,
                      }))
                    }
                    className={`h-11 px-4 items-center justify-center rounded-full border ${detailsForm.pureVegRestaurant === false ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                  >
                    <Span className={`text-sm font-semibold ${detailsForm.pureVegRestaurant === false ? 'text-white' : 'text-slate-700'}`}>No</Span>
                  </HButton>
                </Div>
              </Field>
              <Field label="Takeaway (pickup)">
                <Div className="flex-row flex-wrap items-center gap-2">
                  <HButton
                    type="button"
                    onClick={() =>
                      setDetailsForm((p) => ({
                        ...p,
                        takeawayEnabled: true,
                      }))
                    }
                    className={`h-11 px-4 items-center justify-center rounded-full border ${detailsForm.takeawayEnabled === true ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                  >
                    <Span className={`text-sm font-semibold ${detailsForm.takeawayEnabled === true ? 'text-white' : 'text-slate-700'}`}>Enabled</Span>
                  </HButton>
                  <HButton
                    type="button"
                    onClick={() =>
                      setDetailsForm((p) => ({
                        ...p,
                        takeawayEnabled: false,
                      }))
                    }
                    className={`h-11 px-4 items-center justify-center rounded-full border ${detailsForm.takeawayEnabled === false ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                  >
                    <Span className={`text-sm font-semibold ${detailsForm.takeawayEnabled === false ? 'text-white' : 'text-slate-700'}`}>Disabled</Span>
                  </HButton>
                </Div>
              </Field>
            </Div>

            <HButton onClick={handleSaveDetails} disabled={savingDetails} className={`${BTN_PRIMARY} mt-4`}>
              {savingDetails ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>{savingDetails ? 'Saving…' : 'Save details'}</Span>
            </HButton>
          </Card>

          <Card>
            <SectionTitle>Location</SectionTitle>
            {currentZoneLabel ? <P className="text-xs text-slate-500 -mt-2 mb-3">Current zone: {currentZoneLabel}</P> : null}

            {locationError ? (
              <Div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <P className="text-sm text-amber-800">{locationError}</P>
              </Div>
            ) : null}

            <Div className={detailsCols}>
              <Div className="col-span-full">
                <Field label="Service zone" required>
                  <Select
                    value={locationForm.zoneId || ''}
                    onChange={(e) =>
                      setLocationForm((p) => ({
                        ...p,
                        zoneId: e.target.value,
                      }))
                    }
                    className={INPUT}
                    disabled={zonesLoading}
                  >
                    <Option value="">{zonesLoading ? 'Loading zones…' : 'Select a zone'}</Option>
                    {zones.map((z) => {
                      const zid = normalizeZoneId(z?._id || z?.id);
                      const label = z?.name || z?.zoneName || zid;
                      return (
                        <Option key={zid} value={zid}>
                          {label}
                        </Option>
                      );
                    })}
                  </Select>
                </Field>
              </Div>

              <Div className="col-span-full">
                <Field label="Search location" required hint="Select a suggestion from the list to fill the address and coordinates.">
                  <PlacesSearchInput placeholder="Start typing the restaurant address…" className={INPUT} onPlace={handlePlaceSelected} onError={setLocationError} />
                </Field>
              </Div>

              <Div className="col-span-full">
                <Field label="Formatted address">
                  <Input value={locationForm.formattedAddress} readOnly className={`${INPUT} bg-slate-50 text-slate-600`} />
                </Field>
              </Div>
              <Field label="Area">
                <Input value={locationForm.area} readOnly className={`${INPUT} bg-slate-50 text-slate-600`} />
              </Field>
              <Field label="City">
                <Input value={locationForm.city} readOnly className={`${INPUT} bg-slate-50 text-slate-600`} />
              </Field>
              <Field label="State">
                <Input value={locationForm.state} readOnly className={`${INPUT} bg-slate-50 text-slate-600`} />
              </Field>
              <Field label="Pincode">
                <Input value={locationForm.pincode} readOnly className={`${INPUT} bg-slate-50 text-slate-600`} />
              </Field>
              <Div className="col-span-full">
                <Field label="Landmark">
                  <Input
                    value={locationForm.landmark}
                    className={INPUT}
                    onChange={(e) =>
                      setLocationForm((p) => ({
                        ...p,
                        landmark: e.target.value,
                      }))
                    }
                  />
                </Field>
              </Div>
            </Div>

            <HButton onClick={handleSaveLocation} disabled={savingLocation} className={`${BTN_PRIMARY} mt-4`}>
              {savingLocation ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>{savingLocation ? 'Saving…' : 'Save location'}</Span>
            </HButton>
          </Card>
        </Div>
      )}
    </AdminPage>
  );
}
