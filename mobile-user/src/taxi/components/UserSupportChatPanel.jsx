import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Bot, CircleUser, Clock3, MessageCircle, RefreshCcw, Send, ShieldCheck, Trash2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Chip, IconButton } from '../../components/ds';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { localStore } from '../../lib/storage';
import { color, elevation, radii, space, type } from '../../theme';
import { socketService } from '../api/socket';
import { deleteSupportConversation, getSupportConversations, getSupportMessages, markSupportMessagesRead, sendSupportMessage } from '../chat/chatApi';
import { getChatSession, parseSupportConversationKey } from '../chat/chatIdentity';

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

function Dot({ color: c, animate }) {
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
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, opacity: o }} />;
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
      <View style={[st.card, { padding: space.xxl }, style]}>
        <View style={st.row}>
          <View style={[st.iconBox, { marginRight: space.md }]}><ShieldCheck size={20} color={color.primary} /></View>
          <View style={st.grow}>
            <Text style={[type.caption, { color: color.textMuted }]}>Support chat</Text>
            <Text style={[type.heading, { color: color.text }]}>{title}</Text>
          </View>
        </View>
        <Text style={[type.body, { marginTop: space.lg, color: color.textSecondary }]}>
          Live chat will activate once the current session has a valid token.
        </Text>
      </View>
    );
  }

  const canSend = !sending && Boolean(draft.trim());
  const peerName = selectedConversation?.peer?.name || 'Support Team';
  const threadLabel = session.role === 'driver' ? 'Driver Support Thread' : 'User Support Thread';
  const clearOff = !selectedConversationKey || messages.length === 0 || deleting;

  return (
    <View style={[st.card, { flex: 1 }, style]}>
      <View style={st.head}>
        <View style={st.iconBox}><MessageCircle size={20} color={color.primary} /></View>
        <View style={st.grow}>
          <Text numberOfLines={1} style={[type.subheading, { color: color.text }]} accessibilityRole="header">{title}</Text>
          <Text numberOfLines={1} style={[type.caption, { color: color.textMuted }]}>{subtitle}</Text>
        </View>
        <View style={[st.conn, { backgroundColor: isConnected ? color.successSoft : color.dangerSoft }]} accessible accessibilityLabel={isConnected ? 'Connection live' : 'Connection offline'}>
          <Dot color={isConnected ? color.success : color.danger} animate={isConnected} />
          <Text style={[type.caption, { fontFamily: 'Poppins_600SemiBold', color: isConnected ? color.success : color.danger }]}>
            {isConnected ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={st.threadHead}>
        <View style={st.avatar}>
          {selectedConversation?.peer?.role === 'driver' ? <CircleUser size={20} color={color.primary} /> : <Bot size={20} color={color.primary} />}
        </View>
        <View style={st.grow}>
          <Text numberOfLines={1} style={[type.bodyStrong, { color: color.text }]}>{peerName}</Text>
          <Text numberOfLines={1} style={[type.caption, { color: color.textMuted }]}>{threadLabel}</Text>
        </View>
        <IconButton
          icon={RefreshCcw}
          label="Refresh messages"
          variant="soft"
          iconSize={18}
          onPress={() => { if (selectedConversationKey) socketService.emit('chat:read', { conversationKey: selectedConversationKey }); }}
        />
        <IconButton icon={Trash2} label="Clear chat" variant="danger" iconSize={18} disabled={clearOff} onPress={handleClearChat} />
      </View>

      <View style={st.thread}>
        {loading ? (
          <View style={st.center}>
            <ActivityIndicator size="small" color={color.primary} />
            <Text style={[type.small, { color: color.textMuted }]}>Loading messages...</Text>
          </View>
        ) : (
          <ScrollView ref={scrollRef} contentContainerStyle={st.threadContent} keyboardShouldPersistTaps="handled">
            {messages.length === 0 ? (
              <Text style={[type.small, { color: color.textMuted, textAlign: 'center', paddingVertical: space.xxl }]}>No messages yet. Say hello to the support team.</Text>
            ) : null}
            {messages.map((message) => {
              const isMine = message.sender.id && session.id ? String(message.sender.id) === String(session.id) : message.sender.role === session.role;
              return (
                <View key={message.id} style={{ flexDirection: 'row', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <View style={[st.msgWrap, { flexDirection: isMine ? 'row-reverse' : 'row' }]}>
                    <View style={[st.msgAvatar, isMine && { backgroundColor: color.primarySoft }]}>
                      {isMine ? <CircleUser size={16} color={color.primary} /> : <Bot size={16} color={color.textMuted} />}
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <View
                        style={[st.bubble, isMine ? st.mine : st.theirs]}
                        accessible
                        accessibilityLabel={`${isMine ? 'You' : peerName}: ${message.message}, ${formatTime(message.createdAt)}`}
                      >
                        <Text style={[type.body, { color: isMine ? color.onPrimary : color.text }]}>{message.message}</Text>
                      </View>
                      <View style={[st.row, { gap: space.xs, marginTop: space.xs, justifyContent: isMine ? 'flex-end' : 'flex-start' }]}>
                        <Clock3 size={12} color={color.textMuted} />
                        <Text style={[type.caption, { color: color.textMuted }]}>{formatTime(message.createdAt)}</Text>
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
          <View style={st.err} accessibilityRole="alert"><Text style={[type.small, { color: color.danger }]}>{error}</Text></View>
        ) : null}
        <View style={st.quick}>
          {quickReplies.map((reply) => (
            <Chip key={reply} label={reply} onPress={() => setDraft(reply)} style={st.chip} />
          ))}
        </View>
        <View style={st.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            placeholder="Type a message to admin"
            placeholderTextColor={color.textDisabled}
            accessibilityLabel="Message"
            style={st.input}
          />
          <Press onPress={handleSend} disabled={!canSend} accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend, busy: sending }} style={[st.sendBtn, { backgroundColor: canSend ? color.primary : color.surfaceMuted }]}>
            {sending ? <ActivityIndicator size="small" color={color.onPrimary} /> : <Send size={20} color={canSend ? color.onPrimary : color.textMuted} />}
          </Press>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, overflow: 'hidden', ...elevation.card },
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
  iconBox: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  conn: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, borderRadius: radii.pill, paddingHorizontal: space.sm + 2, height: 28 },
  threadHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: space.xs },
  thread: { flex: 1, backgroundColor: color.bg },
  threadContent: { padding: space.lg, gap: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  msgWrap: { maxWidth: '85%', alignItems: 'flex-end', gap: space.sm },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.border },
  bubble: { borderRadius: radii.lg, paddingHorizontal: space.lg, paddingVertical: space.md },
  mine: { backgroundColor: color.primary, borderBottomRightRadius: space.xs },
  theirs: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderBottomLeftRadius: space.xs },
  foot: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surface, padding: space.md, gap: space.md },
  err: { borderRadius: radii.md, backgroundColor: color.dangerSoft, paddingHorizontal: space.lg, paddingVertical: space.md },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { height: 36 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: { flex: 1, minWidth: 0, height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.md, ...type.body, color: color.text, outlineStyle: 'none' },
  sendBtn: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
});
