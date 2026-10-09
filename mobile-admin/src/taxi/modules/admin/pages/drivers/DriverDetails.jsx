/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverDetails.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { GMap, VehicleMarker, toLatLng } from '../../../../../components/maps';
import { useWindowDimensions } from 'react-native';
import { ArrowLeft, CircleUserRound, Eye, PencilLine, Mail, MapPin, Phone, CheckCircle2 } from 'lucide-react-native';
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
import { Button, Div, HScroll, Img, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorState,
  Field,
  useLayoutWidth,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
import { Line, Polyline as SvgPolyline, Svg } from 'react-native-svg';
import { window } from '../../../../../lib/webShim';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
/* The web's `absolute inset-0 w-full h-full` on the chart <svg>. */
const CHART_OVERLAY_STYLE = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
const REQUEST_COLS = [110, 160, 160, 160, 130, 80, 150];
const WALLET_COLS = [160, 140, 110, 220];
const WITHDRAWAL_COLS = [160, 170, 140, 150, 130, 90];
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
  const { tablet } = useLayoutWidth();
  const { width: windowWidth } = useWindowDimensions();
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
  const chartWidth = Math.max(260, windowWidth - 64);
  const breadcrumb = [{ label: 'Drivers' }, { label: 'Driver profile' }];
  const backButton = (
    <Button onClick={() => navigate(backRoute)} className={BTN_SECONDARY}>
      <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
      <Span className={BTN_TEXT_SECONDARY}>Back</Span>
    </Button>
  );
  if (isLoading) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader icon={CircleUserRound} title="Driver profile" breadcrumb={breadcrumb} />
        <LoadingState label="Loading driver profile…" />
      </AdminPage>
    );
  }
  if (error || !profile) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader icon={CircleUserRound} title="Driver profile" breadcrumb={breadcrumb} actions={backButton} />
        {error ? (
          <ErrorState message={error} onRetry={fetchProfile} />
        ) : (
          <EmptyState icon={CircleUserRound} title="Driver not found" message="This driver record no longer exists." actionLabel="Go back" onAction={() => navigate(-1)} />
        )}
      </AdminPage>
    );
  }
  const driverCode =
    profile.driver_code ||
    profile.referralCode ||
    (profile.phone
      ? `DRV${String(profile.phone).slice(-4)}${String(profile._id || profile.id || '')
          .slice(-6)
          .toUpperCase()}`.replace(/\W/g, '')
      : 'N/A');
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader icon={CircleUserRound} title="Driver profile" subtitle={`${profile.name || 'Driver'} · ${driverCode}`} breadcrumb={breadcrumb} actions={backButton} />

      <Card className="mb-4">
        <Div className={`gap-4 ${tablet ? 'flex-row items-center' : 'flex-col'}`}>
          <Div className="flex-1 flex-row items-center gap-3">
            <Div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200 items-center justify-center">
              {profileImage && !avatarFailed ? (
                <Img src={profileImage} alt={profile.name} className="w-full h-full" contentFit="cover" onError={() => setAvatarFailed(true)} />
              ) : (
                <UiIcon as={CircleUserRound} size={32} strokeWidth={1.75} className="text-slate-400" />
              )}
            </Div>
            <Div className="flex-1 min-w-0">
              <P className="text-base font-semibold text-slate-900" numberOfLines={1}>
                {profile.name}
              </P>
              <P className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                {driverCode}
              </P>
              <Div className="flex-row flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <Div className="flex-row items-center gap-1">
                  <UiIcon as={Phone} size={12} className="text-slate-400" />
                  <Span className="text-xs text-slate-500">{profile.phone || profile.mobile || 'N/A'}</Span>
                </Div>
                <Div className="flex-row items-center gap-1">
                  <UiIcon as={Mail} size={12} className="text-slate-400" />
                  <Span className="text-xs text-slate-500">{profile.email || 'N/A'}</Span>
                </Div>
                <Div className="flex-row items-center gap-1">
                  <UiIcon as={MapPin} size={12} className="text-slate-400" />
                  <Span className="text-xs text-slate-500">{profile.city || 'India'}</Span>
                </Div>
              </Div>
            </Div>
          </Div>
          <Div className="flex-row items-center gap-3">
            <Div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
              <Img src={profile.vehicle_image || ''} alt="Vehicle" className="w-full h-full" contentFit="cover" />
            </Div>
            <Div className="flex-1 min-w-0">
              <P className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                {profile.vehicle?.type || 'Vehicle'}
              </P>
              <P className="text-xs text-slate-500" numberOfLines={1}>
                {profile.vehicle?.make} {profile.vehicle?.model}
              </P>
            </Div>
          </Div>
        </Div>

        <Div className="mt-4 flex-row flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <StatusBadge status={profile.isOnline ? 'online' : 'offline'} label={profile.isOnline ? 'Driver online' : 'Driver offline'} />
          {onlineSelfieImage ? (
            <Div className="flex-row items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Img src={onlineSelfieImage} alt={`${profile.name} online selfie`} className="h-12 w-12 rounded-lg border border-slate-200 bg-white" contentFit="cover" />
              <Div className="flex-1 min-w-0">
                <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Daily online selfie</P>
                <P className="text-sm text-slate-700" numberOfLines={2}>
                  {profile?.online_selfie?.forDate || 'Latest check-in'}
                </P>
              </Div>
            </Div>
          ) : null}
        </Div>
      </Card>

      <HScroll className="mb-4" contentClassName="flex-row gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-11 justify-center px-4 rounded-full ${activeTab === tab ? 'bg-blue-600' : 'bg-white border border-slate-200'}`}
          >
            <Span className={`text-sm font-semibold ${activeTab === tab ? 'text-white' : 'text-slate-600'}`}>{tab}</Span>
          </Button>
        ))}
      </HScroll>

      {activeTab !== 'Driver Profile' ? (
        <>
          {activeTab === 'Request List' && (
            <Div>
              <StatGrid className="mb-4">
                <StatCard label="Completed rides" value={stats.completed_trips || 0} tone="success" />
                <StatCard label="Acceptance rate" value={`${acceptanceRate}%`} tone="info" />
                <StatCard label="Cancellation rate" value={`${cancellationRate}%`} tone="warning" />
                <StatCard label="Cancelled rides" value={stats.cancelled_trips || 0} tone="danger" />
              </StatGrid>

              {requests.length === 0 ? (
                <EmptyState title="No ride requests" message="This driver has not been offered any rides yet." />
              ) : (
                <DataTable cols={REQUEST_COLS}>
                  <THead cols={REQUEST_COLS} labels={['Request id', 'Date', 'User', 'Driver', 'Trip status', 'Paid', 'Payment option']} />
                  <TBody>
                    {requests.map((item, index) => (
                      <Row key={item.request_id} last={index === requests.length - 1}>
                        <Cell width={REQUEST_COLS[0]}>{item.request_id.slice(-8).toUpperCase()}</Cell>
                        <Cell width={REQUEST_COLS[1]}>{item.date ? new Date(item.date).toLocaleString('en-IN') : 'N/A'}</Cell>
                        <Cell width={REQUEST_COLS[2]}>{item.user_name}</Cell>
                        <Cell width={REQUEST_COLS[3]}>{item.driver_name}</Cell>
                        <Cell width={REQUEST_COLS[4]}>
                          <StatusBadge status={item.trip_status} label={toTitleCase(item.trip_status)} />
                        </Cell>
                        <Cell width={REQUEST_COLS[5]}>{item.paid ? 'Yes' : 'No'}</Cell>
                        <Cell width={REQUEST_COLS[6]}>{toTitleCase(item.payment_option)}</Cell>
                      </Row>
                    ))}
                  </TBody>
                </DataTable>
              )}
            </Div>
          )}

          {activeTab === 'Payment History' && (
            <Div>
              <StatGrid className="mb-4">
                <StatCard label="Total credited" value={`₹ ${wallet.total_credits || 0}`} tone="success" />
                <StatCard label="Total debited" value={`₹ ${wallet.total_debits || 0}`} tone="danger" />
                <StatCard label="Available balance" value={`₹ ${wallet.balance || 0}`} tone="info" />
              </StatGrid>

              <Card className="mb-4">
                <SectionTitle>Credit or debit wallet</SectionTitle>
                <Div className={tablet ? 'flex-row flex-wrap -mx-1.5' : 'gap-4'}>
                  <Field label="Amount" required className={tablet ? 'w-1/2 px-1.5 mb-4' : 'w-full'}>
                    <Input
                      type="number"
                      min="0"
                      className={INPUT}
                      placeholder="Enter amount"
                      value={walletForm.amount}
                      onChange={(e) =>
                        setWalletForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Operation" required className={tablet ? 'w-1/2 px-1.5 mb-4' : 'w-full'}>
                    <Select
                      className={INPUT}
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
                  </Field>
                </Div>
                <Div className="mt-1">
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
                    className={`${BTN_PRIMARY} self-start ${walletForm.isSubmitting || !walletForm.amount ? 'opacity-50' : ''}`}
                  >
                    <Span className={BTN_TEXT_PRIMARY}>{walletForm.isSubmitting ? 'Saving…' : 'Submit'}</Span>
                  </Button>
                </Div>
              </Card>

              <SectionTitle>Wallet transactions</SectionTitle>
              {walletHistory.length === 0 ? (
                <EmptyState title="No wallet transactions" message="Credits and debits on this driver's wallet will be listed here." />
              ) : (
                <DataTable cols={WALLET_COLS}>
                  <THead cols={WALLET_COLS} labels={['Date', 'Type', 'Amount', 'Description']} />
                  <TBody>
                    {walletHistory.map((item, index) => (
                      <Row key={item._id} last={index === walletHistory.length - 1}>
                        <Cell width={WALLET_COLS[0]}>{item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : 'N/A'}</Cell>
                        <Cell width={WALLET_COLS[1]}>{toTitleCase(String(item.type || '').replace(/_/g, ' ')) || 'N/A'}</Cell>
                        <Cell width={WALLET_COLS[2]} align="right">
                          <Span className={`text-sm font-semibold ${Number(item.amount || 0) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                            ₹ {Math.abs(Number(item.amount || 0))}
                          </Span>
                        </Cell>
                        <Cell width={WALLET_COLS[3]}>{item.description || '-'}</Cell>
                      </Row>
                    ))}
                  </TBody>
                </DataTable>
              )}
            </Div>
          )}

          {activeTab === 'Withdrawal History' &&
            (withdrawals.length === 0 ? (
              <EmptyState title="No withdrawal requests" message="Withdrawal requests raised by this driver will appear here." />
            ) : (
              <DataTable cols={WITHDRAWAL_COLS}>
                <THead cols={WITHDRAWAL_COLS} labels={['Date', 'Name', 'Mobile', 'Requested amount', 'Status', 'Action']} />
                <TBody>
                  {withdrawals.map((item, index) => (
                    <Row key={item._id} last={index === withdrawals.length - 1}>
                      <Cell width={WITHDRAWAL_COLS[0]}>{item.date ? new Date(item.date).toLocaleString('en-IN') : 'N/A'}</Cell>
                      <Cell width={WITHDRAWAL_COLS[1]}>{item.name}</Cell>
                      <Cell width={WITHDRAWAL_COLS[2]}>{item.mobile}</Cell>
                      <Cell width={WITHDRAWAL_COLS[3]} align="right">{`₹ ${item.requested_amount}`}</Cell>
                      <Cell width={WITHDRAWAL_COLS[4]}>
                        <StatusBadge status={item.status} label={toTitleCase(item.status)} />
                      </Cell>
                      <Cell width={WITHDRAWAL_COLS[5]}>-</Cell>
                    </Row>
                  ))}
                </TBody>
              </DataTable>
            ))}

          {activeTab === 'Review History' && <EmptyState title="No reviews yet" message="Rider reviews for this driver will be listed here." />}

          {activeTab === 'Documents' && (
            <Div>
              <Card className="mb-4">
                <SectionTitle
                  action={
                    <Button
                      type="button"
                      onClick={() =>
                        navigate(`/taxi/admin/drivers/edit/${id}`, {
                          state: {
                            from: location.pathname + location.search,
                          },
                        })
                      }
                      className={BTN_SECONDARY}
                    >
                      <UiIcon as={PencilLine} size={15} className="text-slate-700" />
                      <Span className={BTN_TEXT_SECONDARY}>Edit fields</Span>
                    </Button>
                  }
                >
                  Vehicle onboarding details
                </SectionTitle>
                <P className="text-sm text-slate-500 mb-3">These values mirror the fields collected from the driver on the vehicle setup step.</P>
                <Div className={tablet ? 'flex-row flex-wrap -mx-1.5' : 'gap-3'}>
                  {vehicleFieldSummary.map((item) => (
                    <Div key={item.label} className={tablet ? 'w-1/2 px-1.5 mb-3' : 'w-full'}>
                      <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</P>
                        <P className="mt-1.5 text-sm font-medium text-slate-900">{item.value || 'Not set'}</P>
                      </Div>
                    </Div>
                  ))}
                </Div>
              </Card>

              {documents.length === 0 ? (
                <EmptyState title="No documents uploaded" message="This driver has not uploaded any KYC documents yet." />
              ) : (
                <Div className="gap-4">
                  {documents.map((doc, idx) => (
                    <Card key={`${doc.name}-${idx}`} className="gap-3">
                      <Div className="flex-row flex-wrap items-center gap-2">
                        <Span className="text-base font-semibold text-slate-900 flex-1">{toTitleCase(doc.verificationLabel || doc.name)}</Span>
                        <StatusBadge
                          status={doc.status || 'pending'}
                          label={toTitleCase(doc.status || 'Pending')}
                          icon={String(doc.status || '').toLowerCase() === 'approved' ? CheckCircle2 : undefined}
                        />
                      </Div>

                      <Div className={tablet ? 'flex-row flex-wrap -mx-1.5' : 'gap-4'}>
                        <Div className={tablet ? 'w-1/2 px-1.5 mb-4' : 'w-full'}>
                          <P className="text-sm font-semibold text-slate-900 mb-2">Document details</P>
                          <Div className="gap-2">
                            <Div className="flex-row justify-between gap-3 border-b border-slate-100 pb-2">
                              <Span className="text-sm text-slate-500">Identify number</Span>
                              <Span className="text-sm font-medium text-slate-900">{doc.identify_number || '-'}</Span>
                            </Div>
                            <Div className="flex-row justify-between gap-3 border-b border-slate-100 pb-2">
                              <Span className="text-sm text-slate-500">Expiry date</Span>
                              <Span className="text-sm font-medium text-slate-900">{doc.expiry_date || '-'}</Span>
                            </Div>
                            {doc.isReuploaded && <StatusBadge tone="info" label="Re-uploaded for review" />}

                            {doc.providerMessage && (
                              <Div className="mt-2 flex-row items-start gap-2">
                                <UiIcon as={CheckCircle2} size={16} className="text-green-700 mt-0.5" />
                                <Div className="flex-1">
                                  <P className="text-sm font-medium text-slate-900">{doc.providerMessage}</P>
                                  {doc.verifiedAt && <P className="text-xs text-slate-500 mt-0.5">Checked: {formatDateTime(doc.verifiedAt)}</P>}
                                </Div>
                              </Div>
                            )}

                            {['rejected', 'declined'].includes(String(doc.status || '').toLowerCase()) && doc.comment && (
                              <P className="mt-2 text-sm text-red-600">Rejection reason: {doc.comment}</P>
                            )}
                            {!['rejected', 'declined'].includes(String(doc.status || '').toLowerCase()) && doc.comment && (
                              <P className="mt-2 text-sm text-slate-700">Comment: {doc.comment}</P>
                            )}
                          </Div>
                        </Div>

                        <Div className={tablet ? 'w-1/2 px-1.5 mb-4' : 'w-full'}>
                          <P className="text-sm font-semibold text-slate-900 mb-2">Verification details</P>
                          <Div className="gap-2">
                            {doc.verificationFacts?.map((fact) => (
                              <Div key={`${doc.sourceKey}-${fact.label}`} className="flex-row justify-between gap-3 border-b border-slate-100 pb-2">
                                <Span className="text-sm text-slate-500 flex-1">{toSentenceCase(fact.label)}</Span>
                                <Span className="text-sm font-medium text-slate-900 text-right flex-1">{toTitleCase(toDisplayValue(fact.value)) || '-'}</Span>
                              </Div>
                            ))}
                            {doc.rcChecks?.map((check) => (
                              <Div key={`${doc.sourceKey}-${check.label}`} className="flex-row justify-between gap-3 border-b border-slate-100 pb-2">
                                <Span className="text-sm text-slate-500 flex-1">{toSentenceCase(check.label)}</Span>
                                <Span className="text-sm font-medium text-slate-900 text-right flex-1">{toTitleCase(toDisplayValue(check.value)) || '-'}</Span>
                              </Div>
                            ))}
                            {doc.verificationReferenceId && (
                              <Div className="flex-row justify-between gap-3 border-b border-slate-100 pb-2">
                                <Span className="text-sm text-slate-500 flex-1">Verification reference</Span>
                                <Span className="text-sm font-medium text-slate-900 text-right flex-1">{doc.verificationReferenceId}</Span>
                              </Div>
                            )}
                            {!doc.verificationFacts?.length && !doc.rcChecks?.length && !doc.verificationReferenceId && (
                              <P className="text-sm text-slate-400">No verification data available</P>
                            )}
                          </Div>
                        </Div>

                        <Div className={tablet ? 'w-full px-1.5' : 'w-full'}>
                          <P className="text-sm font-semibold text-slate-900 mb-2">Activity</P>
                          <Div className="gap-2">
                            {doc.uploadedAt && (
                              <Div className="flex-row items-center gap-2">
                                <Div className="w-2 h-2 rounded-full bg-green-700" />
                                <Span className="text-sm font-medium text-slate-900">Uploaded</Span>
                                <Span className="text-xs text-slate-500">{formatDateTime(doc.uploadedAt)}</Span>
                              </Div>
                            )}
                            {doc.verifiedAt && (
                              <Div className="flex-row items-center gap-2">
                                <Div className="w-2 h-2 rounded-full bg-green-700" />
                                <Span className="text-sm font-medium text-slate-900">API verified</Span>
                                <Span className="text-xs text-slate-500">{formatDateTime(doc.verifiedAt)}</Span>
                              </Div>
                            )}
                            {doc.reviewedAt && (
                              <Div className="flex-row items-center gap-2">
                                <Div className="w-2 h-2 rounded-full bg-green-700" />
                                <Span className="text-sm font-medium text-slate-900">Reviewed</Span>
                                <Span className="text-xs text-slate-500">{formatDateTime(doc.reviewedAt)}</Span>
                              </Div>
                            )}
                            {!doc.uploadedAt && !doc.verifiedAt && !doc.reviewedAt && <P className="text-sm text-slate-400">No activity logged.</P>}
                          </Div>

                          <Div className="mt-4 pt-3 border-t border-slate-100 flex-row flex-wrap gap-2">
                            <Button
                              type="button"
                              onClick={() => doc.images?.length && window.open(doc.images[0], '_blank', 'noopener,noreferrer')}
                              disabled={!doc.images?.length}
                              className={`${BTN_SECONDARY} flex-1 ${!doc.images?.length ? 'opacity-50' : ''}`}
                            >
                              <UiIcon as={Eye} size={15} className="text-slate-700" />
                              <Span className={BTN_TEXT_SECONDARY}>View doc</Span>
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
                              className={`${BTN_SECONDARY} flex-1 ${documentActionKey.length > 0 || !doc.images?.length || String(doc.status || '').toLowerCase() === 'approved' ? 'opacity-50' : ''}`}
                            >
                              <Span className="text-sm font-semibold text-green-700">
                                {documentActionKey === `${doc.sourceKey}:approve` ? 'Approving…' : 'Approve'}
                              </Span>
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
                              className={`${BTN_SECONDARY} flex-1 ${documentActionKey.length > 0 || !doc.images?.length || ['rejected', 'declined'].includes(String(doc.status || '').toLowerCase()) ? 'opacity-50' : ''}`}
                            >
                              <Span className="text-sm font-semibold text-red-600">{documentActionKey === `${doc.sourceKey}:reject` ? 'Declining…' : 'Decline'}</Span>
                            </Button>
                          </Div>
                        </Div>
                      </Div>
                    </Card>
                  ))}
                </Div>
              )}
            </Div>
          )}
        </>
      ) : (
        <>
          <SectionTitle>Wallet overview</SectionTitle>
          <StatGrid className="mb-4">
            <StatCard label="Wallet balance" value={`₹ ${wallet.balance || 0}`} tone="info" />
            <StatCard label="Cash limit" value={`₹ ${wallet.cash_limit || 0}`} tone="neutral" />
            <StatCard label="Total credited" value={`₹ ${wallet.total_credits || 0}`} tone="success" />
            <StatCard label="Total debited" value={`₹ ${wallet.total_debits || 0}`} tone="danger" />
            <StatCard label="Wallet status" value={wallet.is_blocked ? 'Blocked' : 'Active'} tone={wallet.is_blocked ? 'danger' : 'success'} />
          </StatGrid>

          <Div className={`gap-4 mb-4 ${tablet ? 'flex-row items-start' : 'flex-col'}`}>
            <Card className={tablet ? 'flex-1' : ''}>
              <SectionTitle>Driver location</SectionTitle>
              <Div className="h-72 rounded-lg overflow-hidden border border-slate-200">
                {loadError ? (
                  <Div className="h-full items-center justify-center bg-slate-50">
                    <P className="text-sm text-slate-500">Map unavailable.</P>
                  </Div>
                ) : !profile?.location ? (
                  <Div className="h-full items-center justify-center bg-slate-50 px-4">
                    <P className="text-sm text-slate-500 text-center">Live driver location is not available yet.</P>
                  </Div>
                ) : shouldLoadMap && HAS_VALID_GOOGLE_MAPS_KEY && isLoaded ? (
                  <GMap className="w-full h-full" initialRegion={{ ...toLatLng(mapCenter), latitudeDelta: 0.05, longitudeDelta: 0.05 }} zoomControlEnabled>
                    <VehicleMarker coordinate={toLatLng(mapCenter)} icon={vehicleMarkerIcon} />
                  </GMap>
                ) : (
                  <Div className="h-full items-center justify-center bg-slate-50 px-4">
                    <P className="text-sm text-slate-500 text-center">
                      {HAS_VALID_GOOGLE_MAPS_KEY ? 'Loading map…' : 'Configure `VITE_GOOGLE_MAPS_API_KEY` to show map.'}
                    </P>
                  </Div>
                )}
              </Div>
              <Div className="mt-3 flex-row flex-wrap items-center justify-between gap-2">
                <Span className="text-xs text-slate-500">{profile?.vehicle?.type || 'Vehicle'} marker</Span>
                {profile?.location ? (
                  <Span className="text-xs text-slate-500">
                    {Number(profile.location.lat).toFixed(4)}, {Number(profile.location.lng).toFixed(4)}
                  </Span>
                ) : null}
              </Div>
            </Card>

            <Card className={tablet ? 'flex-1' : ''}>
              <SectionTitle>Earnings</SectionTitle>
              <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Div className="h-44">
                  <ChartGrid height={170} width={chartWidth} />
                  <Svg viewBox="0 0 400 170" width={chartWidth} height="100%" style={CHART_OVERLAY_STYLE}>
                    <SvgPolyline fill="none" stroke="#008236" strokeWidth="2.5" points={buildLinePoints(chart.earnings || [], 400, 170)} />
                  </Svg>
                </Div>
                <Div className="mt-3 flex-row justify-between">
                  {(chart.months || []).map((m) => (
                    <Span key={m} className="text-xs text-slate-500">
                      {m}
                    </Span>
                  ))}
                </Div>
              </Div>
              <Div className="gap-3 mt-4">
                <Div className="flex-row flex-wrap -mx-1.5">
                  {[
                    { label: 'Today earnings', value: earnings.today_earnings || 0 },
                    { label: 'Admin commission', value: earnings.admin_commission || 0 },
                    { label: 'Drivers earnings', value: earnings.driver_earnings || 0 },
                    { label: 'By cash', value: earnings.by_cash || 0 },
                    { label: 'By wallet', value: earnings.by_wallet || 0 },
                    { label: 'By card / online', value: earnings.by_card || 0 },
                  ].map((item) => (
                    <Div key={item.label} className="w-1/2 px-1.5 mb-3">
                      <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <P className="text-xs font-semibold uppercase tracking-wide text-slate-500" numberOfLines={2}>
                          {item.label}
                        </P>
                        <P className="text-base font-semibold text-slate-900 mt-1">₹ {item.value}</P>
                      </Div>
                    </Div>
                  ))}
                </Div>
              </Div>
            </Card>
          </Div>

          <Card>
            <SectionTitle>Trips</SectionTitle>
            <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Div className="h-44">
                <ChartGrid height={170} width={chartWidth} />
                <Svg viewBox="0 0 400 170" width={chartWidth} height="100%" style={CHART_OVERLAY_STYLE}>
                  <SvgPolyline fill="none" stroke="#008236" strokeWidth="2.5" points={buildLinePoints(chart.trips?.completed || [], 400, 170)} />
                  <SvgPolyline fill="none" stroke="#BB4D00" strokeWidth="2.5" points={buildLinePoints(chart.trips?.cancelled || [], 400, 170)} />
                </Svg>
              </Div>
              <Div className="mt-3 flex-row justify-between">
                {(chart.months || []).map((m) => (
                  <Span key={m} className="text-xs text-slate-500">
                    {m}
                  </Span>
                ))}
              </Div>
              <Div className="mt-3 flex-row items-center gap-4">
                <Div className="flex-row items-center gap-1.5">
                  <Div className="w-2 h-2 rounded-full bg-green-700" />
                  <Span className="text-xs text-slate-500">Completed</Span>
                </Div>
                <Div className="flex-row items-center gap-1.5">
                  <Div className="w-2 h-2 rounded-full bg-amber-700" />
                  <Span className="text-xs text-slate-500">Cancelled</Span>
                </Div>
              </Div>
            </Div>
            <Div className="flex-row gap-3 mt-4">
              <Div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed trips</P>
                <P className="text-base font-semibold text-slate-900 mt-1">{stats.completed_trips || 0}</P>
              </Div>
              <Div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cancelled trips</P>
                <P className="text-base font-semibold text-slate-900 mt-1">{stats.cancelled_trips || 0}</P>
              </Div>
            </Div>
          </Card>
        </>
      )}
    </AdminPage>
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
const ChartGrid = ({ height = 180, width = '100%' }) => (
  <Svg viewBox={`0 0 400 ${height}`} width={width} height="100%">
    {[0, 1, 2, 3].map((i) => (
      <Line key={i} x1="24" x2="376" y1={24 + i * ((height - 48) / 3)} y2={24 + i * ((height - 48) / 3)} stroke="#E2E8F0" strokeDasharray="4 4" />
    ))}
  </Svg>
);
