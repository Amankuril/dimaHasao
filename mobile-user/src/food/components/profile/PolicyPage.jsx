import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import api, { API_ENDPOINTS } from '../../../api/food';
import HtmlContent from '../../../components/HtmlContent';
import { Spinner } from '../../../components/Loader';
import { Card, IconButton } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { navigateTo, useLocation } from '../../../lib/webRouter';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { color, space, type } from '../../../theme';

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
      <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel="Loading">
        <Spinner size={40} color={color.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const now = new Date();
  return (
    <View style={styles.page}>
      <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}>
        <View style={styles.header}>
          <IconButton icon={ArrowLeft} label="Back" variant="soft" onPress={handleBack} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
              {data.title || defaultTitle}
            </Text>
            <Text style={styles.subtitle}>Dima Hasao Food Ecosystem</Text>
          </View>
        </View>
        <View style={styles.body}>
          <Card style={{ padding: space.xl }}>
            {data.content ? (
              <HtmlContent html={data.content} font="poppins" soraHeadings color={color.textSecondary} />
            ) : (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <EmptyIcon size={28} color={color.primary} />
                </View>
                <Text style={styles.emptyText}>No content available at the moment.</Text>
              </View>
            )}
          </Card>
          <Text style={styles.footer}>
            {`Last updated: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n© ${now.getFullYear()} Dima Hasao Food. All Rights Reserved.`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, backgroundColor: color.bg, gap: space.lg },
  loadingText: { ...type.small, color: color.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  title: { ...type.heading, color: color.text },
  subtitle: { ...type.caption, color: color.textMuted },
  body: { padding: space.lg },
  empty: { alignItems: 'center', paddingVertical: space.xxxl * 2, gap: space.lg },
  emptyIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...type.body, color: color.textMuted, textAlign: 'center' },
  footer: { marginTop: space.xxl, textAlign: 'center', ...type.caption, color: color.textMuted },
});
