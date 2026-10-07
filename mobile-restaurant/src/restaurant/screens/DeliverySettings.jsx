import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, CheckCircle, Info, Truck } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Button, Card, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { useDeliverySettings } from '../hooks/pages/useDeliverySettings';
import { Notice, ScreenHeader, Switch } from './inventory/partnerKit';

/** Port of Food/pages/restaurant/DeliverySettings.jsx (/food/restaurant/delivery-settings). */
export default function DeliverySettings() {
  const insets = useSafeAreaInsets();
  const {
    goBack, deliveryStatus, showWarning, showConfirmDialog, pendingStatus, showSuccessToast, toastMessage, savingStatus, canEnableDelivery,
    handleDeliveryStatusChange, handleConfirmStatusChange, handleCancelStatusChange,
  } = useDeliverySettings();

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title="Delivery settings" subtitle="Manage your delivery status" onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxxl + insets.bottom }}>
        <Card style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={styles.icon}>
              <Truck size={22} color={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.subheading, { color: color.text }]}>Delivery status</Text>
              <Text style={[type.small, { color: color.textMuted }]}>Control when you receive delivery orders</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
              <Text style={[type.bodyStrong, { color: color.text }]}>Turn on delivery</Text>
              <StatusBadge label={deliveryStatus ? 'Receiving orders' : 'Not receiving orders'} tone={deliveryStatus ? 'primary' : 'neutral'} />
            </View>
            <Switch value={deliveryStatus} onValueChange={handleDeliveryStatusChange} disabled={savingStatus} accessibilityLabel="Turn on delivery" />
          </View>

          {!canEnableDelivery && !deliveryStatus ? (
            <Notice tone="warning" icon={AlertCircle}>You are outside outlet timings.</Notice>
          ) : null}
          {showWarning && deliveryStatus ? (
            <Notice tone="danger" icon={AlertCircle}>Warning: delivery is on outside outlet timings.</Notice>
          ) : null}
        </Card>

        <Notice tone="info" icon={Info} title="Note">
          When delivery is off, customers can&apos;t place delivery orders from your restaurant. You can turn it back on anytime.
        </Notice>
      </ScrollView>

      <Dialog visible={showConfirmDialog} onClose={handleCancelStatusChange} backdrop={color.overlay} panelStyle={styles.dialog}>
        <View style={[styles.dialogIcon, { backgroundColor: pendingStatus ? color.primarySoft : color.warningSoft }]}>
          <AlertCircle size={30} color={pendingStatus ? color.primary : color.warning} />
        </View>
        <Text style={[type.heading, { color: color.text, textAlign: 'center' }]} accessibilityRole="header">{pendingStatus ? 'Turn on delivery?' : 'Turn off delivery?'}</Text>
        <Text style={[type.small, { color: color.textSecondary, textAlign: 'center', marginTop: space.sm, marginBottom: space.xl }]}>
          {pendingStatus
            ? !canEnableDelivery
              ? 'You are currently outside your outlet timings. Are you sure you want to enable delivery?'
              : "You will start receiving delivery orders. Make sure you're ready to accept orders."
            : "Customers won't be able to place delivery orders. You can turn it back on anytime."}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.md, alignSelf: 'stretch' }}>
          <Button title="Cancel" variant="outline" onPress={handleCancelStatusChange} style={{ flex: 1 }} />
          <Button title={pendingStatus ? 'Turn on' : 'Turn off'} variant={pendingStatus ? 'primary' : 'danger'} onPress={handleConfirmStatusChange} style={{ flex: 1 }} />
        </View>
      </Dialog>

      {showSuccessToast ? (
        <View style={[styles.toastWrap, { bottom: space.xxl + insets.bottom }]} pointerEvents="none" accessibilityRole="alert">
          <View style={styles.toast}>
            <CheckCircle size={20} color={color.goldOnDark} />
            <Text style={[type.bodyStrong, { flex: 1, color: color.textInverse }]}>{toastMessage}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingTop: space.lg },
  dialog: { width: '90%', maxWidth: 380, alignSelf: 'center', backgroundColor: color.surface, borderRadius: radii.lg, padding: space.xxl, alignItems: 'center', ...elevation.sheet },
  dialogIcon: { marginBottom: space.lg, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  toastWrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 200 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radii.md, backgroundColor: color.primaryDeep, ...elevation.float },
});
