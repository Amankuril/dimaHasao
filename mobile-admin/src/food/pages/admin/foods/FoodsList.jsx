/* Ported from Frontend/src/modules/Food/pages/admin/foods/FoodsList.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from '../../../../lib/webRouter';
import { Trash2, Loader2, Eye, Pencil, Plus, Save, ChevronDown, UtensilsCrossed } from 'lucide-react-native';
import { adminAPI, uploadAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { pickImage, objectUrl } from '../../../../lib/files';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/shadcn';
import { getFoodDisplayPrice, getFoodVariants } from '../../../utils/foodVariants';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import dishFallbackImage from '../../../assets/dish_fallback.webp';
import { Button, Div, Img, Input, Label, Option, ScrollDiv, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
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
  const sizeClass = size === 'lg' ? 'w-20 h-20 rounded-xl' : 'w-10 h-10 rounded-lg';
  return (
    <Div className={`${sizeClass} overflow-hidden bg-slate-100 items-center justify-center ${className}`}>
      <Img src={hasImage ? src : dishFallbackImage} alt={name || 'Food'} className="w-full h-full" contentFit="cover" onError={() => setFailed(true)} />
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
  const { tablet } = useLayoutWidth();
  const COLS = [60, 64, 200, 180, 160, 150];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={UtensilsCrossed}
        title="Food"
        subtitle={loading ? 'Loading foods\u2026' : `${totalFoods} food item${totalFoods === 1 ? '' : 's'} across every restaurant`}
        breadcrumb={[{ label: 'Food' }, { label: 'Food list' }]}
        actions={
          <Button type="button" onClick={openAddFoodModal} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add food</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Input
            type="search"
            placeholder="Search foods"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
          <Div className="flex-1 min-w-[200px]">
            <Select value={selectedRestaurant} onChange={(e) => setSelectedRestaurant(e.target.value)} className={INPUT}>
              <Option value="all">All Restaurants</Option>
              {restaurantOptions.map((restaurant) => (
                <Option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </Option>
              ))}
            </Select>
          </Div>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : foods.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No food items found"
          message="No food items match your search or restaurant filter."
          actionLabel="Add food"
          onAction={openAddFoodModal}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['SL', 'Image', 'Title', 'Restaurant', 'Category', 'Actions']} />
            <TBody>
              {paginatedFoods.map((food, index) => (
                <Row key={food.id} last={index === paginatedFoods.length - 1}>
                  <Cell width={COLS[0]} numberOfLines={1}>{String((currentPage - 1) * pageSize + index + 1)}</Cell>
                  <Cell width={COLS[1]}>
                    <FoodImageThumb name={food.name} src={withImageVersion(food.image)} size="md" />
                  </Cell>
                  <Cell width={COLS[2]}>{food.name}</Cell>
                  <Cell width={COLS[3]}>{food.restaurantName || '-'}</Cell>
                  <Cell width={COLS[4]}>{food.categoryName || '-'}</Cell>
                  <Cell width={COLS[5]}>
                    <Div className="flex-row items-center gap-1">
                      <Button onClick={() => handleViewDetails(food)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="View food details">
                        <UiIcon as={Eye} size={16} className="text-slate-600" />
                      </Button>
                      <Button onClick={() => openEditFoodModal(food)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Edit food">
                        <UiIcon as={Pencil} size={16} className="text-blue-600" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(food.id)}
                        disabled={deleting}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                        accessibilityLabel="Delete food"
                      >
                        <UiIcon as={deleting ? Loader2 : Trash2} size={16} className="text-red-600" />
                      </Button>
                    </Div>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>

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
        </>
      )}

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-slate-200">
            <DialogTitle>Food details</DialogTitle>
          </DialogHeader>
          {selectedFood && (
            <Div className="p-4 gap-4">
              <Div className="flex-row items-center gap-3">
                <FoodImageThumb name={selectedFood.name} src={withImageVersion(selectedFood.image)} size="lg" />
                <Div className="flex-1 min-w-0 gap-0.5">
                  <Span className="text-base font-semibold text-slate-900">{selectedFood.name}</Span>
                  <Span className="text-sm text-slate-500">ID #{formatFoodId(selectedFood.id)}</Span>
                </Div>
              </Div>
              <Div className="flex-row flex-wrap gap-3 rounded-lg bg-slate-50 p-3">
                {[
                  ['Restaurant', selectedFood.restaurantName || '-'],
                  ['Price', selectedFood.variants?.length ? `Starting from \u20B9${selectedFood.price}` : `\u20B9${selectedFood.price}`],
                  ['Category', selectedFood.categoryName || '-'],
                  ['Food type', selectedFood.foodType || '-'],
                ].map(([label, value]) => (
                  <Div key={label} className="flex-1 min-w-[130px] gap-0.5">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
                    <Span className="text-sm text-slate-900">{value}</Span>
                  </Div>
                ))}
                <Div className="flex-1 min-w-[130px] gap-1">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approval</Span>
                  <StatusBadge status={selectedFood.approvalStatus || 'pending'} label={selectedFood.approvalStatus || '-'} />
                </Div>
              </Div>
              {selectedFood.variants?.length ? (
                <Div className="rounded-lg border border-slate-200 bg-white p-3 gap-2">
                  <Span className="text-sm font-semibold text-slate-900">Variants</Span>
                  {selectedFood.variants.map((variant) => (
                    <Div key={variant.id || variant._id} className="flex-row items-center justify-between gap-3">
                      <Span className="text-sm text-slate-700 flex-1">{variant.name}</Span>
                      <Span className="text-sm font-semibold text-slate-900">{`\u20B9${variant.price}`}</Span>
                    </Div>
                  ))}
                </Div>
              ) : null}
              {selectedFood.description ? (
                <Div className="gap-1">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</Span>
                  <Span className="text-sm text-slate-700">{selectedFood.description}</Span>
                </Div>
              ) : null}
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
          <DialogHeader className="px-4 py-3 border-b border-slate-200">
            <DialogTitle>{foodFormMode === 'edit' ? 'Edit food' : 'Add food'}</DialogTitle>
          </DialogHeader>
          <ScrollDiv className="max-h-[70vh]" contentClassName="p-4 gap-3">
            <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
              <Div className={tablet ? 'min-w-[240px] flex-1' : ''}>
                <Field label="Restaurant" required>
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
                    className={INPUT}
                  >
                    <Option value="">Select restaurant</Option>
                    {restaurantOptions.map((restaurant) => (
                      <Option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </Option>
                    ))}
                  </Select>
                </Field>
              </Div>
              <Div className={tablet ? 'min-w-[240px] flex-1' : ''}>
                <Field label="Category" required>
                  <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" className={`${INPUT} flex-row items-center justify-between`}>
                        <Span className={`text-sm flex-1 ${foodForm.categoryName ? 'text-slate-900' : 'text-slate-400'}`}>{foodForm.categoryName || 'Select category'}</Span>
                        <UiIcon as={ChevronDown} size={16} className="text-slate-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                      <Input
                        type="search"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className={`${INPUT} mb-2`}
                        placeholder="Search category…"
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
                              className={`w-full items-start justify-center px-3 h-11 rounded-lg ${String(foodForm.categoryName || '') === String(c.name) ? 'bg-slate-100' : ''}`}
                            >
                              <Span className="text-sm text-slate-700">{c.name}</Span>
                            </Button>
                          ))}
                        {categoryOptions.length === 0 && (
                          <Div className="px-3 py-2">
                            <Span className="text-sm text-slate-500">No categories found</Span>
                          </Div>
                        )}
                      </ScrollDiv>
                    </PopoverContent>
                  </Popover>
                </Field>
              </Div>
              <Div className={tablet ? 'min-w-[240px] flex-1' : ''}>
                <Field label="Food name" required>
                  <Input
                    type="text"
                    value={foodForm.name}
                    onChange={(e) =>
                      setFoodForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
              </Div>
              <Div className={tablet ? 'min-w-[240px] flex-1' : ''}>
                <Field
                  label="Base price"
                  required
                  hint={(foodForm.variants || []).length > 0 ? 'Variants are active, so customers see the lowest variant price as the starting price.' : undefined}
                >
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
                    className={INPUT}
                  />
                </Field>
              </Div>
              <Div className={tablet ? 'min-w-[240px] flex-1' : ''}>
                <Field label="Food type" hint={isSelectedRestaurantPureVeg ? 'Pure veg restaurant — only Veg items allowed' : undefined}>
                  <Select
                    value={isSelectedRestaurantPureVeg ? 'Veg' : foodForm.foodType}
                    onChange={(e) =>
                      setFoodForm((prev) => ({
                        ...prev,
                        foodType: e.target.value,
                      }))
                    }
                    disabled={isSelectedRestaurantPureVeg}
                    className={INPUT}
                  >
                    <Option value="Veg">Veg</Option>
                    {!isSelectedRestaurantPureVeg ? <Option value="Non-Veg">Non-Veg</Option> : null}
                  </Select>
                </Field>
              </Div>
              <Div className={tablet ? 'min-w-[240px] flex-1' : ''}>
                <Field label="Upload image" hint="Optional — food image">
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
                    className={BTN_SECONDARY}
                  >
                    <Span className={BTN_TEXT_SECONDARY} numberOfLines={1}>{selectedImageFile?.name || 'Choose image'}</Span>
                  </Button>
                </Field>
              </Div>
              <Div className={tablet ? 'min-w-[240px] flex-1' : ''}>
                <Field label="Timing">
                  <Select
                    value={foodForm.preparationTime}
                    onChange={(e) =>
                      setFoodForm((prev) => ({
                        ...prev,
                        preparationTime: e.target.value,
                      }))
                    }
                    className={INPUT}
                  >
                    <Option value="">Select timing</Option>
                    <Option value="10-20 mins">10-20 mins</Option>
                    <Option value="20-25 mins">20-25 mins</Option>
                    <Option value="25-35 mins">25-35 mins</Option>
                    <Option value="35-45 mins">35-45 mins</Option>
                  </Select>
                </Field>
              </Div>
            </Div>

            {imagePreviewUrl ? (
              <Field label="Image preview">
                <Div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <Img src={imagePreviewUrl} alt="Food preview" className="w-full h-full" contentFit="cover" />
                </Div>
              </Field>
            ) : null}

            <Label className="flex-row items-center gap-2 h-11 text-sm text-slate-700">
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

            <Field label="Description">
              <Textarea
                rows={4}
                value={foodForm.description}
                onChange={(e) =>
                  setFoodForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </Field>

            <Div className="rounded-xl border border-slate-200 bg-slate-50 p-4 gap-3">
              <Div className="flex-row items-start justify-between gap-3">
                <Div className="flex-1 min-w-0 gap-0.5">
                  <Span className="text-base font-semibold text-slate-900">Variants</Span>
                  <Span className="text-xs text-slate-500">Optional. Add multiple names and prices such as Half, Full, Small or Large.</Span>
                </Div>
                <Button type="button" onClick={handleAddVariant} className={BTN_SECONDARY}>
                  <UiIcon as={Plus} size={14} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>Add variant</Span>
                </Button>
              </Div>
              {(foodForm.variants || []).length ? (
                <Div className="gap-3">
                  {(foodForm.variants || []).map((variant, index) => (
                    <Div key={variant.id} className="flex-row items-start gap-2 rounded-lg border border-slate-200 bg-white p-3">
                      <Div className={tablet ? 'flex-1 flex-row gap-3' : 'flex-1 gap-3'}>
                        <Div className="flex-1">
                          <Field label="Variant name">
                            <Input
                              type="text"
                              value={variant.name}
                              onChange={(e) => handleVariantChange(variant.id, 'name', e.target.value)}
                              placeholder={index === 0 ? 'Full' : 'Half'}
                              className={INPUT}
                            />
                          </Field>
                        </Div>
                        <Div className="flex-1">
                          <Field label="Variant price">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={variant.price}
                              onChange={(e) => handleVariantChange(variant.id, 'price', e.target.value)}
                              className={INPUT}
                            />
                          </Field>
                        </Div>
                      </Div>
                      <Button
                        type="button"
                        onClick={() => handleRemoveVariant(variant.id)}
                        className="w-11 h-11 rounded-lg items-center justify-center shrink-0"
                        accessibilityLabel="Remove variant"
                      >
                        <UiIcon as={Trash2} size={16} className="text-red-600" />
                      </Button>
                    </Div>
                  ))}
                </Div>
              ) : (
                <Span className="text-sm text-slate-500">No variants added. This food will use the single base price.</Span>
              )}
            </Div>

            <Div className="flex-row justify-end">
              <Button type="button" onClick={handleFoodFormSubmit} disabled={submittingFood} className={BTN_PRIMARY}>
                <UiIcon as={submittingFood ? Loader2 : Save} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>{submittingFood ? 'Saving\u2026' : foodFormMode === 'edit' ? 'Update food' : 'Add food'}</Span>
              </Button>
            </Div>
          </ScrollDiv>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
