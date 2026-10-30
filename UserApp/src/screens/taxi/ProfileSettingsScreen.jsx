/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/profile/ProfileSettings.jsx.
 * The web's useImageUpload hook (file input -> base64 -> uploadService.uploadImage)
 * becomes react-native-image-picker's launchImageLibrary/launchCamera with
 * includeBase64 — same uploadService.uploadImage(base64, folder) call, same
 * two-step flow (upload image, then PATCH the URL onto the profile).
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {ArrowLeft, Camera, CheckCircle2, ImagePlus, Mail, Smartphone, User} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {userAuthService} from '../../services/taxi/authService';
import uploadService from '../../services/taxi/uploadService';

const PICKER_OPTIONS = {mediaType: 'photo', includeBase64: true, maxWidth: 1024, maxHeight: 1024, quality: 0.7};

export default function ProfileSettingsScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const avatarSrc = useMemo(
    () => profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=E85D04&color=fff`,
    [name, profileImage],
  );

  useEffect(() => {
    (async () => {
      const stored = JSON.parse((await AsyncStorage.getItem('userInfo')) || '{}');
      if (stored?.name) setName(stored.name);
      if (stored?.email) setEmail(stored.email);
      if (stored?.phone) setPhone(stored.phone);
      if (stored?.profileImage) setProfileImage(stored.profileImage);

      try {
        const response = await userAuthService.getCurrentUser();
        const user = response?.data?.user || {};
        setName(user.name || stored?.name || '');
        setEmail(user.email || stored?.email || '');
        setPhone(user.phone || stored?.phone || '');
        setProfileImage(user.profileImage || stored?.profileImage || '');
        await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      } catch {
        // Keep whatever was already hydrated from the local cache.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePickedImage = async result => {
    if (result.didCancel || result.errorCode) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) return;

    const dataUrl = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
    setPhotoUploading(true);
    try {
      const uploaded = await uploadService.uploadImage(dataUrl, 'user-profiles');
      const url = uploaded.secureUrl || uploaded.url;
      setProfileImage(url);
      Toast.show({type: 'success', text1: 'Profile photo uploaded'});
    } catch {
      Toast.show({type: 'error', text1: 'Failed to upload image. Please try again.'});
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const response = await userAuthService.updateCurrentUser({name, email, profileImage});
      const user = response?.data?.user || {};
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      Toast.show({type: 'success', text1: 'Profile updated successfully'});
      navigation.navigate('TaxiProfile');
    } catch (err) {
      setSaveError(err?.message || 'Save failed');
      Toast.show({type: 'error', text1: 'Failed to update profile'});
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#cbd5e1" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 py-6 flex-row items-center gap-6 border-b border-gray-50">
        <Pressable onPress={() => navigation.navigate('TaxiProfile')} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#0f172a" />
        </Pressable>
        <View>
          <Text className="text-[11px] font-bold text-slate-400 uppercase opacity-60">Account Settings</Text>
          <Text className="text-[18px] font-bold text-slate-900 mt-1.5">Your Profile</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 20, gap: 32}}>
        <View className="items-center gap-4 py-4">
          <View className="relative">
            <View className="w-[110px] h-[110px] rounded-[42px] bg-slate-50 border border-slate-100 overflow-hidden items-center justify-center">
              <Image source={{uri: avatarSrc}} className="w-full h-full rounded-[34px]" resizeMode="cover" style={{opacity: photoUploading ? 0.5 : 1}} />
              {photoUploading && (
                <View className="absolute inset-0 items-center justify-center">
                  <ActivityIndicator color="#ea580c" />
                </View>
              )}
            </View>
            <View className="absolute -bottom-1 -right-1 bg-white p-2.5 rounded-2xl border border-slate-50">
              <Camera size={18} color="#0f172a" />
            </View>
          </View>

          <View className="flex-row gap-2 w-full max-w-[280px]">
            <Pressable
              disabled={photoUploading}
              onPress={() => launchImageLibrary(PICKER_OPTIONS, handlePickedImage)}
              className="flex-1 h-11 items-center justify-center flex-row gap-2 rounded-2xl border border-slate-200 bg-white"
              style={{opacity: photoUploading ? 0.5 : 1}}>
              <ImagePlus size={14} color="#334155" />
              <Text className="text-[11px] font-bold uppercase text-slate-700">Gallery</Text>
            </Pressable>
            <Pressable
              disabled={photoUploading}
              onPress={() => launchCamera(PICKER_OPTIONS, handlePickedImage)}
              className="flex-1 h-11 items-center justify-center flex-row gap-2 rounded-2xl bg-slate-950"
              style={{opacity: photoUploading ? 0.5 : 1}}>
              <Camera size={14} color="#fff" />
              <Text className="text-[11px] font-bold uppercase text-white">Camera</Text>
            </Pressable>
          </View>

          <Text className="text-[11px] font-semibold text-slate-400 uppercase">
            {photoUploading ? 'Uploading...' : 'Change Profile Photo'}
          </Text>
        </View>

        <View style={{gap: 24}}>
          <View style={{gap: 8}}>
            <Text className="text-[11px] font-bold text-slate-400 ml-1 uppercase">Full Name</Text>
            <View className="flex-row items-center gap-4 bg-slate-50/50 border border-slate-100 rounded-[28px] p-4 px-5">
              <User size={18} color="#94a3b8" />
              <TextInput value={name} onChangeText={setName} placeholder="Your full name" className="flex-1 text-[15px] font-bold text-slate-900" />
              {!!name && <CheckCircle2 size={16} color="#10b981" />}
            </View>
          </View>

          <View style={{gap: 8}}>
            <Text className="text-[11px] font-bold text-slate-400 ml-1 uppercase">Email Address</Text>
            <View className="flex-row items-center gap-4 bg-slate-50/50 border border-slate-100 rounded-[28px] p-4 px-5">
              <Mail size={18} color="#94a3b8" />
              <TextInput value={email} onChangeText={setEmail} placeholder="yourname@example.com" keyboardType="email-address" autoCapitalize="none" className="flex-1 text-[15px] font-bold text-slate-900" />
            </View>
          </View>

          <View style={{gap: 8}}>
            <Text className="text-[11px] font-bold text-slate-400 ml-1 uppercase">Phone Number</Text>
            <View className="flex-row items-center gap-4 bg-slate-100/50 border border-slate-50 rounded-[28px] p-4 px-5" style={{opacity: 0.7}}>
              <Smartphone size={18} color="#94a3b8" />
              <Text className="flex-1 text-[15px] font-bold text-slate-400">{phone ? `+91 ${phone}` : '+91'}</Text>
              <View className="bg-emerald-100 px-2 py-0.5 rounded-lg">
                <Text className="text-[10px] font-bold text-emerald-700 uppercase">Verified</Text>
              </View>
            </View>
          </View>
        </View>

        {!!saveError && <Text className="text-sm font-bold text-rose-500 text-center">{saveError}</Text>}
      </ScrollView>

      <View className="p-6 bg-white border-t border-gray-50">
        <Pressable onPress={handleSave} disabled={photoUploading || saving} className="bg-slate-900 h-14 rounded-[28px] items-center justify-center" style={{opacity: photoUploading || saving ? 0.5 : 1}}>
          <Text className="text-[15px] font-bold text-white">{saving ? 'Saving Changes...' : 'Save Profile'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
