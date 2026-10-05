import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Bot, CircleUser, Clock3, MessageCircle, RefreshCcw, Send, ShieldCheck, Trash2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { localStore } from '../../lib/storage';
import { tw } from '../../theme';
import { socketService } from '../api/socket';
import { deleteSupportConversation, getSupportConversations, getSupportMessages, markSupportMessagesRead, sendSupportMessage } from '../chat/chatApi';
import { getChatSession, parseSupportConversationKey } from '../chat/chatIdentity';
import { fo } from '../account/ui';

// Web: Taxi/modules/shared/components/UserSupportChatPanel.jsx (participant mode, as the user app mounts it)

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

export default function UserSupportChatPanel({ title = 'Support Chat', subtitle = 'Live messages with admin', preferredRole, initialDraft = '', style }) {
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
      <View style={[st.card, { padding: 32 }, style]}>
        <View style={st.row}>
          <View style={[st.iconBox, { backgroundColor: tw.indigo600, marginRight: 12 }]}><ShieldCheck size={20} color="#fff" /></View>
          <View>
            <Text style={[st.eyebrow, fo(600)]}>Support Chat</Text>
            <Text style={[{ fontSize: 20, color: tw.slate900 }, fo(600)]}>{title}</Text>
          </View>
        </View>
        <Text style={[{ marginTop: 16, fontSize: 13, lineHeight: 24, color: tw.slate500 }, fo(600)]}>
          Live chat will activate once the current session has a valid token.
        </Text>
      </View>
    );
  }

  const canSend = !sending && Boolean(draft.trim());
  const peerName = selectedConversation?.peer?.name || 'Support Team';
  const threadLabel = session.role === 'driver' ? 'Driver Support Thread' : 'User Support Thread';

  return (
    <View style={[st.card, { flex: 1 }, style]}>
      <View style={st.head}>
        <View style={[st.row, { flex: 1, minWidth: 0 }]}>
          <View style={[st.iconBox, { backgroundColor: '#405189', marginRight: 16, boxShadow: '0 10px 15px rgba(79,70,229,0.1)' }]}><MessageCircle size={20} color="#fff" /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[{ fontSize: 18, letterSpacing: -0.45, color: tw.slate900 }, fo(900)]}>{title}</Text>
            <View style={[st.row, { flexWrap: 'wrap' }]}>
              <Text style={[st.tiny, { color: tw.slate400 }, fo(900)]}>Desk Terminal</Text>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: tw.slate300, marginHorizontal: 8 }} />
              <Text style={[st.tiny, { color: tw.indigo600 }, fo(900)]}>{subtitle}</Text>
            </View>
          </View>
        </View>
        <View style={[st.conn, isConnected ? { borderColor: tw.emerald100, backgroundColor: tw.emerald50 } : { borderColor: tw.rose100, backgroundColor: tw.rose50 }]}>
          <Dot color={isConnected ? tw.emerald500 : tw.rose500} animate={isConnected} />
          <Text style={[st.tiny, { fontSize: 10, letterSpacing: 1.8, marginLeft: 10, color: isConnected ? tw.emerald700 : tw.rose700 }, fo(900)]}>
            {isConnected ? 'Connection: Live' : 'Connection: Offline'}
          </Text>
        </View>
      </View>

      <View style={st.threadHead}>
        <View style={[st.row, { flex: 1, minWidth: 0 }]}>
          <View style={st.avatar}>
            {selectedConversation?.peer?.role === 'driver' ? <CircleUser size={20} color={tw.slate500} /> : <Bot size={20} color={tw.slate500} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
            <Text numberOfLines={1} style={[{ fontSize: 15, textTransform: 'uppercase', letterSpacing: -0.4, color: tw.slate900 }, fo(600)]}>{peerName}</Text>
            <Text style={[{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.1, color: tw.emerald600 }, fo(700)]}>{threadLabel}</Text>
          </View>
        </View>
        <View style={st.row}>
          <Press
            onPress={() => { if (selectedConversationKey) socketService.emit('chat:read', { conversationKey: selectedConversationKey }); }}
            style={[st.toolBtn, { borderColor: tw.slate200, backgroundColor: '#fff' }]}
          >
            <RefreshCcw size={14} color={tw.slate500} />
          </Press>
          <Press
            onPress={handleClearChat}
            disabled={!selectedConversationKey || messages.length === 0 || deleting}
            style={[st.toolBtn, { borderColor: tw.rose100, backgroundColor: tw.rose50, marginLeft: 8, opacity: !selectedConversationKey || messages.length === 0 || deleting ? 0.5 : 1 }]}
          >
            <Trash2 size={14} color={tw.rose600} />
          </Press>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: '#F8FAFD' }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={st.loadingPill}>
              <ActivityIndicator size="small" color={tw.slate500} />
              <Text style={[{ fontSize: 12, color: tw.slate500, marginLeft: 12 }, fo(700)]}>Loading messages...</Text>
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
                      {isMine ? <CircleUser size={15} color={tw.slate400} /> : <Bot size={15} color={tw.slate400} />}
                    </View>
                    <View style={{ flexShrink: 1, marginHorizontal: 12 }}>
                      <View style={[st.bubble, isMine
                        ? { backgroundColor: tw.indigo600, borderColor: tw.indigo600, borderBottomRightRadius: 6 }
                        : { backgroundColor: '#fff', borderColor: tw.slate200, borderBottomLeftRadius: 6 }]}>
                        <Text style={[{ fontSize: 14, lineHeight: 24, color: isMine ? '#fff' : tw.slate800 }, fo(500)]}>{message.message}</Text>
                      </View>
                      <View style={[st.row, { marginTop: 4, justifyContent: isMine ? 'flex-end' : 'flex-start' }]}>
                        <Clock3 size={11} color={tw.slate400} />
                        <Text style={[{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: tw.slate400, marginLeft: 8 }, fo(700)]}>{formatTime(message.createdAt)}</Text>
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
          <View style={st.err}><Text style={[{ fontSize: 12, color: tw.rose600 }, fo(600)]}>{error}</Text></View>
        ) : null}
        <View style={st.inputBar}>
          <View style={st.shieldBtn}><ShieldCheck size={16} color={tw.slate400} /></View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            placeholder="Type a message to admin"
            placeholderTextColor={tw.slate400}
            style={[{ flex: 1, fontSize: 14, color: tw.slate900, marginHorizontal: 12, paddingVertical: 0 }, fo(500)]}
          />
          <Press onPress={handleSend} disabled={!canSend} style={[st.sendBtn, { backgroundColor: canSend ? tw.indigo600 : tw.slate300 }]}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={16} color="#fff" />}
          </Press>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {quickReplies.map((reply) => (
            <Press key={reply} onPress={() => setDraft(reply)} style={st.chip}>
              <Text style={[{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.1, color: tw.slate500 }, fo(600)]}>{reply}</Text>
            </Press>
          ))}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: 32, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 30px 80px rgba(15,23,42,0.08)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.55, color: tw.slate400 },
  tiny: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(226,232,240,0.6)', backgroundColor: '#fff' },
  conn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 130 },
  threadHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.slate100, backgroundColor: '#fff' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  toolBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  loadingPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  msgAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.slate100 },
  bubble: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  foot: { borderTopWidth: 1, borderTopColor: tw.slate100, backgroundColor: '#fff', padding: 16 },
  err: { marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: tw.rose100, backgroundColor: tw.rose50, paddingHorizontal: 16, paddingVertical: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, paddingHorizontal: 16, paddingVertical: 12 },
  shieldBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.slate100 },
  sendBtn: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6 },
});
