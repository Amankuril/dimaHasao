import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useLocation, useNavigate, useParams } from '../../lib/webRouter';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import { supportTicketService } from '../services/supportTicketService';
import { STATUS_STYLES } from './SupportTickets';

const toMessages = (ticket) =>
  (ticket?.messages || []).map((item) => ({ id: item.id, senderRole: item.senderRole, senderName: item.senderName, message: item.message, createdAt: item.createdAt }));

/** Port of Taxi/modules/user/pages/support/SupportTicketDetail.jsx (/taxi/user/support/ticket/:id). */
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
    <LinearGradient colors={['#F8FAFC', '#F3F4F6']} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
          <Press scale={0.95} onPress={() => navigate(-1)} accessibilityLabel="Go back" style={styles.back} hitSlop={6}>
            <ArrowLeft size={18} color={tw.slate900} strokeWidth={2.5} />
          </Press>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker}>{String(ticket?.supportType || 'support').toUpperCase()}</Text>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{ticket?.title || 'Support Ticket'}</Text>
          </View>
          <Text style={[styles.status, { backgroundColor: tone.bg, color: tone.fg, borderColor: tone.border }]}>{ticket?.status || 'pending'}</Text>
        </View>

        <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }} accessibilityRole="progressbar" accessibilityLabel="Loading ticket">
              <ActivityIndicator size="small" color={tw.slate400} />
            </View>
          ) : null}
          {error ? (
            <View style={styles.error}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {messages.map((m, i) => {
            const mine = m.senderRole === 'user';
            return (
              <View key={m.id || i} style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.message, mine ? { color: '#fff' } : null]}>{m.message}</Text>
                  <Text style={[styles.time, mine ? { color: 'rgba(255,255,255,0.5)', textAlign: 'right' } : null]}>{new Date(m.createdAt).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.replyBar, { paddingBottom: 12 + insets.bottom }]}>
          <TextInput value={reply} onChangeText={setReply} placeholder="Type your reply..." placeholderTextColor={tw.slate300} multiline accessibilityLabel="Reply" style={styles.input} />
          <Press scale={0.9} disabled={!canSend} onPress={handleSend} accessibilityLabel="Send reply" accessibilityState={{ disabled: !canSend, busy: sending }} style={[styles.send, reply.trim() ? null : { backgroundColor: tw.slate200 }]}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={16} color={reply.trim() ? '#fff' : tw.slate400} strokeWidth={2.5} />}
          </Press>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.8)', ...shadow('0 4px 20px rgba(15,23,42,0.05)') },
  back: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', marginTop: 2, ...shadow('sm') },
  kicker: { fontSize: 9, lineHeight: 14, letterSpacing: 2.3, color: tw.slate400, ...fo(900) },
  title: { fontSize: 16, lineHeight: 20, letterSpacing: -0.4, color: tw.slate900, ...fo(900) },
  status: { fontSize: 9, lineHeight: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, overflow: 'hidden', marginTop: 4, ...fo(900) },
  error: { borderRadius: 12, borderWidth: 1, borderColor: tw.red100, backgroundColor: tw.red50, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { fontSize: 12, lineHeight: 16, color: tw.red600, ...fo(700) },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  mine: { backgroundColor: tw.slate900, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', borderBottomLeftRadius: 4, ...shadow('0 2px 8px rgba(15,23,42,0.06)') },
  message: { fontSize: 13, lineHeight: 21, color: tw.slate800, ...fo(700) },
  time: { fontSize: 9, lineHeight: 14, color: tw.slate400, marginTop: 4, ...fo(700) },
  replyBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: tw.slate100, paddingHorizontal: 16, paddingTop: 12 },
  input: { flex: 1, maxHeight: 120, backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate100, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: tw.slate900, ...fo(700) },
  send: { width: 44, height: 44, borderRadius: 14, backgroundColor: tw.slate900, alignItems: 'center', justifyContent: 'center' },
});
