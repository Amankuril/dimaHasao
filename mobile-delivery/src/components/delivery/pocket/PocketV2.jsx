import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { ChevronRight, FileText, IndianRupee, LayoutGrid, Receipt, ShieldCheck, Wallet } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../api/delivery';
import { showUserFacingApiError } from '../../../lib/apiError';
import { toast } from '../../../lib/notify';
import { initRazorpayPayment } from '../../../lib/razorpay';
import { getCompanyNameAsync } from '../../../lib/platformSettings';
import { useOnForeground } from '../../../lib/foreground';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { BottomSheet } from '../../kit';
import Skeleton from '../../Skeleton';
import { Press } from '../../ui';
import { Button, Card, ListRow, Money, SectionHeader, formatINR } from '../../ds';
import { color, elevation, radii, space, tone, touch, type } from '../../../theme';

/*
 * Pocket tab body (renders below the shared HomeHeader). Wallet numbers,
 * the weekly earnings hero, the active earnings guarantee and the deposit
 * sheet. Styling follows DESIGN_SYSTEM.md; the data flow is the web port's.
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R = 45;
const C = 2 * Math.PI * R;

function Ring({ progress, stroke, children }) {
  const p = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(p, { toValue: progress, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
  }, [progress, p]);
  return (
    <View style={styles.ring}>
      <Svg width={112} height={112} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={50} cy={50} r={R} fill="none" stroke={color.surfaceMuted} strokeWidth={8} />
        <AnimatedCircle
          cx={50}
          cy={50}
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={p.interpolate({ inputRange: [0, 1], outputRange: [C, 0] })}
        />
      </Svg>
      <View style={styles.ringCenter}>{children}</View>
    </View>
  );
}

function LivePulse() {
  const o = useAnimatedValue(1);
  useEffect(() => {
    const e = Easing.bezier(0.4, 0, 0.6, 1);
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 0.4, duration: 1000, easing: e, useNativeDriver: true }),
        Animated.timing(o, { toValue: 1, duration: 1000, easing: e, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [o]);
  return <Animated.View style={[styles.liveDot, { opacity: o }]} />;
}

/** ₹-prefixed amount input (local primitive; balance.jsx has the same one). */
function AmountField({ value, onChangeText, placeholder, editable = true, accessibilityLabel }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocused, !editable && styles.fieldDisabled]}>
      <Text style={[styles.fieldRupee, !editable && { color: color.textDisabled }]}>₹</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={color.textMuted}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={accessibilityLabel}
        style={[styles.fieldInput, !editable && { color: color.textDisabled }]}
      />
    </View>
  );
}

const getCurrentWeekRange = () => {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const f = (d) => `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
  return `${f(start)} - ${f(end)}`;
};

const formatOfferValidTill = (validTill) => {
  if (!validTill) return '';
  const parsed = new Date(validTill);
  if (Number.isNaN(parsed.getTime())) return String(validTill);
  return parsed.toLocaleDateString('en-US', { weekday: 'long' });
};

export default function PocketV2() {
  const [loading, setLoading] = useState(true);
  const [walletState, setWalletState] = useState({
    totalBalance: 0,
    cashInHand: 0,
    availableCashLimit: 0,
    totalCashLimit: 0,
    pendingCashSubmission: 0,
    availableToDeposit: 0,
    weeklyEarnings: 0,
    weeklyOrders: 0,
    payoutAmount: 0,
    payoutPeriod: 'Current Week',
    bankDetailsFilled: false,
  });
  const [activeOffer, setActiveOffer] = useState({ targetAmount: 0, targetOrders: 0, currentOrders: 0, currentEarnings: 0, validTill: '', isLive: false });
  const [showDepositPopup, setShowDepositPopup] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositMode, setDepositMode] = useState('cash');

  const applyWalletFromApi = useCallback((wallet = {}) => {
    if (!wallet || typeof wallet !== 'object') return;
    setWalletState((prev) => ({
      ...prev,
      totalBalance: Number(wallet.pocketBalance) || prev.totalBalance,
      cashInHand: Number(wallet.cashInHand) ?? prev.cashInHand,
      availableCashLimit: Number(wallet.availableCashLimit) ?? prev.availableCashLimit,
      totalCashLimit: Number(wallet.totalCashLimit) ?? prev.totalCashLimit,
      pendingCashSubmission: Number(wallet.pendingCashSubmission) ?? prev.pendingCashSubmission,
      availableToDeposit:
        wallet.availableToDeposit != null
          ? Number(wallet.availableToDeposit)
          : Math.max(0, Number(wallet.cashInHand ?? prev.cashInHand) - Number(wallet.pendingCashSubmission ?? prev.pendingCashSubmission)),
      payoutAmount: wallet.lastPayout?.amount != null ? Number(wallet.lastPayout.amount) : 0,
      payoutPeriod: wallet.lastPayout?.date ? new Date(wallet.lastPayout.date).toLocaleDateString() : 'No recent payout',
    }));
  }, []);

  const refreshWalletSilent = useCallback(async () => {
    try {
      const walletRes = await deliveryAPI.getWallet();
      applyWalletFromApi(walletRes?.data?.data?.wallet || {});
    } catch {
      // keep the current numbers
    }
  }, [applyWalletFromApi]);

  // Web: refresh on visibilitychange -> visible.
  useOnForeground(refreshWalletSilent);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [profileRes, earningsRes, walletRes] = await Promise.all([deliveryAPI.getProfile(), deliveryAPI.getEarnings({ period: 'week' }), deliveryAPI.getWallet()]);
        const profile = profileRes?.data?.data?.profile || {};
        const summary = earningsRes?.data?.data?.summary || {};
        const wallet = walletRes?.data?.data?.wallet || {};
        const activeAddonsRes = await deliveryAPI.getActiveEarningAddons().catch(() => null);
        const offer = activeAddonsRes?.data?.data?.activeOffer || activeAddonsRes?.data?.activeOffer || null;
        setWalletState({
          totalBalance: Number(wallet.pocketBalance) || 0,
          cashInHand: Number(wallet.cashInHand) || 0,
          availableCashLimit: Number(wallet.availableCashLimit) || 0,
          totalCashLimit: Number(wallet.totalCashLimit) || 0,
          pendingCashSubmission: Number(wallet.pendingCashSubmission) || 0,
          availableToDeposit: wallet.availableToDeposit != null ? Number(wallet.availableToDeposit) : Math.max(0, Number(wallet.cashInHand) || 0),
          weeklyEarnings: Number(summary.totalEarnings) || 0,
          weeklyOrders: Number(summary.totalOrders) || 0,
          payoutAmount: Number(wallet.lastPayout?.amount) || 0,
          payoutPeriod: wallet.lastPayout?.date ? new Date(wallet.lastPayout.date).toLocaleDateString() : 'No recent payout',
          bankDetailsFilled: Boolean(profile?.documents?.bankDetails?.accountNumber),
        });
        setActiveOffer({
          targetAmount: Number(offer?.targetAmount) || 0,
          targetOrders: Number(offer?.targetOrders) || 0,
          currentOrders: Number(offer?.currentOrders) || 0,
          currentEarnings: Number(offer?.currentEarnings) || 0,
          validTill: offer?.validTill || '',
          isLive: Boolean(offer),
        });
      } catch (err) {
        showUserFacingApiError(err, 'Failed to load wallet data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDepositPopup = () => {
    setDepositMode('cash');
    setDepositAmount('');
    setShowDepositPopup(true);
    refreshWalletSilent();
  };
  const closeDepositPopup = () => {
    setShowDepositPopup(false);
    setDepositMode('cash');
    setDepositAmount('');
    setDepositing(false);
  };

  const hasPendingCashSubmission = walletState.pendingCashSubmission > 0;
  const canDepositMore = walletState.availableToDeposit > 0;
  const isDepositInputDisabled = !canDepositMore;
  const isSubmitDisabled = isDepositInputDisabled || depositing || !String(depositAmount).trim();

  const overLimitMessage = (prefix) => {
    const pendingNote = walletState.pendingCashSubmission > 0 ? ` (₹${walletState.pendingCashSubmission} already pending admin confirmation)` : '';
    return `${prefix} (₹${walletState.availableToDeposit})${pendingNote}`;
  };

  const handleDeposit = async () => {
    if (!canDepositMore) return;
    const amt = parseFloat(depositAmount);
    if (!depositAmount || Number.isNaN(amt) || amt < 1) {
      toast.error('Enter a valid amount (minimum ₹1)');
      return;
    }
    if (amt > walletState.availableToDeposit) {
      toast.error(overLimitMessage('Deposit amount cannot exceed available cash'));
      return;
    }
    try {
      setDepositing(true);
      const orderRes = await deliveryAPI.createDepositOrder(amt);
      const rp = orderRes?.data?.data?.razorpay;
      if (!rp?.orderId) {
        toast.error('Payment initialization failed');
        setDepositing(false);
        return;
      }
      const profileRes = await deliveryAPI.getProfile();
      const profile = profileRes?.data?.data?.profile || {};
      const companyName = await getCompanyNameAsync();
      await initRazorpayPayment({
        key: rp.key,
        amount: rp.amount,
        currency: rp.currency || 'INR',
        order_id: rp.orderId,
        name: companyName,
        description: `Cash limit deposit - ₹${amt}`,
        prefill: { name: profile.name, email: profile.email, contact: profile.phone },
        handler: async (res) => {
          try {
            const verifyRes = await deliveryAPI.verifyDepositPayment({
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
              amount: amt,
            });
            if (verifyRes?.data?.success) {
              toast.success('Deposit successful');
              applyWalletFromApi(verifyRes?.data?.data?.wallet);
              closeDepositPopup();
            }
          } catch {
            toast.error('Verification failed');
          } finally {
            setDepositing(false);
          }
        },
        onError: () => setDepositing(false),
        onClose: () => setDepositing(false),
      });
    } catch (err) {
      setDepositing(false);
      showUserFacingApiError(err, 'Deposit failed to start');
    }
  };

  const handleCashSubmit = async () => {
    if (!canDepositMore) return;
    const amt = parseFloat(depositAmount);
    if (!depositAmount || Number.isNaN(amt) || amt < 1) {
      toast.error('Enter a valid amount (minimum ₹1)');
      return;
    }
    if (amt > walletState.availableToDeposit) {
      toast.error(overLimitMessage('Amount cannot exceed available cash'));
      return;
    }
    try {
      setDepositing(true);
      const res = await deliveryAPI.submitCashDeposit(amt);
      if (res?.data?.success) {
        toast.success('Cash submitted successfully. Waiting for admin confirmation.');
        applyWalletFromApi(res?.data?.data?.wallet);
        setDepositAmount('');
        setDepositMode('cash');
      } else {
        showUserFacingApiError({ response: { data: { message: res?.data?.message } } }, 'Cash submission failed');
      }
    } catch (err) {
      showUserFacingApiError(err, 'Cash submission failed');
    } finally {
      setDepositing(false);
    }
  };

  const ordersProgress = activeOffer.targetOrders > 0 ? Math.min(activeOffer.currentOrders / activeOffer.targetOrders, 1) : 0;
  const earningsProgress = activeOffer.targetAmount > 0 ? Math.min(activeOffer.currentEarnings / activeOffer.targetAmount, 1) : 0;
  const hasActiveOffer = activeOffer.isLive && (activeOffer.targetAmount > 0 || activeOffer.targetOrders > 0);

  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const validTill = formatOfferValidTill(activeOffer.validTill);

  return (
    <View style={styles.page}>
      {!loading && !walletState.bankDetailsFilled ? (
        <View style={styles.bank}>
          <View style={styles.bankIcon}>
            <FileText size={22} color={color.warning} strokeWidth={2.2} />
          </View>
          <View style={styles.bankText}>
            <Text style={[type.subheading, { color: color.text }]}>Submit bank details</Text>
            <Text style={[type.small, { color: color.textSecondary }]}>PAN and bank details are required for payouts</Text>
          </View>
          <Button
            title="Submit"
            size="sm"
            variant="outline"
            fullWidth={false}
            accessibilityLabel="Submit bank details"
            onPress={() => router.push('/food/delivery/profile/details')}
          />
        </View>
      ) : null}

      <Card onPress={() => router.push('/food/delivery/pocket/details')} accessibilityLabel="This week's earnings">
        <View style={styles.heroHead}>
          <Text style={[type.label, styles.heroLabel]} numberOfLines={1}>
            Earnings · {getCurrentWeekRange()}
          </Text>
          <ChevronRight size={20} color={color.textMuted} />
        </View>
        <View style={styles.heroValueBox}>
          {loading ? (
            <Skeleton style={{ height: 36, width: 140 }} />
          ) : (
            <Money value={formatINR(walletState.weeklyEarnings, { decimals: 0 })} style={type.display} />
          )}
        </View>
        <Text style={[type.small, { color: color.primary }]}>View trips and earnings</Text>
      </Card>

      {hasActiveOffer ? (
        <Card>
          <View style={styles.offerHead}>
            <View style={styles.offerHeadText}>
              <Text style={[type.subheading, { color: color.text }]}>Earnings guarantee</Text>
              {validTill ? <Text style={[type.caption, { color: color.textMuted }]}>Valid till {validTill}</Text> : null}
            </View>
            {activeOffer.isLive ? (
              <View style={styles.live}>
                <LivePulse />
                <Text style={[type.caption, styles.liveText]}>Live</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.target}>
            <Text style={[type.label, { color: color.textSecondary }]}>Target</Text>
            <View style={styles.targetValue}>
              <Money value={formatINR(activeOffer.targetAmount)} style={styles.targetMoney} />
              <Text style={[type.small, { color: color.textSecondary }]}>· {activeOffer.targetOrders} orders</Text>
            </View>
          </View>
          <View style={styles.rings}>
            <View style={styles.ringCol}>
              <Ring progress={ordersProgress} stroke={color.text}>
                <Text style={[type.metric, { color: color.text }]}>{activeOffer.currentOrders}</Text>
                <Text style={[type.caption, { color: color.textMuted }]}>of {activeOffer.targetOrders}</Text>
              </Ring>
              <Text style={[type.label, styles.ringLabel]}>Orders done</Text>
            </View>
            <View style={styles.ringCol}>
              <Ring progress={earningsProgress} stroke={color.primary}>
                <Money value={formatINR(activeOffer.currentEarnings)} style={styles.ringMoney} />
              </Ring>
              <Text style={[type.label, styles.ringLabel]}>Earned so far</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <Card padded={false}>
        {[
          { Icon: Wallet, title: 'Pocket balance', sub: 'Withdrawal hub', value: walletState.totalBalance, href: '/food/delivery/pocket/balance' },
          { Icon: ShieldCheck, title: 'Available cash limit', sub: 'Spend control', value: walletState.availableCashLimit, href: '/food/delivery/pocket/cash-limit' },
        ].map(({ Icon, title, sub, value, href }) => (
          <Press key={title} onPress={() => router.push(href)} scale={0.99} accessibilityLabel={title} style={styles.walletRow}>
            <View style={styles.walletIcon}>
              <Icon size={22} color={color.primary} strokeWidth={2} />
            </View>
            <View style={styles.walletText}>
              <Text style={[type.label, { color: color.textSecondary }]} numberOfLines={1}>
                {title}
              </Text>
              <View style={styles.walletValueBox}>
                {loading ? <Skeleton style={{ height: 24, width: 96 }} /> : <Money value={formatINR(value, { decimals: 2 })} style={type.metric} />}
              </View>
              <Text style={[type.caption, { color: color.textMuted }]}>{sub}</Text>
            </View>
            <ChevronRight size={20} color={color.textMuted} />
          </Press>
        ))}
        <View style={styles.depositWrap}>
          <Button title="Deposit cash" icon={IndianRupee} size="lg" onPress={openDepositPopup} accessibilityLabel="Deposit cash" />
        </View>
      </Card>

      <View>
        <SectionHeader title="Payouts and statements" />
        <Card padded={false}>
          <ListRow
            icon={IndianRupee}
            tone="primary"
            title="Last payout"
            subtitle={loading ? 'Loading…' : walletState.payoutPeriod}
            value={loading ? <Skeleton style={{ height: 20, width: 64 }} /> : formatINR(walletState.payoutAmount)}
            onPress={() => router.push('/food/delivery/pocket/payout')}
            divider
          />
          <ListRow
            icon={Receipt}
            tone="primary"
            title="Limit settlement"
            subtitle="Cash deposits you have made"
            onPress={() => router.push('/food/delivery/pocket/limit-settlement')}
            divider
          />
          <ListRow icon={FileText} title="Deduction list" subtitle="Amounts taken from your pocket" onPress={() => router.push('/food/delivery/pocket/deductions')} divider />
          <ListRow icon={LayoutGrid} title="Pocket statement" subtitle="Trips and earnings by week" onPress={() => router.push('/food/delivery/pocket/details')} />
        </Card>
      </View>

      <BottomSheet visible={showDepositPopup} onClose={closeDepositPopup} backdrop={color.overlay} blur={8} spring={{ stiffness: 200, damping: 25 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { maxHeight: windowHeight * 0.92 }]}>
            <Press onPress={closeDepositPopup} scale={1} accessibilityLabel="Close deposit sheet" style={styles.sheetHandle}>
              <View style={styles.sheetBar} />
            </Press>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={[styles.sheetBody, { paddingBottom: space.lg + insets.bottom }]}
            >
              <View style={styles.sheetHead}>
                <View style={styles.sheetIcon}>
                  <IndianRupee size={24} color={color.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
                    Deposit cash
                  </Text>
                  <Text style={[type.small, { color: color.textMuted }]}>Settle the cash you are holding</Text>
                </View>
              </View>

              {hasPendingCashSubmission ? (
                <View style={styles.pending}>
                  <Text style={[type.bodyStrong, { color: color.warning }]}>
                    You already paid ₹{walletState.pendingCashSubmission.toLocaleString('en-IN')}
                  </Text>
                  <Text style={[type.small, { color: color.warning }]}>Waiting for admin confirmation</Text>
                </View>
              ) : null}

              <View style={styles.box}>
                <View style={styles.boxRow}>
                  <Text style={[type.label, { color: color.textSecondary, flexShrink: 1 }]}>Cash in your hand</Text>
                  <Money value={formatINR(walletState.cashInHand)} style={styles.boxMoney} />
                </View>
              </View>

              <View style={styles.modes} accessibilityRole="radiogroup">
                {[
                  ['cash', 'Submit by cash'],
                  ['online', 'Deposit online'],
                ].map(([mode, label]) => {
                  const on = depositMode === mode;
                  return (
                    <Press
                      key={mode}
                      onPress={() => {
                        setDepositMode(mode);
                        setDepositAmount('');
                      }}
                      scale={1}
                      accessibilityRole="radio"
                      accessibilityLabel={label}
                      accessibilityState={{ selected: on, checked: on }}
                      style={[styles.mode, on && styles.modeOn]}
                    >
                      <Text style={[type.buttonSm, { color: on ? color.onPrimary : color.textSecondary }]} numberOfLines={1}>
                        {label}
                      </Text>
                    </Press>
                  );
                })}
              </View>

              <View style={{ gap: space.sm }}>
                <Text style={[type.label, { color: color.textSecondary }]}>Amount</Text>
                <AmountField
                  key={depositMode}
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  placeholder={depositMode === 'cash' ? 'Cash amount' : 'Enter amount to deposit'}
                  editable={!isDepositInputDisabled}
                  accessibilityLabel="Amount"
                />
                {canDepositMore ? (
                  <Text style={[type.caption, { color: color.textMuted }]}>
                    {depositMode === 'cash' ? 'Minimum ₹1 · Admin confirmation required' : 'Minimum deposit ₹1 · Limit updates instantly'}
                  </Text>
                ) : (
                  <Text style={[type.caption, { color: color.textMuted }]}>There is no cash left to deposit right now.</Text>
                )}
              </View>

              <View style={{ gap: space.xs, marginTop: space.sm }}>
                <Button
                  size="lg"
                  icon={ShieldCheck}
                  loading={depositing}
                  disabled={isSubmitDisabled}
                  onPress={depositMode === 'cash' ? handleCashSubmit : handleDeposit}
                  title={depositing ? 'Processing...' : depositMode === 'cash' ? 'Submit cash' : 'Proceed to pay'}
                  accessibilityLabel={depositMode === 'cash' ? 'Submit cash' : 'Proceed to pay'}
                />
                <Button title="Maybe later" variant="ghost" onPress={closeDepositPopup} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: color.bg, padding: space.lg, gap: space.md, paddingBottom: space.xxxl },

  bank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: color.warningSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.borderStrong,
  },
  bankIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  bankText: { flex: 1, minWidth: 0, gap: space.xxs },

  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  heroLabel: { color: color.textSecondary, flex: 1, minWidth: 0 },
  heroValueBox: { minHeight: 44, justifyContent: 'center', marginVertical: space.xs },

  offerHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  offerHeadText: { flex: 1, minWidth: 0, gap: space.xxs },
  live: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, height: 26, paddingHorizontal: space.sm + 2, borderRadius: radii.pill, backgroundColor: tone.success.bg },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.online },
  liveText: { color: color.success, fontFamily: 'NunitoSans_800ExtraBold' },
  target: { marginTop: space.md, padding: space.md, borderRadius: radii.md, backgroundColor: color.surfaceMuted, gap: space.xxs },
  targetValue: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space.sm },
  targetMoney: { ...type.money, flexShrink: 1 },
  rings: { flexDirection: 'row', justifyContent: 'space-around', gap: space.lg, paddingTop: space.xl, paddingBottom: space.xs },
  ringCol: { alignItems: 'center', flexShrink: 1 },
  ring: { width: 112, height: 112 },
  ringCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  ringMoney: { ...type.money, fontSize: 16, lineHeight: 22 },
  ringLabel: { marginTop: space.md, color: color.textSecondary, textAlign: 'center' },

  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    minHeight: 88,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  walletIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  walletText: { flex: 1, minWidth: 0 },
  walletValueBox: { minHeight: 30, justifyContent: 'center' },
  depositWrap: { padding: space.lg },

  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, ...elevation.sheet },
  sheetHandle: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', height: touch - space.sm },
  sheetBar: { width: 48, height: 5, backgroundColor: color.borderStrong, borderRadius: radii.pill },
  sheetBody: { paddingHorizontal: space.xl, gap: space.lg },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sheetIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pending: { borderRadius: radii.md, backgroundColor: tone.warning.bg, padding: space.md, gap: space.xxs },
  box: { borderRadius: radii.md, backgroundColor: color.surfaceMuted, padding: space.lg },
  boxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  boxMoney: { ...type.money, flexShrink: 1, textAlign: 'right' },
  modes: { flexDirection: 'row', gap: space.sm, padding: space.xs, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  mode: { flex: 1, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  modeOn: { backgroundColor: color.primary },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  fieldFocused: { borderColor: color.primary },
  fieldDisabled: { backgroundColor: color.surfaceMuted, borderColor: color.border },
  fieldRupee: { ...type.subheading, fontSize: 20, lineHeight: 26, color: color.textSecondary },
  fieldInput: { flex: 1, minWidth: 0, height: '100%', ...type.subheading, fontSize: 20, lineHeight: 26, color: color.text, outlineWidth: 0, outlineStyle: 'none', padding: 0 },
});
