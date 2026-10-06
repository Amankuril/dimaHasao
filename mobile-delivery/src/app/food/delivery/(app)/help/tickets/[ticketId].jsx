import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, ShieldCheck } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../../api/delivery';
import FixedHeader, { FIXED_HEADER_CONTENT_TOP } from '../../../../../../components/delivery/FixedHeader';
import { Spinner } from '../../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../../lib/notify';
import { display, ff, shadow, tw } from '../../../../../../theme';

// Web: pages/help/ViewSupportTicketV2.jsx (`font-poppins` -> Nunito Sans).

const statusStyle = (status) =>
  String(status || '').toLowerCase() === 'closed'
    ? { color: tw.gray600, backgroundColor: tw.gray50 }
    : { color: tw.primary, backgroundColor: tw.primarySoft };

export default function ViewSupportTicketV2() {
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
  const { ticketId } = useLocalSearchParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await deliveryAPI.getSupportTicketById(ticketId);
        if (response?.data?.success) setTicket(response?.data?.data?.ticket || response?.data?.data || response?.data?.ticket || null);
      } catch {
        toast.error('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    })();
  }, [ticketId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#fff' }]}>
        <Spinner size={32} color={tw.primary} />
      </View>
    );
  }
  if (!ticket) {
    return (
      <View style={{ flex: 1, padding: 80, backgroundColor: '#fff' }}>
        <Text style={styles.notFound}>Ticket Not Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <FixedHeader title="Ticket Info" uppercase onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: FIXED_HEADER_CONTENT_TOP + insets.top }]}>
        <View style={[styles.card, styles.statusCard, shadow('card')]}>
          <View style={{ gap: 4 }}>
            <Text style={styles.label}>ID Reference</Text>
            <Text style={styles.ref}>#{ticket.ticketId || 'Pending'}</Text>
          </View>
          <Text style={[styles.badge, statusStyle(ticket.status)]}>{ticket.status}</Text>
        </View>

        <View style={[styles.card, styles.big, shadow('card'), { gap: 16 }]}>
          <View style={{ gap: 4 }}>
            <Text style={styles.label}>Subject</Text>
            <Text style={styles.subject}>{ticket.subject}</Text>
          </View>
          <View style={{ gap: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray50 }}>
            <Text style={styles.label}>Detail Description</Text>
            <Text style={styles.desc}>{ticket.description}</Text>
          </View>
        </View>

        {/* border-orange-100 is repainted after the rounded-3xl rule: #BBCCC3 */}
        <View style={[styles.card, styles.big, shadow('card'), styles.response]}>
          <View style={[styles.respIcon, shadow('card')]}>
            <ShieldCheck size={20} color={tw.primary} />
          </View>
          <View style={{ gap: 8, flexShrink: 1 }}>
            <Text style={styles.label}>Support Response</Text>
            <Text style={styles.respText}>
              {ticket.adminResponse || "Our support team is currently reviewing your ticket. You'll receive a notification once there is an update."}
            </Text>
            {ticket.respondedAt ? <Text style={styles.updated}>Updated {new Date(ticket.respondedAt).toLocaleString()}</Text> : null}
          </View>
        </View>

        <View style={styles.footer}>
          <Mail size={48} color="#1F1F24" />
          <Text style={styles.footerText}>Dima Hasao Food Support Fleet</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { textAlign: 'center', color: tw.gray400, fontSize: 16, letterSpacing: 1.6, textTransform: 'uppercase', ...ff(700) },
  body: { paddingHorizontal: 16, paddingBottom: 80, gap: 24 },
  card: { backgroundColor: '#fff', padding: 17.6, borderWidth: 1, borderColor: '#E5DDC3' },
  statusCard: { borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  big: { borderRadius: 24 },
  label: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.gray400, ...display(900, 10) },
  ref: { fontSize: 18, lineHeight: 28, color: tw.gray950, ...display(900, 18) },
  badge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, overflow: 'hidden', fontSize: 10, lineHeight: 15, textTransform: 'uppercase', ...display(900, 10) },
  subject: { fontSize: 14, lineHeight: 20, color: tw.gray950, ...display(900, 14) },
  desc: { fontSize: 12, lineHeight: 19.5, color: tw.gray600, ...ff(500) },
  response: { borderColor: tw.primaryBorder, flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  respIcon: { width: 40, height: 40, borderRadius: 16, backgroundColor: tw.primarySoft, alignItems: 'center', justifyContent: 'center' },
  // `italic` on the web, but it renders upright there (no italic face is loaded); matched to the render
  respText: { fontSize: 12, lineHeight: 19.5, color: tw.primary, ...ff(700) },
  updated: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  // mt-10 collapses with the 24 px space-y margin above: 40 in total (gap 24 + 16)
  footer: { marginTop: 16, alignItems: 'center', justifyContent: 'center', opacity: 0.2, gap: 16 },
  footerText: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', textAlign: 'center', color: '#1F1F24', ...display(900, 10) },
});
