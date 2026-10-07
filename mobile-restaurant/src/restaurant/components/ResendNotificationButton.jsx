import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { restaurantAPI } from '../../api/restaurant';
import { toast } from '../../lib/notify';
import { color, radii, space, type } from '../../theme';

/** Port of Food/components/restaurant/ResendNotificationButton.jsx: re-alerts delivery partners for an order. */
export default function ResendNotificationButton({ orderId, mongoId, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const response = await restaurantAPI.resendDeliveryNotification(mongoId || orderId);
      if (response.data?.success) {
        toast.success('Resend successful');
        onSuccess?.();
      } else {
        toast.error(response.data?.message || 'Failed to send notification');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Press onPress={handleResend} disabled={loading} accessibilityLabel="Resend notification to delivery partners" accessibilityState={{ disabled: loading, busy: loading }} hitSlop={8} style={[styles.button, loading ? { opacity: 0.5 } : null]}>
      {loading ? <ActivityIndicator size="small" color={color.info} /> : <Volume2 size={14} color={color.info} />}
      <Text style={styles.text}>{loading ? 'Sending…' : 'Resend to riders'}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  // 32 px pill + 8 px hitSlop on every side = a 48 px target.
  button: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space.xs + 2, height: 32, paddingHorizontal: space.md, borderRadius: radii.pill, backgroundColor: color.infoSoft },
  text: { ...type.label, color: color.info },
});
