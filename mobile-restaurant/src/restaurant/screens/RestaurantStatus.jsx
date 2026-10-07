import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Bike, ChevronRight, Clock, Settings, ShoppingBag } from 'lucide-react-native';
import { Button, Card, IconButton, StatusBadge } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import { PageHeader, Toggle } from '../components/ui';
import { ShadButton, ShadDialog } from '../components/ShadDialog';
import { useRestaurantStatus } from '../hooks/pages/useRestaurantStatus';

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
  const dialogIcon = <AlertTriangle size={28} color={color.warning} />;

  const statusRow = (title, on, onText, offText, onChange, Icon) => (
    <View style={styles.statusRow}>
      <View style={[styles.rowIcon, { backgroundColor: on ? color.successSoft : color.surfaceMuted }]}>
        <Icon size={20} color={on ? color.success : color.textMuted} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <StatusBadge label={on ? onText : offText} tone={on ? 'success' : 'neutral'} />
      </View>
      <Toggle value={on} onValueChange={onChange} accessibilityLabel={title} />
    </View>
  );

  return (
    <View style={styles.page}>
      <PageHeader title="Restaurant status" subtitle="You are mapped to 1 restaurant" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card padded={false}>
          <View style={styles.head}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.name} numberOfLines={2}>{loading ? 'Loading…' : restaurantData?.name || 'Restaurant'}</Text>
              <Text style={styles.muted} numberOfLines={2}>{loading ? 'Loading…' : `${idText}${address ? ` | ${address}` : ''}`}</Text>
            </View>
            <IconButton icon={Settings} label="Explore more" variant="soft" onPress={() => navigate('/food/restaurant/explore', from)} />
          </View>

          <View style={styles.divider} />
          {statusRow('Delivery status', deliveryStatus, 'Receiving orders', 'Not receiving orders', handleDeliveryStatusChange, Bike)}
          <View style={styles.divider} />
          {statusRow('Takeaway status', takeawayStatus, 'Pickup orders are enabled', 'Pickup orders are disabled', handleTakeawayStatusChange, ShoppingBag)}
          <View style={styles.divider} />

          <View style={styles.slot}>
            <View style={[styles.rowIcon, { backgroundColor: color.primarySoft }]}>
              <Clock size={20} color={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.muted}>Current delivery slot</Text>
              <Text style={styles.rowTitle}>{loading ? 'Loading…' : slot}</Text>
            </View>
            {!isDayClosed ? (
              <Button title="Details" iconRight={ChevronRight} variant="ghost" size="sm" fullWidth={false} onPress={() => navigate('/food/restaurant/outlet-timings', from)} style={{ height: 44, paddingHorizontal: space.sm }} />
            ) : null}
          </View>

          {warning ? (
            <View style={styles.warning} accessibilityRole="alert">
              <AlertTriangle size={18} color={color.warning} style={{ marginTop: 1 }} />
              <Text style={styles.warningText}>You are currently outside your scheduled delivery timings.</Text>
            </View>
          ) : null}
        </Card>
      </ScrollView>

      <ShadDialog visible={showOutletClosedDialog} onClose={() => setShowOutletClosedDialog(false)} style={styles.dialog}>
        <View style={styles.dialogHeader}>
          <View style={styles.dialogIcon}>{dialogIcon}</View>
          <Text style={styles.dialogTitle}>Outlet timings closed</Text>
        </View>
        <View style={styles.dialogActions}>
          <ShadButton title="Go to outlet timings" onPress={handleGoToOutletTimings} />
          <ShadButton variant="outline" title="Cancel" onPress={() => setShowOutletClosedDialog(false)} />
        </View>
      </ShadDialog>

      <ShadDialog visible={showOutsideTimingsDialog} onClose={() => setShowOutsideTimingsDialog(false)} style={styles.dialog}>
        <View style={styles.dialogHeader}>
          <View style={styles.dialogIcon}>{dialogIcon}</View>
          <Text style={styles.dialogTitle}>Outside delivery timings</Text>
          <Text style={styles.dialogDesc}>You are currently outside your scheduled delivery timings. Please change outlet timings to enable delivery status.</Text>
        </View>
        <View style={styles.dialogActions}>
          <ShadButton
            title="Change outlet timings"
            onPress={() => {
              setShowOutsideTimingsDialog(false);
              navigate('/food/restaurant/outlet-timings', from);
            }}
          />
          <ShadButton variant="outline" title="Cancel" onPress={() => setShowOutsideTimingsDialog(false)} />
        </View>
      </ShadDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, paddingBottom: space.xxxl },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  name: { ...type.heading, color: color.text },
  muted: { ...type.small, color: color.textMuted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginHorizontal: space.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  rowIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...type.subheading, color: color.text },
  slot: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.lg, backgroundColor: color.warningSoft, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  warningText: { flex: 1, ...type.small, color: color.text },
  dialog: { width: '90%', maxWidth: 448, padding: space.xxl, gap: space.xl },
  dialogHeader: { gap: space.sm, alignItems: 'center' },
  dialogIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.warningSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  dialogTitle: { ...type.heading, color: color.text, textAlign: 'center' },
  dialogDesc: { ...type.small, color: color.textSecondary, textAlign: 'center' },
  dialogActions: { gap: space.sm },
});
