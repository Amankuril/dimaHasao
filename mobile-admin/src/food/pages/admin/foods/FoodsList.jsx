/* Ported from Frontend/src/modules/Food/pages/admin/foods/FoodsList.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from '../../../../lib/webRouter';
import { Search, Trash2, Loader2, Eye, Pencil, Plus, Save, ChevronDown } from 'lucide-react-native';
import { adminAPI, uploadAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { pickImage, objectUrl } from '../../../../lib/files';
import { LinearGradient } from 'expo-linear-gradient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/shadcn';
import { getFoodDisplayPrice, getFoodVariants } from '../../../utils/foodVariants';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import dishFallbackImage from '../../../assets/dish_fallback.webp';
import {
  Button,
  Div,
  H1,
  H2,
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
  Textarea,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
import { window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const createFoodForm = () => ({
  restaurantId: '',
  categoryId: '',
  categoryName: '',
  name: '',
  price: '',
  variants: [],
  description: '',
  image: '',
  foodType: 'Non-Veg',
  isAvailable: true,
  preparationTime: '',
});
const createVariantDraft = (variant = {}) => ({
  id: String(variant?.id || variant?._id || `variant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  name: String(variant?.name || ''),
  price: variant?.price != null ? String(variant.price) : '',
});
const PLACEHOLDER_COLORS = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-slate-500',
];
const isRealFoodImage = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.includes('via.placeholder.com')) return false;
  if (trimmed.includes('placehold')) return false;
  return /^(https?:\/\/|blob:|data:)/i.test(trimmed);
};
const getFoodInitial = (name) => {
  const letter = String(name || '')
    .trim()
    .charAt(0)
    .toUpperCase();
  return /[A-Z0-9]/.test(letter) ? letter : '?';
};
const getPlaceholderColor = (name) => {
  const key = String(name || '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash + key.charCodeAt(i) * (i + 1)) % PLACEHOLDER_COLORS.length;
  }
  return PLACEHOLDER_COLORS[hash] || PLACEHOLDER_COLORS[0];
};
function FoodImageThumb({ name, src, size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const hasImage = isRealFoodImage(src) && !failed;
  const sizeClass = size === 'lg' ? 'w-20 h-20 rounded-xl text-2xl' : 'w-10 h-10 rounded-full text-sm';
  return (
    <Div className={`${sizeClass} overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}>
      <Img src={hasImage ? src : dishFallbackImage} alt={name || 'Food'} className="w-full h-full object-cover" onError={() => setFailed(true)} />
    </Div>
  );
}
export default function FoodsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState('all');
  const [foods, setFoods] = useState([]);
  const [totalFoods, setTotalFoods] = useState(0);
  const [restaurantsForFilter, setRestaurantsForFilter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFoodFormModal, setShowFoodFormModal] = useState(false);
  const [foodFormMode, setFoodFormMode] = useState('add');
  const [foodForm, setFoodForm] = useState(createFoodForm());
  const [editingFood, setEditingFood] = useState(null);
  const [submittingFood, setSubmittingFood] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem('admin_foods_pageSize')) || 20);
  const [imageVersion, setImageVersion] = useState(() => Date.now());
  const isFormDirty = useMemo(() => {
    if (foodFormMode === 'edit') return true;
    const defaultForm = createFoodForm();
    const isBasicDirty =
      foodForm.restaurantId !== defaultForm.restaurantId ||
      foodForm.categoryId !== defaultForm.categoryId ||
      foodForm.categoryName !== defaultForm.categoryName ||
      foodForm.name !== defaultForm.name ||
      foodForm.price !== defaultForm.price ||
      foodForm.description !== defaultForm.description ||
      foodForm.foodType !== defaultForm.foodType ||
      foodForm.isAvailable !== defaultForm.isAvailable ||
      foodForm.preparationTime !== defaultForm.preparationTime;
    const hasVariants = foodForm.variants && foodForm.variants.length > 0;
    const hasImage = selectedImageFile !== null;
    return isBasicDirty || hasVariants || hasImage;
  }, [foodForm, selectedImageFile, foodFormMode]);
  const getItemCreatedMs = (item = {}) => {
    const direct = [item.createdAt, item.addedAt, item.requestedAt, item.updatedAt]
      .map((v) => new Date(v).getTime())
      .find((ms) => Number.isFinite(ms) && ms > 0);
    if (direct) return direct;
    const rawId = String(item.id || '');
    const match = rawId.match(/\d{10,}/);
    if (match) {
      const fromId = Number(match[0]);
      if (Number.isFinite(fromId) && fromId > 0) return fromId;
    }
    return 0;
  };
  const toArray = (value) => (Array.isArray(value) ? value : []);
  const withImageVersion = (url) => {
    if (!isRealFoodImage(url)) return '';
    return `${url}${url.includes('?') ? '&' : '?'}v=${imageVersion}`;
  };
  const fetchRestaurantsForFilter = useCallback(async () => {
    try {
      const [activeRestaurantsResponse, inactiveRestaurantsResponse] = await Promise.all([
        adminAPI.getRestaurants({
          limit: 1000,
        }),
        adminAPI.getRestaurants({
          limit: 1000,
          status: 'inactive',
        }),
      ]);
      const extractRestaurants = (response) => {
        const data = response?.data?.data ?? response?.data;
        return Array.isArray(data?.restaurants) ? data.restaurants : Array.isArray(data) ? data : [];
      };
      const activeRestaurants = extractRestaurants(activeRestaurantsResponse);
      const inactiveRestaurants = extractRestaurants(inactiveRestaurantsResponse);
      const restaurantsMap = new Map();
      [...activeRestaurants, ...inactiveRestaurants].forEach((restaurant) => {
        const restaurantId = String(restaurant?._id || restaurant?.id || '');
        if (!restaurantId) return;
        if (!restaurantsMap.has(restaurantId)) {
          restaurantsMap.set(restaurantId, restaurant);
        }
      });
      const restaurants = Array.from(restaurantsMap.values());
      setRestaurantsForFilter(
        restaurants
          .map((restaurant) => ({
            id: String(restaurant?._id || restaurant?.id || ''),
            name: restaurant?.name || restaurant?.restaurantName || 'Unknown Restaurant',
            pureVegRestaurant: restaurant?.pureVegRestaurant === true,
          }))
          .filter((restaurant) => restaurant.id)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch (error) {
      debugError('Error fetching restaurants for filter:', error);
    }
  }, []);
  useEffect(() => {
    fetchRestaurantsForFilter();
  }, [fetchRestaurantsForFilter]);

  // Warn user before refreshing if form is open and dirty
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (showFoodFormModal && isFormDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showFoodFormModal, isFormDirty]);
  const fetchAllFoods = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
        ...(searchQuery.trim() && {
          search: searchQuery.trim(),
        }),
        ...(selectedRestaurant !== 'all' && {
          restaurantId: selectedRestaurant,
        }),
      };
      const foodsRes = await adminAPI.getFoods(params);
      const data = foodsRes?.data?.data ?? foodsRes?.data;
      const list = Array.isArray(data?.foods) ? data.foods : Array.isArray(data) ? data : [];
      const total = data?.total ?? list.length;
      const approvedOnly = Array.isArray(list) ? list.filter((f) => String(f?.approvalStatus || '').toLowerCase() === 'approved') : [];
      setFoods(
        Array.isArray(approvedOnly)
          ? approvedOnly.map((f) => ({
              id: String(f.id || f._id || ''),
              _id: f._id || f.id,
              name: f.name || 'Unnamed Item',
              image: f.image || '',
              status: f.isAvailable !== false && String(f.approvalStatus || '').toLowerCase() !== 'rejected',
              restaurantId: String(f.restaurantId || ''),
              restaurantName: f.restaurantName || 'Unknown Restaurant',
              categoryId: String(f.categoryId || ''),
              categoryName: f.categoryName || '',
              price: getFoodDisplayPrice(f),
              variants: getFoodVariants(f),
              foodType: f.foodType || 'Non-Veg',
              approvalStatus: f.approvalStatus || 'approved',
              description: f.description || '',
              preparationTime: f.preparationTime || '',
              isAvailable: f.isAvailable !== false,
              createdAt: f.createdAt,
              updatedAt: f.updatedAt,
            }))
          : [],
      );
      setTotalFoods(total);
      setImageVersion(Date.now());
    } catch (error) {
      debugError('Error fetching foods:', error);
      toast.error('Failed to load foods');
      setFoods([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, selectedRestaurant]);
  useEffect(() => {
    const delay = searchQuery ? 250 : 0;
    const t = setTimeout(fetchAllFoods, delay);
    return () => clearTimeout(t);
  }, [fetchAllFoods, searchQuery]);
  const [searchParams] = useSearchParams();
  const productIdFromUrl = searchParams.get('productId');
  useEffect(() => {
    if (productIdFromUrl && foods.length > 0) {
      const food = foods.find((f) => f.id === productIdFromUrl || f._id === productIdFromUrl);
      if (food) {
        handleViewDetails(food);
      }
    }
  }, [productIdFromUrl, foods]);

  // Format ID to FOOD format (e.g., FOOD519399)
  const formatFoodId = (id) => {
    if (!id) return 'FOOD000000';
    const idString = String(id);
    // Extract last 6 digits from the ID
    // Handle formats like "1768285554154-0.703896654519399" or "item-1768285554154-0.703896654519399"
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
      }
    }

    // If no digits found, use a hash of the ID
    if (!lastDigits) {
      const hash = idString.split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
      }, 0);
      lastDigits = Math.abs(hash).toString().slice(-6).padStart(6, '0');
    }
    return `FOOD${lastDigits}`;
  };
  const filteredFoods = useMemo(() => {
    return foods;
  }, [foods]);
  const totalPages = useMemo(() => {
    if (totalFoods === 0) return 1;
    return Math.ceil(totalFoods / pageSize);
  }, [totalFoods, pageSize]);
  const paginatedFoods = useMemo(() => {
    return foods;
  }, [foods]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRestaurant, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const restaurantOptions = useMemo(() => {
    return restaurantsForFilter;
  }, [restaurantsForFilter]);
  const selectedFormRestaurant = useMemo(() => {
    return restaurantOptions.find((r) => String(r.id) === String(foodForm.restaurantId || '')) || null;
  }, [restaurantOptions, foodForm.restaurantId]);
  const isSelectedRestaurantPureVeg = selectedFormRestaurant?.pureVegRestaurant === true;
  const openAddFoodModal = () => {
    setFoodFormMode('add');
    setEditingFood(null);
    const preselectedRestaurantId = selectedRestaurant !== 'all' ? selectedRestaurant : '';
    const preselectedRestaurant = restaurantOptions.find((r) => String(r.id) === String(preselectedRestaurantId));
    setFoodForm({
      ...createFoodForm(),
      restaurantId: preselectedRestaurantId,
      foodType: preselectedRestaurant?.pureVegRestaurant === true ? 'Veg' : 'Non-Veg',
    });
    setSelectedImageFile(null);
    setImagePreviewUrl('');
    setCategorySearch('');
    setCategoryPopoverOpen(false);
    setShowFoodFormModal(true);
  };
  const openEditFoodModal = (food) => {
    setFoodFormMode('edit');
    setEditingFood(food);
    const restaurant = restaurantOptions.find((r) => String(r.id) === String(food.restaurantId || ''));
    const nextFoodType = restaurant?.pureVegRestaurant === true ? 'Veg' : String(food.foodType || 'Non-Veg') === 'Veg' ? 'Veg' : 'Non-Veg';
    setFoodForm({
      restaurantId: String(food.restaurantId || ''),
      categoryId: String(food.categoryId || ''),
      categoryName: String(food.categoryName || ''),
      name: String(food.name || ''),
      price: String(food.price || ''),
      variants: getFoodVariants(food).map(createVariantDraft),
      description: String(food.description || ''),
      image: String(food.image || ''),
      foodType: nextFoodType,
      isAvailable: food.isAvailable !== false,
      preparationTime: String(food.preparationTime || ''),
    });
    setSelectedImageFile(null);
    setImagePreviewUrl(String(food.image || ''));
    setCategorySearch('');
    setCategoryPopoverOpen(false);
    setShowFoodFormModal(true);
  };
  useEffect(() => {
    if (!showFoodFormModal || !isSelectedRestaurantPureVeg) return;
    setFoodForm((prev) => {
      const next = {
        ...prev,
      };
      let changed = false;
      if (prev.foodType !== 'Veg') {
        next.foodType = 'Veg';
        changed = true;
      }
      const selectedStillValid = categoryOptions.some(
        (c) => String(c.id) === String(prev.categoryId || '') || String(c.name) === String(prev.categoryName || ''),
      );
      if ((prev.categoryId || prev.categoryName) && categoryOptions.length > 0 && !selectedStillValid) {
        next.categoryId = '';
        next.categoryName = '';
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [showFoodFormModal, isSelectedRestaurantPureVeg, foodForm.foodType, foodForm.categoryId, foodForm.categoryName, categoryOptions]);
  useEffect(() => {
    if (!showFoodFormModal) {
      setCategoryOptions([]);
      return;
    }
    let cancelled = false;
    const loadCategoryOptions = async () => {
      try {
        const res = await adminAPI.getCategories({
          limit: 1000,
        });
        const categoryData = res?.data?.data ?? res?.data;
        const list = Array.isArray(categoryData?.categories) ? categoryData.categories : Array.isArray(categoryData) ? categoryData : [];
        let options = Array.isArray(list)
          ? list
              .map((c) => ({
                id: String(c.id || c._id || c.name),
                name: String(c.name || '').trim(),
                foodTypeScope: String(c.foodTypeScope || 'Both'),
              }))
              .filter((c) => c.name)
          : [];
        if (isSelectedRestaurantPureVeg) {
          options = options.filter((c) => c.foodTypeScope === 'Veg');
        }
        if (!cancelled) setCategoryOptions(options);
      } catch (error) {
        if (!cancelled) {
          setCategoryOptions([]);
        }
      }
    };
    loadCategoryOptions();
    return () => {
      cancelled = true;
    };
  }, [showFoodFormModal, isSelectedRestaurantPureVeg]);
  const handleVariantChange = (variantId, field, value) => {
    setFoodForm((prev) => ({
      ...prev,
      variants: (Array.isArray(prev.variants) ? prev.variants : []).map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              [field]: value,
            }
          : variant,
      ),
    }));
  };
  const handleAddVariant = () => {
    setFoodForm((prev) => ({
      ...prev,
      variants: [...(Array.isArray(prev.variants) ? prev.variants : []), createVariantDraft()],
    }));
  };
  const handleRemoveVariant = (variantId) => {
    setFoodForm((prev) => ({
      ...prev,
      variants: (Array.isArray(prev.variants) ? prev.variants : []).filter((variant) => variant.id !== variantId),
    }));
  };
  const handleFoodFormSubmit = async () => {
    if (!foodForm.restaurantId) {
      toast.error('Please select a restaurant');
      return;
    }
    if (!String(foodForm.categoryName || '').trim()) {
      toast.error('Please select or enter a category');
      return;
    }
    if (!foodForm.name.trim()) {
      toast.error('Food name is required');
      return;
    }
    const normalizedVariants = (Array.isArray(foodForm.variants) ? foodForm.variants : [])
      .map((variant) => ({
        id: String(variant?.id || variant?._id || '').trim(),
        name: String(variant?.name || '').trim(),
        price: Number(variant?.price),
      }))
      .filter((variant) => variant.id || variant.name || variant.price);
    const hasVariants = normalizedVariants.length > 0;
    const parsedPrice = Number(foodForm.price);
    if (normalizedVariants.some((variant) => !variant.name)) {
      toast.error('Each variant must have a name');
      return;
    }
    if (normalizedVariants.some((variant) => !Number.isFinite(variant.price) || variant.price <= 0)) {
      toast.error('Each variant price must be greater than 0');
      return;
    }
    if (!hasVariants && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
      toast.error('Base price must be greater than 0');
      return;
    }
    if (!selectedImageFile && !String(foodForm.image || '').trim()) {
      toast.error('Please upload a food image');
      return;
    }
    try {
      setSubmittingFood(true);
      let imageUrl = foodForm.image.trim();
      if (selectedImageFile) {
        const uploadResponse = await uploadAPI.uploadMedia(selectedImageFile, {
          folder: 'foods',
        });
        imageUrl = uploadResponse?.data?.data?.url || uploadResponse?.data?.url || imageUrl;
      }
      const payload = {
        restaurantId: foodForm.restaurantId,
        categoryId: foodForm.categoryId || undefined,
        categoryName: String(foodForm.categoryName || '').trim(),
        name: foodForm.name.trim(),
        price: hasVariants ? undefined : parsedPrice,
        variants: normalizedVariants.map((variant) => ({
          ...(variant.id && !variant.id.startsWith('variant-')
            ? {
                _id: variant.id,
              }
            : {}),
          name: variant.name,
          price: variant.price,
        })),
        description: foodForm.description.trim(),
        image: imageUrl,
        foodType: isSelectedRestaurantPureVeg || foodForm.foodType === 'Veg' ? 'Veg' : 'Non-Veg',
        isAvailable: foodForm.isAvailable !== false,
        preparationTime: String(foodForm.preparationTime || '').trim(),
      };
      if (foodFormMode === 'edit') {
        await adminAPI.updateFood(editingFood?._id || editingFood?.id, payload);
      } else {
        await adminAPI.createFood(payload);
      }
      toast.success(foodFormMode === 'edit' ? 'Food updated successfully' : 'Food added successfully');
      setShowFoodFormModal(false);
      setEditingFood(null);
      setFoodForm(createFoodForm());
      setSelectedImageFile(null);
      setImagePreviewUrl('');
      await fetchAllFoods();
    } catch (error) {
      debugError('Error saving food:', error);
      toast.error(error?.response?.data?.message || 'Failed to save food');
    } finally {
      setSubmittingFood(false);
    }
  };
  const handleDelete = async (id) => {
    const food = foods.find((f) => f.id === id);
    if (!food) return;
    if (!(await window.confirmAsync(`Are you sure you want to delete "${food.name}"? This action cannot be undone.`))) {
      return;
    }
    try {
      setDeleting(true);
      await adminAPI.deleteFood(food?._id || food?.id);
      setFoods((prev) => prev.filter((f) => String(f.id) !== String(id)));
      toast.success('Food item deleted successfully');
    } catch (error) {
      debugError('Error deleting food:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete food item');
    } finally {
      setDeleting(false);
    }
  };
  const handleViewDetails = (food) => {
    setSelectedFood(food);
    setShowDetailModal(true);
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Header Section */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex items-center gap-3 mb-4">
          <LinearGradient
            colors={['#FB923C', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Div className="grid grid-cols-2 gap-0.5">
              <Div className="w-2 h-2 bg-white rounded-sm"></Div>
              <Div className="w-2 h-2 bg-white rounded-sm"></Div>
              <Div className="w-2 h-2 bg-white rounded-sm"></Div>
              <Div className="w-2 h-2 bg-white rounded-sm"></Div>
            </Div>
          </LinearGradient>
          <H1 className="text-2xl font-bold text-slate-900">Food</H1>
        </Div>

        <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Div className="flex items-center gap-2">
            <H2 className="text-lg font-semibold text-slate-900">Food List</H2>
            <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
              {loading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : totalFoods}
            </Span>
          </Div>

          <Div className="flex items-center gap-3 flex-wrap">
            <Button
              type="button"
              onClick={openAddFoodModal}
              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <UiIcon as={Plus} className="w-4 h-4" />
              <Span>Add Food</Span>
            </Button>
            <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
              <Input
                type="text"
                placeholder="Ex : Foods"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </Div>
            <Select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="px-4 py-2.5 min-w-[220px] text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            >
              <Option value="all">All Restaurants</Option>
              {restaurantOptions.map((restaurant) => (
                <Option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </Option>
              ))}
            </Select>
          </Div>
        </Div>
      </Div>

      {/* Table */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Div>
          <Table className="w-full" cols={[70, 80, 200, 180, 160, 132]}>
            <Thead className="bg-slate-50 border-b border-slate-200">
              <Tr>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SL</Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Image</Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Title</Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Restaurant</Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Category</Th>
                <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
              </Tr>
            </Thead>
            <Tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <Tr>
                  <Td colSpan={6} className="px-6 py-20 text-center">
                    <Div className="flex flex-col items-center justify-center">
                      <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                      <P className="text-sm text-slate-500">Loading foods...</P>
                    </Div>
                  </Td>
                </Tr>
              ) : foods.length === 0 ? (
                <Tr>
                  <Td colSpan={6} className="px-6 py-20 text-center">
                    <Div className="flex flex-col items-center justify-center">
                      <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                      <P className="text-sm text-slate-500">No food items match your search or restaurant filter</P>
                    </Div>
                  </Td>
                </Tr>
              ) : (
                paginatedFoods.map((food, index) => (
                  <Tr key={food.id} className="hover:bg-slate-50 transition-colors">
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <FoodImageThumb name={food.name} src={withImageVersion(food.image)} size="md" />
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Div className="flex flex-col">
                        <Span className="text-sm font-medium text-slate-900">{food.name}</Span>
                      </Div>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Div className="flex flex-col">
                        <Span className="text-sm font-medium text-slate-800">{food.restaurantName || '-'}</Span>
                      </Div>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Div className="flex flex-col">
                        <Span className="text-sm font-medium text-slate-800">{food.categoryName || '-'}</Span>
                      </Div>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap text-center">
                      <Div className="flex items-center justify-center gap-2">
                        <Button onClick={() => handleViewDetails(food)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                          <UiIcon as={Eye} className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => openEditFoodModal(food)} className="p-1.5 rounded text-amber-600 hover:bg-amber-50 transition-colors">
                          <UiIcon as={Pencil} className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(food.id)}
                          disabled={deleting}
                          className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleting ? <UiIcon as={Loader2} className="w-4 h-4 animate-spin" /> : <UiIcon as={Trash2} className="w-4 h-4" />}
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Div>

        {!loading && (
          <AdminListPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalFoods}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              try {
                localStorage.setItem('admin_foods_pageSize', String(size));
              } catch {}
              setCurrentPage(1);
            }}
            itemLabel="foods"
            className="mt-4"
          />
        )}
      </Div>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-lg font-semibold text-slate-900">Food Details</DialogTitle>
          </DialogHeader>
          {selectedFood && (
            <Div className="p-6 space-y-5">
              <Div className="flex items-center gap-4">
                <FoodImageThumb name={selectedFood.name} src={withImageVersion(selectedFood.image)} size="lg" className="border border-slate-200" />
                <Div>
                  <P className="text-lg font-semibold text-slate-900">{selectedFood.name}</P>
                  <P className="text-sm text-slate-500 mt-0.5">ID #{formatFoodId(selectedFood.id)}</P>
                </Div>
              </Div>
              <Div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 border border-slate-200 rounded-lg p-4">
                <P>
                  <Span className="font-semibold text-slate-700">Restaurant:</Span> <Span className="text-slate-900">{selectedFood.restaurantName || '-'}</Span>
                </P>
                <P>
                  <Span className="font-semibold text-slate-700">Price:</Span>{' '}
                  <Span className="text-slate-900">
                    {selectedFood.variants?.length ? `Starting from \u20B9${selectedFood.price}` : `\u20B9${selectedFood.price}`}
                  </Span>
                </P>
                <P>
                  <Span className="font-semibold text-slate-700">Category:</Span> <Span className="text-slate-900">{selectedFood.categoryName || '-'}</Span>
                </P>
                <P>
                  <Span className="font-semibold text-slate-700">Food Type:</Span> <Span className="text-slate-900">{selectedFood.foodType || '-'}</Span>
                </P>
                <P>
                  <Span className="font-semibold text-slate-700">Approval:</Span>{' '}
                  <Span className="text-slate-900 capitalize">{selectedFood.approvalStatus || '-'}</Span>
                </P>
              </Div>
              {selectedFood.variants?.length ? (
                <Div className="rounded-lg border border-slate-200 bg-white p-4">
                  <P className="text-sm font-semibold text-slate-800 mb-2">Variants</P>
                  <Div className="space-y-2">
                    {selectedFood.variants.map((variant) => (
                      <Div key={variant.id || variant._id} className="flex items-center justify-between text-sm text-slate-700">
                        <Span>{variant.name}</Span>
                        <Span className="font-semibold text-slate-900">
                          {'\u20B9'}
                          {variant.price}
                        </Span>
                      </Div>
                    ))}
                  </Div>
                </Div>
              ) : null}
              {selectedFood.description && (
                <P className="text-sm text-slate-700 leading-relaxed">
                  <Span className="font-semibold text-slate-800">Description:</Span> {selectedFood.description}
                </P>
              )}
            </Div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showFoodFormModal}
        onOpenChange={(open) => {
          setShowFoodFormModal(open);
          if (!open) {
            setEditingFood(null);
            setFoodForm(createFoodForm());
            setCategoryOptions([]);
            setCategorySearch('');
            setCategoryPopoverOpen(false);
            setSelectedImageFile(null);
            setImagePreviewUrl('');
          }
        }}
      >
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden"
          onInteractOutside={(e) => {
            if (isFormDirty) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isFormDirty) e.preventDefault();
          }}
        >
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-lg font-semibold text-slate-900">{foodFormMode === 'edit' ? 'Edit Food' : 'Add Food'}</DialogTitle>
          </DialogHeader>
          <Div className="p-6 space-y-4">
            <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">Restaurant</Label>
                <Select
                  value={foodForm.restaurantId}
                  onChange={(e) => {
                    const nextRestaurantId = e.target.value;
                    const nextRestaurant = restaurantOptions.find((r) => String(r.id) === String(nextRestaurantId));
                    const forceVeg = nextRestaurant?.pureVegRestaurant === true;
                    setFoodForm((prev) => ({
                      ...prev,
                      restaurantId: nextRestaurantId,
                      categoryId: '',
                      categoryName: '',
                      foodType: forceVeg ? 'Veg' : prev.foodType,
                    }));
                  }}
                  disabled={foodFormMode === 'edit'}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100"
                >
                  <Option value="">Select restaurant</Option>
                  {restaurantOptions.map((restaurant) => (
                    <Option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </Option>
                  ))}
                </Select>
              </Div>
              <Div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">Category</Label>
                <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-left flex items-center justify-between"
                    >
                      <Span className={foodForm.categoryName ? 'text-slate-900' : 'text-slate-400'}>{foodForm.categoryName || 'Select category'}</Span>
                      <UiIcon as={ChevronDown} className="w-4 h-4 text-slate-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                    <Input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white mb-2"
                      placeholder="Search category..."
                      autoFocus
                    />
                    <ScrollDiv className="max-h-56">
                      {categoryOptions
                        .filter((c) => {
                          const q = String(categorySearch || '')
                            .trim()
                            .toLowerCase();
                          if (!q) return true;
                          return String(c.name || '')
                            .toLowerCase()
                            .includes(q);
                        })
                        .map((c) => (
                          <Button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setFoodForm((prev) => ({
                                ...prev,
                                categoryId: c.id,
                                categoryName: c.name,
                              }));
                              setCategoryPopoverOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-slate-100 ${String(foodForm.categoryName || '') === String(c.name) ? 'bg-slate-100 font-medium' : ''}`}
                          >
                            {c.name}
                          </Button>
                        ))}
                      {categoryOptions.length === 0 && <Div className="px-3 py-2 text-sm text-slate-500">No categories found</Div>}
                    </ScrollDiv>
                  </PopoverContent>
                </Popover>
              </Div>
              <Div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">Food Name</Label>
                <Input
                  type="text"
                  value={foodForm.name}
                  onChange={(e) =>
                    setFoodForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </Div>
              <Div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">Base Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={foodForm.price}
                  onChange={(e) =>
                    setFoodForm((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  disabled={(foodForm.variants || []).length > 0}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                />
                {(foodForm.variants || []).length > 0 ? (
                  <P className="mt-1 text-xs text-slate-500">Variants are active, so customers will see the lowest variant price as the starting price.</P>
                ) : null}
              </Div>
              <Div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">Food Type</Label>
                <Select
                  value={isSelectedRestaurantPureVeg ? 'Veg' : foodForm.foodType}
                  onChange={(e) =>
                    setFoodForm((prev) => ({
                      ...prev,
                      foodType: e.target.value,
                    }))
                  }
                  disabled={isSelectedRestaurantPureVeg}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white disabled:bg-slate-100 disabled:text-slate-600"
                >
                  <Option value="Veg">Veg</Option>
                  {!isSelectedRestaurantPureVeg ? <Option value="Non-Veg">Non-Veg</Option> : null}
                </Select>
                {isSelectedRestaurantPureVeg ? <P className="mt-1 text-xs text-emerald-600">Pure veg restaurant — only Veg items allowed</P> : null}
              </Div>
              <Div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">
                  Upload Image <Span className="text-slate-400 font-normal">(Optional)</Span>
                </Label>
                <Button
                  type="button"
                  onClick={async () => {
                    const file = (await pickImage()) || null;
                    setSelectedImageFile(file);
                    if (file) {
                      setImagePreviewUrl(objectUrl(file));
                    } else {
                      setImagePreviewUrl(foodForm.image.trim());
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-700"
                >
                  {selectedImageFile?.name || 'Choose image'}
                </Button>
                <P className="mt-1 text-xs text-slate-500">Optional — food image</P>
              </Div>
              <Div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">Timing</Label>
                <Div className="relative">
                  <Select
                    value={foodForm.preparationTime}
                    onChange={(e) =>
                      setFoodForm((prev) => ({
                        ...prev,
                        preparationTime: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm bg-white appearance-none"
                  >
                    <Option value="">Select timing</Option>
                    <Option value="10-20 mins">10-20 mins</Option>
                    <Option value="20-25 mins">20-25 mins</Option>
                    <Option value="25-35 mins">25-35 mins</Option>
                    <Option value="35-45 mins">35-45 mins</Option>
                  </Select>
                  <UiIcon as={ChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </Div>
              </Div>
              {imagePreviewUrl ? (
                <Div className="md:col-span-2">
                  <Label className="block text-sm font-medium text-slate-700 mb-1">Image Preview</Label>
                  <Div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <Img src={imagePreviewUrl} alt="Food preview" className="w-full h-full object-cover" />
                  </Div>
                </Div>
              ) : null}
              <Div className="flex items-center gap-6 pt-7">
                <Label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <Input
                    type="checkbox"
                    checked={foodForm.isAvailable}
                    onChange={(e) =>
                      setFoodForm((prev) => ({
                        ...prev,
                        isAvailable: e.target.checked,
                      }))
                    }
                  />
                  Available
                </Label>
              </Div>
            </Div>
            <Div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">Description</Label>
              <Textarea
                rows={4}
                value={foodForm.description}
                onChange={(e) =>
                  setFoodForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white resize-none"
              />
            </Div>
            <Div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <Div className="flex items-center justify-between gap-3">
                <Div>
                  <P className="text-sm font-semibold text-slate-900">Variants</P>
                  <P className="text-xs text-slate-500">Optional. Add multiple names and prices such as Half, Full, Small, or Large.</P>
                </Div>
                <Button
                  type="button"
                  onClick={handleAddVariant}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                >
                  <UiIcon as={Plus} className="w-3.5 h-3.5" />
                  Add variant
                </Button>
              </Div>
              {(foodForm.variants || []).length ? (
                <Div className="space-y-3">
                  {(foodForm.variants || []).map((variant, index) => (
                    <Div key={variant.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-slate-200 bg-white p-3">
                      <Div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Div>
                          <Label className="block text-xs font-medium text-slate-600 mb-1">Variant name</Label>
                          <Input
                            type="text"
                            value={variant.name}
                            onChange={(e) => handleVariantChange(variant.id, 'name', e.target.value)}
                            placeholder={index === 0 ? 'Full' : 'Half'}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                          />
                        </Div>
                        <Div>
                          <Label className="block text-xs font-medium text-slate-600 mb-1">Variant price</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.price}
                            onChange={(e) => handleVariantChange(variant.id, 'price', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                          />
                        </Div>
                      </Div>
                      <Button
                        type="button"
                        onClick={() => handleRemoveVariant(variant.id)}
                        className="self-start rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-500"
                        accessibilityLabel="Remove variant"
                      >
                        <UiIcon as={Trash2} className="w-4 h-4" />
                      </Button>
                    </Div>
                  ))}
                </Div>
              ) : (
                <P className="text-sm text-slate-500">No variants added. This food will use the single base price.</P>
              )}
            </Div>
            <Div className="flex justify-end">
              <Button
                type="button"
                onClick={handleFoodFormSubmit}
                disabled={submittingFood}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {submittingFood ? <UiIcon as={Loader2} className="w-4 h-4 animate-spin" /> : <UiIcon as={Save} className="w-4 h-4" />}
                <Span>{submittingFood ? 'Saving...' : foodFormMode === 'edit' ? 'Update Food' : 'Add Food'}</Span>
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
