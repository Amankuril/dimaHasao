import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import FoodTabs from './FoodTabs';
import FoodDiningCategoryScreen from '../screens/food/FoodDiningCategoryScreen';
import FoodDiningExplore50Screen from '../screens/food/FoodDiningExplore50Screen';
import FoodDiningExploreNearScreen from '../screens/food/FoodDiningExploreNearScreen';
import FoodCoffeeScreen from '../screens/food/FoodCoffeeScreen';
import FoodCategoriesScreen from '../screens/food/FoodCategoriesScreen';
import FoodCategoryPageScreen from '../screens/food/FoodCategoryPageScreen';
import FoodRestaurantsScreen from '../screens/food/FoodRestaurantsScreen';
import FoodRestaurantDetailsScreen from '../screens/food/FoodRestaurantDetailsScreen';
import FoodDiningRestaurantDetailsScreen from '../screens/food/FoodDiningRestaurantDetailsScreen';
import FoodTableBookingScreen from '../screens/food/FoodTableBookingScreen';
import FoodTableBookingConfirmationScreen from '../screens/food/FoodTableBookingConfirmationScreen';
import FoodTableBookingSuccessScreen from '../screens/food/FoodTableBookingSuccessScreen';
import FoodTableModificationPolicyScreen from '../screens/food/FoodTableModificationPolicyScreen';
import FoodTableCancellationPolicyScreen from '../screens/food/FoodTableCancellationPolicyScreen';
import FoodTableEditUserScreen from '../screens/food/FoodTableEditUserScreen';
import FoodMyBookingsScreen from '../screens/food/FoodMyBookingsScreen';
import FoodProductDetailScreen from '../screens/food/FoodProductDetailScreen';
import FoodCartScreen from '../screens/food/FoodCartScreen';
import FoodCheckoutScreen from '../screens/food/FoodCheckoutScreen';
import FoodSelectAddressScreen from '../screens/food/FoodSelectAddressScreen';
import FoodAddressSelectorScreen from '../screens/food/FoodAddressSelectorScreen';
import FoodOrdersScreen from '../screens/food/FoodOrdersScreen';
import FoodOrderTrackingScreen from '../screens/food/FoodOrderTrackingScreen';
import FoodOrderInvoiceScreen from '../screens/food/FoodOrderInvoiceScreen';
import FoodUserOrderDetailsScreen from '../screens/food/FoodUserOrderDetailsScreen';
import FoodOffersScreen from '../screens/food/FoodOffersScreen';
import FoodGourmetScreen from '../screens/food/FoodGourmetScreen';
import FoodCollectionsScreen from '../screens/food/FoodCollectionsScreen';
import FoodCollectionDetailScreen from '../screens/food/FoodCollectionDetailScreen';
import FoodSearchScreen from '../screens/food/FoodSearchScreen';
import FoodEditProfileScreen from '../screens/food/FoodEditProfileScreen';
import FoodPaymentsScreen from '../screens/food/FoodPaymentsScreen';
import FoodAddPaymentScreen from '../screens/food/FoodAddPaymentScreen';
import FoodEditPaymentScreen from '../screens/food/FoodEditPaymentScreen';
import FoodFavoritesScreen from '../screens/food/FoodFavoritesScreen';
import FoodCouponsScreen from '../screens/food/FoodCouponsScreen';
import FoodAboutScreen from '../screens/food/FoodAboutScreen';
import FoodTermsScreen from '../screens/food/FoodTermsScreen';
import FoodPrivacyScreen from '../screens/food/FoodPrivacyScreen';
import FoodRefundScreen from '../screens/food/FoodRefundScreen';
import FoodShippingScreen from '../screens/food/FoodShippingScreen';
import FoodCancellationScreen from '../screens/food/FoodCancellationScreen';
import FoodReportSafetyEmergencyScreen from '../screens/food/FoodReportSafetyEmergencyScreen';
import FoodAccessibilityScreen from '../screens/food/FoodAccessibilityScreen';
import FoodReferEarnScreen from '../screens/food/FoodReferEarnScreen';
import FoodSettingsScreen from '../screens/food/FoodSettingsScreen';
import FoodSupportScreen from '../screens/food/FoodSupportScreen';
import FoodUserCMSHelpSupportScreen from '../screens/food/FoodUserCMSHelpSupportScreen';
import FoodHelpScreen from '../screens/food/FoodHelpScreen';
import FoodOrderHelpScreen from '../screens/food/FoodOrderHelpScreen';
import FoodNotificationsScreen from '../screens/food/FoodNotificationsScreen';
import FoodWalletScreen from '../screens/food/FoodWalletScreen';
import FoodSubmitComplaintScreen from '../screens/food/FoodSubmitComplaintScreen';

const Stack = createNativeStackNavigator();

/**
 * Mirrors the routes in Frontend/src/modules/Food/components/user/UserRouter.jsx
 * (user-facing only — admin/restaurant/delivery-partner routes are out of
 * scope, same split as TaxiStack.jsx). FoodTabs is the home surface (the
 * web's 5 keep-alive main tabs); everything else is pushed on top of it,
 * same as the web's "detail/subflow" routes that hide the bottom nav.
 */
export default function FoodStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="FoodTabs" component={FoodTabs} />

      <Stack.Screen name="FoodDiningCategory" component={FoodDiningCategoryScreen} />
      <Stack.Screen name="FoodDiningExplore50" component={FoodDiningExplore50Screen} />
      <Stack.Screen name="FoodDiningExploreNear" component={FoodDiningExploreNearScreen} />
      <Stack.Screen name="FoodCoffee" component={FoodCoffeeScreen} />
      <Stack.Screen name="FoodCategories" component={FoodCategoriesScreen} />
      <Stack.Screen name="FoodCategoryPage" component={FoodCategoryPageScreen} />
      <Stack.Screen name="FoodRestaurants" component={FoodRestaurantsScreen} />
      <Stack.Screen name="FoodRestaurantDetails" component={FoodRestaurantDetailsScreen} />
      <Stack.Screen name="FoodDiningRestaurantDetails" component={FoodDiningRestaurantDetailsScreen} />
      <Stack.Screen name="FoodSearch" component={FoodSearchScreen} />
      <Stack.Screen name="FoodProductDetail" component={FoodProductDetailScreen} />
      <Stack.Screen name="FoodAddressSelector" component={FoodAddressSelectorScreen} />

      <Stack.Screen name="FoodTableBooking" component={FoodTableBookingScreen} />
      <Stack.Screen name="FoodTableBookingConfirmation" component={FoodTableBookingConfirmationScreen} />
      <Stack.Screen name="FoodTableBookingSuccess" component={FoodTableBookingSuccessScreen} />
      <Stack.Screen name="FoodTableModificationPolicy" component={FoodTableModificationPolicyScreen} />
      <Stack.Screen name="FoodTableCancellationPolicy" component={FoodTableCancellationPolicyScreen} />
      <Stack.Screen name="FoodTableEditUser" component={FoodTableEditUserScreen} />
      <Stack.Screen name="FoodMyBookings" component={FoodMyBookingsScreen} />

      <Stack.Screen name="FoodCart" component={FoodCartScreen} />
      <Stack.Screen name="FoodCheckout" component={FoodCheckoutScreen} />
      <Stack.Screen name="FoodSelectAddress" component={FoodSelectAddressScreen} />

      <Stack.Screen name="FoodOrders" component={FoodOrdersScreen} />
      <Stack.Screen name="FoodOrderTracking" component={FoodOrderTrackingScreen} />
      <Stack.Screen name="FoodOrderInvoice" component={FoodOrderInvoiceScreen} />
      <Stack.Screen name="FoodUserOrderDetails" component={FoodUserOrderDetailsScreen} />

      <Stack.Screen name="FoodOffers" component={FoodOffersScreen} />
      <Stack.Screen name="FoodGourmet" component={FoodGourmetScreen} />
      <Stack.Screen name="FoodCollections" component={FoodCollectionsScreen} />
      <Stack.Screen name="FoodCollectionDetail" component={FoodCollectionDetailScreen} />

      <Stack.Screen name="FoodEditProfile" component={FoodEditProfileScreen} />
      <Stack.Screen name="FoodPayments" component={FoodPaymentsScreen} />
      <Stack.Screen name="FoodAddPayment" component={FoodAddPaymentScreen} />
      <Stack.Screen name="FoodEditPayment" component={FoodEditPaymentScreen} />
      <Stack.Screen name="FoodFavorites" component={FoodFavoritesScreen} />
      <Stack.Screen name="FoodCoupons" component={FoodCouponsScreen} />
      <Stack.Screen name="FoodAbout" component={FoodAboutScreen} />
      <Stack.Screen name="FoodTerms" component={FoodTermsScreen} />
      <Stack.Screen name="FoodPrivacy" component={FoodPrivacyScreen} />
      <Stack.Screen name="FoodRefund" component={FoodRefundScreen} />
      <Stack.Screen name="FoodShipping" component={FoodShippingScreen} />
      <Stack.Screen name="FoodCancellation" component={FoodCancellationScreen} />
      <Stack.Screen name="FoodReportSafetyEmergency" component={FoodReportSafetyEmergencyScreen} />
      <Stack.Screen name="FoodAccessibility" component={FoodAccessibilityScreen} />
      <Stack.Screen name="FoodReferEarn" component={FoodReferEarnScreen} />
      <Stack.Screen name="FoodSettings" component={FoodSettingsScreen} />

      <Stack.Screen name="FoodSupport" component={FoodSupportScreen} />
      <Stack.Screen name="FoodUserCMSHelpSupport" component={FoodUserCMSHelpSupportScreen} />
      <Stack.Screen name="FoodHelp" component={FoodHelpScreen} />
      <Stack.Screen name="FoodOrderHelp" component={FoodOrderHelpScreen} />

      <Stack.Screen name="FoodNotifications" component={FoodNotificationsScreen} />
      <Stack.Screen name="FoodWallet" component={FoodWalletScreen} />
      <Stack.Screen name="FoodSubmitComplaint" component={FoodSubmitComplaintScreen} />
    </Stack.Navigator>
  );
}
