import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, Send } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { useKeyboardHeight } from '../../lib/useKeyboard';
import { localStore } from '../../lib/storage';
import Text from '../components/UpperText';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { outfit, shadow } from '../../theme';
import ScreenHeader from '../ui/ScreenHeader';
import { DT } from '../ui/dt';
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
        <Text style={[{ fontSize: 14, lineHeight: 22.75, color: isUser ? DT.onBrand : DT.ink }, fo(600)]}>{m.text}</Text>
        <Text style={[{ fontSize: 10, marginTop: 4, minWidth: 30, color: isUser ? DT.onBrandMuted : DT.muted }, fo(700)]}>{m.time}</Text>
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
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: DT.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, paddingBottom: androidKeyboard }}>
        <ScreenHeader
          title={otherName}
          subtitle={resolvedPeer.subtitle}
          onBack={() => navigate(-1)}
          right={(
            <Press onPress={call} accessibilityLabel="Call" scale={0.92} style={st.callBtn}>
              <Phone size={18} color={DT.brand} strokeWidth={2.5} />
            </Press>
          )}
        />

        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 10, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {isJoiningRide ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={st.pill}>
                <ActivityIndicator size="small" color={DT.brand} />
                <Text style={[{ fontSize: 13, color: DT.inkSoft, marginLeft: 12 }, fo(700)]}>Connecting trip chat...</Text>
              </View>
            </View>
          ) : (
            <>
              {!messages.length && !chatError ? (
                <View style={{ alignItems: 'center', paddingTop: 24 }}>
                  <View style={st.pill}>
                    <Text style={[{ fontSize: 12, color: DT.muted }, fo(700)]}>Trip chat is connected.</Text>
                  </View>
                </View>
              ) : null}
              {chatError ? (
                <View style={st.errBox}>
                  <Text style={[{ fontSize: 12, color: DT.dangerInk }, fo(700)]}>{chatError}</Text>
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
                <Text style={[{ fontSize: 12, color: DT.brand }, fo(700)]}>{r}</Text>
              </Press>
            ))}
          </ScrollView>
          <View style={st.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              editable={Boolean(rideId) && !isJoiningRide}
              placeholder={rideId ? 'Type a message...' : 'Ride chat unavailable'}
              placeholderTextColor={DT.faint}
              style={[{ flex: 1, fontSize: 15, minHeight: 44, marginRight: 8, paddingVertical: 0, color: rideId && !isJoiningRide ? DT.ink : DT.faint }, fo(600)]}
            />
            <Press
              onPress={() => send()}
              disabled={!canSend}
              accessibilityLabel="Send message"
              scale={0.9}
              style={[st.sendBtn, canSend ? { backgroundColor: DT.cta } : { backgroundColor: DT.bgSoft }]}
            >
              <Send size={18} color={canSend ? DT.ctaInk : DT.faint} strokeWidth={2.5} />
            </Press>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.cta, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: DT.radius.pill, backgroundColor: DT.card, borderWidth: 1, borderColor: DT.borderSoft, paddingHorizontal: 18, paddingVertical: 12, ...shadow('sm') },
  errBox: { borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.dangerSoft, backgroundColor: DT.dangerSoft, paddingHorizontal: 16, paddingVertical: 12 },
  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  bubbleMe: { backgroundColor: DT.brand, borderBottomRightRadius: 6, ...shadow('sm') },
  bubbleOther: { backgroundColor: DT.card, borderWidth: 1, borderColor: DT.border, borderBottomLeftRadius: 6, ...shadow('xs') },
  footer: { backgroundColor: DT.card, borderTopWidth: 1, borderTopColor: DT.borderSoft, borderTopLeftRadius: DT.radius.xl, borderTopRightRadius: DT.radius.xl, paddingHorizontal: 16, paddingTop: 12, gap: 10, ...shadow('navTop') },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: DT.radius.pill, borderWidth: 1, borderColor: DT.brandBorder, backgroundColor: DT.brandSoft },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: DT.bg, borderRadius: DT.radius.pill, paddingLeft: 18, paddingRight: 6, paddingVertical: 6, borderWidth: 1, borderColor: DT.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
