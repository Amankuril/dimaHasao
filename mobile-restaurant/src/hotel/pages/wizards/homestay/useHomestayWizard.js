import { useEffect, useRef, useState } from 'react';
import { BackHandler, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { confirm } from '../../../../lib/notify';
import { localStore, readJson } from '../../../../lib/storage';
import { clearRouteState } from '../../../../lib/routeState';
import { useLocation, useNavigate } from '../../../../lib/webRouter';
import useLocationSearch from '../../../hooks/useLocationSearch';
import { hotelService, propertyService } from '../../../services/apiService';
import { emptyDocuments, emptyPropertyForm } from './constants';

/*
 * Port of the state and handlers of
 * Frontend/src/modules/Hotel/app/partner/pages/AddHomestayWizard.jsx.
 *
 * Differences forced by the platform: the draft lives in localStore instead of
 * localStorage, the address "Use Current Location" button uses expo-location,
 * and the file inputs / Flutter camera bridge become an expo-image-picker sheet
 * (camera or gallery) feeding the same hotelService.uploadImages call.
 */

const MAX_BYTES = 10 * 1024 * 1024;

function assetToFile(asset, index) {
  const type = asset.mimeType || (/\.png$/i.test(asset.uri) ? 'image/png' : 'image/jpeg');
  const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  return {
    uri: asset.uri,
    name: asset.fileName || `upload-${Date.now()}-${index}.${ext}`,
    type,
    size: asset.fileSize ?? null,
  };
}

export function useHomestayWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  // location.state is the in-memory route stash (see lib/webRouter). It is read once and cleared on unmount, so a
  // later "add new" visit to this route cannot pick up the property of an earlier edit (the web's state dies with
  // the history entry).
  const [existingProperty] = useState(() => location.state?.property || null);
  const isEditMode = !!existingProperty;
  const [initialStep] = useState(() => location.state?.initialStep || 1);
  const [step, setStep] = useState(initialStep);
  const routePath = location.pathname;
  useEffect(() => () => clearRouteState(routePath), [routePath]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdProperty, setCreatedProperty] = useState(null);

  // Maps / Location State
  const nearbySearch = useLocationSearch();
  const [editingNearbyIndex, setEditingNearbyIndex] = useState(null);
  const [tempNearbyPlace, setTempNearbyPlace] = useState({ name: '', type: 'tourist', distanceKm: '' });
  const locationSearch = useLocationSearch();

  // Image Upload State
  const [uploading, setUploading] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  // { type, multiple, onDone } while the camera / gallery sheet is open
  const [pickerRequest, setPickerRequest] = useState(null);

  // Form State
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);

  const [roomTypes, setRoomTypes] = useState([]);
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [editingRoomTypeIndex, setEditingRoomTypeIndex] = useState(null);
  const [originalRoomTypeIds, setOriginalRoomTypeIds] = useState([]);

  // --- Persistence Logic ---
  const STORAGE_KEY = `hoomzo_homestay_wizard_draft_${existingProperty?._id || 'new'}`;

  // 1. Load from the draft store
  useEffect(() => {
    if (isEditMode) return;
    const saved = readJson(localStore, STORAGE_KEY);
    if (saved) {
      try {
        const { step: savedStep, propertyForm: savedForm, roomTypes: savedRooms, createdProperty: savedProp } = saved;
        setStep(savedStep);
        setPropertyForm(savedForm);
        setRoomTypes(savedRooms);
        if (savedProp) setCreatedProperty(savedProp);
      } catch (e) {
        console.error('Failed to load homestay draft', e);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Save to the draft store
  useEffect(() => {
    // Past step 9 the draft was just discarded by the submit; saving again would resurrect the finished wizard.
    if (isEditMode || step > 9) return undefined;
    const timeout = setTimeout(() => {
      localStore.setItem(STORAGE_KEY, JSON.stringify({ step, propertyForm, roomTypes, createdProperty }));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [step, propertyForm, roomTypes, createdProperty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper Functions
  const updatePropertyForm = (path, value) => {
    setPropertyForm((prev) => {
      const clone = JSON.parse(JSON.stringify(prev));
      const keys = Array.isArray(path) ? path : String(path).split('.');
      let ref = clone;
      for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
      ref[keys[keys.length - 1]] = typeof value === 'function' ? value(ref[keys[keys.length - 1]]) : value;
      return clone;
    });
  };

  // --- API / Maps Logic ---
  const applyAddress = (res) => {
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
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        const denied = new Error('Location permission denied');
        denied.code = 1;
        throw denied;
      }

      let pos;
      try {
        pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      } catch (geoErr) {
        const unavailable = new Error(geoErr?.message || 'Location unavailable');
        unavailable.code = /timeout|timed out/i.test(String(geoErr?.message)) ? 3 : 2;
        throw unavailable;
      }

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Call Backend API
      const res = await hotelService.getAddressFromCoordinates(lat, lng);

      updatePropertyForm(['location', 'coordinates'], [String(lng), String(lat)]);
      applyAddress(res);
    } catch (err) {
      console.error('[useCurrentLocation] Error:', err);
      if (err && typeof err.code === 'number') {
        if (err.code === 1) {
          setError('Location permission denied. Please enable it in device settings.');
        } else if (err.code === 2) {
          setError('Location unavailable. Check your GPS/network.');
        } else if (err.code === 3) {
          setError('Location request timed out.');
        } else {
          setError(`Location error: ${err.message || 'Unknown error'}`);
        }
      } else {
        // Backend API error or other error
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
      updatePropertyForm(['location', 'coordinates'], [String(lng), String(lat)]);
      applyAddress(res);
      locationSearch.clear();
    } catch {
      setError('Failed to use selected location');
    }
  };

  const selectNearbyPlace = async (place) => {
    try {
      const originLat = Number(propertyForm.location.coordinates[1] || 0);
      const originLng = Number(propertyForm.location.coordinates[0] || 0);
      const destLat = place.lat;
      const destLng = place.lng;
      let km = '';
      if (originLat && originLng && destLat && destLng) {
        const distRes = await hotelService.calculateDistance(originLat, originLng, destLat, destLng);
        km = distRes?.distanceKm ? String(distRes.distanceKm) : '';
      }
      setTempNearbyPlace((prev) => ({ ...prev, name: place.name || '', distanceKm: km }));
      nearbySearch.clear();
    } catch {
      setTempNearbyPlace((prev) => ({ ...prev, name: place.name || '' }));
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
    if (editingNearbyIndex === -1) {
      arr.push(tempNearbyPlace);
    } else {
      arr[editingNearbyIndex] = tempNearbyPlace;
    }
    updatePropertyForm('nearbyPlaces', arr);
    setEditingNearbyIndex(null);
    setError('');
  };

  const deleteNearbyPlace = (index) => {
    const arr = propertyForm.nearbyPlaces.filter((_, i) => i !== index);
    updatePropertyForm('nearbyPlaces', arr);
  };

  const cancelEditNearbyPlace = () => {
    setEditingNearbyIndex(null);
    setError('');
  };

  // --- Room Type / Inventory ---
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
      setError('Name and Price are required');
      return;
    }
    if ((editingRoomType.images || []).filter(Boolean).length < 3) {
      setError('Please upload at least 3 images for this inventory');
      return;
    }
    const next = [...roomTypes];
    if (editingRoomTypeIndex === -1 || editingRoomTypeIndex == null) {
      next.push(editingRoomType);
    } else {
      next[editingRoomTypeIndex] = editingRoomType;
    }
    setRoomTypes(next);
    setEditingRoomType(null);
    setEditingRoomTypeIndex(null);
    setError('');
  };

  const toggleRoomAmenity = (label) => {
    setEditingRoomType((prev) => {
      if (!prev) return prev;
      const has = prev.amenities.includes(label);
      return {
        ...prev,
        amenities: has ? prev.amenities.filter((a) => a !== label) : [...prev.amenities, label],
      };
    });
  };

  const changeInventoryType = (type) => {
    // type: 'room' or 'entire'
    if (!editingRoomType) return;
    setEditingRoomType((prev) => ({
      ...prev,
      inventoryType: type,
      roomCategory: type === 'entire' ? 'entire' : 'private',
      name: type === 'entire' ? 'Entire Homestay' : 'Deluxe Private Room',
      maxAdults: type === 'entire' ? 6 : 2,
      maxChildren: type === 'entire' ? 3 : 1,
      totalInventory: type === 'entire' ? 1 : 3,
      pricePerNight: type === 'entire' ? 12000 : 3500,
      amenities: [], // reset amenities on type switch
    }));
  };

  // --- Uploads ---
  const uploadFiles = async (files, type, onDone) => {
    try {
      setUploading(type);
      const fd = new FormData();

      for (const file of files) {
        if (!String(file.type || '').startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`);
        }
        if (file.size && file.size > MAX_BYTES) {
          throw new Error(`Image ${file.name} is too large. Maximum 10MB allowed.`);
        }
        fd.append('images', { uri: file.uri, name: file.name, type: file.type });
      }

      const res = await hotelService.uploadImages(fd);
      const urls = Array.isArray(res?.urls) ? res.urls : [];
      onDone(urls);
    } catch (err) {
      console.error('Upload failed', err);
      let msg = 'Upload failed';
      if (typeof err === 'string') msg = err;
      else if (err?.response?.data?.message) msg = err.response.data.message;
      else if (err?.message) msg = err.message;

      if (msg === 'Network Error' || (err?.response && err.response.status === 413)) {
        msg = 'Upload failed: File size may be too large (Max 10MB).';
      }
      setError(msg);
    } finally {
      setUploading(null);
    }
  };

  /** Opens the camera / gallery sheet; `onDone(urls)` gets the uploaded URLs. */
  const requestUpload = (type, onDone, { multiple = false } = {}) => {
    setError('');
    setPickerRequest({ type, multiple, onDone });
  };

  const closePicker = () => setPickerRequest(null);

  const pickFrom = async (source) => {
    const request = pickerRequest;
    setPickerRequest(null);
    if (!request) return;
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(source === 'camera' ? 'Camera permission is required' : 'Photo library permission is required');
        return;
      }
      const opts = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false, exif: false };
      const res =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: request.multiple });
      if (res.canceled || !res.assets?.length) return;
      await uploadFiles(res.assets.map(assetToFile), request.type, request.onDone);
    } catch (err) {
      console.error('[Camera] Error:', err);
      setError(err?.message || 'Camera capture failed');
    }
  };

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
      updatePropertyForm('propertyImages', (current) => {
        const arr = [...current];
        arr.splice(index, 1);
        return arr;
      });
    } else if (type === 'room') {
      setEditingRoomType((prev) => {
        const next = [...(prev.images || [])];
        next.splice(index, 1);
        return { ...prev, images: next };
      });
    }
  };

  const setDocumentUrl = (idx, url) => {
    updatePropertyForm('documents', (current) => {
      const updated = [...current];
      updated[idx] = { ...updated[idx], fileUrl: url };
      return updated;
    });
  };

  const openDocument = (url) => {
    Linking.openURL(url).catch(() => setError('Could not open this file'));
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
          hostLivesOnProperty: prop.hostLivesOnProperty ?? true,
          familyFriendly: prop.familyFriendly ?? true,
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
          documents: docs.length
            ? docs.map((d) => ({ type: d.type || d.name, name: d.name, fileUrl: d.fileUrl || '' }))
            : emptyDocuments(),
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
  }, [isEditMode, existingProperty]);

  // --- Strict Validation ---
  const nextFromBasic = () => {
    setError('');
    if (!propertyForm.propertyName || !propertyForm.shortDescription) {
      setError('Property Name and Short Description required');
      return;
    }
    setStep(2);
  };
  const nextFromLocation = () => {
    setError('');
    if (!propertyForm.address.fullAddress || !propertyForm.address.city || !propertyForm.location.coordinates[0]) {
      setError('Full Address and Map Location are required');
      return;
    }
    setStep(3);
  };
  const nextFromAmenities = () => {
    setError('');
    if (propertyForm.amenities.length === 0) {
      setError('Please select at least one amenity');
      return;
    }
    setStep(4);
  };
  const nextFromNearby = () => {
    setError('');
    if (propertyForm.nearbyPlaces.length < 1) {
      setError('Please add at least 1 nearby place');
      return;
    }
    setStep(5);
  };
  const nextFromImages = () => {
    setError('');
    if (!propertyForm.coverImage) {
      setError('Cover image is required');
      return;
    }
    if (propertyForm.propertyImages.length < 4) {
      setError('Please upload at least 4 property images');
      return;
    }
    setStep(6);
  };
  const nextFromRoomTypes = () => {
    setError('');
    if (!roomTypes.length) {
      setError('Please add at least one inventory type (Room or Entire Place)');
      return;
    }
    setStep(7);
  };
  const nextFromRules = () => {
    setError('');
    if (!propertyForm.checkInTime || !propertyForm.checkOutTime) {
      setError('Check-in and Check-out times required');
      return;
    }
    if (!propertyForm.cancellationPolicy) {
      setError('Cancellation Policy required');
      return;
    }
    setStep(8);
  };
  const nextFromDocs = () => {
    setError('');
    // Optional: documents are not required to proceed.
    setStep(9);
  };

  const roomTypePayload = (rt) => ({
    name: rt.name,
    inventoryType: rt.inventoryType,
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
        propertyType: 'homestay',
        propertyName: propertyForm.propertyName,
        contactNumber: propertyForm.contactNumber,
        description: propertyForm.description,
        shortDescription: propertyForm.shortDescription,
        hostLivesOnProperty: propertyForm.hostLivesOnProperty,
        familyFriendly: propertyForm.familyFriendly,
        coverImage: propertyForm.coverImage,
        propertyImages: propertyForm.propertyImages.filter(Boolean),
        address: propertyForm.address,
        location: {
          type: 'Point',
          coordinates: [Number(propertyForm.location.coordinates[0]), Number(propertyForm.location.coordinates[1])],
        },
        nearbyPlaces: propertyForm.nearbyPlaces.map((p) => ({
          name: p.name,
          type: p.type,
          distanceKm: Number(p.distanceKm || 0),
        })),
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
          const payload = roomTypePayload(rt);
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
        propertyPayload.roomTypes = roomTypes.map(roomTypePayload);
        const res = await propertyService.create(propertyPayload);
        propId = res.property?._id;
        setCreatedProperty(res.property);
      }
      localStore.removeItem(STORAGE_KEY);
      setStep(10);
    } catch (e) {
      const errMsg = e?.message || (typeof e === 'string' ? e : 'Failed to submit homestay');
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      localStore.removeItem(STORAGE_KEY);
      navigate(-1);
    }
  };

  const clearCurrentStep = async () => {
    if (!(await confirm('Clear all fields in this step?', '', { confirmText: 'Clear', destructive: true }))) return;
    if (step === 1) {
      setPropertyForm((prev) => ({ ...prev, propertyName: '', description: '', shortDescription: '', hostLivesOnProperty: true, familyFriendly: true }));
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
      setPropertyForm((prev) => ({ ...prev, checkInTime: '12:00 PM', checkOutTime: '11:00 AM', cancellationPolicy: '', houseRules: [] }));
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
        nextFromLocation();
        break;
      case 3:
        nextFromAmenities();
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
        nextFromRules();
        break;
      case 8:
        nextFromDocs();
        break;
      case 9:
        submitAll();
        break;
      default:
        break;
    }
  };

  const isEditingSubItem = (step === 4 && editingNearbyIndex !== null) || (step === 6 && editingRoomType !== null);

  const handleExit = () => {
    localStore.removeItem(STORAGE_KEY);
    navigate(-1);
  };

  // The Android back button steps back like the header arrow.
  const backRef = useRef(handleBack);
  useEffect(() => {
    backRef.current = handleBack;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const isComplete = step > 9;

  return {
    navigate,
    step,
    setStep,
    loading,
    error,
    isComplete,
    isEditingSubItem,
    propertyForm,
    updatePropertyForm,
    roomTypes,
    editingRoomType,
    setEditingRoomType,
    editingRoomTypeIndex,
    locationSearch,
    nearbySearch,
    editingNearbyIndex,
    tempNearbyPlace,
    setTempNearbyPlace,
    uploading,
    loadingLocation,
    pickerRequest,
    closePicker,
    pickFrom,
    requestUpload,
    handleRemoveImage,
    setDocumentUrl,
    openDocument,
    fetchCurrentLocation,
    selectLocationResult,
    selectNearbyPlace,
    startAddNearbyPlace,
    startEditNearbyPlace,
    saveNearbyPlace,
    deleteNearbyPlace,
    cancelEditNearbyPlace,
    startAddRoomType,
    startEditRoomType,
    deleteRoomType,
    cancelEditRoomType,
    saveRoomType,
    toggleRoomAmenity,
    changeInventoryType,
    handleBack,
    handleExit,
    handleNext,
    submitAll,
    clearCurrentStep,
  };
}

export default useHomestayWizard;
