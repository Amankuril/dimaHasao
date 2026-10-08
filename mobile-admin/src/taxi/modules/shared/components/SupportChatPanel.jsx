/* Ported from Frontend/src/modules/Taxi/modules/shared/components/SupportChatPanel.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from '../../../../lib/motion';
import { Bot, CircleUser, Clock3, Loader2, MessageCircle, RefreshCcw, Search, Send, ShieldCheck, Trash2, UserRound } from 'lucide-react-native';
import { socketService } from '../../../shared/api/socket';
import { deleteSupportConversation, getSupportConversations, getSupportMessages, markSupportMessagesRead, sendSupportMessage } from '../chat/chatApi';
import { getChatSession, parseSupportConversationKey } from '../chat/chatIdentity';
import { Aside, Button, Div, H2, H3, Input, Main, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
const quickReplies = ['Payment issue', 'Ride delayed', 'Lost item', 'Safety concern'];
const AnimatedError = motion.div;
const formatTime = (value) => {
  if (!value) {
    return 'Just now';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return 'Just now';
  }
};
const normalizeMessage = (message) => ({
  ...message,
  sender: {
    role: message?.sender?.role || 'user',
    id: message?.sender?.id || '',
    name: message?.sender?.name || '',
    phone: message?.sender?.phone || '',
  },
  receiver: {
    role: message?.receiver?.role || 'admin',
    id: message?.receiver?.id || '',
    name: message?.receiver?.name || '',
    phone: message?.receiver?.phone || '',
  },
});
const normalizeConversation = (conversation) => ({
  conversationKey: conversation.conversationKey,
  peer: conversation.peer || {
    role: 'admin',
    id: '',
    name: 'Support Team',
    phone: '',
  },
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
    conversationKey: prefersIncoming ? incoming.conversationKey || existing.conversationKey : existing.conversationKey || incoming.conversationKey,
    peer: {
      ...(existing.peer || {}),
      ...(incoming.peer || {}),
    },
    latestMessage: incoming.latestMessage || existing.latestMessage || null,
    unreadCount: Math.max(existing.unreadCount || 0, incoming.unreadCount || 0),
    updatedAt: incoming.updatedAt || existing.updatedAt || null,
  };
};
const dedupeConversations = (conversationList = []) => {
  const merged = new Map();
  for (const conversation of conversationList) {
    const identityKey = getConversationIdentityKey(conversation.conversationKey);
    const existing = merged.get(identityKey);
    merged.set(identityKey, mergeConversationEntry(existing, conversation));
  }
  return Array.from(merged.values()).sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
};
const SupportChatPanel = ({
  mode = 'participant',
  title = 'Support Chat',
  subtitle = 'Live messages with admin',
  preferredRole,
  className = '',
  initialDraft = '',
  surface = 'card',
  targetConversationKey = '',
  targetPeerRole = '',
  targetPeerId = '',
  targetPeerName = '',
  targetPeerPhone = '',
  showSidebar = true,
}) => {
  const session = useMemo(() => getChatSession(preferredRole || (mode === 'admin' ? 'admin' : undefined)), [mode, preferredRole]);
  const isAdminPanel = mode === 'admin';
  const isLiveEnabled = session.isAuthenticated;
  const isPlainSurface = surface === 'plain';
  useEffect(() => {
    if (!session.role || session.role === 'guest') {
      return undefined;
    }
    localStorage.setItem('chatRole', session.role);
    return () => {
      if (localStorage.getItem('chatRole') === session.role) {
        localStorage.removeItem('chatRole');
      }
    };
  }, [session.role]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationKey, setSelectedConversationKey] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const threadRef = useRef(null);
  const appliedInitialDraftRef = useRef('');
  useEffect(() => {
    if (targetConversationKey) {
      setSelectedConversationKey(targetConversationKey);
      setConversations((current) => {
        const identityKey = getConversationIdentityKey(targetConversationKey);
        const exists = current.some((item) => getConversationIdentityKey(item.conversationKey) === identityKey);
        if (!exists) {
          const synthetic = {
            conversationKey: targetConversationKey,
            peer: {
              role: targetPeerRole || parseSupportConversationKey(targetConversationKey)?.peerRole || 'user',
              id: targetPeerId || parseSupportConversationKey(targetConversationKey)?.peerId || '',
              name: targetPeerName || 'Support Contact',
              phone: targetPeerPhone || '',
            },
            latestMessage: null,
            unreadCount: 0,
            updatedAt: new Date().toISOString(),
          };
          return dedupeConversations([synthetic, ...current]);
        }
        return current;
      });
    }
  }, [targetConversationKey, targetPeerRole, targetPeerId, targetPeerName, targetPeerPhone]);
  const normalizedSelectedConversationKey = useMemo(() => getConversationIdentityKey(selectedConversationKey), [selectedConversationKey]);
  const selectedConversation = useMemo(
    () => conversations.find((item) => getConversationIdentityKey(item.conversationKey) === normalizedSelectedConversationKey) || null,
    [conversations, normalizedSelectedConversationKey],
  );
  const isMessageForActiveConversation = (message, conversationKey = selectedConversationKey) => {
    const parsedConversation = parseSupportConversationKey(conversationKey);
    if (!parsedConversation || !message?.sender || !message?.receiver) {
      return false;
    }
    if (message.conversationKey === conversationKey || message.conversationKey === parsedConversation.canonicalKey) {
      return true;
    }
    const sessionId = session.id ? String(session.id) : '';
    const senderId = String(message.sender.id || '');
    const receiverId = String(message.receiver.id || '');
    if (session.role === 'admin') {
      return (
        (message.sender.role === 'admin' && message.receiver.role === parsedConversation.peerRole && receiverId === String(parsedConversation.peerId)) ||
        (message.sender.role === parsedConversation.peerRole && senderId === String(parsedConversation.peerId) && message.receiver.role === 'admin')
      );
    }
    return (
      (message.sender.role === session.role && senderId === sessionId && message.receiver.role === 'admin') ||
      (message.sender.role === 'admin' && message.receiver.role === session.role && receiverId === sessionId)
    );
  };
  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return conversations;
    }
    return conversations.filter((conversation) => {
      const peerName = conversation.peer?.name || '';
      const peerPhone = conversation.peer?.phone || '';
      const latestText = conversation.latestMessage?.message || '';
      return [peerName, peerPhone, latestText].some((value) => value.toLowerCase().includes(query));
    });
  }, [conversations, search]);
  const syncConversationList = (message) => {
    setConversations((current) => {
      const latestMessage = normalizeMessage(message);
      const parsedConversation = parseSupportConversationKey(message.conversationKey);
      const identityKey = getConversationIdentityKey(message.conversationKey);
      const existingConversation = current.find((item) => getConversationIdentityKey(item.conversationKey) === identityKey) || null;
      const adminSide =
        latestMessage.sender.role === 'admin'
          ? {
              role: 'admin',
              id: latestMessage.sender.id,
              name: latestMessage.sender.name,
              phone: latestMessage.sender.phone,
            }
          : {
              role: 'admin',
              id: latestMessage.receiver.id,
              name: latestMessage.receiver.name,
              phone: latestMessage.receiver.phone,
            };
      const peer =
        session.role === 'admin'
          ? {
              role: parsedConversation?.peerRole || (latestMessage.sender.role === 'admin' ? latestMessage.receiver.role : latestMessage.sender.role),
              id: parsedConversation?.peerId || (latestMessage.sender.role === 'admin' ? latestMessage.receiver.id : latestMessage.sender.id),
              name: latestMessage.sender.role === 'admin' ? latestMessage.receiver.name : latestMessage.sender.name,
              phone: latestMessage.sender.role === 'admin' ? latestMessage.receiver.phone : latestMessage.sender.phone,
            }
          : {
              ...adminSide,
              name: adminSide.name || 'Support Team',
              phone: adminSide.phone || '',
            };
      const unreadCount =
        message.receiver.role === session.role && message.sender.role !== session.role && normalizedSelectedConversationKey !== identityKey
          ? (existingConversation?.unreadCount || 0) + 1
          : 0;
      const nextConversation = {
        conversationKey: parsedConversation?.canonicalKey || message.conversationKey,
        peer,
        latestMessage,
        unreadCount,
        updatedAt: message.createdAt,
      };
      const next = current.map((item) =>
        getConversationIdentityKey(item.conversationKey) === identityKey ? mergeConversationEntry(item, nextConversation) : item,
      );
      if (next.some((item) => getConversationIdentityKey(item.conversationKey) === identityKey)) {
        return dedupeConversations(next);
      }
      return dedupeConversations([nextConversation, ...current]);
    });
  };
  const resolveConversationKeys = (conversationKey) => {
    const parsed = parseSupportConversationKey(conversationKey);
    return parsed?.keys || (conversationKey ? [conversationKey] : []);
  };
  const matchesConversationKey = (leftKey, rightKey) => {
    const leftKeys = resolveConversationKeys(leftKey);
    const rightKeys = resolveConversationKeys(rightKey);
    return leftKeys.some((key) => rightKeys.includes(key));
  };
  useEffect(() => {
    if (!isLiveEnabled) {
      return undefined;
    }
    socketService.connect({
      role: session.role,
      token: session.token,
    });
    const handleMessage = (incomingMessage) => {
      const message = normalizeMessage(incomingMessage);
      syncConversationList(message);
      if (isMessageForActiveConversation(message)) {
        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) {
            return current;
          }
          return [...current, message];
        });
        if (message.sender.role !== session.role) {
          socketService.emit('chat:read', {
            conversationKey: message.conversationKey,
          });
        }
      }
    };
    const handleConversationUpdate = ({ message }) => {
      if (!message) {
        return;
      }
      syncConversationList(normalizeMessage(message));
    };
    const handleSocketError = (payload) => {
      setError(payload?.message || 'Socket connection error');
    };
    const handleConversationDeleted = (payload) => {
      const deletedKeys = payload?.keys || resolveConversationKeys(payload?.conversationKey);
      const activeConversationKeys = resolveConversationKeys(selectedConversationKey);
      const isActiveDeleted = activeConversationKeys.some((key) => deletedKeys.includes(key));
      if (isActiveDeleted) {
        setMessages([]);
        setDraft('');
      }
      setConversations((current) => {
        const next = current.filter((item) => !deletedKeys.includes(item.conversationKey));
        if (!isAdminPanel) {
          if (next.length === 0 && current.length > 0) {
            const fallback = current[0];
            return [
              {
                ...fallback,
                latestMessage: null,
                unreadCount: 0,
                updatedAt: null,
              },
            ];
          }
          return next.map((item) =>
            deletedKeys.includes(item.conversationKey)
              ? {
                  ...item,
                  latestMessage: null,
                  unreadCount: 0,
                  updatedAt: null,
                }
              : item,
          );
        }
        if (isActiveDeleted) {
          setSelectedConversationKey(next[0]?.conversationKey || '');
        }
        return next;
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
  }, [isLiveEnabled, session.role, selectedConversationKey]);
  useEffect(() => {
    if (!isLiveEnabled) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    const loadConversations = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getSupportConversations(session.token);
        const nextConversations = (response?.data?.conversations || []).map(normalizeConversation);
        if (!active) {
          return;
        }
        setConversations((current) => {
          return dedupeConversations([...current, ...nextConversations]);
        });
        if (!selectedConversationKey && nextConversations.length > 0) {
          setSelectedConversationKey(getConversationIdentityKey(nextConversations[0].conversationKey));
        }
      } catch (chatError) {
        if (!active) {
          return;
        }
        setError(chatError?.message || 'Unable to load conversations');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadConversations();
    return () => {
      active = false;
    };
  }, [isLiveEnabled]);
  useEffect(() => {
    if (!isLiveEnabled || !selectedConversationKey) {
      return undefined;
    }
    let active = true;
    const loadMessages = async () => {
      setMessages([]);
      setLoading(true);
      setError('');
      try {
        const response = await getSupportMessages(selectedConversationKey, session.token);
        const nextMessages = (response?.data?.messages || [])
          .map(normalizeMessage)
          .filter((message) => isMessageForActiveConversation(message, selectedConversationKey));
        if (!active) {
          return;
        }
        setMessages(nextMessages.sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0)));
        socketService.emit('chat:join', {
          conversationKey: selectedConversationKey,
        });
        socketService.emit('chat:read', {
          conversationKey: selectedConversationKey,
        });
        await markSupportMessagesRead(selectedConversationKey, session.token);
      } catch (chatError) {
        if (!active) {
          return;
        }
        setError(chatError?.message || 'Unable to load messages');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadMessages();
    return () => {
      active = false;
    };
  }, [isLiveEnabled, selectedConversationKey]);
  useEffect(() => {
    const parsedConversation = parseSupportConversationKey(selectedConversationKey);
    if (parsedConversation && parsedConversation.canonicalKey !== selectedConversationKey) {
      setSelectedConversationKey(parsedConversation.canonicalKey);
    }
  }, [selectedConversationKey]);
  useEffect(() => {
    threadRef.current?.scrollToEnd({ animated: true });
  }, [messages]);
  useEffect(() => {
    const normalizedInitialDraft = String(initialDraft || '').trim();
    if (!normalizedInitialDraft || appliedInitialDraftRef.current === normalizedInitialDraft) {
      return;
    }
    setDraft((current) => current || normalizedInitialDraft);
    appliedInitialDraftRef.current = normalizedInitialDraft;
  }, [initialDraft]);
  const handleSelectConversation = (conversationKey) => {
    const parsedConversation = parseSupportConversationKey(conversationKey);
    setSelectedConversationKey(parsedConversation?.canonicalKey || conversationKey);
  };
  const handleClearChat = async () => {
    if (!selectedConversationKey || deleting) {
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await deleteSupportConversation(selectedConversationKey, session.token);
      const selectedKeys = resolveConversationKeys(selectedConversationKey);
      setMessages([]);
      setDraft('');
      setConversations((current) => {
        if (!isAdminPanel) {
          return current.map((item) =>
            selectedKeys.some((key) => matchesConversationKey(item.conversationKey, key))
              ? {
                  ...item,
                  latestMessage: null,
                  unreadCount: 0,
                  updatedAt: null,
                }
              : item,
          );
        }
        const next = current.filter((item) => !selectedKeys.some((key) => matchesConversationKey(item.conversationKey, key)));
        setSelectedConversationKey(next[0]?.conversationKey || '');
        return next;
      });
    } catch (chatError) {
      setError(chatError?.message || 'Unable to delete chat');
    } finally {
      setDeleting(false);
    }
  };
  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !selectedConversationKey) {
      return;
    }
    setSending(true);
    setError('');
    const parsedConversation = parseSupportConversationKey(selectedConversationKey);
    const payload = isAdminPanel
      ? {
          message: text,
          receiverRole: parsedConversation?.peerRole || selectedConversation?.peer?.role || 'user',
          receiverId: parsedConversation?.peerId || selectedConversation?.peer?.id,
          conversationKey: selectedConversationKey,
        }
      : {
          message: text,
          conversationKey: selectedConversationKey,
        };
    try {
      if (socketService.isConnected()) {
        socketService.emit('chat:send', payload);
      } else {
        const response = await sendSupportMessage(payload, session.token);
        const savedMessage = normalizeMessage(response?.data?.message);
        if (savedMessage?.id) {
          setMessages((current) => [...current, savedMessage]);
          syncConversationList(savedMessage);
        }
      }
      setDraft('');
    } catch (chatError) {
      setError(chatError?.message || 'Unable to send message');
    } finally {
      setSending(false);
    }
  };
  if (!isLiveEnabled) {
    return (
      <Div className={`${isPlainSurface ? 'h-full bg-white p-6' : 'rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm'} ${className}`}>
        <Div className="flex items-center gap-3">
          <Div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isAdminPanel ? 'bg-[#FFC400] text-[#0B1220]' : 'bg-indigo-600 text-white'}`}
          >
            <UiIcon as={ShieldCheck} size={20} />
          </Div>
          <Div>
            <P className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Support Chat</P>
            <H2 className="text-[20px] font-semibold text-slate-900">{title}</H2>
          </Div>
        </Div>
        <P className="mt-4 text-[13px] font-semibold leading-6 text-slate-500">Live chat will activate once the current session has a valid token.</P>
      </Div>
    );
  }
  return (
    <Div
      className={`${isPlainSurface ? 'flex h-full flex-col overflow-hidden bg-white' : 'overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]'} ${className}`}
    >
      <Div
        className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-200/60 bg-white px-4 py-4 sm:px-6 sm:py-5"
      >
        <Div className="flex min-w-0 items-center gap-4">
          <Div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${isAdminPanel ? 'bg-[#FFC400] text-[#0B1220] shadow-[#FFC400]/10' : 'bg-[#405189] text-white shadow-indigo-600/10'}`}
          >
            <UiIcon as={MessageCircle} size={20} />
          </Div>
          <Div className="min-w-0">
            {isAdminPanel ? (
              <>
                <H2 className="truncate text-[34px] font-bold tracking-tight text-slate-900">Chats</H2>
                <Div className="flex flex-wrap items-center gap-2 mt-1">
                  <Span className="text-[16px] font-medium tracking-[1px] text-[#6B7280]">Admin Support Conversations</Span>
                  <Span className="w-1 h-1 rounded-full bg-slate-300" />
                  <Span className="text-[16px] font-medium tracking-[1px] text-[#6B7280]">Desk Terminal</Span>
                </Div>
              </>
            ) : (
              <>
                <H2 className="truncate text-[18px] font-black tracking-tight text-slate-900">{title}</H2>
                <Div className="flex flex-wrap items-center gap-2">
                  <Span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Desk Terminal</Span>
                  <Span className="w-1 h-1 rounded-full bg-slate-300" />
                  <P className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{subtitle}</P>
                </Div>
              </>
            )}
          </Div>
        </Div>
        <Div
          className={`max-w-full shrink-0 transition-all ${isAdminPanel ? 'rounded-full px-[18px] py-[10px]' : 'rounded-xl border px-3 py-2'} ${isConnected ? (isAdminPanel ? 'bg-emerald-50 text-emerald-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/5') : isAdminPanel ? 'bg-rose-50 text-rose-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}
        >
          <Div className="flex items-center gap-2.5">
            <Div className={`h-2 w-2 shrink-0 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <Span className="whitespace-normal text-[10px] font-black uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-widest">
              {isConnected ? 'Connection: Live' : 'Connection: Offline'}
            </Span>
          </Div>
        </Div>
      </Div>

      <Div
        className="flex flex-col min-h-0 flex-1"
      >
        {isAdminPanel && showSidebar && (
          <Aside className="flex flex-1 min-h-0 flex-col border-b-[1.5px] border-slate-200/60 bg-[#F8FAFC]">
            <Div className="shrink-0 border-b border-slate-200/60 bg-white p-5">
              <Div
                className={`flex items-center gap-3 border border-slate-200 bg-slate-50/50 px-4 transition-all focus-within:ring-4 ${isAdminPanel ? 'h-[42px] rounded-[12px] focus-within:border-[#FFC400]/30 focus-within:ring-[#FFC400]/5' : 'py-3.5 rounded-xl focus-within:border-indigo-600/30 focus-within:ring-indigo-600/5'}`}
              >
                <UiIcon as={Search} size={16} className="text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isAdminPanel ? 'Search conversations...' : 'Search by name, role or phone'}
                  className="w-full bg-transparent text-[13px] font-bold text-slate-700 outline-none placeholder:text-slate-400"
                />
              </Div>
            </Div>

            <ScrollDiv className={`min-h-0 flex-1 p-3 ${isAdminPanel ? '' : 'space-y-2'}`}>
              {visibleConversations.map((conversation) => (
                <Button
                  key={conversation.conversationKey}
                  onClick={() => handleSelectConversation(conversation.conversationKey)}
                  className={`flex w-full items-center text-left transition-all relative group ${isAdminPanel ? `gap-4 rounded-[14px] p-[18px] mb-[12px] border-l-[3px] hover:-translate-y-0.5 hover:shadow-sm duration-150 ${selectedConversationKey === conversation.conversationKey ? 'bg-[#111827] border-l-[#FFC400] shadow-md' : 'bg-transparent border-l-transparent hover:bg-slate-50'}` : `gap-3 rounded-2xl border px-3 py-3.5 ${selectedConversationKey === conversation.conversationKey ? 'border-indigo-600/20 bg-white shadow-[0_8px_20px_-4px_rgba(79,70,229,0.12)] before:absolute before:left-[-12px] before:top-3 before:bottom-3 before:w-1 before:bg-indigo-600 before:rounded-r-full' : 'border-transparent bg-transparent hover:bg-slate-200/50'}`}`}
                >
                  <Div
                    className={`flex shrink-0 items-center justify-center rounded-[18px] transition-colors ${isAdminPanel ? 'h-10 w-10' : 'h-12 w-12'} ${selectedConversationKey === conversation.conversationKey ? (isAdminPanel ? 'bg-[#FFC400] text-[#0B1220]' : 'bg-indigo-600 text-white') : 'bg-white border border-slate-200 text-slate-400'}`}
                  >
                    {conversation.peer?.role === 'driver' ? <UiIcon as={CircleUser} size={18} /> : <UiIcon as={UserRound} size={18} />}
                  </Div>

                  <Div className="min-w-0 flex-1">
                    <Div className="flex items-center justify-between gap-2">
                      <P
                        className={`truncate tracking-tight ${isAdminPanel ? `text-[17px] font-bold ${selectedConversationKey === conversation.conversationKey ? 'text-white' : 'text-slate-900'}` : `text-[13px] font-bold ${selectedConversationKey === conversation.conversationKey ? 'text-indigo-600' : 'text-slate-900'}`}`}
                      >
                        {conversation.peer?.name || 'Support Contact'}
                      </P>
                      {conversation.unreadCount > 0 && (
                        <Span
                          className={`rounded-full bg-orange-500 font-black text-white flex items-center justify-center ${isAdminPanel ? 'h-4 w-4 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
                        >
                          {conversation.unreadCount}
                        </Span>
                      )}
                    </Div>
                    <Div className="flex items-center justify-between mt-1">
                      <Div className="flex items-center gap-2">
                        <P
                          className={`uppercase tracking-widest ${isAdminPanel ? `text-[14px] font-medium ${selectedConversationKey === conversation.conversationKey ? 'text-white/80' : 'text-slate-500'}` : `text-[10px] font-black ${selectedConversationKey === conversation.conversationKey ? 'text-indigo-600/60' : 'text-slate-400'}`}`}
                        >
                          {conversation.peer?.role || 'user'}
                        </P>
                      </Div>
                      <P
                        className={`font-medium ${isAdminPanel ? `text-[13px] ${selectedConversationKey === conversation.conversationKey ? 'text-white/60' : 'text-slate-400'}` : `text-[10px] font-bold text-slate-400`}`}
                      >
                        {formatTime(conversation.updatedAt).split(',')[1] || 'Today'}
                      </P>
                    </Div>
                    <P
                      className={`truncate leading-relaxed ${isAdminPanel ? `text-[15px] mt-1 ${selectedConversationKey === conversation.conversationKey ? 'text-white/70' : 'text-slate-500'}` : `text-[12px] mt-1.5 font-medium ${selectedConversationKey === conversation.conversationKey ? 'text-slate-600' : 'text-slate-500'}`}`}
                    >
                      {conversation.latestMessage?.message || 'No messages yet'}
                    </P>
                  </Div>
                </Button>
              ))}

              {!loading && visibleConversations.length === 0 && (
                <Div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center">
                  <P className="text-[12px] font-bold text-slate-500">No active conversations yet.</P>
                </Div>
              )}
            </ScrollDiv>
          </Aside>
        )}

        <Main className="flex flex-1 min-h-0 flex-col bg-[#f8fafc] relative">
          {isAdminPanel && !selectedConversationKey ? (
            <Div className="flex flex-col items-center justify-center h-full text-center">
              <Div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-6">
                <UiIcon as={MessageCircle} size={40} />
              </Div>
              <H2 className="text-[28px] font-bold text-slate-900 mb-2">Select a conversation</H2>
              <P className="text-slate-500 text-[15px]">Choose a conversation from the left to view messages.</P>
            </Div>
          ) : (
            <>
              <Div
                className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-5"
              >
                <Div className="flex min-w-0 items-center gap-3">
                  <Div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    {selectedConversation?.peer?.role === 'driver' ? <UiIcon as={CircleUser} size={20} /> : <UiIcon as={Bot} size={20} />}
                  </Div>
                  <Div className="min-w-0 flex-1">
                    {isAdminPanel ? (
                      <>
                        <H3 className="truncate text-[24px] font-bold tracking-tight text-slate-900">
                          {selectedConversation?.peer?.name || 'Support Team'}
                        </H3>
                        <P className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mt-[-4px]">
                          {selectedConversation?.peer?.role === 'driver' ? 'Driver Support Thread' : 'User Support Thread'}
                        </P>
                      </>
                    ) : (
                      <>
                        <H3 className="truncate text-[15px] font-semibold uppercase tracking-tight text-slate-900">
                          {selectedConversation?.peer?.name || 'Support Team'}
                        </H3>
                        <P className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                          {session.role === 'driver' ? 'Driver Support Thread' : 'User Support Thread'}
                        </P>
                      </>
                    )}
                  </Div>
                </Div>
                <Div className="flex shrink-0 items-center gap-2 self-start">
                  <Button
                    type="button"
                    onClick={async () => {
                      if (selectedConversationKey) {
                        setLoading(true);
                        try {
                          const response = await getSupportMessages(selectedConversationKey, session.token);
                          const nextMessages = (response?.data?.messages || [])
                            .map(normalizeMessage)
                            .filter((message) => isMessageForActiveConversation(message, selectedConversationKey));
                          setMessages(nextMessages.sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0)));
                          socketService.emit('chat:read', {
                            conversationKey: selectedConversationKey,
                          });
                          await markSupportMessagesRead(selectedConversationKey, session.token);
                        } catch (err) {
                          setError('Failed to refresh messages');
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-50"
                  >
                    <UiIcon as={RefreshCcw} size={14} className="inline-block" />
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClearChat}
                    disabled={!selectedConversationKey || messages.length === 0 || deleting}
                    className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UiIcon as={Trash2} size={14} className="inline-block" />
                  </Button>
                </Div>
              </Div>

              <ScrollDiv ref={threadRef} className="flex-1 px-5 py-5">
                {loading ? (
                  <Div className="flex h-full items-center justify-center">
                    <Div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <UiIcon as={Loader2} size={16} className="animate-spin text-slate-500" />
                      <Span className="text-[12px] font-bold text-slate-500">Loading messages...</Span>
                    </Div>
                  </Div>
                ) : (
                  <Div className={`mx-auto flex max-w-4xl flex-col ${isAdminPanel ? 'gap-6' : 'gap-4'}`}>
                    {messages.map((message) => {
                      const isMine = message.sender.id && session.id ? String(message.sender.id) === String(session.id) : message.sender.role === session.role;
                      return (
                        <Div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <Div className={`flex ${isAdminPanel ? 'max-w-[70%]' : 'max-w-[78%]'} items-end gap-3 ${isMine ? 'flex-row-reverse' : ''}`}>
                            <Div
                              className={`flex items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-100 ${isAdminPanel ? 'h-8 w-8' : 'h-9 w-9'}`}
                            >
                              {isMine ? <UiIcon as={CircleUser} size={14} /> : <UiIcon as={Bot} size={14} />}
                            </Div>
                            <motion.div
                              initial={
                                isAdminPanel
                                  ? {
                                      opacity: 0,
                                      y: 10,
                                    }
                                  : false
                              }
                              animate={
                                isAdminPanel
                                  ? {
                                      opacity: 1,
                                      y: 0,
                                    }
                                  : false
                              }
                              transition={
                                isAdminPanel
                                  ? {
                                      duration: 0.2,
                                    }
                                  : {}
                              }
                              className="flex flex-col"
                            >
                              <Div
                                className={`shadow-sm ${isAdminPanel ? `rounded-[22px] px-[16px] py-[10px] ${isMine ? 'rounded-br-sm bg-indigo-600 text-white border border-indigo-600' : 'rounded-bl-sm bg-white text-slate-800 border border-slate-200'}` : `rounded-3xl px-4 py-3 ${isMine ? 'rounded-br-md border border-indigo-600 bg-indigo-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'}`}`}
                              >
                                <P className="text-[14px] font-medium leading-6">{message.message}</P>
                              </Div>
                              <Div
                                className={`mt-1.5 flex items-center gap-2 uppercase tracking-wider ${isAdminPanel ? 'text-[12px] text-slate-400 font-medium' : 'text-[10px] font-bold text-slate-400'} ${isMine ? 'justify-end' : ''}`}
                              >
                                <UiIcon as={Clock3} size={11} />
                                <Span>{formatTime(message.createdAt)}</Span>
                              </Div>
                            </motion.div>
                          </Div>
                        </Div>
                      );
                    })}
                  </Div>
                )}
              </ScrollDiv>

              <Div className="border-t border-slate-100 bg-white p-4">
                <AnimatePresence>
                  {error && (
                    <AnimatedError
                      initial={{
                        opacity: 0,
                        y: 6,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        y: 6,
                      }}
                      className="mb-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[12px] font-semibold text-rose-600"
                    >
                      {error}
                    </AnimatedError>
                  )}
                </AnimatePresence>

                <Div
                  className={`mx-auto flex max-w-4xl items-center gap-3 border border-slate-200 bg-slate-50 px-4 ${isAdminPanel ? 'h-[48px] rounded-[14px]' : 'rounded-[24px] py-3'}`}
                >
                  <Button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
                    <UiIcon as={ShieldCheck} size={16} />
                  </Button>
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleSend();
                      }
                    }}
                    placeholder={isAdminPanel ? 'Reply to support request...' : 'Type a message to admin'}
                    className="flex-1 bg-transparent text-[14px] font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <Button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className={`inline-flex items-center justify-center transition-all ${isAdminPanel ? 'h-10 w-10 rounded-[12px] hover:scale-105 active:scale-95' : 'h-11 w-11 rounded-2xl'} ${sending || !draft.trim() ? 'bg-slate-300 text-white' : isAdminPanel ? 'bg-[#FFC400] text-[#0B1220] shadow-sm' : 'bg-indigo-600 text-white hover:bg-slate-800'}`}
                  >
                    {sending ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={Send} size={16} />}
                  </Button>
                </Div>

                {!isAdminPanel && (
                  <Div className="mx-auto mt-3 flex max-w-4xl flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <Button
                        type="button"
                        key={reply}
                        onClick={() => setDraft(reply)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {reply}
                      </Button>
                    ))}
                  </Div>
                )}
              </Div>
            </>
          )}
        </Main>
      </Div>
    </Div>
  );
};
export default SupportChatPanel;
