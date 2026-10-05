import { useEffect, useState } from 'react';
import { LayoutAnimation, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { SelectField } from '../../components/kit';
import { Header, PatternDivider } from '../../components/dh/Header';
import { Field, FormScroll, GreenButton, Panel, PanelTitle, dhs } from '../../components/dh/ui';
import { useBooking } from '../../context/BookingContext';
import { fetchMySupportTickets, raiseSupportTicket } from '../../api/dh/supportApi';
import { openExternal } from '../../lib/links';
import { dh, poppins, tw } from '../../theme';

// Web: DimaHasao/pages/HelpSupportScreen.jsx (/app/support)

const HELPLINES = [
  { title: 'Police Control Room', number: '112', icon: 'fa-solid fa-shield', bg: tw.red600 },
  { title: 'Haflong Civil Hospital', number: '03673-236222', icon: 'fa-solid fa-hospital', bg: tw.emerald700 },
  { title: 'Tourist Police Helpline', number: '+91 94350 99999', icon: 'fa-solid fa-person-military-pointing', bg: tw.blue600 },
  { title: 'Disaster Emergency (DDMA)', number: '1077', icon: 'fa-solid fa-triangle-exclamation', bg: tw.amber600 },
];

const CATEGORIES = [
  { value: 'Taxi', label: 'Taxi / Ride Booking Issue' },
  { value: 'Hotel', label: 'Hotel / Homestay Stay Issue' },
  { value: 'Food', label: 'Food Order / Delivery Delay' },
  { value: 'Tour', label: 'Tour Package & Guide Issue' },
  { value: 'Payment', label: 'Payment / Refund Query' },
];

const FAQS = [
  {
    q: 'How does Start/End ride OTP work for Taxi bookings?',
    a: 'When your assigned driver arrives at the pickup point, share the 4-digit Ride Start OTP shown in your "My Bookings" screen. Once verified on the driver app, the trip begins.',
  },
  {
    q: 'Can I cancel my hotel or tour booking?',
    a: 'Yes, most hotels offer free cancellation up to 24-48 hours before check-in. Check the specific hotel or tour package policy on the booking receipt.',
  },
  {
    q: 'How do I reach Haflong from Guwahati?',
    a: 'You can take the scenic VistaDome hill train from Guwahati to Haflong Railway Station (approx. 5 hours) or travel by private taxi via NH-27.',
  },
  {
    q: 'Are payments secure on this platform?',
    a: 'All digital transactions (UPI, Cards, Net Banking) are encrypted and verified through RBI-compliant secure payment gateways.',
  },
];

export default function HelpSupportScreen() {
  const { user, showToast } = useBooking();
  const [activeFaq, setActiveFaq] = useState(null);
  const [ticketCategory, setTicketCategory] = useState('Taxi');
  const [complaintText, setComplaintText] = useState('');
  const [isTicketSubmitted, setIsTicketSubmitted] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState([]);

  // The customer's own history, across every service.
  useEffect(() => {
    if (!user?.isLoggedIn) return;
    fetchMySupportTickets()
      .then(setMyTickets)
      .catch(() => setMyTickets([]));
  }, [user?.isLoggedIn, isTicketSubmitted]);

  const handleCreateTicket = async () => {
    if (submitting) return undefined;
    if (!complaintText.trim()) return showToast('Please describe your concern');
    if (!user?.isLoggedIn) {
      showToast('Please sign in so we can follow up on your ticket');
      return router.push('/app/login');
    }
    try {
      setSubmitting(true);
      const { ticket } = await raiseSupportTicket({ category: ticketCategory, description: complaintText.trim() });
      setGeneratedTicketId(ticket.ticketCode);
      setIsTicketSubmitted(true);
      setComplaintText('');
      showToast(`Support ticket ${ticket.ticketCode} raised`);
    } catch (error) {
      showToast(error?.response?.data?.message || 'We could not raise that ticket. Try again.');
    } finally {
      setSubmitting(false);
    }
    return undefined;
  };

  return (
    <View style={dhs.page}>
      <Header title="HELP & SUPPORT" subtitle="24/7 Tourist assistance, FAQs & SOS emergency" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <FormScroll contentContainerStyle={{ padding: 14, gap: 16 }} bottomSpace={40}>
        <Panel style={{ gap: 12, borderColor: tw.red200 }}>
          <View style={[dhs.row, { justifyContent: 'space-between', gap: 8 }]}>
            <View style={[dhs.row, { gap: 6, flexShrink: 1 }]}>
              <Fa name="fa-solid fa-phone-volume" size={14} color={tw.red600} />
              <Text style={[dhs.h3, { color: tw.red700 }]}>Emergency Hotlines (1-Tap Call)</Text>
            </View>
            <Text style={styles.active}>24×7 Active</Text>
          </View>
          <View style={styles.grid}>
            {HELPLINES.map((item) => (
              <View key={item.title} style={styles.cell}>
                <Press scale={0.97} onPress={() => openExternal(`tel:${item.number.replace(/\s+/g, '')}`)} style={styles.helpline} accessibilityRole="link" accessibilityLabel={`Call ${item.title}, ${item.number}`}>
                  <View style={[styles.helplineIcon, { backgroundColor: item.bg }]}>
                    <Fa name={item.icon} size={12} color="#fff" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.helplineTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.helplineNumber}>{item.number}</Text>
                  </View>
                </Press>
              </View>
            ))}
          </View>
        </Panel>

        <Panel style={{ gap: 12 }}>
          <PanelTitle icon="fa-solid fa-headset">Submit a Support Ticket</PanelTitle>
          <View>
            <Text style={dhs.label}>Category</Text>
            <SelectField value={ticketCategory} options={CATEGORIES} onChange={setTicketCategory} accessibilityLabel="Category" style={[dhs.input, { gap: 8 }]} textStyle={styles.selectText} />
          </View>
          <Field
            label="Describe your concern"
            multiline
            numberOfLines={3}
            placeholder="Explain the issue or booking ID details..."
            value={complaintText}
            onChangeText={setComplaintText}
            inputStyle={{ padding: 12, paddingTop: 12, ...poppins(400) }}
          />
          <GreenButton title="Submit Ticket" loadingTitle="Sending…" loading={submitting} onPress={handleCreateTicket} />

          {isTicketSubmitted ? (
            <View style={styles.done}>
              <View style={[dhs.row, { gap: 4 }]}>
                <Fa name="fa-solid fa-circle-check" size={12} color={tw.emerald600} />
                <Text style={styles.doneTitle}>Ticket Generated: {generatedTicketId}</Text>
              </View>
              <Text style={styles.doneText}>Our support team can see this now. Quote the reference above if you call us.</Text>
            </View>
          ) : null}
        </Panel>

        {myTickets.length > 0 ? (
          <Panel style={{ gap: 12 }}>
            <PanelTitle icon="fa-solid fa-clock-rotate-left">Your Tickets</PanelTitle>
            <View style={{ gap: 8 }}>
              {myTickets.map((ticket) => {
                const done = ['resolved', 'closed'].includes(ticket.status);
                const reply = [...(ticket.messages || [])].reverse().find((m) => m.senderRole === 'admin');
                return (
                  <View key={ticket._id} style={styles.ticket}>
                    <View style={[dhs.row, { justifyContent: 'space-between', gap: 8 }]}>
                      <Text style={styles.ticketCode}>{ticket.ticketCode}</Text>
                      <Text style={[styles.ticketStatus, done ? { backgroundColor: tw.emerald100, color: tw.emerald700 } : null]}>{done ? 'RESOLVED' : 'IN PROGRESS'}</Text>
                    </View>
                    <Text style={styles.ticketText} numberOfLines={2}>{ticket.description}</Text>
                    {reply ? (
                      <Text style={styles.reply}>
                        <Text style={poppins(700)}>Support: </Text>
                        {reply.message}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Panel>
        ) : null}

        <Panel style={{ gap: 12 }}>
          <PanelTitle icon="fa-solid fa-circle-question">Frequently Asked Questions</PanelTitle>
          <View style={{ gap: 8 }}>
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <View key={faq.q} style={styles.faq}>
                  <Press
                    scale={1}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
                      setActiveFaq(isOpen ? null : idx);
                    }}
                    accessibilityState={{ expanded: isOpen }}
                    style={styles.faqHead}
                  >
                    <Text style={styles.faqQ}>{faq.q}</Text>
                    <Fa name="fa-solid fa-chevron-down" size={10} color={isOpen ? tw.emerald800 : tw.gray500} style={isOpen ? { transform: [{ rotate: '180deg' }] } : null} />
                  </Press>
                  {isOpen ? <Text style={styles.faqA}>{faq.a}</Text> : null}
                </View>
              );
            })}
          </View>
        </Panel>
      </FormScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  active: { fontSize: 10, lineHeight: 15, color: tw.red800, backgroundColor: tw.red100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(700) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  cell: { width: '50%', padding: 4 },
  helpline: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: dh.cream, borderRadius: 12, borderWidth: 1, borderColor: dh.border },
  helplineIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  helplineTitle: { fontSize: 11, lineHeight: 13.75, color: tw.gray900, ...poppins(700) },
  helplineNumber: { fontSize: 10, lineHeight: 15, color: tw.emerald800, ...poppins(700) },
  selectText: { fontSize: 12, color: tw.gray900, ...poppins(600) },
  done: { padding: 12, backgroundColor: tw.emerald50, borderWidth: 1, borderColor: tw.emerald200, borderRadius: 12, gap: 4 },
  doneTitle: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.emerald900, ...poppins(700) },
  doneText: { fontSize: 11, lineHeight: 16.5, color: tw.gray600, ...poppins(400) },
  ticket: { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(229,221,195,0.8)', backgroundColor: 'rgba(250,246,237,0.4)', padding: 12, gap: 4 },
  ticketCode: { fontSize: 11, lineHeight: 16.5, letterSpacing: 0.275, color: tw.emerald950, ...poppins(900) },
  ticketStatus: { fontSize: 9, lineHeight: 13.5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', backgroundColor: tw.amber100, color: tw.amber700, ...poppins(700) },
  ticketText: { fontSize: 11, lineHeight: 15, color: tw.gray600, ...poppins(400) },
  reply: { fontSize: 11, lineHeight: 15, color: tw.emerald900, backgroundColor: tw.emerald50, borderRadius: 8, padding: 8, ...poppins(400) },
  faq: { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(229,221,195,0.8)', backgroundColor: 'rgba(250,246,237,0.4)', overflow: 'hidden' },
  faqHead: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  faqQ: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  faqA: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8, fontSize: 12, lineHeight: 19.5, color: tw.gray600, borderTopWidth: 1, borderTopColor: tw.gray100, ...poppins(400) },
});
