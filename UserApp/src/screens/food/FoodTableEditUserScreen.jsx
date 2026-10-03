/**
 * Ported from Frontend/src/modules/Food/pages/user/dining/TableEditUserPage.jsx
 * (126 lines) — just edits the guest name/phone used for the booking
 * before it's confirmed, then hands the updated pair back to
 * FoodTableBookingConfirmationScreen.
 */
import React, {useState} from 'react';
import {ActivityIndicator, Pressable, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, CheckCircle2, Phone, User} from 'lucide-react-native';

export default function FoodTableEditUserScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {user, restaurant, guests, date, timeSlot, specialRequest} = route.params || {};

  const initialName = user?.name || '';
  const initialPhone = user?.phone || '';
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);

  const hasChanged = name !== initialName || phone !== initialPhone;

  const handleSave = () => {
    if (saving || !hasChanged) return;
    setSaving(true);
    setTimeout(() => {
      navigation.replace('FoodTableBookingConfirmation', {restaurant, guests, date, timeSlot, specialRequest, user: {...user, name, phone}});
    }, 300);
  };

  return (
    <View className="flex-1 bg-[#f8f9fa]">
      <View className="px-4 h-16 flex-row items-center gap-4 border-b border-slate-100 bg-white/90">
        <Pressable onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center">
          <ArrowLeft size={22} color="#0f172a" />
        </Pressable>
        <Text className="text-xl font-black text-slate-900 uppercase">Edit Details</Text>
      </View>

      <View className="px-4 py-8" style={{gap: 24}}>
        <View className="items-center" style={{gap: 8}}>
          <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-2">
            <User size={36} color="#ef4444" />
          </View>
          <Text className="text-2xl font-black text-slate-900">Personalize Booking</Text>
          <Text className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Contact details for the restaurant</Text>
        </View>

        <View style={{gap: 20}}>
          <View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Full Name</Text>
            <View className="flex-row items-center bg-white border border-slate-100 rounded-2xl px-4 h-14">
              <User size={18} color="#94a3b8" />
              <TextInput
                value={name}
                onChangeText={t => setName(t.replace(/[^a-zA-Z\s]/g, ''))}
                placeholder="Enter your full name"
                placeholderTextColor="#cbd5e1"
                className="flex-1 ml-3 font-bold text-slate-900"
              />
            </View>
          </View>
          <View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Mobile Number</Text>
            <View className="flex-row items-center bg-white border border-slate-100 rounded-2xl px-4 h-14">
              <Phone size={18} color="#94a3b8" />
              <TextInput value={phone} onChangeText={setPhone} placeholder="Enter mobile number" placeholderTextColor="#cbd5e1" keyboardType="phone-pad" className="flex-1 ml-3 font-bold text-slate-900" />
            </View>
          </View>
        </View>

        <View className="pt-6" style={{gap: 16}}>
          <Pressable onPress={handleSave} disabled={saving || !hasChanged} className={`h-14 rounded-2xl flex-row items-center justify-center gap-3 ${hasChanged && !saving ? 'bg-[#0a4d2b]' : 'bg-slate-200'}`}>
            {saving ? <ActivityIndicator color="#fff" /> : <CheckCircle2 size={20} color={hasChanged ? '#fff' : '#94a3b8'} />}
            <Text className={`font-black uppercase tracking-widest text-sm ${hasChanged && !saving ? 'text-white' : 'text-slate-400'}`}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} className="h-14 rounded-2xl bg-slate-100 items-center justify-center">
            <Text className="font-black uppercase tracking-widest text-sm text-slate-500">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
