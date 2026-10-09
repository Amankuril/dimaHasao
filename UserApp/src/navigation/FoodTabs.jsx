import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Tag, Truck, User, UtensilsCrossed, ShoppingBag} from 'lucide-react-native';
import FoodHomeDeliveryScreen from '../screens/food/FoodHomeDeliveryScreen';
import FoodHomeTakeawayScreen from '../screens/food/FoodHomeTakeawayScreen';
import FoodDiningScreen from '../screens/food/FoodDiningScreen';
import FoodUnder250Screen from '../screens/food/FoodUnder250Screen';
import FoodProfileScreen from '../screens/food/FoodProfileScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Delivery: Truck,
  Takeaway: ShoppingBag,
  Under250: Tag,
  Dining: UtensilsCrossed,
  Profile: User,
};

/**
 * Mirrors the web's Food-specific tab set (Frontend's MAIN_TAB_IDS:
 * delivery/takeaway/dining/under250/profile, from utils/mainTabRoutes.js).
 *
 * On web these render through two stacked bars: the platform-wide
 * AppBottomNav (Home/Bookings/Explore/Profile/More, shared across every
 * module) plus Food's own floating secondary bar for its 4 modes — Profile
 * itself is reached through the platform bar, not Food's own. This app
 * doesn't have that platform shell yet (task #12), so — same call already
 * made for TaxiStack's own Profile entry point — all 5 of Food's real tab
 * destinations live in one native bottom-tab bar here, Profile included,
 * rather than leaving it unreachable.
 */
export default function FoodTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: '#0a4d2b',
        tabBarInactiveTintColor: '#64748b',
        tabBarIcon: ({color, size}) => {
          const Icon = ICONS[route.name];
          return Icon ? <Icon color={color} size={size} /> : null;
        },
      })}>
      <Tab.Screen name="Delivery" component={FoodHomeDeliveryScreen} />
      <Tab.Screen name="Takeaway" component={FoodHomeTakeawayScreen} />
      <Tab.Screen name="Under250" component={FoodUnder250Screen} options={{title: 'Under ₹250'}} />
      <Tab.Screen name="Dining" component={FoodDiningScreen} />
      <Tab.Screen name="Profile" component={FoodProfileScreen} />
    </Tab.Navigator>
  );
}
