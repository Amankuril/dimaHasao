import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Info, Leaf } from 'lucide-react-native';
import CMSPage from '../../components/CMSPage';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import BottomNavOrders from '../components/BottomNavOrders';
import { PageHeader } from '../components/ui';
import { useDishRatings } from '../hooks/pages/useDishRatings';
import { useManageOutlets } from '../hooks/pages/useManageOutlets';
import useRestaurantBackNavigation from '../hooks/useRestaurantBackNavigation';
import { RT } from '../theme';

/* The restaurant's one-screen pages. */

/** Port of Food/pages/restaurant/DishRatings.jsx (/food/restaurant/dish-ratings). */
export function DishRatings() {
  const { goBack } = useDishRatings();
  return (
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <PageHeader title="Dish Ratings" onBack={goBack} border={false} />
      <Text style={styles.headerNote}>Ratings will appear here when customers review dishes.</Text>
      <View style={styles.center}>
        <Text style={styles.centerText}>You haven&apos;t received any dish rating yet</Text>
      </View>
    </View>
  );
}

/** Port of Food/pages/restaurant/Hyperpure.jsx (/food/restaurant/hyperpure): a placeholder on the web as well. */
export function Hyperpure() {
  return (
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <View style={styles.center}>
        <Leaf size={64} color={tw.gray400} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 20, lineHeight: 28, color: tw.gray900, marginBottom: 8, ...poppins(700) }}>Hyperpure</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray600, ...poppins(400) }}>This page is under development</Text>
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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* px-4 pt-4 pb-3, round p-2 back button with a 20px arrow, text-lg bold title */}
      <View style={[styles.manageHeader, { paddingTop: 16 + insets.top }]}>
        <Press onPress={goBack} accessibilityLabel="Back" hitSlop={6} style={{ padding: 8, borderRadius: 999 }}>
          <ArrowLeft size={20} color={tw.gray900} />
        </Press>
        <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) }} accessibilityRole="header">Restaurant</Text>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={styles.options}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: tw.gray50 }}>
            <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) }}>Select an option</Text>
          </View>
          {options.map((option, idx) => (
            <Press key={option} scale={1} onPress={() => handleOptionClick(option)} style={[styles.option, idx > 0 ? { borderTopWidth: 1, borderTopColor: tw.gray200 } : null]}>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) }}>{option}</Text>
              <ChevronRight size={16} color={tw.gray500} />
            </Press>
          ))}
        </View>
      </View>

      {showToast ? (
        <View style={[styles.toast, { bottom: 24 + insets.bottom }]} pointerEvents="none" accessibilityRole="alert">
          <Info size={20} color={RT.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) }}>You can not modify the delivery areas of your restaurant</Text>
            <Text style={{ fontSize: 12, lineHeight: 20, color: tw.gray600, ...poppins(400) }}>
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
  manageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200, backgroundColor: '#fff' },
  headerNote: { backgroundColor: '#fff', paddingLeft: 58, paddingRight: 16, paddingBottom: 12, marginTop: -12, fontSize: 12, lineHeight: 16, color: tw.gray500, borderBottomWidth: 1, borderBottomColor: tw.gray200, ...poppins(400) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  centerText: { fontSize: 14, lineHeight: 20, color: tw.gray600, textAlign: 'center', ...poppins(400) },
  options: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  toast: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, padding: 16, borderRadius: 8, ...shadow('2xl') },
});
