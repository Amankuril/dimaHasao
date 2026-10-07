import { useEffect, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, Copy, Gift, Share2, Users } from 'lucide-react-native';
import { Button, Card, SegmentedControl } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { API_ORIGIN } from '../../../api/client';
import { localStore } from '../../../lib/storage';
import { color, elevation, radii, space, type } from '../../../theme';
import { getReferralSettingsContent } from '../../api/accountApi';
import { userAuthService } from '../../services/authService';
import {
  DEFAULT_USER_REFERRAL_COPY, USER_REFERRAL_TRANSLATION_FIELDS, applyReferralSettingPlaceholders,
  buildReferralPreviewBlocks, getStoredReferralLanguageCode,
} from '../referralFields';
import { useSettings } from '../../context/SettingsContext';
import { LoadingState, PageTitle, useNavPad } from '../ui';

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
  const bottomPad = useNavPad(space.xxl);
  const toastBottom = NAV_CLEARANCE + useSafeAreaInsets().bottom + space.md;
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
    <View style={st.flex}>
      <PageTitle title="Referrals" subtitle="Invite friends and earn rewards" />

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <View style={st.hero}>
          <View style={st.grow}>
            <Text style={[type.heading, { color: color.textInverse }]}>{bannerText}</Text>
            <Text style={[type.caption, { color: color.textOnDarkMuted, marginTop: space.xs }]}>Language: {translation.language_code?.toUpperCase() || 'EN'}</Text>
          </View>
          <View style={st.gift}>
            <Gift size={22} color={color.onGold} />
          </View>
        </View>

        <Card style={{ gap: space.md }}>
          <Text style={[type.label, { color: color.textMuted }]}>Your referral code</Text>
          <View style={st.codeRow}>
            <View style={st.codeBox} accessible accessibilityLabel={code ? `Your referral code ${code}` : 'Referral code not available'}>
              <Text style={[st.code, !code && { color: color.textMuted }]} numberOfLines={1} selectable>
                {code || 'Not available'}
              </Text>
            </View>
            <Button
              title={copied ? 'Copied' : 'Copy'}
              icon={copied ? CheckCircle2 : Copy}
              variant="secondary"
              fullWidth={false}
              disabled={!code}
              accessibilityLabel="Copy referral code"
              onPress={handleCopy}
            />
          </View>
        </Card>

        <SegmentedControl
          options={[{ value: 'refer', label: 'Refer and earn' }, { value: 'history', label: 'Referral history' }]}
          value={activeTab}
          onChange={setActiveTab}
        />

        <Card style={st.body}>
          {loading ? (
            <LoadingState />
          ) : activeTab === 'refer' ? (
            <View style={{ gap: space.md }}>
              <Text style={[type.subheading, { color: color.text }]} accessibilityRole="header">How it works</Text>
              {blocks.length === 0 ? (
                <Text style={[type.body, { color: color.textMuted }]}>Referral content will appear here after admin updates this language.</Text>
              ) : (
                blocks.map((b) => (
                  <View key={b.key} style={st.block}>
                    <View style={st.bullet} />
                    <Text style={[type.body, st.grow, { color: color.textSecondary }]}>{b.text}</Text>
                  </View>
                ))
              )}
            </View>
          ) : (
            <View style={st.history}>
              <Users size={24} color={color.primary} />
              <Text style={[type.bodyStrong, { color: color.text }]}>Successful referrals</Text>
              <Text style={[type.priceLg, { color: color.text }]}>{profile.referralCount}</Text>
              <Text style={[type.small, { color: color.textMuted, textAlign: 'center' }]}>Detailed referral history is not available on this screen yet.</Text>
            </View>
          )}
        </Card>

        <Button title="Refer now" iconRight={Share2} size="lg" disabled={!code} onPress={handleShare} />
      </ScrollView>

      {copied ? (
        <View pointerEvents="none" style={[st.toastWrap, { bottom: toastBottom }]}>
          <View style={st.toast} accessibilityLiveRegion="polite">
            <CheckCircle2 size={16} color={color.textInverse} />
            <Text style={[type.label, { color: color.textInverse }]}>Referral code copied</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.xl, borderRadius: radii.lg, backgroundColor: color.primaryDeep, ...elevation.card },
  gift: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.goldBright, alignItems: 'center', justifyContent: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  codeBox: { flex: 1, minWidth: 0, height: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.gold, backgroundColor: color.goldSoft },
  code: { ...type.subheading, color: color.text },
  body: { minHeight: 200 },
  block: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.gold, marginTop: 8 },
  history: { alignItems: 'center', gap: space.xs, paddingVertical: space.xl },
  toastWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.primaryDeep, borderRadius: radii.md, paddingHorizontal: space.lg, paddingVertical: space.md, ...elevation.float },
});
