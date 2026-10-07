import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock3, IndianRupee, RefreshCw, Wallet, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { openExternal } from '../../lib/links';
import { localStore } from '../../lib/storage';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, shadow, tw } from '../../theme';
import { socketService } from '../api/socket';
import api from '../api/client';
import DriverBottomNav, { NAV_BAR_HEIGHT } from '../components/DriverBottomNav';
import DriverRazorpayCheckout from '../components/DriverRazorpayCheckout';
import SpinView from '../components/SpinView';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { Card, Chip, CtaButton } from '../ui/Surface';
import { useDriverAppSettings } from '../hooks/useDriverAppSettings';
import { getLocalDriverToken } from '../services/registrationService';
import { clearPendingPhonePeRedirect, readPendingPhonePeRedirect, rememberPendingPhonePeRedirect } from '../utils/phonePeResume';

// Web: Taxi/modules/driver/pages/DriverWallet.jsx (/taxi/driver/wallet)

const PHONEPE_DRIVER_WALLET_FLOW_KEY = 'driver-wallet-topup';

const emptyWallet = {
  balance: 0,
  cashLimit: 0,
  minimumBalanceForOrders: 0,
  availableForOrders: 0,
  isBlocked: false,
};

const money = (value) => {
  const amount = Number(value || 0);
  const sign = amount < 0 ? '-' : '';
  return `${sign}Rs ${Math.abs(amount).toFixed(2)}`;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isEnabled = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const transactionLabel = (type = '') => {
  const labels = {
    ride_earning: 'Online ride earning',
    commission_deduction: 'Cash ride commission',
    top_up: 'Wallet top-up',
    adjustment: 'Wallet adjustment',
  };

  return labels[type] || String(type || 'Wallet transaction').replace(/_/g, ' ');
};

const withdrawalStatusMeta = (status = '') => {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'completed' || normalized === 'approved') {
    return { label: 'Approved', tone: 'success' };
  }

  if (normalized === 'cancelled' || normalized === 'rejected') {
    return { label: 'Rejected', tone: 'danger' };
  }

  return { label: 'Pending', tone: 'warn' };
};

const transactionHint = (tx = {}) => {
  const payment = tx.metadata?.paymentMethod;
  const commission = tx.metadata?.commissionAmount;
  const fare = tx.metadata?.fare;
  const source = String(tx.metadata?.source || '').toLowerCase();

  if (tx.type === 'commission_deduction') {
    return `COD ride${fare ? ` of ${money(fare)}` : ''}${commission ? `, admin commission ${money(commission)}` : ''}`;
  }

  if (tx.type === 'ride_earning') {
    return `${payment === 'online' ? 'Online' : 'Ride'} payout after admin commission`;
  }

  if (tx.type === 'adjustment' && source === 'user_wallet_transfer') {
    return tx.description || 'Received from rider wallet';
  }

  return tx.description || 'Updated by wallet activity';
};

const shortenText = (value, maxLength = 88) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'Updated by wallet activity';
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3).trimEnd()}...` : normalized;
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Just now';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const normalizeWalletResponse = (payload) => {
  const data = payload?.data || payload || {};
  return {
    wallet: data.wallet || emptyWallet,
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    withdrawalRequests: Array.isArray(data.withdrawalRequests) ? data.withdrawalRequests : [],
    settings: data.settings || {},
  };
};

const WALLET_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ride_earning', label: 'Online rides' },
  { id: 'commission_deduction', label: 'Cash commission' },
  { id: 'top_up', label: 'Top-ups' },
  { id: 'adjustment', label: 'Adjustments' },
];

const TONES = {
  good: { fg: DT.successInk, bg: DT.successSoft },
  warn: { fg: DT.warnInk, bg: DT.warnSoft },
  dark: { fg: DT.inkSoft, bg: DT.bgSoft },
};

const StatPill = ({ label, value, tone = 'dark', style }) => {
  const t = TONES[tone] || TONES.dark;

  return (
    <View style={[st.stat, { backgroundColor: t.bg }, style]}>
      <Text style={[st.statLabel, { color: t.fg }]}>{String(label).toUpperCase()}</Text>
      <Text style={[st.statValue, { color: t.fg }]}>{value}</Text>
    </View>
  );
};

const isOwnerManagedDriverProfile = (driver = {}) =>
  Boolean(driver?.owner_id || driver?.ownerId || driver?.fleet_id || driver?.fleetId || driver?.owner?._id);

const withDriverAuthorization = (config = {}) => {
  const token = getLocalDriverToken();

  if (!token) {
    return config;
  }

  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
};

export default function DriverWallet() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { settings: appSettings } = useDriverAppSettings();
  const appName = appSettings.general?.app_name || 'App';
  const activePaymentGateway = appSettings.paymentGateway || null;
  const [wallet, setWallet] = useState(emptyWallet);
  const [transactions, setTransactions] = useState([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [processingTopUp, setProcessingTopUp] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [processingWithdraw, setProcessingWithdraw] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [razorpayRequest, setRazorpayRequest] = useState(null);
  const [driverProfile, setDriverProfile] = useState({
    salary: 0,
    isOwnerManagedDriver: false,
  });

  const loadWallet = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setRefreshing(true);
      setError('');

      try {
        const token = getLocalDriverToken();
        if (!token) {
          setLoading(false);
          setRefreshing(false);
          navigate('/taxi/driver/login', { replace: true });
          return;
        }

        const authConfig = withDriverAuthorization();
        const [walletResponse, profileResponse] = await Promise.all([
          api.get('/drivers/wallet', authConfig),
          api.get('/drivers/me', authConfig).catch(() => null),
        ]);
        const next = normalizeWalletResponse(walletResponse);
        const profile = profileResponse?.data?.data || profileResponse?.data || profileResponse || {};
        setWallet(next.wallet);
        setTransactions(next.transactions);
        setWithdrawalRequests(next.withdrawalRequests);
        setSettings(next.settings);
        setDriverProfile({
          salary: toNumber(profile.salary, 0),
          isOwnerManagedDriver: isOwnerManagedDriverProfile(profile),
        });
      } catch (requestError) {
        setError(requestError?.response?.data?.message || requestError?.message || 'Could not load wallet.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    loadWallet({ quiet: true });

    const token = getLocalDriverToken();
    const socket = token ? socketService.connect({ role: 'driver' }) : null;
    const onWalletUpdated = (payload) => {
      if (payload?.wallet) setWallet(payload.wallet);
      if (payload?.transaction) {
        setTransactions((previous) => [payload.transaction, ...previous.filter((item) => item._id !== payload.transaction._id)].slice(0, 50));
      }
    };

    if (socket) socketService.on('driver:wallet:updated', onWalletUpdated);

    return () => {
      socketService.off('driver:wallet:updated', onWalletUpdated);
    };
  }, [loadWallet]);

  // The web finishes a PhonePe top-up on /taxi/phonepe-status (status poll, then back to the wallet). Here the
  // app returns from the external checkout straight to this screen, so it settles the pending transaction itself.
  useEffect(() => {
    let cancelled = false;
    const settlePendingPhonePe = async () => {
      const pending = readPendingPhonePeRedirect(PHONEPE_DRIVER_WALLET_FLOW_KEY);
      if (!pending?.merchantTransactionId || !getLocalDriverToken()) return;
      try {
        const response = await api.get(`/drivers/wallet/top-up/phonepe/status/${encodeURIComponent(pending.merchantTransactionId)}`, withDriverAuthorization());
        if (cancelled) return;
        const payload = response?.data || response || {};
        const data = payload?.data || payload;
        const nextStatus = String(data?.status || payload?.status || '').trim().toLowerCase();
        if (nextStatus === 'paid') {
          clearPendingPhonePeRedirect(PHONEPE_DRIVER_WALLET_FLOW_KEY);
          setShowTopUp(false);
          loadWallet({ quiet: true });
        } else if (nextStatus === 'failed') {
          clearPendingPhonePeRedirect(PHONEPE_DRIVER_WALLET_FLOW_KEY);
          setError(String(data?.providerMessage || payload?.message || 'Transaction Rejected'));
        }
      } catch {
        /* still pending or offline: the next return to the app tries again */
      }
    };
    settlePendingPhonePe();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') settlePendingPhonePe();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [loadWallet]);

  const rules = useMemo(() => {
    const minimumBalance = toNumber(wallet.minimumBalanceForOrders, toNumber(settings.driver_wallet_minimum_amount_to_get_an_order, 0));
    const availableForOrders = toNumber(wallet.availableForOrders, toNumber(wallet.balance) - minimumBalance);
    const minimumTopUp = toNumber(wallet.minimumTopUpAmount, toNumber(settings.minimum_amount_added_to_wallet, 0));
    const minimumTransferAmount = toNumber(wallet.minimumTransferAmount, toNumber(settings.minimum_wallet_amount_for_transfer, 0));
    const walletEnabled = wallet.isWalletEnabled ?? isEnabled(settings.show_wallet_feature_for_driver, true);
    const transferEnabled = wallet.isTransferEnabled ?? isEnabled(settings.enable_wallet_transfer_driver, true);
    const canReceiveOrders = walletEnabled && !wallet.isBlocked && availableForOrders >= 0;

    return { minimumBalance, availableForOrders, minimumTopUp, minimumTransferAmount, walletEnabled, transferEnabled, canReceiveOrders };
  }, [settings, wallet]);

  const quickAmounts = useMemo(() => {
    const base = Math.max(rules.minimumTopUp, 100);
    return [base, base * 2, base * 5].map((amount) => String(Math.round(amount)));
  }, [rules.minimumTopUp]);

  const walletSummary = useMemo(() => {
    const onlineRideEarnings = transactions.filter((tx) => tx.type === 'ride_earning').reduce((sum, tx) => sum + Math.max(Number(tx.amount || 0), 0), 0);
    const cashRideCommission = transactions.filter((tx) => tx.type === 'commission_deduction').reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
    const totalAppEarnings = transactions
      .filter((tx) => ['ride_earning', 'adjustment'].includes(tx.type))
      .reduce((sum, tx) => {
        const amount = Number(tx.amount || 0);
        const source = String(tx.metadata?.source || tx.metadata?.category || '').toLowerCase();

        if (tx.type === 'ride_earning') {
          return sum + Math.max(amount, 0);
        }

        return source === 'driver_incentive' ? sum + Math.max(amount, 0) : sum;
      }, 0);

    return { totalAppEarnings, onlineRideEarnings, cashRideCommission };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') {
      return transactions;
    }

    return transactions.filter((tx) => tx.type === activeFilter);
  }, [activeFilter, transactions]);

  const recentTransactions = useMemo(() => filteredTransactions.slice(0, 20), [filteredTransactions]);
  const recentWithdrawalRequests = useMemo(() => withdrawalRequests.slice(0, 5), [withdrawalRequests]);
  const walletTopUpGatewayLabel = activePaymentGateway?.label || 'payment gateway';
  const supportsWalletTopUp = activePaymentGateway?.supportsWalletTopUp === true;
  const walletTopUpMode = activePaymentGateway?.walletTopUpMode || '';
  const canTopUpWallet = supportsWalletTopUp && ['razorpay_checkout', 'phonepe_redirect'].includes(walletTopUpMode);

  const handleTopUp = async () => {
    const amount = Number(topUpAmount);

    if (!rules.walletEnabled) {
      setError('Wallet is disabled by admin.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid top-up amount.');
      return;
    }

    if (rules.minimumTopUp > 0 && amount < rules.minimumTopUp) {
      setError(`Minimum top-up amount is Rs ${rules.minimumTopUp}.`);
      return;
    }

    setProcessingTopUp(true);
    setError('');

    try {
      if (!activePaymentGateway) {
        throw new Error('No payment gateway is enabled by admin right now.');
      }

      if (!supportsWalletTopUp || !canTopUpWallet) {
        throw new Error(`${walletTopUpGatewayLabel} is enabled by admin, but driver wallet top-up is not implemented for it yet.`);
      }

      if (walletTopUpMode === 'phonepe_redirect') {
        const sessionResponse = await api.post('/drivers/wallet/top-up/phonepe/order', { amount }, withDriverAuthorization());
        const session = sessionResponse?.data || sessionResponse || {};

        if (!session?.checkoutUrl) {
          throw new Error('Could not initiate PhonePe payment. Please try again.');
        }

        rememberPendingPhonePeRedirect(PHONEPE_DRIVER_WALLET_FLOW_KEY, {
          merchantTransactionId: session.merchantTransactionId,
          checkoutUrl: session.checkoutUrl,
        });
        const opened = await openExternal(session.checkoutUrl);
        if (!opened) {
          throw new Error('PhonePe checkout could not open outside the app WebView. Please update the app bridge or open this payment flow in your browser.');
        }
        setProcessingTopUp(false);
        return;
      }

      // 1. Create order on backend
      const orderResponse = await api.post('/drivers/wallet/top-up/razorpay/order', { amount }, withDriverAuthorization());
      const orderData = orderResponse?.data || orderResponse;

      if (!orderData?.orderId && !orderData?.checkoutUrl) {
        throw new Error('Could not initiate payment. Please try again.');
      }

      if (orderData?.checkoutUrl) {
        const opened = await openExternal(orderData.checkoutUrl);
        if (!opened) {
          throw new Error('Razorpay checkout could not open outside the app WebView. Please update the app bridge or open this payment flow in your browser.');
        }
        setProcessingTopUp(false);
        return;
      }

      let driverInfo = {};
      try {
        driverInfo = JSON.parse(localStore.getItem('driverInfo') || '{}');
      } catch {
        driverInfo = {};
      }

      // 2. Open Razorpay checkout (WebView with checkout.js; inline handler + verify, the web's browser flow)
      const driverPhone = driverInfo?.phone || driverInfo?.mobile || '';
      const cleanedPhoneDigits = String(driverPhone).replace(/\D/g, '');
      const finalPhoneDigits = cleanedPhoneDigits.length === 12 && cleanedPhoneDigits.startsWith('91') ? cleanedPhoneDigits.slice(2) : cleanedPhoneDigits;
      const prefillContact = finalPhoneDigits.length === 10 ? `+91${finalPhoneDigits}` : '';

      setRazorpayRequest({
        checkout: {
          key: orderData.keyId || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: appName,
          description: 'Wallet Topup',
          order_id: orderData.orderId,
          prefill: {
            name: driverInfo?.name || driverInfo?.full_name || '',
            email: driverInfo?.email || '',
            contact: prefillContact,
          },
          theme: { color: DT.brand },
        },
        onClose: () => {
          setProcessingTopUp(false);
        },
        onError: (event) => {
          const message = event?.error?.description || event?.error?.reason || 'Payment failed';
          setError(message);
          setProcessingTopUp(false);
        },
        handler: async (response) => {
          try {
            const verifyResponse = await api.post(
              '/drivers/wallet/top-up/razorpay/verify',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              withDriverAuthorization(),
            );

            const result = verifyResponse?.data || verifyResponse;
            if (result?.wallet) {
              setWallet(result.wallet);
            }
            if (result?.transaction) {
              setTransactions((previous) => [result.transaction, ...previous.filter((item) => item._id !== result.transaction._id)].slice(0, 50));
            }

            setTopUpSuccess(true);
            setTimeout(() => {
              setTopUpSuccess(false);
              setShowTopUp(false);
              setTopUpAmount('500');
            }, 1400);
          } catch (verifyError) {
            setError(verifyError?.message || 'Payment verification failed');
          } finally {
            setProcessingTopUp(false);
          }
        },
      });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Top-up request failed.');
      setProcessingTopUp(false);
    }
  };

  const handleWithdrawRequest = async () => {
    const amount = Number(withdrawAmount);

    if (!rules.transferEnabled) {
      setError('Withdrawals are disabled by admin.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid withdrawal amount.');
      return;
    }

    if (rules.minimumTransferAmount > 0 && amount < rules.minimumTransferAmount) {
      setError(`Minimum withdrawal amount is Rs ${rules.minimumTransferAmount}.`);
      return;
    }

    if (amount > Number(wallet.balance || 0)) {
      setError('Withdrawal amount cannot exceed current balance.');
      return;
    }

    setProcessingWithdraw(true);
    setError('');

    try {
      const response = await api.post('/drivers/wallet/withdrawals', { amount, payment_method: 'bank_transfer' }, withDriverAuthorization());
      const payload = response?.data || response || {};

      if (payload?.request) {
        setWithdrawalRequests((previous) => [payload.request, ...previous.filter((item) => item._id !== payload.request._id)].slice(0, 10));
      }

      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setShowWithdraw(false);
        setWithdrawAmount('');
      }, 1800);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Could not send withdrawal request.');
    } finally {
      setProcessingWithdraw(false);
    }
  };

  const statusCopy = rules.walletEnabled ? (rules.canReceiveOrders ? 'Ready for orders' : 'Top up to receive orders') : 'Wallet disabled';

  const walletIntro = driverProfile.isOwnerManagedDriver ? 'Monthly salary and wallet activity' : 'Cash commission and online earnings';

  const topUpDisabled = !rules.walletEnabled || !canTopUpWallet;
  const withdrawDisabled = !rules.transferEnabled || Number(wallet.balance || 0) <= 0;
  const owner = driverProfile.isOwnerManagedDriver;

  return (
    <View style={st.flex}>
      <ScreenHeader
        title="Driver wallet"
        subtitle={walletIntro}
        onBack={() => navigate(-1)}
        right={
          <Press onPress={() => loadWallet()} disabled={refreshing} accessibilityLabel="Refresh wallet" style={[st.roundBtn, refreshing && { opacity: 0.6 }]}>
            <SpinView active={refreshing}>
              <RefreshCw size={18} color={DT.onBrand} />
            </SpinView>
          </Press>
        }
      />
      <ScrollView
        style={st.flex}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: NAV_BAR_HEIGHT + insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={st.loading}>
            <SpinView>
              <RefreshCw size={28} color={DT.brand} />
            </SpinView>
            <Text style={st.loadingText}>Loading wallet...</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <Card tone="dark" style={st.hero}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={st.heroLabel}>CURRENT BALANCE</Text>
                  <Text style={st.balance} numberOfLines={1} adjustsFontSizeToFit>
                    {money(wallet.balance)}
                  </Text>
                  <View style={[st.statusPill, { backgroundColor: rules.canReceiveOrders ? 'rgba(0,212,146,0.15)' : 'rgba(255,185,0,0.15)' }]}>
                    <Text style={[st.statusText, { color: rules.canReceiveOrders ? tw.emerald200 : tw.amber200 }]}>{statusCopy}</Text>
                  </View>
                </View>
                <View style={st.walletIcon}>
                  <Wallet size={26} color={DT.gold} />
                </View>
              </View>

              {owner ? (
                <View style={st.salary}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={st.heroSmall}>MONTHLY SALARY</Text>
                      <Text style={st.salaryValue}>{money(driverProfile.salary)}</Text>
                      <Text style={st.salaryNote}>Set by fleet owner for this driver profile</Text>
                    </View>
                    <View style={st.salaryIcon}>
                      <IndianRupee size={22} color={tw.emerald200} />
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={[owner ? { gap: 12 } : { flexDirection: 'row', gap: 12 }, { marginTop: 20 }]}>
                <View style={[st.miniCard, !owner && { flex: 1 }]}>
                  <Text style={st.heroSmall}>MINIMUM NEEDED</Text>
                  <Text style={st.miniValue}>{money(rules.minimumBalance)}</Text>
                </View>
                <View style={[st.miniCard, !owner && { flex: 1 }]}>
                  <Text style={st.heroSmall}>AVAILABLE CASH LIMIT</Text>
                  <Text style={[st.miniValue, { color: rules.availableForOrders >= 0 ? tw.emerald200 : tw.amber200 }]}>{money(rules.availableForOrders)}</Text>
                </View>
              </View>
            </Card>

            {error ? (
              <View style={st.errorBox}>
                <AlertCircle size={18} color={DT.dangerInk} style={{ marginTop: 2 }} />
                <Text style={st.errorText}>{error}</Text>
              </View>
            ) : null}
            {activePaymentGateway && !canTopUpWallet ? (
              <View style={st.warnBox}>
                <Text style={st.warnText}>{walletTopUpGatewayLabel} is active, but driver wallet top-up is not available for it yet.</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <CtaButton title="TOP UP" onPress={() => setShowTopUp(true)} disabled={topUpDisabled} icon={<ArrowUpRight size={17} color={DT.ctaInk} />} style={{ flex: 1 }} />
              <CtaButton
                title="WITHDRAW"
                variant="outline"
                onPress={() => setShowWithdraw(true)}
                disabled={withdrawDisabled}
                icon={<ArrowDownLeft size={17} color={DT.ink} />}
                style={{ flex: 1 }}
              />
            </View>

            {recentWithdrawalRequests.length > 0 ? (
              <Card>
                <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={st.cardTitle}>Withdrawal requests</Text>
                  <Text style={st.cardMeta}>{recentWithdrawalRequests.length} recent</Text>
                </View>
                <View style={{ gap: 8 }}>
                  {recentWithdrawalRequests.map((request, i) => {
                    const statusMeta = withdrawalStatusMeta(request.status);

                    return (
                      <View key={request._id || request.transactionId || i} style={st.wdRow}>
                        <View>
                          <Text style={st.wdAmount}>{money(request.amount)}</Text>
                          <Text style={st.wdDate}>{formatDate(request.createdAt)}</Text>
                        </View>
                        <Chip label={statusMeta.label} tone={statusMeta.tone} />
                      </View>
                    );
                  })}
                </View>
              </Card>
            ) : null}

            <Card>
              <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IndianRupee size={18} color={DT.brand} />
                <Text style={st.cardTitle}>{owner ? 'Wallet activity guide' : 'How it reflects'}</Text>
              </View>
              <View style={{ gap: 8 }}>
                <View style={st.guide}>
                  <Text style={st.guideTitle}>{owner ? 'Monthly salary' : 'Cash / COD ride'}</Text>
                  <Text style={st.guideText}>
                    {owner
                      ? 'This fixed amount is the monthly salary configured by the fleet owner for this driver.'
                      : 'Driver collects the full cash fare. Wallet deducts only admin commission.'}
                  </Text>
                </View>
                <View style={st.guide}>
                  <Text style={st.guideTitle}>{owner ? 'Wallet balance' : 'Online ride'}</Text>
                  <Text style={st.guideText}>
                    {owner
                      ? 'Wallet entries here still show live collections, transfers, top-ups, and deductions separately from salary.'
                      : 'Platform receives the fare. Wallet credits driver earning after commission.'}
                  </Text>
                </View>
              </View>
            </Card>

            <View style={{ gap: 12 }}>
              {owner ? <StatPill label="Monthly salary" value={money(driverProfile.salary)} tone="good" /> : null}
              <StatPill label={`${appName} earnings`} value={money(walletSummary.totalAppEarnings)} tone="good" />
              <StatPill label="Top-up minimum" value={money(rules.minimumTopUp)} tone="dark" />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <StatPill label="Online earnings" value={money(walletSummary.onlineRideEarnings)} tone="good" style={{ flex: 1 }} />
                <StatPill label="Cash commission" value={money(walletSummary.cashRideCommission)} tone="warn" style={{ flex: 1 }} />
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={st.cardTitle}>Recent transactions</Text>
                  <Text style={st.txSub}>Filter earnings and wallet entries by type</Text>
                </View>
                <Text style={st.cardMeta}>{recentTransactions.length} shown</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {WALLET_FILTERS.map((filter) => {
                  const on = activeFilter === filter.id;
                  return (
                    <Press
                      key={filter.id}
                      onPress={() => setActiveFilter(filter.id)}
                      scale={1}
                      accessibilityLabel={`Filter ${filter.label}`}
                      style={[st.filter, on ? { backgroundColor: DT.brand, borderColor: DT.brand } : { backgroundColor: DT.card, borderColor: DT.border }]}
                    >
                      <Text style={[st.filterText, { color: on ? DT.onBrand : DT.inkSoft }]}>{filter.label.toUpperCase()}</Text>
                    </Press>
                  );
                })}
              </ScrollView>

              {recentTransactions.length === 0 ? (
                <View style={st.empty}>
                  <Clock3 size={30} color={DT.faint} />
                  <Text style={st.emptyTitle}>No transactions yet</Text>
                  <Text style={st.emptySub}>No entries match the selected earnings filter.</Text>
                </View>
              ) : (
                recentTransactions.map((tx, index) => {
                  const isDebit = Number(tx.amount || 0) < 0;
                  return (
                    <View key={tx._id || tx.id || index} style={st.txCard}>
                      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[st.txIcon, { backgroundColor: isDebit ? DT.dangerSoft : DT.successSoft }]}>
                          {isDebit ? <ArrowDownLeft size={18} color={DT.danger} /> : <ArrowUpRight size={18} color={DT.successInk} />}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={st.txTitle}>{transactionLabel(tx.type)}</Text>
                          <Text style={st.txHint}>{shortenText(transactionHint(tx))}</Text>
                          <Text style={st.txDate}>{formatDate(tx.createdAt)}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Text style={[st.txAmount, { color: isDebit ? DT.dangerInk : DT.successInk }]}>{money(tx.amount)}</Text>
                        <Text style={st.txBal}>BAL {money(tx.balanceAfter).toUpperCase()}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={showTopUp} transparent animationType="slide" onRequestClose={() => setShowTopUp(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTopUp(false)} accessibilityLabel="Close top-up" />
          <View style={[st.sheet, { paddingBottom: 32 + insets.bottom }]}>
            <View style={st.grab} />
            <View style={st.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={st.sheetTitle}>Top up wallet</Text>
                <Text style={st.sheetSub}>
                  Minimum amount: {money(rules.minimumTopUp)}
                  {activePaymentGateway ? ` • Via ${walletTopUpGatewayLabel}` : ''}
                </Text>
              </View>
              <Press onPress={() => setShowTopUp(false)} accessibilityLabel="Close top-up" style={st.closeBtn}>
                <X size={18} color={DT.inkSoft} />
              </Press>
            </View>

            {topUpSuccess ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <View style={st.okIcon}>
                  <CheckCircle2 size={38} strokeWidth={3} color={DT.successInk} />
                </View>
                <Text style={st.okTitle}>Wallet updated</Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={st.amountBox}>
                  <Text style={st.amountLabel}>AMOUNT</Text>
                  <TextInput value={topUpAmount} onChangeText={setTopUpAmount} keyboardType="decimal-pad" style={st.amountInput} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {quickAmounts.map((amount) => (
                    <Press key={amount} onPress={() => setTopUpAmount(amount)} scale={1} style={st.quick}>
                      <Text style={st.quickText}>{money(amount)}</Text>
                    </Press>
                  ))}
                </View>
                <CtaButton title="ADD MONEY" onPress={handleTopUp} loading={processingTopUp} disabled={!rules.walletEnabled} style={{ height: 56 }} />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showWithdraw} transparent animationType="slide" onRequestClose={() => setShowWithdraw(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowWithdraw(false)} accessibilityLabel="Close withdrawal" />
          <View style={[st.sheet, { paddingBottom: 32 + insets.bottom }]}>
            <View style={st.grab} />
            <View style={st.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={st.sheetTitle}>Withdraw to admin request</Text>
                <Text style={st.sheetSub}>Minimum amount: {money(rules.minimumTransferAmount)}</Text>
              </View>
              <Press onPress={() => setShowWithdraw(false)} accessibilityLabel="Close withdrawal" style={st.closeBtn}>
                <X size={18} color={DT.inkSoft} />
              </Press>
            </View>

            {withdrawSuccess ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <View style={st.okIcon}>
                  <CheckCircle2 size={38} strokeWidth={3} color={DT.successInk} />
                </View>
                <Text style={st.okTitle}>Request sent</Text>
                <Text style={[st.sheetSub, { marginTop: 4 }]}>Admin will review your withdrawal request.</Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={st.amountBox}>
                  <Text style={st.amountLabel}>WITHDRAWAL AMOUNT</Text>
                  <TextInput value={withdrawAmount} onChangeText={setWithdrawAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={DT.faint} style={st.amountInput} />
                  <Text style={[st.cardMeta, { marginTop: 8, textAlign: 'center' }]}>Available balance: {money(wallet.balance)}</Text>
                </View>
                <CtaButton title="SEND REQUEST" variant="brand" onPress={handleWithdrawRequest} loading={processingWithdraw} disabled={!rules.transferEnabled} style={{ height: 56 }} />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DriverRazorpayCheckout request={razorpayRequest} onDone={() => setRazorpayRequest(null)} />
      <DriverBottomNav />
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DT.bg },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  loading: { minHeight: 480, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: DT.muted, ...fo(700) },
  hero: { borderRadius: DT.radius.xl, padding: 20, overflow: 'hidden', ...shadow('lg') },
  heroLabel: { fontSize: 12, letterSpacing: 1.6, minWidth: 130, color: DT.gold, ...fo(800) },
  balance: { marginTop: 8, fontSize: 38, lineHeight: 46, letterSpacing: -0.5, color: DT.onBrand, fontVariant: ['tabular-nums'], ...fo(800) },
  statusPill: { marginTop: 12, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontSize: 12, ...fo(800) },
  walletIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(202,168,62,0.14)', borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)', alignItems: 'center', justifyContent: 'center' },
  salary: { marginTop: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.07)', padding: 16, overflow: 'hidden' },
  heroSmall: { fontSize: 10, letterSpacing: 1.2, minWidth: 90, color: DT.onBrandMuted, ...fo(800) },
  salaryValue: { marginTop: 4, fontSize: 24, color: tw.emerald200, ...fo(800) },
  salaryNote: { marginTop: 4, fontSize: 11, color: DT.onBrandMuted, ...fo(600) },
  salaryIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(0,212,146,0.15)', alignItems: 'center', justifyContent: 'center' },
  miniCard: { borderRadius: DT.radius.md, backgroundColor: 'rgba(255,255,255,0.08)', padding: 12 },
  miniValue: { marginTop: 4, fontSize: 18, color: DT.onBrand, fontVariant: ['tabular-nums'], ...fo(800) },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.danger, backgroundColor: DT.dangerSoft, padding: 16 },
  errorText: { flex: 1, fontSize: 14, color: DT.dangerInk, ...fo(600) },
  warnBox: { borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.warn, backgroundColor: DT.warnSoft, padding: 16 },
  warnText: { fontSize: 14, color: DT.warnInk, ...fo(600) },
  cardTitle: { fontSize: 15, color: DT.ink, ...fo(800) },
  cardMeta: { fontSize: 12, color: DT.muted, ...fo(600) },
  wdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: DT.radius.md, backgroundColor: DT.bgSoft, padding: 12 },
  wdAmount: { fontSize: 15, color: DT.ink, fontVariant: ['tabular-nums'], ...fo(800) },
  wdDate: { marginTop: 2, fontSize: 11, color: DT.muted, ...fo(600) },
  guide: { borderRadius: DT.radius.md, backgroundColor: DT.bgSoft, padding: 14 },
  guideTitle: { fontSize: 14, color: DT.ink, ...fo(800) },
  guideText: { marginTop: 4, fontSize: 12, lineHeight: 19, color: DT.inkSoft, ...fo(500) },
  stat: { borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, paddingHorizontal: 16, paddingVertical: 14 },
  statLabel: { fontSize: 10, letterSpacing: 1.2, minWidth: 80, ...fo(800) },
  statValue: { marginTop: 4, fontSize: 18, fontVariant: ['tabular-nums'], ...fo(800) },
  txSub: { marginTop: 4, fontSize: 11, color: DT.muted, ...fo(600) },
  filter: { minHeight: 40, justifyContent: 'center', borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  filterText: { fontSize: 11, letterSpacing: 0.8, minWidth: 28, ...fo(800) },
  empty: { borderRadius: DT.radius.lg, backgroundColor: DT.card, borderWidth: 1, borderColor: DT.borderSoft, padding: 32, alignItems: 'center', ...shadow('sm') },
  emptyTitle: { marginTop: 12, fontSize: 14, color: DT.inkSoft, ...fo(800) },
  emptySub: { marginTop: 4, fontSize: 12, color: DT.muted, textAlign: 'center', ...fo(600) },
  txCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, padding: 14, ...shadow('sm') },
  txIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 14, color: DT.ink, ...fo(800) },
  txHint: { marginTop: 2, fontSize: 12, lineHeight: 18, color: DT.inkSoft, ...fo(500) },
  txDate: { marginTop: 4, fontSize: 11, color: DT.muted, ...fo(600) },
  txAmount: { fontSize: 16, fontVariant: ['tabular-nums'], ...fo(800) },
  txBal: { marginTop: 4, fontSize: 10, color: DT.muted, fontVariant: ['tabular-nums'], ...fo(700) },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6,44,22,0.55)' },
  sheet: { borderTopLeftRadius: DT.radius.xl, borderTopRightRadius: DT.radius.xl, backgroundColor: DT.card, paddingHorizontal: 20, paddingTop: 10, ...shadow('2xl') },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: DT.border, marginBottom: 14 },
  sheetHead: { marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sheetTitle: { fontSize: 20, color: DT.ink, ...fo(800) },
  sheetSub: { fontSize: 13, color: DT.muted, ...fo(600) },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.bgSoft, alignItems: 'center', justifyContent: 'center' },
  okIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: DT.successSoft, alignItems: 'center', justifyContent: 'center' },
  okTitle: { marginTop: 16, fontSize: 18, color: DT.ink, ...fo(800) },
  amountBox: { borderRadius: DT.radius.xl, backgroundColor: DT.bgSoft, padding: 20, alignItems: 'center' },
  amountLabel: { fontSize: 12, letterSpacing: 1.4, minWidth: 90, color: DT.muted, ...fo(800) },
  amountInput: { marginTop: 8, width: '100%', padding: 0, textAlign: 'center', fontSize: 36, color: DT.ink, fontVariant: ['tabular-nums'], ...fo(800) },
  quick: { flex: 1, minHeight: 44, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card, paddingVertical: 10, alignItems: 'center' },
  quickText: { fontSize: 14, color: DT.ink, ...fo(700) },
});
