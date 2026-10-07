import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, Send, Smile } from 'lucide-react-native';
import { Press } from '../../components/ui';
import Img from '../../components/Img';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { useKeyboardHeight } from '../../lib/useKeyboard';
import { localStore } from '../../lib/storage';
import Text from '../components/UpperText';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { outfit, tw } from '../../theme';
import { socketService } from '../api/socket';

// Web: Taxi/modules/user/pages/ride/Chat.jsx, driver role (/taxi/driver/chat).

const fo = outfit;
const RIDE_EVENTS = { joined: 'ride:joined', state: 'ride:state', send: 'ride:message:send', incoming: 'ride:message:new' };
const CURRENT_RIDE_STORAGE_KEY = 'Appzeto 24_current_ride';

// Web: getCurrentRide() of the user module's currentRideService.
const getCurrentRide = () => {
  try {
    const rawRide = localStore.getItem(CURRENT_RIDE_STORAGE_KEY);
    return rawRide ? JSON.parse(rawRide) : null;
  } catch {
    return null;
  }
};

const toClock = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const normalizeMessage = (message, fallbackRole) => ({
  id: String(message?.id || message?._id || `${message?.senderId || 'msg'}-${message?.sentAt || Date.now()}`),
  senderRole: String(message?.senderRole || fallbackRole || '').toLowerCase(),
  senderId: String(message?.senderId || ''),
  message: String(message?.message || '').trim(),
  sentAt: message?.sentAt || new Date().toISOString(),
});

const buildPeerFromRideState = (ride, chatRole, fallbackPeer = {}) => {
  const otherParty = chatRole === 'driver' ? ride?.user : ride?.driver;
  const fallbackName = chatRole === 'driver' ? 'Passenger' : 'Driver';
  const fallbackSubtitle = chatRole === 'driver' ? 'Passenger - Active now' : 'Driver - Active now';
  return {
    name: otherParty?.name || fallbackPeer.name || fallbackName,
    phone: otherParty?.phone || otherParty?.mobile || otherParty?.phoneNumber || fallbackPeer.phone || '',
    subtitle: fallbackPeer.subtitle || fallbackSubtitle,
  };
};

function Bubble({ m }) {
  const isUser = m.sender === 'user';
  const a = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [isUser ? 12 : -12, 0] }) }],
      }}
    >
      <View style={[st.bubble, isUser ? st.bubbleMe : st.bubbleOther]}>
        <Text style={[{ fontSize: 14, lineHeight: 22.75, color: isUser ? '#fff' : tw.slate800 }, fo(700)]}>{m.text}</Text>
        <Text style={[{ fontSize: 9, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.9, color: isUser ? 'rgba(255,255,255,0.5)' : tw.slate400 }, fo(900)]}>{m.time}</Text>
      </View>
    </Animated.View>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const insets = useSafeAreaInsets();
  // Android is edge-to-edge: the keyboard does not resize the window, so the screen is lifted by hand.
  const keyboard = useKeyboardHeight();
  const androidKeyboard = Platform.OS === 'android' ? keyboard : 0;
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeRole = searchParams.get('role');
  // The web decides by path: /taxi/driver/* is the driver's chat.
  const chatRole = routeRole === 'driver' || routeRole === 'user' ? routeRole : 'driver';

  const state = location.state;
  const peerFromState = useMemo(() => state?.peer || state?.driver || {}, [state]);
  const rideId = state?.rideId || getCurrentRide()?.rideId || '';
  const hasLiveToken = Boolean(
    chatRole === 'driver'
      ? localStore.getItem('driverToken') || localStore.getItem('token')
      : localStore.getItem('userToken') || localStore.getItem('token'),
  );

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatError, setChatError] = useState('');
  const [isJoiningRide, setIsJoiningRide] = useState(true);
  const [resolvedPeer, setResolvedPeer] = useState({
    name: peerFromState.name || (chatRole === 'driver' ? 'Passenger' : 'Driver'),
    phone: peerFromState.phone || peerFromState.mobile || peerFromState.phoneNumber || '',
    subtitle: peerFromState.subtitle || (chatRole === 'driver' ? 'Passenger - Active now' : 'Driver - Active now'),
  });
  const scrollRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages]);

  const quickReplies = ['Wait for me', "I'm coming", 'Where exactly?', 'Okay'];

  useEffect(() => {
    if (!hasLiveToken) return undefined;
    if (!rideId) {
      setIsJoiningRide(false);
      setChatError('Ride chat is unavailable because no active ride was found.');
      return undefined;
    }
    const socket = socketService.connect({ role: chatRole });
    if (!socket) {
      setIsJoiningRide(false);
      setChatError('Could not connect trip chat right now.');
      return undefined;
    }

    const mapMsg = (n) => ({ id: n.id, sender: n.senderRole === chatRole ? 'user' : 'other', text: n.message, time: toClock(n.sentAt) });

    const onRideState = (ride) => {
      if (!ride || String(ride.rideId || ride._id || '') !== String(rideId)) return;
      setResolvedPeer(buildPeerFromRideState(ride, chatRole, peerFromState));
      setMessages(
        Array.isArray(ride.messages)
          ? ride.messages.map((message) => normalizeMessage(message, chatRole)).filter((message) => message.message).map(mapMsg)
          : [],
      );
      setChatError('');
      setIsJoiningRide(false);
    };
    const onRideJoined = (payload) => {
      if (String(payload?.rideId || '') === String(rideId)) setChatError('');
    };
    const onRideMessage = (message) => {
      const normalized = normalizeMessage(message, chatRole);
      if (!normalized.message || String(message?.rideId || '') !== String(rideId)) return;
      setMessages((prev) => (prev.some((entry) => entry.id === normalized.id) ? prev : [...prev, mapMsg(normalized)]));
    };
    const onSocketError = (payload) => {
      setChatError(payload?.message || 'Could not load ride chat.');
      setIsJoiningRide(false);
    };

    socketService.on(RIDE_EVENTS.state, onRideState);
    socketService.on(RIDE_EVENTS.joined, onRideJoined);
    socketService.on(RIDE_EVENTS.incoming, onRideMessage);
    socketService.on('errorMessage', onSocketError);
    socketService.emit('joinRide', { rideId });
    socketService.emit('ride:join', { rideId });
    return () => {
      socketService.off(RIDE_EVENTS.state, onRideState);
      socketService.off(RIDE_EVENTS.joined, onRideJoined);
      socketService.off(RIDE_EVENTS.incoming, onRideMessage);
      socketService.off('errorMessage', onSocketError);
    };
  }, [chatRole, hasLiveToken, peerFromState, rideId]);

  const send = (text) => {
    const outgoing = String(text || input).trim();
    if (!outgoing || !rideId) return;
    setInput('');
    setChatError('');
    socketService.emit(RIDE_EVENTS.send, { rideId, message: outgoing });
  };

  const otherName = resolvedPeer.name;
  const otherPhone = resolvedPeer.phone;
  const canSend = Boolean(input.trim() && rideId && !isJoiningRide);

  const call = () => {
    if (!otherPhone) {
      Alert.alert('', 'Phone number is not available for this chat yet.');
      return;
    }
    Linking.openURL(`tel:${String(otherPhone).replace(/[^\d+]/g, '')}`).catch(() => {});
  };

  return (
    <LinearGradient colors={['#F8FAFC', '#F3F4F6', '#EEF2F7']} locations={[0, 0.6, 1]} style={{ flex: 1, overflow: 'hidden' }}>
      <View pointerEvents="none" style={st.blob} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, paddingBottom: androidKeyboard }}>
        <View style={[st.header, { paddingTop: insets.top + 14 }]}>
          <Press onPress={() => navigate(-1)} style={st.backSquare}>
            <ArrowLeft size={18} color={tw.slate900} strokeWidth={2.5} />
          </Press>
          <View style={{ marginLeft: 12 }}>
            <View style={st.avatarBox}>
              <Img source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=f1f5f9&color=0f172a&format=png` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <View style={st.online} />
          </View>
          <View style={{ flex: 1, minWidth: 0, marginHorizontal: 12 }}>
            <Text style={[{ fontSize: 14, lineHeight: 17.5, color: tw.slate900 }, fo(900)]}>{otherName}</Text>
            <Text style={[{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: tw.emerald500 }, fo(900)]}>{resolvedPeer.subtitle}</Text>
          </View>
          <Press onPress={call} style={[st.sqBtn, { boxShadow: '0 4px 12px rgba(15,23,42,0.07)' }]}>
            <Phone size={15} color={tw.slate700} strokeWidth={2.5} />
          </Press>
        </View>

        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {isJoiningRide ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={st.pill}>
                <ActivityIndicator size="small" color={tw.slate500} />
                <Text style={[{ fontSize: 13, color: tw.slate600, marginLeft: 12 }, fo(700)]}>Connecting trip chat...</Text>
              </View>
            </View>
          ) : (
            <>
              {!messages.length && !chatError ? (
                <View style={{ alignItems: 'center', paddingTop: 24 }}>
                  <View style={st.pill}>
                    <Text style={[{ fontSize: 12, color: tw.slate500 }, fo(700)]}>Trip chat is connected.</Text>
                  </View>
                </View>
              ) : null}
              {chatError ? (
                <View style={st.errBox}>
                  <Text style={[{ fontSize: 12, color: tw.rose600 }, fo(700)]}>{chatError}</Text>
                </View>
              ) : null}
              {messages.map((m) => <Bubble key={m.id} m={m} />)}
            </>
          )}
        </ScrollView>

        <View style={[st.footer, { paddingBottom: androidKeyboard > 0 ? 12 : Math.max(insets.bottom, 0) + 24 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }} keyboardShouldPersistTaps="handled">
            {quickReplies.map((r) => (
              <Press key={r} scale={0.95} onPress={() => send(r)} style={st.chip}>
                <Text style={[{ fontSize: 11, color: tw.slate600 }, fo(900)]}>{r}</Text>
              </Press>
            ))}
          </ScrollView>
          <View style={st.inputRow}>
            <Smile size={18} color={tw.slate400} strokeWidth={2} />
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              editable={Boolean(rideId) && !isJoiningRide}
              placeholder={rideId ? 'Type a message...' : 'Ride chat unavailable'}
              placeholderTextColor={tw.slate300}
              style={[{ flex: 1, fontSize: 14, marginHorizontal: 8, paddingVertical: 0, color: rideId && !isJoiningRide ? tw.slate900 : tw.slate400 }, fo(700)]}
            />
            <Press
              onPress={() => send()}
              disabled={!canSend}
              scale={0.9}
              style={[st.sendBtn, canSend ? { backgroundColor: tw.slate900, boxShadow: '0 4px 10px rgba(15,23,42,0.2)' } : { backgroundColor: tw.slate200 }]}
            >
              <Send size={14} color={canSend ? '#fff' : tw.slate400} strokeWidth={2.5} />
            </Press>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  blob: { position: 'absolute', top: -64, right: -40, width: 176, height: 176, borderRadius: 88, backgroundColor: 'rgba(255,237,212,0.5)' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, backgroundColor: 'rgba(255,255,255,0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.8)', boxShadow: '0 4px 20px rgba(15,23,42,0.05)' },
  backSquare: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(15,23,42,0.07)' },
  avatarBox: { width: 40, height: 40, borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: tw.slate100 },
  online: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: tw.emerald500, borderWidth: 2, borderColor: '#fff' },
  sqBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: tw.slate100, paddingHorizontal: 16, paddingVertical: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  errBox: { borderRadius: 16, borderWidth: 1, borderColor: tw.rose100, backgroundColor: tw.rose50, paddingHorizontal: 16, paddingVertical: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  bubble: { maxWidth: '78%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, boxShadow: '0 2px 8px rgba(15,23,42,0.06)' },
  bubbleMe: { backgroundColor: tw.slate900, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', borderBottomLeftRadius: 6 },
  footer: { backgroundColor: 'rgba(255,255,255,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 16, paddingTop: 12, gap: 10, boxShadow: '0 -4px 20px rgba(15,23,42,0.05)' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(248,250,252,0.8)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: tw.slate100 },
  sendBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
