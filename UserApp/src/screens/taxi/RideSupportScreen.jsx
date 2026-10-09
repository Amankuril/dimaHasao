/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/ride/Support.jsx.
 */
import React from 'react';
import {Linking, Pressable, SafeAreaView, ScrollView, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AlertCircle, ArrowLeft, ChevronRight, HelpCircle, MessageCircle, Phone, ShieldCheck, Siren, XCircle} from 'lucide-react-native';
import useSupportInfo from '../../hooks/useSupportInfo';

const HELP_TOPICS = [
  {title: "Driver didn't arrive", Icon: XCircle, color: '#f43f5e'},
  {title: 'Safety concern', Icon: ShieldCheck, color: '#2563eb'},
  {title: 'I lost an item', Icon: HelpCircle, color: '#f97316'},
  {title: 'Payment failure', Icon: AlertCircle, color: '#334155'},
];

export default function RideSupportScreen() {
  const navigation = useNavigation();
  const supportInfo = useSupportInfo();

  const openSupportChat = (topicTitle = '') => {
    navigation.navigate('RideChat', {initialDraft: topicTitle ? `Hi, I need help with: ${topicTitle}.` : ''});
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 px-5 py-4 border-b border-slate-50">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color="#0f172a" />
        </Pressable>
        <View>
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support</Text>
          <Text className="text-[18px] font-black text-slate-900">Help & Support</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 20, gap: 16}}>
        <View className="gap-3">
          <Pressable onPress={() => openSupportChat()} className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
            <View className="w-11 h-11 rounded-2xl bg-orange-50 items-center justify-center">
              <MessageCircle size={20} color="#ea580c" />
            </View>
            <View>
              <Text className="text-[13px] font-black text-slate-900">Live chat</Text>
              <Text className="text-[11px] font-bold text-slate-500">Get quick help</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => supportInfo.phoneHref && Linking.openURL(`tel:${supportInfo.phoneHref}`)}
            className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
            <View className="w-11 h-11 rounded-2xl bg-indigo-50 items-center justify-center">
              <Phone size={20} color="#4f46e5" />
            </View>
            <View>
              <Text className="text-[13px] font-black text-slate-900">Call support</Text>
              <Text className="text-[11px] font-bold text-slate-500">Talk to us</Text>
            </View>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('SOSContacts')} className="flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
            <View className="w-11 h-11 rounded-2xl bg-rose-50 items-center justify-center">
              <Siren size={20} color="#e11d48" />
            </View>
            <View>
              <Text className="text-[13px] font-black text-slate-900">Emergency SOS</Text>
              <Text className="text-[11px] font-bold text-slate-500">Get safety help fast</Text>
            </View>
          </Pressable>
        </View>

        <View>
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Choose a topic</Text>
          <View className="gap-2.5">
            {HELP_TOPICS.map(topic => (
              <Pressable
                key={topic.title}
                onPress={() => openSupportChat(topic.title)}
                className="flex-row items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-2xl items-center justify-center" style={{backgroundColor: `${topic.color}15`}}>
                    <topic.Icon size={18} color={topic.color} />
                  </View>
                  <Text className="text-[14px] font-black text-slate-900">{topic.title}</Text>
                </View>
                <ChevronRight size={16} color="#cbd5e1" />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
