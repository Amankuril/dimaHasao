/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/ride/RideComplete.jsx
 * (716 lines). Kept 1:1: the bill math (fare + tip, fareDueNow zeroed once
 * the driver already collected payment), tip validation against the
 * server's tip settings, the three payment paths (cash/wallet/online) and
 * their exact endpoints, and feedback submission via PATCH .../feedback.
 *
 * Adapted for RN: the web's dynamically-injected Razorpay checkout script
 * becomes `react-native-razorpay`'s RazorpayCheckout.open(), which is the
 * native-module equivalent (same order-create -> checkout -> verify
 * round-trip against the same backend endpoints).
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RazorpayCheckout from 'react-native-razorpay';
import {Banknote, CreditCard, Star, Wallet} from 'lucide-react-native';

import api from '../../services/taxi/axiosInstance';
import {userAuthService} from '../../services/taxi/authService';
import {clearCurrentRide, getCurrentRide} from '../../services/taxi/currentRideService';
import VehicleIcon from '../../components/taxi/VehicleIcon';

const TIP_OPTIONS = [0, 20, 50, 100];
const PAYMENT_OPTIONS = [
  {id: 'cash', label: 'COD / Cash', sub: 'Pay driver directly', Icon: Banknote},
  {id: 'online', label: 'Online', sub: 'UPI, cards or Razorpay', Icon: CreditCard},
  {id: 'wallet', label: 'Wallet', sub: 'Use in-app wallet balance', Icon: Wallet},
];
const PAID_COLLECTION_STATUSES = new Set(['paid', 'captured', 'completed']);

const normalizePaymentChoice = (value = '') => {
  const normalized = String(value).trim().toLowerCase();
  if (normalized.includes('wallet')) return 'wallet';
  if (normalized.includes('cash') || normalized.includes('cod')) return 'cash';
  return 'online';
};

const isCollectionPaid = collection =>
  Boolean(collection?.paidAt) || PAID_COLLECTION_STATUSES.has(String(collection?.status || '').trim().toLowerCase());

export default function RideCompleteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [storedRide, setStoredRide] = useState(null);

  useEffect(() => {
    if (route.params?.ride) return;
    getCurrentRide().then(setStoredRide);
  }, [route.params?.ride]);

  const state = route.params?.ride || storedRide || {};
  const rideId = state.rideId || '';
  const fare = Number(state.fare || 22);
  const driver = state.driver || {name: 'Captain', rating: '4.9', vehicle: 'Taxi'};
  const serviceType = String(state.serviceType || state.type || 'ride').toLowerCase();

  const [rating, setRating] = useState(Number(state.feedback?.rating || 0));
  const [comment, setComment] = useState(state.feedback?.comment || '');
  const [selectedTip, setSelectedTip] = useState(Number(state.feedback?.tipAmount || 0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(Boolean(state.feedback?.submittedAt));
  const [error, setError] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(normalizePaymentChoice(state.paymentMethod || 'Cash'));
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentCollection, setPaymentCollection] = useState(state.driverPaymentCollection || null);
  const [rideLiveStatus, setRideLiveStatus] = useState(String(state.liveStatus || state.status || '').toLowerCase());
  const [tipSettings, setTipSettings] = useState({enable_tips: '1', min_tip_amount: '10'});

  useEffect(() => {
    api
      .get('/rides/app-settings/tip')
      .then(response => setTipSettings(prev => ({...prev, ...(response?.data?.settings || response?.settings || {})})))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!rideId) return;
    let active = true;
    api
      .get(`/rides/${rideId}`)
      .then(response => {
        if (!active) return;
        const payload = response?.data?.data || response?.data || response || {};
        setPaymentCollection(payload?.driverPaymentCollection || null);
        setRideLiveStatus(String(payload?.liveStatus || payload?.status || '').toLowerCase());
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [rideId]);

  useEffect(() => {
    if (selectedPaymentMethod !== 'wallet') return;
    userAuthService
      .getWallet()
      .then(res => setWalletBalance(Number(res?.data?.balance || res?.balance || 0)))
      .catch(() => {});
  }, [selectedPaymentMethod]);

  const isRideFinalized = ['completed', 'delivered'].includes(rideLiveStatus) || Boolean(state.feedback?.submittedAt);
  const tipsEnabled = String(tipSettings.enable_tips || '1') === '1';
  const minimumTipAmount = Number(tipSettings.min_tip_amount || 0);
  const availableTipOptions = useMemo(() => {
    if (!tipsEnabled) return [0];
    return [...new Set([0, minimumTipAmount, ...TIP_OPTIONS].filter(amount => Number.isFinite(amount) && amount >= 0))].sort((a, b) => a - b);
  }, [tipsEnabled, minimumTipAmount]);

  const fareDueNow = isCollectionPaid(paymentCollection) ? 0 : fare;
  const payableNow = fareDueNow + Number(selectedTip || 0);
  const totalBill = fare + Number(selectedTip || 0);

  const submitFeedback = async () => {
    setError('');

    if (!isRideFinalized) {
      setError('Waiting for the driver to finish the trip. You can rate as soon as the ride is finalized.');
      return;
    }
    if (tipsEnabled && selectedTip > 0 && minimumTipAmount > 0 && selectedTip < minimumTipAmount) {
      setError(`Minimum tip amount is ₹${minimumTipAmount}.`);
      return;
    }
    if (selectedPaymentMethod === 'wallet' && payableNow > walletBalance) {
      setError('Wallet balance is too low for this payment amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      let response;

      if (payableNow > 0 && selectedPaymentMethod === 'online') {
        const orderResponse = await api.post(`/rides/${rideId}/complete-payment/razorpay/order`, {rating, comment, tipAmount: selectedTip || 0});
        const order = orderResponse?.data || orderResponse || {};
        if (!order.keyId || !order.orderId) throw new Error('Unable to start ride payment');

        const userInfo = JSON.parse((await AsyncStorage.getItem('userInfo')) || '{}');
        const paymentResult = await RazorpayCheckout.open({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'Dima Hasao',
          description: `Ride payment for ${driver.name || 'driver'}`,
          order_id: order.orderId,
          prefill: {name: userInfo?.name || '', contact: userInfo?.phone ? `+91${userInfo.phone}` : ''},
          theme: {color: '#0f172a'},
        });

        response = await api.post(`/rides/${rideId}/complete-payment/razorpay/verify`, {
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_signature: paymentResult.razorpay_signature,
          rating,
          comment,
          tipAmount: selectedTip || 0,
        });
      } else if (payableNow > 0 && selectedPaymentMethod === 'wallet') {
        response = await api.post(`/rides/${rideId}/complete-payment/wallet`, {rating, comment, tipAmount: selectedTip || 0});
      } else {
        response = await api.patch(`/rides/${rideId}/feedback`, {rating, comment, tipAmount: 0});
      }

      const payload = response?.data?.data || response?.data || response;
      if (payload?.feedback) {
        setRating(Number(payload.feedback.rating || rating));
        setComment(payload.feedback.comment || comment);
        setSelectedTip(Number(payload.feedback.tipAmount || 0));
      }
      if (payload?.driverPaymentCollection) setPaymentCollection(payload.driverPaymentCollection);
      setIsSubmitted(true);
      await clearCurrentRide();
    } catch (submitError) {
      setError(submitError?.description || submitError?.message || 'Could not submit feedback right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{padding: 16}}>
        <View className="items-center py-4">
          <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-3">
            <VehicleIcon name={state.vehicleIconType || driver.vehicle} size={28} color="#059669" />
          </View>
          <Text className="text-lg font-black text-slate-900">{serviceType === 'parcel' ? 'Delivery complete' : 'Trip complete'}</Text>
          <Text className="text-[12px] text-slate-500 mt-1">{state.pickup} → {state.drop}</Text>
        </View>

        <View className="bg-slate-50 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[13px] text-slate-600">Fare</Text>
            <Text className="text-[13px] font-bold text-slate-900">₹{fare}</Text>
          </View>
          {selectedTip > 0 && (
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-[13px] text-slate-600">Tip</Text>
              <Text className="text-[13px] font-bold text-slate-900">₹{selectedTip}</Text>
            </View>
          )}
          <View className="flex-row items-center justify-between pt-2 border-t border-slate-200 mt-1">
            <Text className="text-[14px] font-extrabold text-slate-900">Total bill</Text>
            <Text className="text-[16px] font-black text-slate-900">₹{totalBill}</Text>
          </View>
          {fareDueNow === 0 && fare > 0 && <Text className="text-[11px] text-emerald-600 mt-1">Fare already collected by driver</Text>}
        </View>

        {!isSubmitted && (
          <>
            <Text className="text-[13px] font-extrabold text-slate-900 mb-2">Rate {driver.name || 'your captain'}</Text>
            <View className="flex-row gap-1.5 mb-4">
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable key={n} onPress={() => setRating(n)}>
                  <Star size={28} color="#f59e0b" fill={n <= rating ? '#f59e0b' : 'none'} />
                </Pressable>
              ))}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Add a comment (optional)"
              multiline
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] mb-4"
            />

            {tipsEnabled && (
              <>
                <Text className="text-[13px] font-extrabold text-slate-900 mb-2">Add a tip</Text>
                <View className="flex-row gap-2 mb-4">
                  {availableTipOptions.map(amount => (
                    <Pressable
                      key={amount}
                      onPress={() => setSelectedTip(amount)}
                      className={`flex-1 items-center py-2.5 rounded-xl border ${selectedTip === amount ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                      <Text className="text-[13px] font-bold text-slate-800">{amount === 0 ? 'No tip' : `₹${amount}`}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {payableNow > 0 && (
              <>
                <Text className="text-[13px] font-extrabold text-slate-900 mb-2">Pay ₹{payableNow} via</Text>
                <View className="gap-2 mb-4">
                  {PAYMENT_OPTIONS.map(option => (
                    <Pressable
                      key={option.id}
                      onPress={() => setSelectedPaymentMethod(option.id)}
                      className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl border ${selectedPaymentMethod === option.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                      <option.Icon size={18} color="#0f172a" />
                      <View className="flex-1">
                        <Text className="text-[13px] font-bold text-slate-900">{option.label}</Text>
                        <Text className="text-[11px] text-slate-500">{option.sub}</Text>
                      </View>
                      {option.id === 'wallet' && <Text className="text-[11px] font-bold text-slate-500">₹{walletBalance}</Text>}
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {!!error && <Text className="text-[12px] font-semibold text-rose-500 mb-3">{error}</Text>}

            <Pressable onPress={submitFeedback} disabled={isSubmitting} className="bg-[#0a3a22] rounded-xl py-3.5 items-center mb-4">
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-black text-sm">{payableNow > 0 ? `Pay ₹${payableNow} & Submit` : 'Submit'}</Text>}
            </Pressable>
          </>
        )}

        {isSubmitted && (
          <View className="items-center py-4">
            <Text className="text-[14px] font-bold text-emerald-600 mb-4">Thanks for your feedback!</Text>
            <Pressable onPress={() => navigation.reset({index: 0, routes: [{name: 'TaxiHome'}]})} className="bg-[#0a3a22] rounded-xl px-6 py-3">
              <Text className="text-white font-bold text-sm">Back to home</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
