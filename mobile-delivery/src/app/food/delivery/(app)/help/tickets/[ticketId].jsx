import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, SearchX, ShieldCheck } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../../api/delivery';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../../../../components/ds';
import { Spinner } from '../../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../../lib/notify';
import { color, radii, space, type } from '../../../../../../theme';

// Web: pages/help/ViewSupportTicketV2.jsx. Reference + status, the request, then support's reply.

// Ticket status -> badge tone + sentence-case label (DESIGN_SYSTEM.md mapping).
const TICKET_TONE = { open: 'warning', pending: 'warning', in_progress: 'info', resolved: 'success', closed: 'neutral' };
const ticketBadge = (status) => {
  const raw = String(status || '').toLowerCase();
  const text = raw.replace(/_/g, ' ');
  return { tone: TICKET_TONE[raw] || 'neutral', label: text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unknown' };
};

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
      <View style={styles.page}>
        <ScreenHeader title="Ticket details" onBack={goBack} />
        <View style={styles.center} accessibilityLabel="Loading ticket">
          <Spinner size={32} color={color.primary} />
        </View>
      </View>
    );
  }
  if (!ticket) {
    return (
      <View style={styles.page}>
        <ScreenHeader title="Ticket details" onBack={goBack} />
        <EmptyState icon={SearchX} title="Ticket not found" message="It may have been removed, or the link is wrong." />
      </View>
    );
  }

  const badge = ticketBadge(ticket.status);

  return (
    <View style={styles.page}>
      <ScreenHeader title="Ticket details" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}>
        <Card style={styles.statusCard}>
          <View style={styles.flexText}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.ref} numberOfLines={1}>
              #{ticket.ticketId || 'Pending'}
            </Text>
          </View>
          <StatusBadge tone={badge.tone} label={badge.label} style={{ alignSelf: 'center' }} />
        </Card>

        <Card style={{ gap: space.lg }}>
          <View style={{ gap: space.xs }}>
            <Text style={styles.label}>Subject</Text>
            <Text style={styles.subject}>{ticket.subject}</Text>
          </View>
          <View style={styles.descBlock}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.desc}>{ticket.description}</Text>
          </View>
        </Card>

        <Card style={styles.response}>
          <View style={styles.respIcon}>
            <ShieldCheck size={20} color={color.primary} />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.label}>Support response</Text>
            <Text style={[styles.respText, !ticket.adminResponse && { color: color.textSecondary }]}>
              {ticket.adminResponse || "Our support team is currently reviewing your ticket. You'll receive a notification once there is an update."}
            </Text>
            {ticket.respondedAt ? <Text style={styles.updated}>Updated {new Date(ticket.respondedAt).toLocaleString()}</Text> : null}
          </View>
        </Card>

        <View style={styles.footer}>
          <Mail size={24} color={color.textMuted} />
          <Text style={styles.footerText}>Dima Hasao Food Support Fleet</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: space.lg, gap: space.md },
  flexText: { flex: 1, minWidth: 0, gap: space.xs },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { ...type.label, color: color.textMuted },
  ref: { ...type.heading, color: color.text },
  subject: { ...type.subheading, color: color.text },
  descBlock: { gap: space.xs, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  desc: { ...type.body, color: color.textSecondary },
  response: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, borderColor: color.primaryBorder },
  respIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  respText: { ...type.bodyStrong, color: color.primary },
  updated: { ...type.caption, color: color.textMuted },
  footer: { paddingVertical: space.xxl, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  footerText: { ...type.caption, color: color.textMuted, textAlign: 'center' },
});
