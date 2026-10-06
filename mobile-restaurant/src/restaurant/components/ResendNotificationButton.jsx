import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { restaurantAPI } from '../../api/restaurant';
import { toast } from '../../lib/notify';
import { poppins, tw } from '../../theme';

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
      {loading ? <ActivityIndicator size={12} color={tw.blue700} /> : <Volume2 size={12} color={tw.blue700} />}
      <Text style={styles.text}>{loading ? 'Sending...' : 'Resend'}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: tw.blue100, borderWidth: 1, borderColor: tw.blue300 },
  text: { fontSize: 10, lineHeight: 15, color: tw.blue700, ...poppins(500) },
});
