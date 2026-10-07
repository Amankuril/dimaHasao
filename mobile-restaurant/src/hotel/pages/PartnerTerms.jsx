import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, ExternalLink, Shield } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../services/apiService';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerTerms.jsx
 * (/hotel/partner/terms). "Download PDF" has no action on the web either; the
 * gsap entrance is dropped.
 */

const Section = ({ title, children }) => (
  <View style={{ marginBottom: 32 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <View style={styles.dot} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  </View>
);

const PartnerTerms = () => {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const res = await legalService.getPage('partner', 'terms');
        if (!isMounted) return;
        setPage(res.page);
      } catch {
        if (!isMounted) return;
        setError('Using default partner agreement until admin configures legal copy.');
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <PartnerHeader title="Terms & Conditions" subtitle="Legal Agreement" />

      <ScrollView contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}>
        <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 24 }}>
          <View style={styles.card}>
            <View style={styles.head}>
              <View style={styles.headIcon}>
                <Shield size={24} color={tw.gray400} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{page?.title || 'Partner Agreement'}</Text>
                <Text style={styles.updated}>Last updated: August 15, 2024</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.warn}>
                <Text style={styles.warnText}>{error}</Text>
              </View>
            ) : null}

            {page?.content ? (
              <Section title="">{page.content}</Section>
            ) : (
              <>
                <Section title="1. Relationship with Dima Hasao">
                  By listing your property on Dima Hasao, you agree to act as an independent service provider. Dima Hasao acts solely as an intermediary platform to connect you with potential guests.
                </Section>

                <Section title="2. Payouts & Commission">
                  Dima Hasao charges a flat commission of 15% on every completed booking. Payouts are processed weekly (every Wednesday) for the previous week&apos;s check-outs, subject to a minimum withdrawal limit of ₹1,000.
                </Section>

                <Section title="3. Cancellation Policy">
                  Partners must adhere to the cancellation policy selected during property listing. Any penalties for guest cancellations will be shared as per the platform rules.
                </Section>

                <Section title="4. Quality Standards">
                  You agree to maintain the property standards as verified during onboarding. Consistent negative feedback or failure to honor bookings may result in delisting.
                </Section>
              </>
            )}

            <View style={styles.foot}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <CheckCircle size={16} color={tw.green600} />
                <Text style={styles.accepted}>You accepted these terms on 12 Aug 2024</Text>
              </View>
              <Press scale={1} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.download}>Download PDF</Text>
                <ExternalLink size={12} color={HT.primary} />
              </Press>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 32, borderRadius: 32, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32, paddingBottom: 32, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  headIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(900) },
  updated: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(400) },
  warn: { marginBottom: 24, backgroundColor: tw.amber50, borderWidth: 1, borderColor: tw.amber200, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  warnText: { fontSize: 12, lineHeight: 16, color: tw.amber800, ...poppins(400) },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: HT.primary },
  sectionTitle: { flex: 1, fontSize: 16, lineHeight: 24, color: tw.slate900, ...poppins(700) },
  sectionBody: { paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: tw.gray100 },
  sectionText: { fontSize: 12, lineHeight: 19.5, color: tw.gray500, ...poppins(400) },
  foot: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  accepted: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.green600, ...poppins(700) },
  download: { fontSize: 12, lineHeight: 16, color: HT.primary, ...poppins(700) },
});

export default PartnerTerms;
