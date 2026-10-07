import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield } from 'lucide-react-native';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../services/apiService';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerPrivacy.jsx
 * (/hotel/partner/privacy). The gsap entrance is dropped.
 */

const PartnerPrivacy = () => {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const res = await legalService.getPage('partner', 'privacy');
        if (!isMounted) return;
        setPage(res.page);
      } catch {
        if (!isMounted) return;
        setError('Privacy content is not configured yet. Showing default copy.');
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const content =
    page?.content ||
    'We store and process your property data, bookings and payout information securely, and only use it to power your dashboard and payments.';
  const paragraphs = typeof content === 'string' ? content.split('\n').filter(Boolean) : [];

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <PartnerHeader title="Privacy Policy" subtitle="How we handle partner data" />

      <ScrollView contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}>
        <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 24 }}>
          {error ? (
            <View style={styles.warn}>
              <Text style={styles.warnText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.head}>
              <View style={styles.headIcon}>
                <Shield size={20} color={tw.gray500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{page?.title || 'Partner data and privacy'}</Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              {paragraphs.length > 0 ? paragraphs.map((p, idx) => <Text key={idx} style={styles.text}>{p}</Text>) : <Text style={styles.text}>{String(content)}</Text>}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  warn: { marginBottom: 16, backgroundColor: tw.amber50, borderWidth: 1, borderColor: tw.amber200, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  warnText: { fontSize: 12, lineHeight: 16, color: tw.amber800, ...poppins(400) },
  card: { backgroundColor: '#fff', padding: 32, borderRadius: 32, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  headIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(900) },
  text: { fontSize: 12, lineHeight: 19.5, color: tw.gray500, ...poppins(400) },
});

export default PartnerPrivacy;
