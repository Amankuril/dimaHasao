import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Lock, Receipt, Truck, XCircle } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Spinner } from '../../../components/Loader';
import { Card, ListRow, SectionHeader } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { events } from '../../../lib/events';
import { navigateTo } from '../../../lib/webRouter';
import api, { API_ENDPOINTS } from '../../../api/food';
import { CONSUMER_BRAND_LOGO } from '../../../shared/constants/brandLogo';
import { useCompanyName } from '../../hooks/useCompanyName';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { getCachedSettings, loadBusinessSettings } from '../../utils/businessSettings';
import { PageHeader } from '../../components/profile/ProfileChrome';
import { color, radii, space, type } from '../../../theme';

const LEGAL = [
  { to: '/user/profile/terms', Icon: FileText, title: 'Terms and Conditions', sub: 'Read our terms and conditions' },
  { to: '/user/profile/privacy', Icon: Lock, title: 'Privacy Policy', sub: 'Learn how we protect your data' },
  { to: '/user/profile/refund', Icon: Receipt, title: 'Refund Policy', sub: 'Read our refund terms and conditions' },
  { to: '/user/profile/shipping', Icon: Truck, title: 'Shipping Policy', sub: 'Learn about our shipping terms' },
  { to: '/user/profile/cancellation', Icon: XCircle, title: 'Cancellation Policy', sub: 'Read our cancellation terms' },
];

/** Port of pages/user/profile/About.jsx. */
export default function About() {
  const companyName = useCompanyName();
  const goBack = useAppBackNavigation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [aboutData, setAboutData] = useState({ appName: '', version: '', description: '', logo: '', features: [], stats: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await api.get(API_ENDPOINTS.ADMIN.ABOUT_PUBLIC);
        if (!cancelled && response.data.success) setAboutData(response.data.data || {});
      } catch {
        // the card shows its placeholder text
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const loadLogo = async () => {
      const cached = getCachedSettings();
      if (cached?.logo?.url) setLogoUrl(cached.logo.url);
      else {
        const settings = await loadBusinessSettings();
        if (!cancelled && settings?.logo?.url) setLogoUrl(settings.logo.url);
      }
    };
    loadLogo();
    const handleSettingsUpdate = () => {
      const cached = getCachedSettings();
      if (cached?.logo?.url) setLogoUrl(cached.logo.url);
    };
    const off = events.on('businessSettingsUpdated', handleSettingsUpdate);
    return () => {
      cancelled = true;
      if (typeof off === 'function') off();
    };
  }, []);

  useEffect(() => setLogoFailed(false), [logoUrl]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: height * 0.6, paddingHorizontal: space.lg }} accessibilityRole="progressbar">
          <Spinner size={32} color={color.primary} />
          <Text style={[styles.loading, { marginTop: space.lg }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageHeader title="About" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }]}>
        <Card style={styles.infoCard}>
          <View style={styles.logoWrap}>
            <Image
              source={logoUrl && !logoFailed ? { uri: logoUrl } : CONSUMER_BRAND_LOGO}
              onError={() => setLogoFailed(true)}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel={`${aboutData.appName} Logo`}
            />
          </View>
          <Text style={styles.appName}>Dima Hasao Food</Text>
          <Text style={styles.tagline}>Food & Takeaway</Text>
          {aboutData.version ? <Text style={styles.version}>{`Version ${aboutData.version}`}</Text> : null}
          <Text style={styles.desc}>{aboutData.description ? aboutData.description : 'This page will appear once the admin adds About content.'}</Text>
        </Card>

        <View style={{ marginTop: space.xxl }}>
          <SectionHeader title="Legal information" />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {LEGAL.map(({ to, Icon, title, sub }, i) => (
              <ListRow key={to} icon={Icon} iconTone="neutral" title={title} subtitle={sub} onPress={() => navigateTo(to)} divider={i < LEGAL.length - 1} />
            ))}
          </Card>
        </View>

        <Text style={styles.footer}>{`© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg },
  loading: { ...type.body, color: color.textMuted },
  infoCard: { alignItems: 'center', paddingVertical: space.xxl },
  logoWrap: { backgroundColor: color.surface, borderRadius: radii.pill, borderWidth: 2, borderColor: color.gold, padding: space.md, marginBottom: space.lg },
  logo: { height: 64, width: 64, borderRadius: 32 },
  appName: { ...type.heroSerif, color: color.primary, marginBottom: space.xxs, textAlign: 'center' },
  tagline: { ...type.tagline, color: color.goldText, marginBottom: space.xs },
  version: { ...type.caption, color: color.textMuted },
  desc: { marginTop: space.md, ...type.body, color: color.textSecondary, textAlign: 'center' },
  footer: { marginTop: space.xxl, textAlign: 'center', ...type.caption, color: color.textMuted },
});
