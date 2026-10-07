import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { confirm } from '../../../../lib/notify';
import { clearRouteState } from '../../../../lib/routeState';
import { localStore } from '../../../../lib/storage';
import { useLocation, useNavigate } from '../../../../lib/webRouter';
import useLocationSearch from '../../../hooks/useLocationSearch';
import { hotelService, propertyService } from '../../../services/apiService';
import { emptyDocuments, initialPropertyForm } from './constants';
import { askImageSource, pickDocument, pickImages, uploadErrorMessage, uploadFiles } from './uploads';

/*
 * Port of the state and handlers of
 * Frontend/src/modules/Hotel/app/partner/pages/AddResortWizard.jsx.
 * The draft the web keeps in localStorage is kept in the app's localStore.
 */

const clone = (v) => JSON.parse(JSON.stringify(v));

function setPath(prev, path, value) {
  const next = clone(prev);
  const keys = Array.isArray(path) ? path : String(path).split('.');
  let ref = next;
  for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
  ref[keys[keys.length - 1]] = value;
  return next;
}

const withTimeout = (promise, ms, message) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error(message), { code: 3 })), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });

export function useResortWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  // react-router's location.state belongs to one history entry; the app keeps it per path, so
  // take it once on mount and drop it, or the next "add a resort" would reopen this one in edit mode.
  const [entryState] = useState(() => location.state);
  useEffect(() => {
    clearRouteState(location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const existingProperty = entryState?.property || null;
  const isEditMode = !!existingProperty;
  const initialStep = entryState?.initialStep || 1;
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdProperty, setCreatedProperty] = useState(null);

  // Maps / Location State
  const nearbySearch = useLocationSearch();
  const [editingNearbyIndex, setEditingNearbyIndex] = useState(null);
  const [tempNearbyPlace, setTempNearbyPlace] = useState({ name: '', type: 'tourist', distanceKm: '' });
  const locationSearch = useLocationSearch();

  const [uploading, setUploading] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [propertyForm, setPropertyForm] = useState(initialPropertyForm);
  const [roomTypes, setRoomTypes] = useState([]);
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [editingRoomTypeIndex, setEditingRoomTypeIndex] = useState(null);
  const [originalRoomTypeIds, setOriginalRoomTypeIds] = useState([]);

  // --- Persistence Logic ---
  const STORAGE_KEY = `hoomzo_resort_wizard_draft_${existingProperty?._id || 'new'}`;
  const discardedRef = useRef(false);

  // 1. Load draft
  useEffect(() => {
    if (isEditMode) return;
    const saved = localStore.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { step: savedStep, propertyForm: savedForm, roomTypes: savedRooms, createdProperty: savedProp } = JSON.parse(saved);
        setStep(savedStep);
        setPropertyForm(savedForm);
        setRoomTypes(savedRooms);
        if (savedProp) setCreatedProperty(savedProp);
      } catch (e) {
        console.error('Failed to load resort draft', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Save draft
  useEffect(() => {
    if (isEditMode) return undefined;
    const timeout = setTimeout(() => {
      if (discardedRef.current) return;
      localStore.setItem(STORAGE_KEY, JSON.stringify({ step, propertyForm, roomTypes, createdProperty }));
    }, 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, propertyForm, roomTypes, createdProperty]);

  const updatePropertyForm = useCallback((path, value) => {
    setPropertyForm((prev) => setPath(prev, path, value));
  }, []);

  const updateRoomType = (path, value) => {
    setEditingRoomType((prev) => (prev ? setPath(prev, path, value) : prev));
  };

  const goToStep = (n) => {
    setError('');
    setStep(n);
  };

  // --- API / Maps Logic ---
  const applyResolvedAddress = (res, lat, lng) => {
    updatePropertyForm(['location', 'coordinates'], [String(lng), String(lat)]);
    updatePropertyForm('address', {
      country: res.country || '',
      state: res.state || '',
      city: res.city || '',
      area: res.area || '',
      fullAddress: res.fullAddress || '',
      pincode: res.pincode || '',
    });
  };

  const fetchCurrentLocation = async () => {
    setError('');
    setLoadingLocation(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        throw Object.assign(new Error('denied'), { code: 1 });
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        throw Object.assign(new Error('unavailable'), { code: 2 });
      }
      const pos = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 15000, 'Location request timed out.');
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const res = await hotelService.getAddressFromCoordinates(lat, lng);
      applyResolvedAddress(res, lat, lng);
    } catch (err) {
      console.error('[fetchCurrentLocation] Error:', err);
      if (err && typeof err.code === 'number') {
        if (err.code === 1) setError('Location permission denied. Please enable it in your device settings.');
        else if (err.code === 2) setError('Location unavailable. Check your GPS/network.');
        else if (err.code === 3) setError('Location request timed out.');
        else setError(`Location error: ${err.message || 'Unknown error'}`);
      } else {
        const msg = err?.response?.data?.message || err?.message || 'Failed to fetch address from coordinates';
        setError(msg);
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  const selectLocationResult = async (place) => {
    try {
      setError('');
      const lat = place.lat;
      const lng = place.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      const res = await hotelService.getAddressFromCoordinates(lat, lng);
      applyResolvedAddress(res, lat, lng);
      locationSearch.clear();
    } catch {
      setError('Failed to use selected location');
    }
  };

  const selectNearbyPlace = async (place) => {
    try {
      setTempNearbyPlace((prev) => ({ ...prev, name: place.name || '', type: place.type || 'tourist', distanceKm: '' }));
      nearbySearch.clear();

      let originLat = Number(propertyForm.location.coordinates[1] || 0);
      let originLng = Number(propertyForm.location.coordinates[0] || 0);
      const destLat = place.lat;
      const destLng = place.lng;

      // Auto-fix: if coordinates are missing, geocode whatever address info there is.
      if (!originLat || !originLng) {
        const { fullAddress, area, city, state, country } = propertyForm.address;
        const addressParts = [fullAddress, area, city, state, country].filter((part) => part && String(part).trim());
        if (addressParts.length > 0) {
          try {
            const res = await hotelService.searchLocation(addressParts.join(', '));
            if (res?.results?.[0]?.lat) {
              originLat = res.results[0].lat;
              originLng = res.results[0].lng;
              updatePropertyForm(['location', 'coordinates'], [String(originLng), String(originLat)]);
            }
          } catch (e) {
            console.warn('Failed to auto-geocode address error:', e);
          }
        }
      }

      if (originLat && originLng && destLat && destLng) {
        const distRes = await hotelService.calculateDistance(originLat, originLng, destLat, destLng);
        if (distRes && typeof distRes.distanceKm !== 'undefined') {
          setTempNearbyPlace((prev) => ({ ...prev, distanceKm: String(distRes.distanceKm) }));
        }
      }
    } catch (err) {
      console.error('Error selecting nearby place:', err);
    }
  };

  const startAddNearbyPlace = () => {
    if (propertyForm.nearbyPlaces.length >= 5) {
      setError('Maximum 5 nearby places allowed');
      return;
    }
    setError('');
    setEditingNearbyIndex(-1);
    setTempNearbyPlace({ name: '', type: 'tourist', distanceKm: '' });
    nearbySearch.clear();
  };

  const startEditNearbyPlace = (index) => {
    setError('');
    setEditingNearbyIndex(index);
    setTempNearbyPlace({ ...propertyForm.nearbyPlaces[index] });
    nearbySearch.clear();
  };

  const saveNearbyPlace = () => {
    if (!tempNearbyPlace.name || !tempNearbyPlace.distanceKm) {
      setError('Name and Distance are required');
      return;
    }
    const arr = [...propertyForm.nearbyPlaces];
    if (editingNearbyIndex === -1) arr.push(tempNearbyPlace);
    else arr[editingNearbyIndex] = tempNearbyPlace;
    updatePropertyForm('nearbyPlaces', arr);
    setEditingNearbyIndex(null);
    setError('');
  };

  const deleteNearbyPlace = (index) => {
    updatePropertyForm('nearbyPlaces', propertyForm.nearbyPlaces.filter((_, i) => i !== index));
  };

  const cancelEditNearbyPlace = () => {
    setEditingNearbyIndex(null);
    setError('');
  };

  // --- Room Type ---
  const startAddRoomType = () => {
    setError('');
    setEditingRoomTypeIndex(-1);
    setEditingRoomType({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name: '',
      inventoryType: 'room',
      roomCategory: 'private',
      maxAdults: '',
      maxChildren: 0,
      totalInventory: '',
      pricePerNight: '',
      extraAdultPrice: 0,
      extraChildPrice: 0,
      images: [],
      amenities: [],
      isActive: true,
    });
  };

  const startEditRoomType = (index) => {
    setError('');
    setEditingRoomTypeIndex(index);
    const rt = roomTypes[index];
    setEditingRoomType({
      ...rt,
      images: Array.isArray(rt.images) ? rt.images : [],
      amenities: Array.isArray(rt.amenities) ? rt.amenities : [],
    });
  };

  const deleteRoomType = (index) => {
    setRoomTypes((prev) => prev.filter((_, i) => i !== index));
    if (editingRoomTypeIndex === index) {
      setEditingRoomType(null);
      setEditingRoomTypeIndex(null);
    }
  };

  const cancelEditRoomType = () => {
    setEditingRoomType(null);
    setEditingRoomTypeIndex(null);
    setError('');
  };

  const saveRoomType = () => {
    if (!editingRoomType) return;
    if (!editingRoomType.name || !editingRoomType.pricePerNight) {
      setError('Room type name and price required');
      return;
    }
    if ((editingRoomType.images || []).filter(Boolean).length < 3) {
      setError('Please upload at least 3 room images');
      return;
    }
    const next = [...roomTypes];
    if (editingRoomTypeIndex === -1 || editingRoomTypeIndex == null) next.push(editingRoomType);
    else next[editingRoomTypeIndex] = editingRoomType;
    setRoomTypes(next);
    setEditingRoomType(null);
    setEditingRoomTypeIndex(null);
    setError('');
  };

  const toggleRoomAmenity = (label) => {
    setEditingRoomType((prev) => {
      if (!prev) return prev;
      const has = prev.amenities.includes(label);
      return { ...prev, amenities: has ? prev.amenities.filter((a) => a !== label) : [...prev.amenities, label] };
    });
  };

  // --- Images ---
  /**
   * Pick (camera or library) and upload. `type` is cover | gallery | room | doc_<n>;
   * onDone receives the uploaded URLs.
   */
  const pickAndUpload = async (type, onDone) => {
    if (uploading) return;
    const multiple = type === 'gallery' || type === 'room';
    try {
      setError('');
      let files;
      if (type.startsWith('doc')) {
        const file = await pickDocument();
        files = file ? [file] : [];
      } else {
        const source = await askImageSource();
        if (!source) return;
        files = await pickImages({ source, multiple });
      }
      if (!files.length) return;
      setUploading(type);
      const urls = await uploadFiles(files);
      onDone(urls);
    } catch (err) {
      console.error('Upload failed', err);
      setError(uploadErrorMessage(err));
    } finally {
      setUploading(null);
    }
  };

  const uploadCover = () => pickAndUpload('cover', (urls) => urls && urls.length > 0 && updatePropertyForm('coverImage', urls[0]));
  const uploadGallery = () =>
    pickAndUpload('gallery', (urls) => {
      if (urls && urls.length > 0) setPropertyForm((prev) => ({ ...prev, propertyImages: [...prev.propertyImages, ...urls] }));
    });
  const uploadRoomImages = () =>
    pickAndUpload('room', (urls) => urls.length && setEditingRoomType((prev) => ({ ...prev, images: [...(prev.images || []), ...urls] })));
  const uploadDocument = (idx) =>
    pickAndUpload(`doc_${idx}`, (urls) => {
      if (urls[0]) {
        setPropertyForm((prev) => {
          const documents = prev.documents.map((d, i) => (i === idx ? { ...d, fileUrl: urls[0] } : d));
          return { ...prev, documents };
        });
      }
    });

  const handleRemoveImage = async (url, type, index = null) => {
    if (!url) return;
    try {
      if (url.includes('cloudinary.com') && url.includes('rukkoin')) {
        await hotelService.deleteImage(url);
      }
    } catch (err) {
      console.warn('Delete image failed:', err);
    }

    if (type === 'cover') {
      updatePropertyForm('coverImage', '');
    } else if (type === 'gallery') {
      setPropertyForm((prev) => {
        const arr = [...prev.propertyImages];
        arr.splice(index, 1);
        return { ...prev, propertyImages: arr };
      });
    } else if (type === 'room') {
      setEditingRoomType((prev) => {
        const next = [...(prev.images || [])];
        next.splice(index, 1);
        return { ...prev, images: next };
      });
    }
  };

  // --- Load Edit ---
  useEffect(() => {
    const loadForEdit = async () => {
      if (!isEditMode || !existingProperty?._id) return;
      setLoading(true);
      setError('');
      try {
        const res = await propertyService.getDetails(existingProperty._id);
        const prop = res.property || existingProperty;
        const docs = res.documents?.documents || [];
        const rts = res.roomTypes || [];
        setCreatedProperty(prop);
        setPropertyForm({
          propertyName: prop.propertyName || '',
          description: prop.description || '',
          shortDescription: prop.shortDescription || '',
          resortType: prop.resortType || 'beach',
          activities: prop.activities || [],
          coverImage: prop.coverImage || '',
          propertyImages: prop.propertyImages || [],
          address: {
            country: prop.address?.country || '',
            state: prop.address?.state || '',
            city: prop.address?.city || '',
            area: prop.address?.area || '',
            fullAddress: prop.address?.fullAddress || '',
            pincode: prop.address?.pincode || '',
          },
          location: {
            type: 'Point',
            coordinates: [
              typeof prop.location?.coordinates?.[0] === 'number' ? String(prop.location.coordinates[0]) : '',
              typeof prop.location?.coordinates?.[1] === 'number' ? String(prop.location.coordinates[1]) : '',
            ],
          },
          nearbyPlaces:
            Array.isArray(prop.nearbyPlaces) && prop.nearbyPlaces.length
              ? prop.nearbyPlaces.map((p) => ({
                  name: p.name || '',
                  type: p.type || 'tourist',
                  distanceKm: typeof p.distanceKm === 'number' ? String(p.distanceKm) : '',
                }))
              : [],
          amenities: prop.amenities || [],
          checkInTime: prop.checkInTime || '',
          checkOutTime: prop.checkOutTime || '',
          cancellationPolicy: prop.cancellationPolicy || '',
          houseRules: prop.houseRules || [],
          contactNumber: prop.contactNumber || '',
          documents: docs.length ? docs.map((d) => ({ type: d.type || d.name, name: d.name, fileUrl: d.fileUrl || '' })) : emptyDocuments(),
        });

        if (rts.length) {
          setRoomTypes(
            rts.map((rt) => ({
              id: rt._id,
              backendId: rt._id,
              name: rt.name,
              inventoryType: rt.inventoryType || 'room',
              roomCategory: rt.roomCategory || 'private',
              maxAdults: rt.maxAdults ?? 1,
              maxChildren: rt.maxChildren ?? 0,
              totalInventory: rt.totalInventory ?? 1,
              pricePerNight: rt.pricePerNight ?? '',
              extraAdultPrice: rt.extraAdultPrice ?? 0,
              extraChildPrice: rt.extraChildPrice ?? 0,
              images: rt.images || [],
              amenities: rt.amenities || [],
              isActive: rt.isActive ?? true,
            })),
          );
          setOriginalRoomTypeIds(rts.map((rt) => rt._id));
        } else {
          setOriginalRoomTypeIds([]);
        }
      } catch (e) {
        setError(e?.message || 'Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    loadForEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, existingProperty?._id]);

  // --- Strict Validation ---
  const nextFromBasic = () => {
    setError('');
    if (!propertyForm.propertyName || !propertyForm.shortDescription) {
      setError('Property Name and Short Description required');
      return;
    }
    if (!propertyForm.resortType) {
      setError('Please select a Resort Type');
      return;
    }
    goToStep(2);
  };
  const nextFromNearby = () => {
    setError('');
    if (propertyForm.nearbyPlaces.length < 1) {
      setError('Please add at least 1 nearby place');
      return;
    }
    goToStep(5);
  };
  const nextFromImages = () => {
    setError('');
    if (!propertyForm.coverImage) {
      setError('Cover Image is required');
      return;
    }
    if (propertyForm.propertyImages.length < 4) {
      setError('At least 4 Property Images required');
      return;
    }
    goToStep(6);
  };
  const nextFromRoomTypes = () => {
    setError('');
    if (!roomTypes.length) {
      setError('At least one Room/Cottage Type required');
      return;
    }
    goToStep(7);
  };

  const roomPayload = (rt) => ({
    name: rt.name,
    inventoryType: 'room',
    roomCategory: rt.roomCategory,
    maxAdults: Number(rt.maxAdults),
    maxChildren: Number(rt.maxChildren || 0),
    totalInventory: Number(rt.totalInventory || 0),
    pricePerNight: Number(rt.pricePerNight),
    extraAdultPrice: Number(rt.extraAdultPrice || 0),
    extraChildPrice: Number(rt.extraChildPrice || 0),
    images: rt.images.filter(Boolean),
    amenities: rt.amenities,
  });

  const submitAll = async () => {
    setLoading(true);
    setError('');
    try {
      const propertyPayload = {
        propertyType: 'resort',
        propertyName: propertyForm.propertyName,
        contactNumber: propertyForm.contactNumber,
        description: propertyForm.description,
        shortDescription: propertyForm.shortDescription,
        resortType: propertyForm.resortType,
        activities: propertyForm.activities,
        coverImage: propertyForm.coverImage,
        propertyImages: propertyForm.propertyImages.filter(Boolean),
        address: propertyForm.address,
        location: {
          type: 'Point',
          coordinates: [Number(propertyForm.location.coordinates[0]), Number(propertyForm.location.coordinates[1])],
        },
        nearbyPlaces: propertyForm.nearbyPlaces.map((p) => ({ name: p.name, type: p.type, distanceKm: Number(p.distanceKm || 0) })),
        amenities: propertyForm.amenities,
        checkInTime: propertyForm.checkInTime,
        checkOutTime: propertyForm.checkOutTime,
        cancellationPolicy: propertyForm.cancellationPolicy,
        houseRules: propertyForm.houseRules,
        documents: propertyForm.documents,
      };

      let propId = createdProperty?._id;
      if (propId) {
        const updated = await propertyService.update(propId, propertyPayload);
        propId = updated.property?._id || propId;

        const existingIds = new Set(isEditMode ? originalRoomTypeIds : []);
        const persistedIds = [];
        for (const rt of roomTypes) {
          const payload = roomPayload(rt);
          if (rt.backendId) {
            await propertyService.updateRoomType(propId, rt.backendId, payload);
            persistedIds.push(rt.backendId);
          } else {
            const created = await propertyService.addRoomType(propId, payload);
            if (created.roomType?._id) persistedIds.push(created.roomType._id);
          }
        }
        for (const id of existingIds) {
          if (!persistedIds.includes(id)) await propertyService.deleteRoomType(propId, id);
        }
      } else {
        // Atomic Create
        propertyPayload.roomTypes = roomTypes.map(roomPayload);
        const res = await propertyService.create(propertyPayload);
        propId = res.property?._id;
        setCreatedProperty(res.property);
      }
      discardedRef.current = true;
      localStore.removeItem(STORAGE_KEY);
      goToStep(10);
    } catch (e) {
      const errMsg = e?.message || (typeof e === 'string' ? e : 'Failed to submit resort');
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      goToStep(step - 1);
    } else {
      discardedRef.current = true;
      localStore.removeItem(STORAGE_KEY);
      navigate(-1);
    }
  };

  const clearCurrentStep = async () => {
    if (!(await confirm('Clear all fields in this step?', '', { confirmText: 'Clear', destructive: true }))) return;
    if (step === 1) {
      setPropertyForm((prev) => ({ ...prev, propertyName: '', description: '', shortDescription: '', resortType: 'beach', activities: [] }));
    } else if (step === 2) {
      updatePropertyForm('address', { state: '', city: '', fullAddress: '', pincode: '' });
      updatePropertyForm(['location', 'coordinates'], ['', '']);
    } else if (step === 3) {
      updatePropertyForm('amenities', []);
    } else if (step === 4) {
      updatePropertyForm('nearbyPlaces', []);
    } else if (step === 5) {
      setPropertyForm((prev) => ({ ...prev, coverImage: '', propertyImages: [] }));
    } else if (step === 6) {
      setRoomTypes([]);
    } else if (step === 7) {
      setPropertyForm((prev) => ({ ...prev, checkInTime: '', checkOutTime: '', cancellationPolicy: '', houseRules: [] }));
    } else if (step === 8) {
      updatePropertyForm('documents', emptyDocuments());
    }
  };

  const handleNext = () => {
    if (loading) return;
    switch (step) {
      case 1:
        nextFromBasic();
        break;
      case 2:
        goToStep(3);
        break;
      case 3:
        goToStep(4);
        break;
      case 4:
        nextFromNearby();
        break;
      case 5:
        nextFromImages();
        break;
      case 6:
        nextFromRoomTypes();
        break;
      case 7:
        goToStep(8);
        break;
      case 8:
        goToStep(9);
        break;
      case 9:
        submitAll();
        break;
      default:
        break;
    }
  };

  const handleExit = () => {
    discardedRef.current = true;
    localStore.removeItem(STORAGE_KEY);
    navigate(-1);
  };

  return {
    navigate, step, loading, error, setError, isEditMode,
    propertyForm, updatePropertyForm, roomTypes,
    editingRoomType, editingRoomTypeIndex, updateRoomType, setEditingRoomType,
    locationSearch, nearbySearch, loadingLocation, uploading,
    editingNearbyIndex, tempNearbyPlace, setTempNearbyPlace,
    fetchCurrentLocation, selectLocationResult, selectNearbyPlace,
    startAddNearbyPlace, startEditNearbyPlace, saveNearbyPlace, deleteNearbyPlace, cancelEditNearbyPlace,
    startAddRoomType, startEditRoomType, deleteRoomType, cancelEditRoomType, saveRoomType, toggleRoomAmenity,
    uploadCover, uploadGallery, uploadRoomImages, uploadDocument, handleRemoveImage,
    handleBack, handleNext, handleExit, clearCurrentStep,
  };
}

export default useResortWizard;
