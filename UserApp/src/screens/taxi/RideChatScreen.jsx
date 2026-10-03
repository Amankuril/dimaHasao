/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/ride/Chat.jsx,
 * trimmed to the rider-to-driver ride chat (the "admin support chat" branch
 * that file also renders belongs to the support-ticket feature — task 8e).
 */
import React, {useEffect, useRef, useState} from 'react';
import {FlatList, Linking, Pressable, SafeAreaView, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, Loader2, Phone, Send} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import socketService from '../../services/taxi/socket';
import {getCurrentRide} from '../../services/taxi/currentRideService';

const RIDE_EVENTS = {joined: 'ride:joined', state: 'ride:state', send: 'ride:message:send', incoming: 'ride:message:new'};
const QUICK_REPLIES = ['Wait for me', "I'm coming", 'Where exactly?', 'Okay'];

const toClock = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: false});
};

const normalizeMessage = (message, fallbackRole) => ({
  id: String(message?.id || message?._id || `${message?.senderId || 'msg'}-${message?.sentAt || Date.now()}`),
  senderRole: String(message?.senderRole || fallbackRole || '').toLowerCase(),
  message: String(message?.message || '').trim(),
  sentAt: message?.sentAt || new Date().toISOString(),
});

export default function RideChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const rideParam = route.params?.ride || {};
  const peerFromState = rideParam.driver || {};

  const [rideId, setRideId] = useState(rideParam.rideId || '');
  const [hasToken, setHasToken] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(route.params?.initialDraft || '');
  const [chatError, setChatError] = useState('');
  const [isJoining, setIsJoining] = useState(true);
  const [peer, setPeer] = useState({
    name: peerFromState.name || 'Driver',
    phone: peerFromState.phone || '',
    subtitle: 'Driver • Active now',
  });

  const listRef = useRef(null);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('userToken');
      setHasToken(Boolean(token));
      if (!rideId) {
        const current = await getCurrentRide();
        if (current?.rideId) setRideId(current.rideId);
      }
    })();
  }, [rideId]);

  useEffect(() => {
    if (!hasToken) return undefined;
    if (!rideId) {
      setIsJoining(false);
      setChatError('Ride chat is unavailable because no active ride was found.');
      return undefined;
    }

    let socket;
    (async () => {
      socket = await socketService.connect({role: 'user'});
      if (!socket) {
        setIsJoining(false);
        setChatError('Could not connect trip chat right now.');
        return;
      }
      socketService.emit('joinRide', {rideId});
      socketService.emit('ride:join', {rideId});
    })();

    const onRideState = ride => {
      if (!ride || String(ride.rideId || ride._id || '') !== String(rideId)) return;
      setPeer(prev => ({
        name: ride.driver?.name || prev.name,
        phone: ride.driver?.phone || prev.phone,
        subtitle: prev.subtitle,
      }));
      setMessages(
        Array.isArray(ride.messages)
          ? ride.messages
              .map(m => normalizeMessage(m, 'user'))
              .filter(m => m.message)
              .map(m => ({id: m.id, sender: m.senderRole === 'user' ? 'user' : 'other', text: m.message, time: toClock(m.sentAt)}))
          : [],
      );
      setChatError('');
      setIsJoining(false);
    };
    const onRideJoined = payload => {
      if (String(payload?.rideId || '') === String(rideId)) setChatError('');
    };
    const onRideMessage = message => {
      const normalized = normalizeMessage(message, 'user');
      if (!normalized.message || String(message?.rideId || '') !== String(rideId)) return;
      setMessages(prev => {
        if (prev.some(entry => entry.id === normalized.id)) return prev;
        return [...prev, {id: normalized.id, sender: normalized.senderRole === 'user' ? 'user' : 'other', text: normalized.message, time: toClock(normalized.sentAt)}];
      });
    };
    const onError = payload => {
      setChatError(payload?.message || 'Could not load ride chat.');
      setIsJoining(false);
    };

    socketService.on(RIDE_EVENTS.state, onRideState);
    socketService.on(RIDE_EVENTS.joined, onRideJoined);
    socketService.on(RIDE_EVENTS.incoming, onRideMessage);
    socketService.on('errorMessage', onError);

    return () => {
      socketService.off(RIDE_EVENTS.state, onRideState);
      socketService.off(RIDE_EVENTS.joined, onRideJoined);
      socketService.off(RIDE_EVENTS.incoming, onRideMessage);
      socketService.off('errorMessage', onError);
    };
  }, [hasToken, rideId]);

  const send = text => {
    const outgoing = String(text ?? input).trim();
    if (!outgoing || !rideId) return;
    setInput('');
    setChatError('');
    socketService.emit(RIDE_EVENTS.send, {rideId, message: outgoing});
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
        <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 rounded-xl border border-slate-100 items-center justify-center">
          <ArrowLeft size={18} color="#0f172a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[14px] font-black text-slate-900">{peer.name}</Text>
          <Text className="text-[10px] font-bold text-emerald-500 uppercase">{peer.subtitle}</Text>
        </View>
        <Pressable
          onPress={() => (peer.phone ? Linking.openURL(`tel:${peer.phone}`) : null)}
          className="w-9 h-9 rounded-xl border border-slate-100 items-center justify-center">
          <Phone size={15} color="#334155" />
        </Pressable>
      </View>

      {isJoining ? (
        <View className="flex-1 items-center justify-center">
          <View className="flex-row items-center gap-3 rounded-2xl bg-white border border-slate-100 px-4 py-3">
            <Loader2 size={18} color="#64748b" />
            <Text className="text-[13px] font-bold text-slate-600">Connecting trip chat...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{padding: 16, gap: 10}}
          ListEmptyComponent={
            !chatError ? (
              <View className="items-center pt-6">
                <View className="rounded-2xl bg-white border border-slate-100 px-4 py-3">
                  <Text className="text-[12px] font-bold text-slate-500">Trip chat is connected.</Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({item}) => {
            const isUser = item.sender === 'user';
            return (
              <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
                <View className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${isUser ? 'bg-slate-900' : 'bg-white border border-slate-100'}`}>
                  <Text className={`text-[14px] font-bold ${isUser ? 'text-white' : 'text-slate-800'}`}>{item.text}</Text>
                  <Text className={`text-[9px] font-black mt-1 uppercase ${isUser ? 'text-white/50' : 'text-slate-400'}`}>{item.time}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {!!chatError && (
        <View className="mx-4 mb-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
          <Text className="text-[12px] font-bold text-rose-600">{chatError}</Text>
        </View>
      )}

      <View className="bg-white border-t border-slate-100 px-4 pt-3 pb-4 gap-2.5">
        <FlatList
          data={QUICK_REPLIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={r => r}
          renderItem={({item}) => (
            <Pressable onPress={() => send(item)} className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 mr-2">
              <Text className="text-[11px] font-black text-slate-600">{item}</Text>
            </Pressable>
          )}
        />
        <View className="flex-row items-center gap-2 bg-slate-50 rounded-2xl px-3 py-1 border border-slate-100">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={rideId ? 'Type a message...' : 'Ride chat unavailable'}
            editable={Boolean(rideId) && !isJoining}
            onSubmitEditing={() => send()}
            className="flex-1 text-[14px] font-bold text-slate-900 py-2.5"
          />
          <Pressable
            onPress={() => send()}
            disabled={!input.trim() || !rideId || isJoining}
            className="w-8 h-8 rounded-lg items-center justify-center"
            style={{backgroundColor: input.trim() && rideId && !isJoining ? '#0f172a' : '#e2e8f0'}}>
            <Send size={14} color={input.trim() && rideId && !isJoining ? '#fff' : '#94a3b8'} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
