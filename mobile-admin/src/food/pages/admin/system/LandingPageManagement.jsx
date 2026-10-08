/* Ported from Frontend/src/modules/Food/pages/admin/system/LandingPageManagement.jsx (tools/port.js first pass). */
import { Children, useState, useEffect, useMemo } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Layout,
  Tag,
  UtensilsCrossed,
  ChefHat,
  Megaphone,
  Search,
  Star,
  Store,
  X,
} from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import api from '../../../../api/food';
import { adminAPI } from '../../../../api/food';
import { getModuleToken } from '../../../../admin/session';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import { Checkbox } from '../../../../components/shadcn';
import { prepareUploadFile, prepareUploadFiles } from '../../../../lib/images';
import { pickImage, objectUrl } from '../../../../lib/files';
import { resolveAssetUrl } from '../../../../shared/utils/assetUrl';
import {
  A,
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatusBadge,
  Field,
  LoadingState,
  TableSkeleton,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, Div, HScroll, Img, Input, Option, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
/** A card grid: one column on a phone, two from 560px, `max` when wide. Native drops `grid`, so measure. */
function Grid({ children, max = 3, className }) {
  const [width, setWidth] = useState(0);
  const items = Children.toArray(children).filter(Boolean);
  let cols = 1;
  if (width >= 880) cols = max;
  else if (width >= 560) cols = Math.min(2, max);
  cols = Math.min(cols, items.length || 1);
  const itemWidth = cols > 1 ? (width - 12 * (cols - 1)) / cols : '100%';
  return (
    <Div
      className={`flex-row flex-wrap gap-3 ${className || ''}`}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w && Math.abs(w - width) > 1) setWidth(w);
      }}
    >
      {items.map((child, i) => (
        <Div key={i} style={{ width: itemWidth }}>
          {child}
        </Div>
      ))}
    </Div>
  );
}

/** The tab strip shared by the page and the Explore More sub-tabs. */
function TabStrip({ tabs, active, onSelect, label }) {
  return (
    <Card className="mb-4" padded={false}>
      <HScroll contentClassName="flex-row items-center gap-2 p-2">
        {tabs.map((tab) => {
          const Ico = tab.icon;
          const isActive = tab.id === active;
          return (
            <Button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              accessibilityLabel={`${label}: ${tab.label}`}
              className={`flex-row items-center gap-2 h-11 px-4 rounded-lg ${isActive ? 'bg-blue-600' : 'bg-white'}`}
            >
              <UiIcon as={Ico} size={16} className={isActive ? 'text-white' : 'text-slate-500'} />
              <Span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-700'}`}>{tab.label}</Span>
            </Button>
          );
        })}
      </HScroll>
    </Card>
  );
}

/** The upload panel above each banner list: one tap target, with progress while uploading. */
function UploadPanel({ title, uploading, progress, onPick, className }) {
  const pct = progress?.total ? Math.round((progress.current / progress.total) * 100) : 0;
  return (
    <Card className={className}>
      <SectionTitle>{title}</SectionTitle>
      {uploading ? (
        <Div className="items-center gap-3 py-6 px-4 rounded-lg border border-slate-200 bg-slate-50">
          <ActivityIndicator size="small" color={A.primary} />
          <Span className="text-sm font-semibold text-slate-700">{`Uploading image ${progress?.current || 0} of ${progress?.total || 0}...`}</Span>
          {progress?.total > 0 ? (
            <Div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <Div className="h-2 rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
            </Div>
          ) : null}
        </Div>
      ) : (
        <Button
          onClick={onPick}
          accessibilityLabel={title}
          className="items-center gap-2 py-6 px-4 rounded-lg border border-dashed border-slate-300 bg-slate-50"
        >
          <UiIcon as={Upload} size={22} className="text-blue-600" />
          <Span className="text-sm font-semibold text-blue-600">Tap to choose images</Span>
          <Span className="text-xs text-slate-500 text-center">PNG, JPG or WEBP up to 5MB each (max 5 at once)</Span>
        </Button>
      )}
    </Card>
  );
}

/** A 44px icon button, the row-action size on every admin screen. */
function IconButton({ icon, onPress, disabled, label, tone = 'slate', busy }) {
  const bg = tone === 'danger' ? 'bg-red-50' : 'bg-slate-50';
  const fg = tone === 'danger' ? 'text-red-600' : 'text-slate-600';
  return (
    <Button
      onClick={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      className={`w-11 h-11 rounded-lg items-center justify-center ${bg} ${disabled ? 'opacity-40' : ''}`}
    >
      {busy ? <ActivityIndicator size="small" color={A.textMuted} /> : <UiIcon as={icon} size={18} className={fg} />}
    </Button>
  );
}

/** One banner tile: the image, its order and status, and the row actions beneath. */
function BannerCard({ imageUrl, alt, order, isActive, onUp, onDown, upDisabled, downDisabled, onToggle, deleting, onDelete, extra }) {
  const [width, setWidth] = useState(0);
  return (
    <Card padded={false} className="overflow-hidden">
      <Div
        className="bg-slate-100"
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w && Math.abs(w - width) > 1) setWidth(w);
        }}
      >
        <Img src={imageUrl} alt={alt} style={{ width: '100%', height: width ? Math.round(width * 0.5625) : 160 }} contentFit="cover" />
      </Div>
      <Div className="p-4 gap-3">
        <Div className="flex-row items-center gap-2 flex-wrap">
          <StatusBadge status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} />
          <StatusBadge tone="info" label={`Order ${order}`} />
        </Div>
        <Div className="flex-row items-center flex-wrap gap-2">
          <IconButton icon={ArrowUp} onPress={onUp} disabled={upDisabled} label={`Move ${alt} up`} />
          <IconButton icon={ArrowDown} onPress={onDown} disabled={downDisabled} label={`Move ${alt} down`} />
          <Div className="flex-1" />
          <Button onClick={onToggle} accessibilityLabel={isActive ? `Deactivate ${alt}` : `Activate ${alt}`} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>{isActive ? 'Deactivate' : 'Activate'}</Span>
          </Button>
          <IconButton icon={Trash2} tone="danger" busy={deleting} disabled={deleting} onPress={onDelete} label={`Delete ${alt}`} />
        </Div>
        {extra}
      </Div>
    </Card>
  );
}

export default function LandingPageManagement() {
  const [activeTab, setActiveTab] = useState('banners');
  const [exploreMoreSubTab, setExploreMoreSubTab] = useState('icons');
  const [zones, setZones] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const fetchZones = async () => {
    setZonesLoading(true);
    try {
      const res = await adminAPI.getZones({
        limit: 1000,
      });
      const zoneData = res?.data?.data;
      const list = Array.isArray(zoneData?.zones) ? zoneData.zones : Array.isArray(zoneData) ? zoneData : [];
      setZones(list);
    } catch (err) {
      setZones([]);
    } finally {
      setZonesLoading(false);
    }
  };
  useEffect(() => {
    fetchZones();
  }, []);

  // Hero Banners
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [bannersUploading, setBannersUploading] = useState(false);
  const [bannersUploadProgress, setBannersUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [bannersDeleting, setBannersDeleting] = useState(null);

  // Categories
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesUploading, setCategoriesUploading] = useState(false);
  const [categoriesDeleting, setCategoriesDeleting] = useState(null);
  const [pendingCategories, setPendingCategories] = useState([]); // {id, file, label, previewUrl}

  // Explore More
  const [exploreMore, setExploreMore] = useState([]);
  const [exploreMoreLoading, setExploreMoreLoading] = useState(true);
  const [exploreMoreUploading, setExploreMoreUploading] = useState(false);
  const [exploreMoreDeleting, setExploreMoreDeleting] = useState(null);
  const [exploreMoreLabel, setExploreMoreLabel] = useState('');
  const [exploreMoreLink, setExploreMoreLink] = useState('');
  const [exploreIconsUploading, setExploreIconsUploading] = useState({});

  // Under 250 Banners
  const [under250Banners, setUnder250Banners] = useState([]);
  const [under250BannersLoading, setUnder250BannersLoading] = useState(true);
  const [under250BannersUploading, setUnder250BannersUploading] = useState(false);
  const [under250BannersUploadProgress, setUnder250BannersUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [under250BannersDeleting, setUnder250BannersDeleting] = useState(null);

  // Dining Banners
  const [diningBanners, setDiningBanners] = useState([]);
  const [diningBannersLoading, setDiningBannersLoading] = useState(true);
  const [diningBannersUploading, setDiningBannersUploading] = useState(false);
  const [diningBannersUploadProgress, setDiningBannersUploadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [diningBannersDeleting, setDiningBannersDeleting] = useState(null);

  // Settings
  const [settings, setSettings] = useState({
    exploreMoreHeading: 'Explore More',
    recommendedRestaurantIds: [],
    under250PriceLimit: 250,
    festBannerImageUrl: '',
    festBannerTopColor: '',
  });
  const [originalSettings, setOriginalSettings] = useState({
    exploreMoreHeading: 'Explore More',
    recommendedRestaurantIds: [],
    under250PriceLimit: 250,
    festBannerImageUrl: '',
    festBannerTopColor: '',
  });
  const [selectedFestBannerFile, setSelectedFestBannerFile] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [recommendedSearchQuery, setRecommendedSearchQuery] = useState('');
  const [festBannerUploading, setFestBannerUploading] = useState(false);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);

  // Gourmet Restaurants
  const [gourmetRestaurants, setGourmetRestaurants] = useState([]);
  const [gourmetLoading, setGourmetLoading] = useState(true);
  const [gourmetDeleting, setGourmetDeleting] = useState(null);
  const [selectedRestaurantGourmet, setSelectedRestaurantGourmet] = useState('');

  // Common
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Restaurant Selection Modal for Banner Advertising
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [selectedBannerId, setSelectedBannerId] = useState(null);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState([]);
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState('');
  const [linkingRestaurants, setLinkingRestaurants] = useState(false);

  // Helper function to filter out token-related errors
  const setErrorSafely = (errorMessage) => {
    if (!errorMessage) {
      setError(null);
      return;
    }
    const lowerMessage = errorMessage.toLowerCase();
    // Don't show token/unauthorized/auth errors
    if (
      lowerMessage.includes('token') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('no token') ||
      lowerMessage.includes('authentication') ||
      lowerMessage.includes('session expired')
    ) {
      setError(null);
    } else {
      setError(errorMessage);
    }
  };

  // Helper function to get admin token and add to request config
  const getAuthConfig = (additionalConfig = {}) => {
    const adminToken = getModuleToken('admin');

    // Debug logging in development
    if (import.meta.env.DEV) {
      debugLog('[LandingPageManagement] Token check:', {
        token: adminToken ? 'exists' : 'missing',
        tokenLength: adminToken?.length || 0,
        path: window.location.pathname,
      });
    }
    if (!adminToken || adminToken.trim() === '' || adminToken === 'null' || adminToken === 'undefined') {
      // Token not found, return config without auth header (will be handled by error)
      debugWarn('[LandingPageManagement] Admin token not found!');
      return additionalConfig;
    }

    // Merge headers properly - ensure Authorization is always set
    const mergedHeaders = {
      ...additionalConfig.headers,
      Authorization: `Bearer ${adminToken.trim()}`,
    };
    return {
      ...additionalConfig,
      headers: mergedHeaders,
    };
  };
  const getZoneConfig = (additionalConfig = {}) => {
    const config = getAuthConfig(additionalConfig);
    if (selectedZoneId) {
      config.params = {
        ...config.params,
        zoneId: selectedZoneId,
      };
    }
    return config;
  };
  useEffect(() => {
    setAllRestaurants([]);
  }, [selectedZoneId]);

  // Lazy fetch data based on active tab to optimize page load speed
  useEffect(() => {
    if (activeTab === 'banners') {
      fetchBanners();
    } else if (activeTab === 'under-250') {
      fetchUnder250Banners();
    } else if (activeTab === 'dining') {
      fetchDiningBanners();
    } else if (activeTab === 'explore-more') {
      fetchSettings();
      fetchAllRestaurants();
      if (exploreMoreSubTab === 'gourmet') {
        fetchGourmetRestaurants();
      } else if (exploreMoreSubTab === 'icons') {
        fetchExploreMore();
      }
    }
  }, [activeTab, exploreMoreSubTab, selectedZoneId]);

  // ==================== HERO BANNERS ====================
  const fetchBanners = async (showLoading = true) => {
    try {
      if (showLoading) setBannersLoading(true);
      setError(null);
      const response = await api.get('/food/hero-banners', getZoneConfig());
      if (response.data.success) {
        setBanners(response.data.data.banners || []);
      }
    } catch (err) {
      // Handle 401/404 errors gracefully - don't show error messages
      if (err.response?.status === 401) {
        // Token expired or invalid - will be handled by axios interceptor
        // Don't show error message or set banners
        setBanners([]);
        setError(null);
      } else if (err.response?.status === 404) {
        // Endpoint doesn't exist, set empty array
        setBanners([]);
        setError(null);
      } else {
        // Filter out token-related errors
        const errorMessage = err.response?.data?.message || 'Failed to load hero banners';
        setErrorSafely(errorMessage);
      }
    } finally {
      setBannersLoading(false);
    }
  };
  const handleBannerFileSelect = (e) => {
    const files = Array.from(e.target?.files || e.files || []);
    if (files.length === 0) return;
    if (files.length > 5) {
      setError('You can upload a maximum of 5 images at once');
      return;
    }
    uploadBanners(files);
  };
  const uploadBanners = async (files) => {
    try {
      // Check token first before proceeding
      const adminToken = getModuleToken('admin');
      if (!adminToken || adminToken.trim() === '' || adminToken === 'null' || adminToken === 'undefined') {
        setErrorSafely('Authentication required. Please login again.');
        return;
      }
      setBannersUploading(true);
      setError(null);
      setSuccess(null);
      setBannersUploadProgress({
        current: 0,
        total: files.length,
      });

      // Use batch upload endpoint for multiple files
      const preparedFiles = await prepareUploadFiles(files);
      const formData = new FormData();
      preparedFiles.forEach((file) => {
        // Backend expects field name "files" (upload.array('files'))
        formData.append('files', file);
        if (selectedZoneId) formData.append('zoneId', selectedZoneId);
      });

      // Use getAuthConfig to ensure proper Authorization header
      // Don't set Content-Type - axios will set it automatically with boundary for FormData
      const config = getAuthConfig();

      // Debug: Log the config to verify Authorization header is set
      if (import.meta.env.DEV) {
        debugLog('[uploadBanners] Request config:', {
          hasAuthHeader: !!config.headers?.Authorization,
          authHeaderPrefix: config.headers?.Authorization?.substring(0, 20),
          hasFormData: formData instanceof FormData,
        });
      }
      const response = await api.post('/food/hero-banners/multiple', formData, config);
      if (response.data.success) {
        const dataObj = response.data.data || {};
        const uploadedBanners = dataObj.banners || (Array.isArray(dataObj.results) ? dataObj.results.filter((r) => r.success).map((r) => r.banner) : []);
        const errors = dataObj.errors || (Array.isArray(dataObj.results) ? dataObj.results.filter((r) => !r.success).map((r) => r.error) : []);
        const successCount = uploadedBanners.length;
        const failCount = errors.length;
        await fetchBanners();
        if (failCount === 0 && successCount > 0) {
          setSuccess(`${successCount} hero banner${successCount > 1 ? 's' : ''} uploaded successfully!`);
          setTimeout(() => setSuccess(null), 5000);
        } else if (successCount > 0) {
          setSuccess(`${successCount} banner${successCount > 1 ? 's' : ''} uploaded, ${failCount} failed.`);
          setErrorSafely(errors.join(', '));
          setTimeout(() => {
            setSuccess(null);
            setError(null);
          }, 5000);
        } else {
          setErrorSafely(`Failed to upload banners. ${errors.length > 0 ? errors.join(', ') : 'Please try again.'}`);
        }
      } else {
        setErrorSafely(response.data.message || 'Failed to upload banners');
      }
      setBannersUploadProgress({
        current: 0,
        total: 0,
      });
    } catch (err) {
      debugError('Error uploading banners:', err);

      // Handle 401 unauthorized errors - don't show token-related errors
      if (err.response?.status === 401 || err.message === 'Authentication token not found') {
        // Don't show error - let axios interceptor handle logout
        setError(null);
      } else {
        // Filter out token-related errors
        const errorMessage = err.response?.data?.message || 'Failed to upload banners';
        setErrorSafely(errorMessage);
      }
      setBannersUploadProgress({
        current: 0,
        total: 0,
      });
    } finally {
      setBannersUploading(false);
    }
  };
  const handleDeleteBanner = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this hero banner?'))) return;
    try {
      setBannersDeleting(id);
      setError(null);
      setSuccess(null);
      const response = await api.delete(`/food/hero-banners/${id}`, getAuthConfig());
      if (response.data.success) {
        setSuccess('Hero banner deleted successfully!');
        await fetchBanners(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to delete banner.');
    } finally {
      setBannersDeleting(null);
    }
  };
  const handleToggleBannerStatus = async (id, currentStatus) => {
    try {
      setError(null);
      setSuccess(null);
      const response = await api.patch(
        `/food/hero-banners/${id}/status`,
        {
          isActive: !currentStatus,
        },
        getAuthConfig(),
      );
      if (response.data.success) {
        setSuccess(`Banner ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
        await fetchBanners(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to update banner status.');
    }
  };
  const handleBannerOrderChange = async (id, direction) => {
    const banner = banners.find((b) => b._id === id);
    if (!banner) return;
    const newOrder = direction === 'up' ? banner.order - 1 : banner.order + 1;
    const otherBanner = banners.find((b) => b.order === newOrder && b._id !== id);
    if (!otherBanner && newOrder < 0) return;
    try {
      setError(null);
      await api.patch(
        `/food/hero-banners/${id}/order`,
        {
          order: newOrder,
        },
        getAuthConfig(),
      );
      if (otherBanner) {
        await api.patch(
          `/food/hero-banners/${otherBanner._id}/order`,
          {
            order: banner.order,
          },
          getAuthConfig(),
        );
      }
      await fetchBanners();
    } catch (err) {
      setErrorSafely('Failed to update banner order.');
    }
  };

  // Handle restaurant selection for banner advertising
  const handleLinkRestaurants = async () => {
    if (!selectedBannerId) return;
    try {
      setLinkingRestaurants(true);
      setError(null);
      setSuccess(null);
      const response = await api.patch(
        `/food/hero-banners/${selectedBannerId}/link-restaurants`,
        {
          restaurantIds: selectedRestaurantIds,
        },
        getAuthConfig(),
      );
      if (response.data.success) {
        setSuccess('Restaurants linked to banner successfully!');
        setShowRestaurantModal(false);
        setSelectedBannerId(null);
        setSelectedRestaurantIds([]);
        setRestaurantSearchQuery('');
        await fetchBanners();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to link restaurants to banner.');
    } finally {
      setLinkingRestaurants(false);
    }
  };
  const toggleRestaurantSelection = (restaurantId) => {
    setSelectedRestaurantIds((prev) => {
      if (prev.includes(restaurantId)) {
        return [];
      } else {
        return [restaurantId];
      }
    });
  };
  const filteredRestaurantsForModal = allRestaurants.filter((restaurant) => {
    if (!restaurantSearchQuery.trim()) return true;
    const query = restaurantSearchQuery.toLowerCase();
    return restaurant.name?.toLowerCase().includes(query) || restaurant.restaurantId?.toLowerCase().includes(query);
  });
  const filteredRestaurantsForRecommended = useMemo(() => {
    const query = recommendedSearchQuery.trim().toLowerCase();
    return allRestaurants
      .filter((restaurant) => {
        if (!query) return true;
        return restaurant.name?.toLowerCase().includes(query) || restaurant.restaurantId?.toLowerCase().includes(query);
      })
      .slice(0, 80);
  }, [allRestaurants, recommendedSearchQuery]);
  const recommendedRestaurantsSelected = useMemo(() => {
    const selectedIds = new Set(
      (settings.recommendedRestaurantIds || []).map((id) => (typeof id === 'object' && id !== null ? String(id._id || id) : String(id))),
    );
    return allRestaurants.filter((restaurant) => selectedIds.has(String(restaurant._id)));
  }, [allRestaurants, settings.recommendedRestaurantIds]);
  const toggleRecommendedRestaurant = (restaurantId) => {
    setSettings((prev) => {
      const previousIds = Array.isArray(prev.recommendedRestaurantIds)
        ? prev.recommendedRestaurantIds.map((id) => (typeof id === 'object' && id !== null ? String(id._id || id) : String(id)))
        : [];
      const targetId = String(restaurantId);
      const alreadySelected = previousIds.includes(targetId);
      return {
        ...prev,
        recommendedRestaurantIds: alreadySelected ? previousIds.filter((id) => id !== targetId) : [...previousIds, targetId],
      };
    });
  };

  // ==================== CATEGORIES ====================
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setError(null);
      const response = await api.get('/food/hero-banners/landing/categories', getZoneConfig());
      if (response.data.success) {
        setCategories(response.data.data.categories || []);
      }
    } catch (err) {
      // Silently handle 401/404 errors - endpoints may not exist yet
      if (err.response?.status === 401 || err.response?.status === 404) {
        setCategories([]); // Set empty array if endpoint doesn't exist
        setError(null); // Clear any previous error
      } else {
        // Filter out token-related errors
        const errorMessage = err.response?.data?.message || 'Failed to load categories';
        setErrorSafely(errorMessage);
      }
    } finally {
      setCategoriesLoading(false);
    }
  };
  const handleCategoryFileSelect = (e) => {
    const files = Array.from(e.target?.files || e.files || []);
    if (!files.length) return;
    const newItems = files
      .filter((file) => {
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed for categories');
          return false;
        }
        return true;
      })
      .map((file, index) => {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const prettyName = baseName.replace(/[-_]+/g, ' ').trim();
        return {
          id: `${Date.now()}-${index}`,
          file,
          label: prettyName || '',
          previewUrl: objectUrl(file),
        };
      });
    if (!newItems.length) return;
    setPendingCategories((prev) => [...prev, ...newItems]);
  };
  const handlePendingCategoryLabelChange = (id, newLabel) => {
    setPendingCategories((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              label: newLabel,
            }
          : item,
      ),
    );
  };
  const handleRemovePendingCategory = (id) => {
    setPendingCategories((prev) => {
      const toRemove = prev.find((item) => item.id === id);
      return prev.filter((item) => item.id !== id);
    });
  };
  const handleUploadPendingCategories = async () => {
    if (!pendingCategories.length) {
      setError('Add at least one category image before uploading');
      return;
    }
    try {
      setCategoriesUploading(true);
      setError(null);
      setSuccess(null);
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      for (let i = 0; i < pendingCategories.length; i++) {
        const item = pendingCategories[i];
        if (!item.label.trim()) {
          failCount++;
          errors.push(`Item ${i + 1}: label is required`);
          continue;
        }
        const formData = new FormData();
        formData.append('image', await prepareUploadFile(item.file));
        if (selectedZoneId) formData.append('zoneId', selectedZoneId);
        formData.append('label', item.label.trim());
        try {
          const response = await api.post(
            '/food/hero-banners/landing/categories',
            formData,
            getAuthConfig({
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }),
          );
          if (response.data.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`Item ${i + 1}: upload failed`);
          }
        } catch (err) {
          failCount++;
          errors.push(`Item ${i + 1}: ${err?.response?.data?.message || 'Failed to create category'}`);
        }
      }

      // Clean up previews
      setPendingCategories([]);
      await fetchCategories();
      if (successCount > 0 && failCount === 0) {
        setSuccess(`${successCount} categor${successCount > 1 ? 'ies' : 'y'} created successfully!`);
        setTimeout(() => setSuccess(null), 4000);
      } else if (successCount > 0 && failCount > 0) {
        setSuccess(`${successCount} categor${successCount > 1 ? 'ies' : 'y'} created, ${failCount} failed.`);
        setError(errors.join(', '));
        setTimeout(() => {
          setSuccess(null);
          setError(null);
        }, 5000);
      } else {
        setErrorSafely(`Failed to create categories. ${errors.join(', ')}`);
      }
    } finally {
      setCategoriesUploading(false);
    }
  };
  const handleDeleteCategory = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this category?'))) return;
    try {
      setCategoriesDeleting(id);
      setError(null);
      setSuccess(null);
      const response = await api.delete(`/food/hero-banners/landing/categories/${id}`, getAuthConfig());
      if (response.data.success) {
        setSuccess('Category deleted successfully!');
        await fetchCategories(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setCategoriesDeleting(null);
    }
  };
  const handleToggleCategoryStatus = async (id, currentStatus) => {
    try {
      setError(null);
      setSuccess(null);
      const response = await api.patch(`/food/hero-banners/landing/categories/${id}/status`, {}, getAuthConfig());
      if (response.data.success) {
        setSuccess(`Category ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
        await fetchCategories(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to update category status.');
    }
  };
  const handleCategoryOrderChange = async (id, direction) => {
    const category = categories.find((c) => c._id === id);
    if (!category) return;
    const newOrder = direction === 'up' ? category.order - 1 : category.order + 1;
    const otherCategory = categories.find((c) => c.order === newOrder && c._id !== id);
    if (!otherCategory && newOrder < 0) return;
    try {
      setError(null);
      await api.patch(
        `/food/hero-banners/landing/categories/${id}/order`,
        {
          order: newOrder,
        },
        getAuthConfig(),
      );
      if (otherCategory) {
        await api.patch(
          `/food/hero-banners/landing/categories/${otherCategory._id}/order`,
          {
            order: category.order,
          },
          getAuthConfig(),
        );
      }
      await fetchCategories();
    } catch (err) {
      setErrorSafely('Failed to update category order.');
    }
  };

  // ==================== EXPLORE MORE ====================
  const fetchExploreMore = async (showLoading = true) => {
    try {
      if (showLoading) setExploreMoreLoading(true);
      setError(null);
      const response = await api.get('/food/hero-banners/landing/explore-more', getZoneConfig());
      if (response.data.success) {
        setExploreMore(response.data.data.items || []);
      }
    } catch (err) {
      // Silently handle 401/404 errors - endpoints may not exist yet
      if (err.response?.status === 401 || err.response?.status === 404) {
        setExploreMore([]); // Set empty array if endpoint doesn't exist
        setError(null); // Clear any previous error
      } else {
        // Filter out token-related errors
        const errorMessage = err.response?.data?.message || 'Failed to load explore more items';
        setErrorSafely(errorMessage);
      }
    } finally {
      setExploreMoreLoading(false);
    }
  };
  const handleExploreMoreFileSelect = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!exploreMoreLabel.trim() || !exploreMoreLink.trim()) {
      setError('Please enter both label and link');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    try {
      setExploreMoreUploading(true);
      setError(null);
      setSuccess(null);
      const formData = new FormData();
      formData.append('image', await prepareUploadFile(file));
      if (selectedZoneId) formData.append('zoneId', selectedZoneId);
      formData.append('label', exploreMoreLabel.trim());
      formData.append('link', exploreMoreLink.trim());
      const response = await api.post(
        '/food/hero-banners/landing/explore-more',
        formData,
        getAuthConfig({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }),
      );
      if (response.data.success) {
        setSuccess('Explore more item created successfully!');
        setExploreMoreLabel('');
        setExploreMoreLink('');
        await fetchExploreMore();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to create explore more item.');
    } finally {
      setExploreMoreUploading(false);
    }
  };
  const handleDeleteExploreMore = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this explore more item?'))) return;
    try {
      setExploreMoreDeleting(id);
      setError(null);
      setSuccess(null);
      const response = await api.delete(`/food/hero-banners/landing/explore-more/${id}`, getAuthConfig());
      if (response.data.success) {
        setSuccess('Explore more item deleted successfully!');
        await fetchExploreMore(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to delete explore more item.');
    } finally {
      setExploreMoreDeleting(null);
    }
  };
  const handleToggleExploreMoreStatus = async (id, currentStatus) => {
    try {
      setError(null);
      setSuccess(null);
      const response = await api.patch(`/food/hero-banners/landing/explore-more/${id}/status`, {}, getAuthConfig());
      if (response.data.success) {
        setSuccess(`Explore more item ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
        await fetchExploreMore(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to update explore more status.');
    }
  };
  const handleIconUpdate = async (file, label, link, itemId) => {
    if (!file) return;

    // Find existing item by label
    const existingItem = exploreMore.find((item) => item.label?.toLowerCase() === label.toLowerCase());
    const preparedFile = await prepareUploadFile(file);

    // Create FormData
    const formData = new FormData();
    formData.append('image', preparedFile);
    if (selectedZoneId) formData.append('zoneId', selectedZoneId);
    try {
      setExploreIconsUploading((prev) => ({
        ...prev,
        [itemId]: true,
      }));
      let res;
      if (existingItem) {
        // Update existing
        res = await api.patch(
          `/food/hero-banners/landing/explore-more/${existingItem._id}`,
          formData,
          getAuthConfig({
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }),
        );
      } else {
        // Create new
        formData.append('label', label);
        formData.append('link', link);
        res = await api.post(
          '/food/hero-banners/landing/explore-more',
          formData,
          getAuthConfig({
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }),
        );
      }
      if (res.data?.success) {
        setSuccess(`${label} icon updated successfully!`);
        setTimeout(() => setSuccess(null), 3000);
        await fetchExploreMore();
      }
    } catch (err) {
      debugError('Upload failed', err);
      setErrorSafely(err.response?.data?.message || 'Failed to update icon');
    } finally {
      setExploreIconsUploading((prev) => ({
        ...prev,
        [itemId]: false,
      }));
    }
  };
  const handleExploreMoreOrderChange = async (id, direction) => {
    const item = exploreMore.find((e) => e._id === id);
    if (!item) return;
    const newOrder = direction === 'up' ? item.order - 1 : item.order + 1;
    const otherItem = exploreMore.find((e) => e.order === newOrder && e._id !== id);
    if (!otherItem && newOrder < 0) return;
    try {
      setError(null);
      await api.patch(
        `/food/hero-banners/landing/explore-more/${id}/order`,
        {
          order: newOrder,
        },
        getAuthConfig(),
      );
      if (otherItem) {
        await api.patch(
          `/food/hero-banners/landing/explore-more/${otherItem._id}/order`,
          {
            order: item.order,
          },
          getAuthConfig(),
        );
      }
      await fetchExploreMore();
    } catch (err) {
      setErrorSafely('Failed to update explore more order.');
    }
  };

  // ==================== UNDER 250 BANNERS ====================
  const fetchUnder250Banners = async (showLoading = true) => {
    try {
      if (showLoading) setUnder250BannersLoading(true);
      setError(null);
      const response = await api.get('/food/hero-banners/under-250', getZoneConfig());
      if (response.data.success) {
        setUnder250Banners(response.data.data.banners || []);
      }
    } catch (err) {
      // Handle 401/404 errors gracefully - don't show error messages
      if (err.response?.status === 401) {
        setUnder250Banners([]);
        setError(null);
      } else if (err.response?.status === 404) {
        setUnder250Banners([]);
        setError(null);
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to load under 250 banners';
        setErrorSafely(errorMessage);
      }
    } finally {
      setUnder250BannersLoading(false);
    }
  };
  const handleUnder250BannerFileSelect = (e) => {
    const files = Array.from(e.target?.files || e.files || []);
    if (files.length === 0) return;
    if (files.length > 5) {
      setError('You can upload a maximum of 5 images at once');
      return;
    }
    uploadUnder250Banners(files);
  };
  const uploadUnder250Banners = async (files) => {
    try {
      // Check token first before proceeding
      const adminToken = getModuleToken('admin');
      if (!adminToken || adminToken.trim() === '' || adminToken === 'null' || adminToken === 'undefined') {
        setErrorSafely('Authentication required. Please login again.');
        return;
      }
      setUnder250BannersUploading(true);
      setError(null);
      setSuccess(null);
      setUnder250BannersUploadProgress({
        current: 0,
        total: files.length,
      });
      const preparedFiles = await prepareUploadFiles(files);
      const formData = new FormData();
      preparedFiles.forEach((file) => {
        // Backend expects field name "files" (upload.array('files'))
        formData.append('files', file);
        if (selectedZoneId) formData.append('zoneId', selectedZoneId);
      });
      const response = await api.post(
        '/food/hero-banners/under-250/multiple',
        formData,
        getAuthConfig({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }),
      );
      if (response.data.success) {
        setSuccess(`${response.data.data.banners?.length || files.length} under 250 banner(s) uploaded successfully!`);
        await fetchUnder250Banners();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to upload under 250 banners';
      setErrorSafely(errorMessage);
      setUnder250BannersUploadProgress({
        current: 0,
        total: 0,
      });
    } finally {
      setUnder250BannersUploading(false);
    }
  };
  const handleDeleteUnder250Banner = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this under 250 banner?'))) return;
    try {
      setUnder250BannersDeleting(id);
      setError(null);
      setSuccess(null);
      const response = await api.delete(`/food/hero-banners/under-250/${id}`, getAuthConfig());
      if (response.data.success) {
        setSuccess('Under 250 banner deleted successfully!');
        await fetchUnder250Banners(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to delete banner.');
    } finally {
      setUnder250BannersDeleting(null);
    }
  };
  const handleToggleUnder250BannerStatus = async (id, currentStatus) => {
    try {
      setError(null);
      setSuccess(null);
      const response = await api.patch(`/food/hero-banners/under-250/${id}/status`, {}, getAuthConfig());
      if (response.data.success) {
        setSuccess(`Banner ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
        await fetchUnder250Banners(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to update banner status.');
    }
  };
  const handleUnder250BannerOrderChange = async (id, direction) => {
    const banner = under250Banners.find((b) => b._id === id);
    if (!banner) return;
    const newOrder = direction === 'up' ? banner.order - 1 : banner.order + 1;
    const otherBanner = under250Banners.find((b) => b.order === newOrder && b._id !== id);
    if (!otherBanner && newOrder < 0) return;
    try {
      setError(null);
      await api.patch(
        `/food/hero-banners/under-250/${id}/order`,
        {
          order: newOrder,
        },
        getAuthConfig(),
      );
      if (otherBanner) {
        await api.patch(
          `/food/hero-banners/under-250/${otherBanner._id}/order`,
          {
            order: banner.order,
          },
          getAuthConfig(),
        );
      }
      await fetchUnder250Banners();
    } catch (err) {
      setErrorSafely('Failed to update banner order.');
    }
  };

  // ==================== DINING BANNERS ====================
  const fetchDiningBanners = async (showLoading = true) => {
    try {
      if (showLoading) setDiningBannersLoading(true);
      setError(null);
      const response = await api.get('/food/hero-banners/dining', getZoneConfig());
      if (response.data.success) {
        setDiningBanners(response.data.data.banners || []);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setDiningBanners([]);
        setError(null);
      } else if (err.response?.status === 404) {
        setDiningBanners([]);
        setError(null);
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to load dining banners';
        setErrorSafely(errorMessage);
      }
    } finally {
      setDiningBannersLoading(false);
    }
  };
  const handleDiningBannerFileSelect = (e) => {
    const files = Array.from(e.target?.files || e.files || []);
    if (files.length === 0) return;
    if (files.length > 5) {
      setError('You can upload a maximum of 5 images at once');
      return;
    }
    uploadDiningBanners(files);
  };
  const uploadDiningBanners = async (files) => {
    try {
      const adminToken = getModuleToken('admin');
      if (!adminToken || adminToken.trim() === '' || adminToken === 'null' || adminToken === 'undefined') {
        setErrorSafely('Authentication required. Please login again.');
        return;
      }
      setDiningBannersUploading(true);
      setError(null);
      setSuccess(null);
      setDiningBannersUploadProgress({
        current: 0,
        total: files.length,
      });
      const preparedFiles = await prepareUploadFiles(files);
      const formData = new FormData();
      preparedFiles.forEach((file) => {
        formData.append('files', file);
        if (selectedZoneId) formData.append('zoneId', selectedZoneId);
      });
      const response = await api.post(
        '/food/hero-banners/dining/multiple',
        formData,
        getAuthConfig({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }),
      );
      if (response.data.success) {
        setSuccess(`${response.data.data.banners?.length || files.length} dining banner(s) uploaded successfully!`);
        await fetchDiningBanners();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to upload dining banners';
      setErrorSafely(errorMessage);
      setDiningBannersUploadProgress({
        current: 0,
        total: 0,
      });
    } finally {
      setDiningBannersUploading(false);
    }
  };
  const handleDeleteDiningBanner = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this dining banner?'))) return;
    try {
      setDiningBannersDeleting(id);
      setError(null);
      setSuccess(null);
      const response = await api.delete(`/food/hero-banners/dining/${id}`, getAuthConfig());
      if (response.data.success) {
        setSuccess('Dining banner deleted successfully!');
        await fetchDiningBanners(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to delete banner.');
    } finally {
      setDiningBannersDeleting(null);
    }
  };
  const handleToggleDiningBannerStatus = async (id, currentStatus) => {
    try {
      setError(null);
      setSuccess(null);
      const response = await api.patch(`/food/hero-banners/dining/${id}/status`, {}, getAuthConfig());
      if (response.data.success) {
        setSuccess(`Banner ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
        await fetchDiningBanners(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to update banner status.');
    }
  };
  const handleDiningBannerOrderChange = async (id, direction) => {
    const banner = diningBanners.find((b) => b._id === id);
    if (!banner) return;
    const newOrder = direction === 'up' ? banner.order - 1 : banner.order + 1;
    const otherBanner = diningBanners.find((b) => b.order === newOrder && b._id !== id);
    if (!otherBanner && newOrder < 0) return;
    try {
      setError(null);
      await api.patch(
        `/food/hero-banners/dining/${id}/order`,
        {
          order: newOrder,
        },
        getAuthConfig(),
      );
      if (otherBanner) {
        await api.patch(
          `/food/hero-banners/dining/${otherBanner._id}/order`,
          {
            order: banner.order,
          },
          getAuthConfig(),
        );
      }
      await fetchDiningBanners();
    } catch (err) {
      setErrorSafely('Failed to update banner order.');
    }
  };

  // ==================== SETTINGS ====================
  const fetchSettings = async (showLoading = true) => {
    try {
      if (showLoading) setSettingsLoading(true);
      setError(null);
      const response = await api.get('/food/hero-banners/landing/settings', getZoneConfig());
      if (response.data.success) {
        const nextSettings = response.data.data?.settings || response.data.data || {};
        const rawRecommended = nextSettings.recommendedRestaurantIds;
        const recommendedIds = Array.isArray(rawRecommended)
          ? rawRecommended.map((id) => (typeof id === 'object' && id !== null ? String(id._id || id) : String(id)))
          : [];
        const newSettings = {
          exploreMoreHeading: nextSettings.exploreMoreHeading || 'Explore More',
          recommendedRestaurantIds: recommendedIds,
          under250PriceLimit: Number(nextSettings.under250PriceLimit) || 250,
          festBannerImageUrl: typeof nextSettings.festBannerImageUrl === 'string' ? nextSettings.festBannerImageUrl : '',
          festBannerTopColor: typeof nextSettings.festBannerTopColor === 'string' ? nextSettings.festBannerTopColor : '',
        };
        setSettings(newSettings);
        setOriginalSettings(newSettings);
      }
    } catch (err) {
      // Silently handle 401/404 errors - endpoints may not exist yet, use default settings
      if (err.response?.status === 401 || err.response?.status === 404) {
        const defaultSettings = {
          exploreMoreHeading: 'Explore More',
          recommendedRestaurantIds: [],
          under250PriceLimit: 250,
          festBannerImageUrl: '',
          festBannerTopColor: '',
        };
        setSettings(defaultSettings); // Use default settings
        setOriginalSettings(defaultSettings);
        setError(null); // Clear any previous error
      } else {
        // Filter out token-related errors
        const errorMessage = err.response?.data?.message || 'Failed to load settings';
        setErrorSafely(errorMessage);
      }
    } finally {
      setSettingsLoading(false);
    }
  };
  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true);
      setError(null);
      setSuccess(null);
      let finalUrl = settings.festBannerImageUrl || '';
      let finalTopColor = settings.festBannerTopColor || '';
      if (selectedFestBannerFile) {
        setFestBannerUploading(true);
        const formData = new FormData();
        formData.append('file', await prepareUploadFile(selectedFestBannerFile));
        formData.append('folder', 'food/landing/fest-banner');
        if (settings.festBannerImageUrl) formData.append('replaceUrl', settings.festBannerImageUrl);
        if (selectedZoneId) formData.append('zoneId', selectedZoneId);
        const uploadRes = await api.post('/uploads/image', formData, getAuthConfig());
        finalUrl = uploadRes?.data?.data?.url || '';
        finalTopColor = uploadRes?.data?.data?.dominantColor || '';
        if (!finalUrl) {
          setErrorSafely('Failed to upload banner image');
          setFestBannerUploading(false);
          return;
        }
        setFestBannerUploading(false);
        setSelectedFestBannerFile(null);
      }
      const response = await api.patch(
        '/food/hero-banners/landing/settings',
        {
          zoneId: selectedZoneId || null,
          exploreMoreHeading: settings.exploreMoreHeading,
          recommendedRestaurantIds: Array.isArray(settings.recommendedRestaurantIds) ? settings.recommendedRestaurantIds : [],
          under250PriceLimit: Number(settings.under250PriceLimit) || 250,
          festBannerImageUrl: finalUrl,
          festBannerTopColor: finalTopColor,
        },
        getAuthConfig(),
      );
      if (response.data.success) {
        const savedSettings = response.data.data?.settings || response.data.data || {};
        const rawRecommended = savedSettings.recommendedRestaurantIds;
        const recommendedIds = Array.isArray(rawRecommended)
          ? rawRecommended.map((id) => (typeof id === 'object' && id !== null ? String(id._id || id) : String(id)))
          : settings.recommendedRestaurantIds;
        const updatedSettings = {
          exploreMoreHeading: savedSettings.exploreMoreHeading || settings.exploreMoreHeading,
          recommendedRestaurantIds: recommendedIds,
          under250PriceLimit: Number(savedSettings.under250PriceLimit) || settings.under250PriceLimit,
          festBannerImageUrl: typeof savedSettings.festBannerImageUrl === 'string' ? savedSettings.festBannerImageUrl : settings.festBannerImageUrl,
          festBannerTopColor: typeof savedSettings.festBannerTopColor === 'string' ? savedSettings.festBannerTopColor : settings.festBannerTopColor || '',
        };
        setSettings(updatedSettings);
        setOriginalSettings(updatedSettings);
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSettingsSaving(false);
      setFestBannerUploading(false);
    }
  };
  const handleFestBannerImageSelect = (e) => {
    const file = e.target?.files?.[0] || null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorSafely('Please select a valid image file');
      return;
    }
    try {
      const localUrl = objectUrl(file);
      setSelectedFestBannerFile(file);
      setSettings((prev) => ({
        ...prev,
        festBannerImageUrl: localUrl,
      }));
      setSuccess('Banner selected. Click Save Settings to upload and publish.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setErrorSafely('Failed to read selected image');
    }
  };

  // ==================== ALL RESTAURANTS ====================
  const fetchAllRestaurants = async () => {
    try {
      setRestaurantsLoading(true);
      setError(null);
      const response = await adminAPI.getRestaurants({
        limit: 1000,
        ...(selectedZoneId && {
          zoneId: selectedZoneId,
        }),
      });
      const data = response?.data?.data;
      if (response?.data?.success && data) {
        const raw = Array.isArray(data) ? data : data.restaurants || [];
        const restaurants = raw.map((r) => ({
          ...r,
          name: r.name || r.restaurantName || '',
        }));
        setAllRestaurants(restaurants);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        setAllRestaurants([]);
        setError(null);
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to load restaurants';
        setErrorSafely(errorMessage);
      }
    } finally {
      setRestaurantsLoading(false);
    }
  };
  const fetchGourmetRestaurants = async (showLoading = true) => {
    try {
      if (showLoading) setGourmetLoading(true);
      setError(null);
      const response = await api.get('/food/hero-banners/gourmet', getZoneConfig());
      if (response.data.success) {
        setGourmetRestaurants(response.data.data.restaurants || []);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        setGourmetRestaurants([]);
        setError(null);
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to load Gourmet restaurants';
        setErrorSafely(errorMessage);
      }
    } finally {
      setGourmetLoading(false);
    }
  };
  const handleAddGourmetRestaurant = async () => {
    if (!selectedRestaurantGourmet) {
      setError('Please select a restaurant');
      return;
    }
    try {
      setError(null);
      setSuccess(null);
      const response = await api.post(
        '/food/hero-banners/gourmet',
        {
          zoneId: selectedZoneId || null,
          restaurantId: selectedRestaurantGourmet,
        },
        getAuthConfig(),
      );
      if (response.data.success) {
        setSuccess('Restaurant added to Gourmet successfully!');
        setSelectedRestaurantGourmet('');
        await fetchGourmetRestaurants();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to add restaurant to Gourmet.');
    }
  };
  const handleDeleteGourmetRestaurant = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to remove this restaurant from Gourmet?'))) return;
    try {
      setGourmetDeleting(id);
      setError(null);
      setSuccess(null);
      const response = await api.delete(`/food/hero-banners/gourmet/${id}`, getAuthConfig());
      if (response.data.success) {
        setSuccess('Restaurant removed from Gourmet successfully!');
        await fetchGourmetRestaurants(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to remove restaurant.');
    } finally {
      setGourmetDeleting(null);
    }
  };
  const handleGourmetOrderChange = async (id, direction) => {
    const restaurant = gourmetRestaurants.find((r) => r._id === id);
    if (!restaurant) return;
    const newOrder = direction === 'up' ? restaurant.order - 1 : restaurant.order + 1;
    const otherRestaurant = gourmetRestaurants.find((r) => r.order === newOrder && r._id !== id);
    if (!otherRestaurant && newOrder < 0) return;
    try {
      setError(null);
      await api.patch(
        `/food/hero-banners/gourmet/${id}/order`,
        {
          order: newOrder,
        },
        getAuthConfig(),
      );
      if (otherRestaurant) {
        await api.patch(
          `/food/hero-banners/gourmet/${otherRestaurant._id}/order`,
          {
            order: restaurant.order,
          },
          getAuthConfig(),
        );
      }
      await fetchGourmetRestaurants();
    } catch (err) {
      setErrorSafely('Failed to update Gourmet restaurant order.');
    }
  };
  const handleToggleGourmetStatus = async (id, currentStatus) => {
    try {
      setError(null);
      setSuccess(null);
      const response = await api.patch(`/food/hero-banners/gourmet/${id}/status`, {}, getAuthConfig());
      if (response.data.success) {
        setSuccess(`Restaurant ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
        await fetchGourmetRestaurants(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setErrorSafely(err.response?.data?.message || 'Failed to update restaurant status.');
    }
  };

  // ---- file pickers (the web's hidden <input type="file"> elements)
  const openBannersPicker = async () => {
    if (bannersUploading) return;
    const files = await pickImage({ multiple: true, compress: false });
    if (!files?.length) return;
    handleBannerFileSelect({ target: { files } });
  };
  const openUnder250BannersPicker = async () => {
    if (under250BannersUploading) return;
    const files = await pickImage({ multiple: true, compress: false });
    if (!files?.length) return;
    handleUnder250BannerFileSelect({ target: { files } });
  };
  const openDiningBannersPicker = async () => {
    if (diningBannersUploading) return;
    const files = await pickImage({ multiple: true, compress: false });
    if (!files?.length) return;
    handleDiningBannerFileSelect({ target: { files } });
  };
  const openFestBannerPicker = async () => {
    if (festBannerUploading) return;
    const file = await pickImage({ compress: false });
    if (!file) return;
    handleFestBannerImageSelect({ target: { files: [file] } });
  };
  const openExploreIconPicker = async (item) => {
    if (exploreIconsUploading[item.id]) return;
    const file = await pickImage({ compress: false });
    if (!file) return;
    handleIconUpdate(file, item.label, item.link, item.id);
  };

  // ==================== RENDER ====================
  const tabs = [
    {
      id: 'banners',
      label: 'Hero Banners',
      icon: ImageIcon,
    },
    {
      id: 'under-250',
      label: '250 Banner',
      icon: Tag,
    },
    {
      id: 'dining',
      label: 'Dining',
      icon: UtensilsCrossed,
    },
    {
      id: 'explore-more',
      label: 'Explore More',
      icon: Layout,
    },
  ];
  const exploreMoreTabs = [
    {
      id: 'icons',
      label: 'Icons',
      icon: ImageIcon,
    },
    ...(selectedZoneId
      ? [
          {
            id: 'gourmet',
            label: 'Gourmet',
            icon: ChefHat,
          },
        ]
      : []),
  ];
  useEffect(() => {
    if (!selectedZoneId && exploreMoreSubTab === 'gourmet') {
      setExploreMoreSubTab('icons');
    }
  }, [selectedZoneId, exploreMoreSubTab]);
  const settingsUnchanged =
    JSON.stringify({
      ...settings,
      recommendedRestaurantIds: [...(settings.recommendedRestaurantIds || [])].sort(),
    }) ===
    JSON.stringify({
      ...originalSettings,
      recommendedRestaurantIds: [...(originalSettings.recommendedRestaurantIds || [])].sort(),
    });
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Layout}
        title="Landing Page Management"
        subtitle="Manage hero banners, the 250 and dining strips, and the Explore More row."
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Landing page' }]}
      />

      <Card className="mb-4">
        <Field label="Filter by zone" hint="Global content applies to every zone.">
          <Select
            nativeID="zone-select"
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            className={INPUT}
            disabled={zonesLoading}
          >
            <Option value="">Global / All Zones</Option>
            {zones.map((zone) => (
              <Option key={zone._id || zone.id} value={zone._id || zone.id}>
                {zone.name || zone.zoneName || 'Unnamed Zone'}
              </Option>
            ))}
          </Select>
        </Field>
      </Card>

      <TabStrip tabs={tabs} active={activeTab} onSelect={setActiveTab} label="Section" />

      {/* Success/Error Messages */}
      {success ? (
        <Card className="mb-4 flex-row items-center gap-2">
          <UiIcon as={CheckCircle2} size={18} className="text-green-700" />
          <Span className="text-sm text-slate-700 flex-1">{success}</Span>
        </Card>
      ) : null}

      {error ? (
        <Card className="mb-4 flex-row items-center gap-2">
          <UiIcon as={AlertCircle} size={18} className="text-red-600" />
          <Span className="text-sm text-slate-700 flex-1">{error}</Span>
        </Card>
      ) : null}

      {/* Hero Banners Tab */}
      {activeTab === 'banners' && (
        <>
          <UploadPanel
            title="Upload New Banner(s)"
            className="mb-4"
            uploading={bannersUploading}
            progress={bannersUploadProgress}
            onPick={openBannersPicker}
          />

          <Card>
            <SectionTitle>{bannersLoading ? 'Banner list' : `Banner list · ${banners.length}`}</SectionTitle>
            {bannersLoading ? (
              <TableSkeleton rows={3} className="border-0 p-0 gap-3" />
            ) : banners.length === 0 ? (
              error ? (
                <ErrorState message={error} onRetry={() => fetchBanners()} className="border-0 px-0 py-6" />
              ) : (
                <EmptyState
                  icon={ImageIcon}
                  title="No banners uploaded yet"
                  message="Hero banners appear at the top of the user home page."
                  actionLabel="Upload a banner"
                  onAction={openBannersPicker}
                  className="border-0 px-0 py-6"
                />
              )
            ) : (
              <Grid max={3}>
                {banners.map((banner, index) => (
                  <BannerCard
                    key={banner._id}
                    imageUrl={resolveAssetUrl(banner.imageUrl)}
                    alt={`Hero banner ${index + 1}`}
                    order={banner.order}
                    isActive={banner.isActive}
                    onUp={() => handleBannerOrderChange(banner._id, 'up')}
                    onDown={() => handleBannerOrderChange(banner._id, 'down')}
                    upDisabled={index === 0}
                    downDisabled={index === banners.length - 1}
                    onToggle={() => handleToggleBannerStatus(banner._id, banner.isActive)}
                    deleting={bannersDeleting === banner._id}
                    onDelete={() => handleDeleteBanner(banner._id)}
                    extra={
                      <>
                        <Button
                          onClick={() => {
                            setSelectedBannerId(banner._id);
                            setSelectedRestaurantIds(banner.linkedRestaurants?.map((r) => r._id || r) || []);
                            if (allRestaurants.length === 0) {
                              fetchAllRestaurants();
                            }
                            setShowRestaurantModal(true);
                          }}
                          accessibilityLabel={`Link a restaurant to hero banner ${index + 1}`}
                          className={BTN_SECONDARY}
                        >
                          <UiIcon as={Megaphone} size={16} className="text-slate-600" />
                          <Span className={BTN_TEXT_SECONDARY}>Advertise</Span>
                        </Button>
                        {banner.linkedRestaurants && banner.linkedRestaurants.length > 0 ? (
                          <Div className="pt-3 border-t border-slate-100 gap-1.5">
                            <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked restaurant</Span>
                            <Div className="flex-row items-center gap-1.5">
                              <UiIcon as={Store} size={14} className="text-slate-500" />
                              <Span className="text-sm font-semibold text-slate-900 flex-1">
                                {banner.linkedRestaurants[0].restaurantName || banner.linkedRestaurants[0].name || 'Restaurant'}
                              </Span>
                            </Div>
                          </Div>
                        ) : null}
                      </>
                    }
                  />
                ))}
              </Grid>
            )}
          </Card>
        </>
      )}

      {/* Under 250 Banner Tab */}
      {activeTab === 'under-250' && (
        <>
          <UploadPanel
            title="Upload New Banner(s)"
            className="mb-4"
            uploading={under250BannersUploading}
            progress={under250BannersUploadProgress}
            onPick={openUnder250BannersPicker}
          />

          <Card>
            <SectionTitle>{under250BannersLoading ? 'Banner list' : `Banner list · ${under250Banners.length}`}</SectionTitle>
            {under250BannersLoading ? (
              <TableSkeleton rows={3} className="border-0 p-0 gap-3" />
            ) : under250Banners.length === 0 ? (
              error ? (
                <ErrorState message={error} onRetry={() => fetchUnder250Banners()} className="border-0 px-0 py-6" />
              ) : (
                <EmptyState
                  icon={Tag}
                  title="No under 250 banners yet"
                  message="These banners sit above the under-price-limit list."
                  actionLabel="Upload a banner"
                  onAction={openUnder250BannersPicker}
                  className="border-0 px-0 py-6"
                />
              )
            ) : (
              <Grid max={3}>
                {under250Banners.map((banner, index) => (
                  <BannerCard
                    key={banner._id}
                    imageUrl={resolveAssetUrl(banner.imageUrl)}
                    alt={`Under 250 banner ${index + 1}`}
                    order={banner.order}
                    isActive={banner.isActive}
                    onUp={() => handleUnder250BannerOrderChange(banner._id, 'up')}
                    onDown={() => handleUnder250BannerOrderChange(banner._id, 'down')}
                    upDisabled={index === 0}
                    downDisabled={index === under250Banners.length - 1}
                    onToggle={() => handleToggleUnder250BannerStatus(banner._id, banner.isActive)}
                    deleting={under250BannersDeleting === banner._id}
                    onDelete={() => handleDeleteUnder250Banner(banner._id)}
                  />
                ))}
              </Grid>
            )}
          </Card>
        </>
      )}

      {/* Dining Banner Tab */}
      {activeTab === 'dining' && (
        <>
          <UploadPanel
            title="Upload New Dining Banner(s)"
            className="mb-4"
            uploading={diningBannersUploading}
            progress={diningBannersUploadProgress}
            onPick={openDiningBannersPicker}
          />

          <Card>
            <SectionTitle>{diningBannersLoading ? 'Banner list' : `Banner list · ${diningBanners.length}`}</SectionTitle>
            {diningBannersLoading ? (
              <TableSkeleton rows={3} className="border-0 p-0 gap-3" />
            ) : diningBanners.length === 0 ? (
              error ? (
                <ErrorState message={error} onRetry={() => fetchDiningBanners()} className="border-0 px-0 py-6" />
              ) : (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No dining banners yet"
                  message="Dining banners head the dining section of the user app."
                  actionLabel="Upload a banner"
                  onAction={openDiningBannersPicker}
                  className="border-0 px-0 py-6"
                />
              )
            ) : (
              <Grid max={3}>
                {diningBanners.map((banner, index) => (
                  <BannerCard
                    key={banner._id}
                    imageUrl={resolveAssetUrl(banner.imageUrl)}
                    alt={`Dining banner ${index + 1}`}
                    order={banner.order}
                    isActive={banner.isActive}
                    onUp={() => handleDiningBannerOrderChange(banner._id, 'up')}
                    onDown={() => handleDiningBannerOrderChange(banner._id, 'down')}
                    upDisabled={index === 0}
                    downDisabled={index === diningBanners.length - 1}
                    onToggle={() => handleToggleDiningBannerStatus(banner._id, banner.isActive)}
                    deleting={diningBannersDeleting === banner._id}
                    onDelete={() => handleDeleteDiningBanner(banner._id)}
                  />
                ))}
              </Grid>
            )}
          </Card>
        </>
      )}

      {/* Explore More Tab */}
      {activeTab === 'explore-more' && (
        <>
          <Card className="mb-4">
            <SectionTitle>Landing Settings</SectionTitle>

            {settingsLoading ? (
              <LoadingState label="Loading settings…" className="border-0 px-0 py-6" />
            ) : (
              <Div className="gap-4">
                <Field label="Explore More Heading">
                  <Input
                    nativeID="explore-more-heading"
                    value={settings.exploreMoreHeading || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        exploreMoreHeading: e.target.value,
                      }))
                    }
                    className={INPUT}
                    placeholder="Explore More"
                  />
                </Field>

                <Field
                  label="Under Price Limit (₹)"
                  hint={`The button reads "Under ₹${settings.under250PriceLimit || 250}" on the user home page.`}
                >
                  <Input
                    nativeID="under-250-price"
                    type="number"
                    min="1"
                    max="10000"
                    value={settings.under250PriceLimit || 250}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        under250PriceLimit: Math.max(1, Number(e.target.value)),
                      }))
                    }
                    className={INPUT}
                    placeholder="250"
                  />
                </Field>

                <Field label="Fest Banner (User Home)" hint="Upload a promo image for the home fest banner. If empty, the default design is shown.">
                  <Div className="gap-3">
                    <Div className="flex-row flex-wrap items-center gap-2">
                      <Button
                        onClick={openFestBannerPicker}
                        disabled={festBannerUploading}
                        accessibilityLabel="Upload the fest banner"
                        className={`${BTN_PRIMARY} ${festBannerUploading ? 'opacity-60' : ''}`}
                      >
                        <UiIcon as={Upload} size={16} className="text-white" />
                        <Span className={BTN_TEXT_PRIMARY}>{festBannerUploading ? 'Uploading…' : 'Upload Banner'}</Span>
                      </Button>
                      <Button
                        onClick={() => {
                          setSettings((prev) => ({
                            ...prev,
                            festBannerImageUrl: '',
                            festBannerTopColor: '',
                          }));
                          setSelectedFestBannerFile(null);
                        }}
                        disabled={festBannerUploading || !settings.festBannerImageUrl}
                        accessibilityLabel="Remove the fest banner"
                        className={`${BTN_SECONDARY} ${festBannerUploading || !settings.festBannerImageUrl ? 'opacity-40' : ''}`}
                      >
                        <Span className={BTN_TEXT_SECONDARY}>Remove Banner</Span>
                      </Button>
                    </Div>
                    {settings.festBannerImageUrl ? (
                      <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <Span className="text-xs text-slate-700">{settings.festBannerImageUrl}</Span>
                      </Div>
                    ) : (
                      <Span className="text-xs text-slate-500">No banner uploaded.</Span>
                    )}
                  </Div>
                </Field>

                {selectedZoneId !== '' && selectedZoneId != null && (
                  <Field label="Recommended For You Restaurants" hint="Choose multiple restaurants to display below filters on the user home page.">
                    <Div className="gap-3">
                      <Div className="flex-row items-center gap-2">
                        <UiIcon as={Search} size={16} className="text-slate-400" />
                        <Input
                          nativeID="recommended-search"
                          value={recommendedSearchQuery}
                          onChange={(e) => setRecommendedSearchQuery(e.target.value)}
                          placeholder="Search restaurants..."
                          className={`${INPUT} flex-1`}
                        />
                      </Div>

                      {recommendedRestaurantsSelected.length > 0 && (
                        <Div className="flex-row flex-wrap gap-2">
                          {recommendedRestaurantsSelected.map((restaurant) => (
                            <Button
                              key={restaurant._id}
                              onClick={() => toggleRecommendedRestaurant(restaurant._id)}
                              accessibilityLabel={`Remove ${restaurant.name} from recommended`}
                              className="flex-row items-center gap-1.5 h-11 px-3 rounded-full bg-blue-100"
                            >
                              <Span className="text-xs font-semibold text-blue-700">{restaurant.name}</Span>
                              <UiIcon as={X} size={12} className="text-blue-700" />
                            </Button>
                          ))}
                        </Div>
                      )}

                      <ScrollDiv className="rounded-lg border border-slate-200" style={{ maxHeight: 288 }} contentClassName="p-1">
                        {restaurantsLoading ? (
                          <LoadingState label="Loading restaurants…" className="border-0" />
                        ) : filteredRestaurantsForRecommended.length === 0 ? (
                          <EmptyState
                            icon={Store}
                            title="No restaurants found"
                            message={recommendedSearchQuery ? 'Try a different search term.' : 'No restaurants are available in this zone.'}
                            className="border-0"
                          />
                        ) : (
                          filteredRestaurantsForRecommended.map((restaurant) => {
                            const isChecked = (settings.recommendedRestaurantIds || []).some((id) => String(id) === String(restaurant._id));
                            return (
                              <Div
                                key={restaurant._id}
                                onClick={() => toggleRecommendedRestaurant(restaurant._id)}
                                accessibilityLabel={`${isChecked ? 'Remove' : 'Add'} ${restaurant.name}`}
                                className="flex-row items-center justify-between gap-3 px-3 min-h-[44px] py-2 rounded-lg"
                              >
                                <Span className="text-sm font-medium text-slate-700 flex-1">{restaurant.name}</Span>
                                <Checkbox checked={isChecked} onCheckedChange={() => toggleRecommendedRestaurant(restaurant._id)} className="w-5 h-5" />
                              </Div>
                            );
                          })
                        )}
                      </ScrollDiv>
                    </Div>
                  </Field>
                )}

                <Button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving || settingsLoading || settingsUnchanged}
                  accessibilityLabel="Save landing settings"
                  className={`${BTN_PRIMARY} ${settingsSaving || settingsLoading || settingsUnchanged ? 'opacity-40' : ''}`}
                >
                  <Span className={BTN_TEXT_PRIMARY}>{settingsSaving ? 'Saving…' : 'Save Settings'}</Span>
                </Button>
              </Div>
            )}
          </Card>

          {/* Sub-tabs for Explore More */}
          <TabStrip tabs={exploreMoreTabs} active={exploreMoreSubTab} onSelect={setExploreMoreSubTab} label="Explore More" />

          {/* Icons Tab Content */}
          {exploreMoreSubTab === 'icons' && (
            <Card>
              <SectionTitle>Manage Explore More Icons</SectionTitle>
              {exploreMoreLoading ? (
                <LoadingState label="Loading icons…" className="border-0 px-0 py-6" />
              ) : (
                <Grid max={4}>
                  {[
                    {
                      id: 'offers',
                      label: 'Offers',
                      link: '/user/offers',
                    },
                    {
                      id: 'gourmet',
                      label: 'Gourmet',
                      link: '/user/gourmet',
                    },
                    {
                      id: 'collection',
                      label: 'Collections',
                      link: '/user/profile/favorites',
                    },
                    {
                      id: 'under-250',
                      label: 'Under 250',
                      link: '/food/user/under-250',
                    },
                  ].map((item) => {
                    // Find matching item from DB
                    const dbItem = exploreMore.find((i) => {
                      const dbLabel = i.label?.toLowerCase().trim() || '';
                      const itemLabel = item.label.toLowerCase().trim();
                      return dbLabel === itemLabel || dbLabel.replace(/s$/, '') === itemLabel.replace(/s$/, '');
                    });
                    const iconSrc = resolveAssetUrl(dbItem?.imageUrl || dbItem?.iconUrl) || null;
                    const busy = !!exploreIconsUploading[item.id];
                    return (
                      <Card key={item.id} className="items-center gap-3">
                        <Span className="text-sm font-semibold text-slate-900">{item.label}</Span>
                        <Div className="w-24 h-24 rounded-lg bg-slate-50 border border-slate-200 items-center justify-center overflow-hidden">
                          {busy ? (
                            <ActivityIndicator size="small" color={A.primary} />
                          ) : iconSrc ? (
                            <Img src={iconSrc} alt={item.label} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                          ) : (
                            <UiIcon as={ImageIcon} size={28} className="text-slate-300" />
                          )}
                        </Div>
                        <Button
                          onClick={() => openExploreIconPicker(item)}
                          disabled={busy}
                          accessibilityLabel={`${dbItem ? 'Change' : 'Upload'} the ${item.label} icon`}
                          className={`${BTN_SECONDARY} w-full ${busy ? 'opacity-40' : ''}`}
                        >
                          <UiIcon as={Upload} size={14} className="text-slate-600" />
                          <Span className={BTN_TEXT_SECONDARY}>{dbItem ? 'Change Icon' : 'Upload Icon'}</Span>
                        </Button>
                      </Card>
                    );
                  })}
                </Grid>
              )}
            </Card>
          )}

          {/* Gourmet Tab Content */}
          {exploreMoreSubTab === 'gourmet' && (
            <>
              <Card className="mb-4">
                <SectionTitle>Add Restaurant to Gourmet</SectionTitle>
                <Div className="gap-3">
                  <Field label="Select Restaurant" hint={restaurantsLoading ? 'Loading restaurants…' : undefined}>
                    <Select
                      nativeID="restaurant-gourmet"
                      value={selectedRestaurantGourmet}
                      onChange={(e) => setSelectedRestaurantGourmet(e.target.value)}
                      className={INPUT}
                      disabled={restaurantsLoading}
                    >
                      {allRestaurants.length === 0 ? (
                        <Option value="" disabled>
                          No restaurant found
                        </Option>
                      ) : (
                        <>
                          <Option value="">Select a restaurant...</Option>
                          {allRestaurants.map((restaurant) => {
                            const isAdded = gourmetRestaurants.some((gr) => gr.restaurant?._id === restaurant._id);
                            return (
                              <Option key={restaurant._id} value={restaurant._id} disabled={isAdded}>
                                {restaurant.name} {isAdded ? '(Already selected)' : ''}
                              </Option>
                            );
                          })}
                        </>
                      )}
                    </Select>
                  </Field>
                  <Button
                    onClick={handleAddGourmetRestaurant}
                    disabled={!selectedRestaurantGourmet}
                    accessibilityLabel="Add the selected restaurant to Gourmet"
                    className={`${BTN_PRIMARY} ${!selectedRestaurantGourmet ? 'opacity-40' : ''} self-start`}
                  >
                    <Span className={BTN_TEXT_PRIMARY}>Add to Gourmet</Span>
                  </Button>
                </Div>
              </Card>

              <Card>
                <SectionTitle>{gourmetLoading ? 'Gourmet restaurants' : `Gourmet restaurants · ${gourmetRestaurants.length}`}</SectionTitle>
                {gourmetLoading ? (
                  <TableSkeleton rows={3} className="border-0 p-0 gap-3" />
                ) : gourmetRestaurants.length === 0 ? (
                  error ? (
                    <ErrorState message={error} onRetry={() => fetchGourmetRestaurants()} className="border-0 px-0 py-6" />
                  ) : (
                    <EmptyState
                      icon={ChefHat}
                      title="No restaurants in Gourmet yet"
                      message="Pick a restaurant above to feature it in the Gourmet row."
                      className="border-0 px-0 py-6"
                    />
                  )
                ) : (
                  <Grid max={4}>
                    {gourmetRestaurants
                      .sort((a, b) => a.order - b.order)
                      .map((item, index) => {
                        // Get restaurant cover image with priority: coverImages > menuImages > profileImage
                        const coverImages =
                          item.restaurant?.coverImages && item.restaurant.coverImages.length > 0
                            ? item.restaurant.coverImages.map((img) => img.url || img).filter(Boolean)
                            : [];
                        const menuImages =
                          item.restaurant?.menuImages && item.restaurant.menuImages.length > 0
                            ? item.restaurant.menuImages.map((img) => img.url || img).filter(Boolean)
                            : [];
                        const restaurantImage =
                          coverImages.length > 0
                            ? coverImages[0]
                            : menuImages.length > 0
                              ? menuImages[0]
                              : item.restaurant?.profileImage?.url || 'https://via.placeholder.com/400';
                        return (
                          <Card key={item._id} padded={false} className="overflow-hidden">
                            <Img src={restaurantImage} alt={item.restaurant?.name} style={{ width: '100%', height: 128 }} contentFit="cover" />
                            <Div className="p-3 gap-2">
                              <Span className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                                {item.restaurant?.name || 'N/A'}
                              </Span>
                              <Div className="flex-row items-center gap-2 flex-wrap">
                                <Div className="flex-row items-center gap-1">
                                  <UiIcon as={Star} size={12} className="text-amber-500" />
                                  <Span className="text-xs font-semibold text-slate-700">{String(item.restaurant?.rating || 0)}</Span>
                                </Div>
                                <StatusBadge status={item.isActive ? 'active' : 'inactive'} label={item.isActive ? 'Active' : 'Inactive'} />
                              </Div>
                              <Div className="flex-row items-center flex-wrap gap-2">
                                <IconButton
                                  icon={ArrowUp}
                                  onPress={() => handleGourmetOrderChange(item._id, 'up')}
                                  disabled={index === 0}
                                  label={`Move ${item.restaurant?.name || 'restaurant'} up`}
                                />
                                <IconButton
                                  icon={ArrowDown}
                                  onPress={() => handleGourmetOrderChange(item._id, 'down')}
                                  disabled={index === gourmetRestaurants.length - 1}
                                  label={`Move ${item.restaurant?.name || 'restaurant'} down`}
                                />
                                <Div className="flex-1" />
                                <IconButton
                                  icon={Trash2}
                                  tone="danger"
                                  busy={gourmetDeleting === item._id}
                                  disabled={gourmetDeleting === item._id}
                                  onPress={() => handleDeleteGourmetRestaurant(item._id)}
                                  label={`Remove ${item.restaurant?.name || 'restaurant'} from Gourmet`}
                                />
                              </Div>
                              <Button
                                onClick={() => handleToggleGourmetStatus(item._id, item.isActive)}
                                accessibilityLabel={item.isActive ? `Deactivate ${item.restaurant?.name || 'restaurant'}` : `Activate ${item.restaurant?.name || 'restaurant'}`}
                                className={BTN_SECONDARY}
                              >
                                <Span className={BTN_TEXT_SECONDARY}>{item.isActive ? 'Deactivate' : 'Activate'}</Span>
                              </Button>
                            </Div>
                          </Card>
                        );
                      })}
                  </Grid>
                )}
              </Card>
            </>
          )}
        </>
      )}

      {/* Restaurant Selection Modal */}
      <Dialog open={showRestaurantModal} onOpenChange={setShowRestaurantModal}>
        <DialogContent className="max-w-xl p-0">
          <DialogHeader className="px-4 pt-5 pb-4 border-b border-slate-200">
            <DialogTitle className="text-lg font-bold text-slate-900">Select Restaurant to Link with Banner</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              The restaurant you pick opens when a user taps this banner.
            </DialogDescription>
          </DialogHeader>

          <Div className="p-4 gap-3">
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name or ID"
                value={restaurantSearchQuery}
                onChange={(e) => setRestaurantSearchQuery(e.target.value)}
                className={`${INPUT} flex-1`}
              />
            </Div>
            {selectedRestaurantIds.length > 0 && (
              <Div className="flex-row items-center gap-2 flex-wrap">
                <StatusBadge tone="info" label="Restaurant selected" />
                <Button onClick={() => setSelectedRestaurantIds([])} accessibilityLabel="Clear the selection" className={BTN_SECONDARY}>
                  <UiIcon as={Trash2} size={14} className="text-red-600" />
                  <Span className={BTN_TEXT_SECONDARY}>Clear selection</Span>
                </Button>
              </Div>
            )}

            {restaurantsLoading ? (
              <LoadingState label="Loading restaurants…" />
            ) : filteredRestaurantsForModal.length === 0 ? (
              <EmptyState
                icon={Store}
                title="No restaurants found"
                message={restaurantSearchQuery ? 'Try a different search term.' : 'No restaurants available.'}
              />
            ) : (
              <Div className="rounded-xl border border-slate-200 overflow-hidden">
                {filteredRestaurantsForModal.map((restaurant, i) => {
                  const isSelected = selectedRestaurantIds.includes(restaurant._id);
                  const profileImageUrl = restaurant.profileImage?.url || restaurant.profileImage || null;
                  return (
                    <Div
                      key={restaurant._id}
                      className={`flex-row items-center gap-3 px-3 py-3 ${i < filteredRestaurantsForModal.length - 1 ? 'border-b border-slate-100' : ''} ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                      onClick={() => toggleRestaurantSelection(restaurant._id)}
                      accessibilityLabel={`${isSelected ? 'Unselect' : 'Select'} ${restaurant.name || 'restaurant'}`}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleRestaurantSelection(restaurant._id)} className="w-5 h-5" />
                      {profileImageUrl ? (
                        <Img src={profileImageUrl} alt={restaurant.name} style={{ width: 44, height: 44 }} className="rounded-lg border border-slate-200" contentFit="cover" />
                      ) : (
                        <Div className="w-11 h-11 rounded-lg bg-slate-100 items-center justify-center">
                          <Span className="text-base font-bold text-slate-500">{restaurant.name?.charAt(0)?.toUpperCase() || 'R'}</Span>
                        </Div>
                      )}
                      <Div className="flex-1">
                        <Span className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                          {restaurant.name || 'Unnamed Restaurant'}
                        </Span>
                        <Span className="text-xs text-slate-500" numberOfLines={1}>
                          {`ID: ${restaurant.restaurantId || restaurant._id}`}
                        </Span>
                        {restaurant.rating !== undefined && restaurant.rating !== null && (
                          <Div className="flex-row items-center gap-1 mt-0.5">
                            <UiIcon as={Star} size={12} className="text-amber-500" />
                            <Span className="text-xs font-semibold text-slate-700">{String(restaurant.rating)}</Span>
                          </Div>
                        )}
                      </Div>
                      {isSelected ? <UiIcon as={CheckCircle2} size={20} className="text-blue-600" /> : null}
                    </Div>
                  );
                })}
              </Div>
            )}
          </Div>

          <Div className="px-4 py-4 gap-3 border-t border-slate-200">
            <Span className="text-xs text-slate-500">
              {`${filteredRestaurantsForModal.length} restaurant${filteredRestaurantsForModal.length !== 1 ? 's' : ''} available`}
            </Span>
            <Div className="flex-row flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  setShowRestaurantModal(false);
                  setSelectedBannerId(null);
                  setSelectedRestaurantIds([]);
                  setRestaurantSearchQuery('');
                }}
                accessibilityLabel="Cancel"
                className={`${BTN_SECONDARY} flex-1`}
              >
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button
                onClick={handleLinkRestaurants}
                disabled={linkingRestaurants}
                accessibilityLabel={selectedRestaurantIds.length === 0 ? 'Save selection' : 'Link restaurant'}
                className={`${BTN_PRIMARY} flex-1 ${linkingRestaurants ? 'opacity-60' : ''}`}
              >
                {linkingRestaurants ? null : <UiIcon as={Megaphone} size={16} className="text-white" />}
                <Span className={BTN_TEXT_PRIMARY}>
                  {linkingRestaurants ? 'Saving…' : selectedRestaurantIds.length === 0 ? 'Save Selection' : 'Link Restaurant'}
                </Span>
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
