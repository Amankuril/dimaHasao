import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, CircleHelp, Mail, MessageSquare, Phone } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { faqService } from '../services/apiService';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerSupport.jsx
 * (/hotel/partner/support). The FAQ answer shows and hides without the web's
 * gsap height tween; window.open / tel: / mailto: go through Linking.
 */

const open = (url) => Linking.openURL(url).catch(() => {});

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.faq}>
      <Press scale={1} onPress={() => setIsOpen(!isOpen)} style={styles.faqHead}>
        <Text style={styles.faqQ}>{question}</Text>
        <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
          <ChevronDown size={18} color={tw.gray400} />
        </View>
      </Press>
      {isOpen ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.faqA}>{answer}</Text>
        </View>
      ) : null}
    </View>
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
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <PartnerHeader title="Support Center" subtitle="We are here to help" />

      <ScrollView contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}>
        <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 24 }}>
          {/* Contact Options */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
            <Press onPress={() => open('https://wa.me/919111384535')} style={[styles.contact, { backgroundColor: HT.primary }, shadow('lg')]}>
              <MessageSquare size={24} color="#fff" />
              <Text style={[styles.contactText, { color: '#fff' }]}>WhatsApp Chat</Text>
            </Press>
            <Press onPress={() => open('tel:9111384535')} style={[styles.contact, { backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200 }, shadow('sm')]}>
              <Phone size={24} color={tw.slate900} />
              <Text style={[styles.contactText, { color: tw.slate900 }]}>Call Support</Text>
            </Press>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <CircleHelp size={18} color={tw.gray400} />
            <Text style={styles.h3}>Frequently Asked Questions</Text>
          </View>

          <View>
            {loading ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator color={HT.primary} />
              </View>
            ) : faqs.length === 0 ? (
              <Text style={styles.none}>No FAQs available.</Text>
            ) : (
              faqs.map((faq, i) => <FaqItem key={faq._id || i} question={faq.question} answer={faq.answer} />)
            )}
          </View>

          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <Text style={styles.still}>Still have questions?</Text>
            <Press onPress={() => open('mailto:partners@rokkooin.com')} scale={1} style={styles.mail}>
              <Mail size={14} color={HT.primary} />
              <Text style={styles.mailText}>Email us at partners@rokkooin.com</Text>
            </Press>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  contact: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  contactText: { fontSize: 14, lineHeight: 20, ...poppins(700) },
  h3: { fontSize: 16, lineHeight: 24, color: tw.slate900, ...poppins(900) },
  none: { padding: 32, textAlign: 'center', fontSize: 14, lineHeight: 20, color: tw.gray400, ...poppins(400) },
  faq: { borderWidth: 1, borderColor: tw.gray200, borderRadius: 16, marginBottom: 12, backgroundColor: '#fff', overflow: 'hidden' },
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 8 },
  faqQ: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(700) },
  faqA: { fontSize: 12, lineHeight: 19.5, color: tw.gray500, paddingBottom: 16, ...poppins(400) },
  still: { fontSize: 12, lineHeight: 16, color: tw.gray400, marginBottom: 8, ...poppins(400) },
  mail: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: HT.primaryBorder },
  mailText: { fontSize: 14, lineHeight: 20, color: HT.primary, ...poppins(700) },
});

export default PartnerSupport;
