/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/Referral.jsx.
 *
 * navigator.clipboard becomes @react-native-clipboard/clipboard;
 * navigator.share (with a WhatsApp-link fallback for desktops without the
 * Web Share API) becomes RN's Share.share, which already opens the native
 * share sheet WhatsApp included, so no separate wa.me fallback is needed.
 * Referral copy is rendered as plain text (buildReferralPreviewBlocks
 * already gives a stripped-HTML `.text` alongside `.html` — the web's own
 * HTML-stripping helper, so no new HTML-rendering dependency is needed).
 *
 * Dropped: the referral signup link in the share message. The web version
 * builds it from `window.location.origin`, which a mobile build has no
 * equivalent of — this repo has no configured public web-app domain to
 * point at, and this app has no deep-link/universal-link setup to make such
 * a link open the signup screen anyway. The share message still carries the
 * code itself, which is all a recipient needs to redeem it.
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, ScrollView, Share, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import {ArrowLeft, CheckCircle2, Copy, Gift, Share2} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import {userAuthService} from '../../services/taxi/authService';
import {getReferralSettingsContent} from '../../services/taxi/referralTranslationService';
import {
  DEFAULT_USER_REFERRAL_COPY,
  USER_REFERRAL_TRANSLATION_FIELDS,
  applyReferralSettingPlaceholders,
  buildReferralPreviewBlocks,
  getStoredReferralLanguageCode,
} from '../../utils/referralTranslationFields';
import {useSettings} from '../../context/SettingsContext';
import {patchStoredUser} from '../../utils/moduleAuth';

const LEGACY_BRAND_REGEX = /\bzyder\b/gi;
const replaceLegacyReferralBrand = (value, appName) => {
  const safeAppName = String(appName || '').trim() || 'App';
  return String(value || '').replace(LEGACY_BRAND_REGEX, safeAppName);
};

export default function ReferralScreen() {
  const navigation = useNavigation();
  const {settings} = useSettings();
  const [activeTab, setActiveTab] = useState('refer');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({referralCode: '', referralCount: 0});
  const [translation, setTranslation] = useState({language_code: 'en', user_referral: {...DEFAULT_USER_REFERRAL_COPY}});

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      const languageCode = await getStoredReferralLanguageCode('user');
      const stored = JSON.parse((await AsyncStorage.getItem('userInfo')) || '{}');

      try {
        const [userResponse, settingsResponse] = await Promise.all([userAuthService.getCurrentUser(), getReferralSettingsContent('user')]);
        if (!active) return;

        const user = userResponse?.data?.user || {};
        const settingsData = settingsResponse?.data || {};
        const hydratedUserReferral = applyReferralSettingPlaceholders(DEFAULT_USER_REFERRAL_COPY, settingsData);

        setProfile({referralCode: user.referralCode || stored.referralCode || '', referralCount: Number(user.referralCount || 0)});
        setTranslation({language_code: languageCode, user_referral: hydratedUserReferral});
        await patchStoredUser('taxi', {referralCode: user.referralCode || '', referralCount: Number(user.referralCount || 0)});
      } catch {
        try {
          const settingsResponse = await getReferralSettingsContent('user');
          if (!active) return;
          setTranslation({language_code: languageCode, user_referral: applyReferralSettingPlaceholders(DEFAULT_USER_REFERRAL_COPY, settingsResponse?.data || {})});
        } catch {
          // Keep local fallback state.
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const appName = settings.general?.app_name || 'App';
  const referralCode = profile.referralCode || '';
  const normalizedUserReferral = Object.fromEntries(
    Object.entries(translation.user_referral || {}).map(([key, value]) => [key, replaceLegacyReferralBrand(value, appName)]),
  );
  const bannerText = normalizedUserReferral.banner_text || `${appName} Refer and Earn`;
  const infoBlocks = buildReferralPreviewBlocks(normalizedUserReferral, USER_REFERRAL_TRANSLATION_FIELDS);

  const handleCopy = () => {
    if (!referralCode) return;
    Clipboard.setString(referralCode);
    setCopied(true);
    Toast.show({type: 'success', text1: 'Referral code copied'});
    setTimeout(() => setCopied(false), 1800);
  };

  const handleShare = async () => {
    if (!referralCode) return;
    const shareText = `${bannerText}\nUse my referral code ${referralCode} to sign up.`;
    try {
      await Share.share({message: shareText, title: bannerText});
    } catch {
      // The user dismissed the share sheet — nothing to do.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f5f7fb]">
      <View className="px-5 pt-4 pb-4 border-b border-gray-100 bg-white">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 rounded-xl border border-gray-200 bg-white items-center justify-center">
            <ArrowLeft size={18} color="#0f172a" />
          </Pressable>
          <Text className="flex-1 text-center text-[19px] font-black text-slate-900 pr-9">Referrals</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        <View className="rounded-[28px] border border-gray-200 bg-white overflow-hidden">
          <View className="px-5 py-5 flex-row items-center justify-between bg-amber-50">
            <View className="flex-1 pr-3">
              <Text className="text-[22px] font-black text-slate-900" numberOfLines={2}>{bannerText}</Text>
              <Text className="text-[11px] font-bold text-slate-500 mt-1.5">Language: {translation.language_code?.toUpperCase() || 'EN'}</Text>
            </View>
            <View className="w-12 h-12 rounded-2xl bg-indigo-600 items-center justify-center">
              <Gift size={20} color="#fff" />
            </View>
          </View>

          <View className="px-4 py-4">
            <View className="flex-row gap-2">
              <View className="flex-1 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-3 items-center">
                <Text className="text-[18px] font-semibold text-gray-900">{referralCode || 'Not available'}</Text>
                <Text className="text-[10px] uppercase font-bold text-gray-400 mt-1">Your referral code</Text>
              </View>
              <Pressable onPress={handleCopy} disabled={!referralCode} className="rounded-xl px-4 bg-slate-950 flex-row items-center gap-2" style={{opacity: referralCode ? 1 : 0.5}}>
                {copied ? <CheckCircle2 size={15} color="#fff" /> : <Copy size={15} color="#fff" />}
                <Text className="text-sm font-semibold text-white">Copy</Text>
              </Pressable>
            </View>

            <View className="flex-row gap-2 mt-3 p-1 rounded-xl bg-slate-100">
              <Pressable onPress={() => setActiveTab('refer')} className="flex-1 rounded-lg py-2 items-center" style={activeTab === 'refer' ? {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0'} : null}>
                <Text className="text-xs font-bold" style={{color: activeTab === 'refer' ? '#0f172a' : '#64748b'}}>Refer and earn</Text>
              </Pressable>
              <Pressable onPress={() => setActiveTab('history')} className="flex-1 rounded-lg py-2 items-center" style={activeTab === 'history' ? {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0'} : null}>
                <Text className="text-xs font-bold" style={{color: activeTab === 'history' ? '#0f172a' : '#64748b'}}>Referral history</Text>
              </Pressable>
            </View>
          </View>

          <View className="px-4 pb-4" style={{minHeight: 280}}>
            {loading ? (
              <View className="items-center py-16">
                <ActivityIndicator color="#0f172a" size="large" />
              </View>
            ) : activeTab === 'refer' ? (
              <View style={{gap: 16}}>
                <Text className="text-[18px] font-bold text-gray-900">How it works?</Text>
                {infoBlocks.length === 0 ? (
                  <Text className="text-sm text-slate-400">Referral content will appear here after admin updates this language.</Text>
                ) : (
                  infoBlocks.map(block => (
                    <Text key={block.key} className="text-[14px] leading-6 text-slate-800">{block.text}</Text>
                  ))
                )}
              </View>
            ) : (
              <View className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 items-center">
                <Text className="text-sm font-bold text-slate-900">Successful referrals</Text>
                <Text className="text-4xl font-extrabold text-slate-950 mt-2">{profile.referralCount}</Text>
                <Text className="text-xs text-slate-400 mt-2 text-center">Detailed referral history is not available on this screen yet.</Text>
              </View>
            )}
          </View>
        </View>

        <Pressable onPress={handleShare} disabled={!referralCode} className="w-full rounded-2xl py-4 mt-5 flex-row items-center justify-center gap-2 bg-slate-900" style={{opacity: referralCode ? 1 : 0.5}}>
          <Text className="text-sm font-bold text-white">Refer now</Text>
          <Share2 size={16} color="#fff" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
