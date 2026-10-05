import { Tabs } from 'expo-router';
import { DeliveryHomeProvider } from '../../../../../delivery/DeliveryHomeContext';
import { DeliveryTabBar } from '../../../../../components/delivery/DeliveryBottomNav';
import HomePopups from '../../../../../components/delivery/home/HomePopups';

/*
 * Feed, Orders, Pocket, Trip History and Profile: the five pages that show
 * the web's DeliveryBottomNav. Switching is instant, as on the web, and the
 * DeliveryHomeV2 state lives in DeliveryHomeProvider.
 */
export default function DeliveryTabs() {
  return (
    <DeliveryHomeProvider>
      <Tabs
        tabBar={(props) => <DeliveryTabBar {...props} />}
        backBehavior="history"
        screenOptions={{ headerShown: false, animation: 'none', sceneStyle: { backgroundColor: '#fff' } }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="orders" />
        <Tabs.Screen name="pocket" />
        <Tabs.Screen name="history" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <HomePopups />
    </DeliveryHomeProvider>
  );
}
