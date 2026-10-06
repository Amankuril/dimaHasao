import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowUpRight, ChevronRight, FileText, Globe, HelpCircle, MessageCircle, Phone, Search, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { openExternal } from '../../lib/links';
import { useNavigate } from '../../lib/webRouter';
import { outfit, shadow, tw } from '../../theme';
import { useSupportInfo } from '../utils/supportInfo';

const faqs = [
  { q: 'How is payout calculated?', a: 'Based on distance + base fare + time.' },
  { q: 'What to do in an accident?', a: 'Press SOS immediately and call support.' },
  { q: 'How to change active vehicle?', a: 'Go to Vehicle Fleet and select primary.' },
];

const LEGAL = [
  { label: 'Privacy Policy', Icon: FileText },
  { label: 'Terms of Service', Icon: Globe },
];

/** Port of Taxi/modules/driver/pages/settings/Support.jsx (/taxi/driver/support). */
export default function DriverSupport() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const routePrefix = '/taxi/driver';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);
  const { phoneHref: supportPhone } = useSupportInfo();

  const openHelp = (type) => {
    if (!supportPhone) return;
    if (type === 'call') openExternal(`tel:${supportPhone}`);
    if (type === 'wa') openExternal(`https://wa.me/${supportPhone.replace(/\D/g, '')}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fb' }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: 40 + insets.top, paddingBottom: 128 + insets.bottom }}>
        <View style={styles.header}>
          <Press onPress={() => navigate(`${routePrefix}/profile`)} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={18} color={tw.slate900} />
          </Press>
          <Text style={styles.title} accessibilityRole="header">SUPPORT HUB</Text>
        </View>

        <View style={{ gap: 24 }}>
          <View style={styles.search}>
            <Search size={18} color={tw.slate300} />
            <TextInput
              value={searchQuery.toUpperCase()}
              onChangeText={setSearchQuery}
              placeholder="SEARCH ISSUES..."
              placeholderTextColor={tw.slate300}
              accessibilityLabel="Search issues"
              style={styles.searchInput}
            />
          </View>

          {supportPhone ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Press onPress={() => openHelp('wa')} accessibilityLabel="Chat on WhatsApp" style={[styles.quick, { backgroundColor: tw.emerald50, borderColor: 'rgba(0,188,125,0.1)' }]}>
                <MessageCircle size={24} color={tw.emerald500} strokeWidth={2.5} />
                <Text style={[styles.quickText, { color: tw.emerald500 }]}>CHAT ON WHATSAPP</Text>
              </Press>
              <Press onPress={() => openHelp('call')} accessibilityLabel="Speak to Agent" style={[styles.quick, { backgroundColor: tw.blue50, borderColor: 'rgba(43,127,255,0.1)' }]}>
                <Phone size={24} color={tw.blue500} strokeWidth={2.5} />
                <Text style={[styles.quickText, { color: tw.blue500 }]}>SPEAK TO AGENT</Text>
              </Press>
            </View>
          ) : null}

          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              <Text style={styles.sectionTitle}>TROUBLESHOOTING</Text>
              <View style={{ borderBottomWidth: 1, borderBottomColor: tw.slate200, paddingBottom: 2 }}>
                <Text style={styles.docs}>DOCUMENTATION</Text>
              </View>
            </View>
            <View style={{ gap: 12 }}>
              {faqs.map((faq, idx) => (
                <Press key={faq.q} scale={0.99} onPress={() => setActiveFaq(idx)} accessibilityLabel={faq.q} style={styles.faq}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                    <View style={styles.faqIcon}>
                      <HelpCircle size={18} color={tw.slate400} />
                    </View>
                    <Text style={styles.faqText}>{faq.q.toUpperCase()}</Text>
                  </View>
                  <ArrowUpRight size={18} color={tw.slate200} />
                </Press>
              ))}
            </View>
          </View>

          <View style={{ gap: 12, paddingBottom: 20 }}>
            {LEGAL.map(({ label, Icon }) => (
              <View key={label} style={styles.legal}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Icon size={16} color={tw.slate400} />
                  <Text style={styles.legalText}>{label.toUpperCase()}</Text>
                </View>
                <ChevronRight size={16} color={tw.slate400} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Dialog visible={activeFaq !== null} onClose={() => setActiveFaq(null)} blur={8} panelStyle={styles.dialog}>
        {activeFaq !== null ? (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <HelpCircle size={28} color={tw.blue500} />
              <Press onPress={() => setActiveFaq(null)} accessibilityLabel="Close" style={styles.dialogX}>
                <X size={18} color={tw.slate400} />
              </Press>
            </View>
            <Text style={styles.dialogTitle}>{faqs[activeFaq].q}</Text>
            <Text style={styles.dialogBody}>{faqs[activeFaq].a}</Text>
            <Press onPress={() => setActiveFaq(null)} accessibilityLabel="Close Topic" style={styles.dialogBtn}>
              <Text style={styles.dialogBtnText}>CLOSE TOPIC</Text>
            </Press>
          </View>
        ) : null}
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  back: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  title: { fontSize: 18, lineHeight: 28, letterSpacing: -0.9, color: tw.slate900, ...outfit(900) },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, overflow: 'hidden', ...shadow('sm') },
  searchInput: { flex: 1, padding: 0, fontSize: 9, letterSpacing: 0.9, color: tw.slate900, ...outfit(900) },
  quick: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center', gap: 8, ...shadow('sm') },
  quickText: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, textAlign: 'center', ...outfit(900) },
  sectionTitle: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, opacity: 0.6, ...outfit(900) },
  docs: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate600, ...outfit(900) },
  faq: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 20, borderRadius: 16, borderWidth: 1, borderColor: '#fff', ...shadow('sm') },
  faqIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  faqText: { flex: 1, fontSize: 13, lineHeight: 16.25, letterSpacing: -0.65, color: tw.slate900, ...outfit(900) },
  legal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  legalText: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.1, color: tw.slate400, ...outfit(900) },
  dialog: { width: '100%', maxWidth: 384, marginHorizontal: 8, backgroundColor: '#fff', padding: 28, borderRadius: 32, ...shadow('2xl') },
  dialogX: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  dialogTitle: { fontSize: 18, lineHeight: 18, letterSpacing: -0.45, color: tw.slate900, ...outfit(900) },
  dialogBody: { fontSize: 13, lineHeight: 21.1, color: tw.slate400, opacity: 0.8, ...outfit(700) },
  dialogBtn: { width: '100%', height: 48, backgroundColor: tw.slate900, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  dialogBtnText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: '#fff', ...outfit(900) },
});
