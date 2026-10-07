import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Copy, Gift, Share2 } from 'lucide-react-native';
import { API_ORIGIN } from '../../api/client';
import { Press } from '../../components/ui';
import { openExternal } from '../../lib/links';
import { localStore } from '../../lib/storage';
import { useNavigate } from '../../lib/webRouter';
import { outfit, playfair, shadow } from '../../theme';
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
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { CtaButton } from '../ui/Surface';

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
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <ScreenHeader title="Referrals" subtitle="Invite drivers and earn rewards" onBack={() => navigate(`${routePrefix}/profile`)} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 + insets.bottom, gap: 16 }}>
        <View style={styles.hero}>
          <View style={styles.banner}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.bannerText}>{bannerText}</Text>
              <Text style={styles.lang}>Language: {translation.language_code?.toUpperCase() || 'EN'}</Text>
            </View>
            <View style={styles.gift}>
              <Gift size={22} color={DT.accent} />
            </View>
          </View>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
            <Text style={styles.code} selectable>{referralCode || 'Not available'}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <CtaButton
              variant="cta"
              title="Copy"
              onPress={handleCopy}
              disabled={!referralCode}
              accessibilityLabel="Copy referral code"
              icon={copied ? <CheckCircle2 size={18} color={DT.ctaInk} /> : <Copy size={18} color={DT.ctaInk} />}
              style={{ flex: 1 }}
            />
            <CtaButton
              variant="outline"
              title="Share"
              onPress={handleShare}
              disabled={!referralCode}
              accessibilityLabel="Share referral"
              icon={<Share2 size={18} color={DT.ink} />}
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.linkBox}>
            <Text style={styles.linkLabel}>SHARE LINK</Text>
            <Text style={styles.link} selectable>{referralShareLink || 'Share link will appear once your referral code is ready.'}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={{ padding: 16 }}>
            <View style={styles.tabs}>
              {[['refer', 'Refer and earn'], ['history', 'Referral history']].map(([k, label]) => {
                const on = activeTab === k;
                return (
                  <Press key={k} scale={1} onPress={() => setActiveTab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} style={[styles.tab, on ? styles.tabOn : { backgroundColor: DT.bgSoft }]}>
                    <Text style={[styles.tabText, { color: on ? DT.onBrand : DT.muted }]}>{label}</Text>
                  </Press>
                );
              })}
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 16, minHeight: 340 }}>
            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 64 }} accessibilityRole="progressbar" accessibilityLabel="Loading">
                <ActivityIndicator size="large" color={DT.brand} />
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
  hero: { width: '100%', maxWidth: 448, alignSelf: 'center', borderRadius: DT.radius.xl, backgroundColor: DT.brand, padding: 20, borderWidth: 1, borderColor: DT.brandMid, ...shadow('lg') },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  bannerText: { fontSize: 24, lineHeight: 31, color: DT.gold, ...playfair(700) },
  lang: { fontSize: 11, lineHeight: 16, color: DT.onBrandMuted, marginTop: 4, ...outfit(500) },
  gift: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  codeBox: { borderRadius: DT.radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: DT.gold, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center' },
  code: { fontSize: 26, lineHeight: 34, letterSpacing: 2, color: DT.onBrand, textAlign: 'center', marginTop: 4, ...outfit(800) },
  codeLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1.2, minWidth: 140, textAlign: 'center', color: DT.onBrandMuted, ...outfit(700) },
  linkBox: { marginTop: 14, borderRadius: DT.radius.md, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 12 },
  linkLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1.2, minWidth: 90, color: DT.gold, ...outfit(700) },
  link: { marginTop: 4, fontSize: 12, lineHeight: 17, color: DT.onBrand, ...outfit(500) },
  panel: { width: '100%', maxWidth: 448, alignSelf: 'center', borderRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, overflow: 'hidden', ...shadow('sm') },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, minHeight: 44, borderRadius: DT.radius.pill, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: DT.brand },
  tabText: { fontSize: 12, lineHeight: 16, ...outfit(700) },
  how: { fontSize: 18, lineHeight: 26, color: DT.brand, ...playfair(700) },
  empty: { fontSize: 14, lineHeight: 20, color: DT.muted, ...outfit(500) },
  block: { fontSize: 14, lineHeight: 24, color: DT.inkSoft, ...outfit(500) },
  history: { borderRadius: DT.radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: DT.border, backgroundColor: DT.bg, paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center' },
  historyTitle: { fontSize: 14, lineHeight: 20, color: DT.ink, ...outfit(700) },
  historyBody: { fontSize: 12, lineHeight: 17, color: DT.muted, marginTop: 8, textAlign: 'center', ...outfit(500) },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: { backgroundColor: DT.dark, borderRadius: DT.radius.pill, paddingHorizontal: 20, paddingVertical: 12, ...shadow('xl') },
  toastText: { fontSize: 13, lineHeight: 18, color: DT.onBrand, ...outfit(700) },
});
