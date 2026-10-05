import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight, FileText, Lock, Receipt, Truck, XCircle } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Spinner } from '../../../components/Loader';
import { Press } from '../../../components/ui';
import { events } from '../../../lib/events';
import { navigateTo } from '../../../lib/webRouter';
import api, { API_ENDPOINTS } from '../../../api/food';
import { CONSUMER_BRAND_LOGO } from '../../../shared/constants/brandLogo';
import { useCompanyName } from '../../hooks/useCompanyName';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { getCachedSettings, loadBusinessSettings } from '../../utils/businessSettings';
import { Card, CardContent } from '../../components/cart/ui';
import { poppins, shadow, tw } from '../../../theme';

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

  const bg = ['#F9FAFB', '#FFFFFF'];
  if (loading) {
    return (
      <LinearGradient colors={bg} style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: height * 0.6, paddingHorizontal: 16 }}>
          <Spinner size={32} color={tw.gray600} />
          <Text style={[styles.loading, { marginTop: 16 }]}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={bg} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Press onPress={goBack} accessibilityLabel="Back" style={[styles.back, shadow('0 2px 10px rgba(0,0,0,0.05)')]}>
            <ArrowLeft size={20} color={tw.slate800} />
          </Press>
          <Text style={styles.h1}>About</Text>
        </View>

        <Card style={[styles.infoCard, shadow('0 8px 32px rgba(59,130,246,0.08)')]}>
          <LinearGradient colors={['rgba(239,246,255,0.6)', 'rgba(255,255,255,0.4)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={{ padding: 32, alignItems: 'center' }}>
            <View style={[styles.logoWrap, shadow('0 8px 30px rgba(0,0,0,0.08)')]}>
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
            <Text style={styles.version}>{aboutData.version ? `Version ${aboutData.version}` : ' '}</Text>
            <Text style={styles.desc}>{aboutData.description ? aboutData.description : 'This page will appear once the admin adds About content.'}</Text>
          </View>
        </Card>

        <Card style={[styles.legalCard, shadow('md')]}>
          <CardContent style={{ padding: 20 }}>
            <View style={styles.legalHead}>
              <FileText size={20} color={tw.gray600} />
              <Text style={styles.legalTitle}>Legal Information</Text>
            </View>
            <View style={{ gap: 12 }}>
              {LEGAL.map(({ to, Icon, title, sub }) => (
                <Press key={to} scale={1} onPress={() => navigateTo(to)} accessibilityLabel={title} style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Icon size={20} color={tw.gray600} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{title}</Text>
                    <Text style={styles.rowSub}>{sub}</Text>
                  </View>
                  <ArrowRight size={20} color={tw.slate400} />
                </Press>
              ))}
            </View>
          </CardContent>
        </Card>

        <Text style={styles.footer}>{`© ${new Date().getFullYear()} ${companyName}. All rights reserved.`}</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 24, paddingBottom: 40 },
  loading: { fontSize: 16, lineHeight: 24, color: tw.gray600, ...poppins(400) },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  back: { height: 40, width: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.slate100 },
  h1: { marginLeft: 16, fontSize: 20, lineHeight: 28, color: tw.slate900, ...poppins(700) },
  infoCard: { borderRadius: 24, borderColor: 'rgba(219,234,254,0.5)', backgroundColor: '#fff', marginBottom: 24, overflow: 'hidden' },
  logoWrap: { backgroundColor: '#fff', borderRadius: 999, padding: 16, marginBottom: 24 },
  logo: { height: 64, width: 64, borderRadius: 32 },
  appName: { fontSize: 30, lineHeight: 36, color: tw.gray900, marginBottom: 8, textAlign: 'center', ...poppins(700) },
  tagline: { fontSize: 14, lineHeight: 20, color: tw.gray600, marginBottom: 4, ...poppins(500) },
  version: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginBottom: 16, ...poppins(400) },
  desc: { fontSize: 16, lineHeight: 26, color: tw.gray700, textAlign: 'center', ...poppins(400) },
  legalCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0 },
  legalHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  legalTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8 },
  rowIcon: { backgroundColor: tw.gray100, borderRadius: 8, padding: 8 },
  rowTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(500) },
  rowSub: { fontSize: 14, lineHeight: 20, color: tw.slate500, ...poppins(400) },
  footer: { marginTop: 32, marginBottom: 16, textAlign: 'center', fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
});
