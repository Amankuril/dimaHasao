import { BackHandler } from 'react-native';
import { Tabs, router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { confirm } from '../../../../../lib/notify';
import { DeliveryHomeProvider } from '../../../../../delivery/DeliveryHomeContext';
import { DeliveryTabBar } from '../../../../../components/delivery/DeliveryBottomNav';
import HomePopups from '../../../../../components/delivery/home/HomePopups';

/*
 * Feed, Orders, Pocket, Trip History and Profile: the five pages that show
 * the web's DeliveryBottomNav. Switching is instant, as on the web, and the
 * DeliveryHomeV2 state lives in DeliveryHomeProvider.
 */
// The wrapper asked "Exit App?" when Back had nowhere left to go.
export default function DeliveryTabs() {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (router.canGoBack()) return false;
        confirm('Exit App?', 'Are you sure you want to exit?', { confirmText: 'Exit' }).then((yes) => yes && BackHandler.exitApp());
        return true;
      });
      return () => sub.remove();
    }, []),
  );

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
