/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverDetails.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { GMap, Marker, toLatLng } from '../../../../../components/maps';
import { ArrowLeft, Calendar, CircleUserRound, ChevronRight, Download, Eye, PencilLine, Mail, MapPin, Phone, CheckCircle2 } from 'lucide-react-native';
import { useLocation, useNavigate, useParams } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import { DISTRICT_CENTER, HAS_VALID_GOOGLE_MAPS_KEY, useBaseGoogleMapsLoader } from '../../utils/googleMaps';
import BikeIcon from '../../../../assets/icons/bike.png';
import CarIcon from '../../../../assets/icons/car.png';
import AutoIcon from '../../../../assets/icons/auto.png';
import TruckIcon from '../../../../assets/icons/truck.png';
import EhcvIcon from '../../../../assets/icons/ehcv.png';
import HcvIcon from '../../../../assets/icons/hcv.png';
import LcvIcon from '../../../../assets/icons/LCV.png';
import McvIcon from '../../../../assets/icons/mcv.png';
import LuxuryIcon from '../../../../assets/icons/Luxury.png';
import PremiumIcon from '../../../../assets/icons/Premium.png';
import SuvIcon from '../../../../assets/icons/SUV.png';
import {
  Button,
  Div,
  H1,
  H2,
  H3,
  H4,
  H5,
  Img,
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
import { Line, Polyline as SvgPolyline, Svg } from 'react-native-svg';
import { window } from '../../../../../lib/webShim';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
/* The web's `absolute inset-0 w-full h-full` on the chart <svg>. */
const CHART_OVERLAY_STYLE = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
const getMapIconForVehicle = (iconType = '') => {
  const raw = String(iconType || '').trim();
  if (/^(https?:|data:image\/|blob:|\/uploads\/|\/images\/|\/[^/])/.test(raw)) {
    return raw;
  }
  const value = raw.toLowerCase();
  if (value.includes('bike')) return BikeIcon;
  if (value.includes('auto')) return AutoIcon;
  if (value.includes('ehc')) return EhcvIcon;
  if (value.includes('hcv')) return HcvIcon;
  if (value.includes('lcv')) return LcvIcon;
  if (value.includes('mcv')) return McvIcon;
  if (value.includes('truck')) return TruckIcon;
  if (value.includes('lux')) return LuxuryIcon;
  if (value.includes('premium')) return PremiumIcon;
  if (value.includes('suv')) return SuvIcon;
  return CarIcon;
};
const getDocumentImages = (doc = {}) => {
  const rawImages =
    Array.isArray(doc?.images) && doc.images.length
      ? doc.images
      : [doc?.imageUrl, doc?.previewUrl, doc?.secureUrl, doc?.image, doc?.url, doc?.fileUrl, doc?.document, doc?.file];
  return [...new Set(rawImages.filter(Boolean).map((value) => String(value).trim()))];
};
const getDocumentReviewStatus = (doc = {}) =>
  String(doc?.status ?? doc?.verificationStatus ?? doc?.approvalStatus ?? doc?.reviewStatus ?? '')
    .trim()
    .toLowerCase();
const getDocumentReason = (doc = {}) => String(doc?.comment ?? doc?.remarks ?? doc?.reason ?? doc?.admin_comment ?? doc?.rejection_reason ?? '').trim();
const getDocumentProviderVerificationStatus = (doc = {}) => {
  const explicit = String(doc?.verificationStatus ?? '')
    .trim()
    .toLowerCase();
  if (explicit) {
    return explicit;
  }
  if (doc?.verificationResponse || doc?.verificationReferenceId || doc?.verifiedAt) {
    return 'verified';
  }
  return 'not_started';
};
const toSentenceCase = (str) => {
  if (!str) return '';
  const lower = String(str).toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};
const toTitleCase = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .split(/[\s_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
const getDocumentProviderVerificationMessage = (doc = {}) => String(doc?.verificationMessage ?? doc?.msg ?? doc?.providerMessage ?? '').trim();
const getDocumentVerificationType = (doc = {}, fallbackKey = '') => {
  const explicitType = String(doc?.verificationType ?? doc?.verification_type ?? '')
    .trim()
    .toLowerCase();
  if (['driving_license', 'pan', 'gstin', 'rc', 'bank_account'].includes(explicitType)) {
    return explicitType;
  }
  const haystack = [doc?.sourceKey, fallbackKey, doc?.key, doc?.documentKey, doc?.type, doc?.name, doc?.label, doc?.identify_number_key]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/\bdriving[_\s-]*license\b|\bdl\b|\blicense\b/.test(haystack)) return 'driving_license';
  if (/\bpan\b|\bpancard\b|\bpan[_\s-]*card\b/.test(haystack)) return 'pan';
  if (/\bgst\b|\bgstin\b/.test(haystack)) return 'gstin';
  if (/\brc\b|\bvehicle[_\s-]*rc\b|\bregistration certificate\b/.test(haystack)) return 'rc';
  if (/\bbank\b|\baccount\b|\bifsc\b/.test(haystack)) return 'bank_account';
  return 'none';
};
const getDocumentVerificationLabel = (type = 'none', fallbackName = 'Document') => {
  if (type === 'pan') return 'PAN Verify';
  if (type === 'bank_account') return 'Bank Verify';
  if (type === 'driving_license') return 'DL Verify';
  if (type === 'rc') return 'RC Verify';
  if (type === 'gstin') return 'GSTIN Verify';
  return fallbackName || 'Document';
};
const toDisplayValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value).trim();
};
const normalizeCheckStatus = (value) => {
  if (typeof value === 'boolean') {
    return value ? 'pass' : 'fail';
  }
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (!normalized) return 'unknown';
  if (['yes', 'true', 'active', 'valid', 'commercial', 'transport', 'available', 'present'].includes(normalized)) {
    return 'pass';
  }
  if (['no', 'false', 'expired', 'invalid', 'private', 'non transport', 'non-transport', 'missing', 'unavailable'].includes(normalized)) {
    return 'fail';
  }
  return 'unknown';
};
const getCheckTone = (status = 'unknown') => {
  if (status === 'pass') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'fail') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};
const getDocumentVerificationFacts = (doc = {}) => {
  const verificationType = getDocumentVerificationType(doc, doc?.sourceKey);
  const response = doc?.verificationResponse || {};
  const result = response?.cardData?.result || {};
  const sourceOutput = result?.source_output || {};
  const bankAccountDetails = response?.cardData?.response?.account_details || {};
  if (verificationType === 'pan') {
    return [
      {
        label: 'PAN Number',
        value: doc.identify_number || result?.pan || '',
      },
      {
        label: 'Verified Name',
        value: result?.name || result?.registered_name || doc?.verifiedName || '',
      },
      {
        label: 'PAN Status',
        value: result?.status || doc?.panValid || '',
      },
      {
        label: 'Name Validated',
        value: result?.name_validated || '',
      },
    ].filter((item) => toDisplayValue(item.value));
  }
  if (verificationType === 'bank_account') {
    return [
      {
        label: 'Account Number',
        value: doc.identify_number || '',
      },
      {
        label: 'IFSC',
        value: doc?.ifsc || '',
      },
      {
        label: 'Verified Name',
        value: bankAccountDetails?.beneficiary_name || doc?.verifiedName || '',
      },
      {
        label: 'Bank',
        value: bankAccountDetails?.bank_name || doc?.verifiedBankName || '',
      },
      {
        label: 'Branch',
        value: bankAccountDetails?.branch_name || doc?.verifiedBranchName || '',
      },
    ].filter((item) => toDisplayValue(item.value));
  }
  if (verificationType === 'driving_license') {
    return [
      {
        label: 'License Number',
        value: doc.identify_number || '',
      },
      {
        label: 'Verified Name',
        value: sourceOutput?.name || doc?.verifiedName || '',
      },
      {
        label: 'DL Status',
        value: sourceOutput?.dl_status || doc?.dlStatus || '',
      },
      {
        label: 'DOB',
        value: sourceOutput?.dob || doc?.verifiedDob || doc?.birthDate || '',
      },
      {
        label: 'Issuing RTO',
        value: sourceOutput?.issuing_rto_name || doc?.issuingRtoName || '',
      },
    ].filter((item) => toDisplayValue(item.value));
  }
  if (verificationType === 'rc') {
    return [
      {
        label: 'RC Number',
        value: doc.identify_number || '',
      },
      {
        label: 'Owner Name',
        value: result?.owner_name || doc?.verifiedName || '',
      },
      {
        label: 'RC Status',
        value: result?.status || doc?.rcStatus || '',
      },
      {
        label: 'Vehicle Model',
        value: result?.model || doc?.vehicleModel || '',
      },
      {
        label: 'Manufacturer',
        value: result?.vehicle_manufacturer_name || doc?.vehicleManufacturer || '',
      },
      {
        label: 'Registration Date',
        value: result?.reg_date || doc?.vehicleRegistrationDate || '',
      },
    ].filter((item) => toDisplayValue(item.value));
  }
  return [];
};
const getRcVerificationChecks = (doc = {}) => {
  const verificationType = getDocumentVerificationType(doc, doc?.sourceKey);
  if (verificationType !== 'rc') {
    return [];
  }
  const response = doc?.verificationResponse || {};
  const result = response?.cardData?.result || {};
  const seatCapacity = result?.seat_capacity ?? result?.seating_capacity ?? result?.seating_cap ?? result?.no_of_seat ?? result?.seat ?? '';
  const insuranceUpto = result?.vehicle_insurance_upto ?? result?.insurance_upto ?? result?.insurance_expiry ?? doc?.vehicleInsuranceUpto ?? '';
  const puccUpto = result?.pucc_upto ?? result?.puc_upto ?? result?.pollution_upto ?? result?.vehicle_pucc_upto ?? '';
  const commercialValue =
    result?.commercial_vehicle ??
    result?.is_commercial ??
    result?.commercial ??
    result?.vehicle_type ??
    result?.vehicle_category ??
    result?.registration_type ??
    result?.class ??
    '';
  return [
    {
      label: 'Seat Capacity Check',
      value: seatCapacity,
      status: toDisplayValue(seatCapacity) ? 'pass' : 'unknown',
    },
    {
      label: 'Insurance Check',
      value: insuranceUpto,
      status: normalizeCheckStatus(result?.insurance_status || insuranceUpto),
    },
    {
      label: 'PUCC Check',
      value: puccUpto,
      status: normalizeCheckStatus(result?.pucc_status || result?.puc_status || puccUpto),
    },
    {
      label: 'Commercial Vehicle Check',
      value: commercialValue,
      status: normalizeCheckStatus(commercialValue),
    },
  ];
};
const getProviderStatusTone = (status = '') => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();
  if (['verified', 'success', 'approved', 'completed'].includes(normalized)) {
    return 'bg-sky-100 text-sky-800';
  }
  if (['failed', 'invalid', 'rejected', 'declined'].includes(normalized)) {
    return 'bg-rose-100 text-rose-800';
  }
  if (['pending', 'processing', 'queued'].includes(normalized)) {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-slate-100 text-slate-600';
};
const toTimestamp = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};
const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const humanizeDocumentKey = (value = '') =>
  String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
const formatServiceCategories = (value) => {
  const rawValues = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const normalized = [
    ...new Set(
      rawValues
        .map((item) =>
          String(item || '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];
  if (!normalized.length) {
    return 'Not set';
  }
  return normalized.map((item) => item.charAt(0).toUpperCase() + item.slice(1)).join(', ');
};
const getDocumentFileNames = (doc = {}, imageUrls = []) => {
  const rawNames = [];
  if (Array.isArray(doc?.fileNames)) {
    rawNames.push(...doc.fileNames);
  }
  rawNames.push(doc?.fileName, doc?.filename, doc?.originalFilename, doc?.originalName);
  imageUrls.forEach((url, index) => {
    try {
      const pathname = new URL(url).pathname;
      const lastSegment = pathname.split('/').filter(Boolean).pop() || '';
      if (lastSegment) {
        rawNames.push(decodeURIComponent(lastSegment));
      }
    } catch {
      const lastSegment = String(url).split('/').filter(Boolean).pop() || '';
      if (lastSegment) {
        rawNames.push(lastSegment);
      }
    }
    if (!rawNames[index]) {
      rawNames.push(`document-${index + 1}`);
    }
  });
  const normalizedNames = [...new Set(rawNames.filter(Boolean).map((value) => String(value).trim()))];
  if (normalizedNames.length > 0) {
    return normalizedNames;
  }
  return [doc?.fileName, doc?.filename, doc?.originalFilename, doc?.originalName, doc?.name, doc?.label]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 1);
};
const normalizeDocumentEntry = (doc = {}, fallbackKey = '') => {
  if (typeof doc === 'string') {
    return {
      sourceKey: fallbackKey,
      name: fallbackKey || 'Document',
      fileNames: getDocumentFileNames({}, [doc]),
      identify_number: '',
      expiry_date: '',
      status: '',
      comment: '',
      images: [doc].filter(Boolean),
    };
  }
  const images = getDocumentImages(doc);
  const fileNames = getDocumentFileNames(doc, images);
  return {
    sourceKey: doc?.key || doc?.documentKey || doc?.type || fallbackKey || doc?.name || '',
    name: doc?.name || doc?.label || humanizeDocumentKey(doc?.key || doc?.documentKey || doc?.type || fallbackKey) || doc?.fileName || 'Document',
    fileNames,
    identify_number: doc?.identify_number ?? doc?.identifyNumber ?? doc?.number ?? doc?.id_number ?? '',
    expiry_date: doc?.expiry_date ?? doc?.expiryDate ?? doc?.expiry ?? '',
    status: getDocumentReviewStatus(doc),
    comment: getDocumentReason(doc),
    providerStatus: getDocumentProviderVerificationStatus(doc),
    providerMessage: getDocumentProviderVerificationMessage(doc),
    verificationReferenceId: String(doc?.verificationReferenceId ?? doc?.reference_id ?? '').trim(),
    verificationResponse: doc?.verificationResponse ?? null,
    verifiedAt: doc?.verifiedAt ?? null,
    images,
    uploadedAt: doc?.uploadedAt ?? doc?.updatedAt ?? doc?.createdAt ?? null,
    reviewedAt: doc?.reviewedAt ?? null,
    reverificationRequestedAt: doc?.reverificationRequestedAt ?? null,
  };
};
const DriverDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Driver Profile');
  const [profile, setProfile] = useState(null);
  const [walletForm, setWalletForm] = useState({
    amount: '',
    operation: 'credit',
    isSubmitting: false,
  });
  const [walletHistory, setWalletHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [documentActionKey, setDocumentActionKey] = useState('');
  const tabs = ['Driver Profile', 'Request List', 'Payment History', 'Withdrawal History', 'Review History', 'Documents'];
  const fetchProfile = async () => {
    setIsLoading(true);
    setError('');
    setAvatarFailed(false);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {};
      const [res, walletRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/drivers/${id}/profile?t=${Date.now()}`, {
          headers,
          cache: 'no-store',
        }),
        adminService.getDriverWalletHistory(id).catch(() => null),
      ]);
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.data);
        const walletPayload = walletRes?.data?.data || walletRes?.data || walletRes || {};
        setWalletHistory(Array.isArray(walletPayload?.results) ? walletPayload.results : []);
      } else {
        setError(data.message || 'Unable to load driver profile');
      }
    } catch (err) {
      setError('Unable to load driver profile');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchProfile();
  }, [id]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && tabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);
  const mapCenter = useMemo(() => {
    if (!profile?.location?.lat || !profile?.location?.lng) return DISTRICT_CENTER;
    return {
      lat: profile.location.lat,
      lng: profile.location.lng,
    };
  }, [profile]);
  const shouldLoadMap = activeTab === 'Driver Profile';
  const { isLoaded, loadError } = useBaseGoogleMapsLoader();
  const vehicleMapIconUrl = useMemo(() => getMapIconForVehicle(profile?.vehicleIconType || profile?.vehicle_image || profile?.vehicle?.type), [profile]);
  /* The web scales the icon with google.maps.Size/Point; react-native-maps takes an
     image source on the Marker (a required asset, or { uri } for a server URL). */
  const vehicleMarkerIcon = useMemo(() => {
    if (!vehicleMapIconUrl) return undefined;
    return typeof vehicleMapIconUrl === 'string' ? { uri: vehicleMapIconUrl } : vehicleMapIconUrl;
  }, [vehicleMapIconUrl]);
  const stats = profile?.stats || {};
  const earnings = profile?.earnings || {};
  const wallet = profile?.wallet || {};
  const requests = profile?.requests || [];
  const withdrawals = profile?.withdrawals || [];
  const backRoute = location.state?.from || '/admin/drivers';
  const onboardingVehicle = profile?.onboarding?.vehicle || {};
  const vehicleFieldSummary = useMemo(
    () => [
      {
        label: 'Operating City',
        value:
          onboardingVehicle.locationName || profile?.service_location?.name || profile?.service_location?.service_location_name || profile?.city || 'Not set',
      },
      {
        label: 'Service Categories',
        value: formatServiceCategories(
          onboardingVehicle.serviceCategories ||
            profile?.service_categories ||
            profile?.serviceCategories ||
            profile?.registerFor ||
            profile?.register_for ||
            profile?.transport_type,
        ),
      },
      {
        label: 'Vehicle Type',
        value: onboardingVehicle.vehicleType || profile?.vehicle?.type || profile?.vehicle_type || profile?.car_type || 'Not set',
      },
      {
        label: 'Brand / Make',
        value: onboardingVehicle.make || profile?.vehicle?.make || profile?.vehicle_make || profile?.car_make || 'Not set',
      },
      {
        label: 'Model',
        value: onboardingVehicle.model || profile?.vehicle?.model || profile?.vehicle_model || profile?.car_model || 'Not set',
      },
      {
        label: 'Year',
        value: onboardingVehicle.year || profile?.vehicle?.year || profile?.vehicle_year || profile?.car_year || 'Not set',
      },
      {
        label: 'Plate Number',
        value: onboardingVehicle.number || profile?.vehicle?.number || profile?.vehicle_number || profile?.car_number || 'Not set',
      },
      {
        label: 'Exterior Color',
        value: onboardingVehicle.color || profile?.vehicle?.color || profile?.vehicle_color || profile?.car_color || 'Not set',
      },
    ],
    [onboardingVehicle, profile],
  );
  const documents = useMemo(() => {
    const candidateSources = [profile?.documents, profile?.onboarding?.documents, profile?.user_snapshot?.documents, profile?.owner_snapshot?.documents].filter(
      Boolean,
    );
    const normalized = candidateSources.flatMap((raw) => {
      if (Array.isArray(raw)) {
        return raw.map((doc) => normalizeDocumentEntry(doc));
      }
      if (!raw || typeof raw !== 'object') {
        return [];
      }
      return Object.entries(raw).flatMap(([key, value]) => {
        if (!value) return [];
        return Array.isArray(value) ? value.map((doc) => normalizeDocumentEntry(doc, key)) : [normalizeDocumentEntry(value, key)];
      });
    });
    return normalized
      .filter(
        (doc, index, items) =>
          (doc.images.length > 0 || doc.name || doc.sourceKey) &&
          items.findIndex(
            (item) => item.sourceKey === doc.sourceKey && item.name === doc.name && JSON.stringify(item.images) === JSON.stringify(doc.images),
          ) === index,
      )
      .map((doc) => {
        const uploadedAtTime = Math.max(toTimestamp(doc.uploadedAt), toTimestamp(doc.reverificationRequestedAt));
        const reviewedAtTime = toTimestamp(doc.reviewedAt);
        return {
          ...doc,
          verificationType: getDocumentVerificationType(doc, doc.sourceKey),
          verificationLabel: getDocumentVerificationLabel(getDocumentVerificationType(doc, doc.sourceKey), doc.name),
          verificationFacts: getDocumentVerificationFacts(doc),
          rcChecks: getRcVerificationChecks(doc),
          isReuploaded: String(doc.status || '').toLowerCase() === 'pending' && uploadedAtTime > 0 && reviewedAtTime > 0 && uploadedAtTime >= reviewedAtTime,
        };
      });
  }, [profile]);
  const chart = profile?.chart || {
    months: [],
    earnings: [],
    trips: {
      completed: [],
      cancelled: [],
    },
  };
  const profileImage = String(profile?.image || '').trim();
  const onlineSelfieImage = String(profile?.online_selfie?.imageUrl || '').trim();
  const acceptanceRate = requests.length ? Math.round((stats.completed_trips / requests.length) * 100) : 0;
  const cancellationRate = requests.length ? Math.round((stats.cancelled_trips / requests.length) * 100) : 0;
  if (isLoading) {
    return (
      <ScrollDiv className="min-h-[60vh] flex items-center justify-center">
        <Div className="flex flex-col items-center gap-3">
          <Div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></Div>
          <P className="text-sm text-gray-500">Loading driver profile...</P>
        </Div>
      </ScrollDiv>
    );
  }
  if (error || !profile) {
    return (
      <ScrollDiv className="min-h-[60vh] flex items-center justify-center">
        <Div className="text-center space-y-3">
          <P className="text-sm font-semibold text-rose-600">{error || 'Driver not found'}</P>
          <Button onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg">
            Go Back
          </Button>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 font-sans text-gray-900">
      <Div className="mb-6">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Drivers</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Driver Profile</Span>
        </Div>
        <Div className="flex items-center justify-between gap-4">
          <H1 className="text-xl text-gray-900 font-bold">Driver Profile</H1>
          <Button
            onClick={() => navigate(backRoute)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        </Div>
      </Div>

      <Div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <Div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <Div className="flex items-center gap-4">
            <Div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
              {profileImage && !avatarFailed ? (
                <Img src={profileImage} alt={profile.name} className="w-full h-full object-cover" onError={() => setAvatarFailed(true)} />
              ) : (
                <Div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                  <UiIcon as={CircleUserRound} size={32} strokeWidth={1.75} />
                </Div>
              )}
            </Div>
            <Div>
              <Div className="flex items-center gap-2">
                <H2 className="text-lg text-gray-900 font-bold">{profile.name}</H2>
                <Span className="font-mono font-bold text-[10px] uppercase tracking-wider text-black bg-yellow-400 px-2 py-0.5 rounded shadow-sm">
                  {profile.driver_code ||
                    profile.referralCode ||
                    (profile.phone
                      ? `DRV${String(profile.phone).slice(-4)}${String(profile._id || profile.id || '')
                          .slice(-6)
                          .toUpperCase()}`.replace(/\W/g, '')
                      : 'N/A')}
                </Span>
              </Div>
              <Div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                <Div className="flex items-center gap-1">
                  <UiIcon as={Phone} size={12} /> {profile.phone || profile.mobile || 'N/A'}
                </Div>
                <Div className="flex items-center gap-1">
                  <UiIcon as={Mail} size={12} /> {profile.email || 'N/A'}
                </Div>
                <Div className="flex items-center gap-1">
                  <UiIcon as={MapPin} size={12} /> {profile.city || 'India'}
                </Div>
              </Div>
            </Div>
          </Div>
          <Div className="flex items-center gap-3 sm:ml-auto">
            <Div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              <Img src={profile.vehicle_image || ''} alt="Vehicle" className="w-full h-full object-cover" />
            </Div>
            <Div className="text-xs text-gray-600">
              <P className="text-gray-900 font-bold">{profile.vehicle?.type || 'Vehicle'}</P>
              <P>
                {profile.vehicle?.make} {profile.vehicle?.model}
              </P>
            </Div>
          </Div>
        </Div>

        <Div className="mt-4 flex flex-wrap items-start gap-3 border-t border-gray-100 pt-4">
          <Span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${profile.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}
          >
            <Span className={`h-1.5 w-1.5 rounded-full ${profile.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            {profile.isOnline ? 'Driver Online' : 'Driver Offline'}
          </Span>

          {onlineSelfieImage ? (
            <Div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-3 py-2">
              <Img
                src={onlineSelfieImage}
                alt={`${profile.name} online selfie`}
                className="h-14 w-14 rounded-xl object-cover border border-indigo-100 bg-white"
              />
              <Div className="min-w-0">
                <P className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Daily online selfie</P>
                <P className="break-words text-xs font-semibold leading-relaxed text-slate-700">{profile?.online_selfie?.forDate || 'Latest check-in'}</P>
              </Div>
            </Div>
          ) : null}
        </Div>
      </Div>

      <Div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tab) => (
          <Button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-full transition-colors ${activeTab === tab ? 'bg-yellow-400 text-black shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
          >
            {tab}
          </Button>
        ))}
      </Div>

      {activeTab !== 'Driver Profile' ? (
        <>
          {activeTab === 'Request List' && (
            <Div className="space-y-6">
              <Div className="bg-white rounded-xl border border-gray-200 p-6">
                <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Div className="border border-gray-100 rounded-lg p-4">
                    <P className="text-sm text-gray-500">Completed Rides</P>
                    <P className="text-2xl font-semibold text-gray-900">{stats.completed_trips || 0}</P>
                  </Div>
                  <Div className="border border-gray-100 rounded-lg p-4">
                    <P className="text-sm text-gray-500">Acceptance Rate</P>
                    <P className="text-2xl font-semibold text-gray-900">{acceptanceRate}%</P>
                  </Div>
                  <Div className="border border-gray-100 rounded-lg p-4">
                    <P className="text-sm text-gray-500">Cancellation Rate</P>
                    <P className="text-2xl font-semibold text-gray-900">{cancellationRate}%</P>
                  </Div>
                  <Div className="border border-gray-100 rounded-lg p-4">
                    <P className="text-sm text-gray-500">Cancelled Rides</P>
                    <P className="text-2xl font-semibold text-gray-900">{stats.cancelled_trips || 0}</P>
                  </Div>
                </Div>
              </Div>

              <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <Div>
                  <Table cols={[120, 170, 170, 170, 130, 90, 150]} className="w-full text-left">
                    <Thead>
                      <Tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                        <Th className="px-6 py-3">Request Id</Th>
                        <Th className="px-4 py-3">Date</Th>
                        <Th className="px-4 py-3">User Name</Th>
                        <Th className="px-4 py-3">Driver Name</Th>
                        <Th className="px-4 py-3">Trip Status</Th>
                        <Th className="px-4 py-3">Paid</Th>
                        <Th className="px-4 py-3">Payment Option</Th>
                      </Tr>
                    </Thead>
                    <Tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                      {requests.length === 0 ? (
                        <Tr>
                          <Td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                            No data found.
                          </Td>
                        </Tr>
                      ) : (
                        requests.map((item) => (
                          <Tr key={item.request_id}>
                            <Td className="px-6 py-3">{item.request_id.slice(-8).toUpperCase()}</Td>
                            <Td className="px-4 py-3">{item.date ? new Date(item.date).toLocaleString('en-IN') : 'N/A'}</Td>
                            <Td className="px-4 py-3">{item.user_name}</Td>
                            <Td className="px-4 py-3">{item.driver_name}</Td>
                            <Td className="px-4 py-3 capitalize">{item.trip_status}</Td>
                            <Td className="px-4 py-3">{item.paid ? 'Yes' : 'No'}</Td>
                            <Td className="px-4 py-3 capitalize">{item.payment_option}</Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </Div>
              </Div>
            </Div>
          )}

          {activeTab === 'Payment History' && (
            <Div className="space-y-6">
              <Div className="bg-white rounded-xl border border-gray-200 p-6">
                <Div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Div className="border border-gray-100 rounded-lg p-4">
                    <P className="text-sm text-gray-500">Total Credited</P>
                    <P className="text-2xl font-semibold text-gray-900">₹ {wallet.total_credits || 0}</P>
                  </Div>
                  <Div className="border border-gray-100 rounded-lg p-4">
                    <P className="text-sm text-gray-500">Total Debited</P>
                    <P className="text-2xl font-semibold text-gray-900">₹ {wallet.total_debits || 0}</P>
                  </Div>
                  <Div className="border border-gray-100 rounded-lg p-4">
                    <P className="text-sm text-gray-500">Available Balance</P>
                    <P className="text-2xl font-semibold text-gray-900">₹ {wallet.balance || 0}</P>
                  </Div>
                </Div>
              </Div>

              <Div className="bg-white rounded-xl border border-gray-200 p-6">
                <H3 className="text-sm text-gray-900 mb-4 font-bold">Credit or Debit wallet</H3>
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Div>
                    <Label className="block text-xs font-semibold text-gray-500 mb-1.5">Amount *</Label>
                    <Input
                      type="number"
                      min="0"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                      placeholder="Enter Amount"
                      value={walletForm.amount}
                      onChange={(e) =>
                        setWalletForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs font-semibold text-gray-500 mb-1.5">Operation *</Label>
                    <Select
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                      value={walletForm.operation}
                      onChange={(e) =>
                        setWalletForm((prev) => ({
                          ...prev,
                          operation: e.target.value,
                        }))
                      }
                    >
                      <Option value="credit">Credit</Option>
                      <Option value="debit">Debit</Option>
                    </Select>
                  </Div>
                </Div>
                <Div className="mt-4">
                  <Button
                    type="button"
                    disabled={walletForm.isSubmitting || !walletForm.amount}
                    onClick={async () => {
                      setWalletForm((prev) => ({
                        ...prev,
                        isSubmitting: true,
                      }));
                      try {
                        const token = localStorage.getItem('adminToken');
                        await fetch(`${API_BASE_URL}/admin/wallet/drivers/${id}/adjust`, {
                          method: 'POST',
                          headers: {
                            ...(token
                              ? {
                                  Authorization: `Bearer ${token}`,
                                }
                              : {}),
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            amount: Number(walletForm.amount),
                            operation: walletForm.operation,
                          }),
                        });
                        setWalletForm({
                          amount: '',
                          operation: 'credit',
                          isSubmitting: false,
                        });
                        await fetchProfile();
                      } catch (err) {
                        setWalletForm((prev) => ({
                          ...prev,
                          isSubmitting: false,
                        }));
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    {walletForm.isSubmitting ? 'Saving...' : 'Submit'}
                  </Button>
                </Div>
              </Div>

              <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <Div className="px-6 py-4 border-b border-gray-100">
                  <H3 className="text-sm text-gray-900 font-bold">Wallet Transactions</H3>
                </Div>
                <Div>
                  <Table cols={[170, 140, 120, 220]} className="w-full text-left">
                    <Thead>
                      <Tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                        <Th className="px-6 py-3">Date</Th>
                        <Th className="px-4 py-3">Type</Th>
                        <Th className="px-4 py-3">Amount</Th>
                        <Th className="px-4 py-3">Description</Th>
                      </Tr>
                    </Thead>
                    <Tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                      {walletHistory.length === 0 ? (
                        <Tr>
                          <Td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                            No wallet transactions found.
                          </Td>
                        </Tr>
                      ) : (
                        walletHistory.map((item) => (
                          <Tr key={item._id}>
                            <Td className="px-6 py-3">{item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : 'N/A'}</Td>
                            <Td className="px-4 py-3 capitalize">{String(item.type || '').replace(/_/g, ' ') || 'N/A'}</Td>
                            <Td className={`px-4 py-3 font-semibold ${Number(item.amount || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              ₹ {Math.abs(Number(item.amount || 0))}
                            </Td>
                            <Td className="px-4 py-3">{item.description || '-'}</Td>
                          </Tr>
                        ))
                      )}
                    </Tbody>
                  </Table>
                </Div>
              </Div>
            </Div>
          )}

          {activeTab === 'Withdrawal History' && (
            <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <Div>
                <Table cols={[170, 170, 140, 150, 120, 90]} className="w-full text-left">
                  <Thead>
                    <Tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                      <Th className="px-6 py-3">Date</Th>
                      <Th className="px-4 py-3">Name</Th>
                      <Th className="px-4 py-3">Mobile Number</Th>
                      <Th className="px-4 py-3">Requested Amount</Th>
                      <Th className="px-4 py-3">Status</Th>
                      <Th className="px-4 py-3">Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {withdrawals.length === 0 ? (
                      <Tr>
                        <Td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                          No data found.
                        </Td>
                      </Tr>
                    ) : (
                      withdrawals.map((item) => (
                        <Tr key={item._id}>
                          <Td className="px-6 py-3">{item.date ? new Date(item.date).toLocaleString('en-IN') : 'N/A'}</Td>
                          <Td className="px-4 py-3">{item.name}</Td>
                          <Td className="px-4 py-3">{item.mobile}</Td>
                          <Td className="px-4 py-3">₹ {item.requested_amount}</Td>
                          <Td className="px-4 py-3 capitalize">{item.status}</Td>
                          <Td className="px-4 py-3">-</Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Div>
            </Div>
          )}

          {activeTab === 'Review History' && (
            <Div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">No reviews found.</Div>
          )}

          {activeTab === 'Documents' && (
            <Div className="space-y-6">
              <Div className="bg-white rounded-xl border border-gray-200 p-6">
                <Div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <Div>
                    <H3 className="text-base text-gray-900 font-bold">Vehicle Onboarding Details</H3>
                    <P className="mt-1 text-sm text-gray-500">These values mirror the fields collected from the driver on the vehicle setup step.</P>
                  </Div>
                  <Button
                    type="button"
                    onClick={() =>
                      navigate(`/taxi/admin/drivers/edit/${id}`, {
                        state: {
                          from: location.pathname + location.search,
                        },
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <UiIcon as={PencilLine} size={15} />
                    Edit Driver Fields
                  </Button>
                </Div>

                <Div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {vehicleFieldSummary.map((item) => (
                    <Div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                      <P className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</P>
                      <P className="mt-2 text-sm font-semibold text-gray-900">{item.value || 'Not set'}</P>
                    </Div>
                  ))}
                </Div>
              </Div>

              <Div className="space-y-4">
                {documents.length === 0 ? (
                  <Div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">No documents found.</Div>
                ) : (
                  documents.map((doc, idx) => (
                    <Div key={`${doc.name}-${idx}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      {/* Header */}
                      <Div className="px-5 py-3 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <Div className="flex items-center gap-3">
                          <H4 className="text-sm font-semibold text-gray-900">{toTitleCase(doc.verificationLabel || doc.name)}</H4>
                          <Span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${String(doc.status || '').toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-700' : String(doc.status || '').toLowerCase() === 'rejected' || String(doc.status || '').toLowerCase() === 'declined' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}
                          >
                            {String(doc.status || '').toLowerCase() === 'approved' && <UiIcon as={CheckCircle2} size={12} />}
                            {toTitleCase(doc.status || 'Pending')}
                          </Span>
                        </Div>
                      </Div>

                      {/* Content Grid */}
                      <Div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Column 1: Document Details */}
                        <Div>
                          <H5 className="text-sm font-semibold text-gray-900 mb-4">Document details</H5>
                          <Div className="space-y-3">
                            <Div className="flex justify-between items-start text-sm border-b border-gray-50 pb-2">
                              <Span className="text-gray-500 font-medium">Identify number</Span>
                              <Span className="font-semibold text-gray-900">{doc.identify_number || '-'}</Span>
                            </Div>
                            <Div className="flex justify-between items-start text-sm border-b border-gray-50 pb-2">
                              <Span className="text-gray-500 font-medium">Expiry date</Span>
                              <Span className="font-semibold text-gray-900">{doc.expiry_date || '-'}</Span>
                            </Div>
                            {doc.isReuploaded && (
                              <Div className="mt-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">Re-uploaded for review</Div>
                            )}

                            {/* API Verification Message Compact */}
                            {doc.providerMessage && (
                              <Div className="mt-4 flex items-start gap-2">
                                <UiIcon as={CheckCircle2} size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                <Div>
                                  <P className="text-sm font-semibold text-gray-900">{doc.providerMessage}</P>
                                  {doc.verifiedAt && <P className="text-xs text-gray-500">Checked: {formatDateTime(doc.verifiedAt)}</P>}
                                </Div>
                              </Div>
                            )}

                            {/* Compact Rejection/Comment */}
                            {['rejected', 'declined'].includes(String(doc.status || '').toLowerCase()) && doc.comment && (
                              <Div className="mt-4 flex items-start gap-2">
                                <Div className="text-xs text-rose-600 font-medium">
                                  <Span className="font-semibold">Rejection reason:</Span> {doc.comment}
                                </Div>
                              </Div>
                            )}
                            {!['rejected', 'declined'].includes(String(doc.status || '').toLowerCase()) && doc.comment && (
                              <Div className="mt-4 flex items-start gap-2">
                                <Div className="text-xs text-gray-600 font-medium">
                                  <Span className="font-semibold">Comment:</Span> {doc.comment}
                                </Div>
                              </Div>
                            )}
                          </Div>
                        </Div>

                        {/* Column 2: Verification Data */}
                        <Div>
                          <H5 className="text-sm font-semibold text-gray-900 mb-4">Verification details</H5>
                          <Div className="space-y-3">
                            {doc.verificationFacts?.map((fact) => (
                              <Div key={`${doc.sourceKey}-${fact.label}`} className="flex justify-between items-start text-sm border-b border-gray-50 pb-2">
                                <Span className="text-gray-500 font-medium pr-4">{toSentenceCase(fact.label)}</Span>
                                <Span className="font-semibold text-gray-900 text-right">{toTitleCase(toDisplayValue(fact.value)) || '-'}</Span>
                              </Div>
                            ))}
                            {doc.rcChecks?.map((check) => (
                              <Div key={`${doc.sourceKey}-${check.label}`} className="flex justify-between items-start text-sm border-b border-gray-50 pb-2">
                                <Span className="text-gray-500 font-medium pr-4">{toSentenceCase(check.label)}</Span>
                                <Span className="font-semibold text-gray-900 text-right">{toTitleCase(toDisplayValue(check.value)) || '-'}</Span>
                              </Div>
                            ))}
                            {doc.verificationReferenceId && (
                              <Div className="flex justify-between items-start text-sm border-b border-gray-50 pb-2">
                                <Span className="text-gray-500 font-medium pr-4">Verification reference</Span>
                                <Span className="font-semibold text-gray-900 text-right">{doc.verificationReferenceId}</Span>
                              </Div>
                            )}
                            {!doc.verificationFacts?.length && !doc.rcChecks?.length && !doc.verificationReferenceId && (
                              <Div className="text-sm text-gray-400 py-2">No verification data available</Div>
                            )}
                          </Div>
                        </Div>

                        {/* Column 3: Activity & Actions */}
                        <Div className="flex flex-col justify-between">
                          <Div>
                            <H5 className="text-sm font-semibold text-gray-900 mb-4">Activity</H5>
                            <Div className="space-y-4">
                              {doc.uploadedAt && (
                                <Div className="flex gap-3 text-sm">
                                  <Div className="flex flex-col items-center">
                                    <Div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></Div>
                                    <Div className="w-px h-full bg-gray-200 mt-1"></Div>
                                  </Div>
                                  <Div className="pb-1">
                                    <P className="font-semibold text-gray-900">Uploaded</P>
                                    <P className="text-xs text-gray-500">{formatDateTime(doc.uploadedAt)}</P>
                                  </Div>
                                </Div>
                              )}
                              {doc.verifiedAt && (
                                <Div className="flex gap-3 text-sm">
                                  <Div className="flex flex-col items-center">
                                    <Div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></Div>
                                    <Div className="w-px h-full bg-gray-200 mt-1"></Div>
                                  </Div>
                                  <Div className="pb-1">
                                    <P className="font-semibold text-gray-900">API Verified</P>
                                    <P className="text-xs text-gray-500">{formatDateTime(doc.verifiedAt)}</P>
                                  </Div>
                                </Div>
                              )}
                              {doc.reviewedAt && (
                                <Div className="flex gap-3 text-sm">
                                  <Div className="flex flex-col items-center">
                                    <Div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></Div>
                                  </Div>
                                  <Div>
                                    <P className="font-semibold text-gray-900">Reviewed</P>
                                    <P className="text-xs text-gray-500">{formatDateTime(doc.reviewedAt)}</P>
                                  </Div>
                                </Div>
                              )}
                              {!doc.uploadedAt && !doc.verifiedAt && !doc.reviewedAt && <P className="text-xs text-gray-400">No activity logged.</P>}
                            </Div>
                          </Div>

                          <Div className="mt-6 pt-4 border-t border-gray-100 flex gap-2 w-full">
                            <Button
                              type="button"
                              onClick={() => doc.images?.length && window.open(doc.images[0], '_blank', 'noopener,noreferrer')}
                              disabled={!doc.images?.length}
                              className="flex-1 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                            >
                              View doc
                            </Button>
                            <Button
                              type="button"
                              onClick={async () => {
                                if (!doc.sourceKey) return;
                                const confirmApprove = await window.confirmAsync(`Are you sure you want to approve "${doc.name}"?`);
                                if (!confirmApprove) return;
                                try {
                                  setDocumentActionKey(`${doc.sourceKey}:approve`);
                                  const token = localStorage.getItem('adminToken');
                                  const nextDocuments = {
                                    ...(profile?.documents || {}),
                                    [doc.sourceKey]: {
                                      ...(profile?.documents?.[doc.sourceKey] || {}),
                                      key: doc.sourceKey,
                                      name: doc.name,
                                      fileName: doc.fileNames?.[0] || doc.name || doc.sourceKey,
                                      previewUrl: doc.images?.[0] || profile?.documents?.[doc.sourceKey]?.previewUrl || '',
                                      secureUrl: doc.images?.[0] || profile?.documents?.[doc.sourceKey]?.secureUrl || '',
                                      images: doc.images || profile?.documents?.[doc.sourceKey]?.images || [],
                                      fileNames: doc.fileNames || profile?.documents?.[doc.sourceKey]?.fileNames || [],
                                      identify_number: doc.identify_number || profile?.documents?.[doc.sourceKey]?.identify_number || '',
                                      expiry_date: doc.expiry_date || profile?.documents?.[doc.sourceKey]?.expiry_date || '',
                                      status: 'approved',
                                      comment: '',
                                      remarks: '',
                                      reason: '',
                                      admin_comment: '',
                                      rejection_reason: '',
                                      reviewedAt: new Date().toISOString(),
                                      reverificationRequestedAt: null,
                                    },
                                  };
                                  const response = await fetch(`${API_BASE_URL}/admin/drivers/${id}`, {
                                    method: 'PATCH',
                                    headers: {
                                      ...(token
                                        ? {
                                            Authorization: `Bearer ${token}`,
                                          }
                                        : {}),
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      documents: nextDocuments,
                                    }),
                                  });
                                  const data = await response.json();
                                  if (!response.ok || !data?.success) throw new Error(data?.message || 'Unable to approve');
                                  await fetchProfile();
                                } catch (err) {
                                  window.alert(err?.message || 'Unable to approve');
                                } finally {
                                  setDocumentActionKey('');
                                }
                              }}
                              disabled={documentActionKey.length > 0 || !doc.images?.length || String(doc.status || '').toLowerCase() === 'approved'}
                              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors text-center ${documentActionKey === `${doc.sourceKey}:approve` ? 'bg-emerald-100 text-emerald-500' : !doc.images?.length || String(doc.status || '').toLowerCase() === 'approved' || documentActionKey.length > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              onClick={async () => {
                                if (!doc.sourceKey) return;
                                const note = window.prompt(`Reason for rejecting "${doc.name}"`, doc.comment || '');
                                if (note === null) return;
                                try {
                                  setDocumentActionKey(`${doc.sourceKey}:reject`);
                                  const token = localStorage.getItem('adminToken');
                                  const nextDocuments = {
                                    ...(profile?.documents || {}),
                                    [doc.sourceKey]: {
                                      ...(profile?.documents?.[doc.sourceKey] || {}),
                                      key: doc.sourceKey,
                                      name: doc.name,
                                      fileName: doc.fileNames?.[0] || doc.name || doc.sourceKey,
                                      previewUrl: doc.images?.[0] || profile?.documents?.[doc.sourceKey]?.previewUrl || '',
                                      secureUrl: doc.images?.[0] || profile?.documents?.[doc.sourceKey]?.secureUrl || '',
                                      images: doc.images || profile?.documents?.[doc.sourceKey]?.images || [],
                                      fileNames: doc.fileNames || profile?.documents?.[doc.sourceKey]?.fileNames || [],
                                      identify_number: doc.identify_number || profile?.documents?.[doc.sourceKey]?.identify_number || '',
                                      expiry_date: doc.expiry_date || profile?.documents?.[doc.sourceKey]?.expiry_date || '',
                                      status: 'rejected',
                                      comment: String(note || '').trim(),
                                      remarks: String(note || '').trim(),
                                      reason: String(note || '').trim(),
                                      admin_comment: String(note || '').trim(),
                                      rejection_reason: String(note || '').trim(),
                                      reviewedAt: new Date().toISOString(),
                                      reverificationRequestedAt: null,
                                    },
                                  };
                                  const response = await fetch(`${API_BASE_URL}/admin/drivers/${id}`, {
                                    method: 'PATCH',
                                    headers: {
                                      ...(token
                                        ? {
                                            Authorization: `Bearer ${token}`,
                                          }
                                        : {}),
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      documents: nextDocuments,
                                    }),
                                  });
                                  const data = await response.json();
                                  if (!response.ok || !data?.success) {
                                    throw new Error(data?.message || 'Unable to reject document');
                                  }
                                  await fetchProfile();
                                } catch (err) {
                                  window.alert(err?.message || 'Unable to reject document');
                                } finally {
                                  setDocumentActionKey('');
                                }
                              }}
                              disabled={
                                documentActionKey.length > 0 || !doc.images?.length || ['rejected', 'declined'].includes(String(doc.status || '').toLowerCase())
                              }
                              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors text-center ${documentActionKey === `${doc.sourceKey}:reject` ? 'bg-rose-100 text-rose-500' : !doc.images?.length || ['rejected', 'declined'].includes(String(doc.status || '').toLowerCase()) || documentActionKey.length > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-rose-700 bg-rose-50 hover:bg-rose-100'}`}
                            >
                              Decline
                            </Button>
                          </Div>
                        </Div>
                      </Div>
                    </Div>
                  ))
                )}
              </Div>
            </Div>
          )}
        </>
      ) : (
        <>
          <Div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <H3 className="text-sm text-gray-900 mb-3 font-bold">Wallet Overview</H3>
            <Div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Wallet Balance</P>
                <P className="text-xl font-bold text-gray-900 mt-1">₹ {wallet.balance || 0}</P>
              </Div>
              <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cash Limit</P>
                <P className="text-xl font-bold text-gray-900 mt-1">₹ {wallet.cash_limit || 0}</P>
              </Div>
              <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Credited</P>
                <P className="text-xl font-bold text-gray-900 mt-1">₹ {wallet.total_credits || 0}</P>
              </Div>
              <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Debited</P>
                <P className="text-xl font-bold text-gray-900 mt-1">₹ {wallet.total_debits || 0}</P>
              </Div>
              <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Wallet Status</P>
                <P className={`text-xl font-bold mt-1 ${wallet.is_blocked ? 'text-red-600' : 'text-green-600'}`}>{wallet.is_blocked ? 'Blocked' : 'Active'}</P>
              </Div>
            </Div>
          </Div>

          <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Div className="bg-white rounded-xl border border-gray-200 p-6">
              <H3 className="text-base text-gray-900 mb-4 font-bold">Driver Location</H3>
              <Div className="h-80 rounded-xl overflow-hidden border border-gray-100">
                {loadError ? (
                  <Div className="h-full flex items-center justify-center text-sm text-gray-500 bg-gray-50">Map unavailable.</Div>
                ) : !profile?.location ? (
                  <Div className="h-full flex items-center justify-center text-sm text-gray-500 bg-gray-50">Live driver location is not available yet.</Div>
                ) : shouldLoadMap && HAS_VALID_GOOGLE_MAPS_KEY && isLoaded ? (
                  <GMap
                    className="w-full h-full"
                    initialRegion={{ ...toLatLng(mapCenter), latitudeDelta: 0.05, longitudeDelta: 0.05 }}
                    zoomControlEnabled
                  >
                    <Marker coordinate={toLatLng(mapCenter)} image={vehicleMarkerIcon} anchor={{ x: 0.5, y: 0.5 }} />
                  </GMap>
                ) : (
                  <Div className="h-full flex items-center justify-center text-sm text-gray-500 bg-gray-50">
                    {HAS_VALID_GOOGLE_MAPS_KEY ? 'Loading map...' : 'Configure `VITE_GOOGLE_MAPS_API_KEY` to show map.'}
                  </Div>
                )}
              </Div>
              <Div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500">
                <Span>{profile?.vehicle?.type || 'Vehicle'} marker</Span>
                {profile?.location ? (
                  <Span>
                    {Number(profile.location.lat).toFixed(4)}, {Number(profile.location.lng).toFixed(4)}
                  </Span>
                ) : null}
              </Div>
            </Div>

            <Div className="bg-white rounded-xl border border-gray-200 p-6">
              <H3 className="text-base text-gray-900 mb-4 font-bold">Earnings</H3>
              <Div className="h-52 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
                <Div className="relative h-full">
                  <ChartGrid height={170} />
                  <Svg viewBox="0 0 400 170" width="100%" height="100%" style={CHART_OVERLAY_STYLE}>
                    <SvgPolyline fill="none" stroke="#10b981" strokeWidth="2.5" points={buildLinePoints(chart.earnings || [], 400, 170)} />
                  </Svg>
                </Div>
                <Div className="mt-3 grid grid-cols-4 text-xs text-gray-400">
                  {(chart.months || []).map((m) => (
                    <Span key={m} className="text-center">
                      {m}
                    </Span>
                  ))}
                </Div>
              </Div>
              <Div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                  <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Today Earnings</P>
                  <P className="text-lg font-bold text-gray-900 mt-1">₹ {earnings.today_earnings || 0}</P>
                </Div>
                <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                  <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Admin Commission</P>
                  <P className="text-lg font-bold text-gray-900 mt-1">₹ {earnings.admin_commission || 0}</P>
                </Div>
                <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                  <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Drivers Earnings</P>
                  <P className="text-lg font-bold text-gray-900 mt-1">₹ {earnings.driver_earnings || 0}</P>
                </Div>
                <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                  <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">By Cash</P>
                  <P className="text-lg font-bold text-gray-900 mt-1">₹ {earnings.by_cash || 0}</P>
                </Div>
                <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                  <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">By Wallet</P>
                  <P className="text-lg font-bold text-gray-900 mt-1">₹ {earnings.by_wallet || 0}</P>
                </Div>
                <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                  <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">By Card/Online</P>
                  <P className="text-lg font-bold text-gray-900 mt-1">₹ {earnings.by_card || 0}</P>
                </Div>
              </Div>
            </Div>
          </Div>

          <Div className="bg-white rounded-xl border border-gray-200 p-6">
            <H3 className="text-base text-gray-900 mb-4 font-bold">Trips</H3>
            <Div className="h-52 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <Div className="relative h-full">
                <ChartGrid height={170} />
                <Svg viewBox="0 0 400 170" width="100%" height="100%" style={CHART_OVERLAY_STYLE}>
                  <SvgPolyline fill="none" stroke="#10b981" strokeWidth="2.5" points={buildLinePoints(chart.trips?.completed || [], 400, 170)} />
                  <SvgPolyline fill="none" stroke="#f97316" strokeWidth="2.5" points={buildLinePoints(chart.trips?.cancelled || [], 400, 170)} />
                </Svg>
              </Div>
              <Div className="mt-3 grid grid-cols-4 text-xs text-gray-400">
                {(chart.months || []).map((m) => (
                  <Span key={m} className="text-center">
                    {m}
                  </Span>
                ))}
              </Div>
              <Div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <Span className="flex items-center gap-1">
                  <Span className="w-2 h-2 rounded-full bg-emerald-500"></Span>
                  Completed
                </Span>
                <Span className="flex items-center gap-1">
                  <Span className="w-2 h-2 rounded-full bg-orange-500"></Span>
                  Cancelled
                </Span>
              </Div>
            </Div>
            <Div className="grid grid-cols-2 gap-3 mt-4">
              <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Completed Trips</P>
                <P className="text-lg font-bold text-gray-900 mt-1">{stats.completed_trips || 0}</P>
              </Div>
              <Div className="border border-gray-100 bg-gray-50/50 rounded-xl p-3">
                <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cancelled Trips</P>
                <P className="text-lg font-bold text-gray-900 mt-1">{stats.cancelled_trips || 0}</P>
              </Div>
            </Div>
          </Div>
        </>
      )}
    </ScrollDiv>
  );
};
export default DriverDetails;
const buildLinePoints = (values, width, height, padding = 16) => {
  if (!values.length) return '';
  const maxValue = Math.max(...values, 1);
  const stepX = (width - padding * 2) / (values.length - 1 || 1);
  return values
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = height - padding - (Number(value) / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
};
const ChartGrid = ({ height = 180 }) => (
  <Svg viewBox={`0 0 400 ${height}`} width="100%" height="100%">
    {[0, 1, 2, 3].map((i) => (
      <Line key={i} x1="24" x2="376" y1={24 + i * ((height - 48) / 3)} y2={24 + i * ((height - 48) / 3)} stroke="#e5e7eb" strokeDasharray="4 4" />
    ))}
  </Svg>
);
