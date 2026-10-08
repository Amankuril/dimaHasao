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
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  Building2,
  User,
  FileText,
  CreditCard,
  Calendar,
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
import {
  A,
  Button as HButton,
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
  Overlay,
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
} from '../../../../components/web';
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
const approvalStatusBadgeClass = (status) => {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'rejected') return 'bg-rose-100 text-rose-700';
  if (status === 'banned') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
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
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating || 0);
    return (
      <Div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <UiIcon as={Star} key={i} className={`w-3.5 h-3.5 ${i < fullStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
        ))}
        <Span className="ml-1 text-slate-600">({rating || 0})</Span>
      </Div>
    );
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
  return (
    <ScrollDiv className="h-full bg-slate-50 p-4 lg:p-6">
      <Div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-3">
              <H1 className="text-2xl font-bold text-slate-900">Restaurants List</H1>
            </Div>
          </Div>
        </Div>

        {/* Summary Cards */}
        <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          {/* Total Restaurants */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-between">
              <Div>
                <P className="text-sm font-medium text-slate-600 mb-1">Total restaurants</P>
                <P className="text-2xl font-bold text-slate-900">
                  {loading ? <Span className="inline-block w-12 h-6 rounded bg-slate-200 animate-pulse" /> : totalRestaurants}
                </P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <UiIcon as={Building2} className="w-6 h-6 text-blue-600" />
              </Div>
            </Div>
          </Div>

          {/* Active Restaurants */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-between">
              <Div>
                <P className="text-sm font-medium text-slate-600 mb-1">Active restaurants</P>
                <P className="text-2xl font-bold text-slate-900">
                  {loading ? <Span className="inline-block w-12 h-6 rounded bg-slate-200 animate-pulse" /> : activeRestaurants}
                </P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <UiIcon as={Utensils} className="w-6 h-6 text-green-600" />
              </Div>
            </Div>
          </Div>

          {/* Inactive Restaurants */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-between">
              <Div>
                <P className="text-sm font-medium text-slate-600 mb-1">Inactive restaurants</P>
                <P className="text-2xl font-bold text-slate-900">
                  {loading ? <Span className="inline-block w-12 h-6 rounded bg-slate-200 animate-pulse" /> : inactiveRestaurants}
                </P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <UiIcon as={UtensilsCrossed} className="w-6 h-6 text-slate-600" />
              </Div>
            </Div>
          </Div>

          {/* Rejected Restaurants */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-between">
              <Div>
                <P className="text-sm font-medium text-slate-600 mb-1">Rejected restaurants</P>
                <P className="text-2xl font-bold text-slate-900">
                  {loading ? <Span className="inline-block w-12 h-6 rounded bg-slate-200 animate-pulse" /> : rejectedCount}
                </P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <UiIcon as={AlertTriangle} className="w-6 h-6 text-red-600" />
              </Div>
            </Div>
          </Div>

          {/* Banned Restaurants */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-between">
              <Div>
                <P className="text-sm font-medium text-slate-600 mb-1">Banned restaurants</P>
                <P className="text-2xl font-bold text-slate-900">
                  {loading ? <Span className="inline-block w-12 h-6 rounded bg-slate-200 animate-pulse" /> : bannedCount}
                </P>
              </Div>
              <Div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <UiIcon as={ShieldX} className="w-6 h-6 text-orange-600" />
              </Div>
            </Div>
          </Div>
        </Div>

        {/* Restaurants List Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Div className="flex flex-wrap items-center gap-3">
              <HButton
                type="button"
                onClick={() => setViewMode('active')}
                className={`px-4 py-2.5 text-sm font-semibold rounded-lg border transition-all outline-none ${viewMode === 'active' ? 'border-blue-600 bg-blue-50/50 text-blue-600' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Restaurants List
              </HButton>
              <HButton
                type="button"
                onClick={() => setViewMode('rejected')}
                className={`px-4 py-2.5 text-sm font-semibold rounded-lg border transition-all outline-none ${viewMode === 'rejected' ? 'border-red-600 bg-red-50/50 text-red-600' : 'border-red-200/80 bg-white text-red-500 hover:bg-red-50/50'}`}
              >
                Rejected Restaurants
              </HButton>
              <HButton
                type="button"
                onClick={() => setViewMode('banned')}
                className={`px-4 py-2.5 text-sm font-semibold rounded-lg border transition-all outline-none ${viewMode === 'banned' ? 'border-rose-600 bg-rose-50/50 text-rose-600' : 'border-rose-200/80 bg-white text-rose-500 hover:bg-rose-50/50'}`}
              >
                Banned Restaurants
              </HButton>
            </Div>

            <Div className="flex flex-wrap items-center gap-3">
              {viewMode === 'active' && (
                <HButton
                  onClick={() => navigate('/admin/food/restaurants/add')}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-all"
                >
                  <UiIcon as={Plus} className="w-4 h-4" />
                  <Span>Add Restaurant</Span>
                </HButton>
              )}
              <Div className="relative flex-1 sm:flex-initial min-w-[250px]">
                <Input
                  type="text"
                  placeholder="Ex: search by Restaurant n"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <HButton className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                    <UiIcon as={Download} className="w-4 h-4" />
                    <Span>Export</Span>
                    <UiIcon as={ChevronDown} className="w-3 h-3" />
                  </HButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                >
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExport} className="cursor-pointer flex items-center gap-2">
                    <UiIcon as={FileText} className="w-4 h-4" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Div>
          </Div>

          {/* Table */}
          <Div>
            {loading ? (
              <Div className="flex items-center justify-center py-20">
                <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-600" />
                <Span className="ml-3 text-slate-600">Loading restaurants...</Span>
              </Div>
            ) : error ? (
              <Div className="flex flex-col items-center justify-center py-20">
                <P className="text-lg font-semibold text-red-600 mb-1">Error Loading Data</P>
                <P className="text-sm text-slate-500 mb-4">{error}</P>
                <HButton
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </HButton>
              </Div>
            ) : (
              <Table cols={[64, 240, 170, 130, 100, 140, 132]} className="w-full">
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    <Th
                      className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('sl')}
                    >
                      <Div className="flex items-center gap-1">
                        <Span>SL</Span>
                        <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'sl' ? 'text-blue-600' : 'text-slate-400'}`} />
                      </Div>
                    </Th>
                    <Th
                      className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <Div className="flex items-center gap-1">
                        <Span>Restaurant Info</Span>
                        <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'name' ? 'text-blue-600' : 'text-slate-400'}`} />
                      </Div>
                    </Th>
                    <Th
                      className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('owner')}
                    >
                      <Div className="flex items-center gap-1">
                        <Span>Owner Info</Span>
                        <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'owner' ? 'text-blue-600' : 'text-slate-400'}`} />
                      </Div>
                    </Th>
                    <Th
                      className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('zone')}
                    >
                      <Div className="flex items-center gap-1">
                        <Span>Zone</Span>
                        <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'zone' ? 'text-blue-600' : 'text-slate-400'}`} />
                      </Div>
                    </Th>
                    <Th
                      className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('rating')}
                    >
                      <Div className="flex items-center gap-1">
                        <Span>Rating</Span>
                        <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'rating' ? 'text-blue-600' : 'text-slate-400'}`} />
                      </Div>
                    </Th>
                    <Th
                      className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <Div className="flex items-center gap-1">
                        <Span>Status</Span>
                        <UiIcon as={ArrowUpDown} className={`w-3 h-3 ${sortConfig.key === 'status' ? 'text-blue-600' : 'text-slate-400'}`} />
                      </Div>
                    </Th>
                    <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {filteredRestaurants.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} className="px-6 py-20 text-center">
                        <Div className="flex flex-col items-center justify-center">
                          <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                          <P className="text-sm text-slate-500">No restaurants match your search</P>
                        </Div>
                      </Td>
                    </Tr>
                  ) : (
                    filteredRestaurants.map((restaurant, index) => {
                      return (
                        <Tr key={restaurant.id} className="hover:bg-slate-50 transition-colors">
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{index + 1}</Span>
                          </Td>
                          <Td className="px-6 py-4">
                            <Div className="flex items-center gap-3">
                              <Div
                                className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-all border border-slate-100"
                                onClick={() => handleViewDetails(restaurant)}
                              >
                                <Img src={restaurant.logo} alt={restaurant.name} className="w-full h-full object-cover" fallback={PLACEHOLDER_40} />
                              </Div>
                              <Div className="flex flex-col">
                                <Span
                                  className="text-sm font-medium text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                                  onClick={() => handleViewDetails(restaurant)}
                                >
                                  {restaurant.name}
                                </Span>
                                <Span className="text-xs text-slate-500">
                                  ID #
                                  {formatRestaurantId(restaurant.originalData?.restaurantId || restaurant.originalData?._id || restaurant._id || restaurant.id)}
                                </Span>
                                <Span className="text-xs text-slate-500">{renderStars(restaurant.rating)}</Span>
                              </Div>
                            </Div>
                          </Td>
                          <Td className="px-6 py-4">
                            <Div className="flex flex-col">
                              <Span className="text-sm font-medium text-slate-900">{restaurant.ownerName}</Span>
                              <Span className="text-xs text-slate-500">{formatPhone(restaurant.ownerPhone)}</Span>
                            </Div>
                          </Td>
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm text-slate-700">{restaurant.zone}</Span>
                          </Td>
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Div className="flex items-center gap-1.5">
                              <UiIcon as={Star} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <Span className="text-sm font-semibold text-slate-900">{(Number(restaurant.rating) || 0).toFixed(1)}</Span>
                            </Div>
                          </Td>
                          <Td className="px-6 py-4 whitespace-nowrap">
                            {viewMode === 'banned' ? (
                              <Div className="flex flex-col gap-1">
                                <Span className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-rose-100 text-rose-700">
                                  Banned
                                </Span>
                                <Span className="text-[11px] text-slate-500">Outlet: Offline</Span>
                              </Div>
                            ) : viewMode === 'rejected' ? (
                              <Div className="flex flex-col gap-1">
                                <Span className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700">
                                  Rejected
                                </Span>
                                <Span className="text-[11px] text-slate-500">Outlet: Offline</Span>
                              </Div>
                            ) : (
                              <Div className="flex flex-col gap-1">
                                <Span
                                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${approvalStatusBadgeClass(restaurant.approvalStatus)}`}
                                >
                                  {approvalStatusLabel(restaurant.approvalStatus)}
                                </Span>
                                <Span className="text-[11px] text-slate-500">Outlet: {restaurant.isActive ? 'Active' : 'Inactive'}</Span>
                              </Div>
                            )}
                          </Td>
                          <Td className="px-6 py-4 whitespace-nowrap text-center">
                            <Div className="flex items-center justify-center gap-2">
                              <HButton onClick={() => handleViewDetails(restaurant)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                                <UiIcon as={Eye} className="w-4 h-4" />
                              </HButton>
                              {viewMode === 'banned' && (
                                <HButton
                                  onClick={() => handleBanRestaurant(restaurant)}
                                  className="p-1.5 rounded text-green-600 hover:bg-green-50 transition-colors"
                                >
                                  <UiIcon as={ShieldCheck} className="w-4 h-4" />
                                </HButton>
                              )}
                              {viewMode === 'active' && (
                                <HButton
                                  onClick={() => handleBanRestaurant(restaurant)}
                                  className={`p-1.5 rounded transition-colors ${!restaurant.isActive ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                                >
                                  <UiIcon as={ShieldX} className="w-4 h-4" />
                                </HButton>
                              )}
                              {viewMode !== 'rejected' && (
                                <HButton
                                  onClick={() => handleDeleteRestaurant(restaurant)}
                                  className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <UiIcon as={Trash2} className="w-4 h-4" />
                                </HButton>
                              )}
                            </Div>
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </Tbody>
              </Table>
            )}
          </Div>
        </Div>
      </Div>

      {/* Restaurant Details Modal */}
      {selectedRestaurant && (
        <Overlay
          className="fixed inset-0 bg-slate-900/10 z-100 flex items-center justify-center p-4 lg:p-8"
          onClick={closeDetailsModal}
          onClose={closeDetailsModal}
        >
          <Div
            className="bg-white rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-200/60 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-400"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <Div className="px-8 py-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white/80">
              <Div>
                <H2 className="text-2xl font-bold text-slate-900">Restaurant Details</H2>
                <P className="text-sm text-slate-500 mt-1">Detailed overview and information</P>
              </Div>
              <Div className="flex items-center gap-2">
                {normalizeApprovalStatus(restaurantDetails || selectedRestaurant?.originalData || selectedRestaurant) !== 'rejected' &&
                  (!isEditingDetails ? (
                    <HButton
                      onClick={handleStartEditDetails}
                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                    >
                      Edit Details
                    </HButton>
                  ) : (
                    <>
                      <HButton
                        onClick={handleCancelEditDetails}
                        disabled={savingDetails}
                        className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors disabled:opacity-60"
                      >
                        Cancel
                      </HButton>
                      <HButton
                        onClick={handleSaveDetails}
                        disabled={savingDetails}
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
                      >
                        {savingDetails && <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />}
                        {savingDetails ? 'Saving...' : 'Save Changes'}
                      </HButton>
                    </>
                  ))}
                <HButton
                  onClick={closeDetailsModal}
                  className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200 bg-slate-50"
                >
                  <UiIcon as={X} className="w-5 h-5" />
                </HButton>
              </Div>
            </Div>

            {/* Modal Content - Scrollable area */}
            <ScrollDiv className="flex-shrink p-8">
              {loadingDetails && (
                <Div className="flex flex-col items-center justify-center py-24">
                  <Div className="relative">
                    <Div className="w-12 h-12 rounded-full border-4 border-slate-100"></Div>
                    <Div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></Div>
                  </Div>
                  <Span className="mt-4 text-slate-500 font-medium tracking-wide">Fetching restaurant data...</Span>
                </Div>
              )}
              {!loadingDetails && isEditingDetails && (
                <Div className="space-y-6">
                  <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Div className="md:col-span-2">
                      <P className="text-xs text-slate-500 mb-2">Profile Image</P>
                      <Div className="flex items-center gap-4">
                        <Div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          {profileImagePreview ? (
                            <Img src={profileImagePreview} alt="Profile preview" className="w-full h-full object-cover" />
                          ) : (
                            <Div className="w-full h-full flex items-center justify-center text-slate-400">
                              <UiIcon as={ImageIcon} className="w-6 h-6" />
                            </Div>
                          )}
                        </Div>
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
                          className="flex-1 flex-row items-center gap-3"
                        >
                          <Span className="py-2 px-4 rounded-lg bg-slate-100 text-sm text-slate-700">Choose File</Span>
                          <Span className="flex-1 text-sm text-slate-700" numberOfLines={1}>
                            {profileImageFile?.name || 'No file chosen'}
                          </Span>
                        </HButton>
                      </Div>
                    </Div>

                    <Div>
                      <Label className="block text-xs text-slate-500 mb-1">Restaurant Name</Label>
                      <Input
                        type="text"
                        value={detailsForm.name}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </Div>
                    <Div>
                      <Label className="block text-xs text-slate-500 mb-1">Pure Veg</Label>
                      <Div className="flex items-center gap-2">
                        <HButton
                          type="button"
                          onClick={() =>
                            setDetailsForm((prev) => ({
                              ...prev,
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
                            setDetailsForm((prev) => ({
                              ...prev,
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
                      <Label className="block text-xs text-slate-500 mb-1">Restaurant Email</Label>
                      <Input
                        type="email"
                        value={detailsForm.email}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </Div>
                    <Div>
                      <Label className="block text-xs text-slate-500 mb-1">Owner Name</Label>
                      <Input
                        type="text"
                        value={detailsForm.ownerName}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            ownerName: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </Div>
                    <Div>
                      <Label className="block text-xs text-slate-500 mb-1">Owner Email</Label>
                      <Input
                        type="email"
                        value={detailsForm.ownerEmail}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            ownerEmail: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </Div>
                    <Div>
                      <Label className="block text-xs text-slate-500 mb-1">Owner Phone</Label>
                      <Input
                        type="text"
                        value={detailsForm.ownerPhone}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            ownerPhone: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </Div>
                    <Div>
                      <Label className="block text-xs text-slate-500 mb-1">Primary Contact</Label>
                      <Input
                        type="text"
                        value={detailsForm.primaryContactNumber}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            primaryContactNumber: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </Div>
                    <Div>
                      <Label className="block text-xs text-slate-500 mb-1">Opening Time</Label>
                      <Input
                        type="text"
                        value={detailsForm.openingTime}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            openingTime: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </Div>
                    <Div>
                      <Label className="block text-xs text-slate-500 mb-1">Closing Time</Label>
                      <Input
                        type="text"
                        value={detailsForm.closingTime}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            closingTime: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </Div>
                    <Div>
                      <Label className="block text-xs text-slate-500 mb-1">Estimated Delivery Time</Label>
                      <Input
                        type="text"
                        value={detailsForm.estimatedDeliveryTime}
                        onChange={(e) =>
                          setDetailsForm((prev) => ({
                            ...prev,
                            estimatedDeliveryTime: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </Div>
                    <Div className="md:col-span-2 flex items-center gap-3">
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
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
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
                  return (
                    <Div className="space-y-10">
                      {detailsApprovalStatus === 'rejected' && r?.rejectionReason && (
                        <Div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">
                          <P className="font-bold mb-1">Rejection Reason:</P>
                          <P className="text-red-700 font-normal">{r.rejectionReason}</P>
                        </Div>
                      )}
                      {/* Restaurant Basic Info */}
                      <Div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        <Div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-50 shrink-0 shadow-inner group">
                          <Img
                            src={profileImgUrl || PLACEHOLDER_128}
                            alt={r?.restaurantName || r?.name || 'Restaurant'}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            fallback={PLACEHOLDER_128}
                          />
                        </Div>
                        <Div className="flex-1 text-center md:text-left pt-2">
                          <Div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                            <H3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{r?.restaurantName || r?.name || 'N/A'}</H3>
                            <Div className="flex items-center justify-center md:justify-start gap-2">
                              {detailsApprovalStatus === 'banned' ? (
                                <Span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">Banned</Span>
                              ) : detailsApprovalStatus === 'rejected' ? (
                                <Span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-700">Rejected</Span>
                              ) : (
                                <Span
                                  className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${r?.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                >
                                  {r?.isActive !== false ? 'Active' : 'Inactive'}
                                </Span>
                              )}
                            </Div>
                          </Div>
                          <Div className="flex items-center justify-center md:justify-start gap-6 flex-wrap">
                            {r?.ratings?.average != null && (
                              <Div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 rounded-xl">
                                <UiIcon as={Star} className="w-4 h-4 fill-yellow-400 text-yellow-500" />
                                <Span className="text-sm font-bold text-yellow-700">{(r.ratings?.average ?? 0).toFixed(1)}</Span>
                                <Span className="text-xs text-yellow-600/70 ml-1 font-medium">({r.ratings?.count ?? 0} reviews)</Span>
                              </Div>
                            )}
                            <Div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                              <UiIcon as={Building2} className="w-4 h-4" />
                              <Span className="text-xs font-bold tracking-wider">{formatRestaurantId(r?.restaurantId || r?._id)}</Span>
                            </Div>
                          </Div>
                        </Div>
                      </Div>

                      <Div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                        {/* Owner Information */}
                        <Div className="space-y-6">
                          <Div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <UiIcon as={User} className="w-4 h-4 text-blue-600" />
                            <H4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Owner Information</H4>
                          </Div>
                          <Div className="space-y-4">
                            <Div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/30 border border-blue-100/30">
                              <Div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                <UiIcon as={User} className="w-5 h-5 text-blue-600" />
                              </Div>
                              <Div>
                                <P className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-0.5">Full Name</P>
                                <P className="text-base font-bold text-slate-800">{r?.ownerName || 'N/A'}</P>
                              </Div>
                            </Div>
                            <Div className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100/30">
                              <Div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                                <UiIcon as={Phone} className="w-5 h-5 text-emerald-600" />
                              </Div>
                              <Div>
                                <P className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Contact Number</P>
                                <P className="text-base font-bold text-slate-800">{r?.ownerPhone || r?.phone || 'N/A'}</P>
                              </Div>
                            </Div>
                            {(r?.ownerEmail || r?.email) && (
                              <Div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/30">
                                <Div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                  <UiIcon as={Mail} className="w-5 h-5 text-indigo-600" />
                                </Div>
                                <Div>
                                  <P className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-0.5">Email Address</P>
                                  <P className="text-base font-bold text-slate-800">{r.ownerEmail || r.email}</P>
                                </Div>
                              </Div>
                            )}
                          </Div>
                        </Div>

                        {/* Location & Contact */}
                        <Div>
                          <Div className="flex items-center justify-between mb-4">
                            <H4 className="text-lg font-semibold text-slate-900">Location & Contact</H4>
                            {isEditingLocation ? (
                              <Span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold">
                                <UiIcon as={Settings} className="w-3.5 h-3.5" />
                                Editable Below
                              </Span>
                            ) : null}
                          </Div>
                          <Div className="space-y-3">
                            {!isEditingLocation && hasFlatAddress && (
                              <Div className="flex items-start gap-3">
                                <UiIcon as={MapPin} className="w-5 h-5 text-slate-400 mt-0.5" />
                                <Div>
                                  <P className="text-xs text-slate-500">Address</P>
                                  <P className="text-sm font-medium text-slate-900">{displayAddress}</P>
                                </Div>
                              </Div>
                            )}
                            {isEditingLocation && (
                              <P className="text-xs text-indigo-700 font-medium bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                                Location editor is shown at the bottom of this details modal.
                              </P>
                            )}
                            {(r?.primaryContactNumber || r?.phone) && (
                              <Div className="flex items-center gap-3">
                                <UiIcon as={Phone} className="w-5 h-5 text-slate-400" />
                                <Div>
                                  <P className="text-xs text-slate-500">Primary Contact</P>
                                  <P className="text-sm font-medium text-slate-900">{r.primaryContactNumber || r.phone}</P>
                                </Div>
                              </Div>
                            )}
                            {r?.email && !r?.ownerEmail && (
                              <Div className="flex items-center gap-3">
                                <UiIcon as={Mail} className="w-5 h-5 text-slate-400" />
                                <Div>
                                  <P className="text-xs text-slate-500">Restaurant Email</P>
                                  <P className="text-sm font-medium text-slate-900">{r.email}</P>
                                </Div>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      </Div>

                      {/* Timings */}
                      <Div className="grid grid-cols-1 gap-6">
                        <Div>
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Timings & Status</H4>
                          <Div className="space-y-3">
                            {(openingTimeVal || closingTimeVal) && (
                              <Div className="flex items-center gap-3">
                                <UiIcon as={Clock} className="w-5 h-5 text-slate-400" />
                                <Div>
                                  <P className="text-xs text-slate-500">Opening / Closing</P>
                                  <P className="text-sm font-medium text-slate-900">
                                    {formatTime12Hour(openingTimeVal)} – {formatTime12Hour(closingTimeVal)}
                                  </P>
                                </Div>
                              </Div>
                            )}
                            {estimatedDeliveryTimeVal && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Estimated Delivery Time</P>
                                <P className="text-sm font-medium text-slate-900">{estimatedDeliveryTimeVal}</P>
                              </Div>
                            )}
                            {openDaysVal && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Open Days</P>
                                <Div className="flex flex-wrap gap-2">
                                  {openDaysVal.map((day, idx) => (
                                    <Span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium capitalize">
                                      {day}
                                    </Span>
                                  ))}
                                </Div>
                              </Div>
                            )}
                            <Div>
                              <P className="text-xs text-slate-500 mb-1">Status</P>
                              {detailsApprovalStatus === 'banned' ? (
                                <>
                                  <Span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-700">Banned</Span>
                                  <P className="mt-2 text-xs text-slate-500">Outlet: Offline</P>
                                </>
                              ) : (
                                <>
                                  <Span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${approvalStatusBadgeClass(detailsApprovalStatus)}`}
                                  >
                                    {approvalStatusLabel(detailsApprovalStatus)}
                                  </Span>
                                  <P className="mt-2 text-xs text-slate-500">Outlet: {r?.isActive !== false ? 'Active' : 'Inactive'}</P>
                                </>
                              )}
                            </Div>
                          </Div>
                        </Div>
                      </Div>

                      {/* Media */}
                      {(profileImgUrl || coverImages.length > 0 || menuImages.length > 0) && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Media</H4>
                          <Div className="space-y-4">
                            {profileImgUrl && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-2">Profile Image</P>
                                <A href={profileImgUrl} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
                                  <UiIcon as={ImageIcon} className="w-4 h-4" />
                                  <Span>View Profile Image</Span>
                                  <UiIcon as={ExternalLink} className="w-3 h-3" />
                                </A>
                              </Div>
                            )}
                            {coverImages.length > 0 && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-2">Restaurant Photos</P>
                                <Div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                  {coverImages.map((url, idx) => (
                                    <A
                                      key={`${url}-${idx}`}
                                      href={url}
                                      className="relative aspect-4/5 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:border-slate-300"
                                    >
                                      <HideOnErrorImg src={url} alt={`Restaurant ${idx + 1}`} className="w-full h-full object-cover" />
                                    </A>
                                  ))}
                                </Div>
                              </Div>
                            )}
                            {menuImages.length > 0 && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-2">Menu Images</P>
                                <Div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                  {menuImages.map((url, idx) => (
                                    <A
                                      key={`${url}-${idx}`}
                                      href={url}
                                      className="relative aspect-4/5 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:border-slate-300"
                                    >
                                      <HideOnErrorImg src={url} alt={`Menu ${idx + 1}`} className="w-full h-full object-cover" />
                                    </A>
                                  ))}
                                </Div>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* Registration Information */}
                      {(r?.createdAt || r?.updatedAt) && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Registration Information</H4>
                          <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {r.createdAt && (
                              <Div className="flex items-center gap-3">
                                <UiIcon as={Calendar} className="w-5 h-5 text-slate-400" />
                                <Div>
                                  <P className="text-xs text-slate-500 mb-1">Registration Date & Time</P>
                                  <P className="font-medium text-slate-900">
                                    {new Date(r.createdAt).toLocaleString('en-IN', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </P>
                                </Div>
                              </Div>
                            )}
                            {r.updatedAt && (
                              <Div className="flex items-center gap-3">
                                <UiIcon as={Calendar} className="w-5 h-5 text-slate-400" />
                                <Div>
                                  <P className="text-xs text-slate-500 mb-1">Last Updated</P>
                                  <P className="font-medium text-slate-900">
                                    {new Date(r.updatedAt).toLocaleString('en-IN', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </P>
                                </Div>
                              </Div>
                            )}
                            {r.restaurantId && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Restaurant ID</P>
                                <P className="font-medium text-slate-900">{formatRestaurantId(r.restaurantId)}</P>
                              </Div>
                            )}
                            {r.slug && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Slug</P>
                                <P className="font-medium text-slate-900">{r.slug}</P>
                              </Div>
                            )}
                            {r.phoneVerified !== undefined && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Phone Verified</P>
                                <P className="font-medium text-slate-900">{r.phoneVerified ? 'Yes' : 'No'}</P>
                              </Div>
                            )}
                            {r.signupMethod && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Signup Method</P>
                                <P className="font-medium text-slate-900 capitalize">{r.signupMethod}</P>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* Registration Documents - flat (PAN, GST, FSSAI, Bank) or onboarding.step3 */}
                      {hasRegistrationDocuments && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Registration Documents</H4>
                          <Div className="space-y-6">
                            {/* PAN – flat or onboarding.step3 */}
                            {hasPanSection && (
                              <Div className="bg-slate-50 rounded-lg p-4">
                                <H5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                  <UiIcon as={FileText} className="w-4 h-4" />
                                  PAN Details
                                </H5>
                                <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {(r.panNumber || r?.onboarding?.step3?.pan?.panNumber) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">PAN Number</P>
                                      <P className="font-medium text-slate-900">{r.panNumber || r.onboarding?.step3?.pan?.panNumber}</P>
                                    </Div>
                                  )}
                                  {(r.nameOnPan || r?.onboarding?.step3?.pan?.nameOnPan) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">Name on PAN</P>
                                      <P className="font-medium text-slate-900">{r.nameOnPan || r.onboarding?.step3?.pan?.nameOnPan}</P>
                                    </Div>
                                  )}
                                  {panDocumentUrl && (
                                    <Div className="md:col-span-2">
                                      <P className="text-xs text-slate-500 mb-2">PAN Document</P>
                                      <A href={panDocumentUrl} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
                                        <UiIcon as={ImageIcon} className="w-4 h-4" />
                                        <Span>View PAN Document</Span>
                                        <UiIcon as={ExternalLink} className="w-3 h-3" />
                                      </A>
                                    </Div>
                                  )}
                                </Div>
                              </Div>
                            )}

                            {/* GST – flat or onboarding.step3 */}
                            {hasGstSection && (
                              <Div className="bg-slate-50 rounded-lg p-4">
                                <H5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                  <UiIcon as={FileText} className="w-4 h-4" />
                                  GST Details
                                </H5>
                                <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {(r.gstRegistered != null || r?.onboarding?.step3?.gst?.isRegistered != null) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">GST Registered</P>
                                      <P className="font-medium text-slate-900">
                                        {r.gstRegistered != null ? (r.gstRegistered ? 'Yes' : 'No') : r?.onboarding?.step3?.gst?.isRegistered ? 'Yes' : 'No'}
                                      </P>
                                    </Div>
                                  )}
                                  {(r.gstNumber || r?.onboarding?.step3?.gst?.gstNumber) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">GST Number</P>
                                      <P className="font-medium text-slate-900">{r.gstNumber || r.onboarding?.step3?.gst?.gstNumber}</P>
                                    </Div>
                                  )}
                                  {(r.gstLegalName || r?.onboarding?.step3?.gst?.legalName) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">Legal Name</P>
                                      <P className="font-medium text-slate-900">{r.gstLegalName || r.onboarding?.step3?.gst?.legalName}</P>
                                    </Div>
                                  )}
                                  {(r.gstAddress || r?.onboarding?.step3?.gst?.address) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">GST Address</P>
                                      <P className="font-medium text-slate-900">{r.gstAddress || r.onboarding?.step3?.gst?.address}</P>
                                    </Div>
                                  )}
                                  {gstDocumentUrl && (
                                    <Div className="md:col-span-2">
                                      <P className="text-xs text-slate-500 mb-2">GST Document</P>
                                      <A href={gstDocumentUrl} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
                                        <UiIcon as={ImageIcon} className="w-4 h-4" />
                                        <Span>View GST Document</Span>
                                        <UiIcon as={ExternalLink} className="w-3 h-3" />
                                      </A>
                                    </Div>
                                  )}
                                </Div>
                              </Div>
                            )}

                            {/* FSSAI – flat or onboarding.step3 */}
                            {hasFssaiSection && (
                              <Div className="bg-slate-50 rounded-lg p-4">
                                <H5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                  <UiIcon as={FileText} className="w-4 h-4" />
                                  FSSAI Details
                                </H5>
                                <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {(r.fssaiNumber || r?.onboarding?.step3?.fssai?.registrationNumber) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">FSSAI Registration Number</P>
                                      <P className="font-medium text-slate-900">{r.fssaiNumber || r.onboarding?.step3?.fssai?.registrationNumber}</P>
                                    </Div>
                                  )}
                                  {(r.fssaiExpiry || r?.onboarding?.step3?.fssai?.expiryDate) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">FSSAI Expiry Date</P>
                                      <P className="font-medium text-slate-900">
                                        {new Date(r.fssaiExpiry || r.onboarding?.step3?.fssai?.expiryDate).toLocaleDateString('en-IN', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                        })}
                                      </P>
                                    </Div>
                                  )}
                                  {fssaiDocumentUrl && (
                                    <Div className="md:col-span-2">
                                      <P className="text-xs text-slate-500 mb-2">FSSAI Document</P>
                                      <A href={fssaiDocumentUrl} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
                                        <UiIcon as={ImageIcon} className="w-4 h-4" />
                                        <Span>View FSSAI Document</Span>
                                        <UiIcon as={ExternalLink} className="w-3 h-3" />
                                      </A>
                                    </Div>
                                  )}
                                </Div>
                              </Div>
                            )}

                            {/* Bank – flat or onboarding.step3 */}
                            {hasBankSection && (
                              <Div className="bg-slate-50 rounded-lg p-4">
                                <H5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                  <UiIcon as={CreditCard} className="w-4 h-4" />
                                  Bank Details
                                </H5>
                                <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {(r.accountNumber || r?.onboarding?.step3?.bank?.accountNumber) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">Account Number</P>
                                      <P className="font-medium text-slate-900">{r.accountNumber || r.onboarding?.step3?.bank?.accountNumber}</P>
                                    </Div>
                                  )}
                                  {(r.ifscCode || r?.onboarding?.step3?.bank?.ifscCode) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">IFSC Code</P>
                                      <P className="font-medium text-slate-900">{r.ifscCode || r.onboarding?.step3?.bank?.ifscCode}</P>
                                    </Div>
                                  )}
                                  {(r.accountHolderName || r?.onboarding?.step3?.bank?.accountHolderName) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">Account Holder Name</P>
                                      <P className="font-medium text-slate-900">{r.accountHolderName || r.onboarding?.step3?.bank?.accountHolderName}</P>
                                    </Div>
                                  )}
                                  {(r.accountType || r?.onboarding?.step3?.bank?.accountType) && (
                                    <Div>
                                      <P className="text-xs text-slate-500 mb-1">Account Type</P>
                                      <P className="font-medium text-slate-900 capitalize">{r.accountType || r.onboarding?.step3?.bank?.accountType}</P>
                                    </Div>
                                  )}
                                </Div>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* Address at registration (flat) */}
                      {hasFlatAddress && !r?.onboarding?.step1?.location && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Address (at registration)</H4>
                          <P className="text-sm font-medium text-slate-900">{displayAddress}</P>
                        </Div>
                      )}

                      {/* Onboarding Step 1 Details */}
                      {r?.onboarding?.step1 && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Registration Step 1 Details</H4>
                          <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {r.onboarding.step1.restaurantName && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Restaurant Name (at registration)</P>
                                <P className="font-medium text-slate-900">{r.onboarding.step1.restaurantName}</P>
                              </Div>
                            )}
                            {r.onboarding.step1.ownerName && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Owner Name (at registration)</P>
                                <P className="font-medium text-slate-900">{r.onboarding.step1.ownerName}</P>
                              </Div>
                            )}
                            {r.onboarding.step1.ownerEmail && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Owner Email (at registration)</P>
                                <P className="font-medium text-slate-900">{r.onboarding.step1.ownerEmail}</P>
                              </Div>
                            )}
                            {r.onboarding.step1.ownerPhone && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Owner Phone (at registration)</P>
                                <P className="font-medium text-slate-900">{r.onboarding.step1.ownerPhone}</P>
                              </Div>
                            )}
                            {r.onboarding.step1.primaryContactNumber && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Primary Contact (at registration)</P>
                                <P className="font-medium text-slate-900">{r.onboarding.step1.primaryContactNumber}</P>
                              </Div>
                            )}
                            {r.onboarding.step1.location && (
                              <Div className="md:col-span-2">
                                <P className="text-xs text-slate-500 mb-1">Location (at registration)</P>
                                <P className="font-medium text-slate-900">
                                  {r.onboarding.step1.location.addressLine1 || ''}
                                  {r.onboarding.step1.location.addressLine2 && `, ${r.onboarding.step1.location.addressLine2}`}
                                  {r.onboarding.step1.location.area && `, ${r.onboarding.step1.location.area}`}
                                  {r.onboarding.step1.location.city && `, ${r.onboarding.step1.location.city}`}
                                  {r.onboarding.step1.location.landmark && `, ${r.onboarding.step1.location.landmark}`}
                                </P>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* Onboarding Step 2 Details */}
                      {r?.onboarding?.step2 && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Registration Step 2 Details</H4>
                          <Div className="space-y-4">
                            {r.onboarding.step2.cuisines && Array.isArray(r.onboarding.step2.cuisines) && r.onboarding.step2.cuisines.length > 0 && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-2">Cuisines (at registration)</P>
                                <Div className="flex flex-wrap gap-2">
                                  {r.onboarding.step2.cuisines.map((cuisine, idx) => (
                                    <Span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                      {cuisine}
                                    </Span>
                                  ))}
                                </Div>
                              </Div>
                            )}
                            {r.onboarding.step2.deliveryTimings && (
                              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <Div>
                                  <P className="text-xs text-slate-500 mb-1">Opening Time (at registration)</P>
                                  <P className="font-medium text-slate-900">{formatTime12Hour(r.onboarding.step2.deliveryTimings.openingTime)}</P>
                                </Div>
                                <Div>
                                  <P className="text-xs text-slate-500 mb-1">Closing Time (at registration)</P>
                                  <P className="font-medium text-slate-900">{formatTime12Hour(r.onboarding.step2.deliveryTimings.closingTime)}</P>
                                </Div>
                              </Div>
                            )}
                            {r.onboarding.step2.openDays && Array.isArray(r.onboarding.step2.openDays) && r.onboarding.step2.openDays.length > 0 && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-2">Open Days (at registration)</P>
                                <Div className="flex flex-wrap gap-2">
                                  {r.onboarding.step2.openDays.map((day, idx) => (
                                    <Span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium capitalize">
                                      {day}
                                    </Span>
                                  ))}
                                </Div>
                              </Div>
                            )}
                            {r.onboarding.step2.profileImageUrl?.url && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-2">Profile Image (at registration)</P>
                                <A href={r.onboarding.step2.profileImageUrl.url} className="inline-block">
                                  <Img
                                    src={r.onboarding.step2.profileImageUrl.url}
                                    alt="Profile"
                                    className="w-32 h-32 rounded-lg object-cover border border-slate-200 hover:border-blue-500 transition-colors"
                                    fallback={PLACEHOLDER_128}
                                  />
                                </A>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* Onboarding Step 4 Details */}
                      {r?.onboarding?.step4 && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Registration Step 4 Details</H4>
                          <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {r.onboarding.step4.estimatedDeliveryTime && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Estimated Delivery Time (at registration)</P>
                                <P className="font-medium text-slate-900">{r.onboarding.step4.estimatedDeliveryTime}</P>
                              </Div>
                            )}
                            {r.onboarding.step4.distance && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Distance (at registration)</P>
                                <P className="font-medium text-slate-900">{r.onboarding.step4.distance}</P>
                              </Div>
                            )}
                            {r.onboarding.step4.featuredDish && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Featured Dish (at registration)</P>
                                <P className="font-medium text-slate-900">{r.onboarding.step4.featuredDish}</P>
                              </Div>
                            )}
                            {r.onboarding.step4.offer && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Offer (at registration)</P>
                                <P className="font-medium text-green-600">{r.onboarding.step4.offer}</P>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      )}

                      {/* Additional Information */}
                      {(r?.slug || r?.restaurantId || r?.phoneVerified !== undefined || r?.signupMethod) && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Additional Information</H4>
                          <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {r?.slug && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Slug</P>
                                <P className="font-medium text-slate-900">{r.slug}</P>
                              </Div>
                            )}
                            {r?.restaurantId && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Restaurant ID</P>
                                <P className="font-medium text-slate-900">{formatRestaurantId(r.restaurantId)}</P>
                              </Div>
                            )}
                            {r?.phoneVerified !== undefined && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Phone Verified</P>
                                <P className="font-medium text-slate-900">{r.phoneVerified ? 'Yes' : 'No'}</P>
                              </Div>
                            )}
                            {r?.signupMethod && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Signup Method</P>
                                <P className="font-medium text-slate-900 capitalize">{r.signupMethod}</P>
                              </Div>
                            )}
                            {r?.onboarding?.completedSteps !== undefined && (
                              <Div>
                                <P className="text-xs text-slate-500 mb-1">Onboarding Steps Completed</P>
                                <P className="font-medium text-slate-900">{r.onboarding.completedSteps} / 4</P>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      )}

                      {isEditingLocation && (
                        <Div className="pt-6 border-t border-slate-200">
                          <H4 className="text-lg font-semibold text-slate-900 mb-4">Location Editor</H4>
                          <Div className="space-y-3 border border-indigo-100 bg-indigo-50/40 rounded-xl p-4">
                            <P className="text-xs text-indigo-700 font-semibold">Update restaurant location using dropdown (accurate) + select service zone.</P>
                            <Div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Div className="md:col-span-2">
                                <Label className="block text-xs text-slate-600 mb-1 font-semibold">Service Zone*</Label>
                                <Select
                                  value={locationForm.zoneId || ''}
                                  onChange={(e) =>
                                    setLocationForm((prev) => ({
                                      ...prev,
                                      zoneId: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                                >
                                  <Option value="">{zonesLoading ? 'Loading zones...' : 'Select a zone'}</Option>
                                  {zones.map((z) => (
                                    <Option key={z._id || z.id} value={z._id || z.id}>
                                      {z.name || z.zoneName || z.serviceLocation || 'Zone'}
                                    </Option>
                                  ))}
                                </Select>
                              </Div>

                              <Div className="md:col-span-2">
                                <Label className="block text-xs text-slate-600 mb-1 font-semibold">Search location*</Label>
                                <PlacesSearchInput
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                                  placeholder="Start typing and choose from dropdown..."
                                  onPlace={handlePlaceSelected}
                                  onError={setLocationEditError}
                                />
                                <P className="text-[11px] text-slate-500 mt-1">Select from dropdown to auto-fill address and coordinates.</P>
                              </Div>

                              <Div className="md:col-span-2">
                                <Label className="block text-xs text-slate-500 mb-1">Formatted Address</Label>
                                <Input
                                  type="text"
                                  value={locationForm.formattedAddress}
                                  readOnly
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
                                />
                              </Div>
                              <Div>
                                <Label className="block text-xs text-slate-500 mb-1">Area</Label>
                                <Input
                                  type="text"
                                  value={locationForm.area}
                                  readOnly
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
                                />
                              </Div>
                              <Div>
                                <Label className="block text-xs text-slate-500 mb-1">City</Label>
                                <Input
                                  type="text"
                                  value={locationForm.city}
                                  readOnly
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
                                />
                              </Div>
                              <Div>
                                <Label className="block text-xs text-slate-500 mb-1">State</Label>
                                <Input
                                  type="text"
                                  value={locationForm.state}
                                  readOnly
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
                                />
                              </Div>
                              <Div>
                                <Label className="block text-xs text-slate-500 mb-1">Pincode</Label>
                                <Input
                                  type="text"
                                  value={locationForm.pincode}
                                  readOnly
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm"
                                />
                              </Div>
                              <Div className="md:col-span-2">
                                <Label className="block text-xs text-slate-500 mb-1">Landmark (optional)</Label>
                                <Input
                                  type="text"
                                  value={locationForm.landmark}
                                  onChange={(e) =>
                                    setLocationForm((prev) => ({
                                      ...prev,
                                      landmark: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                                />
                              </Div>
                            </Div>

                            {locationEditError && <P className="text-xs text-red-600">{locationEditError}</P>}
                            <HButton
                              onClick={handleSaveLocation}
                              disabled={savingLocation}
                              className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white ${savingLocation ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                              {savingLocation ? 'Saving...' : 'Save Location'}
                            </HButton>
                          </Div>
                        </Div>
                      )}
                    </Div>
                  );
                })()}
              {!loadingDetails && !restaurantDetails && !selectedRestaurant && (
                <Div className="flex flex-col items-center justify-center py-20">
                  <P className="text-lg font-semibold text-slate-700 mb-2">No Details Available</P>
                  <P className="text-sm text-slate-500">Unable to load restaurant details</P>
                </Div>
              )}
            </ScrollDiv>
          </Div>
        </Overlay>
      )}

      {/* Ban/Unban Confirmation Dialog */}
      {banConfirmDialog && (
        <Overlay
          className="fixed inset-0 bg-slate-900/10 z-50 flex items-center justify-center p-4"
          onClick={cancelBanRestaurant}
          onClose={cancelBanRestaurant}
        >
          <Div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <Div className="p-6">
              <Div className="flex items-center gap-4 mb-4">
                <Div className={`w-12 h-12 rounded-full flex items-center justify-center ${banConfirmDialog.action === 'ban' ? 'bg-red-100' : 'bg-green-100'}`}>
                  {banConfirmDialog.action === 'ban' ? (
                    <UiIcon as={AlertTriangle} className="w-6 h-6 text-red-600" />
                  ) : (
                    <UiIcon as={CheckCircle2} className="w-6 h-6 text-green-600" />
                  )}
                </Div>
                <Div>
                  <H3 className="text-lg font-bold text-slate-900">{banConfirmDialog.action === 'ban' ? 'Ban Restaurant' : 'Unbanned Restaurant'}</H3>
                  <P className="text-sm text-slate-600">{banConfirmDialog.restaurant.name}</P>
                </Div>
              </Div>

              <P className="text-sm text-slate-700 mb-6">
                {banConfirmDialog.action === 'ban'
                  ? 'Are you sure you want to ban this restaurant? They will not be able to receive orders or access their account.'
                  : 'Are you sure you want to unbanned this Restautant?'}
              </P>

              <Div className="flex items-center gap-3">
                <HButton
                  onClick={cancelBanRestaurant}
                  disabled={banning}
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </HButton>
                <HButton
                  onClick={confirmBanRestaurant}
                  disabled={banning}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${banConfirmDialog.action === 'ban' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {banning ? (
                    <Span className="flex items-center justify-center gap-2">
                      <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                      {banConfirmDialog.action === 'ban' ? 'Banning...' : 'Unbanning...'}
                    </Span>
                  ) : banConfirmDialog.action === 'ban' ? (
                    'Ban Restaurant'
                  ) : (
                    'Unbanned Restaurant'
                  )}
                </HButton>
              </Div>
            </Div>
          </Div>
        </Overlay>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog && (
        <Overlay
          className="fixed inset-0 bg-slate-900/10 z-50 flex items-center justify-center p-4"
          onClick={cancelDeleteRestaurant}
          onClose={cancelDeleteRestaurant}
        >
          <Div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <Div className="p-6">
              <Div className="flex items-center gap-4 mb-4">
                <Div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <UiIcon as={Trash2} className="w-6 h-6 text-red-600" />
                </Div>
                <Div>
                  <H3 className="text-lg font-bold text-slate-900">Delete Restaurant</H3>
                  <P className="text-sm text-slate-600">{deleteConfirmDialog.restaurant.name}</P>
                </Div>
              </Div>

              <P className="text-sm text-slate-700 mb-6">
                Are you sure you want to delete this restaurant? This action cannot be undone and will permanently remove all restaurant data, including orders,
                menu items, and settings.
              </P>

              <Div className="flex items-center gap-3">
                <HButton
                  onClick={cancelDeleteRestaurant}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </HButton>
                <HButton
                  onClick={confirmDeleteRestaurant}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <Span className="flex items-center justify-center gap-2">
                      <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                      Deleting...
                    </Span>
                  ) : (
                    'Delete Restaurant'
                  )}
                </HButton>
              </Div>
            </Div>
          </Div>
        </Overlay>
      )}
    </ScrollDiv>
  );
}
