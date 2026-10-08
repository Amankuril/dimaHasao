/* Ported from Frontend/src/modules/Food/pages/admin/PointOfSale.jsx (tools/port.js first pass). */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from '../../../lib/webRouter';
import { Search, TrendingUp, TrendingDown, DollarSign, ShoppingCart, XCircle, Star, Calendar, BarChart3, Users, Award, Package } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { adminAPI } from '../../../api/food';
import { Button, Div, H1, H2, H3, Input, Label, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../components/web';
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
  return (
    <ScrollDiv className="flex-1 bg-neutral-200 w-full" keyboardShouldPersistTaps="handled">
      <Div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full overflow-hidden">
        {/* Header Section */}
        <Div className="mb-6">
          <H1 className="text-2xl font-bold text-[#334257] mb-2">Restaurant POS Analytics & Benefits</H1>
          <P className="text-sm text-[#8a94aa]">Track restaurant performance, profits, and commission details</P>
        </Div>

        {/* Restaurant Selection Card */}
        <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6 mb-6">
          <Div className="flex flex-col gap-4">
            <Div>
              <Label className="block text-sm font-medium text-[#334257] mb-2">
                Search Restaurant by Name or ID <Span className="text-red-500">*</Span>
              </Label>
              <Div className="relative">
                <UiIcon as={Search} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
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
                  className="w-full h-11 pl-10 pr-3 rounded-md border border-[#e3e6ef] bg-white text-sm text-[#4a5671] focus:outline-none focus:ring-1 focus:ring-[#006fbd]"
                />

                {/* Search Results Dropdown */}
                {showSearchResults && filteredRestaurants.length > 0 && (
                  <ScrollDiv nestedScrollEnabled keyboardShouldPersistTaps="handled" className="w-full mt-1 bg-white border border-[#e3e6ef] rounded-md shadow-lg max-h-60">
                    {filteredRestaurants.map((restaurant) => (
                      <Button
                        key={restaurant._id}
                        type="button"
                        onClick={(e) => {
                          e?.preventDefault?.();
                          handleRestaurantSelect(restaurant._id);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-[#f9fafc] cursor-pointer border-b border-[#e3e6ef] last:border-b-0 transition-colors"
                      >
                        <Div className="flex items-center justify-between">
                          <Div>
                            <P className="text-sm font-medium text-[#334257]">{restaurant.name}</P>
                            <P className="text-xs text-[#8a94aa]">ID: {restaurant.restaurantId}</P>
                          </Div>
                          {selectedRestaurant === restaurant._id && <Div className="w-2 h-2 bg-[#006fbd] rounded-full"></Div>}
                        </Div>
                      </Button>
                    ))}
                  </ScrollDiv>
                )}

                {/* No Results Message */}
                {showSearchResults && searchQuery.trim() && filteredRestaurants.length === 0 && (
                  <Div className="w-full mt-1 bg-white border border-[#e3e6ef] rounded-md shadow-lg p-4">
                    <P className="text-sm text-[#8a94aa] text-center">No restaurants found matching {`"${searchQuery}"`}</P>
                  </Div>
                )}
              </Div>
              {selectedRestaurant && <P className="text-xs text-green-600 mt-2">Selected: {getSelectedRestaurantName()}</P>}
            </Div>

            {/* Alternative: Dropdown Selector */}
            <Div>
              <Label className="block text-sm font-medium text-[#334257] mb-2">Or Select from Dropdown</Label>
              <Div className="relative">
                <Select
                  value={selectedRestaurant}
                  onChange={(e) => applyRestaurantSelection(e.target.value)}
                  className="w-full h-11 rounded-md border border-[#e3e6ef] bg-white px-3 pr-10 text-sm text-[#4a5671] focus:outline-none focus:ring-1 focus:ring-[#006fbd]"
                >
                  <Option value="">Select Restaurant</Option>
                  {restaurants.map((restaurant) => (
                    <Option key={restaurant._id} value={restaurant._id}>
                      {restaurant.name}
                    </Option>
                  ))}
                </Select>
              </Div>
            </Div>
          </Div>
        </Div>

        {/* Analytics Dashboard */}
        {selectedRestaurant ? (
          analyticsLoading || listLoading ? (
            <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-12 text-center">
              <ActivityIndicator size="large" color="#006fbd" style={{ marginBottom: 16 }} />
              <P className="text-sm text-[#8a94aa]">Loading restaurant analytics...</P>
            </Div>
          ) : (
            <Div className="space-y-6">
              {/* Restaurant Header Info */}
              <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                <Div className="flex items-center justify-between gap-3">
                  <Div className="flex-1">
                    <H2 className="text-xl font-bold text-[#334257] mb-1">{getSelectedRestaurantName()}</H2>
                    <P className="text-sm text-[#8a94aa]">
                      Restaurant ID: {restaurants.find((r) => r._id === selectedRestaurant)?.restaurantId || formatRestaurantDisplayId(selectedRestaurant)}
                    </P>
                  </Div>
                  <Div
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${analyticsData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {analyticsData.status === 'active' ? 'Active' : 'Inactive'}
                  </Div>
                </Div>
              </Div>

              {/* Key Metrics Grid */}
              <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Orders */}
                <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                  <Div className="flex items-center justify-between mb-4">
                    <Div className="p-3 bg-blue-100 rounded-lg">
                      <UiIcon as={ShoppingCart} className="w-6 h-6 text-blue-600" />
                    </Div>
                    <UiIcon as={TrendingUp} className="w-5 h-5 text-green-500" />
                  </Div>
                  <H3 className="text-sm font-medium text-[#8a94aa] mb-1">Total Orders</H3>
                  <P className="text-2xl font-bold text-[#334257]">{formatNumber(analyticsData.totalOrders)}</P>
                  <P className="text-xs text-[#8a94aa] mt-2">Completed: {formatNumber(analyticsData.completedOrders)}</P>
                </Div>

                {/* Cancelled Orders */}
                <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                  <Div className="flex items-center justify-between mb-4">
                    <Div className="p-3 bg-red-100 rounded-lg">
                      <UiIcon as={XCircle} className="w-6 h-6 text-red-600" />
                    </Div>
                    <Span className="text-sm font-semibold text-red-600">{analyticsData.cancellationRate.toFixed(1)}%</Span>
                  </Div>
                  <H3 className="text-sm font-medium text-[#8a94aa] mb-1">Cancelled Orders</H3>
                  <P className="text-2xl font-bold text-[#334257]">{formatNumber(analyticsData.cancelledOrders)}</P>
                  <P className="text-xs text-[#8a94aa] mt-2">Cancellation Rate</P>
                </Div>

                {/* Average Rating */}
                <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                  <Div className="flex items-center justify-between mb-4">
                    <Div className="p-3 bg-yellow-100 rounded-lg">
                      <UiIcon as={Star} className="w-6 h-6 text-yellow-600 fill-yellow-600" />
                    </Div>
                    <Span className="text-sm font-semibold text-[#334257]">{analyticsData.averageRating.toFixed(1)}</Span>
                  </Div>
                  <H3 className="text-sm font-medium text-[#8a94aa] mb-1">Average Rating</H3>
                  <P className="text-2xl font-bold text-[#334257]">{analyticsData.averageRating.toFixed(1)}</P>
                  <P className="text-xs text-[#8a94aa] mt-2">From {formatNumber(analyticsData.totalRatings)} reviews</P>
                </Div>

                {/* Commission Rate */}
                <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                  <Div className="flex items-center justify-between mb-4">
                    <Div className="p-3 bg-purple-100 rounded-lg">
                      <UiIcon as={Award} className="w-6 h-6 text-purple-600" />
                    </Div>
                    <Span className="text-sm font-semibold text-purple-600">{analyticsData.commissionPercentage}%</Span>
                  </Div>
                  <H3 className="text-sm font-medium text-[#8a94aa] mb-1">Commission Rate</H3>
                  <P className="text-2xl font-bold text-[#334257]">{analyticsData.commissionPercentage}%</P>
                  <P className="text-xs text-[#8a94aa] mt-2">Set Commission</P>
                </Div>
              </Div>

              {/* Profit & Revenue Section */}
              <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Profit */}
                <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                  <Div className="flex items-center justify-between mb-4">
                    <Div className="flex items-center gap-3">
                      <Div className="p-3 bg-green-100 rounded-lg">
                        <UiIcon as={Calendar} className="w-6 h-6 text-green-600" />
                      </Div>
                      <Div>
                        <H3 className="text-base font-semibold text-[#334257]">Monthly Profit</H3>
                        <P className="text-xs text-[#8a94aa]">Current Month</P>
                      </Div>
                    </Div>
                    <UiIcon as={TrendingUp} className="w-5 h-5 text-green-500" />
                  </Div>
                  <Div className="mt-4">
                    <P className="text-3xl font-bold text-[#334257] mb-2">{formatCurrency(analyticsData.monthlyProfit)}</P>
                    <Div className="flex items-center gap-4 mt-4 text-sm">
                      <Div>
                        <Span className="text-[#8a94aa]">Orders: </Span>
                        <Span className="font-semibold text-[#334257]">{formatNumber(analyticsData.monthlyOrders)}</Span>
                      </Div>
                      <Div>
                        <Span className="text-[#8a94aa]">Avg/Month: </Span>
                        <Span className="font-semibold text-[#334257]">{formatCurrency(analyticsData.averageMonthlyProfit)}</Span>
                      </Div>
                    </Div>
                  </Div>
                </Div>

                {/* Yearly Profit */}
                <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                  <Div className="flex items-center justify-between mb-4">
                    <Div className="flex items-center gap-3">
                      <Div className="p-3 bg-blue-100 rounded-lg">
                        <UiIcon as={BarChart3} className="w-6 h-6 text-blue-600" />
                      </Div>
                      <Div>
                        <H3 className="text-base font-semibold text-[#334257]">Yearly Profit</H3>
                        <P className="text-xs text-[#8a94aa]">Current Year</P>
                      </Div>
                    </Div>
                    <UiIcon as={TrendingUp} className="w-5 h-5 text-green-500" />
                  </Div>
                  <Div className="mt-4">
                    <P className="text-3xl font-bold text-[#334257] mb-2">{formatCurrency(analyticsData.yearlyProfit)}</P>
                    <Div className="flex items-center gap-4 mt-4 text-sm">
                      <Div>
                        <Span className="text-[#8a94aa]">Orders: </Span>
                        <Span className="font-semibold text-[#334257]">{formatNumber(analyticsData.yearlyOrders)}</Span>
                      </Div>
                      <Div>
                        <Span className="text-[#8a94aa]">Avg/Year: </Span>
                        <Span className="font-semibold text-[#334257]">{formatCurrency(analyticsData.averageYearlyProfit)}</Span>
                      </Div>
                    </Div>
                  </Div>
                </Div>
              </Div>

              {/* Detailed Financial Breakdown */}
              <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                <H3 className="text-lg font-semibold text-[#334257] mb-4">Financial Breakdown</H3>
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Div className="space-y-4">
                    <Div className="flex justify-between items-center py-3 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Subtotal (Dish Price)</Span>
                      <Span className="text-base font-semibold text-[#334257]">{formatCurrency(paymentSummary?.subtotal || 0)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-3 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Total Revenue</Span>
                      <Span className="text-base font-semibold text-[#334257]">{formatCurrency(analyticsData.totalRevenue)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-3 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Total Commission (Admin)</Span>
                      <Span className="text-base font-semibold text-[#006fbd]">{formatCurrency(analyticsData.totalCommission)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-3 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Restaurant Share</Span>
                      <Span className="text-base font-semibold text-green-600">{formatCurrency(analyticsData.restaurantEarning)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-3 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Restaurant Profit</Span>
                      <Span className="text-base font-semibold text-emerald-700">{formatCurrency(analyticsData.restaurantProfit)}</Span>
                    </Div>
                  </Div>
                  <Div className="space-y-4">
                    <Div className="flex justify-between items-center py-3 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Average Order Value</Span>
                      <Span className="text-base font-semibold text-[#334257]">{formatCurrency(analyticsData.averageOrderValue)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-3 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Completion Rate</Span>
                      <Span className="text-base font-semibold text-green-600">{analyticsData.completionRate.toFixed(1)}%</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-3 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Commission Percentage</Span>
                      <Span className="text-base font-semibold text-[#334257]">
                        {analyticsData.commissionPercentage !== undefined && analyticsData.commissionPercentage !== null
                          ? `${analyticsData.commissionPercentage}%`
                          : '0%'}
                      </Span>
                    </Div>
                  </Div>
                </Div>
              </Div>

              {/* Restaurant Payments (delivered orders) */}
              <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                <H3 className="text-lg font-semibold text-[#334257] mb-4">Restaurant Payments (Completed Orders)</H3>
                <P className="text-xs text-[#8a94aa] mb-4">
                  Breakdown from delivered orders (same basis as Transaction Report). “Subtotal” reflects total dish value (food price).
                </P>
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Div className="space-y-3">
                    <Div className="flex justify-between items-center py-2 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Subtotal (Dish Price)</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatCurrency(paymentSummary?.subtotal || 0)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-2 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Tax</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatCurrency(paymentSummary?.tax || 0)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-2 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Delivery Fee</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatCurrency(paymentSummary?.deliveryFee || 0)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-2 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Platform Fee</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatCurrency(paymentSummary?.platformFee || 0)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-2 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Discount</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatCurrency(paymentSummary?.discount || 0)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-2">
                      <Span className="text-sm font-semibold text-[#334257]">Total Order Value</Span>
                      <Span className="text-sm font-bold text-[#006fbd]">{formatCurrency(paymentSummary?.total || 0)}</Span>
                    </Div>
                  </Div>

                  <Div className="space-y-3">
                    <Div className="flex justify-between items-center py-2 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Restaurant Share</Span>
                      <Span className="text-sm font-semibold text-green-700">{formatCurrency(paymentSummary?.restaurantShare || 0)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-2 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Restaurant Commission (Admin)</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatCurrency(paymentSummary?.restaurantCommission || 0)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-2 border-b border-[#e3e6ef]">
                      <Span className="text-sm text-[#8a94aa]">Rider Share</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatCurrency(paymentSummary?.riderShare || 0)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center py-2">
                      <Span className="text-sm text-[#8a94aa]">Platform Net Profit</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatCurrency(paymentSummary?.platformNetProfit || 0)}</Span>
                    </Div>
                  </Div>
                </Div>
              </Div>

              {/* Additional Details */}
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Statistics */}
                <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                  <Div className="flex items-center gap-3 mb-4">
                    <Div className="p-2 bg-indigo-100 rounded-lg">
                      <UiIcon as={Users} className="w-5 h-5 text-indigo-600" />
                    </Div>
                    <H3 className="text-base font-semibold text-[#334257]">Customer Statistics</H3>
                  </Div>
                  <Div className="space-y-3">
                    <Div className="flex justify-between items-center">
                      <Span className="text-sm text-[#8a94aa]">Total Customers</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatNumber(analyticsData.totalCustomers)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center">
                      <Span className="text-sm text-[#8a94aa]">Repeat Customers</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatNumber(analyticsData.repeatCustomers)}</Span>
                    </Div>
                    <Div className="flex justify-between items-center">
                      <Span className="text-sm text-[#8a94aa]">Customer Retention</Span>
                      <Span className="text-sm font-semibold text-green-600">
                        {analyticsData.totalCustomers > 0 ? ((analyticsData.repeatCustomers / analyticsData.totalCustomers) * 100).toFixed(1) : '0'}%
                      </Span>
                    </Div>
                  </Div>
                </Div>

                {/* Restaurant Details */}
                <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                  <Div className="flex items-center gap-3 mb-4">
                    <Div className="p-2 bg-orange-100 rounded-lg">
                      <UiIcon as={Package} className="w-5 h-5 text-orange-600" />
                    </Div>
                    <H3 className="text-base font-semibold text-[#334257]">Restaurant Details</H3>
                  </Div>
                  <Div className="space-y-3">
                    <Div className="flex justify-between items-center">
                      <Span className="text-sm text-[#8a94aa]">Join Date</Span>
                      <Span className="text-sm font-semibold text-[#334257]">
                        {new Date(analyticsData.joinDate).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Span>
                    </Div>
                    <Div className="flex justify-between items-center">
                      <Span className="text-sm text-[#8a94aa]">Status</Span>
                      <Span
                        className={`text-sm font-semibold px-2 py-1 rounded ${analyticsData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {analyticsData.status === 'active' ? 'Active' : 'Inactive'}
                      </Span>
                    </Div>
                    <Div className="flex justify-between items-center">
                      <Span className="text-sm text-[#8a94aa]">Total Reviews</Span>
                      <Span className="text-sm font-semibold text-[#334257]">{formatNumber(analyticsData.totalRatings)}</Span>
                    </Div>
                  </Div>
                </Div>
              </Div>

              {/* Order Statistics Summary */}
              <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-6">
                <H3 className="text-lg font-semibold text-[#334257] mb-4">Order Statistics Summary</H3>
                <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Div className="text-center p-4 bg-blue-50 rounded-lg">
                    <P className="text-2xl font-bold text-blue-600">{formatNumber(analyticsData.totalOrders)}</P>
                    <P className="text-xs text-[#8a94aa] mt-1">Total Orders</P>
                  </Div>
                  <Div className="text-center p-4 bg-green-50 rounded-lg">
                    <P className="text-2xl font-bold text-green-600">{formatNumber(analyticsData.completedOrders)}</P>
                    <P className="text-xs text-[#8a94aa] mt-1">Completed</P>
                  </Div>
                  <Div className="text-center p-4 bg-red-50 rounded-lg">
                    <P className="text-2xl font-bold text-red-600">{formatNumber(analyticsData.cancelledOrders)}</P>
                    <P className="text-xs text-[#8a94aa] mt-1">Cancelled</P>
                  </Div>
                  <Div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <P className="text-2xl font-bold text-yellow-600">{analyticsData.completionRate.toFixed(1)}%</P>
                    <P className="text-xs text-[#8a94aa] mt-1">Success Rate</P>
                  </Div>
                </Div>
              </Div>
            </Div>
          )
        ) : listLoading ? (
          <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-12 text-center">
            <ActivityIndicator size="large" color="#006fbd" style={{ marginBottom: 16 }} />
            <P className="text-sm text-[#8a94aa]">Loading restaurants...</P>
          </Div>
        ) : (
          <Div className="bg-white rounded-lg shadow-sm border border-[#e3e6ef] p-12 text-center">
            <Div className="w-16 h-16 rounded-full border-2 border-dashed border-[#d1d7e6] flex items-center justify-center mx-auto mb-4">
              <UiIcon as={Search} className="w-8 h-8 text-[#8a94aa]" />
            </Div>
            <P className="text-base font-medium text-[#334257] mb-2">Select a Restaurant</P>
            <P className="text-sm text-[#8a94aa] max-w-md mx-auto">
              Please select a restaurant from the dropdown above to view detailed analytics, profit information, and commission details.
            </P>
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
}
