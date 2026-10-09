/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/PromoCodes.jsx.
 * navigator.clipboard becomes @react-native-clipboard/clipboard; this reads
 * real offers and copies the code (applying stays on the vehicle screen's
 * coupon row, which has the fare and service location a promo validates
 * against), same as the web version.
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {ArrowLeft, CheckCircle2, Copy, Tag, Ticket, X} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import userService from '../../services/taxi/userService';

const unwrap = response => response?.data?.data ?? response?.data ?? response;

const formatExpiry = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
};

const toPromoCard = promo => ({
  id: String(promo?._id || promo?.code || ''),
  code: String(promo?.code || ''),
  discountPercentage: Number(promo?.discount_percentage || 0),
  maxDiscount: Number(promo?.maximum_discount_amount || 0),
  minFare: Number(promo?.minimum_trip_amount || 0),
  service: String(promo?.transport_type || 'all') === 'all' ? 'All rides' : 'Taxi rides',
  expiry: formatExpiry(promo?.to_date),
});

export default function PromoCodesScreen() {
  const navigation = useNavigation();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const locations = unwrap(await userService.getServiceLocations());
        const list = Array.isArray(locations) ? locations : locations?.results || locations?.data || [];
        const serviceLocationId = list.find(item => item?.active !== false)?._id || list[0]?._id || '';

        if (!serviceLocationId) {
          if (active) setPromos([]);
          return;
        }

        const response = await userService.getAvailablePromos({service_location_id: serviceLocationId, transport_type: 'taxi', limit: 20});
        const payload = unwrap(response);
        const rows = Array.isArray(payload) ? payload : payload?.results || [];
        if (active) setPromos(rows.map(toPromoCard).filter(promo => promo.code));
      } catch (error) {
        if (active) {
          setPromos([]);
          setErrorBanner(error?.response?.data?.message || 'Could not load offers right now');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const copyCode = code => {
    Clipboard.setString(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(current => (current === code ? null : current)), 2500);
    Toast.show({type: 'success', text1: `"${code}" copied`, text2: 'Enter it when you book'});
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <View className="px-5 pt-4 pb-4 border-b border-white/80 bg-white">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 rounded-xl border border-white/80 bg-white items-center justify-center">
            <ArrowLeft size={18} color="#0f172a" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[9px] font-black uppercase text-slate-400">Offers & coupons</Text>
            <Text className="text-[19px] font-black text-slate-900">Promo Codes</Text>
          </View>
          <Tag size={20} color="#eab308" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 20, gap: 16}}>
        {!!errorBanner && (
          <View className="flex-row items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <X size={14} color="#ef4444" />
            <Text className="flex-1 text-[12px] font-black text-red-600">{errorBanner}</Text>
            <Pressable onPress={() => setErrorBanner(null)}>
              <X size={13} color="#f87171" />
            </Pressable>
          </View>
        )}

        <View>
          <Text className="text-[10px] font-black uppercase text-slate-400">Available Offers</Text>
          <Text className="mt-0.5 text-[16px] font-black text-slate-900">Copy a code</Text>
          <Text className="mt-1 text-[12px] font-bold text-slate-400">Enter it in the coupon row when you pick your vehicle.</Text>
        </View>

        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#0f172a" />
          </View>
        ) : promos.length === 0 ? (
          <View className="items-center py-16 gap-4">
            <View className="w-16 h-16 bg-white border border-white/80 rounded-3xl items-center justify-center">
              <Ticket size={28} color="#cbd5e1" />
            </View>
            <Text className="text-[14px] font-black text-slate-500">No promo codes available right now</Text>
          </View>
        ) : (
          promos.map(promo => {
            const isCopied = copiedCode === promo.code;
            return (
              <View
                key={promo.id}
                className="rounded-[20px] border p-4"
                style={{backgroundColor: isCopied ? 'rgba(236,253,245,0.8)' : 'rgba(255,255,255,0.9)', borderColor: isCopied ? '#a7f3d0' : '#ffffff'}}>
                <View className="flex-row items-start justify-between gap-3 mb-2">
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[16px] font-black tracking-wider text-slate-900">{promo.code}</Text>
                      {isCopied && <CheckCircle2 size={16} color="#10b981" />}
                    </View>
                    <Text className="text-[11px] font-bold text-slate-400 mt-0.5">
                      {promo.service}{promo.minFare > 0 ? ` · Min fare ₹${promo.minFare}` : ''}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[18px] font-black text-slate-900">
                      {promo.discountPercentage}%<Text className="text-[11px] font-bold text-slate-400"> off</Text>
                    </Text>
                    {promo.maxDiscount > 0 && <Text className="text-[9px] font-bold text-slate-400">up to ₹{promo.maxDiscount}</Text>}
                    {!!promo.expiry && <Text className="text-[9px] font-bold text-slate-400">Expires {promo.expiry}</Text>}
                  </View>
                </View>
                <Pressable
                  onPress={() => copyCode(promo.code)}
                  className="py-2.5 rounded-xl flex-row items-center justify-center gap-2"
                  style={{backgroundColor: isCopied ? '#d1fae5' : '#0f172a'}}>
                  {isCopied ? <CheckCircle2 size={13} color="#047857" /> : <Copy size={13} color="#fff" />}
                  <Text className="text-[12px] font-black uppercase" style={{color: isCopied ? '#047857' : '#fff'}}>
                    {isCopied ? 'Copied' : 'Copy Code'}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
