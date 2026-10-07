import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircle, Send } from 'lucide-react-native';
import { StatusBadge } from '../../components/ds';
import { Press } from '../../components/ui';
import { useLocation, useNavigate, useParams } from '../../lib/webRouter';
import { color, radii, space, type } from '../../theme';
import { LoadingState, PageTitle, sentence, useNavPad } from '../account/ui';
import { supportTicketService } from '../services/supportTicketService';
import { STATUS_STYLES } from './SupportTickets';

const toMessages = (ticket) =>
  (ticket?.messages || []).map((item) => ({ id: item.id, senderRole: item.senderRole, senderName: item.senderName, message: item.message, createdAt: item.createdAt }));

/** Port of Taxi/modules/user/pages/support/SupportTicketDetail.jsx (/taxi/user/support/ticket/:id). */
export default function SupportTicketDetail() {
  const replyPad = useNavPad(0);
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

  const st = STATUS_STYLES[ticket?.status] || STATUS_STYLES.pending;
  const canSend = !!reply.trim() && !sending;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <PageTitle
        title={ticket?.title || 'Support ticket'}
        titleLines={2}
        subtitle={sentence(ticket?.supportType || 'support')}
        onBack={() => navigate(-1)}
        right={<StatusBadge label={STATUS_STYLES[ticket?.status] ? st.label : sentence(ticket?.status || 'pending')} tone={st.tone} style={{ alignSelf: 'center' }} />}
      />

      <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.thread}>
        {loading ? <LoadingState label="Loading ticket" style={{ paddingVertical: space.xxl }} /> : null}
        {error ? (
          <View style={styles.error} accessibilityRole="alert">
            <AlertCircle size={18} color={color.danger} />
            <Text style={[type.small, { color: color.danger, flex: 1 }]}>{error}</Text>
          </View>
        ) : null}
        {messages.map((m, i) => {
          const mine = m.senderRole === 'user';
          return (
            <View key={m.id || i} style={[styles.msgRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]} accessible accessibilityLabel={`${mine ? 'You' : m.senderName || 'Support'}: ${m.message}`}>
                {!mine ? <Text style={[type.caption, { color: color.primary }]}>{m.senderName || 'Support'}</Text> : null}
                <Text style={[type.body, { color: mine ? color.onPrimary : color.text }]}>{m.message}</Text>
                <Text style={[type.caption, { color: mine ? color.textOnDarkMuted : color.textMuted, textAlign: mine ? 'right' : 'left' }]}>{new Date(m.createdAt).toLocaleString('en-IN')}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.replyBar, { paddingBottom: space.md + replyPad }]}>
        <TextInput value={reply} onChangeText={setReply} placeholder="Type your reply..." placeholderTextColor={color.textDisabled} multiline numberOfLines={1} accessibilityLabel="Reply" style={styles.input} />
        <Press scale={0.9} disabled={!canSend} onPress={handleSend} accessibilityLabel="Send reply" accessibilityState={{ disabled: !canSend, busy: sending }} style={[styles.send, reply.trim() ? null : styles.sendOff]}>
          {sending ? <ActivityIndicator size="small" color={color.onPrimary} /> : <Send size={20} color={reply.trim() ? color.onPrimary : color.textMuted} />}
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  thread: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radii.md, backgroundColor: color.dangerSoft, padding: space.md },
  msgRow: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', borderRadius: radii.lg, paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.xxs },
  mine: { backgroundColor: color.primary, borderBottomRightRadius: space.xs },
  theirs: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderBottomLeftRadius: space.xs },
  replyBar: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md },
  input: { flex: 1, minHeight: 48, maxHeight: 120, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.md, ...type.body, color: color.text, outlineStyle: 'none' },
  send: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: color.surfaceMuted },
});
