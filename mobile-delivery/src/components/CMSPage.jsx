import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Clock, Lock, Mail, MessageSquare, Phone, ShieldCheck } from 'lucide-react-native';
import { cmsApi } from '../api/delivery';
import { openExternal } from '../lib/links';
import HtmlContent from './HtmlContent';
import { Spinner } from './Loader';
import { Press } from './ui';
import { display, poppins, shadow, tw } from '../theme';

/*
 * Port of Food/components/user/CMSPage.jsx as the delivery module renders it
 * (Poppins base, Sora headings; `p-6` -> 17.6 px; rounded-3xl cards get the
 * theme's #E5DDC3 border and card shadow).
 */

const DEFAULT_FAQS = [
  { q: 'How do I track my order?', a: "You can track your order in real-time through the 'My Orders' section in your profile." },
  { q: 'What if I receive a wrong item?', a: 'Please contact our support immediately via call or email with your order ID for a quick resolution.' },
  { q: 'Can I cancel my order?', a: 'Orders can only be cancelled before the restaurant starts preparing your food.' },
];

function parseFaq(faq) {
  let faqs = DEFAULT_FAQS;
  let hours = 'Available 24/7 for emergency support. General inquiries: 9 AM - 11 PM.';
  let privacy = 'Your conversations with our support team are encrypted and secure.';
  if (faq?.trim()) {
    const lines = faq.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed = [];
    let currentQ = null;
    for (const line of lines) {
      if (line.startsWith('Q:')) currentQ = line.substring(2).trim();
      else if (line.startsWith('A:') && currentQ) {
        parsed.push({ q: currentQ, a: line.substring(2).trim() });
        currentQ = null;
      } else if (line.startsWith('HOURS:')) hours = line.substring(6).trim();
      else if (line.startsWith('PRIVACY:')) privacy = line.substring(8).trim();
    }
    if (parsed.length > 0) faqs = parsed;
  }
  return { faqs, hours, privacy };
}

export default function CMSPage({ endpoint, title: defaultTitle, goBack }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState({ title: defaultTitle, content: '', email: '', mobile: '', faq: '' });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cmsApi
      .get(endpoint)
      .then((response) => {
        if (cancelled) return;
        const data = response.data?.data || response.data;
        if (data && typeof data === 'object') {
          const src = 'content' in data ? data : data.data && typeof data.data === 'object' && 'content' in data.data ? data.data : null;
          if (src) {
            setPageData({ title: src.title || defaultTitle, content: src.content || '', email: src.email || '', mobile: src.mobile || '', faq: src.faq || '' });
          }
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [endpoint, defaultTitle]);

  const isSupport = endpoint?.includes('support') || defaultTitle?.toLowerCase().includes('support');
  const hasActualContent = pageData.content && pageData.content.replace(/<[^>]*>/g, '').trim().length > 0;
  const { faqs, hours, privacy } = parseFaq(pageData.faq);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Spinner size={40} color="#0a4d2b" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const now = new Date();

  return (
    <View style={styles.page}>
      <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.headerRow}>
            <Press onPress={goBack} accessibilityLabel="Back" style={styles.back}>
              <ArrowLeft size={24} color={tw.gray800} />
            </Press>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{pageData.title || defaultTitle}</Text>
              <Text style={styles.subtitle}>Dima Hasao Food Information</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={[styles.card, shadow('sm')]}>
            {isSupport ? (
              <View style={{ gap: 16, marginBottom: hasActualContent ? 40 : 0 }}>
                {[
                  { Icon: Mail, title: 'Email Us', value: pageData.email, cta: 'Send Message', href: `mailto:${pageData.email}` },
                  { Icon: Phone, title: 'Call Us', value: pageData.mobile || '+91 00000 00000', cta: 'Call Now', href: `tel:${pageData.mobile}` },
                ].map(({ Icon, title, value, cta, href }) => (
                  <View key={title} style={[styles.contactCard, shadow('card')]}>
                    <View style={[styles.contactIcon, shadow('card')]}>
                      <Icon size={24} color="#0a4d2b" />
                    </View>
                    <Text style={styles.contactTitle}>{title}</Text>
                    <Text style={styles.contactValue}>{value}</Text>
                    <Press onPress={() => openExternal(href)} scale={1} accessibilityRole="link" accessibilityLabel={cta}>
                      <Text style={styles.contactCta}>{cta}</Text>
                    </Press>
                  </View>
                ))}
              </View>
            ) : null}

            {hasActualContent ? (
              // `prose` classes are inert (no typography plugin): preflight-reset HTML in the theme's font.
              <HtmlContent html={pageData.content} font="poppins" soraHeadings color="#1F1F24" />
            ) : !isSupport ? (
              <View style={styles.empty}>
                <Lock size={64} color={tw.gray100} style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No additional content available at the moment.</Text>
              </View>
            ) : null}

            {isSupport ? (
              <View style={[styles.faqWrap, { marginTop: hasActualContent ? 48 : 0 }]}>
                <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
                <View style={{ gap: 16 }}>
                  {faqs.map((faq, idx) => (
                    <View key={idx} style={[styles.faqItem, shadow('card')]}>
                      <MessageSquare size={20} color="#0a4d2b" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.faqQ}>{faq.q}</Text>
                        <Text style={styles.faqA}>{faq.a}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <View style={{ marginTop: 24, gap: 16 }}>
                  {[
                    { Icon: Clock, title: 'Operational Hours', text: hours },
                    { Icon: ShieldCheck, title: 'Data Privacy', text: privacy },
                  ].map(({ Icon, title, text }) => (
                    <View key={title} style={[styles.faqItem, shadow('card')]}>
                      <Icon size={20} color="#0a4d2b" style={{ marginTop: 2 }} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.faqQ}>{title}</Text>
                        <Text style={styles.faqA}>{text}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  loadingText: { marginTop: 16, fontSize: 10, lineHeight: 15, color: tw.gray500, letterSpacing: 1, textTransform: 'uppercase', ...poppins(700) },
  header: { backgroundColor: 'rgba(255,255,255,0.8)', borderBottomWidth: 1, borderBottomColor: tw.gray100, overflow: 'hidden' },
  headerRow: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  back: { height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  // font-black: Sora with the theme's .01em, leading-none
  title: { fontSize: 20, lineHeight: 20, color: tw.gray900, ...display(900, 20) },
  subtitle: { marginTop: 4, fontSize: 10, lineHeight: 15, color: tw.gray400, letterSpacing: 1, textTransform: 'uppercase', ...poppins(700) },
  body: { paddingHorizontal: 16, paddingVertical: 32 },
  // rounded-[2rem] p-6 (-> 17.6) border-gray-50
  card: { backgroundColor: '#fff', borderRadius: 32, padding: 17.6, borderWidth: 1, borderColor: tw.gray50 },
  contactCard: { backgroundColor: tw.gray50, padding: 17.6, borderRadius: 24, borderWidth: 1, borderColor: '#E5DDC3', alignItems: 'center' },
  contactIcon: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  contactTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, textTransform: 'uppercase', marginBottom: 8, ...display(900, 14) },
  contactValue: { fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', ...poppins(500) },
  contactCta: { marginTop: 16, fontSize: 12, lineHeight: 16, color: '#0a4d2b', textTransform: 'uppercase', ...display(900, 12) },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { color: tw.gray400, fontSize: 16, lineHeight: 24, textAlign: 'center', ...poppins(500) },
  faqWrap: { paddingTop: 40, borderTopWidth: 1, borderTopColor: tw.gray100 },
  faqTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, marginBottom: 32, ...display(900, 20) },
  faqItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, padding: 20, borderRadius: 24, backgroundColor: tw.gray50, borderWidth: 1, borderColor: '#E5DDC3' },
  faqQ: { fontSize: 12, lineHeight: 16, color: tw.gray900, textTransform: 'uppercase', ...display(900, 12) },
  faqA: { fontSize: 12, lineHeight: 19.5, color: tw.gray500, ...poppins(500) },
  footer: { marginTop: 40, textAlign: 'center', fontSize: 10, lineHeight: 16.25, color: tw.gray400, textTransform: 'uppercase', ...display(900, 10) },
});
