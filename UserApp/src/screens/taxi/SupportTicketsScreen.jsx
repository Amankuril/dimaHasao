/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/support/SupportTickets.jsx.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, Modal, Pressable, SafeAreaView, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AlertCircle, ArrowLeft, ChevronRight, Headset, Plus, X} from 'lucide-react-native';
import supportTicketService from '../../services/taxi/supportTicketService';

const STATUS_STYLES = {
  pending: {bg: '#fff7ed', text: '#ea580c', border: '#fed7aa'},
  assigned: {bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe'},
  closed: {bg: '#ecfdf5', text: '#059669', border: '#a7f3d0'},
};
const TABS = ['All', 'Open', 'Resolved'];

export default function SupportTicketsScreen() {
  const navigation = useNavigation();
  const [tickets, setTickets] = useState([]);
  const [titleOptions, setTitleOptions] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [titlesResponse, ticketsResponse] = await Promise.all([
        supportTicketService.getTitles('user'),
        supportTicketService.listMyTickets({page: 1, limit: 100}),
      ]);
      setTitleOptions(titlesResponse?.data?.results || []);
      setTickets(ticketsResponse?.data?.results || []);
    } catch (apiError) {
      setError(apiError?.message || 'Unable to load support data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(
    () =>
      tickets.filter(ticket => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Open') return ['pending', 'assigned'].includes(ticket.status);
        return ticket.status === 'closed';
      }),
    [tickets, activeTab],
  );

  const handleSubmit = async () => {
    const nextErrors = {};
    if (!customTitle.trim()) nextErrors.title = 'Write a title for your issue';
    if (!description.trim()) nextErrors.description = 'Description is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setError('');
    try {
      const created = await supportTicketService.createTicket({title: customTitle, description, message: description});
      setTickets(prev => [created?.data, ...prev]);
      setCustomTitle('');
      setDescription('');
      setErrors({});
      setShowForm(false);
    } catch (apiError) {
      setError(apiError?.message || 'Unable to raise support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4 pb-3 border-b border-slate-50">
        <View className="flex-row items-center gap-3 mb-3">
          <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 rounded-xl border border-slate-100 items-center justify-center">
            <ArrowLeft size={18} color="#0f172a" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">Help Center</Text>
            <Text className="text-[19px] font-black text-slate-900">Support Tickets</Text>
          </View>
          <Pressable onPress={() => setShowForm(true)} className="w-9 h-9 bg-slate-900 rounded-xl items-center justify-center">
            <Plus size={16} color="#fff" />
          </Pressable>
        </View>

        <View className="flex-row gap-1.5 bg-amber-50 border border-amber-100 p-1 rounded-2xl">
          {TABS.map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 py-1.5 rounded-xl items-center"
              style={{backgroundColor: activeTab === tab ? '#fff' : 'transparent'}}>
              <Text className="text-[11px] font-black uppercase" style={{color: activeTab === tab ? '#0f172a' : '#64748b'}}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!!error && (
        <View className="mx-5 mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
          <Text className="text-[12px] font-bold text-rose-600">{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator className="py-16" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{padding: 20, gap: 10}}
          ListEmptyComponent={
            <View className="items-center py-20 gap-3">
              <View className="w-20 h-20 bg-slate-50 rounded-3xl items-center justify-center">
                <Headset size={32} color="#cbd5e1" />
              </View>
              <Text className="text-[15px] font-black text-slate-700">No tickets yet</Text>
              <Text className="text-[12px] font-bold text-slate-400">Tap + to get help</Text>
            </View>
          }
          renderItem={({item}) => {
            const style = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
            return (
              <Pressable
                onPress={() => navigation.navigate('SupportTicketDetail', {ticketCode: item.ticketCode, ticket: item})}
                className="flex-row items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                  <Headset size={16} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text className="text-[14px] font-black text-slate-900 flex-1" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View className="px-2 py-0.5 rounded-full border" style={{backgroundColor: style.bg, borderColor: style.border}}>
                      <Text className="text-[9px] font-black" style={{color: style.text}}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-bold text-slate-400 mt-1">
                    {item.supportType} · {new Date(item.updatedAt).toLocaleString()}
                  </Text>
                </View>
                <ChevronRight size={15} color="#cbd5e1" />
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-4 pb-10" style={{maxHeight: '85%'}}>
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[18px] font-black text-slate-900">New Ticket</Text>
              <Pressable onPress={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                <X size={15} color="#64748b" />
              </Pressable>
            </View>

            <Text className="text-[11px] font-black uppercase text-slate-400 mb-1">Title</Text>
            <TextInput
              value={customTitle}
              onChangeText={text => {
                setCustomTitle(text);
                setErrors(prev => ({...prev, title: ''}));
              }}
              placeholder="e.g. Driver didn't arrive"
              className="rounded-2xl px-4 py-3 text-[14px] font-bold border-2 border-slate-100 bg-slate-50 mb-1"
            />
            {!!errors.title && (
              <View className="flex-row items-center gap-1 mb-3">
                <AlertCircle size={11} color="#ef4444" />
                <Text className="text-[11px] font-black text-rose-500">{errors.title}</Text>
              </View>
            )}

            {titleOptions.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-2 mb-2">
                {titleOptions.map(option => (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      setCustomTitle(option.title);
                      setErrors(prev => ({...prev, title: ''}));
                    }}
                    className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50">
                    <Text className="text-[11px] font-bold text-slate-600">{option.title}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text className="text-[11px] font-black uppercase text-slate-400 mb-1 mt-2">Description</Text>
            <TextInput
              value={description}
              onChangeText={text => {
                setDescription(text);
                setErrors(prev => ({...prev, description: ''}));
              }}
              placeholder="Describe your issue in detail..."
              multiline
              numberOfLines={4}
              className="rounded-2xl px-4 py-3 text-[14px] font-bold border-2 border-slate-100 bg-slate-50 mb-1"
            />
            {!!errors.description && (
              <View className="flex-row items-center gap-1 mb-3">
                <AlertCircle size={11} color="#ef4444" />
                <Text className="text-[11px] font-black text-rose-500">{errors.description}</Text>
              </View>
            )}

            <Pressable onPress={handleSubmit} disabled={submitting} className="bg-slate-900 rounded-2xl py-4 items-center mt-3">
              {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-black text-[14px] uppercase">Submit Ticket</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
