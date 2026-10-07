import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, Send, Smile } from 'lucide-react-native';
import { Spinner } from '../../../../components/ui';
import { Chip, IconButton } from '../../../../components/ds';
import Img from '../../../../components/Img';
import { useAnimatedValue } from '../../../../lib/useAnimatedValue';
import { localStore } from '../../../../lib/storage';
import { useLocation, useNavigate } from '../../../../lib/webRouter';
import { color, elevation, radii, space, type } from '../../../../theme';
import { socketService } from '../../../../taxi/api/socket';
import { getCurrentRide } from '../../../../taxi/services/currentRideService';
import UserSupportChatPanel from '../../../../taxi/components/UserSupportChatPanel';
import { goBack } from '../../../../taxi/account/ui';

// Web: Taxi/modules/user/pages/ride/Chat.jsx (/taxi/user/ride/chat)

const RIDE_EVENTS = { joined: 'ride:joined', state: 'ride:state', send: 'ride:message:send', incoming: 'ride:message:new' };

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
        <Text style={[st.bubbleText, { color: isUser ? color.onPrimary : color.text }]}>{m.text}</Text>
        {m.time ? <Text style={[st.bubbleTime, { color: isUser ? 'rgba(255,255,255,0.75)' : color.textMuted }]}>{m.time}</Text> : null}
      </View>
    </Animated.View>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const insets = useSafeAreaInsets();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isAdminChat = searchParams.get('admin') === 'true';
  const routeRole = searchParams.get('role');
  const chatRole = routeRole === 'driver' || routeRole === 'user' ? routeRole : 'user';

  const state = location.state;
  const peerFromState = useMemo(() => state?.peer || state?.driver || {}, [state]);
  const initialDraft = String(state?.initialDraft || '').trim();
  const rideId = state?.rideId || getCurrentRide()?.rideId || '';
  const hasLiveToken = Boolean(
    chatRole === 'driver'
      ? localStore.getItem('driverToken') || localStore.getItem('token')
      : localStore.getItem('userToken') || localStore.getItem('token'),
  );

  const [messages, setMessages] = useState(() => (
    isAdminChat ? [{ id: 'support-init', sender: 'other', text: 'Hello! How can we help you today?', time: '12:45' }] : []
  ));
  const [input, setInput] = useState('');
  const [chatError, setChatError] = useState('');
  const [isJoiningRide, setIsJoiningRide] = useState(!isAdminChat);
  const [resolvedPeer, setResolvedPeer] = useState({
    name: peerFromState.name || (chatRole === 'driver' ? 'Passenger' : 'Driver'),
    phone: peerFromState.phone || peerFromState.mobile || peerFromState.phoneNumber || '',
    subtitle: peerFromState.subtitle || (chatRole === 'driver' ? 'Passenger - Active now' : 'Driver - Active now'),
  });
  const scrollRef = useRef(null);
  // iOS keyboard: this screen sits under the module header, so the avoiding view needs its window offset.
  const kavRef = useRef(null);
  const [kavOffset, setKavOffset] = useState(0);
  const measureKav = () => kavRef.current?.measureInWindow?.((_x, y) => setKavOffset(Number(y) || 0));

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages]);

  const quickReplies = isAdminChat ? ['Payment Issue', 'Ride Cancelled', 'Lost Item', 'Safety'] : ['Wait for me', "I'm coming", 'Where exactly?', 'Okay'];

  useEffect(() => {
    if (isAdminChat || !hasLiveToken) return undefined;
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
  }, [chatRole, hasLiveToken, isAdminChat, peerFromState, rideId]);

  if (isAdminChat && hasLiveToken) {
    return (
      <View style={st.screen}>
        <KeyboardAvoidingView ref={kavRef} onLayout={measureKav} keyboardVerticalOffset={kavOffset} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.lg }}>
          <View style={st.adminHead}>
            <IconButton icon={ArrowLeft} label="Go back" onPress={() => goBack()} style={st.backBtn} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.kicker}>Support</Text>
              <Text style={st.adminTitle}>{chatRole === 'driver' ? 'Driver Chat' : 'User Chat'}</Text>
            </View>
          </View>
          <UserSupportChatPanel title={chatRole === 'driver' ? 'Driver Support' : 'User Support'} subtitle="Connected to the support desk" preferredRole={chatRole} initialDraft={initialDraft} />
        </KeyboardAvoidingView>
      </View>
    );
  }

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

  const listHeader = isJoiningRide ? null : (
    <>
      {!messages.length && !chatError ? (
        <View style={st.center}>
          <View style={st.pill}>
            <Text style={st.pillText}>Trip chat is connected.</Text>
          </View>
        </View>
      ) : null}
      {chatError ? (
        <View style={st.errBox} accessibilityLiveRegion="polite">
          <Text style={st.errText}>{chatError}</Text>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={st.screen}>
      <KeyboardAvoidingView ref={kavRef} onLayout={measureKav} keyboardVerticalOffset={kavOffset} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[st.header, { paddingTop: insets.top + space.sm }]}>
          <IconButton icon={ArrowLeft} label="Go back" onPress={() => navigate(-1)} />
          <View>
            <View style={st.avatarBox}>
              <Img source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=E8F2EC&color=0A4D2B&format=png` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <View style={st.online} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.peerName} numberOfLines={1}>{otherName}</Text>
            <Text style={st.peerSub} numberOfLines={1}>{resolvedPeer.subtitle}</Text>
          </View>
          <IconButton icon={Phone} label={`Call ${otherName}`} variant="primary" onPress={call} />
        </View>

        {isJoiningRide ? (
          <View style={[st.center, { flex: 1 }]}>
            <View style={st.pill}>
              <Spinner size={18} color={color.primary} />
              <Text style={st.pillText}>Connecting trip chat...</Text>
            </View>
          </View>
        ) : (
          <FlatList
            ref={scrollRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <Bubble m={item} />}
            ListHeaderComponent={listHeader}
            style={{ flex: 1 }}
            contentContainerStyle={st.list}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <View style={[st.footer, { paddingBottom: insets.bottom + space.md }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} keyboardShouldPersistTaps="handled">
            {quickReplies.map((r) => (
              <Chip key={r} label={r} onPress={() => send(r)} />
            ))}
          </ScrollView>
          <View style={st.inputRow}>
            <Smile size={20} color={color.textMuted} />
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              editable={Boolean(rideId) && !isJoiningRide}
              placeholder={rideId ? 'Type a message...' : 'Ride chat unavailable'}
              placeholderTextColor={color.textDisabled}
              accessibilityLabel="Message"
              style={[st.input, { color: rideId && !isJoiningRide ? color.text : color.textMuted }]}
            />
            <IconButton icon={Send} label="Send message" variant={canSend ? 'solid' : 'soft'} iconSize={18} onPress={() => send()} disabled={!canSend} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  adminHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  backBtn: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  kicker: { ...type.overline, color: color.goldText },
  adminTitle: { ...type.subheading, color: color.text },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingBottom: space.sm, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  avatarBox: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: color.primarySoft },
  online: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: color.success, borderWidth: 2, borderColor: color.surface },
  peerName: { ...type.subheading, color: color.text },
  peerSub: { ...type.caption, color: color.success },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: space.xl },
  list: { padding: space.lg, gap: space.md, flexGrow: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radii.pill, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg, paddingVertical: space.sm + 2 },
  pillText: { ...type.small, color: color.textSecondary },
  errBox: { borderRadius: radii.md, backgroundColor: color.dangerSoft, paddingHorizontal: space.lg, paddingVertical: space.md, marginBottom: space.sm },
  errText: { ...type.small, color: color.danger },
  bubble: { maxWidth: '80%', paddingHorizontal: space.lg, paddingVertical: space.sm + 2, borderRadius: radii.lg },
  bubbleMe: { backgroundColor: color.primary, borderBottomRightRadius: space.xs },
  bubbleOther: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderBottomLeftRadius: space.xs },
  bubbleText: { ...type.body },
  bubbleTime: { ...type.caption, marginTop: space.xxs, alignSelf: 'flex-end' },
  footer: { backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm + 2, ...elevation.sheet },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surfaceMuted, borderRadius: radii.lg, paddingLeft: space.md, paddingRight: space.xs, minHeight: 52, borderWidth: 1, borderColor: color.border },
  input: { flex: 1, minWidth: 0, ...type.body, paddingVertical: space.sm, outlineStyle: 'none' },
});
