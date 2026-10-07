import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useLocation, useNavigate, useParams } from '../../lib/webRouter';
import { outfit as fo, shadow } from '../../theme';
import { supportTicketService } from '../services/supportTicketService';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';

import { STATUS_STYLES } from './SupportTickets';

const toMessages = (ticket) =>
  (ticket?.messages || []).map((item) => ({ id: item.id, senderRole: item.senderRole, senderName: item.senderName, message: item.message, createdAt: item.createdAt }));

/** Port of Taxi/modules/user/pages/support/SupportTicketDetail.jsx (/taxi/driver/support/ticket/:id). */
export default function SupportTicketDetail() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: ticketCode } = useParams();
  const ticketFromState = location.state?.ticket || null;
  const [ticket, setTicket] = useState(ticketFromState);
  const [messages, setMessages] = useState(() => toMessages(ticketFromState));
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(!ticketFromState);
  const [error, setError] = useState('');
  const scroller = useRef(null);
  const [inputFocused, setInputFocused] = useState(false);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await supportTicketService.getMyTicket(ticketCode);
      const nextTicket = response?.data || null;
      setTicket(nextTicket);
      setMessages(toMessages(nextTicket));
    } catch (apiError) {
      setError(apiError?.message || 'Unable to load support ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketCode]);

  useEffect(() => {
    if (ticketCode) fetchTicket();
  }, [ticketCode, fetchTicket]);

  const handleSend = async () => {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      await supportTicketService.replyMyTicket(ticketCode, { message: text });
      setReply('');
      await fetchTicket();
    } catch (apiError) {
      setError(apiError?.message || 'Unable to send reply');
    } finally {
      setSending(false);
    }
  };

  const tone = STATUS_STYLES[ticket?.status] || STATUS_STYLES.pending;
  const canSend = !!reply.trim() && !sending;

  return (
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScreenHeader
          title={ticket?.title || 'Support Ticket'}
          subtitle={String(ticket?.supportType || 'support').toUpperCase()}
          onBack={() => navigate(-1)}
          right={<Text style={[styles.status, { backgroundColor: tone.bg, color: tone.fg }]}>{String(ticket?.status || 'pending').toUpperCase()}</Text>}
        />

        <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }} accessibilityRole="progressbar" accessibilityLabel="Loading ticket">
              <ActivityIndicator size="small" color={DT.brand} />
            </View>
          ) : null}
          {error ? (
            <View style={styles.error}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {messages.map((m, i) => {
            const mine = m.senderRole === 'driver';
            return (
              <View key={m.id || i} style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.message, mine ? { color: DT.onBrand } : null]}>{m.message}</Text>
                  <Text style={[styles.time, mine ? { color: DT.onBrandMuted, textAlign: 'right' } : null]}>{new Date(m.createdAt).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.replyBar, { paddingBottom: 12 + insets.bottom }]}>
          <TextInput value={reply} onChangeText={setReply} placeholder="Type your reply..." placeholderTextColor={DT.faint} multiline accessibilityLabel="Reply" onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} style={[styles.input, inputFocused ? { borderColor: DT.brand } : null]} />
          <Press scale={0.9} disabled={!canSend} onPress={handleSend} accessibilityLabel="Send reply" accessibilityState={{ disabled: !canSend, busy: sending }} style={[styles.send, reply.trim() ? null : { backgroundColor: DT.border }]}>
            {sending ? <ActivityIndicator size="small" color={DT.onBrand} /> : <Send size={16} color={reply.trim() ? DT.onBrand : DT.muted} strokeWidth={2.5} />}
          </Press>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { fontSize: 10, lineHeight: 14, minWidth: 54, textAlign: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: DT.radius.pill, overflow: 'hidden', ...fo(800) },
  error: { borderRadius: DT.radius.md, backgroundColor: DT.dangerSoft, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { fontSize: 13, lineHeight: 18, color: DT.dangerInk, ...fo(700) },
  bubble: { maxWidth: '80%', borderRadius: DT.radius.lg, paddingHorizontal: 16, paddingVertical: 12 },
  mine: { backgroundColor: DT.brand, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: DT.card, borderWidth: 1, borderColor: DT.borderSoft, borderBottomLeftRadius: 6, ...shadow('sm') },
  message: { fontSize: 14, lineHeight: 21, color: DT.ink, ...fo(500) },
  time: { fontSize: 10, lineHeight: 14, color: DT.muted, marginTop: 4, ...fo(600) },
  replyBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, backgroundColor: DT.card, borderTopWidth: 1, borderTopColor: DT.borderSoft, paddingHorizontal: 16, paddingTop: 12 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, backgroundColor: DT.card, borderWidth: 1, borderColor: DT.border, borderRadius: DT.radius.md, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: DT.ink, ...fo(600) },
  send: { width: 48, height: 48, borderRadius: DT.radius.md, backgroundColor: DT.brand, alignItems: 'center', justifyContent: 'center' },
});
