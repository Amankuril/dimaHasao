import { useEffect, useState } from 'react';
import { LayoutAnimation, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { SelectField } from '../../components/kit';
import { StatusBadge } from '../../components/ds';
import { Header, PatternDivider } from '../../components/dh/Header';
import { Field, FormScroll, GreenButton, Panel, PanelTitle, dhs } from '../../components/dh/ui';
import { useBooking } from '../../context/BookingContext';
import { fetchMySupportTickets, raiseSupportTicket } from '../../api/dh/supportApi';
import { openExternal } from '../../lib/links';
import { color, radii, space, type } from '../../theme';

// Web: DimaHasao/pages/HelpSupportScreen.jsx (/app/support)

const HELPLINES = [
  { title: 'Police Control Room', number: '112', icon: 'fa-solid fa-shield' },
  { title: 'Haflong Civil Hospital', number: '03673-236222', icon: 'fa-solid fa-hospital' },
  { title: 'Tourist Police Helpline', number: '+91 94350 99999', icon: 'fa-solid fa-person-military-pointing' },
  { title: 'Disaster Emergency (DDMA)', number: '1077', icon: 'fa-solid fa-triangle-exclamation' },
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

      <FormScroll contentContainerStyle={{ padding: space.lg, gap: space.lg }} bottomSpace={space.xxl}>
        <View style={styles.emergency}>
          <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' }]}>
            <View style={[dhs.row, { gap: space.sm, flexShrink: 1 }]}>
              <Fa name="fa-solid fa-phone-volume" size={16} color={color.danger} />
              <Text style={styles.emergencyTitle} accessibilityRole="header">
                Emergency hotlines
              </Text>
            </View>
            <StatusBadge label="24×7 active" tone="danger" />
          </View>
          <Text style={styles.emergencyHint}>Tap a number to call.</Text>
          <View style={{ gap: space.sm }}>
            {HELPLINES.map((item) => (
              <Press key={item.title} scale={0.98} onPress={() => openExternal(`tel:${item.number.replace(/\s+/g, '')}`)} style={styles.helpline} accessibilityRole="link" accessibilityLabel={`Call ${item.title}, ${item.number}`}>
                <View style={styles.helplineIcon}>
                  <Fa name={item.icon} size={16} color={color.danger} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.helplineTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.helplineNumber}>{item.number}</Text>
                </View>
                <Fa name="fa-solid fa-phone" size={16} color={color.danger} />
              </Press>
            ))}
          </View>
        </View>

        <Panel style={{ gap: space.md }}>
          <PanelTitle icon="fa-solid fa-headset">Submit a support ticket</PanelTitle>
          <View>
            <Text style={dhs.label}>Category</Text>
            <SelectField value={ticketCategory} options={CATEGORIES} onChange={setTicketCategory} accessibilityLabel="Category" style={[dhs.input, { gap: space.sm }]} textStyle={styles.selectText} chevronColor={color.text} />
          </View>
          <Field label="Describe your concern" multiline numberOfLines={3} placeholder="Explain the issue or booking ID details..." value={complaintText} onChangeText={setComplaintText} />
          <GreenButton title="Submit ticket" loadingTitle="Sending…" loading={submitting} onPress={handleCreateTicket} />

          {isTicketSubmitted ? (
            <View style={styles.done}>
              <View style={[dhs.row, { gap: space.sm }]}>
                <Fa name="fa-solid fa-circle-check" size={16} color={color.success} />
                <Text style={styles.doneTitle} selectable>
                  Ticket generated: {generatedTicketId}
                </Text>
              </View>
              <Text style={styles.doneText}>Our support team can see this now. Quote the reference above if you call us.</Text>
            </View>
          ) : null}
        </Panel>

        {myTickets.length > 0 ? (
          <Panel style={{ gap: space.md }}>
            <PanelTitle icon="fa-solid fa-clock-rotate-left">Your tickets</PanelTitle>
            <View style={{ gap: space.sm }}>
              {myTickets.map((ticket) => {
                const done = ['resolved', 'closed'].includes(ticket.status);
                const reply = [...(ticket.messages || [])].reverse().find((m) => m.senderRole === 'admin');
                return (
                  <View key={ticket._id} style={styles.ticket}>
                    <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
                      <Text style={styles.ticketCode} selectable>
                        {ticket.ticketCode}
                      </Text>
                      <StatusBadge label={done ? 'Resolved' : 'In progress'} tone={done ? 'success' : 'warning'} />
                    </View>
                    <Text style={styles.ticketText} numberOfLines={2}>
                      {ticket.description}
                    </Text>
                    {reply ? (
                      <Text style={styles.reply}>
                        <Text style={{ ...type.label, color: color.primary }}>Support: </Text>
                        {reply.message}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Panel>
        ) : null}

        <Panel style={{ gap: space.md }}>
          <PanelTitle icon="fa-solid fa-circle-question">Frequently asked questions</PanelTitle>
          <View style={{ gap: space.sm }}>
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
                    accessibilityLabel={faq.q}
                    style={styles.faqHead}
                  >
                    <Text style={styles.faqQ}>{faq.q}</Text>
                    <Fa name="fa-solid fa-chevron-down" size={14} color={isOpen ? color.primary : color.textMuted} style={isOpen ? { transform: [{ rotate: '180deg' }] } : null} />
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
  emergency: { backgroundColor: color.dangerSoft, borderRadius: radii.lg, padding: space.lg, gap: space.sm },
  emergencyTitle: { ...type.subheading, color: color.danger, flexShrink: 1 },
  emergencyHint: { ...type.caption, color: color.textSecondary, marginBottom: space.xs },
  helpline: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm, backgroundColor: color.surface, borderRadius: radii.md },
  helplineIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  helplineTitle: { ...type.bodyStrong, color: color.text },
  helplineNumber: { ...type.label, color: color.danger },
  selectText: { flex: 1, ...type.bodyStrong, color: color.text },
  done: { padding: space.md, backgroundColor: color.successSoft, borderRadius: radii.md, gap: space.xs },
  doneTitle: { flex: 1, ...type.bodyStrong, color: color.text },
  doneText: { ...type.small, color: color.textSecondary },
  ticket: { borderRadius: radii.md, backgroundColor: color.surfaceMuted, padding: space.md, gap: space.xs + 2 },
  ticketCode: { ...type.bodyStrong, letterSpacing: 0.3, color: color.text, flexShrink: 1 },
  ticketText: { ...type.small, color: color.textSecondary },
  reply: { ...type.small, color: color.text, backgroundColor: color.surface, borderRadius: radii.sm, padding: space.sm + 2 },
  faq: { borderRadius: radii.md, backgroundColor: color.surfaceMuted, overflow: 'hidden' },
  faqHead: { minHeight: 52, paddingHorizontal: space.md, paddingVertical: space.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  faqQ: { flex: 1, ...type.bodyStrong, color: color.text },
  faqA: { paddingHorizontal: space.md, paddingBottom: space.md, paddingTop: space.sm, ...type.small, color: color.textSecondary, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
});
