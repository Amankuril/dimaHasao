import { useEffect } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ArrowRight, IndianRupee, Wallet } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { useNavigate } from '../../lib/webRouter';
import { alpha, outfit, tw } from '../../theme';

/* Web: Taxi/modules/driver/pages/LowBalanceModal.jsx (not mounted by any page on the web; ported with its props). */
const LowBalanceModal = ({ isOpen, onClose, balance, cashLimit, isBlocked, belowMinimumBalance, cashLimitExceeded, minimumBalance }) => {
  const navigate = useNavigate();
  const intro = useAnimatedValue(0);
  const progressAnim = useAnimatedValue(0);

  const normalizedCashLimit = Math.max(0, Number(cashLimit || 0));
  const cashLimitUsed = Math.max(0, Number(balance || 0) < 0 ? Math.abs(Number(balance || 0)) : 0);
  const progress = normalizedCashLimit > 0 ? Math.min(100, Math.max(0, (cashLimitUsed / normalizedCashLimit) * 100)) : 0;

  useEffect(() => {
    if (!isOpen) return;
    intro.setValue(0);
    progressAnim.setValue(0);
    Animated.spring(intro, { toValue: 1, stiffness: 300, damping: 26, mass: 1, useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: progress, duration: 500, useNativeDriver: false }).start();
  }, [isOpen, intro, progress, progressAnim]);

  if (!isOpen) return null;

  const headBg = isBlocked ? tw.rose50 : tw.amber50;
  const accent = isBlocked ? tw.rose500 : tw.amber500;
  const accentText = isBlocked ? tw.rose600 : tw.amber600;
  const balanceNumber = Number(balance || 0);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }, { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
          ]}
        >
          <View style={[styles.head, { backgroundColor: headBg }]}>
            <View style={[styles.headIcon, { backgroundColor: accent, boxShadow: `0 10px 15px -3px ${isBlocked ? tw.rose200 : tw.amber200}, 0 4px 6px -4px ${isBlocked ? tw.rose200 : tw.amber200}` }]}>
              {isBlocked ? <AlertTriangle size={40} color="#fff" /> : <Wallet size={40} color="#fff" />}
            </View>
            <Text style={[outfit(900), styles.title]}>{isBlocked ? 'Go Online Unavailable' : 'Wallet Alert'}</Text>
            <Text style={[outfit(600), styles.sub, { color: accentText }]}>
              {isBlocked
                ? belowMinimumBalance
                  ? 'Your minimum wallet balance is not maintained. Please top up to continue taking rides.'
                  : cashLimitExceeded
                    ? 'Your cash limit has been exceeded. Please deposit cash to continue taking rides.'
                    : 'Your wallet needs attention before you can continue taking rides.'
                : 'Your available wallet balance is getting low. Top up soon to avoid going offline.'}
            </Text>
          </View>

          <View style={{ padding: 32 }}>
            <View style={styles.stats}>
              <View style={styles.statsTop}>
                <View>
                  <Text style={[outfit(900), styles.statLabel]}>CURRENT BALANCE</Text>
                  <Text style={[outfit(900), styles.balance, { color: balanceNumber < 0 ? tw.rose600 : tw.slate900 }]}>Rs {Math.abs(balanceNumber).toFixed(2)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[outfit(900), styles.statLabel]}>{belowMinimumBalance ? 'MINIMUM BALANCE' : 'CASH LIMIT'}</Text>
                  <Text style={[outfit(700), styles.limit]}>Rs {belowMinimumBalance ? Number(minimumBalance || 0) : Number(cashLimit || 0)}</Text>
                </View>
              </View>

              <View style={styles.track}>
                <Animated.View
                  style={{
                    height: '100%',
                    backgroundColor: progress > 90 ? tw.rose500 : tw.amber500,
                    width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                  }}
                />
              </View>
              <View style={styles.trackLabels}>
                <Text style={[outfit(700), styles.trackLabel]}>{belowMinimumBalance ? 'Current balance' : 'Used'}</Text>
                <Text style={[outfit(700), styles.trackLabel]}>
                  {belowMinimumBalance ? `Required Rs ${Number(minimumBalance || 0)}` : `${Math.round(progress)}% of limit`}
                </Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Press onPress={() => navigate('/taxi/driver/wallet')} scale={0.95} style={styles.deposit}>
                <IndianRupee size={18} color="#fff" />
                <Text style={[outfit(900), styles.depositText]}>DEPOSIT NOW</Text>
                <ArrowRight size={18} color="#fff" />
              </Press>
              <Press onPress={onClose} scale={1} style={styles.later}>
                <Text style={[outfit(700), styles.laterText]}>{isBlocked ? "I'll do it later" : 'Dismiss'}</Text>
              </Press>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: alpha(tw.slate950, 0.6) },
  card: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 40, overflow: 'hidden', borderWidth: 1, borderColor: tw.slate100, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  head: { paddingTop: 40, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center' },
  headIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, lineHeight: 30, color: tw.slate900, textAlign: 'center' },
  sub: { marginTop: 8, fontSize: 14, paddingHorizontal: 16, textAlign: 'center' },
  stats: { backgroundColor: tw.slate50, borderRadius: 32, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: tw.slate100 },
  statsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  statLabel: { fontSize: 10, letterSpacing: 1, color: tw.slate400 },
  balance: { fontSize: 24 },
  limit: { fontSize: 14, color: tw.slate600 },
  track: { height: 12, width: '100%', backgroundColor: tw.slate200, borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  trackLabel: { fontSize: 10, color: tw.slate400 },
  deposit: { width: '100%', height: 56, backgroundColor: tw.slate900, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: '0 10px 15px -3px rgba(15,23,42,0.2), 0 4px 6px -4px rgba(15,23,42,0.2)' },
  depositText: { fontSize: 14, letterSpacing: 1.4, color: '#fff' },
  later: { width: '100%', height: 56, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontSize: 14, color: tw.slate500, textDecorationLine: 'underline', textDecorationColor: tw.slate200 },
});

export default LowBalanceModal;
