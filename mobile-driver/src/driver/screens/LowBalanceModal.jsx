import { useEffect } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, IndianRupee, Wallet } from 'lucide-react-native';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { useNavigate } from '../../lib/webRouter';
import { alpha, outfit, shadow, tw } from '../../theme';
import { DT } from '../ui/dt';
import { CtaButton } from '../ui/Surface';

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

  const headBg = isBlocked ? DT.dangerSoft : DT.warnSoft;
  const accent = isBlocked ? DT.danger : DT.warn;
  const accentText = isBlocked ? DT.dangerInk : DT.warnInk;
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
            <View style={[styles.headIcon, { backgroundColor: accent, ...shadow('md') }]}>
              {isBlocked ? <AlertTriangle size={40} color={DT.onBrand} /> : <Wallet size={40} color={DT.onBrand} />}
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

          <View style={{ padding: 24 }}>
            <View style={styles.stats}>
              <View style={styles.statsTop}>
                <View>
                  <Text style={[outfit(900), styles.statLabel]}>CURRENT BALANCE</Text>
                  <Text style={[outfit(900), styles.balance, { color: balanceNumber < 0 ? DT.danger : DT.onBrand }]}>Rs {Math.abs(balanceNumber).toFixed(2)}</Text>
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
                    backgroundColor: progress > 90 ? DT.danger : DT.accent,
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
              <CtaButton
                title="Deposit now"
                onPress={() => navigate('/taxi/driver/wallet')}
                icon={<IndianRupee size={18} color={DT.ctaInk} />}
              />
              <CtaButton variant="outline" title={isBlocked ? "I'll do it later" : 'Dismiss'} onPress={onClose} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: alpha(tw.slate950, 0.6) },
  card: { width: '100%', maxWidth: 384, backgroundColor: DT.card, borderRadius: DT.radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: DT.borderSoft, ...shadow('lg') },
  head: { paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center' },
  headIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, lineHeight: 28, color: DT.ink, textAlign: 'center' },
  sub: { marginTop: 8, fontSize: 14, lineHeight: 20, paddingHorizontal: 8, textAlign: 'center' },
  stats: { backgroundColor: DT.dark, borderRadius: DT.radius.lg, padding: 20, marginBottom: 24 },
  statsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 16 },
  statLabel: { fontSize: 10, letterSpacing: 1, minWidth: 90, color: DT.gold },
  balance: { fontSize: 24, lineHeight: 30 },
  limit: { fontSize: 14, color: DT.onBrandMuted },
  track: { height: 10, width: '100%', backgroundColor: DT.darkSoft, borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  trackLabel: { fontSize: 11, color: DT.onBrandMuted },
});

export default LowBalanceModal;
