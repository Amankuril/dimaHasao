import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useBooking} from '../context/BookingContext';
import MainTabs from './MainTabs';
import LoginScreen from '../screens/LoginScreen';
import PlaceDetailScreen from '../screens/PlaceDetailScreen';
import HotelListScreen from '../screens/HotelListScreen';
import HotelDetailScreen from '../screens/HotelDetailScreen';
import HotelBookingScreen from '../screens/HotelBookingScreen';
import PackageListScreen from '../screens/PackageListScreen';
import PackageDetailScreen from '../screens/PackageDetailScreen';
import PackageBookingScreen from '../screens/PackageBookingScreen';
import FestivalListScreen from '../screens/FestivalListScreen';
import FestivalDetailScreen from '../screens/FestivalDetailScreen';
import SupportScreen from '../screens/SupportScreen';
import ReviewScreen from '../screens/ReviewScreen';
import MoreScreen from '../screens/MoreScreen';
import TaxiStack from './TaxiStack';
import FoodStack from './FoodStack';

const Stack = createNativeStackNavigator();

/**
 * Route tree mirrors Frontend's modules/DimaHasao/routes/userRoutes.jsx,
 * flattened for RN: every "detail/subflow" path the web hides the bottom
 * nav for (places/:id, hotels/:id, hotels/:id/book, packages/:id, ...) is a
 * stack screen pushed over MainTabs here instead of a route inside it.
 *
 * Taxi and Food are their own modules on the web (redirected to from here,
 * not rendered here) — same split on RN: "Taxi" and "FoodHome" each render
 * their own nested stack (TaxiStack, FoodStack).
 */
export default function RootNavigator() {
  const {user, isHydrated} = useBooking();

  if (!isHydrated) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!user.isLoggedIn ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} />
            <Stack.Screen name="HotelList" component={HotelListScreen} />
            <Stack.Screen name="HotelDetail" component={HotelDetailScreen} />
            <Stack.Screen name="HotelBooking" component={HotelBookingScreen} />
            <Stack.Screen name="PackageList" component={PackageListScreen} />
            <Stack.Screen name="PackageDetail" component={PackageDetailScreen} />
            <Stack.Screen name="PackageBooking" component={PackageBookingScreen} />
            <Stack.Screen name="FestivalList" component={FestivalListScreen} />
            <Stack.Screen name="FestivalDetail" component={FestivalDetailScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="Review" component={ReviewScreen} />
            <Stack.Screen name="More" component={MoreScreen} />
            <Stack.Screen name="Taxi" component={TaxiStack} />
            <Stack.Screen name="FoodHome" component={FoodStack} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
