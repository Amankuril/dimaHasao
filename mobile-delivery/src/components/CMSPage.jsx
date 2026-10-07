import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Lock, Mail, MessageSquare, Phone, ShieldCheck } from 'lucide-react-native';
import { cmsApi } from '../api/delivery';
import { openExternal } from '../lib/links';
import HtmlContent from './HtmlContent';
import { Spinner } from './Loader';
import { Button, Card, EmptyState, ListRow, ScreenHeader, SectionHeader } from './ds';
import { color, radii, space, type } from '../theme';

/*
 * Port of Food/components/user/CMSPage.jsx, restyled on the delivery design
 * system (ScreenHeader, Cards, ListRow); content and fallbacks unchanged.
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

  const title = pageData.title || defaultTitle;
  const header = <ScreenHeader title={title} subtitle="Dima Hasao Food information" onBack={goBack} />;

  if (loading) {
    return (
      <View style={styles.page}>
        {header}
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <Spinner size={40} color={color.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const now = new Date();

  return (
    <View style={styles.page}>
      {header}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space.xxxl + insets.bottom }]}>
        {isSupport ? (
          <View>
            <SectionHeader title="Contact us" />
            <Card padded={false}>
              {[
                { Icon: Mail, title: 'Email us', value: pageData.email, cta: 'Send Message', ctaLabel: 'Send message', href: `mailto:${pageData.email}` },
                { Icon: Phone, title: 'Call us', value: pageData.mobile || '+91 00000 00000', cta: 'Call Now', ctaLabel: 'Call now', href: `tel:${pageData.mobile}` },
              ].map(({ Icon, title: rowTitle, value, cta, ctaLabel, href }, i) => (
                <ListRow
                  key={rowTitle}
                  icon={Icon}
                  tone="primary"
                  title={rowTitle}
                  subtitle={value || undefined}
                  divider={i === 0}
                  right={
                    <Button
                      title={ctaLabel}
                      size="sm"
                      variant="secondary"
                      fullWidth={false}
                      onPress={() => openExternal(href)}
                      accessibilityLabel={cta}
                    />
                  }
                />
              ))}
            </Card>
          </View>
        ) : null}

        {hasActualContent ? (
          <Card>
            {/* `prose` classes are inert (no typography plugin): preflight-reset HTML in the theme's font. */}
            <HtmlContent html={pageData.content} font="poppins" soraHeadings color={color.text} />
          </Card>
        ) : !isSupport ? (
          <Card padded={false}>
            <EmptyState icon={Lock} title="Nothing here yet" message="No additional content available at the moment." />
          </Card>
        ) : null}

        {isSupport ? (
          <>
            <View>
              <SectionHeader title="Frequently asked questions" />
              <Card padded={false}>
                {faqs.map((faq, idx) => (
                  <InfoRow key={idx} Icon={MessageSquare} title={faq.q} text={faq.a} divider={idx < faqs.length - 1} />
                ))}
              </Card>
            </View>
            <Card padded={false}>
              <InfoRow Icon={Clock} title="Operational hours" text={hours} divider />
              <InfoRow Icon={ShieldCheck} title="Data privacy" text={privacy} />
            </Card>
          </>
        ) : null}

        <Text style={styles.footer}>
          {`Last updated: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n© ${now.getFullYear()} Dima Hasao Food. All rights reserved.`}
        </Text>
      </ScrollView>
    </View>
  );
}

/** Icon + bold line + supporting paragraph, for FAQs and service notes. */
function InfoRow({ Icon, title, text, divider }) {
  return (
    <View style={[styles.infoRow, divider && styles.infoDivider]}>
      <View style={styles.infoIcon}>
        <Icon size={20} color={color.primary} strokeWidth={2} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoBody}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.lg },
  loadingText: { ...type.small, color: color.textMuted },
  content: { padding: space.lg, gap: space.xxl },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  infoDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  infoIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, minWidth: 0, gap: space.xs },
  infoTitle: { ...type.bodyStrong, color: color.text },
  infoBody: { ...type.small, color: color.textSecondary },
  footer: { ...type.caption, color: color.textMuted, textAlign: 'center' },
});
