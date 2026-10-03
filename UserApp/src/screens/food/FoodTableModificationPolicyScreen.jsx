/**
 * Ported from Frontend/src/modules/Food/pages/user/dining/TableModificationPolicy.jsx
 * (106 lines) — static policy text plus "Modify Details Now", which
 * re-opens FoodTableBooking with the current draft so the user can pick
 * a new date/time/guest count.
 */
import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, CheckCircle2, Clock, Edit2, Info} from 'lucide-react-native';

const ITEMS = [
  {title: 'Number of Guests', desc: 'Decrease or increase guests (subject to table availability).', ok: true},
  {title: 'Date & Time Slot', desc: 'Reschedule to any available slot on the same or future dates.', ok: true},
  {title: 'Special Requests', desc: 'Update your food preferences or celebration notes anytime.', ok: true},
  {title: 'One-time Free Change', desc: 'Your first modification is always free before the deadline.', ok: false},
];

export default function FoodTableModificationPolicyScreen() {
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
        <Text className="text-xl font-black text-slate-900 uppercase">Modification</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 32}}>
        <View className="bg-white rounded-[2.5rem] p-8 items-center" style={{gap: 12}}>
          <View className="w-20 h-20 bg-[#0a4d2b]/10 rounded-full items-center justify-center">
            <Clock size={40} color="#0a4d2b" />
          </View>
          <Text className="text-2xl font-black text-slate-900 text-center">Can I make changes?</Text>
          <Text className="text-sm text-slate-400 font-bold uppercase tracking-widest text-center">Flexible modifications for your comfort</Text>
        </View>

        <View className="bg-[#0a4d2b] rounded-3xl p-6 mt-4 flex-row items-start gap-4">
          <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
            <Edit2 size={24} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Modification Status</Text>
            <Text className="text-lg font-bold text-white">Free till {timeSlot}, today</Text>
            <Text className="text-xs text-white/80 mt-1 italic">You can change guests or time for free.</Text>
          </View>
        </View>

        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mt-6 mb-3">What you can change</Text>
        <View className="bg-white rounded-3xl border border-slate-100" style={{gap: 0}}>
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

        <View className="pt-6" style={{gap: 16}}>
          <Pressable onPress={() => navigation.navigate('FoodTableBooking', {restaurant, guestCount: guests})} className="h-14 rounded-2xl bg-[#0a4d2b] items-center justify-center">
            <Text className="text-white font-black uppercase tracking-widest text-sm">Modify Details Now</Text>
          </Pressable>
          <Pressable onPress={handleBack} className="h-14 rounded-2xl bg-slate-100 items-center justify-center">
            <Text className="text-slate-600 font-black uppercase tracking-widest text-sm">Back to Confirmation</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
