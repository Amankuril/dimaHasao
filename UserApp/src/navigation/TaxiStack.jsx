import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import TaxiHomeScreen from '../screens/taxi/TaxiHomeScreen';
import SelectLocationScreen from '../screens/taxi/SelectLocationScreen';
import SelectVehicleScreen from '../screens/taxi/SelectVehicleScreen';
import SearchingDriverScreen from '../screens/taxi/SearchingDriverScreen';
import RideTrackingScreen from '../screens/taxi/RideTrackingScreen';
import RideCompleteScreen from '../screens/taxi/RideCompleteScreen';
import RideChatScreen from '../screens/taxi/RideChatScreen';
import RideDetailScreen from '../screens/taxi/RideDetailScreen';
import RideSupportScreen from '../screens/taxi/RideSupportScreen';
import IntercityHomeScreen from '../screens/taxi/IntercityHomeScreen';
import IntercityVehicleScreen from '../screens/taxi/IntercityVehicleScreen';
import IntercityDetailsScreen from '../screens/taxi/IntercityDetailsScreen';
import IntercityConfirmScreen from '../screens/taxi/IntercityConfirmScreen';
import ActivityScreen from '../screens/taxi/ActivityScreen';
import TaxiProfileScreen from '../screens/taxi/TaxiProfileScreen';
import WalletScreen from '../screens/taxi/WalletScreen';
import TaxiNotificationsScreen from '../screens/taxi/TaxiNotificationsScreen';
import PromoCodesScreen from '../screens/taxi/PromoCodesScreen';
import ReferralScreen from '../screens/taxi/ReferralScreen';
import ProfileSettingsScreen from '../screens/taxi/ProfileSettingsScreen';
import PaymentSettingsScreen from '../screens/taxi/PaymentSettingsScreen';
import AddressSettingsScreen from '../screens/taxi/AddressSettingsScreen';
import TaxiDeleteAccountScreen from '../screens/taxi/TaxiDeleteAccountScreen';
import SOSContactsScreen from '../screens/taxi/SOSContactsScreen';
import SupportTicketsScreen from '../screens/taxi/SupportTicketsScreen';
import SupportTicketDetailScreen from '../screens/taxi/SupportTicketDetailScreen';

const Stack = createNativeStackNavigator();

/**
 * Mirrors the user-facing routes under /taxi/user/* in
 * Frontend/src/modules/Taxi/TaxiApp.jsx (driver/admin routes are out of
 * scope — separate future APKs).
 */
export default function TaxiStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="TaxiHome" component={TaxiHomeScreen} />
      <Stack.Screen name="SelectLocation" component={SelectLocationScreen} />
      <Stack.Screen name="SelectVehicle" component={SelectVehicleScreen} />
      <Stack.Screen name="SearchingDriver" component={SearchingDriverScreen} />
      <Stack.Screen name="RideTracking" component={RideTrackingScreen} />
      <Stack.Screen name="RideComplete" component={RideCompleteScreen} />
      <Stack.Screen name="RideChat" component={RideChatScreen} />
      <Stack.Screen name="RideDetail" component={RideDetailScreen} />
      <Stack.Screen name="RideSupport" component={RideSupportScreen} />
      <Stack.Screen name="IntercityHome" component={IntercityHomeScreen} />
      <Stack.Screen name="IntercityVehicle" component={IntercityVehicleScreen} />
      <Stack.Screen name="IntercityDetails" component={IntercityDetailsScreen} />
      <Stack.Screen name="IntercityConfirm" component={IntercityConfirmScreen} />
      <Stack.Screen name="Activity" component={ActivityScreen} />
      <Stack.Screen name="TaxiProfile" component={TaxiProfileScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="TaxiNotifications" component={TaxiNotificationsScreen} />
      <Stack.Screen name="PromoCodes" component={PromoCodesScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen name="PaymentSettings" component={PaymentSettingsScreen} />
      <Stack.Screen name="AddressSettings" component={AddressSettingsScreen} />
      <Stack.Screen name="TaxiDeleteAccount" component={TaxiDeleteAccountScreen} />
      <Stack.Screen name="SOSContacts" component={SOSContactsScreen} />
      <Stack.Screen name="SupportTickets" component={SupportTicketsScreen} />
      <Stack.Screen name="SupportTicketDetail" component={SupportTicketDetailScreen} />
    </Stack.Navigator>
  );
}
