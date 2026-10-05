import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, Copy, Gift, Share2 } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { API_ORIGIN } from '../../../api/client';
import { localStore } from '../../../lib/storage';
import { tw } from '../../../theme';
import { getReferralSettingsContent } from '../../api/accountApi';
import { userAuthService } from '../../services/authService';
import {
  DEFAULT_USER_REFERRAL_COPY, USER_REFERRAL_TRANSLATION_FIELDS, applyReferralSettingPlaceholders,
  buildReferralPreviewBlocks, getStoredReferralLanguageCode,
} from '../referralFields';
import { useSettings } from '../../context/SettingsContext';
import { BackBtn, fo, useHeaderTop } from '../ui';

// Web: Taxi/modules/user/pages/Referral.jsx (/taxi/user/referral)

const readStored = () => {
  try {
    return JSON.parse(localStore.getItem('userInfo') || '{}') || {};
  } catch {
    return {};
  }
};

const replaceLegacyBrand = (value, appName) => String(value || '').replace(/\bzyder\b/gi, String(appName || '').trim() || 'App');

export default function Referral() {
  const top = useHeaderTop();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState('refer');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(() => {
    const s = readStored();
    return { referralCode: s.referralCode || '', referralCount: Number(s.referralCount || 0) };
  });
  const [translation, setTranslation] = useState({ language_code: 'en', user_referral: {} });
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const languageCode = getStoredReferralLanguageCode('user');
      const stored = readStored();
      try {
        const [userRes, settingsRes] = await Promise.all([userAuthService.getCurrentUser(), getReferralSettingsContent('user')]);
        const user = userRes?.data?.user || {};
        const hydrated = applyReferralSettingPlaceholders(DEFAULT_USER_REFERRAL_COPY, settingsRes?.data || {});
        setProfile({ referralCode: user.referralCode || stored.referralCode || '', referralCount: Number(user.referralCount || 0) });
        setTranslation({ language_code: languageCode, user_referral: hydrated });
        localStore.setItem('userInfo', JSON.stringify({ ...stored, referralCode: user.referralCode || '', referralCount: Number(user.referralCount || 0) }));
      } catch {
        try {
          const r = await getReferralSettingsContent('user');
          setTranslation({ language_code: languageCode, user_referral: applyReferralSettingPlaceholders(DEFAULT_USER_REFERRAL_COPY, r?.data || {}) });
        } catch {
          // keep local fallback state
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => clearTimeout(timer.current);
  }, []);

  const appName = settings.general?.app_name || 'App';
  const code = profile.referralCode || '';
  const normalized = Object.fromEntries(Object.entries(translation.user_referral || {}).map(([k, v]) => [k, replaceLegacyBrand(v, appName)]));
  const bannerText = normalized.banner_text || `${appName} Refer and Earn`;
  const blocks = buildReferralPreviewBlocks(normalized, USER_REFERRAL_TRANSLATION_FIELDS);

  const flash = () => {
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      flash();
    } catch {
      // ignore clipboard failures silently
    }
  };

  const handleShare = async () => {
    if (!code) return;
    const link = `${API_ORIGIN}/taxi/user/signup?ref=${encodeURIComponent(code)}`;
    const text = `${bannerText}\nUse my referral code ${code} to sign up.\n${link}`;
    try {
      await Share.share({ title: bannerText, message: text });
    } catch {
      // dismissed or unavailable
    }
  };

  return (
    <View style={[st.flex, { backgroundColor: '#f5f7fb' }]}>
      <View style={[st.header, { paddingTop: top }]}>
        <BackBtn style={{ borderColor: tw.gray200, backgroundColor: '#fff' }} strokeWidth={2.3} />
        <View style={[st.flex, { alignItems: 'center', paddingRight: 48 }]}>
          <Text style={st.title}>Referrals</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 112 }} showsVerticalScrollIndicator={false}>
        <View style={st.panel}>
          <LinearGradient colors={['#FEF3C7', '#FEF9C3', '#FEFCE8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.banner}>
            <View style={st.flex}>
              <Text style={st.bannerText}>{bannerText}</Text>
              <Text style={st.lang}>Language: {translation.language_code?.toUpperCase() || 'EN'}</Text>
            </View>
            <LinearGradient colors={['#8B5CF6', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.gift}>
              <Gift size={20} color="#fff" />
            </LinearGradient>
          </LinearGradient>

          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={st.codeBox}>
                <Text style={st.code}>{code || 'Not available'}</Text>
                <Text style={st.codeLabel}>Your referral code</Text>
              </View>
              <Press onPress={handleCopy} disabled={!code} style={[st.copy, !code && { opacity: 0.5 }]}>
                {copied ? <CheckCircle2 size={15} color="#fff" /> : <Copy size={15} color="#fff" />}
                <Text style={st.copyText}>Copy</Text>
              </Press>
            </View>

            <View style={st.tabs}>
              {[['refer', 'Refer and earn'], ['history', 'Referral history']].map(([k, label]) => (
                <Press key={k} onPress={() => setActiveTab(k)} scale={1} style={[st.tab, activeTab === k && st.tabOn]}>
                  <Text style={[st.tabText, { color: activeTab === k ? tw.slate900 : tw.slate500 }]}>{label}</Text>
                </Press>
              ))}
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 16, minHeight: 340 }}>
            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 64 }}><ActivityIndicator size="large" color={tw.slate900} /></View>
            ) : activeTab === 'refer' ? (
              <View style={{ gap: 16 }}>
                <Text style={st.how}>How it works?</Text>
                {blocks.length === 0 ? (
                  <Text style={{ fontSize: 14, color: tw.slate400, ...fo(400) }}>Referral content will appear here after admin updates this language.</Text>
                ) : (
                  blocks.map((b) => <Text key={b.key} style={st.block}>{b.text}</Text>)
                )}
              </View>
            ) : (
              <View style={st.history}>
                <Text style={{ fontSize: 14, color: tw.slate900, ...fo(700) }}>Successful referrals</Text>
                <Text style={{ fontSize: 36, color: tw.slate950, marginTop: 8, ...fo(800) }}>{profile.referralCount}</Text>
                <Text style={{ fontSize: 12, color: tw.slate400, marginTop: 8, textAlign: 'center', ...fo(400) }}>Detailed referral history is not available on this screen yet.</Text>
              </View>
            )}
          </View>
        </View>

        <Press onPress={handleShare} disabled={!code} style={[st.share, !code && { opacity: 0.5 }]}>
          <Text style={st.shareText}>Refer now</Text>
          <Share2 size={16} color="#fff" />
        </Press>
      </ScrollView>

      {copied ? (
        <View pointerEvents="none" style={st.toastWrap}>
          <View style={st.toast}><Text style={st.toastText}>Referral code copied</Text></View>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: tw.gray100, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' },
  title: { fontSize: 19, color: tw.slate900, ...fo(900) },
  panel: { borderRadius: 28, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' },
  banner: { paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(254,240,138,0.5)' },
  bannerText: { fontSize: 26, lineHeight: 33, color: tw.slate900, ...fo(900) },
  lang: { fontSize: 11, color: tw.slate500, marginTop: 6, ...fo(700) },
  gift: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  codeBox: { flex: 1, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray300, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center' },
  code: { fontSize: 18, letterSpacing: 0.9, color: tw.gray900, ...fo(600) },
  codeLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, marginTop: 4, ...fo(700) },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 16, backgroundColor: tw.slate950 },
  copyText: { color: '#fff', fontSize: 14, ...fo(600) },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 12, padding: 4, borderRadius: 12, backgroundColor: tw.slate100 },
  tab: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  tabOn: { backgroundColor: '#fff', borderColor: tw.slate200, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  tabText: { fontSize: 12, ...fo(700) },
  how: { fontSize: 18, color: tw.gray900, ...fo(700) },
  block: { fontSize: 14, lineHeight: 24, color: tw.slate800, ...fo(400) },
  history: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200, backgroundColor: tw.gray50, paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center' },
  share: { marginTop: 20, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: tw.slate900, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  shareText: { color: '#fff', fontSize: 14, ...fo(700) },
  toastWrap: { position: 'absolute', bottom: 96, left: 0, right: 0, alignItems: 'center' },
  toast: { backgroundColor: tw.slate900, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  toastText: { color: '#fff', fontSize: 12, ...fo(600) },
});
