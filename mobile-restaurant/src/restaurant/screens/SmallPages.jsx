import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Info, Leaf, Star } from 'lucide-react-native';
import CMSPage from '../../components/CMSPage';
import { Card, EmptyState, ListRow, SectionHeader } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import { useDishRatings } from '../hooks/pages/useDishRatings';
import { useManageOutlets } from '../hooks/pages/useManageOutlets';
import useRestaurantBackNavigation from '../hooks/useRestaurantBackNavigation';
import { ScreenHeader } from './inventory/partnerKit';

/* The restaurant's one-screen pages. */

/** Port of Food/pages/restaurant/DishRatings.jsx (/food/restaurant/dish-ratings). */
export function DishRatings() {
  const { goBack } = useDishRatings();
  return (
    <View style={styles.page}>
      <ScreenHeader title="Dish ratings" subtitle="Ratings appear when customers review dishes" onBack={goBack} />
      <View style={styles.center}>
        <EmptyState icon={Star} title="No dish ratings yet" message="You haven't received any dish rating yet." />
      </View>
    </View>
  );
}

/** Port of Food/pages/restaurant/Hyperpure.jsx (/food/restaurant/hyperpure): a placeholder on the web as well. */
export function Hyperpure() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <ScreenHeader title="Hyperpure" />
      <View style={[styles.center, { paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom }]}>
        <EmptyState icon={Leaf} title="Hyperpure" message="This page is under development." />
      </View>
      <BottomNavOrders />
    </View>
  );
}

/** Port of Food/pages/restaurant/ManageOutlets.jsx (/food/restaurant/manage-outlets). */
export function ManageOutlets() {
  const insets = useSafeAreaInsets();
  const { goBack, showToast, options, handleOptionClick } = useManageOutlets();
  return (
    <View style={styles.page}>
      <ScreenHeader title="Restaurant" onBack={goBack} />
      <View style={{ padding: space.lg }}>
        <SectionHeader title="Select an option" />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {options.map((option, idx) => (
            <ListRow key={option} title={option} onPress={() => handleOptionClick(option)} divider={idx < options.length - 1} />
          ))}
        </Card>
      </View>

      {showToast ? (
        <View style={[styles.toast, { bottom: space.xxl + insets.bottom }]} pointerEvents="none" accessibilityRole="alert">
          <Info size={20} color={color.info} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: space.xs }}>
            <Text style={[type.bodyStrong, { color: color.text }]}>You can not modify the delivery areas of your restaurant</Text>
            <Text style={[type.small, { color: color.textSecondary }]}>
              Delivery area is defined by the appropriate distance our delivery partners can travel to deliver your orders in time. This can vary basis the time of the day or external conditions like rain etc.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/* PrivacyPolicyPage / TermsAndConditionsPage / CMSHelpSupportPage: the shared CMS page with the restaurant's content. */
const cmsPage = (title, endpoint) =>
  function RestaurantCmsPage() {
    const goBack = useRestaurantBackNavigation();
    return <CMSPage endpoint={endpoint} title={title} goBack={goBack} />;
  };
export const PrivacyPolicyPage = cmsPage('Privacy Policy', '/food/pages/privacy');
export const TermsAndConditionsPage = cmsPage('Terms of Service', '/food/pages/terms');
export const HelpContentPage = cmsPage('Help & Support', '/food/pages/support_restaurant');

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  toast: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'flex-start', gap: space.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, padding: space.lg, borderRadius: radii.lg, ...elevation.float },
});
