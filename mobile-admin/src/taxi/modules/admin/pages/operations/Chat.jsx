/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/operations/Chat.jsx. */
import React from 'react';
import SupportChatPanel from '../../../shared/components/SupportChatPanel';
import { Div } from '../../../../../components/web';

/*
 * The web sizes the shell with h-[calc(100vh-7.5rem)] min-h-[36rem] (viewport
 * height minus the navbar); here the route fills the layout's <Main>, so the
 * panel takes the remaining height with flex-1 and scrolls inside. The shell
 * uses the design system's one card treatment (rounded-xl, slate-200, no
 * stacked shadow) and the page's slate-50 background.
 */
const Chat = () => (
  <Div className="flex-1 bg-slate-50 p-4">
    <Div className="flex-1 min-h-0 min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <SupportChatPanel mode="admin" title="Chats" subtitle="Admin and user / driver conversations" surface="plain" className="h-full min-h-0" />
    </Div>
  </Div>
);
export default Chat;
