/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/EditRestaurant.jsx (tools/port.js first pass). */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '../../../../lib/webRouter';
import { adminAPI } from '../../../../api/food';
import { Input } from '../../../../components/shadcn';
import { Button } from '../../../../components/shadcn';
import PlacesSearchInput from './PlacesSearchInput';
import { Label } from '../../../../components/shadcn';
import { ArrowLeft, Loader2 } from 'lucide-react-native';
import { Button as HButton, Div, H1, H2, Option, P, ScrollDiv, Section, Select, Span, Icon as UiIcon } from '../../../../components/web';
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-5xl mx-auto">
        <Div className="flex items-center justify-between gap-4 mb-6">
          <Div className="flex items-center gap-3">
            <HButton onClick={() => navigate('/admin/food/restaurants')} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50">
              <UiIcon as={ArrowLeft} className="w-4 h-4 text-slate-700" />
            </HButton>
            <Div>
              <H1 className="text-2xl font-bold text-slate-900">Edit Restaurant</H1>
              <P className="text-sm text-slate-500">{restaurant?.name || restaurant?.restaurantName || restaurantId}</P>
            </Div>
          </Div>
        </Div>

        {loading ? (
          <Div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-600">
            <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
            Loading...
          </Div>
        ) : error ? (
          <Div className="bg-white rounded-xl border border-slate-200 p-6">
            <P className="text-red-600 text-sm">{error}</P>
          </Div>
        ) : (
          <Div className="space-y-6">
            <Section className="bg-white rounded-xl border border-slate-200 p-6">
              <Div className="flex items-center justify-between gap-3 mb-4">
                <H2 className="text-lg font-semibold text-slate-900">Basic Details</H2>
                <Button onClick={handleSaveDetails} disabled={savingDetails}>
                  {savingDetails ? (
                    <Span className="inline-flex items-center gap-2">
                      <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                      Saving...
                    </Span>
                  ) : (
                    'Save Details'
                  )}
                </Button>
              </Div>

              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Div>
                  <Label>Restaurant Name</Label>
                  <Input
                    value={detailsForm.name}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        name: e.target.value,
                      }))
                    }
                  />
                </Div>
                <Div>
                  <Label>Pure Veg</Label>
                  <Div className="mt-2 flex items-center gap-2">
                    <HButton
                      type="button"
                      onClick={() =>
                        setDetailsForm((p) => ({
                          ...p,
                          pureVegRestaurant: true,
                        }))
                      }
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.pureVegRestaurant === true ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      Yes
                    </HButton>
                    <HButton
                      type="button"
                      onClick={() =>
                        setDetailsForm((p) => ({
                          ...p,
                          pureVegRestaurant: false,
                        }))
                      }
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.pureVegRestaurant === false ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      No
                    </HButton>
                  </Div>
                </Div>
                <Div>
                  <Label>Primary Email</Label>
                  <Input
                    value={detailsForm.email}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        email: e.target.value,
                      }))
                    }
                  />
                </Div>
                <Div>
                  <Label>Owner Name</Label>
                  <Input
                    value={detailsForm.ownerName}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        ownerName: e.target.value,
                      }))
                    }
                  />
                </Div>
                <Div>
                  <Label>Owner Email</Label>
                  <Input
                    value={detailsForm.ownerEmail}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        ownerEmail: e.target.value,
                      }))
                    }
                  />
                </Div>
                <Div>
                  <Label>Owner Phone</Label>
                  <Input
                    value={detailsForm.ownerPhone}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        ownerPhone: e.target.value,
                      }))
                    }
                  />
                </Div>
                <Div>
                  <Label>Primary Contact Number</Label>
                  <Input
                    value={detailsForm.primaryContactNumber}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        primaryContactNumber: e.target.value,
                      }))
                    }
                  />
                </Div>
                <Div className="md:col-span-2">
                  <Label>Cuisines (comma separated)</Label>
                  <Input
                    value={detailsForm.cuisinesText}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        cuisinesText: e.target.value,
                      }))
                    }
                  />
                </Div>
                <Div>
                  <Label>Estimated Delivery Time (minutes)</Label>
                  <Input
                    type="number"
                    value={detailsForm.estimatedDeliveryTimeMinutes}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        estimatedDeliveryTimeMinutes: e.target.value,
                      }))
                    }
                  />
                </Div>
                <Div>
                  <Label>Offer</Label>
                  <Input
                    value={detailsForm.offer}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        offer: e.target.value,
                      }))
                    }
                  />
                </Div>
                <Div>
                  <Label>Takeaway (Pickup) Enabled</Label>
                  <Div className="mt-2 flex items-center gap-2">
                    <HButton
                      type="button"
                      onClick={() =>
                        setDetailsForm((p) => ({
                          ...p,
                          takeawayEnabled: true,
                        }))
                      }
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.takeawayEnabled === true ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      Enabled
                    </HButton>
                    <HButton
                      type="button"
                      onClick={() =>
                        setDetailsForm((p) => ({
                          ...p,
                          takeawayEnabled: false,
                        }))
                      }
                      className={`px-3 py-1.5 text-xs rounded-full border ${detailsForm.takeawayEnabled === false ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      Disabled
                    </HButton>
                  </Div>
                </Div>
              </Div>
            </Section>

            <Section className="bg-white rounded-xl border border-slate-200 p-6">
              <Div className="flex items-center justify-between gap-3 mb-4">
                <Div>
                  <H2 className="text-lg font-semibold text-slate-900">Location</H2>
                  {currentZoneLabel ? <P className="text-xs text-slate-500 mt-1">Current Zone: {currentZoneLabel}</P> : null}
                </Div>
                <Button onClick={handleSaveLocation} disabled={savingLocation}>
                  {savingLocation ? (
                    <Span className="inline-flex items-center gap-2">
                      <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                      Saving...
                    </Span>
                  ) : (
                    'Save Location'
                  )}
                </Button>
              </Div>

              {locationError ? (
                <Div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{locationError}</Div>
              ) : null}

              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Div className="md:col-span-2">
                  <Label>Service Zone</Label>
                  <Select
                    value={locationForm.zoneId || ''}
                    onChange={(e) =>
                      setLocationForm((p) => ({
                        ...p,
                        zoneId: e.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                    disabled={zonesLoading}
                  >
                    <Option value="">{zonesLoading ? 'Loading zones...' : 'Select a zone'}</Option>
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
                </Div>

                <Div className="md:col-span-2">
                  <Label>Search location</Label>
                  <PlacesSearchInput
                    placeholder="Start typing your restaurant address..."
                    className="mt-1 bg-white text-sm text-black placeholder:text-gray-500"
                    onPlace={handlePlaceSelected}
                    onError={setLocationError}
                  />
                  <P className="text-[11px] text-slate-500 mt-1">Select a suggestion from the dropdown to fill address + coordinates.</P>
                </Div>

                <Div className="md:col-span-2">
                  <Label>Formatted Address</Label>
                  <Input value={locationForm.formattedAddress} readOnly className="mt-1 bg-slate-50" />
                </Div>
                <Div>
                  <Label>Area</Label>
                  <Input value={locationForm.area} readOnly className="mt-1 bg-slate-50" />
                </Div>
                <Div>
                  <Label>City</Label>
                  <Input value={locationForm.city} readOnly className="mt-1 bg-slate-50" />
                </Div>
                <Div>
                  <Label>State</Label>
                  <Input value={locationForm.state} readOnly className="mt-1 bg-slate-50" />
                </Div>
                <Div>
                  <Label>Pincode</Label>
                  <Input value={locationForm.pincode} readOnly className="mt-1 bg-slate-50" />
                </Div>
                <Div className="md:col-span-2">
                  <Label>Landmark</Label>
                  <Input
                    value={locationForm.landmark}
                    onChange={(e) =>
                      setLocationForm((p) => ({
                        ...p,
                        landmark: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </Div>
              </Div>
            </Section>
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
}
