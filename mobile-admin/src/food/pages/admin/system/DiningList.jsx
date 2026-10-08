/* Ported from Frontend/src/modules/Food/pages/admin/system/DiningList.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import { Search, Settings, Star, Building2, UtensilsCrossed, X } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
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
  LoadingState,
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, Div, HScroll, Img, Input, Option, Overlay, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const COLS = [200, 160, 120, 90, 90, 120, 110, 70];
const LABELS = ['Restaurant', 'Owner', 'Zone', 'Dining', 'Guests', 'Rating', 'Status', 'Edit'];
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
  return normalizeImageUrl(restaurant?.profileImage) || normalizeImageUrl(restaurant?.logo) || fallback;
};
export default function DiningList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);

  // Fetch restaurants from backend API
  useEffect(() => {
    let isInitialLoad = true;
    const fetchRestaurants = async () => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        }
        setError(null);
        const response = await adminAPI.getDiningRestaurants();
        if (response.data && response.data.success && response.data.data) {
          const restaurantsData = response.data.data.restaurants || [];
          const mappedRestaurants = restaurantsData.map((restaurant, index) => ({
            id: restaurant._id || restaurant.id || index + 1,
            _id: restaurant._id,
            name: restaurant.name || restaurant.restaurantName || 'N/A',
            ownerName: restaurant.ownerName || 'N/A',
            ownerPhone: restaurant.ownerPhone || 'N/A',
            zone: restaurant.zone || 'N/A',
            status: restaurant.status === 'approved' || restaurant.isActive === true,
            rating: restaurant.rating || 0,
            logo: getPrimaryRestaurantImage(restaurant, 'https://via.placeholder.com/40'),
            categories: Array.isArray(restaurant.categories) ? restaurant.categories : [],
            categoryIds: Array.isArray(restaurant.categoryIds) ? restaurant.categoryIds : [],
            primaryCategoryId: restaurant.primaryCategoryId || null,
            diningSettings: restaurant.diningSettings || {
              isEnabled: false,
              maxGuests: 6,
              diningType: '',
            },
            originalData: restaurant,
          }));
          setRestaurants(mappedRestaurants);
        } else {
          if (isInitialLoad) setRestaurants([]);
        }
      } catch (err) {
        debugError('Error fetching restaurants:', err);
        if (isInitialLoad) {
          setError(err.message || 'Failed to fetch restaurants');
          setRestaurants([]);
        }
      } finally {
        if (isInitialLoad) {
          setLoading(false);
          isInitialLoad = false;
        }
      }
    };
    fetchRestaurants();

    // Setup polling for real-time reflection
    const intervalId = setInterval(() => {
      fetchRestaurants();
    }, 3000);
    return () => clearInterval(intervalId);
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoryLoading(true);
        const response = await adminAPI.getDiningCategories();
        if (response.data && response.data.success) {
          const cats = (response.data.data.categories || []).map((cat) => ({
            ...cat,
            slug: cat.name.toLowerCase().replace(/\s+/g, '-'),
          }));
          setCategories(cats);
        }
      } catch (err) {
        debugError('Error fetching categories:', err);
      } finally {
        setCategoryLoading(false);
      }
    };
    fetchCategories();
  }, []);
  const filteredRestaurants = useMemo(() => {
    let result = [...restaurants];

    // Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (restaurant) =>
          restaurant.name.toLowerCase().includes(query) || restaurant.ownerName.toLowerCase().includes(query) || restaurant.ownerPhone.includes(query),
      );
    }

    // Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(
        (restaurant) =>
          restaurant.categories?.some((category) => category.slug === selectedCategory) ||
          (selectedCategory === 'Uncategorized' && !restaurant.diningSettings?.diningType),
      );
    }
    return result;
  }, [restaurants, searchQuery, selectedCategory]);
  const formatRestaurantId = (id) => {
    if (!id) return 'REST000000';
    return `REST${String(id).slice(-6).toUpperCase()}`;
  };
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating || 0);
    return (
      <Div className="flex-row items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <UiIcon as={Star} key={i} size={12} className={i < fullStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'} />
        ))}
        <Span className="ml-1 text-xs text-slate-500">({rating || 0})</Span>
      </Div>
    );
  };
  const handleDiningToggle = async (restaurant) => {
    const newStatus = !restaurant.diningSettings?.isEnabled;
    try {
      // Optimistic update
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === restaurant.id
            ? {
                ...r,
                diningSettings: {
                  ...r.diningSettings,
                  isEnabled: newStatus,
                },
              }
            : r,
        ),
      );
      await adminAPI.updateRestaurantDiningSettings(restaurant._id, {
        isEnabled: newStatus,
        maxGuests: restaurant.diningSettings?.maxGuests || 6,
        categoryIds: restaurant.categoryIds || [],
        primaryCategoryId: restaurant.primaryCategoryId || restaurant.categoryIds?.[0] || null,
      });
      // Could show success toast here
    } catch (error) {
      debugError('Failed to update dining settings', error);
      // Revert on error
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === restaurant.id
            ? {
                ...r,
                diningSettings: {
                  ...r.diningSettings,
                  isEnabled: !newStatus,
                },
              }
            : r,
        ),
      );
    }
  };
  const handleMaxGuestsUpdate = async (restaurant, newValue) => {
    const guests = parseInt(newValue);
    if (isNaN(guests) || guests < 1) return;

    // Prevent unnecessary API calls
    if (guests === restaurant.diningSettings?.maxGuests) return;
    try {
      // Optimistic update
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === restaurant.id
            ? {
                ...r,
                diningSettings: {
                  ...r.diningSettings,
                  maxGuests: guests,
                },
              }
            : r,
        ),
      );
      await adminAPI.updateRestaurantDiningSettings(restaurant._id, {
        isEnabled: restaurant.diningSettings?.isEnabled === true,
        maxGuests: guests,
        categoryIds: restaurant.categoryIds || [],
        primaryCategoryId: restaurant.primaryCategoryId || restaurant.categoryIds?.[0] || null,
      });
    } catch (error) {
      debugError('Failed to update max guests', error);
      // Revert would require tracking previous value better
    }
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={UtensilsCrossed}
        title="Dining List"
        subtitle="Manage the restaurants available for dining"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Dining list' }]}
      />

      {error ? <ErrorState message={error} className="mb-4" /> : null}

      {loading ? (
        <TableSkeleton rows={5} />
      ) : restaurants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No dining restaurants added yet"
          message="Restaurants appear here once dining is enabled for them in restaurant management."
        />
      ) : (
        <>
          <Card className="mb-4">
            <Toolbar className="mb-3">
              <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
                <UiIcon as={Search} size={16} className="text-slate-400 shrink-0" />
                <Input
                  type="text"
                  placeholder="Search dining restaurants…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-sm text-slate-900"
                />
              </Div>
            </Toolbar>

            {categoryLoading ? (
              <LoadingState label="Loading categories…" />
            ) : (
              <HScroll contentClassName="flex-row items-center gap-2">
                <Button
                  onClick={() => setSelectedCategory('All')}
                  className={`flex-row items-center justify-center h-11 px-4 rounded-full ${selectedCategory === 'All' ? 'bg-blue-600' : 'bg-slate-100'}`}
                >
                  <Span className={selectedCategory === 'All' ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-600'}>
                    {`All (${restaurants.length})`}
                  </Span>
                </Button>
                {categories.map((cat) => {
                  const count = restaurants.filter((r) => r.categories?.some((category) => category.slug === cat.slug)).length;
                  const on = selectedCategory === cat.slug;
                  return (
                    <Button
                      key={cat._id}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`flex-row items-center justify-center h-11 px-4 rounded-full ${on ? 'bg-blue-600' : 'bg-slate-100'}`}
                    >
                      <Span className={on ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-600'}>{`${cat.name} (${count})`}</Span>
                    </Button>
                  );
                })}
              </HScroll>
            )}
          </Card>

          {filteredRestaurants.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No dining restaurants found"
              message="Try adjusting your search query or category filter."
              actionLabel="Clear filters"
              onAction={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
            />
          ) : (
            <DataTable cols={COLS}>
              <THead cols={COLS} labels={LABELS} />
              <TBody>
                {filteredRestaurants.map((restaurant, index) => (
                  <Row key={restaurant.id} last={index === filteredRestaurants.length - 1}>
                    <Cell width={COLS[0]}>
                      <Div className="flex-row items-center gap-2.5">
                        <Div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                          <Img
                            src={restaurant.logo}
                            alt={restaurant.name}
                            className="w-10 h-10 object-cover"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/40';
                            }}
                          />
                        </Div>
                        <Div className="flex-1 min-w-0">
                          <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={2}>
                            {restaurant.name}
                          </Text>
                          <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                            {`#${formatRestaurantId(restaurant.originalData?.restaurantId || restaurant._id)}`}
                          </Text>
                        </Div>
                      </Div>
                    </Cell>
                    <Cell width={COLS[1]}>
                      <Div className="min-w-0">
                        <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={2}>
                          {restaurant.ownerName}
                        </Text>
                        <Text style={tw`text-xs text-slate-500`} numberOfLines={1}>
                          {restaurant.ownerPhone}
                        </Text>
                      </Div>
                    </Cell>
                    <Cell width={COLS[2]}>{restaurant.zone}</Cell>
                    <Cell width={COLS[3]}>
                      <Button
                        onClick={() => handleDiningToggle(restaurant)}
                        accessibilityLabel={`Toggle dining for ${restaurant.name}`}
                        className="w-11 h-11 flex-row items-center shrink-0"
                      >
                        <Div className={`flex-row items-center h-6 w-11 rounded-full px-0.5 ${restaurant.diningSettings?.isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'}`}>
                          <Span className="h-5 w-5 rounded-full bg-white" />
                        </Div>
                      </Button>
                    </Cell>
                    <Cell width={COLS[4]}>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        defaultValue={restaurant.diningSettings?.maxGuests || 6}
                        onBlur={(e) => handleMaxGuestsUpdate(restaurant, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-16 h-11 px-2 text-sm text-slate-900 border border-slate-300 rounded-lg text-center"
                      />
                    </Cell>
                    <Cell width={COLS[5]}>{renderStars(restaurant.rating)}</Cell>
                    <Cell width={COLS[6]}>
                      <StatusBadge status={restaurant.status ? 'active' : 'inactive'} label={restaurant.status ? 'Active' : 'Inactive'} />
                    </Cell>
                    <Cell width={COLS[7]} align="center">
                      <Button
                        onClick={() => {
                          setEditingRestaurant({
                            ...restaurant,
                          });
                          setIsEditModalOpen(true);
                        }}
                        accessibilityLabel={`Dining settings for ${restaurant.name}`}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                      >
                        <UiIcon as={Settings} size={16} className="text-slate-500" />
                      </Button>
                    </Cell>
                  </Row>
                ))}
              </TBody>
            </DataTable>
          )}
        </>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingRestaurant ? (
        <Overlay onClose={() => setIsEditModalOpen(false)} className="absolute inset-0 items-center justify-center p-4 bg-black/50">
          <ScrollDiv className="bg-white rounded-xl border border-slate-200 w-full max-w-md max-h-[90vh]">
            <Div className="px-4 py-3 border-b border-slate-100 flex-row items-center justify-between gap-2">
              <Text style={tw`text-base font-semibold text-slate-900 flex-1`}>Edit Dining Settings</Text>
              <Button onClick={() => setIsEditModalOpen(false)} accessibilityLabel="Close" className="w-11 h-11 rounded-lg items-center justify-center">
                <UiIcon as={X} size={18} className="text-slate-500" />
              </Button>
            </Div>

            <Div className="p-4 gap-4">
              <Div className="flex-row items-center justify-between gap-3">
                <Div className="flex-1 min-w-0">
                  <Text style={tw`text-sm font-semibold text-slate-900`}>Dining Status</Text>
                  <Text style={tw`text-xs text-slate-500`}>Enable or disable dining for this restaurant</Text>
                </Div>
                <Button
                  onClick={() =>
                    setEditingRestaurant((prev) => ({
                      ...prev,
                      diningSettings: {
                        ...prev.diningSettings,
                        isEnabled: !prev.diningSettings.isEnabled,
                      },
                    }))
                  }
                  accessibilityLabel="Toggle dining status"
                  className="w-11 h-11 flex-row items-center justify-end shrink-0"
                >
                  <Div className={`flex-row items-center h-6 w-11 rounded-full px-0.5 ${editingRestaurant.diningSettings?.isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'}`}>
                    <Span className="h-5 w-5 rounded-full bg-white" />
                  </Div>
                </Button>
              </Div>

              <Field label="Maximum Guests">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={editingRestaurant.diningSettings?.maxGuests}
                  onChange={(e) =>
                    setEditingRestaurant((prev) => ({
                      ...prev,
                      diningSettings: {
                        ...prev.diningSettings,
                        maxGuests: parseInt(e.target.value) || 1,
                      },
                    }))
                  }
                  className={INPUT}
                />
              </Field>

              <Field label="Dining Category">
                <Select
                  value={editingRestaurant.primaryCategoryId || editingRestaurant.categoryIds?.[0] || ''}
                  onChange={(e) =>
                    setEditingRestaurant((prev) => ({
                      ...prev,
                      primaryCategoryId: e.target.value || null,
                      categoryIds: e.target.value ? [e.target.value] : [],
                      categories: e.target.value ? categories.filter((cat) => cat._id === e.target.value) : [],
                      diningSettings: {
                        ...prev.diningSettings,
                        diningType: categories.find((cat) => cat._id === e.target.value)?.slug || '',
                      },
                    }))
                  }
                  className={INPUT}
                >
                  <Option value="">Select a category</Option>
                  {categories.map((cat) => (
                    <Option key={cat._id} value={cat._id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
              </Field>
            </Div>

            <Div className="px-4 py-3 bg-slate-50 flex-row flex-wrap items-center justify-end gap-2">
              <Button onClick={() => setIsEditModalOpen(false)} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setLoading(true);
                    await adminAPI.updateRestaurantDiningSettings(editingRestaurant._id, {
                      isEnabled: editingRestaurant.diningSettings?.isEnabled === true,
                      maxGuests: editingRestaurant.diningSettings?.maxGuests || 6,
                      categoryIds: editingRestaurant.categoryIds || [],
                      primaryCategoryId: editingRestaurant.primaryCategoryId || editingRestaurant.categoryIds?.[0] || null,
                    });

                    // Update local state
                    setRestaurants((prev) => prev.map((r) => (r._id === editingRestaurant._id ? editingRestaurant : r)));
                    setIsEditModalOpen(false);
                    // toast.success("Settings updated")
                  } catch (err) {
                    debugError('Update failed', err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className={BTN_PRIMARY}
              >
                <Span className={BTN_TEXT_PRIMARY}>Save Changes</Span>
              </Button>
            </Div>
          </ScrollDiv>
        </Overlay>
      ) : null}
    </AdminPage>
  );
}
