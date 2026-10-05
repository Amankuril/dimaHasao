import { useEffect } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, CheckCircle, Star, Wallet } from 'lucide-react-native';
import { Press } from '../../ui';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { display, poppins, shadow, tw } from '../../../theme';

// Port of components/modals/OrderSummaryModal.jsx: full-screen #0A4D2B success page.

function Bounce({ children }) {
  // Tailwind animate-bounce: -25 % with ease-out up, ease-in down, 1 s.
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
  return <Animated.View style={{ transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }] }}>{children}</Animated.View>;
}

export function OrderSummaryModal({ order, onDone }) {
  const insets = useSafeAreaInsets();
  const enter = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, stiffness: 100, damping: 10, useNativeDriver: true }).start();
  }, [enter]);
  const earnings = order?.earnings || order?.riderEarning || order?.orderAmount * 0.1 || 0;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onDone}>
      <ScrollView style={{ flex: 1, backgroundColor: '#0A4D2B' }} contentContainerStyle={[styles.page, { paddingTop: 16 + insets.top, paddingBottom: 16 + insets.bottom }]}>
        <Animated.View
          style={[
            styles.inner,
            { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] },
          ]}
        >
          <Bounce>
            <View style={[styles.icon, shadow('2xl')]}>
              <CheckCircle size={56} color="#0A4D2B" />
            </View>
          </Bounce>
          <Text style={styles.h1}>Well Done!</Text>
          <Text style={styles.sub}>Trip completed successfully.</Text>

          <View style={[styles.card, shadow('card')]}>
            <View style={styles.starRow}>
              <Star size={16} color="#FF8904" fill="#FF8904" />
              <Text style={styles.added}>Earnings Added</Text>
              <Star size={16} color="#FF8904" fill="#FF8904" />
            </View>
            <Text style={styles.amount}>₹{Number(earnings).toFixed(2)}</Text>
            <View style={[styles.wallet, shadow('card')]}>
              <Wallet size={20} color={tw.green700} />
              <Text style={styles.walletText}>Transferred to Wallet</Text>
            </View>
          </View>

          <Press onPress={onDone} accessibilityLabel="Go Back Home" style={[styles.home, shadow('card')]}>
            <Text style={styles.homeText}>Go Back Home</Text>
            <ArrowRight size={24} color={tw.primary} />
          </Press>

          <View style={styles.refWrap}>
            <Text style={styles.ref}>
              Order Ref: <Text style={styles.refId}>{order?.orderId || order?.displayOrderId || 'FOD-1234'}</Text>
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </Modal>
  );
}

export default OrderSummaryModal;

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  inner: { width: '100%', maxWidth: 384, alignItems: 'center' },
  icon: { width: 80, height: 80, backgroundColor: '#fff', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  h1: { color: '#fff', fontSize: 36, lineHeight: 40, marginBottom: 8, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, ...display(900, 36) },
  sub: { color: '#fff', fontSize: 16, lineHeight: 24, marginBottom: 32, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, ...poppins(600) },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#E5DDC3' },
  starRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  added: { color: tw.gray400, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', ...poppins(700) },
  amount: { color: tw.gray950, fontSize: 48, lineHeight: 48, letterSpacing: -2.4, marginBottom: 20, textAlign: 'center', ...poppins(700) },
  wallet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 12, backgroundColor: tw.primarySoft, borderRadius: 16, borderWidth: 1, borderColor: tw.primaryBorder },
  walletText: { color: tw.green700, fontSize: 14, lineHeight: 20, ...poppins(700) },
  home: { width: '100%', height: 56, backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  homeText: { color: tw.primary, fontSize: 18, lineHeight: 28, ...poppins(700) },
  refWrap: { marginTop: 24, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  ref: { color: 'rgba(255,255,255,0.6)', fontSize: 10, lineHeight: 15, letterSpacing: 0.25, ...poppins(500) },
  refId: { color: 'rgba(255,255,255,0.8)', fontSize: 12, ...poppins(700) },
});
