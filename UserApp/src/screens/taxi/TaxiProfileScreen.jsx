/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/Profile.jsx.
 * Dark mode is dropped, consistent with every other screen in this port.
 *
 * Dropped two menu entries: "Bus Tickets" (the bus-booking vertical was
 * never ported to this app — there's nothing for it to open) and the whole
 * "Legal" section (Terms/Privacy/Refund). Those point at static pages
 * (/terms, /privacy, /refund) on the web app's own origin, which a mobile
 * build has no equivalent of — this repo has no configured public website
 * domain to send Linking.openURL to, and guessing one isn't safe. A real
 * privacy-policy link is required for Play Store listing, so this needs a
 * real URL from the user before release.
 */
import React, {useEffect, useState} from 'react';
import {Image, Pressable, SafeAreaView, ScrollView, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Bell, ChevronRight, Gift, HelpCircle, History, LogOut, MapPin, Phone, Shield, Star, Trash2, User, Wallet} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {clearLocalUserSession, getLocalUserToken, userAuthService} from '../../services/taxi/authService';
import {clearCurrentRide} from '../../services/taxi/currentRideService';
import socketService from '../../services/taxi/socket';
import api from '../../services/taxi/axiosInstance';

const pickObject = (...values) => values.find(value => value && typeof value === 'object' && !Array.isArray(value)) || {};
const pickNumber = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const MENU_SECTIONS = [
  {
    title: 'Personal',
    items: [
      {Icon: User, title: 'Profile Settings', sub: 'Manage your personal info', route: 'ProfileSettings', bg: '#eef2ff', color: '#4f46e5'},
      {Icon: MapPin, title: 'Saved Addresses', sub: 'Home, office & others', route: 'AddressSettings', bg: '#ecfdf5', color: '#059669'},
      {Icon: History, title: 'My Rides', sub: 'Rides, parcels & trips', route: 'Activity', bg: '#eff6ff', color: '#2563eb'},
    ],
  },
  {
    title: 'Financial & Rewards',
    items: [
      {Icon: Wallet, title: 'My Wallet', sub: 'Balance & transactions', route: 'Wallet', bg: '#fffbeb', color: '#d97706'},
      {Icon: Gift, title: 'Refer & Earn', sub: 'Invite friends & get rewards', route: 'Referral', bg: '#fff1f2', color: '#e11d48'},
    ],
  },
  {
    title: 'Preferences',
    items: [
      {Icon: Bell, title: 'Notifications', sub: 'Offers & alerts', route: 'TaxiNotifications', bg: '#faf5ff', color: '#9333ea'},
      {Icon: Shield, title: 'Security & SOS', sub: 'Trust & safety settings', route: 'SOSContacts', bg: '#f0f9ff', color: '#0284c7'},
      {Icon: HelpCircle, title: 'Help & Support', sub: 'Help center & tickets', route: 'SupportTickets', bg: '#f8fafc', color: '#475569'},
    ],
  },
];

export default function TaxiProfileScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState({name: '', phone: '', profileImage: '', stats: {trips: 0, rating: 4.9, wallet: 0}});

  useEffect(() => {
    (async () => {
      const token = await getLocalUserToken();
      if (!token) {
        navigation.replace('Login');
        return;
      }

      try {
        const stored = JSON.parse((await AsyncStorage.getItem('userInfo')) || '{}');

        const [profileResult, walletResult, ridesResult] = await Promise.allSettled([
          userAuthService.getCurrentUser(),
          userAuthService.getWallet(),
          api.get('/rides', {params: {page: 1, limit: 1}}),
        ]);

        const profilePayload = profileResult.status === 'fulfilled' ? profileResult.value : {};
        const walletPayload = walletResult.status === 'fulfilled' ? walletResult.value : {};
        const ridesPayload = ridesResult.status === 'fulfilled' ? ridesResult.value : {};

        const profileData = pickObject(profilePayload?.data, profilePayload?.result, profilePayload);
        const user = pickObject(profileData?.user, profileData?.data?.user, profileData?.profile, profileData);
        const walletData = pickObject(walletPayload?.data, walletPayload?.wallet, walletPayload);
        const ridesData = pickObject(ridesPayload?.data, ridesPayload?.result, ridesPayload);
        const ridePagination = pickObject(ridesData?.pagination, ridesData?.data?.pagination);

        const dynamicTripCount = pickNumber(ridePagination.total, ridesData?.total, ridesData?.count, user.totalRides, user.total_trips, user.totalTrips, stored?.totalRides);
        const dynamicWalletBalance = pickNumber(walletData.balance, walletData.walletBalance, walletData.amount, user.walletBalance, user.wallet?.balance, user.wallet_amount, stored?.walletBalance);
        const dynamicRating = pickNumber(user.rating, user.avgRating, user.average_rating, stored?.rating, 4.9);

        setProfile({
          name: user.name || stored?.name || 'User',
          phone: user.phone || stored?.phone || '',
          profileImage: user.profileImage || user.profile_image || stored?.profileImage || '',
          stats: {trips: dynamicTripCount, rating: dynamicRating, wallet: dynamicWalletBalance},
        });
        await AsyncStorage.setItem('userInfo', JSON.stringify({...stored, ...user, walletBalance: dynamicWalletBalance, totalRides: dynamicTripCount, rating: dynamicRating}));
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    })();
  }, [navigation]);

  const handleLogout = async () => {
    await clearCurrentRide();
    socketService.disconnect();
    await clearLocalUserSession();
    navigation.replace('Login');
  };

  const initials = (profile.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <ScrollView contentContainerStyle={{paddingBottom: 48}}>
        <View className="px-6 pt-6 pb-8">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-2xl font-extrabold text-slate-900">Profile</Text>
            <Pressable onPress={() => navigation.navigate('ProfileSettings')} className="h-10 w-10 rounded-xl bg-white border border-slate-100 items-center justify-center" style={{elevation: 1}}>
              <User size={20} color="#0f172a" />
            </Pressable>
          </View>

          <View className="rounded-[32px] p-6 border border-amber-100" style={{backgroundColor: '#FFFDF0'}}>
            <View className="flex-row items-center gap-5">
              <View className="relative">
                <View className="w-20 h-20 rounded-[28px] bg-slate-950 items-center justify-center overflow-hidden border-2 border-slate-800">
                  {profile.profileImage ? (
                    <Image source={{uri: profile.profileImage}} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <Text className="text-2xl font-black text-white/40">{initials || 'U'}</Text>
                  )}
                </View>
                <View className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg border-2 border-white items-center justify-center">
                  <Star size={11} color="#fff" />
                </View>
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[22px] font-extrabold text-slate-900 capitalize" numberOfLines={1}>{profile.name}</Text>
                <View className="flex-row items-center gap-1.5 mt-1">
                  <Phone size={14} color="#94a3b8" />
                  <Text className="text-[14px] font-bold text-slate-500">{profile.phone ? `+91 ${profile.phone}` : 'Account Active'}</Text>
                </View>
              </View>
            </View>

            <View className="flex-row mt-8 pt-6 border-t border-amber-100">
              <View className="flex-1 items-center">
                <Text className="text-[10px] font-black text-slate-500">TOTAL TRIPS</Text>
                <Text className="text-[18px] font-extrabold text-slate-900 mt-1">{profile.stats.trips}</Text>
              </View>
              <View className="flex-1 items-center border-x border-amber-100">
                <Text className="text-[10px] font-black text-slate-500">RATING</Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <Star size={14} color="#facc15" fill="#facc15" />
                  <Text className="text-[18px] font-extrabold text-slate-900">{profile.stats.rating}</Text>
                </View>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-[10px] font-black text-slate-500">CREDITS</Text>
                <Text className="text-[18px] font-extrabold text-amber-600 mt-1">₹{profile.stats.wallet}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-6" style={{gap: 32}}>
          {MENU_SECTIONS.map(section => (
            <View key={section.title} style={{gap: 16}}>
              <Text className="text-[12px] font-black text-slate-400 ml-1">{section.title}</Text>
              <View className="rounded-[32px] border border-slate-100 bg-white overflow-hidden">
                {section.items.map((item, index) => (
                  <Pressable
                    key={item.title}
                    onPress={() => navigation.navigate(item.route)}
                    className="flex-row items-center gap-5 px-6 py-5"
                    style={index > 0 ? {borderTopWidth: 1, borderTopColor: '#f1f5f9'} : null}>
                    <View className="w-11 h-11 rounded-[16px] items-center justify-center" style={{backgroundColor: item.bg}}>
                      <item.Icon size={20} color={item.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-bold text-slate-900">{item.title}</Text>
                      <Text className="text-[12px] font-semibold text-slate-400 mt-0.5">{item.sub}</Text>
                    </View>
                    <View className="h-8 w-8 rounded-full bg-slate-50 items-center justify-center">
                      <ChevronRight size={18} color="#94a3b8" />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <View style={{gap: 10}}>
            <Pressable onPress={() => navigation.navigate('TaxiDeleteAccount')} className="flex-row items-center gap-4 px-6 py-4 rounded-[24px] border border-red-100 bg-white">
              <View className="w-10 h-10 rounded-xl items-center justify-center bg-red-50">
                <Trash2 size={18} color="#ef4444" />
              </View>
              <Text className="text-[14px] font-bold text-red-600">Delete account</Text>
            </Pressable>

            <Pressable onPress={handleLogout} className="h-16 rounded-[24px] bg-slate-900 flex-row items-center justify-center gap-3">
              <LogOut size={18} color="#fff" />
              <Text className="text-[15px] font-black text-white">Sign Out Securely</Text>
            </Pressable>

            <View className="items-center pt-6">
              <Text className="text-[10px] font-black text-slate-300 uppercase">Version 1.0.0</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
