import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Copy, Gift, Share2 } from 'lucide-react-native';
import { API_ORIGIN } from '../../api/client';
import { Press } from '../../components/ui';
import { openExternal } from '../../lib/links';
import { localStore } from '../../lib/storage';
import { useNavigate } from '../../lib/webRouter';
import { outfit, shadow, tw } from '../../theme';
import { useDriverAppSettings } from '../hooks/useDriverAppSettings';
import { getCurrentDriver } from '../services/registrationService';
import { getReferralSettingsContent } from '../services/referralTranslationService';
import {
  applyReferralSettingPlaceholders,
  buildReferralPreviewBlocks,
  DEFAULT_DRIVER_REFERRAL_COPY,
  DRIVER_REFERRAL_TRANSLATION_FIELDS,
  getStoredReferralLanguageCode,
} from '../utils/referralFields';

const readStoredDriverInfo = () => {
  try {
    return JSON.parse(localStore.getItem('driverInfo') || '{}');
  } catch {
    return {};
  }
};

const LEGACY_BRAND_REGEX = /\bzyder\b/gi;

const replaceLegacyReferralBrand = (value, appName) => {
  const safeAppName = String(appName || '').trim() || 'App';
  return String(value || '').replace(LEGACY_BRAND_REGEX, safeAppName);
};

const BLUE = '#1830b8';

/** Port of Taxi/modules/driver/pages/settings/Referral.jsx (/taxi/driver/referral). */
export default function DriverReferral() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { settings } = useDriverAppSettings();
  const routePrefix = '/taxi/driver';
  const [activeTab, setActiveTab] = useState('refer');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState(() => {
    const stored = readStoredDriverInfo();
    return {
      referralCode: stored.referralCode || '',
    };
  });
  const [translation, setTranslation] = useState({
    language_code: 'en',
    driver_referral: {
      instant_referrer_user: '',
      instant_referrer_user_and_new_user: '',
      conditional_referrer_user_ride_count: '',
      conditional_referrer_user_earnings: '',
      dual_conditional_referrer_user_and_new_user_ride_count: '',
      dual_conditional_referrer_user_and_new_user_earnings: '',
      banner_text: '',
    },
  });
  const copyTimer = useRef(null);

  const flashCopied = () => {
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  };

  useEffect(() => {
    let active = true;
    const loadDriverReferral = async () => {
      setLoading(true);
      const languageCode = getStoredReferralLanguageCode('driver');
      const stored = readStoredDriverInfo();
      try {
        const [driverResponse, settingsResponse] = await Promise.all([
          getCurrentDriver(),
          getReferralSettingsContent('driver'),
        ]);

        const driver = driverResponse?.data || {};
        const settingsData = settingsResponse?.data || {};
        const hydratedDriverReferral = applyReferralSettingPlaceholders(
          DEFAULT_DRIVER_REFERRAL_COPY,
          settingsData,
        );
        if (!active) return;

        setDriverProfile({
          referralCode: driver.referralCode || stored.referralCode || '',
        });
        setTranslation({
          language_code: languageCode,
          driver_referral: hydratedDriverReferral,
        });

        localStore.setItem(
          'driverInfo',
          JSON.stringify({
            ...stored,
            referralCode: driver.referralCode || '',
          }),
        );
      } catch {
        try {
          const settingsResponse = await getReferralSettingsContent('driver');
          if (!active) return;
          setTranslation({
            language_code: languageCode,
            driver_referral: applyReferralSettingPlaceholders(
              DEFAULT_DRIVER_REFERRAL_COPY,
              settingsResponse?.data || {},
            ),
          });
        } catch {
          // Keep local fallback state.
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDriverReferral();
    return () => {
      active = false;
      clearTimeout(copyTimer.current);
    };
  }, []);

  const appName = settings.general?.app_name || 'App';
  const referralCode = driverProfile.referralCode || '';
  const normalizedDriverReferral = Object.fromEntries(
    Object.entries(translation.driver_referral || {}).map(([key, value]) => [
      key,
      replaceLegacyReferralBrand(value, appName),
    ]),
  );
  const bannerText = normalizedDriverReferral.banner_text || `${appName} Refer and Earn`;
  const infoBlocks = buildReferralPreviewBlocks(
    normalizedDriverReferral,
    DRIVER_REFERRAL_TRANSLATION_FIELDS,
  );
  const referralShareLink = referralCode
    ? `${API_ORIGIN}/taxi/driver/reg-phone?ref=${encodeURIComponent(referralCode)}`
    : '';

  const handleCopy = async () => {
    if (!referralCode) {
      return;
    }

    try {
      await Clipboard.setStringAsync(referralCode);
      flashCopied();
    } catch {
      // Ignore clipboard failures silently.
    }
  };

  const handleShare = async () => {
    if (!referralCode) {
      return;
    }
    const shareText = `${bannerText}\nJoin as a driver with my referral link and code ${referralCode}.\n${referralShareLink}`;

    try {
      await Share.share({ title: bannerText, message: shareText });
      return;
    } catch {
      // Fall through to the clipboard / WhatsApp fallback.
    }

    try {
      await Clipboard.setStringAsync(shareText);
      flashCopied();
    } catch {
      // Ignore clipboard failures and continue to WhatsApp fallback.
    }

    openExternal(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f7fb' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 32 + insets.top, paddingBottom: 40 + insets.bottom }}>
        <View style={styles.header}>
          <Press onPress={() => navigate(`${routePrefix}/profile`)} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={18} color={tw.gray900} strokeWidth={2.3} />
          </Press>
          <Text style={styles.title} accessibilityRole="header">Referrals</Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.banner}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.bannerText}>{bannerText}</Text>
              <Text style={styles.lang}>Language: {translation.language_code?.toUpperCase() || 'EN'}</Text>
            </View>
            <View style={styles.gift}>
              <Gift size={20} color="#fff" />
            </View>
          </View>

          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={styles.codeBox}>
                <Text style={styles.code}>{referralCode || 'Not available'}</Text>
                <Text style={styles.codeLabel}>Your referral code</Text>
              </View>
              <Press scale={1} onPress={handleCopy} disabled={!referralCode} accessibilityLabel="Copy referral code" style={[styles.btn, { backgroundColor: BLUE }, !referralCode && { opacity: 0.5 }]}>
                {copied ? <CheckCircle2 size={15} color="#fff" /> : <Copy size={15} color="#fff" />}
                <Text style={styles.btnText}>Copy</Text>
              </Press>
              <Press scale={1} onPress={handleShare} disabled={!referralCode} accessibilityLabel="Share referral" style={[styles.btn, { backgroundColor: '#ef4444' }, !referralCode && { opacity: 0.5 }]}>
                <Text style={styles.btnText}>Share</Text>
                <Share2 size={15} color="#fff" />
              </Press>
            </View>

            <View style={styles.linkBox}>
              <Text style={styles.linkLabel}>SHARE LINK</Text>
              <Text style={styles.link}>{referralShareLink || 'Share link will appear once your referral code is ready.'}</Text>
            </View>

            <View style={styles.tabs}>
              {[['refer', 'Refer and earn'], ['history', 'Referral history']].map(([k, label]) => {
                const on = activeTab === k;
                return (
                  <Press key={k} scale={1} onPress={() => setActiveTab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on ? styles.tabOn : { backgroundColor: tw.gray100 }]}>
                    <Text style={[styles.tabText, { color: on ? tw.gray900 : tw.gray500 }]}>{label}</Text>
                  </Press>
                );
              })}
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 16, minHeight: 340 }}>
            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 64 }} accessibilityRole="progressbar" accessibilityLabel="Loading">
                <ActivityIndicator size="large" color={BLUE} />
              </View>
            ) : activeTab === 'refer' ? (
              <View style={{ gap: 16 }}>
                <Text style={styles.how}>How it works?</Text>
                {infoBlocks.length === 0 ? (
                  <Text style={styles.empty}>Referral content will appear here after admin updates this language.</Text>
                ) : (
                  infoBlocks.map((block) => (
                    <Text key={block.key} style={styles.block}>{block.html}</Text>
                  ))
                )}
              </View>
            ) : (
              <View style={styles.history}>
                <Text style={styles.historyTitle}>Referral history</Text>
                <Text style={styles.historyBody}>Detailed driver referral history is not available on this screen yet.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {copied ? (
        <View pointerEvents="none" style={[styles.toastWrap, { bottom: 40 + insets.bottom }]}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>Referral code copied</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  back: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  title: { fontSize: 19, lineHeight: 28.5, color: tw.gray900, ...outfit(600) },
  panel: { width: '100%', maxWidth: 448, alignSelf: 'center', borderRadius: 28, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', overflow: 'hidden', ...shadow('sm') },
  banner: { backgroundColor: BLUE, paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bannerText: { fontSize: 26, lineHeight: 32.5, color: '#fff', ...outfit(600) },
  lang: { fontSize: 11, lineHeight: 16.5, color: tw.indigo100, marginTop: 4, ...outfit(400) },
  gift: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  codeBox: { flex: 1, minWidth: 0, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray300, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center' },
  code: { fontSize: 18, lineHeight: 28, letterSpacing: 0.45, color: tw.gray900, textAlign: 'center', ...outfit(600) },
  codeLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, marginTop: 4, ...outfit(400) },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 16 },
  btnText: { fontSize: 14, lineHeight: 20, color: '#fff', ...outfit(500) },
  linkBox: { marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: tw.gray50, paddingHorizontal: 12, paddingVertical: 12 },
  linkLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1.6, color: tw.gray400, ...outfit(600) },
  link: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.gray700, ...outfit(400) },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tab: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  tabOn: { backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200 },
  tabText: { fontSize: 12, lineHeight: 16, ...outfit(500) },
  how: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...outfit(600) },
  empty: { fontSize: 14, lineHeight: 20, color: tw.gray400, ...outfit(400) },
  block: { fontSize: 14, lineHeight: 24, color: tw.gray800, ...outfit(400) },
  history: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200, backgroundColor: tw.gray50, paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center' },
  historyTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...outfit(500) },
  historyBody: { fontSize: 12, lineHeight: 16, color: tw.gray400, marginTop: 8, textAlign: 'center', ...outfit(400) },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: { backgroundColor: tw.gray900, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, ...shadow('xl') },
  toastText: { fontSize: 12, lineHeight: 16, color: '#fff', ...outfit(600) },
});
