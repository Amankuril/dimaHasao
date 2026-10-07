import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Info } from 'lucide-react-native';
import { Card } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../services/apiService';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerAbout.jsx
 * (/hotel/partner/about). The gsap entrance is dropped.
 */

const PartnerAbout = () => {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const res = await legalService.getPage('partner', 'about');
        if (!isMounted) return;
        setPage(res.page);
      } catch {
        if (!isMounted) return;
        setError('About content is not configured yet. Showing default copy.');
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const content =
    page?.content ||
    'Dima Hasao Partner is designed to help hotels, resorts, homestays and lodges manage inventory, bookings and payouts with a mobile-first dashboard.';
  const paragraphs = typeof content === 'string' ? content.split('\n').filter(Boolean) : [];

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader title="About Dima Hasao Partner" subtitle="Platform overview" />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl + insets.bottom }}>
        <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center', padding: space.lg }}>
          {error ? (
            <View style={styles.warn}>
              <AlertTriangle size={18} color={color.warning} />
              <Text style={styles.warnText}>{error}</Text>
            </View>
          ) : null}

          <Card style={styles.card}>
            <View style={styles.head}>
              <View style={styles.headIcon}>
                <Info size={20} color={color.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title}>{page?.title || 'Built for hospitality partners'}</Text>
                <Text style={styles.sub}>Mobile-first control center for your property business.</Text>
              </View>
            </View>

            <View style={{ gap: space.md }}>
              {paragraphs.length > 0 ? paragraphs.map((p, idx) => <Text key={idx} style={styles.text}>{p}</Text>) : <Text style={styles.text}>{String(content)}</Text>}
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  warn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg, backgroundColor: color.warningSoft, borderRadius: radii.md, padding: space.md },
  warnText: { flex: 1, ...type.small, color: color.text },
  card: { padding: space.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg, paddingBottom: space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  headIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.heading, color: color.text },
  sub: { ...type.small, color: color.textMuted },
  text: { ...type.body, color: color.textSecondary },
});

export default PartnerAbout;
