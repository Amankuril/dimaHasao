/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/AddRestaurant.jsx (tools/port.js first pass). */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { Building2, Upload, CheckCircle2, X, Image as ImageIcon, Loader2 } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Switch } from '../../../../components/shadcn';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { adminAPI, uploadAPI, zoneAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { EMAIL_REGEX } from '../../../../lib/emailValidation';
import { objectUrl, pickImage } from '../../../../lib/files';
import { Button as HButton, Div, Img, Input, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {
  console.warn(...args);
};
const debugError = (...args) => {
  console.error(...args);
};
const cuisinesOptions = ['North Indian', 'South Indian', 'Chinese', 'Pizza', 'Burgers', 'Bakery', 'Cafe'];
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PHONE_REGEX = /^\d{10}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const FSSAI_REGEX = /^\d{14}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/;
const sanitizeDigits = (value = '') => value.replace(/\D/g, '');
const sanitizePan = (value = '') =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
const sanitizeFssai = (value = '') => value.replace(/\D/g, '').slice(0, 14);
const sanitizeIfsc = (value = '') =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 11);
const sanitizeGst = (value = '') =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 15);
const normalizeName = (value = '') => value.replace(/\s+/g, ' ').trimStart();
const hasLetters = (value = '') => /[A-Za-z]/.test(value);
const getTodayLocalYMD = () => new Date().toISOString().split('T')[0];
const timeStringToMinutes = (value = '') => {
  const raw = String(value || '').trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return null;
  const [hours, minutes] = raw.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};
const normalizeTimeValue = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const to24Hour = (h, m, period) => {
    let hours = Number(h);
    const minutes = Number(m);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
    if (minutes < 0 || minutes > 59) return '';
    const p = String(period || '').toUpperCase();
    if (p === 'AM') {
      if (hours === 12) hours = 0;
    } else if (p === 'PM') {
      if (hours !== 12) hours += 12;
    }
    if (hours < 0 || hours > 23) return '';
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };
  if (/^\d{2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      return '';
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  if (/^\d{1}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(':');
    return to24Hour(h, m, '');
  }
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (ampm) {
    return to24Hour(ampm[1], ampm[2], ampm[3]);
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return timeToString(parsed);
  }
  return '';
};
const stringToTime = (timeString) => {
  const normalized = normalizeTimeValue(timeString);
  if (!normalized || !normalized.includes(':')) {
    return null;
  }
  const [hours, minutes] = normalized.split(':').map(Number);
  return new Date(2000, 0, 1, hours || 0, minutes || 0);
};
const timeToString = (date) => {
  if (!date) return '';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};
const getStoredFileLabel = (value) => {
  if (!value) return '';
  if (isUploadableFile(value)) return value.name || 'Selected file';
  if (typeof value === 'string') return value.split('/').pop() || 'Uploaded document';
  if (value?.url) return value.url.split('/').pop() || 'Uploaded document';
  return 'Uploaded document';
};
const getStoredImageSrc = (value) => {
  if (!value) return '';
  if (isUploadableFile(value)) return objectUrl(value);
  if (typeof value === 'string') return value;
  if (value?.url) return value.url;
  return '';
};
// A file picked in this app is React Native's upload object { uri, name, type, size };
// an already uploaded image is { url, publicId } or a URL string.
const isUploadableFile = (value) => {
  if (!value || typeof value !== 'object') return false;
  return typeof value.uri === 'string' && !value.url;
};
const ADMIN_ADD_STORAGE_KEY = 'admin_add_restaurant_form_data';
const ADMIN_ADD_FILES_DB = 'AdminAddRestaurantFiles';
const ADMIN_ADD_FILES_STORE = 'files';
const MAX_MENU_FILES = 10;
// The web keeps picked File objects in IndexedDB so a reload keeps them. Here the
// picked file is a { uri, name, type, size } object in the app's cache folder, so
// it is kept as JSON in storage under the same database/store names.
const filesKey = (key) => `${ADMIN_ADD_FILES_DB}:${ADMIN_ADD_FILES_STORE}:${key}`;
const saveFileToDB = async (key, file) => {
  if (!isUploadableFile(file)) return;
  try {
    localStorage.setItem(
      filesKey(key),
      JSON.stringify({
        uri: file.uri,
        name: file.name,
        type: file.type,
        size: file.size,
      }),
    );
  } catch (err) {
    debugError('Failed to persist file:', err);
  }
};
const getFileFromDB = async (key) => {
  try {
    const raw = localStorage.getItem(filesKey(key));
    const file = raw ? JSON.parse(raw) : null;
    return isUploadableFile(file) ? file : null;
  } catch {
    return null;
  }
};
const deleteFileFromDB = async (key) => {
  try {
    localStorage.removeItem(filesKey(key));
  } catch (err) {
    debugError('Failed to delete persisted file:', err);
  }
};
const clearAllFilesFromDB = async () => {
  const keys = ['profileImage', 'panImage', 'gstImage', 'fssaiImage', ...Array.from({ length: MAX_MENU_FILES }, (_, i) => `menuImage_${i}`)];
  await Promise.all(keys.map((key) => deleteFileFromDB(key)));
};
export default function AddRestaurant() {
  const { columns } = useLayoutWidth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Step 1: Basic Info
  const [step1, setStep1] = useState({
    restaurantName: '',
    pureVegRestaurant: null,
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    primaryContactNumber: '',
    zoneId: '',
    location: {
      addressLine1: '',
      addressLine2: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      formattedAddress: '',
      latitude: '',
      longitude: '',
    },
  });

  // Step 2: Images & Operational
  const [step2, setStep2] = useState({
    menuImages: [],
    profileImage: null,
    cuisines: [],
    estimatedDeliveryTime: '',
    openingTime: '',
    closingTime: '',
    openDays: [],
    takeawayEnabled: true,
  });

  // Step 3: Documents
  const [step3, setStep3] = useState({
    panNumber: '',
    nameOnPan: '',
    panImage: null,
    gstRegistered: false,
    gstNumber: '',
    gstLegalName: '',
    gstAddress: '',
    gstImage: null,
    fssaiNumber: '',
    fssaiExpiry: '',
    fssaiImage: null,
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    accountType: '',
  });
  const languageTabs = [
    {
      key: 'default',
      label: 'Default',
    },
    {
      key: 'en',
      label: 'English(EN)',
    },
    {
      key: 'bn',
      label: 'Bengali - ?????(BN)',
    },
    {
      key: 'ar',
      label: 'Arabic - ??????? (AR)',
    },
    {
      key: 'es',
      label: 'Spanish - espa�ol(ES)',
    },
  ];
  const mainContentRef = useRef(null);
  const clearPersistedFormData = async () => {
    try {
      localStorage.removeItem(ADMIN_ADD_STORAGE_KEY);
    } catch (err) {
      debugError('Failed to clear localStorage form cache:', err);
    }
    await clearAllFilesFromDB();
  };
  useEffect(() => {
    let cancelled = false;
    const restoreFormData = async () => {
      try {
        const storedRaw = localStorage.getItem(ADMIN_ADD_STORAGE_KEY);
        if (storedRaw) {
          const parsed = JSON.parse(storedRaw);
          const safeStep = Math.min(Math.max(Number(parsed?.step) || 1, 1), 3);
          if (!cancelled) setStep(safeStep);
          if (parsed?.step1 && !cancelled) {
            setStep1((prev) => ({
              ...prev,
              ...parsed.step1,
              location: {
                ...prev.location,
                ...(parsed.step1.location || {}),
              },
            }));
          }
          if (parsed?.step2 && !cancelled) {
            setStep2((prev) => ({
              ...prev,
              ...parsed.step2,
            }));
          }
          if (parsed?.step3 && !cancelled) {
            setStep3((prev) => ({
              ...prev,
              ...parsed.step3,
            }));
          }
        }
        const [profileImage, panImage, gstImage, fssaiImage] = await Promise.all([
          getFileFromDB('profileImage'),
          getFileFromDB('panImage'),
          getFileFromDB('gstImage'),
          getFileFromDB('fssaiImage'),
        ]);
        const menuFilePromises = Array.from(
          {
            length: MAX_MENU_FILES,
          },
          (_, i) => getFileFromDB(`menuImage_${i}`),
        );
        const menuFilesFromDB = (await Promise.all(menuFilePromises)).filter(Boolean);
        if (!cancelled) {
          if (profileImage)
            setStep2((prev) => ({
              ...prev,
              profileImage,
            }));
          if (menuFilesFromDB.length) {
            setStep2((prev) => ({
              ...prev,
              menuImages: [...(prev.menuImages || []), ...menuFilesFromDB],
            }));
          }
          if (panImage)
            setStep3((prev) => ({
              ...prev,
              panImage,
            }));
          if (gstImage)
            setStep3((prev) => ({
              ...prev,
              gstImage,
            }));
          if (fssaiImage)
            setStep3((prev) => ({
              ...prev,
              fssaiImage,
            }));
        }
      } catch (err) {
        debugError('Failed to restore admin add form data:', err);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    };
    restoreFormData();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const serializableStep2 = {
        ...step2,
        menuImages: (step2.menuImages || []).filter((img) => !isUploadableFile(img) && (img?.url || (typeof img === 'string' && img.trim()))),
        profileImage:
          !isUploadableFile(step2.profileImage) && (step2.profileImage?.url || (typeof step2.profileImage === 'string' && step2.profileImage.trim()))
            ? step2.profileImage
            : null,
      };
      const serializableStep3 = {
        ...step3,
        panImage:
          !isUploadableFile(step3.panImage) && (step3.panImage?.url || (typeof step3.panImage === 'string' && step3.panImage.trim())) ? step3.panImage : null,
        gstImage:
          !isUploadableFile(step3.gstImage) && (step3.gstImage?.url || (typeof step3.gstImage === 'string' && step3.gstImage.trim())) ? step3.gstImage : null,
        fssaiImage:
          !isUploadableFile(step3.fssaiImage) && (step3.fssaiImage?.url || (typeof step3.fssaiImage === 'string' && step3.fssaiImage.trim()))
            ? step3.fssaiImage
            : null,
      };
      localStorage.setItem(
        ADMIN_ADD_STORAGE_KEY,
        JSON.stringify({
          step,
          step1,
          step2: serializableStep2,
          step3: serializableStep3,
          timestamp: Date.now(),
        }),
      );
    } catch (err) {
      debugError('Failed to persist admin add form data:', err);
    }
  }, [isHydrated, step, step1, step2, step3]);
  useEffect(() => {
    if (!isHydrated) return;
    const uploadableMenuFiles = (step2.menuImages || []).filter((img) => isUploadableFile(img)).slice(0, MAX_MENU_FILES);
    uploadableMenuFiles.forEach((file, idx) => {
      void saveFileToDB(`menuImage_${idx}`, file);
    });
    for (let i = uploadableMenuFiles.length; i < MAX_MENU_FILES; i += 1) {
      void deleteFileFromDB(`menuImage_${i}`);
    }
  }, [isHydrated, step2.menuImages]);
  useEffect(() => {
    if (!isHydrated) return;
    if (isUploadableFile(step2.profileImage)) {
      void saveFileToDB('profileImage', step2.profileImage);
    } else {
      void deleteFileFromDB('profileImage');
    }
  }, [isHydrated, step2.profileImage]);
  useEffect(() => {
    if (!isHydrated) return;
    if (isUploadableFile(step3.panImage)) {
      void saveFileToDB('panImage', step3.panImage);
    } else {
      void deleteFileFromDB('panImage');
    }
  }, [isHydrated, step3.panImage]);
  useEffect(() => {
    if (!isHydrated) return;
    if (isUploadableFile(step3.gstImage)) {
      void saveFileToDB('gstImage', step3.gstImage);
    } else {
      void deleteFileFromDB('gstImage');
    }
  }, [isHydrated, step3.gstImage]);
  useEffect(() => {
    if (!isHydrated) return;
    if (isUploadableFile(step3.fssaiImage)) {
      void saveFileToDB('fssaiImage', step3.fssaiImage);
    } else {
      void deleteFileFromDB('fssaiImage');
    }
  }, [isHydrated, step3.fssaiImage]);

  // Keep UX consistent: each step opens from top after Next/Back.
  useEffect(() => {
    mainContentRef.current?.scrollTo?.({
      y: 0,
      animated: false,
    });
  }, [step]);

  // Upload handler for images
  const handleUpload = async (file, folder) => {
    try {
      const res = await uploadAPI.uploadMedia(file, {
        folder,
      });
      const d = res?.data?.data || res?.data;
      return {
        url: d.url,
        publicId: d.publicId,
      };
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to upload image';
      debugError('Upload error:', errorMsg, err);
      throw new Error(`Image upload failed: ${errorMsg}`);
    }
  };

  // Validation functions
  const validateStep1 = () => {
    const errors = [];
    if (!step1.restaurantName?.trim()) errors.push('Restaurant name is required');
    if (typeof step1.pureVegRestaurant !== 'boolean') errors.push('Please select whether restaurant is pure veg');
    if (!step1.ownerName?.trim()) errors.push('Owner name is required');
    if (step1.ownerName?.trim() && (!NAME_REGEX.test(step1.ownerName.trim()) || !hasLetters(step1.ownerName))) {
      errors.push('Owner name must contain valid characters');
    }
    if (!step1.ownerEmail?.trim()) errors.push('Owner email is required');
    if (step1.ownerEmail?.trim() && !EMAIL_REGEX.test(step1.ownerEmail.trim())) errors.push('Please enter a valid email address');
    if (!step1.ownerPhone?.trim()) errors.push('Owner phone number is required');
    if (step1.ownerPhone?.trim() && !PHONE_REGEX.test(step1.ownerPhone.trim())) errors.push('Owner phone number must be 10 digits');
    if (!step1.primaryContactNumber?.trim()) errors.push('Primary contact number is required');
    if (step1.primaryContactNumber?.trim() && !PHONE_REGEX.test(step1.primaryContactNumber.trim())) errors.push('Primary contact number must be 10 digits');
    if (!step1.zoneId?.trim()) errors.push('Service zone is required');
    if (!step1.location?.area?.trim()) errors.push('Area/Sector/Locality is required');
    if (!step1.location?.city?.trim()) errors.push('City is required');
    return errors;
  };
  const validateStep2 = () => {
    const errors = [];
    if (!step2.menuImages || step2.menuImages.length === 0) errors.push('At least one menu image is required');
    if (!step2.profileImage) errors.push('Restaurant profile image is required');
    if (!step2.cuisines || step2.cuisines.length === 0) errors.push('Please select at least one cuisine');
    if (!step2.estimatedDeliveryTime?.trim()) errors.push('Estimated delivery time is required');
    if (!step2.openingTime?.trim()) errors.push('Opening time is required');
    if (!step2.closingTime?.trim()) errors.push('Closing time is required');
    const openingMinutes = timeStringToMinutes(step2.openingTime);
    const closingMinutes = timeStringToMinutes(step2.closingTime);
    if (openingMinutes !== null && closingMinutes !== null) {
      if (openingMinutes === closingMinutes) {
        errors.push('Opening time and closing time cannot be same');
      } else if (closingMinutes < openingMinutes) {
        errors.push('Closing time cannot be less than opening time');
      }
    }
    if (!step2.openDays || step2.openDays.length === 0) errors.push('Please select at least one open day');
    return errors;
  };
  const validateStep3 = () => {
    const errors = [];
    if (!step3.panNumber?.trim()) errors.push('PAN number is required');
    if (step3.panNumber?.trim() && !PAN_REGEX.test(step3.panNumber.trim())) errors.push('PAN number must be in valid format');
    if (!step3.nameOnPan?.trim()) errors.push('Name on PAN is required');
    if (step3.nameOnPan?.trim() && (!NAME_REGEX.test(step3.nameOnPan.trim()) || !hasLetters(step3.nameOnPan))) {
      errors.push('Name on PAN must contain characters only');
    }
    if (!step3.panImage) errors.push('PAN image is required');
    if (!step3.fssaiNumber?.trim()) errors.push('FSSAI number is required');
    if (step3.fssaiNumber?.trim() && !FSSAI_REGEX.test(step3.fssaiNumber.trim())) errors.push('FSSAI number must be 14 digits');
    if (!step3.fssaiExpiry?.trim()) errors.push('FSSAI expiry date is required');
    if (step3.fssaiExpiry?.trim() && step3.fssaiExpiry < getTodayLocalYMD()) errors.push('FSSAI expiry date cannot be in the past');
    if (!step3.fssaiImage) errors.push('FSSAI image is required');
    if (step3.gstRegistered) {
      if (!step3.gstNumber?.trim()) errors.push('GST number is required when GST registered');
      if (step3.gstNumber?.trim() && !GST_REGEX.test(step3.gstNumber.trim())) errors.push('GST number must be in valid format');
      if (!step3.gstLegalName?.trim()) errors.push('GST legal name is required when GST registered');
      if (step3.gstLegalName?.trim() && (!NAME_REGEX.test(step3.gstLegalName.trim()) || !hasLetters(step3.gstLegalName))) {
        errors.push('GST legal name must contain characters only');
      }
      if (!step3.gstAddress?.trim()) errors.push('GST registered address is required when GST registered');
      if (step3.gstAddress?.trim() && /^\d+$/.test(step3.gstAddress.trim())) {
        errors.push('GST registered address cannot contain only numbers');
      }
      if (!step3.gstImage) errors.push('GST image is required when GST registered');
    }
    if (!step3.accountNumber?.trim()) errors.push('Account number is required');
    if (step3.accountNumber?.trim() && !ACCOUNT_NUMBER_REGEX.test(step3.accountNumber.trim())) {
      errors.push('Account number must be 9 to 18 digits');
    }
    if (step3.accountNumber !== step3.confirmAccountNumber) errors.push('Account number and confirmation do not match');
    if (!step3.ifscCode?.trim()) errors.push('IFSC code is required');
    if (step3.ifscCode?.trim() && !IFSC_REGEX.test(step3.ifscCode.trim())) errors.push('IFSC code must be in valid format');
    if (!step3.accountHolderName?.trim()) errors.push('Account holder name is required');
    if (step3.accountHolderName?.trim() && (!NAME_REGEX.test(step3.accountHolderName.trim()) || !hasLetters(step3.accountHolderName))) {
      errors.push('Account holder name must contain characters only');
    }
    if (!step3.accountType?.trim()) errors.push('Account type is required');
    if (step3.accountType?.trim() && !['Saving', 'Current'].includes(step3.accountType.trim())) errors.push('Account type must be either Saving or Current');
    return errors;
  };
  const handleNext = () => {
    setFormErrors({});
    let validationErrors = [];
    if (step === 1) {
      validationErrors = validateStep1();
    } else if (step === 2) {
      validationErrors = validateStep2();
    } else if (step === 3) {
      validationErrors = validateStep3();
    }
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => {
        toast.error(error);
      });
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setFormErrors({});
    try {
      // Upload all images first
      let profileImageData = null;
      if (isUploadableFile(step2.profileImage)) {
        profileImageData = await handleUpload(step2.profileImage, 'Dima Hasao/restaurant/profile');
      } else if (step2.profileImage?.url) {
        profileImageData = step2.profileImage;
      }
      let menuImagesData = [];
      for (const file of step2.menuImages.filter((f) => isUploadableFile(f))) {
        const uploaded = await handleUpload(file, 'Dima Hasao/restaurant/menu');
        menuImagesData.push(uploaded);
      }
      const existingMenuUrls = step2.menuImages.filter((img) => !isUploadableFile(img) && (img?.url || (typeof img === 'string' && img.startsWith('http'))));
      menuImagesData = [...existingMenuUrls, ...menuImagesData];
      let panImageData = null;
      if (isUploadableFile(step3.panImage)) {
        panImageData = await handleUpload(step3.panImage, 'Dima Hasao/restaurant/pan');
      } else if (step3.panImage?.url) {
        panImageData = step3.panImage;
      }
      let gstImageData = null;
      if (step3.gstRegistered && step3.gstImage) {
        if (isUploadableFile(step3.gstImage)) {
          gstImageData = await handleUpload(step3.gstImage, 'Dima Hasao/restaurant/gst');
        } else if (step3.gstImage?.url) {
          gstImageData = step3.gstImage;
        }
      }
      let fssaiImageData = null;
      if (isUploadableFile(step3.fssaiImage)) {
        fssaiImageData = await handleUpload(step3.fssaiImage, 'Dima Hasao/restaurant/fssai');
      } else if (step3.fssaiImage?.url) {
        fssaiImageData = step3.fssaiImage;
      }

      // Prepare payload
      const payload = {
        // Step 1
        restaurantName: step1.restaurantName,
        pureVegRestaurant: step1.pureVegRestaurant,
        ownerName: step1.ownerName,
        ownerEmail: step1.ownerEmail,
        ownerPhone: step1.ownerPhone,
        primaryContactNumber: step1.primaryContactNumber,
        zoneId: step1.zoneId,
        location: step1.location,
        // Step 2
        menuImages: menuImagesData,
        profileImage: profileImageData,
        cuisines: step2.cuisines,
        estimatedDeliveryTime: step2.estimatedDeliveryTime,
        openingTime: step2.openingTime,
        closingTime: step2.closingTime,
        openDays: step2.openDays,
        // Step 3
        panNumber: step3.panNumber,
        nameOnPan: step3.nameOnPan,
        panImage: panImageData,
        gstRegistered: step3.gstRegistered,
        gstNumber: step3.gstNumber,
        gstLegalName: step3.gstLegalName,
        gstAddress: step3.gstAddress,
        gstImage: gstImageData,
        fssaiNumber: step3.fssaiNumber,
        fssaiExpiry: step3.fssaiExpiry,
        fssaiImage: fssaiImageData,
        accountNumber: step3.accountNumber,
        ifscCode: step3.ifscCode,
        accountHolderName: step3.accountHolderName,
        accountType: step3.accountType,
        takeawaySettings: {
          isEnabled: step2.takeawayEnabled === true,
        },
      };

      // Call backend API
      const response = await adminAPI.createRestaurant(payload);
      const data = response?.data?.data ?? response?.data;
      if (response?.data?.success !== false && data) {
        await clearPersistedFormData();
        toast.success('Restaurant created successfully!');
        setShowSuccessDialog(true);
        setTimeout(() => {
          navigate('/admin/food/restaurants');
        }, 2000);
      } else {
        throw new Error(response?.data?.message || 'Failed to create restaurant');
      }
    } catch (error) {
      debugError('Error creating restaurant:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to create restaurant. Please try again.';
      toast.error(errorMsg);
      setFormErrors({
        submit: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  // Manual search states for fallback
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  useEffect(() => {
    if (step !== 1) return;
    let cancelled = false;
    setZonesLoading(true);
    zoneAPI
      .getPublicZones()
      .then((res) => {
        const list = res?.data?.data?.zones || res?.data?.zones || [];
        if (!cancelled) setZones(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setZones([]);
      })
      .finally(() => {
        if (!cancelled) setZonesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step]);

  // Hybrid Search Fallback (Nominatim)
  useEffect(() => {
    if (step !== 1) return;
    const q = String(locationSearchValue || '').trim();
    if (q.length < 3) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setIsSearchingLocation(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=4&q=${encodeURIComponent(q)}&countrycodes=in`;
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
          },
        });
        const json = await res.json();
        const mapped = (Array.isArray(json) ? json : []).map((r) => ({
          id: r.place_id,
          display: r.display_name || '',
          lat: Number(r.lat),
          lng: Number(r.lon),
          addr: r.address || {},
        }));
        setLocationSuggestions(mapped);
      } catch (e) {
        debugError('Nominatim search failed:', e);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [locationSearchValue, step]);

  // Render functions for each step
  const twoCols = `grid grid-cols-${columns} gap-3`;
  const renderStep1 = () => (
    <Div className="gap-3">
      <Card>
        <SectionTitle>Restaurant information</SectionTitle>
        <Div className="gap-3">
          <Field label="Restaurant name" required hint="Customers will see this name.">
            <Input
              value={step1.restaurantName || ''}
              onChange={(e) =>
                setStep1({
                  ...step1,
                  restaurantName: e.target.value,
                })
              }
              className={INPUT}
              placeholder="Customers will see this name"
            />
          </Field>
          <Field label="Pure veg restaurant?" required hint="This helps users filter restaurants by dietary preference.">
            <Div className="flex-row flex-wrap items-center gap-2">
              <HButton
                type="button"
                onClick={() =>
                  setStep1({
                    ...step1,
                    pureVegRestaurant: true,
                  })
                }
                className={`h-11 px-4 items-center justify-center rounded-full border ${step1.pureVegRestaurant === true ? 'bg-green-600 border-green-600' : 'bg-white border-slate-300'}`}
              >
                <Span className={`text-sm font-semibold ${step1.pureVegRestaurant === true ? 'text-white' : 'text-slate-700'}`}>Yes, pure veg</Span>
              </HButton>
              <HButton
                type="button"
                onClick={() =>
                  setStep1({
                    ...step1,
                    pureVegRestaurant: false,
                  })
                }
                className={`h-11 px-4 items-center justify-center rounded-full border ${step1.pureVegRestaurant === false ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
              >
                <Span className={`text-sm font-semibold ${step1.pureVegRestaurant === false ? 'text-white' : 'text-slate-700'}`}>No, mixed menu</Span>
              </HButton>
            </Div>
          </Field>
        </Div>
      </Card>

      <Card>
        <SectionTitle>Owner details</SectionTitle>
        <Div className={twoCols}>
          <Div className="col-span-full">
            <Field label="Full name" required>
              <Input
                value={step1.ownerName || ''}
                onChange={(e) =>
                  setStep1({
                    ...step1,
                    ownerName: normalizeName(e.target.value),
                  })
                }
                className={INPUT}
                placeholder="Owner full name"
              />
            </Field>
          </Div>
          <Field label="Email address" required>
            <Input
              type="email"
              value={step1.ownerEmail || ''}
              onChange={(e) =>
                setStep1({
                  ...step1,
                  ownerEmail: e.target.value,
                })
              }
              className={INPUT}
              placeholder="owner@example.com"
            />
          </Field>
          <Field label="Phone number" required>
            <Input
              value={step1.ownerPhone || ''}
              onChange={(e) =>
                setStep1({
                  ...step1,
                  ownerPhone: sanitizeDigits(e.target.value).slice(0, 10),
                })
              }
              className={INPUT}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              maxLength={10}
            />
          </Field>
        </Div>
      </Card>

      <Card>
        <SectionTitle>Restaurant contact &amp; location</SectionTitle>
        <Div className="gap-3">
          <Field label="Search location" hint="Search to auto-fill area, city, state, pincode and coordinates.">
            <Div>
              <Div>
                <Input
                  value={locationSearchValue}
                  onChange={(e) => setLocationSearchValue(e.target.value)}
                  className={INPUT}
                  placeholder="Search and select restaurant address..."
                />
                {isSearchingLocation && (
                  <Div className="absolute right-3 top-3">
                    <UiIcon as={Loader2} size={16} className="text-slate-400" />
                  </Div>
                )}
              </Div>

              {locationSuggestions.length > 0 && (
                <Div className="mt-1 bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {locationSuggestions.map((s, idx) => (
                    <HButton
                      key={s.id}
                      type="button"
                      onClick={() => {
                        const { lat, lng, display, addr } = s;
                        const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.locality || '';
                        const city = addr.city || addr.town || addr.village || '';
                        const state = addr.state || '';
                        const pincode = addr.postcode || '';
                        setStep1((prev) => ({
                          ...prev,
                          location: {
                            ...prev.location,
                            formattedAddress: display,
                            addressLine1: display,
                            area: area || prev.location.area,
                            city: city || prev.location.city,
                            state: state || prev.location.state,
                            pincode: pincode || prev.location.pincode,
                            latitude: lat,
                            longitude: lng,
                          },
                        }));
                        setLocationSearchValue(display);
                        setLocationSuggestions([]);
                      }}
                      className={`w-full px-3 py-3 justify-center ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <Span className="text-sm text-slate-700" numberOfLines={2}>
                        {s.display}
                      </Span>
                    </HButton>
                  ))}
                </Div>
              )}
            </Div>
          </Field>

          <Field label="Service zone" required hint="Choose the service zone where your restaurant will be available.">
            <Select
              value={step1.zoneId || ''}
              onChange={(e) =>
                setStep1({
                  ...step1,
                  zoneId: e.target.value,
                })
              }
              className={INPUT}
              disabled={zonesLoading}
            >
              <Option value="">{zonesLoading ? 'Loading zones...' : 'Select a zone'}</Option>
              {zones.map((z) => {
                const id = String(z?._id || z?.id || '');
                const label = z?.name || z?.zoneName || z?.serviceLocation || id;
                return (
                  <Option key={id} value={id}>
                    {label}
                  </Option>
                );
              })}
            </Select>
          </Field>

          <Field label="Primary contact number" required>
            <Input
              value={step1.primaryContactNumber || ''}
              onChange={(e) =>
                setStep1({
                  ...step1,
                  primaryContactNumber: sanitizeDigits(e.target.value).slice(0, 10),
                })
              }
              className={INPUT}
              placeholder="Restaurant's primary contact number"
              inputMode="numeric"
              maxLength={10}
            />
          </Field>

          <Div className={twoCols}>
            <Field label="Area / sector / locality" required>
              <Input
                value={step1.location?.area || ''}
                onChange={(e) =>
                  setStep1({
                    ...step1,
                    location: {
                      ...step1.location,
                      area: e.target.value,
                    },
                  })
                }
                className={INPUT}
                placeholder="Area / Sector / Locality"
              />
            </Field>
            <Field label="City" required>
              <Input
                value={step1.location?.city || ''}
                onChange={(e) =>
                  setStep1({
                    ...step1,
                    location: {
                      ...step1.location,
                      city: e.target.value,
                    },
                  })
                }
                className={INPUT}
                placeholder="City"
              />
            </Field>
            <Field label="Shop / building no.">
              <Input
                value={step1.location?.addressLine1 || ''}
                onChange={(e) =>
                  setStep1({
                    ...step1,
                    location: {
                      ...step1.location,
                      addressLine1: e.target.value,
                    },
                  })
                }
                className={INPUT}
                placeholder="Optional"
              />
            </Field>
            <Field label="Floor / tower">
              <Input
                value={step1.location?.addressLine2 || ''}
                onChange={(e) =>
                  setStep1({
                    ...step1,
                    location: {
                      ...step1.location,
                      addressLine2: e.target.value,
                    },
                  })
                }
                className={INPUT}
                placeholder="Optional"
              />
            </Field>
            <Field label="State">
              <Input
                value={step1.location?.state || ''}
                onChange={(e) =>
                  setStep1({
                    ...step1,
                    location: {
                      ...step1.location,
                      state: e.target.value,
                    },
                  })
                }
                className={INPUT}
                placeholder="Optional"
              />
            </Field>
            <Field label="Pin code">
              <Input
                value={step1.location?.pincode || ''}
                onChange={(e) =>
                  setStep1({
                    ...step1,
                    location: {
                      ...step1.location,
                      pincode: e.target.value,
                    },
                  })
                }
                className={INPUT}
                placeholder="Optional"
              />
            </Field>
            <Div className="col-span-full">
              <Field label="Nearby landmark">
                <Input
                  value={step1.location?.landmark || ''}
                  onChange={(e) =>
                    setStep1({
                      ...step1,
                      location: {
                        ...step1.location,
                        landmark: e.target.value,
                      },
                    })
                  }
                  className={INPUT}
                  placeholder="Optional"
                />
              </Field>
            </Div>
          </Div>
        </Div>
      </Card>
    </Div>
  );
  const renderStep2 = () => (
    <Div className="gap-3">
      <Card>
        <SectionTitle>Menu &amp; photos</SectionTitle>
        <Div className="gap-4">
          <Field label="Menu images" required>
            <HButton
              type="button"
              onClick={async () => {
                const files = await pickImage({
                  multiple: true,
                });
                if (files.length) {
                  setStep2((prev) => ({
                    ...prev,
                    menuImages: [...(prev.menuImages || []), ...files],
                  }));
                }
              }}
              className={`${BTN_SECONDARY} border-dashed`}
            >
              <UiIcon as={Upload} size={16} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>Choose files</Span>
            </HButton>
            {step2.menuImages.length > 0 && (
              <Div className={`mt-2 grid grid-cols-${columns > 1 ? 4 : 2} gap-3`}>
                {step2.menuImages.map((file, idx) => {
                  const imageUrl = isUploadableFile(file) ? objectUrl(file) : file?.url || file;
                  return (
                    <Div key={idx} className="relative aspect-[4/5] rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                      {imageUrl && <Img src={imageUrl} alt={`Menu ${idx + 1}`} className="w-full h-full object-cover" />}
                      <HButton
                        type="button"
                        accessibilityLabel={`Remove menu image ${idx + 1}`}
                        onClick={() =>
                          setStep2((prev) => ({
                            ...prev,
                            menuImages: prev.menuImages.filter((_, i) => i !== idx),
                          }))
                        }
                        className="absolute top-1 right-1 w-8 h-8 items-center justify-center bg-red-600 rounded-full"
                      >
                        <UiIcon as={X} size={14} className="text-white" />
                      </HButton>
                    </Div>
                  );
                })}
              </Div>
            )}
          </Field>

          <Field label="Restaurant profile image" required>
            <Div className="flex-row items-center gap-3">
              <Div className="h-16 w-16 rounded-full bg-slate-100 border border-slate-200 items-center justify-center overflow-hidden">
                {step2.profileImage ? (
                  (() => {
                    const imageSrc = isUploadableFile(step2.profileImage) ? objectUrl(step2.profileImage) : step2.profileImage?.url || step2.profileImage;
                    return imageSrc ? (
                      <Img src={imageSrc} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UiIcon as={ImageIcon} size={20} className="text-slate-400" />
                    );
                  })()
                ) : (
                  <UiIcon as={ImageIcon} size={20} className="text-slate-400" />
                )}
              </Div>
              <HButton
                type="button"
                onClick={async () => {
                  const file = await pickImage();
                  if (file)
                    setStep2((prev) => ({
                      ...prev,
                      profileImage: file,
                    }));
                }}
                className={BTN_SECONDARY}
              >
                <UiIcon as={Upload} size={16} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY}>Upload</Span>
              </HButton>
            </Div>
          </Field>
        </Div>
      </Card>

      <Card>
        <SectionTitle>Menu profile &amp; timings</SectionTitle>
        <Div className="gap-4">
          <Field label="Select cuisines" required hint="Up to 3.">
            <Div className="flex-row flex-wrap gap-2">
              {cuisinesOptions.map((cuisine) => {
                const active = step2.cuisines.includes(cuisine);
                return (
                  <HButton
                    key={cuisine}
                    type="button"
                    onClick={() => {
                      setStep2((prev) => {
                        const exists = prev.cuisines.includes(cuisine);
                        if (exists)
                          return {
                            ...prev,
                            cuisines: prev.cuisines.filter((c) => c !== cuisine),
                          };
                        if (prev.cuisines.length >= 3) return prev;
                        return {
                          ...prev,
                          cuisines: [...prev.cuisines, cuisine],
                        };
                      });
                    }}
                    className={`h-11 px-4 items-center justify-center rounded-full border ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                  >
                    <Span className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>{cuisine}</Span>
                  </HButton>
                );
              })}
            </Div>
          </Field>

          <Div className={twoCols}>
            <Field label="Opening time" required>
              <Input
                type="time"
                value={normalizeTimeValue(step2.openingTime)}
                onChange={(e) => {
                  const newValue = stringToTime(e.target.value);
                  if (!newValue) {
                    setStep2({
                      ...step2,
                      openingTime: '',
                    });
                    return;
                  }
                  const nextOpening = timeToString(newValue);
                  const closingMinutes = timeStringToMinutes(step2.closingTime);
                  const openingMinutes = timeStringToMinutes(nextOpening);
                  if (openingMinutes !== null && closingMinutes !== null) {
                    if (openingMinutes === closingMinutes) {
                      toast.error('Opening time and closing time cannot be same');
                      return;
                    }
                    if (closingMinutes < openingMinutes) {
                      toast.error('Closing time cannot be less than opening time');
                      return;
                    }
                  }
                  setStep2({
                    ...step2,
                    openingTime: nextOpening,
                  });
                }}
                placeholder="Select time"
                className={INPUT}
              />
            </Field>

            <Field label="Closing time" required>
              <Input
                type="time"
                value={normalizeTimeValue(step2.closingTime)}
                onChange={(e) => {
                  const newValue = stringToTime(e.target.value);
                  if (!newValue) {
                    setStep2({
                      ...step2,
                      closingTime: '',
                    });
                    return;
                  }
                  const nextClosing = timeToString(newValue);
                  const openingMinutes = timeStringToMinutes(step2.openingTime);
                  const closingMinutes = timeStringToMinutes(nextClosing);
                  if (openingMinutes !== null && closingMinutes !== null) {
                    if (openingMinutes === closingMinutes) {
                      toast.error('Opening time and closing time cannot be same');
                      return;
                    }
                    if (closingMinutes < openingMinutes) {
                      toast.error('Closing time cannot be less than opening time');
                      return;
                    }
                  }
                  setStep2({
                    ...step2,
                    closingTime: nextClosing,
                  });
                }}
                placeholder="Select time"
                className={INPUT}
              />
            </Field>
          </Div>

          <Field label="Estimated delivery time" required>
            <Input
              value={step2.estimatedDeliveryTime || ''}
              onChange={(e) =>
                setStep2({
                  ...step2,
                  estimatedDeliveryTime: e.target.value,
                })
              }
              autoComplete="off"
              className={INPUT}
              placeholder="e.g., 25-30 mins"
            />
          </Field>

          <Field label="Open days" required>
            <Div className="grid grid-cols-7 gap-1.5">
              {daysOfWeek.map((day) => {
                const active = step2.openDays.includes(day);
                return (
                  <HButton
                    key={day}
                    type="button"
                    accessibilityLabel={day}
                    onClick={() => {
                      setStep2((prev) => {
                        const exists = prev.openDays.includes(day);
                        if (exists)
                          return {
                            ...prev,
                            openDays: prev.openDays.filter((d) => d !== day),
                          };
                        return {
                          ...prev,
                          openDays: [...prev.openDays, day],
                        };
                      });
                    }}
                    className={`h-11 items-center justify-center rounded-lg border ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                  >
                    <Span className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>{day.charAt(0)}</Span>
                  </HButton>
                );
              })}
            </Div>
          </Field>

          <Div className="flex-row items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
            <Div className="flex-1">
              <P className="text-sm font-semibold text-slate-900">Takeaway (pickup)</P>
              <P className="text-xs text-slate-500 mt-0.5">Allow customers to place orders online and pick them up from the restaurant.</P>
            </Div>
            <Switch
              checked={step2.takeawayEnabled}
              onCheckedChange={(checked) =>
                setStep2({
                  ...step2,
                  takeawayEnabled: checked,
                })
              }
            />
          </Div>
        </Div>
      </Card>
    </Div>
  );
  const renderStep3 = () => (
    <Div className="gap-3">
      <Card>
        <SectionTitle>PAN details</SectionTitle>
        <Div className={twoCols}>
          <Field label="PAN number" required>
            <Input
              value={step3.panNumber || ''}
              onChange={(e) =>
                setStep3({
                  ...step3,
                  panNumber: sanitizePan(e.target.value),
                })
              }
              className={INPUT}
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          </Field>
          <Field label="Name on PAN" required>
            <Input
              value={step3.nameOnPan || ''}
              onChange={(e) =>
                setStep3({
                  ...step3,
                  nameOnPan: normalizeName(e.target.value),
                })
              }
              className={INPUT}
            />
          </Field>
          <Div className="col-span-full">
            <Field label="PAN image" required>
              <HButton
                type="button"
                onClick={async () => {
                  const file = await pickImage();
                  if (file)
                    setStep3((prev) => ({
                      ...prev,
                      panImage: file,
                    }));
                }}
                className={BTN_SECONDARY}
              >
                <UiIcon as={Upload} size={16} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY} numberOfLines={1}>
                  {step3.panImage ? getStoredFileLabel(step3.panImage) : 'Choose file'}
                </Span>
              </HButton>
              {step3.panImage && (
                <Div className="mt-2 flex-row items-center gap-3">
                  <Div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <Img src={getStoredImageSrc(step3.panImage)} alt="PAN document" className="h-full w-full object-cover" />
                  </Div>
                  <P className="flex-1 text-xs text-slate-500" numberOfLines={2}>
                    Selected: {getStoredFileLabel(step3.panImage)}
                  </P>
                </Div>
              )}
            </Field>
          </Div>
        </Div>
      </Card>

      <Card>
        <SectionTitle>GST details</SectionTitle>
        <Field label="GST registered?">
          <Div className="flex-row flex-wrap items-center gap-2">
            <HButton
              type="button"
              onClick={() =>
                setStep3({
                  ...step3,
                  gstRegistered: true,
                })
              }
              className={`h-11 px-4 items-center justify-center rounded-full border ${step3.gstRegistered ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
            >
              <Span className={`text-sm font-semibold ${step3.gstRegistered ? 'text-white' : 'text-slate-700'}`}>Yes</Span>
            </HButton>
            <HButton
              type="button"
              onClick={() =>
                setStep3({
                  ...step3,
                  gstRegistered: false,
                })
              }
              className={`h-11 px-4 items-center justify-center rounded-full border ${!step3.gstRegistered ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
            >
              <Span className={`text-sm font-semibold ${!step3.gstRegistered ? 'text-white' : 'text-slate-700'}`}>No</Span>
            </HButton>
          </Div>
        </Field>
        {step3.gstRegistered && (
          <Div className="gap-3 mt-3">
            <Field label="GST number" required>
              <Input
                value={step3.gstNumber || ''}
                onChange={(e) =>
                  setStep3({
                    ...step3,
                    gstNumber: sanitizeGst(e.target.value),
                  })
                }
                className={INPUT}
                placeholder="GST number"
                maxLength={15}
              />
            </Field>
            <Field label="Legal name" required>
              <Input
                value={step3.gstLegalName || ''}
                onChange={(e) =>
                  setStep3({
                    ...step3,
                    gstLegalName: normalizeName(e.target.value),
                  })
                }
                className={INPUT}
                placeholder="Legal name"
              />
            </Field>
            <Field label="Registered address" required>
              <Input
                value={step3.gstAddress || ''}
                onChange={(e) =>
                  setStep3({
                    ...step3,
                    gstAddress: e.target.value,
                  })
                }
                className={INPUT}
                placeholder="Registered address"
              />
            </Field>
            <Field label="GST image">
              <HButton
                type="button"
                onClick={async () => {
                  const file = await pickImage();
                  if (file)
                    setStep3((prev) => ({
                      ...prev,
                      gstImage: file,
                    }));
                }}
                className={BTN_SECONDARY}
              >
                <UiIcon as={Upload} size={16} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY} numberOfLines={1}>
                  {step3.gstImage ? getStoredFileLabel(step3.gstImage) : 'Choose file'}
                </Span>
              </HButton>
              {step3.gstImage && (
                <Div className="mt-2 flex-row items-center gap-3">
                  <Div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <Img src={getStoredImageSrc(step3.gstImage)} alt="GST document" className="h-full w-full object-cover" />
                  </Div>
                  <P className="flex-1 text-xs text-slate-500" numberOfLines={2}>
                    Selected: {getStoredFileLabel(step3.gstImage)}
                  </P>
                </Div>
              )}
            </Field>
          </Div>
        )}
      </Card>

      <Card>
        <SectionTitle>FSSAI details</SectionTitle>
        <Div className={twoCols}>
          <Field label="FSSAI number" required>
            <Input
              value={step3.fssaiNumber || ''}
              onChange={(e) =>
                setStep3({
                  ...step3,
                  fssaiNumber: sanitizeFssai(e.target.value),
                })
              }
              className={INPUT}
              placeholder="FSSAI number"
              inputMode="numeric"
              maxLength={14}
            />
          </Field>
          <Field label="FSSAI expiry date" required>
            <Input
              type="date"
              value={step3.fssaiExpiry || ''}
              onChange={(e) =>
                setStep3({
                  ...step3,
                  fssaiExpiry: e.target.value,
                })
              }
              min={getTodayLocalYMD()}
              autoComplete="off"
              className={INPUT}
            />
          </Field>
          <Div className="col-span-full">
            <Field label="FSSAI image">
              <HButton
                type="button"
                onClick={async () => {
                  const file = await pickImage();
                  if (file)
                    setStep3((prev) => ({
                      ...prev,
                      fssaiImage: file,
                    }));
                }}
                className={BTN_SECONDARY}
              >
                <UiIcon as={Upload} size={16} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY} numberOfLines={1}>
                  {step3.fssaiImage ? getStoredFileLabel(step3.fssaiImage) : 'Choose file'}
                </Span>
              </HButton>
              {step3.fssaiImage && (
                <Div className="mt-2 flex-row items-center gap-3">
                  <Div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <Img src={getStoredImageSrc(step3.fssaiImage)} alt="FSSAI document" className="h-full w-full object-cover" />
                  </Div>
                  <P className="flex-1 text-xs text-slate-500" numberOfLines={2}>
                    Selected: {getStoredFileLabel(step3.fssaiImage)}
                  </P>
                </Div>
              )}
            </Field>
          </Div>
        </Div>
      </Card>

      <Card>
        <SectionTitle>Bank account details</SectionTitle>
        <Div className={twoCols}>
          <Field label="Account number" required>
            <Input
              value={step3.accountNumber || ''}
              onChange={(e) =>
                setStep3({
                  ...step3,
                  accountNumber: sanitizeDigits(e.target.value).slice(0, 18),
                })
              }
              className={INPUT}
              placeholder="Account number"
              inputMode="numeric"
              maxLength={18}
            />
          </Field>
          <Field label="Re-enter account number" required>
            <Input
              value={step3.confirmAccountNumber || ''}
              onChange={(e) =>
                setStep3({
                  ...step3,
                  confirmAccountNumber: sanitizeDigits(e.target.value).slice(0, 18),
                })
              }
              className={INPUT}
              placeholder="Re-enter account number"
              inputMode="numeric"
              maxLength={18}
            />
          </Field>
          <Field label="IFSC code" required>
            <Input
              value={step3.ifscCode || ''}
              onChange={(e) =>
                setStep3({
                  ...step3,
                  ifscCode: sanitizeIfsc(e.target.value),
                })
              }
              className={INPUT}
              placeholder="IFSC code"
              maxLength={11}
            />
          </Field>
          <Field label="Account type" required>
            <Select
              value={step3.accountType || ''}
              onChange={(e) =>
                setStep3({
                  ...step3,
                  accountType: e.target.value,
                })
              }
              className={INPUT}
            >
              <Option value="">Select account type</Option>
              <Option value="Saving">Saving</Option>
              <Option value="Current">Current</Option>
            </Select>
          </Field>
          <Div className="col-span-full">
            <Field label="Account holder name" required>
              <Input
                value={step3.accountHolderName || ''}
                onChange={(e) =>
                  setStep3({
                    ...step3,
                    accountHolderName: normalizeName(e.target.value),
                  })
                }
                className={INPUT}
                placeholder="Account holder name"
              />
            </Field>
          </Div>
        </Div>
      </Card>
    </Div>
  );
  const renderStep = () => {
    if (step === 1) return renderStep1();
    if (step === 2) return renderStep2();
    return renderStep3();
  };
  return (
    <AdminPage maxWidth={720} scroll={false} padded={false} contentClassName="flex-1">
      <ScrollDiv ref={mainContentRef} className="flex-1 p-4" contentStyle={{ paddingBottom: 24 }}>
        <PageHeader icon={Building2} title="Add New Restaurant" subtitle={`Step ${step} of 3`} breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Add' }]} />

        {renderStep()}

        {formErrors.submit ? (
          <Div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <P className="text-sm text-red-700">{formErrors.submit}</P>
          </Div>
        ) : null}

        <Div className="flex-row items-center justify-between gap-2 mt-4">
          <HButton
            type="button"
            disabled={step === 1 || isSubmitting}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className={`${BTN_SECONDARY} flex-1`}
          >
            <Span className={BTN_TEXT_SECONDARY}>Back</Span>
          </HButton>
          <HButton type="button" onClick={handleNext} disabled={isSubmitting} className={`${BTN_PRIMARY} flex-1`}>
            {isSubmitting ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
            <Span className={BTN_TEXT_PRIMARY}>{step === 3 ? (isSubmitting ? 'Creating…' : 'Create restaurant') : isSubmitting ? 'Saving…' : 'Continue'}</Span>
          </HButton>
        </Div>
      </ScrollDiv>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md bg-white p-0">
          <Div className="p-6 items-center">
            <Div className="w-12 h-12 rounded-full bg-green-100 items-center justify-center mb-3">
              <UiIcon as={CheckCircle2} size={24} className="text-green-700" />
            </Div>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900 text-center">Restaurant created</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 text-center mt-1">
                The restaurant has been created and is now pending approval.
              </DialogDescription>
            </DialogHeader>
            <HButton
              type="button"
              onClick={() => {
                setShowSuccessDialog(false);
                navigate('/admin/restaurants');
              }}
              className={`${BTN_PRIMARY} w-full mt-4`}
            >
              <Span className={BTN_TEXT_PRIMARY}>Go to restaurant list</Span>
            </HButton>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
