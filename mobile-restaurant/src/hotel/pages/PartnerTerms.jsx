import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle, ExternalLink, Shield } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Card } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../services/apiService';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerTerms.jsx
 * (/hotel/partner/terms). "Download PDF" has no action on the web either; the
 * gsap entrance is dropped.
 */

const Section = ({ title, children }) => (
  <View style={{ marginBottom: space.xl }}>
    {title ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
        <View style={styles.dot} />
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
      </View>
    ) : null}
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
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader title="Terms & Conditions" subtitle="Legal Agreement" />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl + insets.bottom }}>
        <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center', padding: space.lg }}>
          <Card style={styles.card}>
            <View style={styles.head}>
              <View style={styles.headIcon}>
                <Shield size={24} color={color.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title}>{page?.title || 'Partner Agreement'}</Text>
                <Text style={styles.updated}>Last updated: August 15, 2024</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.warn}>
                <AlertTriangle size={18} color={color.warning} />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <CheckCircle size={16} color={color.success} />
                <Text style={styles.accepted}>You accepted these terms on 12 Aug 2024</Text>
              </View>
              <Press scale={1} accessibilityLabel="Download PDF" style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, alignSelf: 'flex-start' }}>
                <Text style={styles.download}>Download PDF</Text>
                <ExternalLink size={14} color={color.primary} />
              </Press>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: space.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xl, paddingBottom: space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  headIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.heading, color: color.text },
  updated: { ...type.caption, color: color.textMuted },
  warn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xl, backgroundColor: color.warningSoft, borderRadius: radii.md, padding: space.md },
  warnText: { flex: 1, ...type.small, color: color.text },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.gold },
  sectionTitle: { flex: 1, ...type.subheading, color: color.text },
  sectionBody: { paddingLeft: space.md + 2, borderLeftWidth: 2, borderLeftColor: color.border },
  sectionText: { ...type.body, color: color.textSecondary },
  foot: { marginTop: space.md, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, gap: space.sm },
  accepted: { flex: 1, ...type.label, color: color.success },
  download: { ...type.label, color: color.primary },
});

export default PartnerTerms;
