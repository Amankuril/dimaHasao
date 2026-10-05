import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, MessageSquare, Plus } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../../api/delivery';
import FixedHeader, { FIXED_HEADER_CONTENT_TOP } from '../../../../../../components/delivery/FixedHeader';
import { Spinner } from '../../../../../../components/Loader';
import { Press } from '../../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../../lib/notify';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { display, ff, shadow, tw } from '../../../../../../theme';

// Web: pages/help/SupportTicketsV2.jsx (`font-poppins` -> Nunito Sans).

// open / in_progress / resolved all repaint to the same soft-green chip.
const statusStyle = (status) =>
  ['open', 'in_progress', 'resolved'].includes(String(status || '').toLowerCase())
    ? { backgroundColor: tw.primarySoft, color: tw.primary, borderColor: tw.primaryBorder }
    : { backgroundColor: tw.gray50, color: tw.gray600, borderColor: tw.gray100 };

export default function SupportTicketsV2() {
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await deliveryAPI.getSupportTickets();
        if (response?.data?.success) setTickets(response.data.data.tickets || []);
      } catch {
        toast.error('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.page}>
      <FixedHeader title="Support Tickets" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.body, { paddingTop: FIXED_HEADER_CONTENT_TOP + insets.top }]}>
        <Press onPress={() => router.push('/food/delivery/help/tickets/create')} accessibilityLabel="Raise New Ticket" style={[styles.create, shadow('card')]}>
          <Plus size={20} color="#fff" />
          <Text style={styles.createText}>Raise New Ticket</Text>
        </Press>

        {loading ? (
          <View style={styles.loading}>
            <Spinner size={32} color={tw.gray200} />
            <Text style={styles.loadingText}>Syncing Tickets...</Text>
          </View>
        ) : tickets.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MessageSquare size={40} color={tw.gray200} />
            </View>
            <Text style={styles.emptyTitle}>No Active Tickets</Text>
            <Text style={styles.emptySub}>Create a ticket if you need assistance</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {tickets.map((ticket, idx) => {
              const s = statusStyle(ticket.status);
              return (
                <Press
                  key={ticket._id || idx}
                  scale={0.98}
                  onPress={() => router.push(`/food/delivery/help/tickets/${ticket._id}`)}
                  accessibilityLabel={ticket.subject}
                  style={[styles.card, shadow('card')]}
                >
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <View style={styles.titleRow}>
                        <Text numberOfLines={1} style={styles.subject}>
                          {ticket.subject}
                        </Text>
                        {ticket.ticketId ? <Text style={styles.ticketId}>#{ticket.ticketId}</Text> : null}
                      </View>
                      <Text numberOfLines={1} style={styles.desc}>
                        {ticket.description}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={tw.gray200} />
                  </View>
                  <View style={styles.cardFoot}>
                    <View style={styles.footLeft}>
                      <Text style={[styles.status, s]}>{ticket.status?.replace('_', ' ')}</Text>
                      <Text style={styles.category}>{ticket.category}</Text>
                    </View>
                    <Text style={styles.date}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
                  </View>
                </Press>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  body: { paddingHorizontal: 16, paddingBottom: 80, gap: 24 },
  create: { width: '100%', backgroundColor: '#000', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  createText: { color: '#fff', fontSize: 14, lineHeight: 20, textTransform: 'uppercase', ...display(900, 14) },
  loading: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.gray400, ...display(900, 10) },
  empty: { paddingVertical: 96, alignItems: 'center' },
  emptyIcon: { width: 80, height: 80, backgroundColor: tw.gray50, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 14, lineHeight: 20, color: tw.gray950, textTransform: 'uppercase', ...display(900, 14) },
  emptySub: { marginTop: 8, fontSize: 10, lineHeight: 15, color: tw.gray400, textTransform: 'uppercase', ...ff(700) },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5DDC3', borderRadius: 16, padding: 20, overflow: 'hidden' },
  // mb-3 collapses into the footer's mt-4 (block siblings)
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  // h4 + font-black -> Sora
  subject: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: tw.gray950, textTransform: 'uppercase', ...display(900, 14) },
  // font-mono loses to the theme's inherit rule: Nunito
  ticketId: { fontSize: 9, lineHeight: 13.5, backgroundColor: tw.gray100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', color: '#1F1F24', ...ff(700) },
  desc: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...ff(500) },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray50 },
  footLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', fontSize: 9, lineHeight: 13.5, textTransform: 'uppercase', borderWidth: 1, ...display(900, 9) },
  category: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, textTransform: 'uppercase', color: tw.gray400, ...ff(700) },
  date: { fontSize: 9, lineHeight: 13.5, color: tw.gray300, ...ff(700) },
});
