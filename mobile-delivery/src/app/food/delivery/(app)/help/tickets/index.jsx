import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, MessageSquare, Plus } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../../api/delivery';
import { Button, Card, EmptyState, ScreenHeader, StatusBadge } from '../../../../../../components/ds';
import { Spinner } from '../../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../../lib/notify';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radii, space, type } from '../../../../../../theme';

// Web: pages/help/SupportTicketsV2.jsx. Raise action on top, then the rider's tickets.

// Ticket status -> badge tone + sentence-case label (DESIGN_SYSTEM.md mapping).
const TICKET_TONE = { open: 'warning', pending: 'warning', in_progress: 'info', resolved: 'success', closed: 'neutral' };
const ticketBadge = (status) => {
  const raw = String(status || '').toLowerCase();
  const text = raw.replace(/_/g, ' ');
  return { tone: TICKET_TONE[raw] || 'neutral', label: text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unknown' };
};

const sentence = (s) => {
  const t = String(s || '');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};

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
      <ScreenHeader title="Support tickets" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}>
        <Button title="Raise new ticket" icon={Plus} onPress={() => router.push('/food/delivery/help/tickets/create')} accessibilityLabel="Raise New Ticket" />

        {loading ? (
          <View style={styles.loading} accessibilityLabel="Loading tickets">
            <Spinner size={32} color={color.primary} />
            <Text style={styles.loadingText}>Loading tickets...</Text>
          </View>
        ) : tickets.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No active tickets" message="Create a ticket if you need assistance." />
        ) : (
          <View style={{ gap: space.md }}>
            {tickets.map((ticket, idx) => {
              const badge = ticketBadge(ticket.status);
              return (
                <Card key={ticket._id || idx} onPress={() => router.push(`/food/delivery/help/tickets/${ticket._id}`)} accessibilityLabel={ticket.subject}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardText}>
                      <Text numberOfLines={2} style={styles.subject}>
                        {ticket.subject}
                      </Text>
                      {ticket.ticketId ? <Text style={styles.ticketId}>#{ticket.ticketId}</Text> : null}
                      <Text numberOfLines={2} style={styles.desc}>
                        {ticket.description}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={color.textDisabled} />
                  </View>
                  <View style={styles.cardFoot}>
                    <View style={styles.footLeft}>
                      <StatusBadge tone={badge.tone} label={badge.label} />
                      {ticket.category ? (
                        <Text style={styles.meta} numberOfLines={1}>
                          {sentence(ticket.category)}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.meta}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.lg },
  loading: { paddingVertical: space.xxxl * 2, alignItems: 'center', gap: space.md },
  loadingText: { ...type.body, color: color.textSecondary },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  cardText: { flex: 1, minWidth: 0, gap: space.xs },
  subject: { ...type.subheading, color: color.text },
  ticketId: { ...type.caption, color: color.textSecondary, alignSelf: 'flex-start', backgroundColor: color.surfaceMuted, paddingHorizontal: space.sm, paddingVertical: space.xxs, borderRadius: radii.sm, overflow: 'hidden' },
  desc: { ...type.small, color: color.textMuted },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  footLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1, minWidth: 0 },
  meta: { ...type.caption, color: color.textMuted, flexShrink: 1 },
});
