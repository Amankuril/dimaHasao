import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Home, Compass, Receipt, User} from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import PlacesListScreen from '../screens/PlacesListScreen';
import BookingsScreen from '../screens/BookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home,
  Explore: Compass,
  Bookings: Receipt,
  Profile: User,
};

/**
 * Mirrors the web's BottomNav, shown only on the "top level" screens.
 * Detail/booking/checkout screens are pushed on the parent stack instead of
 * living inside this tab navigator, so they hide the tab bar for free —
 * the same effect the web gets from its `isDetailPageOrSubflow` regex.
 */
export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: '#c99500',
        tabBarInactiveTintColor: '#7b5b4a',
        tabBarIcon: ({color, size}) => {
          const Icon = ICONS[route.name];
          return Icon ? <Icon color={color} size={size} /> : null;
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={PlacesListScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
