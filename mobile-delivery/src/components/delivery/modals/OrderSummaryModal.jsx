import { useEffect } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, CheckCircle, Wallet } from 'lucide-react-native';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { SoraMoney } from '../../kit';
import { Button, StatusBadge } from '../../ds';
import { color, elevation, radii, space, type } from '../../../theme';

// Port of components/modals/OrderSummaryModal.jsx: full-screen brand-green success page after a delivery.

function Bounce({ children }) {
  // A gentle hop on the success tick.
  const t = useAnimatedValue(0);
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 500, easing: Easing.bezier(0, 0, 0.2, 1), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 500, easing: Easing.bezier(0.8, 0, 1, 1), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [t]);
  return <Animated.View style={{ transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }] }}>{children}</Animated.View>;
}

export function OrderSummaryModal({ order, onDone }) {
  const insets = useSafeAreaInsets();
  const enter = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, stiffness: 100, damping: 10, useNativeDriver: true }).start();
  }, [enter]);
  const earnings = order?.earnings || order?.riderEarning || order?.orderAmount * 0.1 || 0;
  const orderRef = order?.orderId || order?.displayOrderId;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onDone}>
      <ScrollView
        style={{ flex: 1, backgroundColor: color.primary }}
        contentContainerStyle={[styles.page, { paddingTop: space.lg + insets.top, paddingBottom: space.lg + insets.bottom }]}
      >
        <Animated.View style={[styles.inner, { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
          <Bounce>
            <View style={styles.icon}>
              <CheckCircle size={52} color={color.success} strokeWidth={2.2} />
            </View>
          </Bounce>
          <Text style={styles.h1} accessibilityRole="header">
            Well done!
          </Text>
          <Text style={styles.sub}>Trip completed successfully.</Text>

          <View style={styles.card} accessible accessibilityLabel={`Earnings added: ${Number(earnings).toFixed(2)} rupees, transferred to wallet`}>
            <Text style={styles.added}>Earnings added</Text>
            <SoraMoney style={styles.amount} numberOfLines={1}>{`+₹${Number(earnings).toFixed(2)}`}</SoraMoney>
            <StatusBadge label="Transferred to wallet" tone="success" icon={Wallet} style={{ alignSelf: 'center' }} />
          </View>

          <Button title="Go back home" variant="outline" size="lg" iconRight={ArrowRight} onPress={onDone} accessibilityLabel="Go Back Home" style={styles.home} />

          {orderRef ? (
            <Text style={styles.ref}>
              Order ref: <Text style={styles.refId}>{orderRef}</Text>
            </Text>
          ) : null}
        </Animated.View>
      </ScrollView>
    </Modal>
  );
}

export default OrderSummaryModal;

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  inner: { width: '100%', maxWidth: 400, alignItems: 'center' },
  icon: { width: 88, height: 88, backgroundColor: color.surface, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: space.xxl, ...elevation.float },
  h1: { ...type.display, color: color.textInverse, textAlign: 'center', marginBottom: space.sm },
  sub: { ...type.body, color: color.textInverse, textAlign: 'center', marginBottom: space.xxxl },
  card: { width: '100%', backgroundColor: color.surface, borderRadius: radii.lg, padding: space.xl, marginBottom: space.xxl, alignItems: 'center', gap: space.md, ...elevation.card },
  added: { ...type.overline, color: color.textMuted },
  amount: { ...type.display, fontSize: 40, lineHeight: 48, color: color.success, textAlign: 'center' },
  home: { borderColor: color.surface },
  ref: { ...type.small, marginTop: space.xxl, color: color.textInverse, opacity: 0.85, textAlign: 'center' },
  refId: { ...type.label, color: color.textInverse },
});
