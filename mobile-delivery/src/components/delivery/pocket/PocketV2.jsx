import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { ChevronRight, FileText, HelpCircle, IndianRupee, LayoutGrid, Receipt, ShieldCheck, Wallet } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../api/delivery';
import { showUserFacingApiError } from '../../../lib/apiError';
import { toast } from '../../../lib/notify';
import { initRazorpayPayment } from '../../../lib/razorpay';
import { getCompanyNameAsync } from '../../../lib/platformSettings';
import { useOnForeground } from '../../../lib/foreground';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { BottomSheet, SoraMoney } from '../../kit';
import Skeleton from '../../Skeleton';
import { Spinner } from '../../Loader';
import { Press, ThemedInput } from '../../ui';
import { display, ff, shadow, tw } from '../../../theme';

/*
 * Port of pages/PocketV2.jsx. Root has `font-poppins` -> Nunito Sans.
 * bg-[#f6e9dc] and bg-yellow-300/400 -> #FAF6ED; #ff8100 -> primary;
 * the SVG progress stroke #ff8100 is an attribute, so it stays orange.
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R = 45;
const C = 2 * Math.PI * R;

function Ring({ progress, color, children }) {
  const p = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(p, { toValue: progress, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
  }, [progress, p]);
  return (
    <View style={styles.ring}>
      <Svg width={112} height={112} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={50} cy={50} r={R} fill="none" stroke="#f3f4f6" strokeWidth={8} />
        <AnimatedCircle
          cx={50}
          cy={50}
          r={R}
          fill="none"
          stroke={color}
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
        Animated.timing(o, { toValue: 0.5, duration: 1000, easing: e, useNativeDriver: true }),
        Animated.timing(o, { toValue: 1, duration: 1000, easing: e, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [o]);
  return <Animated.View style={[styles.liveDot, { opacity: o }]} />;
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

function Service({ onPress, iconBg, iconBorder, iconColor, Icon, children, between }) {
  return (
    <Press onPress={onPress} scale={1} style={[styles.service, shadow('card'), between && { justifyContent: 'space-between' }]}>
      <View style={[styles.serviceIcon, { backgroundColor: iconBg, borderColor: iconBorder }]}>
        <Icon size={20} color={iconColor} />
      </View>
      {children}
    </Press>
  );
}

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

  return (
    <View style={styles.page}>
      {!loading && !walletState.bankDetailsFilled ? (
        <View style={styles.bank}>
          <View style={[styles.bankIcon, shadow('lg')]}>
            <FileText size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bankTitle}>Submit bank details</Text>
            <Text style={styles.bankSub}>PAN & bank details required for payouts</Text>
          </View>
          <Press onPress={() => router.push('/food/delivery/profile/details')} scale={1} accessibilityLabel="Submit bank details" style={[styles.bankBtn, shadow('sm')]}>
            <Text style={styles.bankBtnText}>Submit</Text>
          </Press>
        </View>
      ) : null}

      <View style={styles.body}>
        <Press onPress={() => router.push('/food/delivery/pocket/details')} scale={0.98} accessibilityLabel="This week's earnings" style={[styles.week, shadow('sm')]}>
          <Text style={styles.weekLabel}>Earnings: {getCurrentWeekRange()}</Text>
          <View style={styles.weekValueBox}>
            {loading ? <Skeleton style={{ height: 40, width: 112 }} /> : <SoraMoney style={styles.weekValue}>{`₹${walletState.weeklyEarnings.toFixed(0)}`}</SoraMoney>}
          </View>
        </Press>

        {hasActiveOffer ? (
          <View style={[styles.offer, shadow('card')]}>
            <View style={styles.offerHead}>
              <View>
                <Text style={styles.offerTitle}>Earnings Guarantee</Text>
                <View style={styles.offerMeta}>
                  <Text style={styles.offerValid}>Valid till {formatOfferValidTill(activeOffer.validTill)}</Text>
                  {activeOffer.isLive ? (
                    <View style={styles.liveRow}>
                      <LivePulse />
                      <Text style={styles.liveText}>Live</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.offerTarget}>
                <SoraMoney style={styles.offerAmount}>{`₹${activeOffer.targetAmount}`}</SoraMoney>
                <Text style={styles.offerOrders}>{activeOffer.targetOrders} orders</Text>
              </View>
            </View>
            <View style={styles.rings}>
              <View style={{ alignItems: 'center' }}>
                <Ring progress={ordersProgress} color="#000">
                  <Text style={styles.ringValue}>{activeOffer.currentOrders}</Text>
                  <Text style={styles.ringOf}>of {activeOffer.targetOrders}</Text>
                </Ring>
                <Text style={styles.ringLabel}>Orders Done</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Ring progress={earningsProgress} color="#ff8100">
                  <SoraMoney numberOfLines={1} style={[styles.ringValue, { fontSize: 16, lineHeight: 16 }]}>
                    {`₹${activeOffer.currentEarnings}`}
                  </SoraMoney>
                  <HelpCircle size={10} color={tw.gray300} style={{ marginTop: 4 }} />
                </Ring>
                <Text style={styles.ringLabel}>Earned Yet</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.actions, shadow('card')]}>
          {[
            { Icon: Wallet, title: 'Pocket balance', sub: 'Withdrawal Hub', value: walletState.totalBalance, href: '/food/delivery/pocket/balance' },
            { Icon: ShieldCheck, title: 'Available cash limit', sub: 'Spend Control', value: walletState.availableCashLimit, href: '/food/delivery/pocket/cash-limit' },
          ].map(({ Icon, title, sub, value, href }) => (
            <Press key={title} onPress={() => router.push(href)} scale={1} accessibilityLabel={title} style={styles.actionRow}>
              <View style={styles.actionLeft}>
                <View style={styles.actionIcon}>
                  <Icon size={24} color="#000" />
                </View>
                <View>
                  <Text style={styles.actionTitle}>{title}</Text>
                  <Text style={styles.actionSub}>{sub}</Text>
                </View>
              </View>
              <View style={styles.actionRight}>
                <View style={styles.actionValueBox}>
                  {loading ? <Skeleton style={{ height: 20, width: 64 }} /> : <SoraMoney style={styles.actionValue}>{`₹${value.toFixed(2)}`}</SoraMoney>}
                </View>
                <ChevronRight size={16} color={tw.gray300} />
              </View>
            </Press>
          ))}
          <View style={{ padding: 20 }}>
            <Press onPress={openDepositPopup} accessibilityLabel="Deposit Cash" style={[styles.depositBtn, shadow('lg')]}>
              <Text style={styles.depositText}>Deposit Cash</Text>
            </Press>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <View style={styles.grid}>
            <Service onPress={() => router.push('/food/delivery/pocket/payout')} Icon={IndianRupee} iconBg={tw.primarySoft} iconBorder={tw.primaryBorder} iconColor={tw.primary}>
              <Text style={styles.serviceKicker}>Last Payout</Text>
              <View style={{ minHeight: 24, marginBottom: 4 }}>
                {loading ? <Skeleton style={{ height: 24, width: 64 }} /> : <SoraMoney style={styles.serviceValue}>{`₹${walletState.payoutAmount}`}</SoraMoney>}
              </View>
              <Text style={styles.serviceHint}>Prev Week Info</Text>
            </Service>
            <Service between onPress={() => router.push('/food/delivery/pocket/limit-settlement')} Icon={Receipt} iconBg={tw.primarySoft} iconBorder={tw.primaryBorder} iconColor={tw.primary}>
              <Text style={styles.serviceTitle}>Limit Settlement</Text>
            </Service>
          </View>
          <View style={styles.grid}>
            <Service between onPress={() => router.push('/food/delivery/pocket/deductions')} Icon={FileText} iconBg={tw.red50} iconBorder={tw.red100} iconColor={tw.red600}>
              <Text style={styles.serviceTitle}>Deduction List</Text>
            </Service>
            <Service between onPress={() => router.push('/food/delivery/pocket/details')} Icon={LayoutGrid} iconBg={tw.purple50} iconBorder={tw.purple100} iconColor={tw.purple600}>
              <Text style={styles.serviceTitle}>Pocket statement</Text>
            </Service>
          </View>
        </View>
      </View>

      <BottomSheet visible={showDepositPopup} onClose={closeDepositPopup} backdrop="rgba(0,0,0,0.8)" blur={8} spring={{ stiffness: 200, damping: 25 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, shadow('2xl')]}>
            <Press onPress={closeDepositPopup} scale={1} accessibilityLabel="Close deposit popup" style={styles.sheetHandle}>
              <View style={styles.sheetBar} />
            </Press>

            {hasPendingCashSubmission ? (
              <View style={[styles.pending, shadow('card')]}>
                <Text style={styles.pendingText}>
                  You already paid ₹{walletState.pendingCashSubmission.toLocaleString('en-IN')}
                  {'\n'}
                  <Text style={styles.pendingSub}>Waiting for admin confirmation</Text>
                </Text>
              </View>
            ) : null}

            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={[styles.sheetIcon, shadow('card')]}>
                <IndianRupee size={40} color={tw.primary} />
              </View>
              <Text style={styles.sheetTitle}>Deposit Cash</Text>
              <Text style={styles.sheetSub}>Settle Hand Dues</Text>
            </View>

            <View style={[styles.box, shadow('card')]}>
              <View style={styles.boxRow}>
                <Text style={styles.boxLabel}>Cash in your hand</Text>
                <SoraMoney style={styles.boxValue}>{`₹${walletState.cashInHand}`}</SoraMoney>
              </View>
              <View style={styles.modes}>
                {[
                  ['cash', 'Submit by Cash'],
                  ['online', 'Deposit Online'],
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
                      accessibilityState={{ selected: on }}
                      style={[styles.mode, on ? [styles.modeOn, shadow('lg')] : styles.modeOff]}
                    >
                      <Text style={[styles.modeText, { color: on ? '#fff' : tw.gray600 }]}>{label}</Text>
                    </Press>
                  );
                })}
              </View>
              <View>
                <ThemedInput
                  key={depositMode}
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  keyboardType="decimal-pad"
                  placeholder={depositMode === 'cash' ? 'Cash amount' : 'Enter amount to deposit'}
                  editable={!isDepositInputDisabled}
                  radius={12}
                  borderWidth={1}
                  style={styles.amountInput}
                  accessibilityLabel="Amount"
                />
                <View pointerEvents="none" style={styles.rupee}>
                  <IndianRupee size={20} color={tw.gray400} />
                </View>
              </View>
              {canDepositMore ? (
                <Text style={styles.hint}>{depositMode === 'cash' ? 'Minimum ₹1 • Admin confirmation required' : 'Minimum deposit ₹1 • Instant limit update'}</Text>
              ) : null}
            </View>

            <View style={{ gap: 12 }}>
              <Press
                onPress={depositMode === 'cash' ? handleCashSubmit : handleDeposit}
                disabled={isSubmitDisabled}
                accessibilityLabel={depositMode === 'cash' ? 'Cash Submit' : 'Proceed to Pay'}
                style={[styles.submit, shadow('card'), { backgroundColor: isSubmitDisabled ? '#DBEAFE' : tw.primary }]}
              >
                {depositing ? <Spinner size={20} color={isSubmitDisabled ? '#51A2FF' : '#fff'} /> : <ShieldCheck size={20} color={isSubmitDisabled ? '#51A2FF' : '#fff'} />}
                <Text style={[styles.submitText, { color: isSubmitDisabled ? '#51A2FF' : '#fff' }]}>
                  {depositing ? 'Processing...' : depositMode === 'cash' ? 'Cash Submit' : 'Proceed to Pay'}
                </Text>
              </Press>
              <Press onPress={closeDepositPopup} scale={1} accessibilityLabel="Maybe Later" style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={styles.later}>Maybe Later</Text>
              </Press>
            </View>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#FAF6ED', paddingBottom: 128 },
  bank: { backgroundColor: '#FAF6ED', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(240,177,0,0.2)' },
  bankIcon: { width: 48, height: 48, backgroundColor: '#000', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  // h3 -> Sora
  bankTitle: { fontSize: 14, lineHeight: 20, color: '#000', marginBottom: 2, ...display(700, 14) },
  bankSub: { fontSize: 12, lineHeight: 16, color: 'rgba(0,0,0,0.8)', ...ff(500) },
  bankBtn: { backgroundColor: '#FAF6ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bankBtnText: { color: '#000', fontSize: 12, lineHeight: 16, ...ff(700) },
  body: { paddingHorizontal: 16, paddingVertical: 24, backgroundColor: tw.gray100 },
  week: { backgroundColor: '#fff', borderRadius: 12, padding: 17.6, borderWidth: 1, borderColor: tw.gray100, alignItems: 'center', marginBottom: 20 },
  weekLabel: { color: tw.gray500, fontSize: 11, lineHeight: 16.5, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 8, ...ff(700) },
  weekValueBox: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  weekValue: { fontSize: 36, lineHeight: 40, color: '#000', ...display(900, 36) },
  offer: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5DDC3', marginBottom: 24 },
  offerHead: { backgroundColor: '#000', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offerTitle: { fontSize: 18, lineHeight: 18, color: '#fff', marginBottom: 4, ...display(900, 18) },
  offerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerValid: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: tw.primarySoft },
  liveText: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.primary, ...ff(700) },
  offerTarget: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  offerAmount: { fontSize: 18, lineHeight: 18, color: '#fff', marginBottom: 2, ...display(900, 18) },
  offerOrders: { fontSize: 9, lineHeight: 13.5, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  rings: { padding: 32, paddingBottom: 40, flexDirection: 'row', justifyContent: 'space-around', gap: 32 },
  ring: { width: 112, height: 112 },
  ringCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  ringValue: { fontSize: 20, lineHeight: 20, color: '#000', ...display(900, 20) },
  ringOf: { marginTop: 2, fontSize: 9, lineHeight: 13.5, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  ringLabel: { marginTop: 16, fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray500, ...ff(700) },
  actions: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3', overflow: 'hidden', marginBottom: 24 },
  actionRow: { width: '100%', padding: 20, borderBottomWidth: 1, borderBottomColor: tw.gray50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionIcon: { width: 48, height: 48, backgroundColor: tw.gray50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.gray100 },
  actionTitle: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...ff(700) },
  actionSub: { fontSize: 10, lineHeight: 15, letterSpacing: -0.25, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  actionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionValueBox: { minWidth: 72, alignItems: 'flex-end' },
  actionValue: { fontSize: 16, lineHeight: 24, color: '#000', ...display(900, 16) },
  depositBtn: { width: '100%', paddingVertical: 16, backgroundColor: tw.primary, borderRadius: 12, alignItems: 'center' },
  depositText: { color: '#fff', fontSize: 14, lineHeight: 20, ...ff(700) },
  grid: { flexDirection: 'row', gap: 16 },
  service: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3' },
  serviceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1 },
  serviceKicker: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, marginBottom: 6, ...ff(700) },
  serviceValue: { fontSize: 20, lineHeight: 20, color: '#000', ...display(900, 20) },
  serviceHint: { fontSize: 9, lineHeight: 13.5, letterSpacing: -0.225, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  serviceTitle: { fontSize: 14, lineHeight: 17.5, color: tw.gray800, ...ff(700) },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, paddingBottom: 48 },
  sheetHandle: { width: '100%', alignItems: 'center', paddingVertical: 12, marginBottom: 20, marginTop: -8 },
  sheetBar: { width: 64, height: 6, backgroundColor: tw.gray300, borderRadius: 999 },
  pending: { marginBottom: 24, borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3', backgroundColor: tw.amber50, paddingHorizontal: 16, paddingVertical: 16 },
  pendingText: { fontSize: 14, lineHeight: 22.75, color: '#7B3306', textAlign: 'center', ...ff(700) },
  pendingSub: { fontSize: 12, lineHeight: 16, letterSpacing: 0.3, textTransform: 'uppercase', color: tw.amber700, ...ff(600) },
  sheetIcon: { width: 80, height: 80, backgroundColor: tw.primarySoft, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: tw.primaryBorder },
  sheetTitle: { fontSize: 24, lineHeight: 32, color: '#000', marginBottom: 4, ...display(900, 24) },
  sheetSub: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  box: { backgroundColor: tw.gray50, borderRadius: 16, padding: 17.6, marginBottom: 24, borderWidth: 1, borderColor: '#E5DDC3' },
  boxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  boxLabel: { fontSize: 12, lineHeight: 16, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  boxValue: { fontSize: 16, lineHeight: 24, color: '#000', ...display(900, 16) },
  modes: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  mode: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  // border-[#ff8100] -> #BBCCC3 via [class*="border-[#ff8100]"]
  modeOn: { backgroundColor: tw.primary, borderColor: tw.primaryBorder },
  modeOff: { backgroundColor: '#fff', borderColor: tw.gray200 },
  modeText: { fontSize: 12, lineHeight: 16, textTransform: 'uppercase', ...display(900, 12) },
  amountInput: { height: 62, paddingLeft: 48, paddingRight: 16, fontSize: 20, ...ff(700) },
  rupee: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' },
  hint: { marginTop: 12, textAlign: 'center', fontSize: 10, lineHeight: 15, letterSpacing: -0.25, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  submit: { width: '100%', paddingVertical: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  submitText: { fontSize: 14, lineHeight: 20, ...display(900, 14) },
  later: { color: tw.gray400, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', ...ff(700) },
});
