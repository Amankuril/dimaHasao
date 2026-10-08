/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/operations/Chat.jsx. */
import React from 'react';
import SupportChatPanel from '../../../shared/components/SupportChatPanel';
import { Div } from '../../../../../components/web';

/*
 * The web sizes the shell with h-[calc(100vh-7.5rem)] min-h-[36rem] (viewport
 * height minus the navbar); here the route fills the layout's <Main>, so the
 * panel takes the remaining height with flex-1 and scrolls inside.
 */
const Chat = () => (
  <Div className="flex-1 min-h-0 min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
    <SupportChatPanel mode="admin" title="Chats" subtitle="Admin <-> User & Driver conversations" surface="plain" className="h-full min-h-0" />
  </Div>
);
export default Chat;
