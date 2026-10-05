import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import api, { API_ENDPOINTS } from '../../../api/food';
import HtmlContent from '../../../components/HtmlContent';
import { Spinner } from '../../../components/Loader';
import { Press } from '../../../components/ui';
import { navigateTo, useLocation } from '../../../lib/webRouter';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { F } from '../shell';
import { poppins, shadow, tw } from '../../../theme';

/*
 * Shared body of pages/user/profile/{Refund,Shipping,Cancellation}.jsx: they differ
 * only in endpoint, default title and the empty-state icon.
 * Cancellation also honours location.state.returnTo (the web's handleBack).
 */
export default function PolicyPage({ endpointKey, defaultTitle, EmptyIcon, honourReturnTo = false }) {
  const goBack = useAppBackNavigation();
  const location = useLocation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ title: defaultTitle, content: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await api.get(API_ENDPOINTS.ADMIN[endpointKey]);
        if (!cancelled && response.data.success) setData(response.data.data || { title: defaultTitle, content: '' });
      } catch {
        // the page then shows its empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpointKey, defaultTitle]);

  const handleBack = () => {
    const state = location.state;
    if (honourReturnTo && state?.returnTo) navigateTo(state.returnTo, { state: state.originalState, replace: true });
    else goBack();
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Spinner size={40} color={F.green} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const now = new Date();
  return (
    <View style={styles.page}>
      <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Press onPress={handleBack} accessibilityLabel="Back" style={styles.back}>
              <ArrowLeft size={24} color={tw.gray900} />
            </Press>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{data.title || defaultTitle}</Text>
              <Text style={styles.subtitle}>Dima Hasao Food Ecosystem</Text>
            </View>
          </View>
        </View>
        <View style={styles.body}>
          <View style={[styles.card, shadow('sm')]}>
            {data.content ? (
              <HtmlContent html={data.content} font="poppins" soraHeadings color="#4A5565" />
            ) : (
              <View style={styles.empty}>
                <EmptyIcon size={64} color={tw.gray100} style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No content available at the moment.</Text>
              </View>
            )}
          </View>
          <Text style={styles.footer}>
            {`Last updated: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} \n© ${now.getFullYear()} Dima Hasao Food. All Rights Reserved.`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff', gap: 16 },
  loadingText: { fontSize: 12, lineHeight: 16, color: tw.gray500, letterSpacing: 1.2, textTransform: 'uppercase', ...poppins(700) },
  header: { backgroundColor: 'rgba(255,255,255,0.95)', borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  headerRow: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  back: { height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 20, color: tw.gray900, letterSpacing: -0.5, ...poppins(900) },
  subtitle: { marginTop: 4, fontSize: 10, lineHeight: 15, color: tw.gray400, letterSpacing: 1, textTransform: 'uppercase', ...poppins(700) },
  body: { paddingHorizontal: 16, paddingVertical: 32 },
  card: { backgroundColor: '#fff', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: tw.gray50 },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { color: tw.gray400, fontSize: 16, lineHeight: 24, textAlign: 'center', ...poppins(500) },
  footer: { marginTop: 40, textAlign: 'center', fontSize: 10, lineHeight: 16.25, color: tw.gray400, textTransform: 'uppercase', letterSpacing: 2, ...poppins(900) },
});
