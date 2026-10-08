/* Ported from Frontend/src/modules/Food/pages/admin/system/LandingPageManagement.jsx (tools/port.js first pass). */
import { useState, useEffect, useMemo } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2,
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
} from 'lucide-react-native';
import api from '../../../../api/food';
import { adminAPI } from '../../../../api/food';
import { getModuleToken } from '../../../../admin/session';
import { Input } from '../../../../components/shadcn';
import { Label } from '../../../../components/shadcn';
import { Button } from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import { Checkbox } from '../../../../components/shadcn';
import { prepareUploadFile, prepareUploadFiles } from '../../../../lib/images';
import { pickImage, objectUrl } from '../../../../lib/files';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveAssetUrl } from '../../../../shared/utils/assetUrl';
import { Button as HtmlButton, Div, H1, H2, H3, HScroll, Img, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <UiIcon as={Layout} className="w-5 h-5 text-white" />
            </Div>
            <Div>
              <H1 className="text-2xl font-bold text-slate-900">Landing Page Management</H1>
              <P className="text-sm text-slate-600 mt-1">Manage hero banners</P>
            </Div>

            <Div className="flex items-center gap-2 mt-4 sm:mt-0 ml-auto">
              <Label htmlFor="zone-select" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Filter by Zone:
              </Label>
              <Select
                nativeID="zone-select"
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-48"
                disabled={zonesLoading}
              >
                <Option value="">Global / All Zones</Option>
                {zones.map((zone) => (
                  <Option key={zone._id || zone.id} value={zone._id || zone.id}>
                    {zone.name || zone.zoneName || 'Unnamed Zone'}
                  </Option>
                ))}
              </Select>
            </Div>
          </Div>
        </Div>

        {/* Tabs */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 mb-6">
          <HScroll contentClassName="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <HtmlButton
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <UiIcon as={Icon} className="w-4 h-4" />
                  {tab.label}
                </HtmlButton>
              );
            })}
          </HScroll>
        </Div>

        {/* Success/Error Messages */}
        {success && (
          <Div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <UiIcon as={CheckCircle2} className="w-5 h-5" />
            <Span>{success}</Span>
          </Div>
        )}

        {error && (
          <Div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <UiIcon as={AlertCircle} className="w-5 h-5" />
            <Span>{error}</Span>
          </Div>
        )}

        {/* Hero Banners Tab */}
        {activeTab === 'banners' && (
          <>
            {/* Upload Section */}
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <H2 className="text-lg font-bold text-slate-900 mb-4">Upload New Banner(s)</H2>
              <Div
                className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50/30 cursor-pointer transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                onClick={openBannersPicker}
              >
                {bannersUploading ? (
                  <Div className="flex flex-col items-center gap-3">
                    <UiIcon as={Loader2} className="w-8 h-8 text-blue-600 animate-spin" />
                    <P className="text-blue-600 font-medium">
                      Uploading image {bannersUploadProgress.current} of {bannersUploadProgress.total}...
                    </P>
                    {bannersUploadProgress.total > 0 && (
                      <Div className="w-full max-w-xs">
                        <Div className="w-full bg-blue-200 rounded-full h-2">
                          <Div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(bannersUploadProgress.current / bannersUploadProgress.total) * 100}%`,
                            }}
                          />
                        </Div>
                      </Div>
                    )}
                  </Div>
                ) : (
                  <Div className="flex flex-col items-center gap-3">
                    <UiIcon as={Upload} className="w-8 h-8 text-blue-600" />
                    <Div>
                      <HtmlButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBannersPicker();
                        }}
                        className="text-blue-600 font-medium hover:text-blue-700 underline"
                      >
                        Click to upload
                      </HtmlButton>
                      <Span className="text-slate-600"> or drag and drop</Span>
                    </Div>
                    <P className="text-xs text-slate-500">PNG, JPG, WEBP up to 5MB each (Max 5 images at once)</P>
                  </Div>
                )}
              </Div>
            </Div>

            {/* Banners List */}
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <H2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Span>Banner List</Span>
                {bannersLoading ? <Span className="w-8 h-5 bg-slate-200 animate-pulse rounded inline-block" /> : <Span>({banners.length})</Span>}
              </H2>
              {bannersLoading ? (
                <Div className="flex items-center justify-center py-12">
                  <UiIcon as={Loader2} className="w-8 h-8 text-blue-600 animate-spin" />
                </Div>
              ) : banners.length === 0 ? (
                <Div className="text-center py-12 text-slate-500">
                  <UiIcon as={ImageIcon} className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <P>No banners uploaded yet.</P>
                </Div>
              ) : (
                <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {banners.map((banner, index) => (
                    <Div key={banner._id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <Div className="relative aspect-video bg-slate-100">
                        <Img src={resolveAssetUrl(banner.imageUrl)} alt={`Hero Banner ${index + 1}`} className="w-full h-full object-cover" />
                        <Div className="absolute top-2 right-2">
                          <Span
                            className={`px-2 py-1 rounded text-xs font-medium ${banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </Span>
                        </Div>
                        <Div className="absolute top-2 left-2">
                          <Span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">Order: {banner.order}</Span>
                        </Div>
                      </Div>
                      <Div className="p-4 bg-white">
                        <Div className="flex items-center justify-between gap-2 flex-wrap">
                          <Div className="flex items-center gap-1">
                            <HtmlButton
                              onClick={() => handleBannerOrderChange(banner._id, 'up')}
                              disabled={index === 0}
                              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50"
                            >
                              <UiIcon as={ArrowUp} className="w-4 h-4 text-slate-600" />
                            </HtmlButton>
                            <HtmlButton
                              onClick={() => handleBannerOrderChange(banner._id, 'down')}
                              disabled={index === banners.length - 1}
                              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50"
                            >
                              <UiIcon as={ArrowDown} className="w-4 h-4 text-slate-600" />
                            </HtmlButton>
                          </Div>
                          <Div className="flex items-center gap-2 flex-wrap">
                            <HtmlButton
                              onClick={() => {
                                setSelectedBannerId(banner._id);
                                setSelectedRestaurantIds(banner.linkedRestaurants?.map((r) => r._id || r) || []);
                                if (allRestaurants.length === 0) {
                                  fetchAllRestaurants();
                                }
                                setShowRestaurantModal(true);
                              }}
                              className="px-3 py-1.5 rounded text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1"
                            >
                              <UiIcon as={Megaphone} className="w-4 h-4" />
                              Advertise
                            </HtmlButton>
                            <HtmlButton
                              onClick={() => handleToggleBannerStatus(banner._id, banner.isActive)}
                              className={`px-3 py-1.5 rounded text-sm font-medium ${banner.isActive ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
                            >
                              {banner.isActive ? 'Deactivate' : 'Activate'}
                            </HtmlButton>
                            <HtmlButton
                              onClick={() => handleDeleteBanner(banner._id)}
                              disabled={bannersDeleting === banner._id}
                              className="p-1.5 rounded hover:bg-red-100 text-red-600 disabled:opacity-50"
                            >
                              {bannersDeleting === banner._id ? (
                                <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                              ) : (
                                <UiIcon as={Trash2} className="w-4 h-4" />
                              )}
                            </HtmlButton>
                          </Div>
                        </Div>
                        {banner.linkedRestaurants && banner.linkedRestaurants.length > 0 && (
                          <Div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                            <Span className="text-xs font-semibold text-slate-500">Linked Restaurant:</Span>
                            <Div className="flex items-center gap-1.5 bg-yellow-100/70 hover:bg-yellow-100 border border-yellow-200 rounded-lg px-3 py-1.5 transition-all shadow-sm">
                              <UiIcon as={Store} className="w-3.5 h-3.5 text-yellow-700" />
                              <Span className="text-xs font-bold text-slate-800">
                                {banner.linkedRestaurants[0].restaurantName || banner.linkedRestaurants[0].name || 'Restaurant'}
                              </Span>
                            </Div>
                          </Div>
                        )}
                      </Div>
                    </Div>
                  ))}
                </Div>
              )}
            </Div>
          </>
        )}

        {/* Under 250 Banner Tab */}
        {activeTab === 'under-250' && (
          <>
            {/* Upload Section */}
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <H2 className="text-lg font-bold text-slate-900 mb-4">Upload New Banner(s)</H2>
              <Div
                className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50/30 cursor-pointer transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                onClick={openUnder250BannersPicker}
              >
                {under250BannersUploading ? (
                  <Div className="flex flex-col items-center gap-3">
                    <UiIcon as={Loader2} className="w-8 h-8 text-blue-600 animate-spin" />
                    <P className="text-blue-600 font-medium">
                      Uploading image {under250BannersUploadProgress.current} of {under250BannersUploadProgress.total}...
                    </P>
                    {under250BannersUploadProgress.total > 0 && (
                      <Div className="w-full max-w-xs">
                        <Div className="w-full bg-blue-200 rounded-full h-2">
                          <Div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(under250BannersUploadProgress.current / under250BannersUploadProgress.total) * 100}%`,
                            }}
                          />
                        </Div>
                      </Div>
                    )}
                  </Div>
                ) : (
                  <Div className="flex flex-col items-center gap-3">
                    <UiIcon as={Upload} className="w-8 h-8 text-blue-600" />
                    <Div>
                      <HtmlButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openUnder250BannersPicker();
                        }}
                        className="text-blue-600 font-medium hover:text-blue-700 underline"
                      >
                        Click to upload
                      </HtmlButton>
                      <Span className="text-slate-600"> or drag and drop</Span>
                    </Div>
                    <P className="text-xs text-slate-500">PNG, JPG, WEBP up to 5MB each (Max 5 images at once)</P>
                  </Div>
                )}
              </Div>
            </Div>

            {/* Banners List */}
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <H2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Span>Banner List</Span>
                {under250BannersLoading ? (
                  <Span className="w-8 h-5 bg-slate-200 animate-pulse rounded inline-block" />
                ) : (
                  <Span>({under250Banners.length})</Span>
                )}
              </H2>
              {under250BannersLoading ? (
                <Div className="flex items-center justify-center py-12">
                  <UiIcon as={Loader2} className="w-8 h-8 text-blue-600 animate-spin" />
                </Div>
              ) : under250Banners.length === 0 ? (
                <Div className="text-center py-12 text-slate-500">
                  <UiIcon as={Tag} className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <P>No under 250 banners uploaded yet.</P>
                </Div>
              ) : (
                <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {under250Banners.map((banner, index) => (
                    <Div key={banner._id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <Div className="relative aspect-video bg-slate-100">
                        <Img src={resolveAssetUrl(banner.imageUrl)} alt={`Under 250 Banner ${index + 1}`} className="w-full h-full object-cover" />
                        <Div className="absolute top-2 right-2">
                          <Span
                            className={`px-2 py-1 rounded text-xs font-medium ${banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </Span>
                        </Div>
                        <Div className="absolute top-2 left-2">
                          <Span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">Order: {banner.order}</Span>
                        </Div>
                      </Div>
                      <Div className="p-4 bg-white">
                        <Div className="flex items-center justify-between gap-2">
                          <Div className="flex items-center gap-1">
                            <HtmlButton
                              onClick={() => handleUnder250BannerOrderChange(banner._id, 'up')}
                              disabled={index === 0}
                              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50"
                            >
                              <UiIcon as={ArrowUp} className="w-4 h-4 text-slate-600" />
                            </HtmlButton>
                            <HtmlButton
                              onClick={() => handleUnder250BannerOrderChange(banner._id, 'down')}
                              disabled={index === under250Banners.length - 1}
                              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50"
                            >
                              <UiIcon as={ArrowDown} className="w-4 h-4 text-slate-600" />
                            </HtmlButton>
                          </Div>
                          <HtmlButton
                            onClick={() => handleToggleUnder250BannerStatus(banner._id, banner.isActive)}
                            className={`px-3 py-1.5 rounded text-sm font-medium ${banner.isActive ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
                          >
                            {banner.isActive ? 'Deactivate' : 'Activate'}
                          </HtmlButton>
                          <HtmlButton
                            onClick={() => handleDeleteUnder250Banner(banner._id)}
                            disabled={under250BannersDeleting === banner._id}
                            className="p-1.5 rounded hover:bg-red-100 text-red-600 disabled:opacity-50"
                          >
                            {under250BannersDeleting === banner._id ? (
                              <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                            ) : (
                              <UiIcon as={Trash2} className="w-4 h-4" />
                            )}
                          </HtmlButton>
                        </Div>
                      </Div>
                    </Div>
                  ))}
                </Div>
              )}
            </Div>
          </>
        )}

        {/* Dining Banner Tab */}
        {activeTab === 'dining' && (
          <>
            {/* Upload Section */}
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <H2 className="text-lg font-bold text-slate-900 mb-4">Upload New Dining Banner(s)</H2>
              <Div
                className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50/30 cursor-pointer transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                onClick={openDiningBannersPicker}
              >
                {diningBannersUploading ? (
                  <Div className="flex flex-col items-center gap-3">
                    <UiIcon as={Loader2} className="w-8 h-8 text-blue-600 animate-spin" />
                    <P className="text-blue-600 font-medium">
                      Uploading image {diningBannersUploadProgress.current} of {diningBannersUploadProgress.total}...
                    </P>
                    {diningBannersUploadProgress.total > 0 && (
                      <Div className="w-full max-w-xs">
                        <Div className="w-full bg-blue-200 rounded-full h-2">
                          <Div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(diningBannersUploadProgress.current / diningBannersUploadProgress.total) * 100}%`,
                            }}
                          />
                        </Div>
                      </Div>
                    )}
                  </Div>
                ) : (
                  <Div className="flex flex-col items-center gap-3">
                    <UiIcon as={Upload} className="w-8 h-8 text-blue-600" />
                    <Div>
                      <HtmlButton
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDiningBannersPicker();
                        }}
                        className="text-blue-600 font-medium hover:text-blue-700 underline"
                      >
                        Click to upload
                      </HtmlButton>
                      <Span className="text-slate-600"> or drag and drop</Span>
                    </Div>
                    <P className="text-xs text-slate-500">PNG, JPG, WEBP up to 5MB each (Max 5 images at once)</P>
                  </Div>
                )}
              </Div>
            </Div>

            {/* Banners List */}
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <H2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Span>Banner List</Span>
                {diningBannersLoading ? <Span className="w-8 h-5 bg-slate-200 animate-pulse rounded inline-block" /> : <Span>({diningBanners.length})</Span>}
              </H2>
              {diningBannersLoading ? (
                <Div className="flex items-center justify-center py-12">
                  <UiIcon as={Loader2} className="w-8 h-8 text-blue-600 animate-spin" />
                </Div>
              ) : diningBanners.length === 0 ? (
                <Div className="text-center py-12 text-slate-500">
                  <UiIcon as={UtensilsCrossed} className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <P>No dining banners uploaded yet.</P>
                </Div>
              ) : (
                <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {diningBanners.map((banner, index) => (
                    <Div key={banner._id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <Div className="relative aspect-video bg-slate-100">
                        <Img src={resolveAssetUrl(banner.imageUrl)} alt={`Dining Banner ${index + 1}`} className="w-full h-full object-cover" />
                        <Div className="absolute top-2 right-2">
                          <Span
                            className={`px-2 py-1 rounded text-xs font-medium ${banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </Span>
                        </Div>
                        <Div className="absolute top-2 left-2">
                          <Span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">Order: {banner.order}</Span>
                        </Div>
                      </Div>
                      <Div className="p-4 bg-white">
                        <Div className="flex items-center justify-between gap-2">
                          <Div className="flex items-center gap-1">
                            <HtmlButton
                              onClick={() => handleDiningBannerOrderChange(banner._id, 'up')}
                              disabled={index === 0}
                              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50"
                            >
                              <UiIcon as={ArrowUp} className="w-4 h-4 text-slate-600" />
                            </HtmlButton>
                            <HtmlButton
                              onClick={() => handleDiningBannerOrderChange(banner._id, 'down')}
                              disabled={index === diningBanners.length - 1}
                              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-50"
                            >
                              <UiIcon as={ArrowDown} className="w-4 h-4 text-slate-600" />
                            </HtmlButton>
                          </Div>
                          <HtmlButton
                            onClick={() => handleToggleDiningBannerStatus(banner._id, banner.isActive)}
                            className={`px-3 py-1.5 rounded text-sm font-medium ${banner.isActive ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
                          >
                            {banner.isActive ? 'Deactivate' : 'Activate'}
                          </HtmlButton>
                          <HtmlButton
                            onClick={() => handleDeleteDiningBanner(banner._id)}
                            disabled={diningBannersDeleting === banner._id}
                            className="p-1.5 rounded hover:bg-red-100 text-red-600 disabled:opacity-50"
                          >
                            {diningBannersDeleting === banner._id ? (
                              <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                            ) : (
                              <UiIcon as={Trash2} className="w-4 h-4" />
                            )}
                          </HtmlButton>
                        </Div>
                      </Div>
                    </Div>
                  ))}
                </Div>
              )}
            </Div>
          </>
        )}

        {/* Explore More Tab */}
        {activeTab === 'explore-more' && (
          <>
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <Div className="flex items-center justify-between gap-3 mb-4">
                <H2 className="text-lg font-bold text-slate-900">Landing Settings</H2>
                <Button
                  onClick={handleSaveSettings}
                  disabled={
                    settingsSaving ||
                    settingsLoading ||
                    JSON.stringify({
                      ...settings,
                      recommendedRestaurantIds: [...(settings.recommendedRestaurantIds || [])].sort(),
                    }) ===
                      JSON.stringify({
                        ...originalSettings,
                        recommendedRestaurantIds: [...(originalSettings.recommendedRestaurantIds || [])].sort(),
                      })
                  }
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {settingsSaving ? <UiIcon as={Loader2} className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Settings
                </Button>
              </Div>

              {settingsLoading ? (
                <Div className="flex items-center justify-center py-8">
                  <UiIcon as={Loader2} className="w-6 h-6 text-blue-600 animate-spin" />
                </Div>
              ) : (
                <Div className="space-y-5">
                  <Div>
                    <Label htmlFor="explore-more-heading">Explore More Heading</Label>
                    <Input
                      id="explore-more-heading"
                      value={settings.exploreMoreHeading || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          exploreMoreHeading: e.target.value,
                        }))
                      }
                      className="mt-2"
                      placeholder="Explore More"
                    />
                  </Div>

                  <Div>
                    <Label htmlFor="under-250-price">Under Price Limit (₹)</Label>
                    <Input
                      id="under-250-price"
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
                      className="mt-2"
                      placeholder="250"
                    />
                    <P className="text-xs text-slate-500 mt-1">Button will show {'"'}Under ₹{settings.under250PriceLimit || 250}{'"'} on user home page</P>
                  </Div>

                  <Div>
                    <Label>Fest Banner (User Home)</Label>
                    <P className="text-xs text-slate-500 mt-1 mb-3">Upload a promo image for the home fest banner. If empty, the default design is shown.</P>
                    <Div className="flex flex-col gap-3">
                      <Div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          onClick={openFestBannerPicker}
                          disabled={festBannerUploading}
                          className="bg-slate-900 hover:bg-slate-800 text-white"
                        >
                          {festBannerUploading ? <UiIcon as={Loader2} className="w-4 h-4 animate-spin mr-2" /> : null}
                          {festBannerUploading ? 'Uploading...' : 'Upload Banner'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSettings((prev) => ({
                              ...prev,
                              festBannerImageUrl: '',
                              festBannerTopColor: '',
                            }));
                            setSelectedFestBannerFile(null);
                          }}
                          disabled={festBannerUploading || !settings.festBannerImageUrl}
                        >
                          Remove Banner
                        </Button>
                      </Div>
                      {settings.festBannerImageUrl ? (
                        <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 break-all">{settings.festBannerImageUrl}</Div>
                      ) : (
                        <P className="text-xs text-slate-500">No banner uploaded.</P>
                      )}
                    </Div>
                  </Div>

                  {selectedZoneId !== '' && selectedZoneId != null && (
                    <Div>
                      <Label htmlFor="recommended-search">Recommended For You Restaurants</Label>
                      <P className="text-xs text-slate-500 mt-1 mb-2">Choose multiple restaurants to display below filters on the user home page.</P>

                      <Div className="relative mb-3">
                        <UiIcon as={Search} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="recommended-search"
                          value={recommendedSearchQuery}
                          onChange={(e) => setRecommendedSearchQuery(e.target.value)}
                          placeholder="Search restaurants..."
                          className="pl-9"
                        />
                      </Div>

                      {recommendedRestaurantsSelected.length > 0 && (
                        <Div className="mb-3 flex flex-wrap gap-2">
                          {recommendedRestaurantsSelected.map((restaurant) => (
                            <HtmlButton
                              key={restaurant._id}
                              type="button"
                              onClick={() => toggleRecommendedRestaurant(restaurant._id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs hover:bg-blue-100"
                            >
                              <Span>{restaurant.name}</Span>
                              <Span className="text-blue-500">x</Span>
                            </HtmlButton>
                          ))}
                        </Div>
                      )}

                      <ScrollDiv className="max-h-72 border border-slate-200 rounded-lg" contentClassName="divide-y divide-slate-100">
                        {filteredRestaurantsForRecommended.length === 0 ? (
                          <Div className="p-4 text-sm text-slate-500 text-center">No restaurants found</Div>
                        ) : (
                          filteredRestaurantsForRecommended.map((restaurant) => {
                            const isChecked = (settings.recommendedRestaurantIds || []).some((id) => String(id) === String(restaurant._id));
                            return (
                              <Div
                                key={restaurant._id}
                                onClick={() => toggleRecommendedRestaurant(restaurant._id)}
                                className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                              >
                                <Div className="min-w-0">
                                  <P className="text-sm font-medium text-slate-800 truncate">{restaurant.name}</P>
                                </Div>
                                <Checkbox checked={isChecked} onCheckedChange={() => toggleRecommendedRestaurant(restaurant._id)} />
                              </Div>
                            );
                          })
                        )}
                      </ScrollDiv>
                    </Div>
                  )}
                </Div>
              )}
            </Div>

            {/* Sub-tabs for Explore More */}
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 mb-6">
              <HScroll contentClassName="flex gap-2">
                {exploreMoreTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === 'explore-more' && (tab.id === 'gourmet' ? gourmetRestaurants.length > 0 : false);
                  return (
                    <HtmlButton
                      key={tab.id}
                      onClick={() => setExploreMoreSubTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${exploreMoreSubTab === tab.id ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <UiIcon as={Icon} className="w-4 h-4" />
                      {tab.label}
                    </HtmlButton>
                  );
                })}
              </HScroll>
            </Div>

            {/* Icons Tab Content */}
            {exploreMoreSubTab === 'icons' && (
              <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <H2 className="text-lg font-bold text-slate-900 mb-6">Manage Explore More Icons</H2>

                <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    return (
                      <Div key={item.id} className="border border-slate-200 rounded-lg p-4 flex flex-col items-center relative">
                        <Span className="text-sm font-semibold text-slate-700 mb-3">{item.label}</Span>

                        <Div className="w-24 h-24 mb-4 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden relative group">
                          {iconSrc ? (
                            <Img src={iconSrc} alt={item.label} className="w-full h-full object-contain p-2" />
                          ) : (
                            <UiIcon as={ImageIcon} className="w-8 h-8 text-slate-300" />
                          )}

                          {exploreIconsUploading[item.id] && (
                            <Div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                              <UiIcon as={Loader2} className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            </Div>
                          )}
                        </Div>

                        <Div className="w-full mt-auto">
                          <HtmlButton
                            type="button"
                            onClick={() => openExploreIconPicker(item)}
                            disabled={!!exploreIconsUploading[item.id]}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer ${exploreIconsUploading[item.id] ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            <UiIcon as={Upload} className="w-3 h-3" />
                            {dbItem ? 'Change Icon' : 'Upload Icon'}
                          </HtmlButton>
                        </Div>
                      </Div>
                    );
                  })}
                </Div>
              </Div>
            )}

            {/* Gourmet Tab Content */}
            {exploreMoreSubTab === 'gourmet' && (
              <>
                <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                  <H2 className="text-lg font-bold text-slate-900 mb-4">Add Restaurant to Gourmet</H2>
                  <Div className="space-y-4">
                    <Div>
                      <Label htmlFor="restaurant-gourmet">Select Restaurant</Label>
                      <Select
                        nativeID="restaurant-gourmet"
                        value={selectedRestaurantGourmet}
                        onChange={(e) => setSelectedRestaurantGourmet(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                  {restaurant.name} {isAdded ? '✅ (Already Selected)' : ''}
                                </Option>
                              );
                            })}
                          </>
                        )}
                      </Select>
                    </Div>
                    <Button onClick={handleAddGourmetRestaurant} disabled={!selectedRestaurantGourmet} className="bg-blue-500 hover:bg-blue-600 text-white">
                      Add to Gourmet
                    </Button>
                  </Div>
                </Div>

                <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <H2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Span>Gourmet Restaurants</Span>
                    {gourmetLoading ? <Span className="w-8 h-5 bg-slate-200 animate-pulse rounded inline-block" /> : <Span>({gourmetRestaurants.length})</Span>}
                  </H2>
                  {gourmetLoading ? (
                    <Div className="flex items-center justify-center py-12">
                      <UiIcon as={Loader2} className="w-8 h-8 text-blue-600 animate-spin" />
                    </Div>
                  ) : gourmetRestaurants.length === 0 ? (
                    <Div className="text-center py-12 text-slate-500">
                      <UiIcon as={ChefHat} className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                      <P>No restaurants added to Gourmet yet.</P>
                    </Div>
                  ) : (
                    <Div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                            <Div key={item._id} className="border border-slate-200 rounded-lg overflow-hidden">
                              <Div className="relative h-32 bg-slate-100">
                                <Img src={restaurantImage} alt={item.restaurant?.name} className="w-full h-full object-cover" />
                                <Div className="absolute top-1 right-1">
                                  <Span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                                  >
                                    {item.isActive ? 'Active' : 'Inactive'}
                                  </Span>
                                </Div>
                              </Div>
                              <Div className="p-2">
                                <H3 className="font-semibold text-slate-900 mb-0.5 text-sm line-clamp-1">{item.restaurant?.name || 'N/A'}</H3>
                                <Div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2">
                                  <UiIcon as={Star} className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                                  <Span className="font-semibold text-slate-700">{item.restaurant?.rating || 0}</Span>
                                </Div>
                                <Div className="flex items-center justify-between gap-1">
                                  <Div className="flex items-center gap-0.5">
                                    <HtmlButton
                                      onClick={() => handleGourmetOrderChange(item._id, 'up')}
                                      disabled={index === 0}
                                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                                    >
                                      <UiIcon as={ArrowUp} className="w-3 h-3 text-slate-600" />
                                    </HtmlButton>
                                    <HtmlButton
                                      onClick={() => handleGourmetOrderChange(item._id, 'down')}
                                      disabled={index === gourmetRestaurants.length - 1}
                                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                                    >
                                      <UiIcon as={ArrowDown} className="w-3 h-3 text-slate-600" />
                                    </HtmlButton>
                                  </Div>
                                  <HtmlButton
                                    onClick={() => handleToggleGourmetStatus(item._id, item.isActive)}
                                    className={`px-2 py-1 rounded text-[10px] font-medium ${item.isActive ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
                                  >
                                    {item.isActive ? 'Deactivate' : 'Activate'}
                                  </HtmlButton>
                                  <HtmlButton
                                    onClick={() => handleDeleteGourmetRestaurant(item._id)}
                                    disabled={gourmetDeleting === item._id}
                                    className="p-1 rounded hover:bg-red-100 text-red-600 disabled:opacity-50"
                                  >
                                    {gourmetDeleting === item._id ? (
                                      <UiIcon as={Loader2} className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <UiIcon as={Trash2} className="w-3 h-3" />
                                    )}
                                  </HtmlButton>
                                </Div>
                              </Div>
                            </Div>
                          );
                        })}
                    </Div>
                  )}
                </Div>
              </>
            )}
          </>
        )}

        {/* Restaurant Selection Modal */}
        <Dialog open={showRestaurantModal} onOpenChange={setShowRestaurantModal}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
              <DialogTitle className="text-2xl font-bold text-slate-900">Select Restaurant to Link with Banner</DialogTitle>
              <DialogDescription className="text-slate-600 mt-2">
                Select a restaurant that will be linked to this banner. When users click on this banner, they will be redirected to the selected restaurant.
              </DialogDescription>
            </DialogHeader>

            <Div className="flex-1 overflow-hidden flex flex-col">
              {/* Search Bar and Selected Count */}
              <Div className="px-6 pt-4 pb-3 space-y-3 bg-slate-50 border-b border-slate-200">
                <Div className="relative">
                  <UiIcon as={Search} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search restaurants by name or ID..."
                    value={restaurantSearchQuery}
                    onChange={(e) => setRestaurantSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </Div>
                {selectedRestaurantIds.length > 0 && (
                  <Div className="flex items-center gap-2">
                    <Div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">Restaurant selected</Div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRestaurantIds([])}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 ml-2"
                    >
                      <UiIcon as={Trash2} className="w-3 h-3 mr-1" />
                      Clear selection
                    </Button>
                  </Div>
                )}
              </Div>

              {/* Restaurant List */}
              <ScrollDiv className="flex-1 bg-white">
                {restaurantsLoading ? (
                  <Div className="flex flex-col items-center justify-center py-16">
                    <UiIcon as={Loader2} className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                    <P className="text-slate-500">Loading restaurants...</P>
                  </Div>
                ) : filteredRestaurantsForModal.length === 0 ? (
                  <Div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <UiIcon as={ImageIcon} className="w-16 h-16 text-slate-300 mb-4" />
                    <P className="text-slate-600 font-medium mb-1">No restaurants found</P>
                    <P className="text-sm text-slate-500">{restaurantSearchQuery ? 'Try a different search term' : 'No restaurants available'}</P>
                  </Div>
                ) : (
                  <Div className="divide-y divide-slate-100">
                    {filteredRestaurantsForModal.map((restaurant) => {
                      const isSelected = selectedRestaurantIds.includes(restaurant._id);
                      const profileImageUrl = restaurant.profileImage?.url || restaurant.profileImage || null;
                      return (
                        <Div
                          key={restaurant._id}
                          className={`px-6 py-4 transition-all cursor-pointer ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50'}`}
                          onClick={() => toggleRestaurantSelection(restaurant._id)}
                        >
                          <Div className="flex items-center gap-4">
                            <Div className="flex-shrink-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleRestaurantSelection(restaurant._id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5"
                              />
                            </Div>

                            {/* Restaurant Image */}
                            <Div className="flex-shrink-0">
                              {profileImageUrl ? (
                                <Img src={profileImageUrl} alt={restaurant.name} className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200" />
                              ) : (
                                <LinearGradient colors={['#60a5fa', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 64, height: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                                  <Span className="text-white font-bold text-lg">{restaurant.name?.charAt(0)?.toUpperCase() || 'R'}</Span>
                                </LinearGradient>
                              )}
                            </Div>

                            {/* Restaurant Info */}
                            <Div className="flex-1 min-w-0">
                              <H3 className={`font-semibold text-base mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                {restaurant.name || 'Unnamed Restaurant'}
                              </H3>
                              <P className="text-sm text-slate-500 truncate">ID: {restaurant.restaurantId || restaurant._id}</P>
                              {restaurant.rating !== undefined && restaurant.rating !== null && (
                                <Div className="flex items-center gap-1 mt-1">
                                  <UiIcon as={Star} className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline" />
                                  <Span className="text-xs font-semibold text-slate-700">{restaurant.rating}</Span>
                                </Div>
                              )}
                            </Div>

                            {/* Selected Indicator */}
                            {isSelected && (
                              <Div className="flex-shrink-0">
                                <Div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                  <UiIcon as={CheckCircle2} className="w-5 h-5 text-white" />
                                </Div>
                              </Div>
                            )}
                          </Div>
                        </Div>
                      );
                    })}
                  </Div>
                )}
              </ScrollDiv>

              {/* Action Buttons */}
              <Div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
                <Div className="text-sm text-slate-600">
                  {filteredRestaurantsForModal.length} restaurant{filteredRestaurantsForModal.length !== 1 ? 's' : ''} available
                </Div>
                <Div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRestaurantModal(false);
                      setSelectedBannerId(null);
                      setSelectedRestaurantIds([]);
                      setRestaurantSearchQuery('');
                    }}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleLinkRestaurants} disabled={linkingRestaurants} className="bg-blue-600 hover:bg-blue-700 text-white px-6 min-w-[140px]">
                    {linkingRestaurants ? (
                      <>
                        <UiIcon as={Loader2} className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : selectedRestaurantIds.length === 0 ? (
                      <>Save Selection</>
                    ) : (
                      <>
                        <UiIcon as={Megaphone} className="w-4 h-4 mr-2" />
                        Link Restaurant
                      </>
                    )}
                  </Button>
                </Div>
              </Div>
            </Div>
          </DialogContent>
        </Dialog>

      </Div>
    </ScrollDiv>
  );
}
