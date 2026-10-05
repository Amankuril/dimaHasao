import { Tabs } from 'expo-router';
import { FoodBottomNavigation } from '../../../../food/components/shell';

/*
 * The four main food tabs. Like the web's MainTabKeepAlive, a tab stays
 * mounted once visited, so switching back keeps its scroll and data.
 */
export default function FoodTabsLayout() {
  return (
    <Tabs tabBar={(props) => <FoodBottomNavigation {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#fff' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="takeaway" />
      <Tabs.Screen name="under-250" />
      <Tabs.Screen name="dining" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
