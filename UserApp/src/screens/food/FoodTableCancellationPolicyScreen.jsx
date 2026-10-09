/**
 * Ported from Frontend/src/modules/Food/pages/user/dining/TableCancellationPolicy.jsx
 * (92 lines) — static cancellation terms.
 */
import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, CheckCircle2, Info, ShieldCheck} from 'lucide-react-native';

const ITEMS = [
  {title: 'Full Refund', desc: 'Full refund if cancelled before the deadline.', ok: true},
  {title: 'Processing Time', desc: 'Refunds reach your original payment method in 5-7 days.', ok: true},
  {title: 'No Show Policy', desc: "Refunds are not applicable if you don't arrive within 15 mins of your slot.", ok: false},
  {title: 'Late Cancellation', desc: '50% charge applicable if cancelled after the deadline.', ok: false},
];

export default function FoodTableCancellationPolicyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {restaurant, guests, date, timeSlot, specialRequest, user} = route.params || {};

  const handleBack = () => navigation.replace('FoodTableBookingConfirmation', {restaurant, guests, date, timeSlot, specialRequest, user});

  return (
    <View className="flex-1 bg-[#f8f9fa]">
      <View className="px-4 h-16 flex-row items-center gap-4 border-b border-slate-100 bg-white/90">
        <Pressable onPress={handleBack} className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
          <ArrowLeft size={22} color="#0f172a" />
        </Pressable>
        <Text className="text-xl font-black text-slate-900 uppercase">Cancellation</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 32}}>
        <View className="bg-white rounded-[2.5rem] p-8 items-center" style={{gap: 12}}>
          <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center">
            <ShieldCheck size={40} color="#ef4444" />
          </View>
          <Text className="text-2xl font-black text-slate-900 text-center">Cancellation Policy</Text>
          <Text className="text-sm text-slate-400 font-bold uppercase tracking-widest text-center">Standard dining terms apply to your booking</Text>
        </View>

        <View className="bg-red-500 rounded-3xl p-6 mt-4 flex-row items-start gap-4">
          <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
            <Info size={24} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-red-100 text-[10px] font-black uppercase tracking-widest mb-1">Cancellation Deadline</Text>
            <Text className="text-lg font-bold text-white">Valid till {timeSlot}, today</Text>
            <Text className="text-xs text-red-100/80 mt-1 italic">You can cancel for free before this time.</Text>
          </View>
        </View>

        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mt-6 mb-3">Detailed Terms</Text>
        <View className="bg-white rounded-3xl border border-slate-100">
          {ITEMS.map((item, i) => (
            <View key={item.title} className={`p-5 flex-row items-start gap-4 ${i < ITEMS.length - 1 ? 'border-b border-slate-50' : ''}`}>
              {item.ok ? <CheckCircle2 size={16} color="#22c55e" /> : <Info size={16} color="#f59e0b" />}
              <View className="flex-1">
                <Text className="font-bold text-slate-900 text-sm">{item.title}</Text>
                <Text className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable onPress={handleBack} className="h-14 rounded-2xl bg-slate-900 items-center justify-center mt-6">
          <Text className="text-white font-black uppercase tracking-widest text-sm">I Understand</Text>
        </Pressable>
        <Text className="text-center text-[10px] text-slate-400 font-bold mt-6 uppercase tracking-widest leading-loose">By using Dima Hasao Food dining, you agree to our Terms of Service</Text>
      </ScrollView>
    </View>
  );
}
