import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpRight, ChevronRight, FileText, Globe, HelpCircle, MessageCircle, Phone, Search, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { openExternal } from '../../lib/links';
import { useNavigate } from '../../lib/webRouter';
import { outfit, playfair, shadow } from '../../theme';
import { useSupportInfo } from '../utils/supportInfo';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { CtaButton, SectionLabel } from '../ui/Surface';

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
  const [searchFocused, setSearchFocused] = useState(false);
  const { phoneHref: supportPhone } = useSupportInfo();

  const openHelp = (type) => {
    if (!supportPhone) return;
    if (type === 'call') openExternal(`tel:${supportPhone}`);
    if (type === 'wa') openExternal(`https://wa.me/${supportPhone.replace(/\D/g, '')}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <ScreenHeader title="Support Hub" subtitle="Get help, fast" onBack={() => navigate(`${routePrefix}/profile`)} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 32 + insets.bottom }}>
        <View style={{ gap: 24 }}>
          <View style={[styles.search, searchFocused ? { borderColor: DT.brand } : null]}>
            <Search size={18} color={DT.muted} />
            <TextInput
              value={searchQuery.toUpperCase()}
              onChangeText={setSearchQuery}
              placeholder="SEARCH ISSUES..."
              placeholderTextColor={DT.faint}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              accessibilityLabel="Search issues"
              style={styles.searchInput}
            />
          </View>

          {supportPhone ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Press onPress={() => openHelp('wa')} accessibilityLabel="Chat on WhatsApp" style={[styles.quick, { backgroundColor: DT.successSoft }]}>
                <MessageCircle size={24} color={DT.successInk} strokeWidth={2.5} />
                <Text style={[styles.quickText, { color: DT.successInk }]}>CHAT ON WHATSAPP</Text>
              </Press>
              <Press onPress={() => openHelp('call')} accessibilityLabel="Speak to Agent" style={[styles.quick, { backgroundColor: DT.infoSoft }]}>
                <Phone size={24} color={DT.info} strokeWidth={2.5} />
                <Text style={[styles.quickText, { color: DT.info }]}>SPEAK TO AGENT</Text>
              </Press>
            </View>
          ) : null}

          <View style={{ gap: 14 }}>
            <SectionLabel style={{ paddingHorizontal: 4 }}>Troubleshooting</SectionLabel>
            <View style={{ gap: 12 }}>
              {faqs.map((faq, idx) => (
                <Press key={faq.q} scale={0.99} onPress={() => setActiveFaq(idx)} accessibilityLabel={faq.q} style={styles.faq}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                    <View style={styles.faqIcon}>
                      <HelpCircle size={20} color={DT.brand} />
                    </View>
                    <Text style={styles.faqText}>{faq.q.toUpperCase()}</Text>
                  </View>
                  <ArrowUpRight size={18} color={DT.faint} />
                </Press>
              ))}
            </View>
          </View>

          <View style={{ gap: 12, paddingBottom: 20 }}>
            {LEGAL.map(({ label, Icon }) => (
              <View key={label} style={styles.legal}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Icon size={18} color={DT.brand} />
                  <Text style={styles.legalText}>{label.toUpperCase()}</Text>
                </View>
                <ChevronRight size={18} color={DT.faint} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Dialog visible={activeFaq !== null} onClose={() => setActiveFaq(null)} blur={8} panelStyle={styles.dialog}>
        {activeFaq !== null ? (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <HelpCircle size={28} color={DT.brand} />
              <Press onPress={() => setActiveFaq(null)} accessibilityLabel="Close" style={styles.dialogX}>
                <X size={18} color={DT.muted} />
              </Press>
            </View>
            <Text style={styles.dialogTitle}>{faqs[activeFaq].q}</Text>
            <Text style={styles.dialogBody}>{faqs[activeFaq].a}</Text>
            <CtaButton variant="brand" title="CLOSE TOPIC" onPress={() => setActiveFaq(null)} accessibilityLabel="Close Topic" style={{ marginTop: 8 }} />
          </View>
        ) : null}
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: DT.card, paddingHorizontal: 16, minHeight: 52, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.border, overflow: 'hidden' },
  searchInput: { flex: 1, padding: 0, minHeight: 24, fontSize: 13, letterSpacing: 0.6, color: DT.ink, ...outfit(700) },
  quick: { flex: 1, minHeight: 96, padding: 16, borderRadius: DT.radius.lg, alignItems: 'center', justifyContent: 'center', gap: 8 },
  quickText: { fontSize: 11, lineHeight: 15, letterSpacing: 0.6, textAlign: 'center', minWidth: 90, ...outfit(800) },
  faq: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: DT.card, paddingHorizontal: 16, paddingVertical: 14, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, ...shadow('sm') },
  faqIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  faqText: { flex: 1, fontSize: 13, lineHeight: 18, color: DT.ink, ...outfit(700) },
  legal: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 4 },
  legalText: { fontSize: 11, lineHeight: 16, letterSpacing: 1, minWidth: 110, color: DT.muted, ...outfit(800) },
  dialog: { width: '100%', maxWidth: 384, marginHorizontal: 8, backgroundColor: DT.card, padding: 24, borderRadius: DT.radius.xl, ...shadow('2xl') },
  dialogX: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.bgSoft, alignItems: 'center', justifyContent: 'center' },
  dialogTitle: { fontSize: 20, lineHeight: 28, color: DT.brand, ...playfair(700) },
  dialogBody: { fontSize: 14, lineHeight: 22, color: DT.inkSoft, ...outfit(500) },
});
