import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ChevronRight, Settings } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { InfoDialog, OutlineButton, PageHeader, PrimaryButton, Toggle } from '../components/ui';
import { useRestaurantStatus } from '../hooks/pages/useRestaurantStatus';
import { RT, RT_GRADIENT } from '../theme';

/** Port of Food/pages/restaurant/RestaurantStatus.jsx (/food/restaurant/status). */
export default function RestaurantStatus() {
  const h = useRestaurantStatus();
  const {
    navigate, location, goBack, deliveryStatus, takeawayStatus, restaurantData, loading, currentDateTime, isWithinTimings, showOutletClosedDialog, setShowOutletClosedDialog,
    showOutsideTimingsDialog, setShowOutsideTimingsDialog, isDayClosed, handleDeliveryStatusChange, handleTakeawayStatusChange, handleGoToOutletTimings, getCurrentDayTimings, formatAddress,
  } = h;
  const from = { state: { from: location.pathname } };
  const address = restaurantData?.location ? formatAddress(restaurantData.location) : '';
  const idText = restaurantData?.id ? `ID: ${String(restaurantData.id).slice(-5)}` : '';
  const timings = getCurrentDayTimings();
  const slot = isDayClosed
    ? 'Today is Off'
    : timings
      ? `${currentDateTime.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, ${timings.openingTime} - ${timings.closingTime}`
      : 'Not configured';
  const warning = !isWithinTimings && restaurantData && !isDayClosed;
  // The web's dialog icon is a broken character ("??") on an orange disc; a warning mark stands in.
  const dialogIcon = <AlertTriangle size={28} color={RT.primary} />;

  const statusRow = (title, on, onText, offText, onChange) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: on ? tw.green500 : tw.gray600 }} />
          <Text style={styles.muted}>{on ? onText : offText}</Text>
        </View>
      </View>
      <Toggle value={on} onValueChange={onChange} accessibilityLabel={title} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <PageHeader title="Restaurant status" subtitle="You are mapped to 1 restaurant" onBack={goBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}>
        <View style={[styles.card, warning ? null : { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { marginBottom: 4 }]}>{loading ? 'Loading...' : restaurantData?.name || 'Restaurant'}</Text>
              <Text style={styles.muted}>{loading ? 'Loading...' : `${idText}${address ? ` | ${address}` : ''}`}</Text>
            </View>
            <Press onPress={() => navigate('/food/restaurant/explore', from)} accessibilityLabel="Explore more" style={styles.gear}>
              <Settings size={20} color={tw.gray600} />
            </Press>
          </View>

          {statusRow('Delivery status', deliveryStatus, 'Receiving orders', 'Not receiving orders', handleDeliveryStatusChange)}
          {statusRow('Takeaway status', takeawayStatus, 'Pickup orders are enabled', 'Pickup orders are disabled', handleTakeawayStatusChange)}

          <View>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, marginBottom: 8, ...poppins(400) }}>Current delivery slot</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={[styles.rowTitle, { flex: 1, marginBottom: 0 }]}>{loading ? 'Loading...' : slot}</Text>
              {!isDayClosed ? (
                <Press onPress={() => navigate('/food/restaurant/outlet-timings', from)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.details}>Details</Text>
                  <ChevronRight size={16} color={RT.primary} />
                </Press>
              ) : null}
            </View>
          </View>
        </View>

        {warning ? (
          <View style={styles.warning}>
            <View style={styles.bang}>
              <Text style={{ fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) }}>!</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) }}>You are currently outside your scheduled delivery timings.</Text>
          </View>
        ) : null}
      </ScrollView>

      <InfoDialog visible={showOutletClosedDialog} onClose={() => setShowOutletClosedDialog(false)} icon={dialogIcon} title="Outlet Timings Closed">
        <OutlineButton title="Cancel" onPress={() => setShowOutletClosedDialog(false)} />
        <PrimaryButton title="Go to Outlet Timings" onPress={handleGoToOutletTimings} />
      </InfoDialog>

      <InfoDialog
        visible={showOutsideTimingsDialog}
        onClose={() => setShowOutsideTimingsDialog(false)}
        icon={dialogIcon}
        title="Outside Delivery Timings"
        description="You are currently outside your scheduled delivery timings. Please change outlet timings to enable delivery status."
      >
        <OutlineButton title="Cancel" onPress={() => setShowOutsideTimingsDialog(false)} />
        <PrimaryButton
          title="Change Outlet Timings"
          onPress={() => {
            setShowOutsideTimingsDialog(false);
            navigate('/food/restaurant/outlet-timings', from);
          }}
        />
      </InfoDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: tw.gray50, borderTopLeftRadius: 8, borderTopRightRadius: 8, padding: 16, gap: 24, ...shadow('sm') },
  rowTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 6, ...poppins(700) },
  muted: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  gear: { marginLeft: 12, padding: 8, backgroundColor: tw.gray200, borderRadius: 999 },
  details: { fontSize: 14, lineHeight: 20, color: RT.primary, ...poppins(500) },
  warning: { backgroundColor: tw.pink50 || '#fdf2f8', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bang: { width: 20, height: 20, borderRadius: 10, backgroundColor: RT_GRADIENT[0], alignItems: 'center', justifyContent: 'center', marginTop: 2 },
});
