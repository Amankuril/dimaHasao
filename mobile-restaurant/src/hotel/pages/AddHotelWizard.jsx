import { useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import { ArrowRight } from 'lucide-react-native';
import { confirm } from '../../lib/notify';
import { clearRouteState } from '../../lib/routeState';
import { localStore } from '../../lib/storage';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { color, space } from '../../theme';
import { StepCard, StepIntro, StepRail, WizardFooter, WizardHeader } from '../components/wizardUi';
import useLocationSearch from '../hooks/useLocationSearch';
import { hotelService, propertyService } from '../services/apiService';
import { StepAmenities, StepBasicInfo, StepLocation } from './wizards/hotel/StepsBasics';
import { StepDone, StepReview, StepDocuments, StepRules } from './wizards/hotel/StepsFinal';
import { StepImages, StepNearby } from './wizards/hotel/StepsNearbyImages';
import { StepRooms } from './wizards/hotel/StepRooms';
import { REQUIRED_DOCS_HOTEL, WIZARD_STEPS, blankDocuments, pickImages } from './wizards/hotel/shared';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/AddHotelWizard.jsx
 * (mounted at /hotel/partner/join-hotel and /hotel/partner/join-lodge).
 *
 * Nine steps and a done screen. The draft is kept in the app's local store
 * (the web's localStorage) and the wizard doubles as the edit form when a
 * property arrives in the route state.
 */

const emptyDocs = () => REQUIRED_DOCS_HOTEL.map((d) => ({ type: d.type, name: d.name, fileUrl: '' }));

const AddHotelWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { width } = useWindowDimensions();
  const wide = width >= 640; // Tailwind `sm:`
  const scrollRef = useRef(null);

  const [existingProperty] = useState(() => location.state?.property || null);
  const isEditMode = !!existingProperty;
  const [initialStep] = useState(() => location.state?.initialStep || 1);
  const [defaultType] = useState(() => location.state?.propertyType);
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdProperty, setCreatedProperty] = useState(null);
  const nearbySearch = useLocationSearch();
  const [editingNearbyIndex, setEditingNearbyIndex] = useState(null);
  const [tempNearbyPlace, setTempNearbyPlace] = useState({ name: '', type: 'tourist', distanceKm: '' });
  const locationSearch = useLocationSearch();
  const [uploading, setUploading] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const [propertyForm, setPropertyForm] = useState(() => ({
    propertyType: existingProperty?.propertyType || defaultType || (location.pathname.includes('join-lodge') ? 'lodge' : 'hotel'),
    propertyName: '',
    description: '',
    shortDescription: '',
    coverImage: '',
    propertyImages: [],
    address: { state: '', city: '', fullAddress: '', pincode: '' },
    location: { type: 'Point', coordinates: ['', ''] },
    nearbyPlaces: [],
    amenities: [],
    checkInTime: '',
    checkOutTime: '',
    contactNumber: '',
    cancellationPolicy: '',
    houseRules: [],
    documents: emptyDocs(),
  }));

  const [roomTypes, setRoomTypes] = useState([]);
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [editingRoomTypeIndex, setEditingRoomTypeIndex] = useState(null);

  const [originalRoomTypeIds, setOriginalRoomTypeIds] = useState([]);

  // --- Persistence Logic ---
  const STORAGE_KEY = `hoomzo_hotel_wizard_draft_${existingProperty?._id || 'new'}`;

  // The route state was read once above (like location.state, it is not meant to
  // outlive this visit), so a later visit without state does not reopen it.
  useEffect(() => {
    clearRouteState(location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1. Load from the local store on mount
  useEffect(() => {
    if (isEditMode) return; // Don't load draft if editing existing property from dashboard
    const saved = localStore.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { step: savedStep, propertyForm: savedForm, roomTypes: savedRooms, createdProperty: savedProp } = JSON.parse(saved);
        setStep(savedStep);
        setPropertyForm(savedForm);
        setRoomTypes(savedRooms);
        if (savedProp) setCreatedProperty(savedProp);
      } catch (e) {
        console.error('Failed to load draft', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Save to the local store whenever state changes. Nothing is saved once
  // the registration is submitted (step 10), or the finished draft would come back.
  useEffect(() => {
    if (isEditMode || step > 9) return undefined;
    const timeout = setTimeout(() => {
      localStore.setItem(STORAGE_KEY, JSON.stringify({ step, propertyForm, roomTypes, createdProperty }));
    }, 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, propertyForm, roomTypes, createdProperty]);

  // A new step starts at the top, as the web's page swap does.
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [step]);

  /** `value` may be an updater taking the current value at `path`. */
  const updatePropertyForm = (path, value) => {
    setPropertyForm((prev) => {
      const clone = JSON.parse(JSON.stringify(prev));
      const keys = Array.isArray(path) ? path : String(path).split('.');
      let ref = clone;
      for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
      const last = keys[keys.length - 1];
      ref[last] = typeof value === 'function' ? value(ref[last]) : value;
      return clone;
    });
  };

  const applyAddress = (res, lat, lng) => {
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

  const useCurrentLocation = async () => {
    setError('');
    setLoadingLocation(true);
    try {
      // 1. Permission
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Location permission denied. Please enable it in device settings.');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setError('Location unavailable. Check your GPS/network.');
        return;
      }

      // 2. Get Coordinates
      let timer;
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject({ code: 3 }), 15000);
        }),
      ]).finally(() => clearTimeout(timer));

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // 3. Call Backend API
      let res;
      try {
        res = await hotelService.getAddressFromCoordinates(lat, lng);
      } catch (apiErr) {
        const msg = apiErr?.response?.data?.message || apiErr?.message || 'Failed to fetch address from coordinates';
        setError(msg);
        return;
      }
      applyAddress(res, lat, lng);
    } catch (err) {
      console.error('[useCurrentLocation] Error:', err);
      if (err && err.code === 3) {
        setError('Location request timed out.');
      } else {
        setError('Location unavailable. Check your GPS/network.');
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
      applyAddress(res, lat, lng);
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

  const deleteNearbyPlace = (index) => {
    const arr = propertyForm.nearbyPlaces.filter((_, i) => i !== index);
    updatePropertyForm('nearbyPlaces', arr);
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

  const cancelEditNearbyPlace = () => {
    setEditingNearbyIndex(null);
    setError('');
  };

  const nextFromNearbyPlaces = () => {
    if (propertyForm.nearbyPlaces.length < 1) {
      setError('Please add at least 1 nearby place');
      return;
    }
    setStep(5);
  };

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
  };

  const toggleRoomAmenity = (label) => {
    setEditingRoomType((prev) => {
      if (!prev) return prev;
      const has = prev.amenities.includes(label);
      return { ...prev, amenities: has ? prev.amenities.filter((a) => a !== label) : [...prev.amenities, label] };
    });
  };

  const saveRoomType = () => {
    if (!editingRoomType) return;
    if (!editingRoomType.name || !editingRoomType.pricePerNight) {
      setError('Room type name and price required');
      return;
    }
    const imageCount = (editingRoomType.images || []).filter(Boolean).length;
    if (imageCount < 3) {
      setError('Please upload at least 3 room images');
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

  /** Uploads picked files ({ uri, name, type, size }) and hands the URLs to `onDone`. */
  const uploadImages = async (files, type, onDone) => {
    try {
      setUploading(type);
      setError('');
      const fd = new FormData();

      for (const file of Array.from(files)) {
        if (!String(file.type || '').startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`);
        }

        // Validate file size (10MB limit)
        if (file.size && file.size > 10 * 1024 * 1024) {
          throw new Error(`Image ${file.name} is too large. Maximum 10MB allowed.`);
        }

        fd.append('images', { uri: file.uri, name: file.name, type: file.type });
      }

      const res = await hotelService.uploadImages(fd);

      const urls = Array.isArray(res?.urls) ? res.urls : [];
      onDone(urls);
    } catch (err) {
      console.error('Upload Error:', err);
      let msg = 'Upload failed. Try again.';
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

  const pickCover = async () => {
    const files = await pickImages({ multiple: false });
    if (files.length) await uploadImages(files, 'cover', (urls) => urls[0] && updatePropertyForm('coverImage', urls[0]));
  };

  const pickGallery = async () => {
    const files = await pickImages({ multiple: true });
    if (files.length) await uploadImages(files, 'gallery', (urls) => updatePropertyForm('propertyImages', (cur) => [...cur, ...urls]));
  };

  const pickRoomImages = async () => {
    const files = await pickImages({ multiple: true });
    if (files.length) {
      await uploadImages(files, 'room', (urls) => urls.length && setEditingRoomType((prev) => ({ ...prev, images: [...(prev.images || []), ...urls.filter(Boolean)] })));
    }
  };

  const pickDocument = async (idx) => {
    const files = await pickImages({ multiple: false });
    if (files.length) {
      await uploadImages(files, `doc_${idx}`, (urls) => {
        if (urls[0]) {
          updatePropertyForm('documents', (cur) => {
            const updated = [...cur];
            updated[idx] = { ...updated[idx], fileUrl: urls[0] };
            return updated;
          });
        }
      });
    }
  };

  const handleRemoveImage = async (url, type, index = null) => {
    if (!url) return;
    try {
      // Optional: Delete from Cloudinary if it's our URL
      if (url.includes('cloudinary.com') && url.includes('rukkoin')) {
        await hotelService.deleteImage(url);
      }
    } catch (err) {
      console.warn('Delete image from storage failed:', err);
    }

    if (type === 'cover') {
      updatePropertyForm('coverImage', '');
    } else if (type === 'gallery') {
      const arr = [...propertyForm.propertyImages];
      arr.splice(index, 1);
      updatePropertyForm('propertyImages', arr);
    } else if (type === 'room') {
      setEditingRoomType((prev) => {
        const next = [...(prev.images || [])];
        next.splice(index, 1);
        return { ...prev, images: next };
      });
    }
  };

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
          documents: docs.length ? docs.map((d) => ({ type: d.type || d.name, name: d.name, fileUrl: d.fileUrl || '' })) : emptyDocs(),
          propertyType: prop.propertyType || existingProperty?.propertyType || '',
        });
        if (rts.length) {
          setRoomTypes(
            rts.map((rt) => ({
              id: rt._id,
              backendId: rt._id,
              name: rt.name || '',
              inventoryType: rt.inventoryType || 'room',
              roomCategory: rt.roomCategory || 'private',
              maxAdults: rt.maxAdults ?? '',
              maxChildren: rt.maxChildren ?? '',
              totalInventory: rt.totalInventory ?? '',
              pricePerNight: rt.pricePerNight ?? '',
              extraAdultPrice: rt.extraAdultPrice ?? '',
              extraChildPrice: rt.extraChildPrice ?? '',
              images: rt.images || ['', '', '', ''],
              amenities: rt.amenities || [],
              isActive: typeof rt.isActive === 'boolean' ? rt.isActive : true,
            }))
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

  const nextFromProperty = () => {
    setError('');
    if (!propertyForm.propertyName) {
      setError('Property name required');
      return;
    }
    setStep(2);
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
      setError('At least one Room Type required');
      return;
    }
    for (const rt of roomTypes) {
      if (!rt.name || !rt.pricePerNight) {
        setError('Room type name and price required');
        return;
      }
      if (!rt.images || rt.images.filter(Boolean).length < 3) {
        setError('Each room type must have at least 3 images');
        return;
      }
    }
    setStep(7);
  };

  const submitAll = async () => {
    setLoading(true);
    setError('');
    try {
      const propertyPayload = {
        propertyType: propertyForm.propertyType || 'hotel',
        propertyName: propertyForm.propertyName,
        contactNumber: propertyForm.contactNumber,
        description: propertyForm.description,
        shortDescription: propertyForm.shortDescription,
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
          const payload = {
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
          };
          if (rt.backendId) {
            await propertyService.updateRoomType(propId, rt.backendId, payload);
            persistedIds.push(rt.backendId);
          } else {
            const created = await propertyService.addRoomType(propId, payload);
            if (created.roomType?._id) persistedIds.push(created.roomType._id);
          }
        }
        for (const id of existingIds) {
          if (!persistedIds.includes(id)) {
            await propertyService.deleteRoomType(propId, id);
          }
        }
      } else {
        // Atomic Create
        propertyPayload.roomTypes = roomTypes.map((rt) => ({
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
        }));
        const res = await propertyService.create(propertyPayload);
        propId = res.property?._id;
        setCreatedProperty(res.property);
      }
      localStore.removeItem(STORAGE_KEY);
      setStep(10);
    } catch (e) {
      const errMsg = e?.message || (typeof e === 'string' ? e : 'Failed to submit property');
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

  // The phone's back button does what the header's does.
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

  const clearCurrentStep = async () => {
    if (!(await confirm('Clear all fields in this step?', '', { confirmText: 'Clear', destructive: true }))) return;
    if (step === 1) {
      setPropertyForm((prev) => ({ ...prev, propertyName: '', description: '', shortDescription: '', coverImage: '' }));
    } else if (step === 2) {
      updatePropertyForm('address', { state: '', city: '', fullAddress: '', pincode: '' });
      updatePropertyForm(['location', 'coordinates'], ['', '']);
    } else if (step === 3) {
      updatePropertyForm('amenities', []);
    } else if (step === 4) {
      updatePropertyForm('nearbyPlaces', []);
    } else if (step === 5) {
      updatePropertyForm('propertyImages', []);
    } else if (step === 6) {
      setRoomTypes([]);
    } else if (step === 7) {
      setPropertyForm((prev) => ({ ...prev, checkInTime: '', checkOutTime: '', cancellationPolicy: '', houseRules: [] }));
    } else if (step === 8) {
      updatePropertyForm('documents', blankDocuments());
    }
  };

  const handleNext = () => {
    if (loading) return;
    switch (step) {
      case 1:
        nextFromProperty();
        break;
      case 2:
        setStep(3); // Location next
        break;
      case 3:
        setStep(4); // Amenities next
        break;
      case 4:
        nextFromNearbyPlaces();
        break;
      case 5:
        nextFromImages();
        break;
      case 6:
        nextFromRoomTypes();
        break;
      case 7:
        setStep(8); // Rules next
        break;
      case 8:
        setStep(9); // Docs next - validation removed/optional
        break;
      case 9:
        submitAll();
        break;
      default:
        break;
    }
  };

  const getStepTitle = () => WIZARD_STEPS[step - 1]?.title || '';
  const getStepSubtitle = () => WIZARD_STEPS[step - 1]?.subtitle || '';

  const handleExit = () => {
    localStore.removeItem(STORAGE_KEY);
    navigate(-1);
  };

  const isEditingSubItem = (step === 4 && editingNearbyIndex !== null) || (step === 6 && editingRoomType !== null);

  const isComplete = step > 9;

  return (
    <KeyboardAvoidingView style={styles.page} behavior="padding">
      <WizardHeader title={isComplete ? 'Complete' : getStepTitle()} subtitle={isComplete ? 'Registration submitted' : `Step ${step} of 9`} onBack={handleBack} onClose={handleExit} />

      {/* Segmented rail: each step is its own bar, so progress reads as
          "five of nine done" at a glance rather than a fraction of a line. */}
      {!isComplete ? <StepRail steps={WIZARD_STEPS} step={step} showLabels={wide} /> : null}

      <ScrollView ref={scrollRef} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.scroll}>
        <View style={styles.main}>
          {!isComplete ? <StepIntro>{getStepSubtitle()}</StepIntro> : null}

          <StepCard>
            {step === 1 && <StepBasicInfo propertyForm={propertyForm} updatePropertyForm={updatePropertyForm} error={error} />}

            {step === 2 && (
              <StepLocation
                propertyForm={propertyForm}
                updatePropertyForm={updatePropertyForm}
                error={error}
                locationSearch={locationSearch}
                selectLocationResult={selectLocationResult}
                useCurrentLocation={useCurrentLocation}
                loadingLocation={loadingLocation}
              />
            )}

            {step === 3 && <StepAmenities propertyForm={propertyForm} updatePropertyForm={updatePropertyForm} />}

            {step === 4 && (
              <StepNearby
                propertyForm={propertyForm}
                error={error}
                isEditingSubItem={isEditingSubItem}
                editingNearbyIndex={editingNearbyIndex}
                tempNearbyPlace={tempNearbyPlace}
                setTempNearbyPlace={setTempNearbyPlace}
                nearbySearch={nearbySearch}
                selectNearbyPlace={selectNearbyPlace}
                startAddNearbyPlace={startAddNearbyPlace}
                startEditNearbyPlace={startEditNearbyPlace}
                deleteNearbyPlace={deleteNearbyPlace}
                saveNearbyPlace={saveNearbyPlace}
                cancelEditNearbyPlace={cancelEditNearbyPlace}
              />
            )}

            {step === 5 && <StepImages propertyForm={propertyForm} error={error} uploading={uploading} pickCover={pickCover} pickGallery={pickGallery} handleRemoveImage={handleRemoveImage} />}

            {step === 6 && (
              <StepRooms
                roomTypes={roomTypes}
                error={error}
                editingRoomType={editingRoomType}
                setEditingRoomType={setEditingRoomType}
                editingRoomTypeIndex={editingRoomTypeIndex}
                startAddRoomType={startAddRoomType}
                startEditRoomType={startEditRoomType}
                deleteRoomType={deleteRoomType}
                cancelEditRoomType={cancelEditRoomType}
                saveRoomType={saveRoomType}
                toggleRoomAmenity={toggleRoomAmenity}
                uploading={uploading}
                pickRoomImages={pickRoomImages}
                handleRemoveImage={handleRemoveImage}
              />
            )}

            {step === 7 && <StepRules propertyForm={propertyForm} updatePropertyForm={updatePropertyForm} error={error} />}

            {step === 8 && <StepDocuments propertyForm={propertyForm} error={error} uploading={uploading} pickDocument={pickDocument} />}

            {step === 9 && <StepReview propertyForm={propertyForm} roomTypes={roomTypes} error={error} />}

            {step === 10 && <StepDone onGo={() => navigate('/hotel/partner/properties', { replace: true })} />}
          </StepCard>
        </View>
      </ScrollView>

      {!isComplete ? (
        <WizardFooter
          onBack={handleBack}
          backDisabled={step === 1 || loading}
          // Destructive and easy to hit by accident, so it is left off narrow screens, as the web does.
          onClear={step < 9 && wide ? clearCurrentStep : undefined}
          clearDisabled={loading}
          next={{
            label: step === 9 ? (loading ? 'Submitting…' : 'Submit property') : 'Continue',
            onPress: handleNext,
            disabled: loading || (step === 6 && roomTypes.length === 0),
            loading,
            icon: !loading && step < 9 ? ArrowRight : undefined,
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
};

export default AddHotelWizard;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  scroll: { flexGrow: 1, paddingTop: space.lg, paddingBottom: space.xxl },
  main: { width: '100%', maxWidth: 768, alignSelf: 'center', paddingHorizontal: space.lg, gap: space.lg },
});
