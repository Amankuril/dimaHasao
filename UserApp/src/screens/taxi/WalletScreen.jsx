/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/Wallet.jsx.
 *
 * Adapted for RN: the dynamically-injected Razorpay checkout script becomes
 * react-native-razorpay's RazorpayCheckout.open() (same pattern already used
 * in RideCompleteScreen.jsx). Dropped the PhonePe-redirect top-up path —
 * that flow depends on a webview bridge (openExternalCheckout) and a
 * resume-after-redirect mechanism this app has no deep-linking wired for
 * yet, the same cut already made for ride payments in RideCompleteScreen.
 * A gateway configured for PhonePe-only top-up shows the same
 * "not available for it yet" message the web version shows when a gateway
 * doesn't support wallet top-up at all.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import {ArrowLeft, CheckCircle2, Gift, Plus, X} from 'lucide-react-native';

import {userAuthService} from '../../services/taxi/authService';
import {useSettings} from '../../context/SettingsContext';
import {getReferralSettingsContent} from '../../services/taxi/referralTranslationService';

const formatInr = value => {
  const fixed = Math.round(Number(value || 0) * 100) / 100;
  return fixed.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
};

const splitMoney = formatted => {
  const [whole, decimals = '00'] = String(formatted).split('.');
  return {whole, decimals: (decimals || '00').padEnd(2, '0').slice(0, 2)};
};

export default function WalletScreen() {
  const navigation = useNavigation();
  const {settings} = useSettings();
  const appName = settings.general?.app_name || 'App';
  const activePaymentGateway = settings.paymentGateway || null;

  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState('');
  const [wallet, setWallet] = useState({balance: 0, currency: 'INR', recentTransactions: []});
  const [referralReward, setReferralReward] = useState({enabled: false, amount: 0});

  useEffect(() => {
    let active = true;
    getReferralSettingsContent('user')
      .then(response => {
        if (!active) return;
        const payload = response?.data?.data || response?.data || response || {};
        setReferralReward({enabled: Boolean(payload.enabled), amount: Number(payload.amount || 0)});
      })
      .catch(() => {
        if (active) setReferralReward({enabled: false, amount: 0});
      });
    return () => {
      active = false;
    };
  }, []);

  const showReferralBanner = referralReward.enabled && referralReward.amount > 0;

  const walletTopUpGatewayLabel = activePaymentGateway?.label || 'payment gateway';
  const supportsWalletTopUp = activePaymentGateway?.supportsWalletTopUp === true;
  const walletTopUpMode = activePaymentGateway?.walletTopUpMode || '';
  const canTopUpWallet = supportsWalletTopUp && walletTopUpMode === 'razorpay_checkout';

  const refreshWallet = async () => {
    setWalletError('');
    setWalletLoading(true);
    try {
      const response = await userAuthService.getWallet();
      const data = response?.data || {};
      setWallet({balance: Number(data.balance || 0), currency: data.currency || 'INR', recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : []});
    } catch (err) {
      setWalletError(err?.message || 'Failed to load wallet');
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    refreshWallet();
  }, []);

  const balanceText = useMemo(() => splitMoney(formatInr(wallet.balance)), [wallet.balance]);

  const handleAddMoney = async () => {
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) return;

    setIsAdding(true);
    setWalletError('');

    try {
      if (!activePaymentGateway) throw new Error('No payment gateway is enabled by admin right now.');
      if (!canTopUpWallet) throw new Error(`${walletTopUpGatewayLabel} is enabled by admin, but wallet top-up is not implemented for it yet.`);

      const orderResponse = await userAuthService.createWalletTopupOrder(amountValue);
      const order = orderResponse?.data || {};
      if (!order.keyId || !order.orderId) throw new Error('Unable to start payment');

      const userInfo = JSON.parse((await AsyncStorage.getItem('userInfo')) || '{}');

      const paymentResult = await RazorpayCheckout.open({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: appName,
        description: 'Wallet Topup',
        order_id: order.orderId,
        prefill: {name: userInfo?.name || '', email: userInfo?.email || '', contact: userInfo?.phone ? `+91${userInfo.phone}` : ''},
        theme: {color: '#E85D04'},
      });

      const verifyResponse = await userAuthService.verifyWalletTopup(paymentResult);
      const data = verifyResponse?.data || {};
      setWallet({balance: Number(data.balance || 0), currency: data.currency || 'INR', recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions : []});
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setShowAddMoney(false);
        setAmount('');
      }, 1400);
    } catch (err) {
      setWalletError(err?.description || err?.message || 'Topup failed');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pt-4 pb-4 border-b border-slate-100 bg-white">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 rounded-xl border border-slate-200 bg-white items-center justify-center">
            <ArrowLeft size={18} color="#0f172a" />
          </Pressable>
          <Text className="text-[19px] font-black text-slate-900">My Wallet</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 40}}>
        <View className="px-5 mt-6">
          <View className="rounded-3xl p-8 border border-yellow-100/70 bg-[#FFFDF0]">
            <Text className="font-bold uppercase text-[10px] text-slate-500">Available Balance</Text>
            <Text className="mt-1 text-3xl font-black text-slate-900">
              {walletLoading ? '₹ 0' : `₹ ${balanceText.whole}`}
              <Text className="text-xl text-slate-500">.{walletLoading ? '00' : balanceText.decimals}</Text>
            </Text>
            {!!walletError && <Text className="text-xs font-bold text-rose-500 mt-2">{walletError}</Text>}
            {!!activePaymentGateway && !canTopUpWallet && (
              <Text className="text-xs font-bold text-amber-600 mt-2">{walletTopUpGatewayLabel} is active, but wallet top-up is not available for it yet.</Text>
            )}
            <Pressable
              onPress={() => {
                setWalletError('');
                setShowAddMoney(true);
              }}
              disabled={!canTopUpWallet}
              className="mt-6 bg-white h-12 rounded-xl flex-row items-center justify-center gap-2"
              style={{opacity: canTopUpWallet ? 1 : 0.5}}>
              <Plus size={16} color="#0f172a" />
              <Text className="font-bold text-sm text-slate-900">Add Money</Text>
            </Pressable>
          </View>
        </View>

        {showReferralBanner && (
          <View className="px-5 mt-6">
            <Pressable onPress={() => navigation.navigate('Referral')} className="w-full border border-yellow-200 bg-amber-50 rounded-3xl p-5 flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-2xl bg-indigo-600 items-center justify-center">
                <Gift size={20} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">
                  Refer & Earn <Text className="text-emerald-600 font-extrabold">₹{referralReward.amount}</Text>
                </Text>
                <Text className="text-[10px] font-bold uppercase text-slate-500 mt-0.5">Invite friends to {appName}</Text>
              </View>
              <ArrowLeft size={18} color="#0f172a" style={{transform: [{rotate: '180deg'}]}} />
            </Pressable>
          </View>
        )}

        <View className="px-5 mt-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[10px] font-bold uppercase text-slate-400">Transaction History</Text>
            <Pressable onPress={() => navigation.navigate('Activity')}>
              <Text className="text-[10px] font-bold uppercase text-slate-900">View All</Text>
            </Pressable>
          </View>

          <View className="rounded-3xl border border-slate-100 bg-white overflow-hidden">
            {walletLoading ? (
              <View className="p-8 items-center">
                <ActivityIndicator color="#0f172a" />
              </View>
            ) : wallet.recentTransactions?.length ? (
              wallet.recentTransactions.map((tx, index) => {
                const isDebit = tx.kind === 'debit';
                const title = tx.title || (isDebit ? 'Debit' : 'Credit');
                const sign = isDebit ? '-' : '+';
                const whenText = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'}) : '';
                return (
                  <View key={tx.id} className="flex-row items-center gap-4 p-4" style={index > 0 ? {borderTopWidth: 1, borderTopColor: '#f1f5f9'} : null}>
                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{backgroundColor: isDebit ? '#f8fafc' : '#ecfdf5'}}>
                      {isDebit ? (
                        <ArrowLeft size={16} color="#475569" style={{transform: [{rotate: '45deg'}]}} />
                      ) : (
                        <Plus size={16} color="#059669" />
                      )}
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>{title}</Text>
                      <Text className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{whenText}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-bold" style={{color: isDebit ? '#0f172a' : '#059669'}}>{sign}₹{formatInr(tx.amount)}</Text>
                      <Text className="text-[8px] font-bold uppercase" style={{color: isDebit ? '#94a3b8' : '#6ee7b7'}}>{isDebit ? 'Debit' : 'Credit'}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View className="p-8 items-center">
                <Text className="text-xs font-bold text-slate-400">No transactions yet</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showAddMoney} transparent animationType="slide" onRequestClose={() => setShowAddMoney(false)}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-8 pb-10">
            <Pressable onPress={() => setShowAddMoney(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
              <X size={20} color="#94a3b8" />
            </Pressable>

            <View className="items-center gap-1 mb-6">
              <Text className="text-xl font-bold text-slate-900">Add Money</Text>
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {activePaymentGateway ? `Top-up via ${walletTopUpGatewayLabel}` : 'Select amount to top-up'}
              </Text>
            </View>

            {isSuccess ? (
              <View className="items-center py-8 gap-4">
                <View className="w-16 h-16 bg-emerald-50 rounded-full items-center justify-center">
                  <CheckCircle2 size={32} color="#059669" />
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-slate-900">Wallet Refilled!</Text>
                  <Text className="text-xs font-medium text-slate-400 mt-1">Balance updated successfully</Text>
                </View>
              </View>
            ) : (
              <View style={{gap: 24}}>
                <View className="relative">
                  <Text className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400" style={{zIndex: 1}}>₹</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    className="h-16 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 text-2xl font-bold text-slate-900 text-center"
                  />
                </View>

                <View className="flex-row gap-3">
                  {['100', '500', '1000'].map(val => (
                    <Pressable
                      key={val}
                      onPress={() => setAmount(val)}
                      className="flex-1 py-3 rounded-xl items-center"
                      style={{backgroundColor: amount === val ? '#0f172a' : '#f8fafc'}}>
                      <Text className="font-bold text-sm" style={{color: amount === val ? '#fff' : '#475569'}}>+₹{val}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={handleAddMoney}
                  disabled={isAdding || !amount}
                  className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
                  style={{backgroundColor: isAdding || !amount ? '#f1f5f9' : '#0f172a'}}>
                  <Text className="font-bold text-base" style={{color: isAdding || !amount ? '#94a3b8' : '#fff'}}>
                    {isAdding ? 'Processing...' : 'Refill Wallet'}
                  </Text>
                  {!isAdding && <Plus size={18} color="#fff" />}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
