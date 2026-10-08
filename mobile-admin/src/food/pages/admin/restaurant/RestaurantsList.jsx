/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantsList.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from '../../../../lib/webRouter';
import {
  Search,
  Download,
  ChevronDown,
  Eye,
  Settings,
  ArrowUpDown,
  Loader2,
  X,
  Star,
  Building2,
  User,
  FileText,
  CreditCard,
  Image as ImageIcon,
  ExternalLink,
  ShieldX,
  AlertTriangle,
  Trash2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Utensils,
  UtensilsCrossed,
  Store,
} from 'lucide-react-native';
import { adminAPI, restaurantAPI, uploadAPI } from '../../../../api/food';
import { clearModuleAuth } from '../../../../admin/session';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { exportRestaurantsToPDF } from '../../../components/admin/restaurants/restaurantsExportUtils';
import { formatRestaurantDisplayAddress, getRestaurantDisplayAddress } from '../../../utils/restaurantLocation';

// Import icons from Dashboard-icons
import { A, Button as HButton, Div, H2, H3, H4, H5, Img, Input, Label, Option, Overlay, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  DataTable,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  LoadingState,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { alert } from '../../../../lib/webShim';
import { objectUrl, pickImage } from '../../../../lib/files';
import PlacesSearchInput from './PlacesSearchInput';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};

// Inline placeholder (no external request, avoids referrer policy / 500 from via.placeholder)
const PLACEHOLDER_40 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23e2e8f0' width='40' height='40'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='12' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";
const PLACEHOLDER_128 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect fill='%23e2e8f0' width='128' height='128'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='32' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";
// The web hides a broken photo with onError -> style.display = 'none'.
function HideOnErrorImg(props) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <Img {...props} onError={() => setFailed(true)} />;
}
const normalizeApprovalStatus = (restaurant) => {
  const raw = String(restaurant?.status || '')
    .trim()
    .toLowerCase();
  if (raw === 'approved' || raw === 'pending' || raw === 'rejected' || raw === 'banned') return raw;
  return 'pending';
};
const approvalStatusLabel = (status) => {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'banned') return 'Banned';
  return 'Pending';
};
const normalizeTimeValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const h = Number(hhmm[1]);
    const m = Number(hhmm[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return '';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2]);
    const p = ampm[3].toUpperCase();
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 1 || h > 12 || m < 0 || m > 59) return '';
    if (p === 'AM') h = h === 12 ? 0 : h;
    if (p === 'PM') h = h === 12 ? 12 : h + 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
  }
  return '';
};
const timeToMinutes = (value) => {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return null;
  const [h, m] = normalized.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};
const formatTime12Hour = (value) => {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return value || 'N/A';
  const [h, m] = normalized.split(':').map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};
const normalizeImageUrl = (image) => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  if (typeof image === 'object') return image.url || image.secure_url || '';
  return '';
};
const getPrimaryRestaurantImage = (restaurant, fallback = '') => {
  const coverImages = Array.isArray(restaurant?.coverImages) ? restaurant.coverImages : [];
  const firstCoverImage = coverImages.map(normalizeImageUrl).find(Boolean);
  if (firstCoverImage) return firstCoverImage;
  const menuImages = Array.isArray(restaurant?.menuImages) ? restaurant.menuImages : [];
  const firstMenuImage = menuImages.map(normalizeImageUrl).find(Boolean);
  if (firstMenuImage) return firstMenuImage;
  return normalizeImageUrl(restaurant?.profileImage) || normalizeImageUrl(restaurant?.logo) || normalizeImageUrl(restaurant?.restaurantImage) || fallback;
};
export default function RestaurantsList() {
  const { columns } = useLayoutWidth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [bannedRestaurants, setBannedRestaurants] = useState([]);
  const [rejectedRestaurants, setRejectedRestaurants] = useState([]);
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'banned'
  const [bannedCount, setBannedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [banConfirmDialog, setBanConfirmDialog] = useState(null); // { restaurant, action: 'ban' | 'unban' }
  const [banning, setBanning] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(null); // { restaurant }
  const [deleting, setDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc',
  });
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    name: '',
    pureVegRestaurant: false,
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    primaryContactNumber: '',
    email: '',
    estimatedDeliveryTime: '',
    openingTime: '',
    closingTime: '',
    isActive: true,
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationEditError, setLocationEditError] = useState('');
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [locationForm, setLocationForm] = useState({
    zoneId: '',
    latitude: '',
    longitude: '',
    formattedAddress: '',
    addressLine1: '',
    addressLine2: '',
    area: '',
    city: '',
    state: '',
    landmark: '',
    pincode: '',
  });

  // Format Restaurant ID to REST format (e.g., REST422829)
  const formatRestaurantId = (id) => {
    if (!id) return 'REST000000';
    const idString = String(id);
    // Extract last 6 digits from the ID
    // Handle formats like "REST-1768045396242-2829" or "1768045396242-2829"
    const parts = idString.split(/[-.]/);
    let lastDigits = '';

    // Get the last part and extract digits
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      // Extract only digits from the last part
      const digits = lastPart.match(/\d+/g);
      if (digits && digits.length > 0) {
        // Get last 6 digits from all digits found
        const allDigits = digits.join('');
        lastDigits = allDigits.slice(-6).padStart(6, '0');
      } else {
        // If no digits in last part, look for digits in all parts
        const allParts = parts.join('');
        const allDigits = allParts.match(/\d+/g);
        if (allDigits && allDigits.length > 0) {
          const combinedDigits = allDigits.join('');
          lastDigits = combinedDigits.slice(-6).padStart(6, '0');
        }
      }
    }

    // If no digits found, use a hash of the ID
    if (!lastDigits) {
      const hash = idString.split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
      }, 0);
      lastDigits = Math.abs(hash).toString().slice(-6).padStart(6, '0');
    }
    return `REST${lastDigits}`;
  };

  // Fetch restaurants from backend API
  useEffect(() => {
    let cancelled = false;
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);
        const zoneLabelFromRestaurant = (restaurant) => {
          const zid = restaurant?.zoneId;
          const zoneName = (typeof zid === 'object' ? zid?.name || zid?.zoneName : '') || '';
          if (zoneName) return zoneName;
          const zoneIdString = typeof zid === 'string' ? zid : zid?._id || zid?.id || '';
          if (zoneIdString && Array.isArray(zones) && zones.length > 0) {
            const match = zones.find((z) => (z?._id || z?.id) === zoneIdString);
            const label = match?.name || match?.zoneName;
            if (label) return label;
          }
          return restaurant?.zone || restaurant?.location?.area || restaurant?.location?.city || restaurant?.area || restaurant?.city || 'N/A';
        };
        const extractRestaurantPayload = (apiResponse) => {
          const body = apiResponse?.data;
          const data = body?.data;
          const list = Array.isArray(data?.restaurants)
            ? data.restaurants
            : Array.isArray(data)
              ? data
              : Array.isArray(body?.restaurants)
                ? body.restaurants
                : [];
          const total = Number(data?.total ?? body?.total ?? list.length) || list.length;
          return {
            list,
            total,
            body,
          };
        };

        // APIs are paginated — pull a large page so list/stats are not truncated
        const [response, bannedResponse, pendingResponse, rejectedOnlyResponse] = await Promise.all([
          adminAPI.getApprovedRestaurants({
            status: 'approved',
            limit: 1000,
            page: 1,
          }),
          adminAPI
            .getApprovedRestaurants({
              status: 'banned',
              limit: 1000,
              page: 1,
            })
            .catch(() => null),
          adminAPI
            .getPendingRestaurants({
              limit: 1000,
              page: 1,
            })
            .catch(() => null),
          adminAPI
            .getApprovedRestaurants({
              status: 'rejected',
              limit: 1000,
              page: 1,
            })
            .catch(() => null),
        ]);
        if (cancelled) return;
        let mappedBanned = [];
        let bannedCnt = 0;
        if (bannedResponse?.data) {
          const { list: bannedList, total } = extractRestaurantPayload(bannedResponse);
          bannedCnt = total;
          mappedBanned = bannedList.map((restaurant, index) => ({
            id: restaurant._id || restaurant.id || index + 1,
            _id: restaurant._id,
            name: restaurant.name || restaurant.restaurantName || 'N/A',
            ownerName: restaurant.ownerName || 'N/A',
            ownerPhone: restaurant.ownerPhone || restaurant.phone || 'N/A',
            zone: zoneLabelFromRestaurant(restaurant),
            approvalStatus: 'banned',
            isActive: false,
            rating: restaurant.ratings?.average || restaurant.rating || 0,
            logo: getPrimaryRestaurantImage(restaurant, PLACEHOLDER_40),
            originalData: restaurant,
          }));
        }
        if (!cancelled) {
          setBannedCount(bannedCnt);
          setBannedRestaurants(mappedBanned);
        }
        let pendingCnt = 0;
        let rejectedCnt = 0;
        let mappedRejectedList = [];
        if (pendingResponse?.data) {
          const { list } = extractRestaurantPayload(pendingResponse);
          pendingCnt = list.filter((r) => String(r.status || '').toLowerCase() === 'pending').length;
        }
        if (rejectedOnlyResponse?.data) {
          const { list: rawRejected, total } = extractRestaurantPayload(rejectedOnlyResponse);
          rejectedCnt = total;
          mappedRejectedList = rawRejected.map((restaurant, index) => ({
            id: restaurant._id || restaurant.id || index + 1,
            _id: restaurant._id,
            name: restaurant.restaurantName || restaurant.name || 'N/A',
            ownerName: restaurant.ownerName || 'N/A',
            ownerPhone: restaurant.ownerPhone || restaurant.phone || 'N/A',
            zone: restaurant.zone || zoneLabelFromRestaurant(restaurant),
            approvalStatus: 'rejected',
            isActive: false,
            rating: restaurant.ratings?.average || restaurant.rating || 0,
            logo: getPrimaryRestaurantImage(restaurant, PLACEHOLDER_40),
            originalData: restaurant,
          }));
        } else if (pendingResponse?.data) {
          const { list } = extractRestaurantPayload(pendingResponse);
          const rawRejected = list.filter((r) => String(r.status || '').toLowerCase() === 'rejected');
          rejectedCnt = rawRejected.length;
          mappedRejectedList = rawRejected.map((restaurant, index) => ({
            id: restaurant._id || restaurant.id || index + 1,
            _id: restaurant._id,
            name: restaurant.restaurantName || restaurant.name || 'N/A',
            ownerName: restaurant.ownerName || 'N/A',
            ownerPhone: restaurant.ownerPhone || restaurant.phone || 'N/A',
            zone: restaurant.zone || zoneLabelFromRestaurant(restaurant),
            approvalStatus: 'rejected',
            isActive: false,
            rating: restaurant.ratings?.average || restaurant.rating || 0,
            logo: getPrimaryRestaurantImage(restaurant, PLACEHOLDER_40),
            originalData: restaurant,
          }));
        }
        if (!cancelled) {
          setPendingCount(pendingCnt);
          setRejectedCount(rejectedCnt);
          setRejectedRestaurants(mappedRejectedList);
        }
        const { list: rawList, body } = extractRestaurantPayload(response);
        if (rawList.length > 0 || body?.success === true) {
          const mappedRestaurants = rawList.map((restaurant, index) => ({
            id: restaurant._id || restaurant.id || index + 1,
            _id: restaurant._id,
            name: restaurant.name || restaurant.restaurantName || 'N/A',
            ownerName: restaurant.ownerName || 'N/A',
            ownerPhone: restaurant.ownerPhone || restaurant.phone || 'N/A',
            zone: zoneLabelFromRestaurant(restaurant),
            approvalStatus: normalizeApprovalStatus(restaurant),
            isActive: restaurant.isActive !== false,
            rating: restaurant.ratings?.average || restaurant.rating || 0,
            logo: getPrimaryRestaurantImage(restaurant, PLACEHOLDER_40),
            originalData: restaurant,
          }));
          if (!cancelled) setRestaurants(mappedRestaurants);
        } else {
          if (!cancelled) setRestaurants([]);
        }
      } catch (err) {
        if (cancelled) return;
        debugError('Error fetching restaurants:', err);
        const status = err?.response?.status;
        const serverMessage = err?.response?.data?.message || err?.response?.data?.error;
        if (status === 401) {
          setError(serverMessage || 'Session expired or not logged in. Please log in as admin.');
          setRestaurants([]);
          try {
            clearModuleAuth('admin');
          } catch (_) {}
          navigate('/admin/login', {
            replace: true,
            state: {
              from: '/admin/food/restaurants',
            },
          });
          return;
        }
        setError(serverMessage || err.message || 'Failed to fetch restaurants');
        setRestaurants([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRestaurants();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);
  const [searchParams] = useSearchParams();
  const restaurantIdFromUrl = searchParams.get('restaurantId');
  useEffect(() => {
    if (restaurantIdFromUrl && restaurants.length > 0) {
      const restaurant = restaurants.find((r) => r.id === restaurantIdFromUrl || r._id === restaurantIdFromUrl);
      if (restaurant) {
        handleViewDetails(restaurant);
      }
    }
  }, [restaurantIdFromUrl, restaurants]);
  const [filters, setFilters] = useState({
    all: 'All',
    businessModel: '',
    zone: '',
  });
  const filteredRestaurants = useMemo(() => {
    let result = [];
    if (viewMode === 'active') {
      result = [...restaurants];
    } else if (viewMode === 'banned') {
      result = [...bannedRestaurants];
    } else if (viewMode === 'rejected') {
      result = [...rejectedRestaurants];
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (restaurant) =>
          restaurant.name.toLowerCase().includes(query) || restaurant.ownerName.toLowerCase().includes(query) || restaurant.ownerPhone.includes(query),
      );
    }
    if (filters.all !== 'All') {
      if (filters.all === 'Active') {
        result = result.filter((restaurant) => restaurant.isActive === true);
      } else if (filters.all === 'Inactive') {
        result = result.filter((restaurant) => restaurant.isActive !== true);
      }
    }
    if (filters.zone) {
      result = result.filter((restaurant) => restaurant.zone === filters.zone);
    }

    // Apply Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue, bValue;
        switch (sortConfig.key) {
          case 'sl':
            aValue = restaurants.indexOf(a);
            bValue = restaurants.indexOf(b);
            break;
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'owner':
            aValue = a.ownerName.toLowerCase();
            bValue = b.ownerName.toLowerCase();
            break;
          case 'zone':
            aValue = a.zone.toLowerCase();
            bValue = b.zone.toLowerCase();
            break;
          case 'rating':
            aValue = Number(a.rating) || 0;
            bValue = Number(b.rating) || 0;
            break;
          case 'status':
            aValue = String(a.approvalStatus || '').toLowerCase();
            bValue = String(b.approvalStatus || '').toLowerCase();
            break;
          default:
            return 0;
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [restaurants, bannedRestaurants, rejectedRestaurants, viewMode, searchQuery, filters, sortConfig]);
  const modalRestaurant = restaurantDetails || selectedRestaurant?.originalData || selectedRestaurant;
  const detailsApprovalStatus = modalRestaurant ? normalizeApprovalStatus(modalRestaurant) : 'pending';
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({
      key,
      direction,
    });
  };
  const totalRestaurants = restaurants.length + bannedCount + pendingCount + rejectedCount;
  const activeRestaurants = restaurants.filter((r) => r.isActive === true).length;
  const inactiveRestaurants = restaurants.filter((r) => r.isActive !== true).length;

  // Show full phone number without masking
  const formatPhone = (phone) => {
    if (!phone) return '';
    return phone;
  };
  const getLocationFromRestaurant = (restaurant) => {
    return restaurant?.onboarding?.step1?.location || restaurant?.location || restaurant?.originalData?.location || {};
  };
  const formatLocationAddress = (location = {}, fallback = 'N/A') => {
    return formatRestaurantDisplayAddress(location) || fallback;
  };
  const normalizeLocationFormFromRestaurant = (restaurant) => {
    const loc = getLocationFromRestaurant(restaurant);
    const rawLat = loc.latitude ?? (Array.isArray(loc.coordinates) ? loc.coordinates[1] : '');
    const rawLng = loc.longitude ?? (Array.isArray(loc.coordinates) ? loc.coordinates[0] : '');
    const latNum = typeof rawLat === 'number' ? rawLat : parseFloat(String(rawLat));
    const lngNum = typeof rawLng === 'number' ? rawLng : parseFloat(String(rawLng));
    const hasValidNumbers = Number.isFinite(latNum) && Number.isFinite(lngNum);
    // Guard against common "unset" coordinates (0,0 or near-zero) that render as blank ocean.
    const looksUnset = hasValidNumbers && Math.abs(latNum) < 1 && Math.abs(lngNum) < 1;
    const latitude = hasValidNumbers && !looksUnset ? latNum : '';
    const longitude = hasValidNumbers && !looksUnset ? lngNum : '';
    return {
      zoneId: restaurant?.zoneId || restaurant?.location?.zoneId || '',
      latitude: latitude || '',
      longitude: longitude || '',
      formattedAddress: loc.formattedAddress || loc.address || '',
      addressLine1: loc.addressLine1 || '',
      addressLine2: loc.addressLine2 || '',
      area: loc.area || '',
      city: loc.city || '',
      state: loc.state || '',
      landmark: loc.landmark || '',
      pincode: loc.pincode || loc.zipCode || loc.postalCode || '',
    };
  };
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
    setLocationEditError('');
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

  // Handle view restaurant details
  const handleViewDetails = async (restaurant) => {
    setIsEditingDetails(false);
    setProfileImageFile(null);
    setProfileImagePreview('');
    setIsEditingLocation(false);
    setSelectedRestaurant(restaurant);
    setLoadingDetails(true);
    setRestaurantDetails(null);
    try {
      // Always fetch full details from Admin API so the modal matches the
      // original joining-request data instead of the compact list payload.
      const restaurantId = restaurant._id || restaurant.id || restaurant.restaurantId;
      if (!restaurantId || !adminAPI.getRestaurantById) {
        setRestaurantDetails(restaurant.originalData || restaurant);
        return;
      }
      const response = await adminAPI.getRestaurantById(restaurantId);
      if (!response?.data?.success) {
        setRestaurantDetails(restaurant.originalData || restaurant);
        return;
      }
      const data = response?.data?.data;
      if (data && (data.restaurantName || data._id)) {
        setRestaurantDetails(data);
        return;
      }
      setRestaurantDetails(restaurant.originalData || restaurant);
    } catch (err) {
      debugError('Error fetching restaurant details:', err);
      // Use the restaurant data we already have
      setRestaurantDetails(restaurant.originalData || restaurant);
    } finally {
      setLoadingDetails(false);
    }
  };
  const handleEditLocation = async (restaurant) => {
    await handleViewDetails(restaurant);
    setIsEditingLocation(true);
  };
  const handleSaveLocation = async () => {
    if (!selectedRestaurant) return;
    const restaurantId = selectedRestaurant._id || selectedRestaurant.id;
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
      const locationPayload = {
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
      const response = await adminAPI.updateRestaurantLocation(restaurantId, locationPayload);
      const updatedRestaurant = response?.data?.data?.restaurant;
      if (updatedRestaurant?.location) {
        setRestaurantDetails((prev) => ({
          ...(prev || {}),
          ...updatedRestaurant,
          location: updatedRestaurant.location,
          onboarding: {
            ...(prev?.onboarding || {}),
            step1: {
              ...(prev?.onboarding?.step1 || {}),
              location: updatedRestaurant.location,
            },
          },
        }));
        setRestaurants((prev) =>
          prev.map((item) =>
            item._id === restaurantId || item.id === restaurantId
              ? {
                  ...item,
                  zone: updatedRestaurant.location.area || updatedRestaurant.location.city || item.zone,
                  originalData: {
                    ...(item.originalData || {}),
                    location: updatedRestaurant.location,
                  },
                }
              : item,
          ),
        );
      }
      setIsEditingLocation(false);
      alert('Restaurant location updated successfully');
    } catch (err) {
      debugError('Error saving restaurant location:', err);
      alert(err?.response?.data?.message || 'Failed to update restaurant location');
    } finally {
      setSavingLocation(false);
    }
  };
  useEffect(() => {
    if (!isEditingLocation || !selectedRestaurant) return;
    const sourceRestaurant = restaurantDetails || selectedRestaurant?.originalData || selectedRestaurant;
    const initialForm = normalizeLocationFormFromRestaurant(sourceRestaurant);
    setLocationForm(initialForm);
    setLocationEditError('');
    setZonesLoading(true);
    adminAPI
      .getZones({
        limit: 1000,
      })
      .then((res) => {
        const zoneData = res?.data?.data;
        const list = Array.isArray(zoneData?.zones) ? zoneData.zones : Array.isArray(zoneData) ? zoneData : [];
        setZones(list);
      })
      .catch(() => setZones([]))
      .finally(() => setZonesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingLocation, selectedRestaurant, restaurantDetails?._id]);
  const getDetailsEditSource = () => {
    return restaurantDetails || selectedRestaurant?.originalData || selectedRestaurant || null;
  };
  const buildDetailsFormFromRestaurant = (restaurant) => {
    if (!restaurant) {
      return {
        name: '',
        pureVegRestaurant: false,
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        primaryContactNumber: '',
        email: '',
        estimatedDeliveryTime: '',
        openingTime: '',
        closingTime: '',
        isActive: true,
      };
    }
    const openingTimeValue =
      restaurant.openingTime || restaurant.deliveryTimings?.openingTime || restaurant.onboarding?.step2?.deliveryTimings?.openingTime || '';
    const closingTimeValue =
      restaurant.closingTime || restaurant.deliveryTimings?.closingTime || restaurant.onboarding?.step2?.deliveryTimings?.closingTime || '';
    const estimatedDeliveryTimeValue = restaurant.estimatedDeliveryTime || restaurant.onboarding?.step4?.estimatedDeliveryTime || '';
    return {
      name: restaurant.restaurantName || restaurant.name || '',
      pureVegRestaurant: typeof restaurant.pureVegRestaurant === 'boolean' ? restaurant.pureVegRestaurant : false,
      ownerName: restaurant.ownerName || '',
      ownerEmail: restaurant.ownerEmail || '',
      ownerPhone: restaurant.ownerPhone || restaurant.phone || '',
      primaryContactNumber: restaurant.primaryContactNumber || restaurant.ownerPhone || '',
      email: restaurant.email || restaurant.ownerEmail || '',
      estimatedDeliveryTime: estimatedDeliveryTimeValue,
      openingTime: openingTimeValue,
      closingTime: closingTimeValue,
      isActive: restaurant.isActive !== false,
    };
  };
  const handleStartEditDetails = () => {
    const source = getDetailsEditSource();
    setDetailsForm(buildDetailsFormFromRestaurant(source));
    setProfileImageFile(null);
    setProfileImagePreview(getPrimaryRestaurantImage(source));
    setIsEditingLocation(true);
    setIsEditingDetails(true);
  };
  const handleCancelEditDetails = () => {
    setIsEditingDetails(false);
    setProfileImageFile(null);
    setProfileImagePreview('');
  };
  const handleSaveDetails = async () => {
    if (!selectedRestaurant) return;
    const restaurantId = selectedRestaurant._id || selectedRestaurant.id;
    try {
      setSavingDetails(true);
      let profileImage = undefined;
      if (profileImageFile) {
        const uploadRes = await uploadAPI.uploadMedia(profileImageFile, {
          folder: 'Dima Hasao/restaurant/profile',
        });
        const media = uploadRes?.data?.data?.file || uploadRes?.data?.data || uploadRes?.data?.file;
        if (media?.url) {
          profileImage = {
            url: media.url,
            publicId: media.publicId || media.public_id,
          };
        }
      }
      const normalizedOpeningTime = normalizeTimeValue(detailsForm.openingTime.trim());
      const normalizedClosingTime = normalizeTimeValue(detailsForm.closingTime.trim());
      const openingMinutes = timeToMinutes(normalizedOpeningTime);
      const closingMinutes = timeToMinutes(normalizedClosingTime);
      if (openingMinutes !== null && closingMinutes !== null) {
        if (openingMinutes === closingMinutes) {
          alert('Opening time and closing time cannot be same');
          return;
        }
        if (closingMinutes < openingMinutes) {
          alert('Closing time cannot be less than opening time');
          return;
        }
      }
      const payload = {
        name: detailsForm.name.trim(),
        pureVegRestaurant: detailsForm.pureVegRestaurant === true,
        ownerName: detailsForm.ownerName.trim(),
        ownerEmail: detailsForm.ownerEmail.trim(),
        ownerPhone: detailsForm.ownerPhone.trim(),
        primaryContactNumber: detailsForm.primaryContactNumber.trim(),
        email: detailsForm.email.trim(),
        estimatedDeliveryTime: detailsForm.estimatedDeliveryTime.trim(),
        openingTime: normalizedOpeningTime,
        closingTime: normalizedClosingTime,
        isActive: detailsForm.isActive,
      };
      if (profileImage) {
        payload.profileImage = profileImage;
      }
      const response = await adminAPI.updateRestaurant(restaurantId, payload);
      const updatedRestaurant = response?.data?.data?.restaurant;
      if (updatedRestaurant) {
        setRestaurantDetails(updatedRestaurant);
        setRestaurants((prev) =>
          prev.map((item) =>
            item._id === restaurantId || item.id === restaurantId
              ? {
                  ...item,
                  name: updatedRestaurant.name || item.name,
                  ownerName: updatedRestaurant.ownerName || item.ownerName,
                  ownerPhone: updatedRestaurant.ownerPhone || updatedRestaurant.phone || item.ownerPhone,
                  zone: updatedRestaurant.location?.area || updatedRestaurant.location?.city || item.zone,
                  isActive: updatedRestaurant.isActive !== false,
                  approvalStatus: normalizeApprovalStatus(updatedRestaurant),
                  logo: getPrimaryRestaurantImage(updatedRestaurant, item.logo),
                  originalData: {
                    ...(item.originalData || {}),
                    ...updatedRestaurant,
                  },
                }
              : item,
          ),
        );
      }
      setIsEditingDetails(false);
      setProfileImageFile(null);
      alert('Restaurant details updated successfully');
    } catch (err) {
      debugError('Error updating restaurant details:', err);
      alert(err?.response?.data?.message || 'Failed to update restaurant details');
    } finally {
      setSavingDetails(false);
    }
  };
  const closeDetailsModal = () => {
    setIsEditingDetails(false);
    setProfileImageFile(null);
    setProfileImagePreview('');
    setIsEditingLocation(false);
    setLocationEditError('');
    setSelectedRestaurant(null);
    setRestaurantDetails(null);
  };

  // Handle ban/unban restaurant
  const handleBanRestaurant = (restaurant) => {
    const isBanned = !restaurant.isActive;
    setBanConfirmDialog({
      restaurant,
      action: isBanned ? 'unban' : 'ban',
    });
  };
  const confirmBanRestaurant = async () => {
    if (!banConfirmDialog) return;
    const { restaurant, action } = banConfirmDialog;
    const isBanning = action === 'ban';
    const newStatus = !isBanning; // false for ban, true for unban
    const restaurantId = restaurant._id || restaurant.id;
    try {
      setBanning(true);

      // Update restaurant status via API
      try {
        await adminAPI.updateRestaurantStatus(restaurantId, newStatus);

        // Update local state on success
        if (isBanning) {
          setRestaurants((prev) => prev.filter((r) => r._id !== restaurantId && r.id !== restaurantId));
          const bannedItem = {
            ...restaurant,
            isActive: false,
            approvalStatus: 'rejected',
          };
          setBannedRestaurants((prev) => [bannedItem, ...prev]);
          setBannedCount((prev) => prev + 1);
        } else {
          setBannedRestaurants((prev) => prev.filter((r) => r._id !== restaurantId && r.id !== restaurantId));
          setBannedCount((prev) => Math.max(0, prev - 1));
          const approvedItem = {
            ...restaurant,
            isActive: true,
            approvalStatus: 'approved',
          };
          setRestaurants((prev) => [approvedItem, ...prev]);
        }

        // Close dialog
        setBanConfirmDialog(null);
        alert(`Restaurant ${isBanning ? 'banned' : 'unbanned'} successfully`);
      } catch (apiErr) {
        debugError('API Error:', apiErr);
        setBanConfirmDialog(null);
        alert(apiErr.response?.data?.message || `Failed to ${action} restaurant.`);
      }
    } catch (err) {
      debugError('Error banning/unbanning restaurant:', err);
      alert(`Failed to ${action} restaurant. Please try again.`);
    } finally {
      setBanning(false);
    }
  };
  const cancelBanRestaurant = () => {
    setBanConfirmDialog(null);
  };

  // Handle delete restaurant
  const handleDeleteRestaurant = (restaurant) => {
    setDeleteConfirmDialog({
      restaurant,
    });
  };
  const confirmDeleteRestaurant = async () => {
    if (!deleteConfirmDialog) return;
    const { restaurant } = deleteConfirmDialog;
    try {
      setDeleting(true);
      const restaurantId = restaurant._id || restaurant.id;

      // Delete restaurant via API
      try {
        await adminAPI.deleteRestaurant(restaurantId);

        // Remove from local state on success
        setRestaurants((prevRestaurants) => prevRestaurants.filter((r) => r.id !== restaurant.id && r._id !== restaurant._id));

        // Close dialog
        setDeleteConfirmDialog(null);

        // Show success message
        alert(`Restaurant "${restaurant.name}" deleted successfully!`);
      } catch (apiErr) {
        debugError('API Error:', apiErr);
        alert(apiErr.response?.data?.message || 'Failed to delete restaurant. Please try again.');
      }
    } catch (err) {
      debugError('Error deleting restaurant:', err);
      alert('Failed to delete restaurant. Please try again.');
    } finally {
      setDeleting(false);
    }
  };
  const cancelDeleteRestaurant = () => {
    setDeleteConfirmDialog(null);
  };

  // Handle export functionality
  const handleExport = () => {
    const dataToExport = filteredRestaurants.length > 0 ? filteredRestaurants : restaurants;
    const filename = 'restaurants_list';
    exportRestaurantsToPDF(dataToExport, filename);
  };
  const COLS = [56, 200, 160, 120, 90, 130, 140];
  const SORTABLE = [
    { key: 'sl', label: 'SL' },
    { key: 'name', label: 'Restaurant info' },
    { key: 'owner', label: 'Owner info' },
    { key: 'zone', label: 'Zone' },
    { key: 'rating', label: 'Rating' },
    { key: 'status', label: 'Status' },
  ];
  const formCols = `grid grid-cols-${columns} gap-3`;
  const emptyCopy =
    viewMode === 'banned'
      ? { title: 'No banned restaurants', message: 'Restaurants you ban will be listed here.' }
      : viewMode === 'rejected'
        ? { title: 'No rejected restaurants', message: 'Rejected joining requests will be listed here.' }
        : { title: 'No restaurants found', message: searchQuery ? 'No restaurants match your search.' : 'Add your first restaurant to get started.' };
  const infoRow = (label, value) =>
    value == null || value === '' ? null : (
      <Div className="gap-0.5">
        <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</P>
        <P className="text-sm text-slate-900">{value}</P>
      </Div>
    );

  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Store}
        title="Restaurants"
        subtitle="Every restaurant on the platform, with its owner, zone and approval state"
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'List' }]}
        actions={
          <>
            {viewMode === 'active' ? (
              <HButton onClick={() => navigate('/admin/food/restaurants/add')} className={BTN_PRIMARY}>
                <UiIcon as={Plus} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>Add restaurant</Span>
              </HButton>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <HButton className={BTN_SECONDARY}>
                  <UiIcon as={Download} size={16} className="text-slate-700" />
                  <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                  <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
                </HButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg">
                <DropdownMenuLabel>Export format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExport} className="flex-row items-center gap-2">
                  <UiIcon as={FileText} size={16} className="text-slate-500" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <StatGrid className="mb-4">
        <StatCard label="Total restaurants" value={loading ? '—' : totalRestaurants} icon={Building2} tone="info" />
        <StatCard label="Active restaurants" value={loading ? '—' : activeRestaurants} icon={Utensils} tone="success" />
        <StatCard label="Inactive restaurants" value={loading ? '—' : inactiveRestaurants} icon={UtensilsCrossed} tone="neutral" />
        <StatCard label="Rejected restaurants" value={loading ? '—' : rejectedCount} icon={AlertTriangle} tone="danger" />
        <StatCard label="Banned restaurants" value={loading ? '—' : bannedCount} icon={ShieldX} tone="warning" />
      </StatGrid>

      <Card className="mb-3">
        <SectionTitle>Filters</SectionTitle>
        <Toolbar className="mb-0">
          {[
            { mode: 'active', label: 'Restaurants list' },
            { mode: 'rejected', label: 'Rejected' },
            { mode: 'banned', label: 'Banned' },
          ].map((tab) => (
            <HButton
              key={tab.mode}
              type="button"
              onClick={() => setViewMode(tab.mode)}
              className={`h-11 px-4 items-center justify-center rounded-lg border ${viewMode === tab.mode ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
            >
              <Span className={`text-sm font-semibold ${viewMode === tab.mode ? 'text-white' : 'text-slate-700'}`}>{tab.label}</Span>
            </HButton>
          ))}
        </Toolbar>
        <Div className="flex-row items-center gap-2 mt-2">
          <UiIcon as={Search} size={16} className="text-slate-400" />
          <Input
            type="text"
            placeholder="Search by restaurant name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1`}
          />
        </Div>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState title="Could not load restaurants" message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : filteredRestaurants.length === 0 ? (
        <EmptyState
          title={emptyCopy.title}
          message={emptyCopy.message}
          icon={Store}
          actionLabel={viewMode === 'active' ? 'Add restaurant' : undefined}
          onAction={viewMode === 'active' ? () => navigate('/admin/food/restaurants/add') : undefined}
        />
      ) : (
        <DataTable cols={COLS}>
          <Row className="bg-slate-50 border-b border-slate-200">
            {SORTABLE.map((col, i) => (
              <Cell key={col.key} width={COLS[i]}>
                <Div onClick={() => handleSort(col.key)} accessibilityLabel={`Sort by ${col.label}`} className="flex-row items-center gap-1 py-1">
                  <Span className="flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{col.label}</Span>
                  <UiIcon as={ArrowUpDown} size={12} className={sortConfig.key === col.key ? 'text-blue-600' : 'text-slate-400'} />
                </Div>
              </Cell>
            ))}
            <Cell width={COLS[6]} align="center">
              <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action</Span>
            </Cell>
          </Row>
          <TBody>
            {filteredRestaurants.map((restaurant, index, all) => (
              <Row key={restaurant.id} last={index === all.length - 1}>
                <Cell width={COLS[0]}>{index + 1}</Cell>
                <Cell width={COLS[1]}>
                  <Div className="flex-row items-center gap-2" onClick={() => handleViewDetails(restaurant)}>
                    <Div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <Img src={restaurant.logo} alt={restaurant.name} className="w-full h-full object-cover" fallback={PLACEHOLDER_40} />
                    </Div>
                    <Div className="flex-1">
                      <Span className="text-sm font-semibold text-slate-900" numberOfLines={2}>
                        {restaurant.name}
                      </Span>
                      <Span className="text-xs text-slate-500" numberOfLines={1}>
                        ID #{formatRestaurantId(restaurant.originalData?.restaurantId || restaurant.originalData?._id || restaurant._id || restaurant.id)}
                      </Span>
                    </Div>
                  </Div>
                </Cell>
                <Cell width={COLS[2]}>
                  <Div>
                    <Span className="text-sm font-medium text-slate-900" numberOfLines={1}>
                      {restaurant.ownerName}
                    </Span>
                    <Span className="text-xs text-slate-500" numberOfLines={1}>
                      {formatPhone(restaurant.ownerPhone)}
                    </Span>
                  </Div>
                </Cell>
                <Cell width={COLS[3]}>{restaurant.zone}</Cell>
                <Cell width={COLS[4]}>
                  <Div className="flex-row items-center gap-1">
                    <UiIcon as={Star} size={14} className="text-amber-500" />
                    <Span className="text-sm font-semibold text-slate-900">{(Number(restaurant.rating) || 0).toFixed(1)}</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[5]}>
                  <Div className="gap-1">
                    {viewMode === 'banned' ? (
                      <StatusBadge status="banned" label="Banned" />
                    ) : viewMode === 'rejected' ? (
                      <StatusBadge status="rejected" label="Rejected" />
                    ) : (
                      <StatusBadge status={restaurant.approvalStatus} label={approvalStatusLabel(restaurant.approvalStatus)} />
                    )}
                    <Span className="text-xs text-slate-500">
                      Outlet: {viewMode === 'active' ? (restaurant.isActive ? 'Active' : 'Inactive') : 'Offline'}
                    </Span>
                  </Div>
                </Cell>
                <Cell width={COLS[6]} align="center">
                  <Div className="flex-row items-center justify-center gap-1">
                    <HButton
                      onClick={() => handleViewDetails(restaurant)}
                      accessibilityLabel={`View ${restaurant.name}`}
                      className="w-11 h-11 items-center justify-center rounded-lg"
                    >
                      <UiIcon as={Eye} size={18} className="text-blue-600" />
                    </HButton>
                    {viewMode === 'banned' && (
                      <HButton
                        onClick={() => handleBanRestaurant(restaurant)}
                        accessibilityLabel={`Unban ${restaurant.name}`}
                        className="w-11 h-11 items-center justify-center rounded-lg"
                      >
                        <UiIcon as={ShieldCheck} size={18} className="text-green-700" />
                      </HButton>
                    )}
                    {viewMode === 'active' && (
                      <HButton
                        onClick={() => handleBanRestaurant(restaurant)}
                        accessibilityLabel={restaurant.isActive ? `Ban ${restaurant.name}` : `Unban ${restaurant.name}`}
                        className="w-11 h-11 items-center justify-center rounded-lg"
                      >
                        <UiIcon as={ShieldX} size={18} className={restaurant.isActive ? 'text-red-600' : 'text-green-700'} />
                      </HButton>
                    )}
                    {viewMode !== 'rejected' && (
                      <HButton
                        onClick={() => handleDeleteRestaurant(restaurant)}
                        accessibilityLabel={`Delete ${restaurant.name}`}
                        className="w-11 h-11 items-center justify-center rounded-lg"
                      >
                        <UiIcon as={Trash2} size={18} className="text-red-600" />
                      </HButton>
                    )}
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {/* Restaurant Details Modal */}
      {selectedRestaurant && (
        <Overlay className="absolute inset-0 bg-slate-900/40 items-center justify-center p-4" onClick={closeDetailsModal} onClose={closeDetailsModal}>
          <Div
            className="bg-white rounded-xl border border-slate-200 w-full overflow-hidden"
            style={{ maxWidth: 760, maxHeight: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <Div className="px-4 py-3 border-b border-slate-200 flex-row flex-wrap items-center justify-between gap-2">
              <Div className="flex-1 min-w-[160px]">
                <H2 className="text-lg font-semibold text-slate-900">Restaurant details</H2>
                <P className="text-xs text-slate-500">Detailed overview and information</P>
              </Div>
              <Div className="flex-row items-center gap-2">
                {normalizeApprovalStatus(restaurantDetails || selectedRestaurant?.originalData || selectedRestaurant) !== 'rejected' &&
                  (!isEditingDetails ? (
                    <HButton onClick={handleStartEditDetails} className={BTN_PRIMARY}>
                      <Span className={BTN_TEXT_PRIMARY}>Edit details</Span>
                    </HButton>
                  ) : (
                    <>
                      <HButton onClick={handleCancelEditDetails} disabled={savingDetails} className={BTN_SECONDARY}>
                        <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                      </HButton>
                      <HButton onClick={handleSaveDetails} disabled={savingDetails} className={BTN_PRIMARY}>
                        {savingDetails ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
                        <Span className={BTN_TEXT_PRIMARY}>{savingDetails ? 'Saving…' : 'Save changes'}</Span>
                      </HButton>
                    </>
                  ))}
                <HButton onClick={closeDetailsModal} accessibilityLabel="Close details" className="w-11 h-11 items-center justify-center rounded-lg bg-slate-100">
                  <UiIcon as={X} size={18} className="text-slate-600" />
                </HButton>
              </Div>
            </Div>

            {/* Modal Content - Scrollable area */}
            <ScrollDiv className="flex-shrink p-4">
              {loadingDetails && <LoadingState label="Fetching restaurant data…" className="border-0" />}
              {!loadingDetails && isEditingDetails && (
                <Div className={formCols}>
                  <Div className="col-span-full">
                    <Field label="Profile image">
                      <Div className="flex-row items-center gap-3">
                        <Div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 items-center justify-center">
                          {profileImagePreview ? (
                            <Img src={profileImagePreview} alt="Profile preview" className="w-full h-full object-cover" />
                          ) : (
                            <UiIcon as={ImageIcon} size={20} className="text-slate-400" />
                          )}
                        </Div>
                        <Div className="flex-1 gap-1">
                          <HButton
                            type="button"
                            onClick={async () => {
                              const file = await pickImage();
                              setProfileImageFile(file || null);
                              if (file) {
                                const localUrl = objectUrl(file);
                                setProfileImagePreview(localUrl);
                              }
                            }}
                            className={BTN_SECONDARY}
                          >
                            <Span className={BTN_TEXT_SECONDARY}>Choose file</Span>
                          </HButton>
                          <Span className="text-xs text-slate-500" numberOfLines={1}>
                            {profileImageFile?.name || 'No file chosen'}
                          </Span>
                        </Div>
                      </Div>
                    </Field>
                  </Div>

                  <Div className="col-span-full">
                    <Field label="Restaurant name">
                      <Input
                        type="text"
                        value={detailsForm.name}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                    </Field>
                  </Div>
                  <Field label="Pure veg">
                    <Div className="flex-row flex-wrap items-center gap-2">
                      <HButton
                        type="button"
                        onClick={() =>
                          setDetailsForm((prev) => ({
                            ...prev,
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
                          setDetailsForm((prev) => ({
                            ...prev,
                            pureVegRestaurant: false,
                          }))
                        }
                        className={`h-11 px-4 items-center justify-center rounded-full border ${detailsForm.pureVegRestaurant === false ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                      >
                        <Span className={`text-sm font-semibold ${detailsForm.pureVegRestaurant === false ? 'text-white' : 'text-slate-700'}`}>No</Span>
                      </HButton>
                    </Div>
                  </Field>
                  <Field label="Restaurant email">
                    <Input
                      type="email"
                      value={detailsForm.email}
                      onChange={(e) =>
                        setDetailsForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Owner name">
                    <Input
                      type="text"
                      value={detailsForm.ownerName}
                      onChange={(e) =>
                        setDetailsForm((prev) => ({
                          ...prev,
                          ownerName: e.target.value,
                        }))
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Owner email">
                    <Input
                      type="email"
                      value={detailsForm.ownerEmail}
                      onChange={(e) =>
                        setDetailsForm((prev) => ({
                          ...prev,
                          ownerEmail: e.target.value,
                        }))
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Owner phone">
                    <Input
                      type="text"
                      value={detailsForm.ownerPhone}
                      onChange={(e) =>
                        setDetailsForm((prev) => ({
                          ...prev,
                          ownerPhone: e.target.value,
                        }))
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Primary contact">
                    <Input
                      type="text"
                      value={detailsForm.primaryContactNumber}
                      onChange={(e) =>
                        setDetailsForm((prev) => ({
                          ...prev,
                          primaryContactNumber: e.target.value,
                        }))
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Opening time">
                    <Input
                      type="text"
                      value={detailsForm.openingTime}
                      onChange={(e) =>
                        setDetailsForm((prev) => ({
                          ...prev,
                          openingTime: e.target.value,
                        }))
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Closing time">
                    <Input
                      type="text"
                      value={detailsForm.closingTime}
                      onChange={(e) =>
                        setDetailsForm((prev) => ({
                          ...prev,
                          closingTime: e.target.value,
                        }))
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Estimated delivery time">
                    <Input
                      type="text"
                      value={detailsForm.estimatedDeliveryTime}
                      onChange={(e) =>
                        setDetailsForm((prev) => ({
                          ...prev,
                          estimatedDeliveryTime: e.target.value,
                        }))
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Div className="col-span-full">
                    <Div className="flex-row items-center gap-3">
                      <Input
                        nativeID="restaurant-status-active"
                        type="checkbox"
                        checked={detailsForm.isActive}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }))
                        }
                        className="h-5 w-5 rounded border-slate-300"
                      />
                      <Label className="text-sm text-slate-700">Restaurant is active</Label>
                    </Div>
                  </Div>
                </Div>
              )}
              {!loadingDetails &&
                !isEditingDetails &&
                (restaurantDetails || selectedRestaurant) &&
                (() => {
                  const r = restaurantDetails || selectedRestaurant?.originalData || selectedRestaurant;
                  const detailsApprovalStatus = normalizeApprovalStatus(r);
                  const profileImgUrl = getPrimaryRestaurantImage(r);
                  const coverImages = Array.isArray(r?.coverImages) ? r.coverImages.map(normalizeImageUrl).filter(Boolean) : [];
                  const displayAddress = getRestaurantDisplayAddress(r);
                  const hasFlatAddress = Boolean(displayAddress);
                  const menuImages = Array.isArray(r?.menuImages) ? r.menuImages.map(normalizeImageUrl).filter(Boolean) : [];
                  const cuisinesList =
                    (Array.isArray(r?.cuisines) && r.cuisines.length ? r.cuisines : null) ||
                    (Array.isArray(r?.onboarding?.step2?.cuisines) && r.onboarding.step2.cuisines.length ? r.onboarding.step2.cuisines : null) ||
                    null;
                  const openingTimeVal = r?.openingTime || r?.deliveryTimings?.openingTime || r?.onboarding?.step2?.deliveryTimings?.openingTime || '';
                  const closingTimeVal = r?.closingTime || r?.deliveryTimings?.closingTime || r?.onboarding?.step2?.deliveryTimings?.closingTime || '';
                  const openDaysVal =
                    (Array.isArray(r?.openDays) && r.openDays.length ? r.openDays : null) ||
                    (Array.isArray(r?.onboarding?.step2?.openDays) && r.onboarding.step2.openDays.length ? r.onboarding.step2.openDays : null) ||
                    null;
                  const offerVal = r?.offer || r?.onboarding?.step4?.offer || '';
                  const estimatedDeliveryTimeVal = r?.estimatedDeliveryTime || r?.onboarding?.step4?.estimatedDeliveryTime || '';
                  const featuredDishVal = r?.featuredDish || r?.onboarding?.step4?.featuredDish || '';
                  const featuredPriceVal = r?.featuredPrice ?? r?.onboarding?.step4?.featuredPrice;
                  const diningSettingsVal = r?.diningSettings || r?.onboarding?.step4?.diningSettings || null;
                  const panDocumentUrl = typeof r?.panImage === 'string' ? r.panImage : r?.panImage?.url || r?.onboarding?.step3?.pan?.image?.url || '';
                  const gstDocumentUrl = typeof r?.gstImage === 'string' ? r.gstImage : r?.gstImage?.url || r?.onboarding?.step3?.gst?.image?.url || '';
                  const fssaiDocumentUrl =
                    typeof r?.fssaiImage === 'string' ? r.fssaiImage : r?.fssaiImage?.url || r?.onboarding?.step3?.fssai?.image?.url || '';
                  const hasPanSection = Boolean(
                    r?.panNumber || r?.nameOnPan || panDocumentUrl || r?.onboarding?.step3?.pan?.panNumber || r?.onboarding?.step3?.pan?.nameOnPan,
                  );
                  const hasGstSection = Boolean(
                    r?.gstNumber ||
                    r?.gstLegalName ||
                    r?.gstAddress ||
                    gstDocumentUrl ||
                    r?.onboarding?.step3?.gst?.gstNumber ||
                    r?.onboarding?.step3?.gst?.legalName ||
                    r?.onboarding?.step3?.gst?.address,
                  );
                  const hasFssaiSection = Boolean(
                    r?.fssaiNumber ||
                    r?.fssaiExpiry ||
                    fssaiDocumentUrl ||
                    r?.onboarding?.step3?.fssai?.registrationNumber ||
                    r?.onboarding?.step3?.fssai?.expiryDate,
                  );
                  const hasBankSection = Boolean(
                    r?.accountNumber ||
                    r?.ifscCode ||
                    r?.accountHolderName ||
                    r?.accountType ||
                    r?.onboarding?.step3?.bank?.accountNumber ||
                    r?.onboarding?.step3?.bank?.ifscCode ||
                    r?.onboarding?.step3?.bank?.accountHolderName ||
                    r?.onboarding?.step3?.bank?.accountType,
                  );
                  const hasRegistrationDocuments = hasPanSection || hasGstSection || hasFssaiSection || hasBankSection;
                  const docCard = 'rounded-lg border border-slate-200 p-3 gap-3';
                  return (
                    <Div className="gap-4">
                      {detailsApprovalStatus === 'rejected' && r?.rejectionReason && (
                        <Div className="p-3 rounded-lg bg-red-50 border border-red-200 gap-1">
                          <P className="text-sm font-semibold text-red-700">Rejection reason</P>
                          <P className="text-sm text-red-700">{r.rejectionReason}</P>
                        </Div>
                      )}
                      {/* Restaurant Basic Info */}
                      <Div className="flex-row items-center gap-3">
                        <Div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          <Img
                            src={profileImgUrl || PLACEHOLDER_128}
                            alt={r?.restaurantName || r?.name || 'Restaurant'}
                            className="w-full h-full object-cover"
                            fallback={PLACEHOLDER_128}
                          />
                        </Div>
                        <Div className="flex-1 gap-2">
                          <H3 className="text-xl font-bold text-slate-900">{r?.restaurantName || r?.name || 'N/A'}</H3>
                          <Div className="flex-row flex-wrap items-center gap-2">
                            {detailsApprovalStatus === 'banned' ? (
                              <StatusBadge status="banned" label="Banned" />
                            ) : detailsApprovalStatus === 'rejected' ? (
                              <StatusBadge status="rejected" label="Rejected" />
                            ) : (
                              <StatusBadge status={r?.isActive !== false ? 'active' : 'inactive'} label={r?.isActive !== false ? 'Active' : 'Inactive'} />
                            )}
                            {r?.ratings?.average != null && (
                              <Div className="flex-row items-center gap-1">
                                <UiIcon as={Star} size={14} className="text-amber-500" />
                                <Span className="text-sm font-semibold text-slate-900">{(r.ratings?.average ?? 0).toFixed(1)}</Span>
                                <Span className="text-xs text-slate-500">({r.ratings?.count ?? 0} reviews)</Span>
                              </Div>
                            )}
                            <Div className="flex-row items-center gap-1">
                              <UiIcon as={Building2} size={14} className="text-slate-400" />
                              <Span className="text-xs text-slate-500">{formatRestaurantId(r?.restaurantId || r?._id)}</Span>
                            </Div>
                          </Div>
                        </Div>
                      </Div>

                      <Div className={formCols}>
                        {/* Owner Information */}
                        <Div className={docCard}>
                          <Div className="flex-row items-center gap-2">
                            <UiIcon as={User} size={14} className="text-slate-500" />
                            <H4 className="text-base font-semibold text-slate-900">Owner information</H4>
                          </Div>
                          {infoRow('Full name', r?.ownerName || 'N/A')}
                          {infoRow('Contact number', r?.ownerPhone || r?.phone || 'N/A')}
                          {r?.ownerEmail || r?.email ? infoRow('Email address', r.ownerEmail || r.email) : null}
                        </Div>

                        {/* Location & Contact */}
                        <Div className={docCard}>
                          <Div className="flex-row items-center justify-between gap-2">
                            <H4 className="text-base font-semibold text-slate-900">Location &amp; contact</H4>
                            {isEditingLocation ? <StatusBadge tone="info" label="Editable below" icon={Settings} /> : null}
                          </Div>
                          {!isEditingLocation && hasFlatAddress ? infoRow('Address', displayAddress) : null}
                          {isEditingLocation ? <P className="text-xs text-slate-500">The location editor is at the bottom of this panel.</P> : null}
                          {r?.primaryContactNumber || r?.phone ? infoRow('Primary contact', r.primaryContactNumber || r.phone) : null}
                          {r?.email && !r?.ownerEmail ? infoRow('Restaurant email', r.email) : null}
                        </Div>
                      </Div>

                      {/* Timings */}
                      <Div className={docCard}>
                        <H4 className="text-base font-semibold text-slate-900">Timings &amp; status</H4>
                        {openingTimeVal || closingTimeVal ? infoRow('Opening / closing', `${formatTime12Hour(openingTimeVal)} – ${formatTime12Hour(closingTimeVal)}`) : null}
                        {estimatedDeliveryTimeVal ? infoRow('Estimated delivery time', estimatedDeliveryTimeVal) : null}
                        {offerVal ? infoRow('Offer', offerVal) : null}
                        {featuredDishVal ? infoRow('Featured dish', featuredPriceVal != null ? `${featuredDishVal} · ₹${featuredPriceVal}` : featuredDishVal) : null}
                        {diningSettingsVal?.isEnabled != null ? infoRow('Dine-in', diningSettingsVal.isEnabled ? 'Enabled' : 'Disabled') : null}
                        {cuisinesList ? (
                          <Div className="gap-1.5">
                            <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cuisines</P>
                            <Div className="flex-row flex-wrap gap-2">
                              {cuisinesList.map((cuisine, idx) => (
                                <Span key={`${cuisine}-${idx}`} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                  {cuisine}
                                </Span>
                              ))}
                            </Div>
                          </Div>
                        ) : null}
                        {openDaysVal ? (
                          <Div className="gap-1.5">
                            <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open days</P>
                            <Div className="flex-row flex-wrap gap-2">
                              {openDaysVal.map((day, idx) => (
                                <Span key={`${day}-${idx}`} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium capitalize">
                                  {day}
                                </Span>
                              ))}
                            </Div>
                          </Div>
                        ) : null}
                        <Div className="gap-1.5">
                          <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</P>
                          {detailsApprovalStatus === 'banned' ? (
                            <StatusBadge status="banned" label="Banned" />
                          ) : (
                            <StatusBadge status={detailsApprovalStatus} label={approvalStatusLabel(detailsApprovalStatus)} />
                          )}
                          <P className="text-xs text-slate-500">
                            Outlet: {detailsApprovalStatus === 'banned' ? 'Offline' : r?.isActive !== false ? 'Active' : 'Inactive'}
                          </P>
                        </Div>
                      </Div>

                      {/* Media */}
                      {(profileImgUrl || coverImages.length > 0 || menuImages.length > 0) && (
                        <Div className={docCard}>
                          <H4 className="text-base font-semibold text-slate-900">Media</H4>
                          {profileImgUrl && (
                            <Div className="gap-1.5">
                              <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile image</P>
                              <A href={profileImgUrl} className="flex-row items-center gap-2 py-1">
                                <UiIcon as={ImageIcon} size={14} className="text-blue-600" />
                                <Span className="text-sm font-medium text-blue-600">View profile image</Span>
                                <UiIcon as={ExternalLink} size={12} className="text-blue-600" />
                              </A>
                            </Div>
                          )}
                          {coverImages.length > 0 && (
                            <Div className="gap-1.5">
                              <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Restaurant photos</P>
                              <Div className={`grid grid-cols-${columns > 1 ? 4 : 2} gap-2`}>
                                {coverImages.map((url, idx) => (
                                  <A key={`${url}-${idx}`} href={url} className="aspect-[4/5] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                    <HideOnErrorImg src={url} alt={`Restaurant ${idx + 1}`} className="w-full h-full object-cover" />
                                  </A>
                                ))}
                              </Div>
                            </Div>
                          )}
                          {menuImages.length > 0 && (
                            <Div className="gap-1.5">
                              <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Menu images</P>
                              <Div className={`grid grid-cols-${columns > 1 ? 4 : 2} gap-2`}>
                                {menuImages.map((url, idx) => (
                                  <A key={`${url}-${idx}`} href={url} className="aspect-[4/5] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                    <HideOnErrorImg src={url} alt={`Menu ${idx + 1}`} className="w-full h-full object-cover" />
                                  </A>
                                ))}
                              </Div>
                            </Div>
                          )}
                        </Div>
                      )}

                      {/* Registration Information */}
                      {(r?.createdAt || r?.updatedAt) && (
                        <Div className={docCard}>
                          <H4 className="text-base font-semibold text-slate-900">Registration information</H4>
                          <Div className={formCols}>
                            {r.createdAt
                              ? infoRow(
                                  'Registration date & time',
                                  new Date(r.createdAt).toLocaleString('en-IN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }),
                                )
                              : null}
                            {r.updatedAt
                              ? infoRow(
                                  'Last updated',
                                  new Date(r.updatedAt).toLocaleString('en-IN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }),
                                )
                              : null}
                            {r.restaurantId ? infoRow('Restaurant ID', formatRestaurantId(r.restaurantId)) : null}
                            {r.slug ? infoRow('Slug', r.slug) : null}
                            {r.phoneVerified !== undefined ? infoRow('Phone verified', r.phoneVerified ? 'Yes' : 'No') : null}
                            {r.signupMethod ? infoRow('Signup method', r.signupMethod) : null}
                          </Div>
                        </Div>
                      )}

                      {/* Registration Documents - flat (PAN, GST, FSSAI, Bank) or onboarding.step3 */}
                      {hasRegistrationDocuments && (
                        <Div className="gap-3">
                          <H4 className="text-base font-semibold text-slate-900">Registration documents</H4>

                          {/* PAN – flat or onboarding.step3 */}
                          {hasPanSection && (
                            <Div className={docCard}>
                              <Div className="flex-row items-center gap-2">
                                <UiIcon as={FileText} size={14} className="text-slate-500" />
                                <H5 className="text-sm font-semibold text-slate-900">PAN details</H5>
                              </Div>
                              <Div className={formCols}>
                                {r.panNumber || r?.onboarding?.step3?.pan?.panNumber ? infoRow('PAN number', r.panNumber || r.onboarding?.step3?.pan?.panNumber) : null}
                                {r.nameOnPan || r?.onboarding?.step3?.pan?.nameOnPan ? infoRow('Name on PAN', r.nameOnPan || r.onboarding?.step3?.pan?.nameOnPan) : null}
                              </Div>
                              {panDocumentUrl && (
                                <A href={panDocumentUrl} className="flex-row items-center gap-2 py-1">
                                  <UiIcon as={ImageIcon} size={14} className="text-blue-600" />
                                  <Span className="text-sm font-medium text-blue-600">View PAN document</Span>
                                  <UiIcon as={ExternalLink} size={12} className="text-blue-600" />
                                </A>
                              )}
                            </Div>
                          )}

                          {/* GST – flat or onboarding.step3 */}
                          {hasGstSection && (
                            <Div className={docCard}>
                              <Div className="flex-row items-center gap-2">
                                <UiIcon as={FileText} size={14} className="text-slate-500" />
                                <H5 className="text-sm font-semibold text-slate-900">GST details</H5>
                              </Div>
                              <Div className={formCols}>
                                {r.gstRegistered != null || r?.onboarding?.step3?.gst?.isRegistered != null
                                  ? infoRow('GST registered', r.gstRegistered != null ? (r.gstRegistered ? 'Yes' : 'No') : r?.onboarding?.step3?.gst?.isRegistered ? 'Yes' : 'No')
                                  : null}
                                {r.gstNumber || r?.onboarding?.step3?.gst?.gstNumber ? infoRow('GST number', r.gstNumber || r.onboarding?.step3?.gst?.gstNumber) : null}
                                {r.gstLegalName || r?.onboarding?.step3?.gst?.legalName ? infoRow('Legal name', r.gstLegalName || r.onboarding?.step3?.gst?.legalName) : null}
                                {r.gstAddress || r?.onboarding?.step3?.gst?.address ? infoRow('GST address', r.gstAddress || r.onboarding?.step3?.gst?.address) : null}
                              </Div>
                              {gstDocumentUrl && (
                                <A href={gstDocumentUrl} className="flex-row items-center gap-2 py-1">
                                  <UiIcon as={ImageIcon} size={14} className="text-blue-600" />
                                  <Span className="text-sm font-medium text-blue-600">View GST document</Span>
                                  <UiIcon as={ExternalLink} size={12} className="text-blue-600" />
                                </A>
                              )}
                            </Div>
                          )}

                          {/* FSSAI – flat or onboarding.step3 */}
                          {hasFssaiSection && (
                            <Div className={docCard}>
                              <Div className="flex-row items-center gap-2">
                                <UiIcon as={FileText} size={14} className="text-slate-500" />
                                <H5 className="text-sm font-semibold text-slate-900">FSSAI details</H5>
                              </Div>
                              <Div className={formCols}>
                                {r.fssaiNumber || r?.onboarding?.step3?.fssai?.registrationNumber
                                  ? infoRow('FSSAI registration number', r.fssaiNumber || r.onboarding?.step3?.fssai?.registrationNumber)
                                  : null}
                                {r.fssaiExpiry || r?.onboarding?.step3?.fssai?.expiryDate
                                  ? infoRow(
                                      'FSSAI expiry date',
                                      new Date(r.fssaiExpiry || r.onboarding?.step3?.fssai?.expiryDate).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      }),
                                    )
                                  : null}
                              </Div>
                              {fssaiDocumentUrl && (
                                <A href={fssaiDocumentUrl} className="flex-row items-center gap-2 py-1">
                                  <UiIcon as={ImageIcon} size={14} className="text-blue-600" />
                                  <Span className="text-sm font-medium text-blue-600">View FSSAI document</Span>
                                  <UiIcon as={ExternalLink} size={12} className="text-blue-600" />
                                </A>
                              )}
                            </Div>
                          )}

                          {/* Bank – flat or onboarding.step3 */}
                          {hasBankSection && (
                            <Div className={docCard}>
                              <Div className="flex-row items-center gap-2">
                                <UiIcon as={CreditCard} size={14} className="text-slate-500" />
                                <H5 className="text-sm font-semibold text-slate-900">Bank details</H5>
                              </Div>
                              <Div className={formCols}>
                                {r.accountNumber || r?.onboarding?.step3?.bank?.accountNumber
                                  ? infoRow('Account number', r.accountNumber || r.onboarding?.step3?.bank?.accountNumber)
                                  : null}
                                {r.ifscCode || r?.onboarding?.step3?.bank?.ifscCode ? infoRow('IFSC code', r.ifscCode || r.onboarding?.step3?.bank?.ifscCode) : null}
                                {r.accountHolderName || r?.onboarding?.step3?.bank?.accountHolderName
                                  ? infoRow('Account holder name', r.accountHolderName || r.onboarding?.step3?.bank?.accountHolderName)
                                  : null}
                                {r.accountType || r?.onboarding?.step3?.bank?.accountType
                                  ? infoRow('Account type', r.accountType || r.onboarding?.step3?.bank?.accountType)
                                  : null}
                              </Div>
                            </Div>
                          )}
                        </Div>
                      )}

                      {/* Address at registration (flat) */}
                      {hasFlatAddress && !r?.onboarding?.step1?.location && (
                        <Div className={docCard}>
                          <H4 className="text-base font-semibold text-slate-900">Address (at registration)</H4>
                          <P className="text-sm text-slate-900">{displayAddress}</P>
                        </Div>
                      )}

                      {/* Onboarding Step 1 Details */}
                      {r?.onboarding?.step1 && (
                        <Div className={docCard}>
                          <H4 className="text-base font-semibold text-slate-900">Registration step 1 details</H4>
                          <Div className={formCols}>
                            {r.onboarding.step1.restaurantName ? infoRow('Restaurant name (at registration)', r.onboarding.step1.restaurantName) : null}
                            {r.onboarding.step1.ownerName ? infoRow('Owner name (at registration)', r.onboarding.step1.ownerName) : null}
                            {r.onboarding.step1.ownerEmail ? infoRow('Owner email (at registration)', r.onboarding.step1.ownerEmail) : null}
                            {r.onboarding.step1.ownerPhone ? infoRow('Owner phone (at registration)', r.onboarding.step1.ownerPhone) : null}
                            {r.onboarding.step1.primaryContactNumber ? infoRow('Primary contact (at registration)', r.onboarding.step1.primaryContactNumber) : null}
                            {r.onboarding.step1.location ? (
                              <Div className="col-span-full">
                                {infoRow(
                                  'Location (at registration)',
                                  `${r.onboarding.step1.location.addressLine1 || ''}${r.onboarding.step1.location.addressLine2 ? `, ${r.onboarding.step1.location.addressLine2}` : ''}${r.onboarding.step1.location.area ? `, ${r.onboarding.step1.location.area}` : ''}${r.onboarding.step1.location.city ? `, ${r.onboarding.step1.location.city}` : ''}${r.onboarding.step1.location.landmark ? `, ${r.onboarding.step1.location.landmark}` : ''}`,
                                )}
                              </Div>
                            ) : null}
                          </Div>
                        </Div>
                      )}

                      {/* Onboarding Step 2 Details */}
                      {r?.onboarding?.step2 && (
                        <Div className={docCard}>
                          <H4 className="text-base font-semibold text-slate-900">Registration step 2 details</H4>
                          {r.onboarding.step2.cuisines && Array.isArray(r.onboarding.step2.cuisines) && r.onboarding.step2.cuisines.length > 0 && (
                            <Div className="gap-1.5">
                              <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cuisines (at registration)</P>
                              <Div className="flex-row flex-wrap gap-2">
                                {r.onboarding.step2.cuisines.map((cuisine, idx) => (
                                  <Span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                    {cuisine}
                                  </Span>
                                ))}
                              </Div>
                            </Div>
                          )}
                          {r.onboarding.step2.deliveryTimings && (
                            <Div className={formCols}>
                              {infoRow('Opening time (at registration)', formatTime12Hour(r.onboarding.step2.deliveryTimings.openingTime))}
                              {infoRow('Closing time (at registration)', formatTime12Hour(r.onboarding.step2.deliveryTimings.closingTime))}
                            </Div>
                          )}
                          {r.onboarding.step2.openDays && Array.isArray(r.onboarding.step2.openDays) && r.onboarding.step2.openDays.length > 0 && (
                            <Div className="gap-1.5">
                              <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open days (at registration)</P>
                              <Div className="flex-row flex-wrap gap-2">
                                {r.onboarding.step2.openDays.map((day, idx) => (
                                  <Span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium capitalize">
                                    {day}
                                  </Span>
                                ))}
                              </Div>
                            </Div>
                          )}
                          {r.onboarding.step2.profileImageUrl?.url && (
                            <Div className="gap-1.5">
                              <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile image (at registration)</P>
                              <A href={r.onboarding.step2.profileImageUrl.url}>
                                <Img
                                  src={r.onboarding.step2.profileImageUrl.url}
                                  alt="Profile"
                                  className="w-24 h-24 rounded-lg object-cover border border-slate-200"
                                  fallback={PLACEHOLDER_128}
                                />
                              </A>
                            </Div>
                          )}
                        </Div>
                      )}

                      {/* Onboarding Step 4 Details */}
                      {r?.onboarding?.step4 && (
                        <Div className={docCard}>
                          <H4 className="text-base font-semibold text-slate-900">Registration step 4 details</H4>
                          <Div className={formCols}>
                            {r.onboarding.step4.estimatedDeliveryTime
                              ? infoRow('Estimated delivery time (at registration)', r.onboarding.step4.estimatedDeliveryTime)
                              : null}
                            {r.onboarding.step4.distance ? infoRow('Distance (at registration)', r.onboarding.step4.distance) : null}
                            {r.onboarding.step4.featuredDish ? infoRow('Featured dish (at registration)', r.onboarding.step4.featuredDish) : null}
                            {r.onboarding.step4.offer ? infoRow('Offer (at registration)', r.onboarding.step4.offer) : null}
                          </Div>
                        </Div>
                      )}

                      {/* Additional Information */}
                      {(r?.slug || r?.restaurantId || r?.phoneVerified !== undefined || r?.signupMethod) && (
                        <Div className={docCard}>
                          <H4 className="text-base font-semibold text-slate-900">Additional information</H4>
                          <Div className={formCols}>
                            {r?.slug ? infoRow('Slug', r.slug) : null}
                            {r?.restaurantId ? infoRow('Restaurant ID', formatRestaurantId(r.restaurantId)) : null}
                            {r?.phoneVerified !== undefined ? infoRow('Phone verified', r.phoneVerified ? 'Yes' : 'No') : null}
                            {r?.signupMethod ? infoRow('Signup method', r.signupMethod) : null}
                            {r?.onboarding?.completedSteps !== undefined ? infoRow('Onboarding steps completed', `${r.onboarding.completedSteps} / 4`) : null}
                          </Div>
                        </Div>
                      )}

                      {isEditingLocation && (
                        <Div className={docCard}>
                          <H4 className="text-base font-semibold text-slate-900">Location editor</H4>
                          <P className="text-xs text-slate-500">Update the restaurant location from the search suggestions and pick its service zone.</P>
                          <Div className={formCols}>
                            <Div className="col-span-full">
                              <Field label="Service zone" required>
                                <Select
                                  value={locationForm.zoneId || ''}
                                  onChange={(e) =>
                                    setLocationForm((prev) => ({
                                      ...prev,
                                      zoneId: e.target.value,
                                    }))
                                  }
                                  className={INPUT}
                                >
                                  <Option value="">{zonesLoading ? 'Loading zones…' : 'Select a zone'}</Option>
                                  {zones.map((z) => (
                                    <Option key={z._id || z.id} value={z._id || z.id}>
                                      {z.name || z.zoneName || z.serviceLocation || 'Zone'}
                                    </Option>
                                  ))}
                                </Select>
                              </Field>
                            </Div>

                            <Div className="col-span-full">
                              <Field label="Search location" required hint="Select a suggestion to auto-fill the address and coordinates.">
                                <PlacesSearchInput
                                  className={INPUT}
                                  placeholder="Start typing and choose a suggestion…"
                                  onPlace={handlePlaceSelected}
                                  onError={setLocationEditError}
                                />
                              </Field>
                            </Div>

                            <Div className="col-span-full">
                              <Field label="Formatted address">
                                <Input type="text" value={locationForm.formattedAddress} readOnly className={`${INPUT} bg-slate-50 text-slate-600`} />
                              </Field>
                            </Div>
                            <Field label="Area">
                              <Input type="text" value={locationForm.area} readOnly className={`${INPUT} bg-slate-50 text-slate-600`} />
                            </Field>
                            <Field label="City">
                              <Input type="text" value={locationForm.city} readOnly className={`${INPUT} bg-slate-50 text-slate-600`} />
                            </Field>
                            <Field label="State">
                              <Input type="text" value={locationForm.state} readOnly className={`${INPUT} bg-slate-50 text-slate-600`} />
                            </Field>
                            <Field label="Pincode">
                              <Input type="text" value={locationForm.pincode} readOnly className={`${INPUT} bg-slate-50 text-slate-600`} />
                            </Field>
                            <Div className="col-span-full">
                              <Field label="Landmark" hint="Optional">
                                <Input
                                  type="text"
                                  value={locationForm.landmark}
                                  onChange={(e) =>
                                    setLocationForm((prev) => ({
                                      ...prev,
                                      landmark: e.target.value,
                                    }))
                                  }
                                  className={INPUT}
                                />
                              </Field>
                            </Div>
                          </Div>

                          {locationEditError ? <P className="text-xs text-red-600">{locationEditError}</P> : null}
                          <HButton onClick={handleSaveLocation} disabled={savingLocation} className={BTN_PRIMARY}>
                            {savingLocation ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
                            <Span className={BTN_TEXT_PRIMARY}>{savingLocation ? 'Saving…' : 'Save location'}</Span>
                          </HButton>
                        </Div>
                      )}
                    </Div>
                  );
                })()}
              {!loadingDetails && !restaurantDetails && !selectedRestaurant && (
                <EmptyState title="No details available" message="This restaurant's details could not be loaded." className="border-0" />
              )}
            </ScrollDiv>
          </Div>
        </Overlay>
      )}

      {/* Ban/Unban Confirmation Dialog */}
      {banConfirmDialog && (
        <Overlay className="absolute inset-0 bg-slate-900/40 items-center justify-center p-4" onClick={cancelBanRestaurant} onClose={cancelBanRestaurant}>
          <Div className="bg-white rounded-xl border border-slate-200 w-full p-4 gap-3" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <Div className="flex-row items-center gap-3">
              <Div className={`w-11 h-11 rounded-full items-center justify-center ${banConfirmDialog.action === 'ban' ? 'bg-red-100' : 'bg-green-100'}`}>
                {banConfirmDialog.action === 'ban' ? (
                  <UiIcon as={AlertTriangle} size={20} className="text-red-700" />
                ) : (
                  <UiIcon as={CheckCircle2} size={20} className="text-green-700" />
                )}
              </Div>
              <Div className="flex-1">
                <H3 className="text-base font-semibold text-slate-900">{banConfirmDialog.action === 'ban' ? 'Ban restaurant' : 'Unban restaurant'}</H3>
                <P className="text-sm text-slate-500" numberOfLines={2}>
                  {banConfirmDialog.restaurant.name}
                </P>
              </Div>
            </Div>

            <P className="text-sm text-slate-700">
              {banConfirmDialog.action === 'ban'
                ? 'Are you sure you want to ban this restaurant? They will not be able to receive orders or access their account.'
                : 'Are you sure you want to unban this restaurant?'}
            </P>

            <Div className="flex-row items-center gap-2">
              <HButton onClick={cancelBanRestaurant} disabled={banning} className={`${BTN_SECONDARY} flex-1`}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </HButton>
              <HButton
                onClick={confirmBanRestaurant}
                disabled={banning}
                className={`${banConfirmDialog.action === 'ban' ? BTN_DANGER : BTN_PRIMARY} flex-1`}
              >
                {banning ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
                <Span className={BTN_TEXT_PRIMARY}>
                  {banning ? (banConfirmDialog.action === 'ban' ? 'Banning…' : 'Unbanning…') : banConfirmDialog.action === 'ban' ? 'Ban restaurant' : 'Unban restaurant'}
                </Span>
              </HButton>
            </Div>
          </Div>
        </Overlay>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog && (
        <Overlay className="absolute inset-0 bg-slate-900/40 items-center justify-center p-4" onClick={cancelDeleteRestaurant} onClose={cancelDeleteRestaurant}>
          <Div className="bg-white rounded-xl border border-slate-200 w-full p-4 gap-3" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <Div className="flex-row items-center gap-3">
              <Div className="w-11 h-11 rounded-full bg-red-100 items-center justify-center">
                <UiIcon as={Trash2} size={20} className="text-red-700" />
              </Div>
              <Div className="flex-1">
                <H3 className="text-base font-semibold text-slate-900">Delete restaurant</H3>
                <P className="text-sm text-slate-500" numberOfLines={2}>
                  {deleteConfirmDialog.restaurant.name}
                </P>
              </Div>
            </Div>

            <P className="text-sm text-slate-700">
              Are you sure you want to delete this restaurant? This action cannot be undone and will permanently remove all restaurant data, including orders,
              menu items, and settings.
            </P>

            <Div className="flex-row items-center gap-2">
              <HButton onClick={cancelDeleteRestaurant} disabled={deleting} className={`${BTN_SECONDARY} flex-1`}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </HButton>
              <HButton onClick={confirmDeleteRestaurant} disabled={deleting} className={`${BTN_DANGER} flex-1`}>
                {deleting ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
                <Span className={BTN_TEXT_PRIMARY}>{deleting ? 'Deleting…' : 'Delete restaurant'}</Span>
              </HButton>
            </Div>
          </Div>
        </Overlay>
      )}
    </AdminPage>
  );
}
