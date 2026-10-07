import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bot, CircleUser, Clock3, MessageCircle, RefreshCcw, Send, ShieldCheck, Trash2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { useKeyboardHeight } from '../../lib/useKeyboard';
import Text from './UpperText';
import { localStore } from '../../lib/storage';
import { outfit as fo, shadow } from '../../theme';
import { DT } from '../ui/dt';
import { socketService } from '../api/socket';
import { deleteSupportConversation, getSupportConversations, getSupportMessages, markSupportMessagesRead, sendSupportMessage } from '../shared/chat/chatApi';
import { getChatSession, parseSupportConversationKey } from '../shared/chat/chatIdentity';

// Web: Taxi/modules/shared/components/UserSupportChatPanel.jsx (participant mode; the driver mounts it with surface="plain")

const quickReplies = ['Payment issue', 'Ride delayed', 'Lost item', 'Safety concern'];

const formatTime = (value) => {
  if (!value) return 'Just now';
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return 'Just now';
  }
};

const normalizeMessage = (message) => ({
  ...message,
  sender: { role: message?.sender?.role || 'user', id: message?.sender?.id || '', name: message?.sender?.name || '', phone: message?.sender?.phone || '' },
  receiver: { role: message?.receiver?.role || 'admin', id: message?.receiver?.id || '', name: message?.receiver?.name || '', phone: message?.receiver?.phone || '' },
});

const normalizeConversation = (conversation) => ({
  conversationKey: conversation.conversationKey,
  peer: conversation.peer || { role: 'admin', id: '', name: 'Support Team', phone: '' },
  latestMessage: conversation.latestMessage ? normalizeMessage(conversation.latestMessage) : null,
  unreadCount: conversation.unreadCount || 0,
  updatedAt: conversation.updatedAt || conversation.latestMessage?.createdAt || null,
});

const getConversationIdentityKey = (conversationKey) => parseSupportConversationKey(conversationKey)?.canonicalKey || String(conversationKey || '');

const mergeConversationEntry = (existing = {}, incoming = {}) => {
  const existingUpdatedAt = new Date(existing.updatedAt || 0).getTime();
  const incomingUpdatedAt = new Date(incoming.updatedAt || 0).getTime();
  const prefersIncoming = incomingUpdatedAt >= existingUpdatedAt;
  return {
    ...existing,
    ...incoming,
    conversationKey: prefersIncoming ? (incoming.conversationKey || existing.conversationKey) : (existing.conversationKey || incoming.conversationKey),
    peer: { ...(existing.peer || {}), ...(incoming.peer || {}) },
    latestMessage: incoming.latestMessage || existing.latestMessage || null,
    unreadCount: Math.max(existing.unreadCount || 0, incoming.unreadCount || 0),
    updatedAt: incoming.updatedAt || existing.updatedAt || null,
  };
};

const dedupeConversations = (list = []) => {
  const merged = new Map();
  for (const conversation of list) {
    const identityKey = getConversationIdentityKey(conversation.conversationKey);
    merged.set(identityKey, mergeConversationEntry(merged.get(identityKey), conversation));
  }
  return Array.from(merged.values()).sort((l, r) => new Date(r.updatedAt || 0) - new Date(l.updatedAt || 0));
};

function Dot({ color, animate }) {
  const o = useAnimatedValue(1);
  useEffect(() => {
    if (!animate) return undefined;
    const e = Easing.bezier(0.4, 0, 0.6, 1);
    const a = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 0.5, duration: 1000, easing: e, useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: 1000, easing: e, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [animate, o]);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: o }} />;
}

export default function UserSupportChatPanel({ title = 'Support Chat', subtitle = 'Live messages with admin', preferredRole, initialDraft = '', surface = 'card', style }) {
  const isPlainSurface = surface === 'plain';
  // Android is edge-to-edge: the keyboard does not resize the window, so the panel is lifted by hand, and the
  // composer clears the gesture bar.
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const bottomGap = Platform.OS === 'android' && keyboard > 0 ? keyboard : insets.bottom;
  const session = useMemo(() => getChatSession(preferredRole), [preferredRole]);
  const isLiveEnabled = session.isAuthenticated;

  useEffect(() => {
    if (!session.role || session.role === 'guest') return undefined;
    localStore.setItem('chatRole', session.role);
    return () => {
      if (localStore.getItem('chatRole') === session.role) localStore.removeItem('chatRole');
    };
  }, [session.role]);

  const [conversations, setConversations] = useState([]);
  const [selectedConversationKey, setSelectedConversationKey] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const scrollRef = useRef(null);
  const appliedInitialDraftRef = useRef('');

  const normalizedSelectedConversationKey = useMemo(() => getConversationIdentityKey(selectedConversationKey), [selectedConversationKey]);
  const selectedConversation = useMemo(
    () => conversations.find((item) => getConversationIdentityKey(item.conversationKey) === normalizedSelectedConversationKey) || null,
    [conversations, normalizedSelectedConversationKey],
  );

  const isMessageForActiveConversation = (message, conversationKey = selectedConversationKey) => {
    const parsed = parseSupportConversationKey(conversationKey);
    if (!parsed || !message?.sender || !message?.receiver) return false;
    const sessionId = session.id ? String(session.id) : '';
    const senderId = String(message.sender.id || '');
    const receiverId = String(message.receiver.id || '');
    if (!sessionId || !senderId || !receiverId) {
      return message.conversationKey === conversationKey || message.conversationKey === parsed.canonicalKey;
    }
    return (
      (message.sender.role === session.role && senderId === sessionId && message.receiver.role === 'admin' && receiverId === String(parsed.adminId))
      || (message.sender.role === 'admin' && senderId === String(parsed.adminId) && message.receiver.role === session.role && receiverId === sessionId)
    );
  };

  const syncConversationList = (message) => {
    setConversations((current) => {
      const latestMessage = normalizeMessage(message);
      const parsed = parseSupportConversationKey(message.conversationKey);
      const identityKey = getConversationIdentityKey(message.conversationKey);
      const existing = current.find((item) => getConversationIdentityKey(item.conversationKey) === identityKey) || null;
      const adminSide = latestMessage.sender.role === 'admin'
        ? { role: 'admin', id: latestMessage.sender.id, name: latestMessage.sender.name, phone: latestMessage.sender.phone }
        : { role: 'admin', id: latestMessage.receiver.id, name: latestMessage.receiver.name, phone: latestMessage.receiver.phone };
      const peer = { ...adminSide, name: adminSide.name || 'Support Team', phone: adminSide.phone || '' };
      const unreadCount = message.receiver.role === session.role && message.sender.role !== session.role && normalizedSelectedConversationKey !== identityKey
        ? (existing?.unreadCount || 0) + 1
        : 0;
      const nextConversation = { conversationKey: parsed?.canonicalKey || message.conversationKey, peer, latestMessage, unreadCount, updatedAt: message.createdAt };
      const next = current.map((item) => (getConversationIdentityKey(item.conversationKey) === identityKey ? mergeConversationEntry(item, nextConversation) : item));
      if (next.some((item) => getConversationIdentityKey(item.conversationKey) === identityKey)) return dedupeConversations(next);
      return dedupeConversations([nextConversation, ...current]);
    });
  };

  const resolveConversationKeys = (conversationKey) => {
    const parsed = parseSupportConversationKey(conversationKey);
    return parsed?.keys || (conversationKey ? [conversationKey] : []);
  };
  const matchesConversationKey = (l, r) => {
    const rk = resolveConversationKeys(r);
    return resolveConversationKeys(l).some((key) => rk.includes(key));
  };

  useEffect(() => {
    if (!isLiveEnabled) return undefined;
    socketService.connect({ role: session.role, token: session.token });

    const handleMessage = (incoming) => {
      const message = normalizeMessage(incoming);
      syncConversationList(message);
      if (isMessageForActiveConversation(message)) {
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
        if (message.sender.role !== session.role) socketService.emit('chat:read', { conversationKey: message.conversationKey });
      }
    };
    const handleConversationUpdate = ({ message }) => {
      if (message) syncConversationList(normalizeMessage(message));
    };
    const handleSocketError = (payload) => setError(payload?.message || 'Socket connection error');
    const handleConversationDeleted = (payload) => {
      const deletedKeys = payload?.keys || resolveConversationKeys(payload?.conversationKey);
      const isActiveDeleted = resolveConversationKeys(selectedConversationKey).some((key) => deletedKeys.includes(key));
      if (isActiveDeleted) {
        setMessages([]);
        setDraft('');
      }
      setConversations((current) => {
        const next = current.filter((item) => !deletedKeys.includes(item.conversationKey));
        if (next.length === 0 && current.length > 0) {
          return [{ ...current[0], latestMessage: null, unreadCount: 0, updatedAt: null }];
        }
        return next.map((item) => (deletedKeys.includes(item.conversationKey) ? { ...item, latestMessage: null, unreadCount: 0, updatedAt: null } : item));
      });
    };
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('chat:message', handleMessage);
    socketService.on('chat:conversation-updated', handleConversationUpdate);
    socketService.on('chat:conversation-deleted', handleConversationDeleted);
    socketService.on('errorMessage', handleSocketError);
    setIsConnected(socketService.isConnected());
    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('chat:message', handleMessage);
      socketService.off('chat:conversation-updated', handleConversationUpdate);
      socketService.off('chat:conversation-deleted', handleConversationDeleted);
      socketService.off('errorMessage', handleSocketError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveEnabled, session.role, selectedConversationKey]);

  useEffect(() => {
    if (!isLiveEnabled) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getSupportConversations(session.token);
        const next = (response?.data?.conversations || []).map(normalizeConversation);
        if (!active) return;
        setConversations((current) => dedupeConversations([...current, ...next]));
        if (!selectedConversationKey && next.length > 0) setSelectedConversationKey(getConversationIdentityKey(next[0].conversationKey));
      } catch (e) {
        if (active) setError(e?.message || 'Unable to load conversations');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveEnabled]);

  useEffect(() => {
    if (!isLiveEnabled || !selectedConversationKey) return undefined;
    let active = true;
    (async () => {
      setMessages([]);
      setLoading(true);
      setError('');
      try {
        const response = await getSupportMessages(selectedConversationKey, session.token);
        const next = (response?.data?.messages || []).map(normalizeMessage).filter((m) => isMessageForActiveConversation(m, selectedConversationKey));
        if (!active) return;
        setMessages(next.sort((l, r) => new Date(l.createdAt || 0) - new Date(r.createdAt || 0)));
        socketService.emit('chat:join', { conversationKey: selectedConversationKey });
        socketService.emit('chat:read', { conversationKey: selectedConversationKey });
        await markSupportMessagesRead(selectedConversationKey, session.token);
      } catch (e) {
        if (active) setError(e?.message || 'Unable to load messages');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveEnabled, selectedConversationKey]);

  useEffect(() => {
    const parsed = parseSupportConversationKey(selectedConversationKey);
    if (parsed && parsed.canonicalKey !== selectedConversationKey) setSelectedConversationKey(parsed.canonicalKey);
  }, [selectedConversationKey]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    const normalized = String(initialDraft || '').trim();
    if (!normalized || appliedInitialDraftRef.current === normalized) return;
    setDraft((current) => current || normalized);
    appliedInitialDraftRef.current = normalized;
  }, [initialDraft]);

  const handleClearChat = async () => {
    if (!selectedConversationKey || deleting) return;
    setDeleting(true);
    setError('');
    try {
      await deleteSupportConversation(selectedConversationKey, session.token);
      const selectedKeys = resolveConversationKeys(selectedConversationKey);
      setMessages([]);
      setDraft('');
      setConversations((current) => current.map((item) => (
        selectedKeys.some((key) => matchesConversationKey(item.conversationKey, key))
          ? { ...item, latestMessage: null, unreadCount: 0, updatedAt: null }
          : item
      )));
    } catch (e) {
      setError(e?.message || 'Unable to delete chat');
    } finally {
      setDeleting(false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !selectedConversationKey) return;
    setSending(true);
    setError('');
    const payload = { message: text, conversationKey: selectedConversationKey };
    try {
      if (socketService.isConnected()) {
        socketService.emit('chat:send', payload);
      } else {
        const response = await sendSupportMessage(payload, session.token);
        const saved = normalizeMessage(response?.data?.message);
        if (saved?.id) {
          setMessages((current) => [...current, saved]);
          syncConversationList(saved);
        }
      }
      setDraft('');
    } catch (e) {
      setError(e?.message || 'Unable to send message');
    } finally {
      setSending(false);
    }
  };

  if (!isLiveEnabled) {
    return (
      <View style={[isPlainSurface ? { flex: 1, backgroundColor: DT.bg, padding: 24 } : [st.card, { padding: 32 }], style]}>
        <View style={st.row}>
          <View style={[st.iconBox, { marginRight: 12 }]}><ShieldCheck size={20} color={DT.accent} /></View>
          <View>
            <Text style={[st.eyebrow, fo(600)]}>Support Chat</Text>
            <Text style={[{ fontSize: 20, color: DT.ink }, fo(800)]}>{title}</Text>
          </View>
        </View>
        <Text style={[{ marginTop: 16, fontSize: 13, lineHeight: 22, color: DT.muted }, fo(600)]}>
          Live chat will activate once the current session has a valid token.
        </Text>
      </View>
    );
  }

  const canSend = !sending && Boolean(draft.trim());
  const peerName = selectedConversation?.peer?.name || 'Support Team';
  const threadLabel = session.role === 'driver' ? 'Driver Support Thread' : 'User Support Thread';

  return (
    <View style={[isPlainSurface ? { flex: 1, backgroundColor: DT.bg, overflow: 'hidden' } : [st.card, { flex: 1 }], style, { paddingBottom: bottomGap }]}>
      <View style={st.head}>
        <View style={[st.row, { flexShrink: 1, minWidth: 0 }]}>
          <View style={[st.iconBox, { marginRight: 14 }]}><MessageCircle size={20} color={DT.accent} /></View>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[{ fontSize: 18, color: DT.ink }, fo(800)]}>{title}</Text>
            <View style={[st.row, { flexWrap: 'wrap' }]}>
              <Text style={[st.tiny, { color: DT.muted }, fo(800)]}>Desk Terminal</Text>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: DT.faint, marginHorizontal: 8 }} />
              <Text style={[st.tiny, { color: DT.brand }, fo(800)]}>{subtitle}</Text>
            </View>
          </View>
        </View>
        <View style={[st.conn, isConnected ? { borderColor: DT.successSoft, backgroundColor: DT.successSoft } : { borderColor: DT.dangerSoft, backgroundColor: DT.dangerSoft }]}>
          <Dot color={isConnected ? DT.success : DT.danger} animate={isConnected} />
          <Text style={[st.tiny, { fontSize: 10, letterSpacing: 0.4, marginLeft: 8, color: isConnected ? DT.successInk : DT.dangerInk }, fo(800)]}>
            {isConnected ? 'Connection: Live' : 'Connection: Offline'}
          </Text>
        </View>
      </View>

      <View style={st.threadHead}>
        <View style={[st.row, { flex: 1, minWidth: 0 }]}>
          <View style={st.avatar}>
            {selectedConversation?.peer?.role === 'driver' ? <CircleUser size={20} color={DT.accent} /> : <Bot size={20} color={DT.accent} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
            <Text numberOfLines={1} style={[{ fontSize: 15, color: DT.ink }, fo(800)]}>{peerName}</Text>
            <Text style={[{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, minWidth: 60, color: DT.successInk }, fo(700)]}>{threadLabel}</Text>
          </View>
        </View>
        <View style={st.row}>
          <Press
            onPress={() => { if (selectedConversationKey) socketService.emit('chat:read', { conversationKey: selectedConversationKey }); }}
            style={[st.toolBtn, { borderColor: DT.border, backgroundColor: DT.card }]}
          >
            <RefreshCcw size={16} color={DT.inkSoft} />
          </Press>
          <Press
            onPress={handleClearChat}
            disabled={!selectedConversationKey || messages.length === 0 || deleting}
            style={[st.toolBtn, { borderColor: DT.dangerSoft, backgroundColor: DT.dangerSoft, marginLeft: 8, opacity: !selectedConversationKey || messages.length === 0 || deleting ? 0.5 : 1 }]}
          >
            <Trash2 size={16} color={DT.dangerInk} />
          </Press>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: DT.bg }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={st.loadingPill}>
              <ActivityIndicator size="small" color={DT.brand} />
              <Text style={[{ fontSize: 12, color: DT.muted, marginLeft: 12 }, fo(700)]}>Loading messages...</Text>
            </View>
          </View>
        ) : (
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            {messages.map((message) => {
              const isMine = message.sender.id && session.id ? String(message.sender.id) === String(session.id) : message.sender.role === session.role;
              return (
                <View key={message.id} style={{ flexDirection: 'row', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <View style={{ maxWidth: '78%', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                    <View style={st.msgAvatar}>
                      {isMine ? <CircleUser size={15} color={DT.brand} /> : <Bot size={15} color={DT.brand} />}
                    </View>
                    <View style={{ flexShrink: 1, marginHorizontal: 12 }}>
                      <View style={[st.bubble, isMine
                        ? { backgroundColor: DT.brand, borderColor: DT.brand, borderBottomRightRadius: 6 }
                        : { backgroundColor: DT.card, borderColor: DT.border, borderBottomLeftRadius: 6 }]}>
                        <Text style={[{ fontSize: 14, lineHeight: 22, color: isMine ? DT.onBrand : DT.ink }, fo(600)]}>{message.message}</Text>
                      </View>
                      <View style={[st.row, { marginTop: 4, justifyContent: isMine ? 'flex-end' : 'flex-start' }]}>
                        <Clock3 size={11} color={DT.muted} />
                        <Text style={[{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, color: DT.muted, marginLeft: 6 }, fo(700)]}>{formatTime(message.createdAt)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={st.foot}>
        {error ? (
          <View style={st.err}><Text style={[{ fontSize: 12, color: DT.dangerInk }, fo(600)]}>{error}</Text></View>
        ) : null}
        <View style={st.inputBar}>
          <View style={st.shieldBtn}><ShieldCheck size={16} color={DT.brand} /></View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            placeholder="Type a message to admin"
            placeholderTextColor={DT.faint}
            style={[{ flex: 1, fontSize: 15, minHeight: 44, color: DT.ink, marginHorizontal: 10, paddingVertical: 0 }, fo(600)]}
          />
          <Press onPress={handleSend} disabled={!canSend} accessibilityLabel="Send message" style={[st.sendBtn, { backgroundColor: canSend ? DT.cta : DT.bgSoft }]}>
            {sending ? <ActivityIndicator size="small" color={DT.ctaInk} /> : <Send size={18} color={canSend ? DT.ctaInk : DT.faint} strokeWidth={2.5} />}
          </Press>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {quickReplies.map((reply) => (
            <Press key={reply} onPress={() => setDraft(reply)} style={st.chip}>
              <Text style={[{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, minWidth: 40, color: DT.brand }, fo(700)]}>{reply}</Text>
            </Press>
          ))}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, overflow: 'hidden', ...shadow('md') },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: DT.brand, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, minWidth: 60, color: DT.muted },
  tiny: { fontSize: 10, lineHeight: 14, textTransform: 'uppercase', letterSpacing: 0.4, minWidth: 40 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: DT.borderSoft, backgroundColor: DT.card },
  conn: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, borderWidth: 1, borderRadius: DT.radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  threadHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: DT.borderSoft, backgroundColor: DT.card },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.brand, alignItems: 'center', justifyContent: 'center' },
  toolBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 22, paddingHorizontal: 12 },
  loadingPill: { flexDirection: 'row', alignItems: 'center', borderRadius: DT.radius.pill, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, paddingHorizontal: 18, paddingVertical: 12, ...shadow('sm') },
  msgAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  bubble: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, ...shadow('xs') },
  foot: { borderTopWidth: 1, borderTopColor: DT.borderSoft, backgroundColor: DT.card, borderTopLeftRadius: DT.radius.xl, borderTopRightRadius: DT.radius.xl, padding: 16 },
  err: { marginBottom: 12, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.dangerSoft, backgroundColor: DT.dangerSoft, paddingHorizontal: 16, paddingVertical: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'center', borderRadius: DT.radius.pill, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.bg, paddingLeft: 8, paddingRight: 6, paddingVertical: 6 },
  shieldBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 36, justifyContent: 'center', borderRadius: DT.radius.pill, borderWidth: 1, borderColor: DT.brandBorder, backgroundColor: DT.brandSoft, paddingHorizontal: 14 },
});
