import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, CheckCircle, Truck } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { PageHeader, Toggle } from '../components/ui';
import { useDeliverySettings } from '../hooks/pages/useDeliverySettings';
import { RT, RT_GRADIENT } from '../theme';

/** Port of Food/pages/restaurant/DeliverySettings.jsx (/food/restaurant/delivery-settings). */
export default function DeliverySettings() {
  const insets = useSafeAreaInsets();
  const {
    goBack, deliveryStatus, showWarning, showConfirmDialog, pendingStatus, showSuccessToast, toastMessage, savingStatus, canEnableDelivery,
    handleDeliveryStatusChange, handleConfirmStatusChange, handleCancelStatusChange,
  } = useDeliverySettings();

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <PageHeader title="Delivery Settings" subtitle="Manage your delivery status" onBack={goBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <View style={{ padding: 8, backgroundColor: tw.gray100, borderRadius: 8 }}>
              <Truck size={20} color={tw.gray900} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Delivery Status</Text>
              <Text style={styles.muted}>Control when you receive delivery orders</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { marginBottom: 6 }]}>Turn on delivery</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: deliveryStatus ? tw.green500 : tw.gray600 }} />
                <Text style={styles.muted}>{deliveryStatus ? 'Receiving orders' : 'Not receiving orders'}</Text>
              </View>
              {!canEnableDelivery && !deliveryStatus ? (
                <View style={styles.hint}>
                  <AlertCircle size={12} color={RT.accent} />
                  <Text style={[styles.hintText, { color: RT.accent }]}>You are outside outlet timings</Text>
                </View>
              ) : null}
              {showWarning && deliveryStatus ? (
                <View style={styles.hint}>
                  <AlertCircle size={12} color={RT.primary} />
                  <Text style={[styles.hintText, { color: RT.primary }]}>Warning: Delivery enabled outside outlet timings!</Text>
                </View>
              ) : null}
            </View>
            <Toggle value={deliveryStatus} onValueChange={handleDeliveryStatusChange} disabled={savingStatus} onColor={tw.green500} accessibilityLabel="Turn on delivery" />
          </View>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            <Text style={poppins(700)}>Note:</Text> When delivery is turned off, customers won&apos;t be able to place delivery orders from your restaurant. You can turn it back on anytime.
          </Text>
        </View>
      </ScrollView>

      <Dialog visible={showConfirmDialog} onClose={handleCancelStatusChange} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.dialog}>
        {/* orange-* utilities are repainted by the restaurant theme */}
        <View style={[styles.dialogIcon, { backgroundColor: pendingStatus ? tw.orange100 : tw.red100 }]}>
          <AlertCircle size={40} color={pendingStatus ? RT.accent : RT.primary} />
        </View>
        <Text style={styles.dialogTitle}>{pendingStatus ? 'Enable Delivery?' : 'Disable Delivery?'}</Text>
        <Text style={styles.dialogBody}>
          {pendingStatus
            ? !canEnableDelivery
              ? 'You are currently outside your outlet timings. Are you sure you want to enable delivery?'
              : "You will start receiving delivery orders. Make sure you're ready to accept orders."
            : "Customers won't be able to place delivery orders. You can turn it back on anytime."}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Press scale={0.98} onPress={handleCancelStatusChange} style={[styles.dialogButton, { backgroundColor: tw.gray100 }]}>
            <Text style={[styles.dialogButtonText, { color: tw.gray900 }]}>Cancel</Text>
          </Press>
          <Press scale={0.98} onPress={handleConfirmStatusChange} style={{ flex: 1 }}>
            <LinearGradient colors={pendingStatus ? [tw.green600, tw.green600] : RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.dialogButton, { flex: 0 }]}>
              <Text style={[styles.dialogButtonText, { color: '#fff' }]}>{pendingStatus ? 'Enable' : 'Disable'}</Text>
            </LinearGradient>
          </Press>
        </View>
      </Dialog>

      {showSuccessToast ? (
        <View style={[styles.toastWrap, { bottom: 24 + insets.bottom }]} pointerEvents="none">
          <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.toast}>
            <CheckCircle size={20} color={tw.green400} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </LinearGradient>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 12, padding: 16, ...shadow('sm') },
  title: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  muted: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  hint: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 16, ...poppins(400) },
  note: { marginTop: 16, backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue200, borderRadius: 12, padding: 16, ...shadow('sm') },
  noteText: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) },
  dialog: { width: '100%', maxWidth: 384, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 24, ...shadow('2xl') },
  dialogIcon: { alignSelf: 'center', marginBottom: 16, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  dialogTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, marginBottom: 8, textAlign: 'center', ...poppins(700) },
  dialogBody: { fontSize: 14, lineHeight: 20, color: tw.gray600, marginBottom: 24, textAlign: 'center', ...poppins(400) },
  dialogButton: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  dialogButtonText: { fontSize: 16, lineHeight: 24, ...poppins(600) },
  toastWrap: { position: 'absolute', left: 16, right: 16, zIndex: 200 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, ...shadow('2xl') },
  toastText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },
});
