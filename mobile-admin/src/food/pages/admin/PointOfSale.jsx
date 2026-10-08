/* Ported from Frontend/src/modules/Food/pages/admin/PointOfSale.jsx (tools/port.js first pass). */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from '../../../lib/webRouter';
import { Search, ShoppingCart, XCircle, Star, BarChart3, Users, Award, Package } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { Button, Div, Input, Option, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../components/web';
import {
  AdminPage,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  SectionTitle,
  StatCard,
  StatGrid,
  StatusBadge,
  useLayoutWidth,
  INPUT,
} from '../../../admin/ui';

/** One label / value line in a financial breakdown column. */
function MoneyRow({ label, value, strong, last }) {
  return (
    <Div className={`flex-row items-center justify-between gap-3 py-2.5 ${last ? '' : 'border-b border-slate-100'}`}>
      <Span className="text-sm text-slate-500 flex-1">{label}</Span>
      <Span className={`text-sm ${strong ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{value}</Span>
    </Div>
  );
}
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const formatRestaurantDisplayId = (mongoId) => {
  const s = String(mongoId || '').trim();
  if (!s) return '';
  if (/^REST\d{6}$/i.test(s)) return s.toUpperCase();
  return `REST${s.slice(-6).padStart(6, '0')}`;
};
const POS_SELECTION_STORAGE_KEY = 'admin_pos_restaurant_selection';
const readSavedPosSelection = () => {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(POS_SELECTION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeSavedPosSelection = (id, name) => {
  if (typeof sessionStorage === 'undefined') return;
  if (!id) {
    sessionStorage.removeItem(POS_SELECTION_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(
    POS_SELECTION_STORAGE_KEY,
    JSON.stringify({
      id: String(id),
      name: String(name || ''),
    }),
  );
};
export default function PointOfSale() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRestaurantId = searchParams.get('restaurantId') || '';
  const savedSelection = readSavedPosSelection();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(initialRestaurantId);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (initialRestaurantId && savedSelection?.id === initialRestaurantId) {
      return savedSelection.name || '';
    }
    return '';
  });
  const [listLoading, setListLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(Boolean(initialRestaurantId));
  const [restaurantData, setRestaurantData] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const getRestaurantName = (restaurant) => {
    return String(restaurant?.name || restaurant?.restaurantName || restaurant?.restaurant?.name || '').trim();
  };
  const getRestaurantCode = (restaurant) => {
    const existing = String(restaurant?.restaurantId || restaurant?.restaurantCode || restaurant?.restaurant?.restaurantId || '').trim();
    if (/^REST\d{6}$/i.test(existing)) return existing.toUpperCase();
    const mongoId = restaurant?._id || restaurant?.id || restaurant?.restaurant?._id;
    return formatRestaurantDisplayId(mongoId);
  };
  const normalizeRestaurants = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .map((restaurant) => {
        const mongoId = String(restaurant?._id || restaurant?.id || restaurant?.restaurant?._id || '').trim();
        if (!mongoId) return null;
        const resolvedName = getRestaurantName(restaurant) || `Restaurant ${mongoId.slice(-6)}`;
        const resolvedCode = getRestaurantCode({
          ...restaurant,
          _id: mongoId,
        });
        return {
          ...restaurant,
          _id: mongoId,
          name: resolvedName,
          restaurantId: resolvedCode,
        };
      })
      .filter(Boolean);
  };

  // Default analytics shape before the API responds
  const [analyticsData, setAnalyticsData] = useState({
    totalOrders: 0,
    cancelledOrders: 0,
    completedOrders: 0,
    averageRating: 0,
    totalRatings: 0,
    commissionPercentage: 0,
    monthlyProfit: 0,
    yearlyProfit: 0,
    averageOrderValue: 0,
    totalRevenue: 0,
    totalCommission: 0,
    restaurantEarning: 0,
    restaurantProfit: 0,
    monthlyOrders: 0,
    yearlyOrders: 0,
    averageMonthlyProfit: 0,
    averageYearlyProfit: 0,
    status: 'active',
    joinDate: '',
    totalCustomers: 0,
    repeatCustomers: 0,
    cancellationRate: 0,
    completionRate: 0,
  });

  // Fetch restaurants list
  useEffect(() => {
    fetchRestaurants();
  }, []);
  const applyRestaurantSelection = useCallback(
    (restaurantId, list = restaurants) => {
      const id = String(restaurantId || '');
      setSelectedRestaurant(id);
      const selected = list.find((r) => r._id === id);
      setSearchQuery(selected?.name || '');
      setShowSearchResults(false);
      writeSavedPosSelection(id, selected?.name || '');
      const next = new URLSearchParams(searchParams);
      if (id) {
        next.set('restaurantId', id);
      } else {
        next.delete('restaurantId');
      }
      setSearchParams(next, {
        replace: true,
      });
    },
    [restaurants, searchParams, setSearchParams],
  );

  // Sync search label once restaurants list is available
  useEffect(() => {
    if (!selectedRestaurant || restaurants.length === 0) return;
    const match = restaurants.find((r) => r._id === selectedRestaurant);
    if (!match) {
      applyRestaurantSelection('');
      return;
    }
    setSearchQuery(match.name);
    writeSavedPosSelection(match._id, match.name);
  }, [restaurants, selectedRestaurant, applyRestaurantSelection]);

  // Fetch restaurant analytics when restaurant is selected
  useEffect(() => {
    if (selectedRestaurant) {
      fetchRestaurantAnalytics(selectedRestaurant);
    } else {
      setRestaurantData(null);
      setPaymentSummary(null);
      setAnalyticsData({
        totalOrders: 0,
        cancelledOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        totalRatings: 0,
        commissionPercentage: 0,
        monthlyProfit: 0,
        yearlyProfit: 0,
        averageOrderValue: 0,
        totalRevenue: 0,
        totalCommission: 0,
        restaurantEarning: 0,
        restaurantProfit: 0,
        monthlyOrders: 0,
        yearlyOrders: 0,
        averageMonthlyProfit: 0,
        averageYearlyProfit: 0,
        status: 'active',
        joinDate: '',
        totalCustomers: 0,
        repeatCustomers: 0,
        cancellationRate: 0,
        completionRate: 0,
      });
    }
  }, [selectedRestaurant]);
  const fetchRestaurants = async () => {
    try {
      setListLoading(true);
      setLoadError(null);
      const response = await adminAPI.getRestaurants({
        limit: 1000,
        isActive: true,
      });
      if (response?.data?.success) {
        const data = response.data.data;
        const rawRestaurants = Array.isArray(data?.restaurants) ? data.restaurants : Array.isArray(data) ? data : [];
        setRestaurants(normalizeRestaurants(rawRestaurants));
      }
    } catch (error) {
      debugError('Error fetching restaurants:', error);
      setLoadError(error?.response?.data?.message || error?.message || 'Failed to load restaurants');
    } finally {
      setListLoading(false);
    }
  };
  const fetchRestaurantAnalytics = async (restaurantId) => {
    try {
      setAnalyticsLoading(true);

      // Validate restaurantId
      if (!restaurantId) {
        debugError('Restaurant ID is required');
        return;
      }
      debugLog('Fetching analytics for restaurant:', restaurantId);

      // Fetch comprehensive restaurant analytics from backend
      const analyticsResponse = await adminAPI.getRestaurantAnalytics(restaurantId);
      debugLog('Analytics response:', analyticsResponse);
      if (analyticsResponse?.data?.success && analyticsResponse.data.data) {
        const { restaurant, analytics, paymentSummary: apiPaymentSummary } = analyticsResponse.data.data;
        debugLog('Analytics data received:', analytics);
        debugLog('Commission percentage from API:', analytics.commissionPercentage);
        debugLog('Commission percentage type:', typeof analytics.commissionPercentage);

        // Set restaurant data
        setRestaurantData(restaurant);
        setPaymentSummary(apiPaymentSummary || null);

        // Parse commission percentage - handle both number and string
        const commissionPercentage =
          analytics.commissionPercentage !== undefined && analytics.commissionPercentage !== null ? parseFloat(analytics.commissionPercentage) || 0 : 0;
        debugLog('Parsed commission percentage:', commissionPercentage);

        // Set analytics data - ensure all values are numbers, not null/undefined
        setAnalyticsData({
          totalOrders: Number(analytics.totalOrders) || 0,
          cancelledOrders: Number(analytics.cancelledOrders) || 0,
          completedOrders: Number(analytics.completedOrders) || 0,
          averageRating: Number(analytics.averageRating) || 0,
          totalRatings: Number(analytics.totalRatings) || 0,
          commissionPercentage: commissionPercentage,
          monthlyProfit: analytics.monthlyProfit || 0,
          yearlyProfit: analytics.yearlyProfit || 0,
          averageOrderValue: analytics.averageOrderValue || 0,
          totalRevenue: analytics.totalRevenue || 0,
          totalCommission: analytics.totalCommission || 0,
          restaurantEarning: analytics.restaurantEarning || 0,
          restaurantProfit: analytics.restaurantProfit || 0,
          monthlyOrders: analytics.monthlyOrders || 0,
          yearlyOrders: analytics.yearlyOrders || 0,
          averageMonthlyProfit: analytics.averageMonthlyProfit || 0,
          averageYearlyProfit: analytics.averageYearlyProfit || 0,
          status: analytics.status || 'inactive',
          joinDate: analytics.joinDate || restaurant.createdAt || new Date(),
          totalCustomers: analytics.totalCustomers || 0,
          repeatCustomers: analytics.repeatCustomers || 0,
          cancellationRate: analytics.cancellationRate || 0,
          completionRate: analytics.completionRate || 0,
        });
      } else {
        // Fallback to empty data if API fails
        setPaymentSummary(null);
        setAnalyticsData({
          totalOrders: 0,
          cancelledOrders: 0,
          completedOrders: 0,
          averageRating: 0,
          totalRatings: 0,
          commissionPercentage: 0,
          monthlyProfit: 0,
          yearlyProfit: 0,
          averageOrderValue: 0,
          totalRevenue: 0,
          totalCommission: 0,
          restaurantEarning: 0,
          restaurantProfit: 0,
          monthlyOrders: 0,
          yearlyOrders: 0,
          averageMonthlyProfit: 0,
          averageYearlyProfit: 0,
          status: 'inactive',
          joinDate: new Date(),
          totalCustomers: 0,
          repeatCustomers: 0,
          cancellationRate: 0,
          completionRate: 0,
        });
      }
    } catch (error) {
      debugError('Error fetching restaurant analytics:', error);
      debugError('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        restaurantId: selectedRestaurant,
      });

      // Show user-friendly error message
      if (error?.response?.status === 404) {
        debugWarn('Restaurant not found');
      } else if (error?.response?.status === 400) {
        debugWarn('Invalid restaurant ID');
      } else {
        debugWarn('Failed to fetch analytics. Please try again.');
      }

      // Set empty data on error
      setPaymentSummary(null);
      setAnalyticsData({
        totalOrders: 0,
        cancelledOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        totalRatings: 0,
        commissionPercentage: 0,
        monthlyProfit: 0,
        yearlyProfit: 0,
        averageOrderValue: 0,
        totalRevenue: 0,
        totalCommission: 0,
        restaurantEarning: 0,
        restaurantProfit: 0,
        monthlyOrders: 0,
        yearlyOrders: 0,
        averageMonthlyProfit: 0,
        averageYearlyProfit: 0,
        status: 'inactive',
        joinDate: new Date(),
        totalCustomers: 0,
        repeatCustomers: 0,
        cancellationRate: 0,
        completionRate: 0,
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };
  const filteredRestaurants = restaurants.filter((restaurant) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      restaurant.name?.toLowerCase().includes(query) || restaurant.restaurantId?.toLowerCase().includes(query) || restaurant._id?.toLowerCase().includes(query)
    );
  });

  // Handle restaurant selection from search
  const handleRestaurantSelect = (restaurantId) => {
    applyRestaurantSelection(restaurantId);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.trim().length > 0);

    // If search is cleared, clear selection
    if (!value.trim()) {
      applyRestaurantSelection('');
    }
  };
  const formatCurrency = (amount) => {
    return `\u20B9 ${
      amount?.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) || '0.00'
    }`;
  };
  const formatNumber = (num) => {
    return num?.toLocaleString('en-IN') || '0';
  };
  const getSelectedRestaurantName = () => {
    const restaurant = restaurants.find((r) => r._id === selectedRestaurant);
    return restaurant?.name || searchQuery || 'Loading...';
  };
  const { tablet } = useLayoutWidth();
  const pairClass = tablet ? 'flex-row gap-3' : 'gap-3';
  const restaurantIdLabel = restaurants.find((r) => r._id === selectedRestaurant)?.restaurantId || formatRestaurantDisplayId(selectedRestaurant);
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={BarChart3}
        title="Restaurant POS Analytics"
        subtitle="Track restaurant performance, profits and commission details"
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'POS analytics' }]}
      />

      <Card className="mb-4 gap-4">
        <Field label="Search restaurant by name or ID" required hint="Pick a restaurant to load its analytics">
          <Div>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Search} size={16} className="text-slate-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery.trim()) {
                    setShowSearchResults(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on results
                  setTimeout(() => setShowSearchResults(false), 200);
                }}
                placeholder="Type restaurant name or ID to search..."
                className={`${INPUT} flex-1`}
              />
            </Div>

            {showSearchResults && filteredRestaurants.length > 0 && (
              <ScrollDiv
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                className="mt-2 bg-white border border-slate-200 rounded-lg max-h-60"
              >
                {filteredRestaurants.map((restaurant) => (
                  <Button
                    key={restaurant._id}
                    type="button"
                    onClick={(e) => {
                      e?.preventDefault?.();
                      handleRestaurantSelect(restaurant._id);
                    }}
                    className="px-4 py-3 border-b border-slate-100"
                  >
                    <Div className="flex-row items-center justify-between gap-3">
                      <Div className="flex-1 min-w-0 gap-0.5">
                        <Span className="text-sm font-medium text-slate-900">{restaurant.name}</Span>
                        <Span className="text-xs text-slate-500">ID: {restaurant.restaurantId}</Span>
                      </Div>
                      {selectedRestaurant === restaurant._id ? <Span className="text-xs font-semibold text-blue-600">Selected</Span> : null}
                    </Div>
                  </Button>
                ))}
              </ScrollDiv>
            )}

            {showSearchResults && searchQuery.trim() && filteredRestaurants.length === 0 && (
              <Div className="mt-2 bg-white border border-slate-200 rounded-lg p-4">
                <Span className="text-sm text-slate-500">No restaurants found matching {`"${searchQuery}"`}</Span>
              </Div>
            )}
          </Div>
        </Field>

        <Field label="Or select from the list">
          <Select value={selectedRestaurant} onChange={(e) => applyRestaurantSelection(e.target.value)} className={INPUT}>
            <Option value="">Select Restaurant</Option>
            {restaurants.map((restaurant) => (
              <Option key={restaurant._id} value={restaurant._id}>
                {restaurant.name}
              </Option>
            ))}
          </Select>
        </Field>
      </Card>

      {selectedRestaurant ? (
        analyticsLoading || listLoading ? (
          <LoadingState label="Loading restaurant analytics…" />
        ) : (
          <Div className="gap-4">
            <Card>
              <Div className="flex-row items-start justify-between gap-3">
                <Div className="flex-1 min-w-0 gap-1">
                  <Span className="text-lg font-bold text-slate-900">{getSelectedRestaurantName()}</Span>
                  <Span className="text-sm text-slate-500">Restaurant ID: {restaurantIdLabel}</Span>
                </Div>
                <StatusBadge status={analyticsData.status === 'active' ? 'active' : 'inactive'} label={analyticsData.status === 'active' ? 'Active' : 'Inactive'} />
              </Div>
            </Card>

            <StatGrid>
              <StatCard
                label="Total Orders"
                value={formatNumber(analyticsData.totalOrders)}
                hint={`Completed: ${formatNumber(analyticsData.completedOrders)}`}
                icon={ShoppingCart}
                tone="info"
              />
              <StatCard
                label="Cancelled Orders"
                value={formatNumber(analyticsData.cancelledOrders)}
                hint={`Cancellation rate ${analyticsData.cancellationRate.toFixed(1)}%`}
                icon={XCircle}
                tone="danger"
              />
              <StatCard
                label="Average Rating"
                value={analyticsData.averageRating.toFixed(1)}
                hint={`From ${formatNumber(analyticsData.totalRatings)} reviews`}
                icon={Star}
                tone="warning"
              />
              <StatCard
                label="Commission Rate"
                value={`${analyticsData.commissionPercentage}%`}
                hint="Set commission"
                icon={Award}
                tone="info"
              />
            </StatGrid>

            <Div className={pairClass}>
              <Card className="flex-1 gap-2">
                <SectionTitle className="mb-0">Monthly Profit</SectionTitle>
                <Span className="text-sm text-slate-500">Current month</Span>
                <Span className="text-2xl font-bold text-slate-900">{formatCurrency(analyticsData.monthlyProfit)}</Span>
                <MoneyRow label="Orders" value={formatNumber(analyticsData.monthlyOrders)} />
                <MoneyRow label="Average / month" value={formatCurrency(analyticsData.averageMonthlyProfit)} last />
              </Card>
              <Card className="flex-1 gap-2">
                <SectionTitle className="mb-0">Yearly Profit</SectionTitle>
                <Span className="text-sm text-slate-500">Current year</Span>
                <Span className="text-2xl font-bold text-slate-900">{formatCurrency(analyticsData.yearlyProfit)}</Span>
                <MoneyRow label="Orders" value={formatNumber(analyticsData.yearlyOrders)} />
                <MoneyRow label="Average / year" value={formatCurrency(analyticsData.averageYearlyProfit)} last />
              </Card>
            </Div>

            <Card>
              <SectionTitle>Financial Breakdown</SectionTitle>
              <Div className={pairClass}>
                <Div className="flex-1">
                  <MoneyRow label="Subtotal (dish price)" value={formatCurrency(paymentSummary?.subtotal || 0)} />
                  <MoneyRow label="Total revenue" value={formatCurrency(analyticsData.totalRevenue)} />
                  <MoneyRow label="Total commission (admin)" value={formatCurrency(analyticsData.totalCommission)} />
                  <MoneyRow label="Restaurant share" value={formatCurrency(analyticsData.restaurantEarning)} />
                  <MoneyRow label="Restaurant profit" value={formatCurrency(analyticsData.restaurantProfit)} last={!tablet} />
                </Div>
                <Div className="flex-1">
                  <MoneyRow label="Average order value" value={formatCurrency(analyticsData.averageOrderValue)} />
                  <MoneyRow label="Completion rate" value={`${analyticsData.completionRate.toFixed(1)}%`} />
                  <MoneyRow
                    label="Commission percentage"
                    value={
                      analyticsData.commissionPercentage !== undefined && analyticsData.commissionPercentage !== null
                        ? `${analyticsData.commissionPercentage}%`
                        : '0%'
                    }
                    last
                  />
                </Div>
              </Div>
            </Card>

            <Card>
              <SectionTitle>Restaurant Payments (completed orders)</SectionTitle>
              <Span className="text-xs text-slate-500 mb-3">
                Breakdown from delivered orders (same basis as the Transaction Report). “Subtotal” reflects total dish value (food price).
              </Span>
              <Div className={pairClass}>
                <Div className="flex-1">
                  <MoneyRow label="Subtotal (dish price)" value={formatCurrency(paymentSummary?.subtotal || 0)} />
                  <MoneyRow label="Tax" value={formatCurrency(paymentSummary?.tax || 0)} />
                  <MoneyRow label="Delivery fee" value={formatCurrency(paymentSummary?.deliveryFee || 0)} />
                  <MoneyRow label="Platform fee" value={formatCurrency(paymentSummary?.platformFee || 0)} />
                  <MoneyRow label="Discount" value={formatCurrency(paymentSummary?.discount || 0)} />
                  <MoneyRow label="Total order value" value={formatCurrency(paymentSummary?.total || 0)} strong last />
                </Div>
                <Div className="flex-1">
                  <MoneyRow label="Restaurant share" value={formatCurrency(paymentSummary?.restaurantShare || 0)} />
                  <MoneyRow label="Restaurant commission (admin)" value={formatCurrency(paymentSummary?.restaurantCommission || 0)} />
                  <MoneyRow label="Rider share" value={formatCurrency(paymentSummary?.riderShare || 0)} />
                  <MoneyRow label="Platform net profit" value={formatCurrency(paymentSummary?.platformNetProfit || 0)} last />
                </Div>
              </Div>
            </Card>

            <Div className={pairClass}>
              <Card className="flex-1">
                <SectionTitle>
                  <Div className="flex-row items-center gap-2">
                    <UiIcon as={Users} size={16} className="text-slate-500" />
                    <Span className="text-base font-semibold text-slate-900">Customer Statistics</Span>
                  </Div>
                </SectionTitle>
                <MoneyRow label="Total customers" value={formatNumber(analyticsData.totalCustomers)} />
                <MoneyRow label="Repeat customers" value={formatNumber(analyticsData.repeatCustomers)} />
                <MoneyRow
                  label="Customer retention"
                  value={`${analyticsData.totalCustomers > 0 ? ((analyticsData.repeatCustomers / analyticsData.totalCustomers) * 100).toFixed(1) : '0'}%`}
                  last
                />
              </Card>
              <Card className="flex-1">
                <SectionTitle>
                  <Div className="flex-row items-center gap-2">
                    <UiIcon as={Package} size={16} className="text-slate-500" />
                    <Span className="text-base font-semibold text-slate-900">Restaurant Details</Span>
                  </Div>
                </SectionTitle>
                <MoneyRow
                  label="Join date"
                  value={new Date(analyticsData.joinDate).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                />
                <Div className="flex-row items-center justify-between gap-3 py-2.5 border-b border-slate-100">
                  <Span className="text-sm text-slate-500 flex-1">Status</Span>
                  <StatusBadge
                    status={analyticsData.status === 'active' ? 'active' : 'inactive'}
                    label={analyticsData.status === 'active' ? 'Active' : 'Inactive'}
                  />
                </Div>
                <MoneyRow label="Total reviews" value={formatNumber(analyticsData.totalRatings)} last />
              </Card>
            </Div>

            <Card>
              <SectionTitle>Order Statistics Summary</SectionTitle>
              <Div className={`grid grid-cols-${tablet ? 4 : 2} gap-3`}>
                <Div className="p-3 rounded-lg bg-slate-50 items-center gap-1">
                  <Span className="text-xl font-bold text-slate-900">{formatNumber(analyticsData.totalOrders)}</Span>
                  <Span className="text-xs text-slate-500">Total orders</Span>
                </Div>
                <Div className="p-3 rounded-lg bg-slate-50 items-center gap-1">
                  <Span className="text-xl font-bold text-slate-900">{formatNumber(analyticsData.completedOrders)}</Span>
                  <Span className="text-xs text-slate-500">Completed</Span>
                </Div>
                <Div className="p-3 rounded-lg bg-slate-50 items-center gap-1">
                  <Span className="text-xl font-bold text-slate-900">{formatNumber(analyticsData.cancelledOrders)}</Span>
                  <Span className="text-xs text-slate-500">Cancelled</Span>
                </Div>
                <Div className="p-3 rounded-lg bg-slate-50 items-center gap-1">
                  <Span className="text-xl font-bold text-slate-900">{analyticsData.completionRate.toFixed(1)}%</Span>
                  <Span className="text-xs text-slate-500">Success rate</Span>
                </Div>
              </Div>
            </Card>
          </Div>
        )
      ) : listLoading ? (
        <LoadingState label="Loading restaurants…" />
      ) : loadError ? (
        <ErrorState title="Could not load restaurants" message={loadError} onRetry={fetchRestaurants} />
      ) : restaurants.length === 0 ? (
        <EmptyState title="No restaurants yet" message="Once a restaurant is onboarded it will appear here with its POS analytics." />
      ) : (
        <EmptyState
          icon={Search}
          title="Select a restaurant"
          message="Search above or pick a restaurant from the list to view its analytics, profit and commission details."
        />
      )}
    </AdminPage>
  );
}
