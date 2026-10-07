import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, CircleHelp, Mail, MessageSquare, Phone } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Button, Card, EmptyState, SectionHeader } from '../../components/ds';
import { color, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { faqService } from '../services/apiService';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerSupport.jsx
 * (/hotel/partner/support). The FAQ answer shows and hides without the web's
 * gsap height tween; window.open / tel: / mailto: go through Linking.
 */

const open = (url) => Linking.openURL(url).catch(() => {});

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <Press scale={1} onPress={() => setIsOpen(!isOpen)} accessibilityState={{ expanded: isOpen }} accessibilityLabel={question} style={styles.faqHead}>
        <Text style={styles.faqQ}>{question}</Text>
        <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
          <ChevronDown size={18} color={color.textMuted} />
        </View>
      </Press>
      {isOpen ? <Text style={styles.faqA}>{answer}</Text> : null}
    </Card>
  );
};

const PartnerSupport = () => {
  const insets = useSafeAreaInsets();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const data = await faqService.getFaqs('partner');
        setFaqs(data);
      } catch {
        console.error('Failed to fetch FAQs');
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader title="Support Center" subtitle="We are here to help" />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl + insets.bottom }}>
        <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center', padding: space.lg, gap: space.md }}>
          {/* Contact Options */}
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button title="WhatsApp chat" icon={MessageSquare} onPress={() => open('https://wa.me/919111384535')} style={{ flex: 1 }} />
            <Button title="Call support" icon={Phone} variant="outline" onPress={() => open('tel:9111384535')} style={{ flex: 1 }} />
          </View>

          <SectionHeader title="Frequently asked questions" style={{ marginTop: space.lg, marginBottom: 0 }} />

          {loading ? (
            <View style={{ padding: space.xxxl, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={color.primary} />
            </View>
          ) : faqs.length === 0 ? (
            <EmptyState icon={CircleHelp} title="No FAQs available." />
          ) : (
            faqs.map((faq, i) => <FaqItem key={faq._id || i} question={faq.question} answer={faq.answer} />)
          )}

          <View style={{ marginTop: space.xl, alignItems: 'center' }}>
            <Text style={styles.still}>Still have questions?</Text>
            <Press onPress={() => open('mailto:partners@rokkooin.com')} scale={1} accessibilityLabel="Email partners@rokkooin.com" style={styles.mail}>
              <Mail size={16} color={color.primary} />
              <Text style={styles.mailText}>Email us at partners@rokkooin.com</Text>
            </Press>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, gap: space.sm, minHeight: 56 },
  faqQ: { flex: 1, ...type.bodyStrong, color: color.text },
  faqA: { ...type.small, color: color.textSecondary, paddingHorizontal: space.lg, paddingBottom: space.lg },
  still: { ...type.small, color: color.textMuted },
  mail: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  mailText: { ...type.label, color: color.primary, textDecorationLine: 'underline' },
});

export default PartnerSupport;
