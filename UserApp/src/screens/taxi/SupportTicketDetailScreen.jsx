/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/support/SupportTicketDetail.jsx.
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Pressable, SafeAreaView, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, Send} from 'lucide-react-native';
import supportTicketService from '../../services/taxi/supportTicketService';

const STATUS_STYLES = {
  pending: {bg: '#fff7ed', text: '#ea580c'},
  assigned: {bg: '#eff6ff', text: '#2563eb'},
  closed: {bg: '#ecfdf5', text: '#059669'},
};

export default function SupportTicketDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const ticketCode = route.params?.ticketCode;
  const ticketFromState = route.params?.ticket || null;

  const [ticket, setTicket] = useState(ticketFromState);
  const [messages, setMessages] = useState(ticketFromState?.messages || []);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(!ticketFromState);
  const [error, setError] = useState('');

  const fetchTicket = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await supportTicketService.getMyTicket(ticketCode);
      setTicket(response?.data || null);
      setMessages(response?.data?.messages || []);
    } catch (apiError) {
      setError(apiError?.message || 'Unable to load support ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketCode) fetchTicket();
  }, [ticketCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    setError('');
    try {
      await supportTicketService.replyMyTicket(ticketCode, {message: text});
      setReply('');
      await fetchTicket();
    } catch (apiError) {
      setError(apiError?.message || 'Unable to send reply');
    } finally {
      setSending(false);
    }
  };

  const style = STATUS_STYLES[ticket?.status] || STATUS_STYLES.pending;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-start gap-3 px-5 py-4 border-b border-slate-50">
        <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 rounded-xl border border-slate-100 items-center justify-center mt-0.5">
          <ArrowLeft size={18} color="#0f172a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[9px] font-black uppercase text-slate-400">{ticket?.supportType || 'support'}</Text>
          <Text className="text-[16px] font-black text-slate-900" numberOfLines={1}>
            {ticket?.title || 'Support Ticket'}
          </Text>
        </View>
        <View className="px-2.5 py-1 rounded-full mt-1" style={{backgroundColor: style.bg}}>
          <Text className="text-[9px] font-black" style={{color: style.text}}>
            {ticket?.status || 'pending'}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator className="py-10" />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{padding: 20, gap: 10}}
          ListHeaderComponent={
            error ? (
              <View className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 mb-2">
                <Text className="text-[12px] font-bold text-rose-600">{error}</Text>
              </View>
            ) : null
          }
          renderItem={({item}) => {
            const isMine = item.senderRole === 'user';
            return (
              <View className={`flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
                <View className={`max-w-[78%] rounded-2xl px-4 py-3 ${isMine ? 'bg-slate-900' : 'bg-white border border-slate-100'}`}>
                  <Text className={`text-[13px] font-bold ${isMine ? 'text-white' : 'text-slate-800'}`}>{item.message}</Text>
                  <Text className={`text-[9px] font-bold mt-1 ${isMine ? 'text-white/50' : 'text-slate-400'}`}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      <View className="flex-row items-end gap-3 border-t border-slate-100 px-4 py-3">
        <TextInput
          value={reply}
          onChangeText={setReply}
          placeholder="Type your reply..."
          multiline
          className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[14px] font-bold"
        />
        <Pressable
          onPress={handleSend}
          disabled={!reply.trim() || sending}
          className="w-11 h-11 rounded-2xl items-center justify-center"
          style={{backgroundColor: reply.trim() ? '#0f172a' : '#e2e8f0'}}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send size={16} color={reply.trim() ? '#fff' : '#94a3b8'} />}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
