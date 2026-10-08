/* Ported from Frontend/src/modules/Food/pages/admin/system/AdminNotifications.jsx (tools/port.js first pass). */
import { Bell, CheckCheck, Clock, Loader2, Trash2, X } from 'lucide-react-native';
import { useNavigate } from '../../../../lib/webRouter';
import useAdminNotifications from '../../../hooks/useAdminNotifications';
import { Button, Div, H1, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
export default function AdminNotifications() {
  const navigate = useNavigate();
  const { items, loading, unreadCount, markAsRead, markAllAsRead, dismissOne, clearAll } = useAdminNotifications();
  const handleOpen = (item) => {
    if (item?.id) markAsRead(item.id);
    if (item?.path) navigate(item.path);
  };
  return (
    <ScrollDiv className="p-6">
      <Div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <Div className="flex items-start justify-between gap-4 mb-6">
          <Div className="flex items-center gap-3">
            <Div className="relative w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center overflow-visible">
              <UiIcon as={Bell} className="w-6 h-6 shrink-0" />
              {unreadCount > 0 && (
                <Span className="absolute -top-1 -right-1 z-10 min-w-[20px] h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none flex items-center justify-center px-1 border-2 border-white shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Span>
              )}
            </Div>
            <Div>
              <H1 className="text-2xl font-bold text-slate-900">Notifications</H1>
              <P className="text-sm text-slate-500">
                Approval and support alerts that need admin attention.
                {unreadCount > 0 ? ` ${unreadCount} unread.` : items.length > 0 ? ' All caught up.' : ''}
              </P>
            </Div>
          </Div>
          {items.length > 0 && (
            <Div className="flex items-center gap-2 shrink-0">
              {unreadCount > 0 && (
                <Button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <UiIcon as={CheckCheck} className="w-4 h-4" />
                  Read all
                </Button>
              )}
              <Button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <UiIcon as={Trash2} className="w-4 h-4" />
                Clear all
              </Button>
            </Div>
          )}
        </Div>

        {loading ? (
          <Div className="py-12 text-sm text-slate-500 flex items-center gap-2">
            <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
            Loading notifications...
          </Div>
        ) : items.length === 0 ? (
          <Div className="py-12 text-sm text-slate-500">No notifications found.</Div>
        ) : (
          <Div className="space-y-3">
            {items.map((item) => (
              <Div
                key={item?.id}
                className={`rounded-2xl border px-4 py-4 transition-colors ${item.read ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/70 shadow-sm'}`}
              >
                <Div className="flex items-start justify-between gap-4">
                  <Button type="button" onClick={() => handleOpen(item)} className="min-w-0 flex-1 text-left">
                    <Div className="flex items-center gap-2">
                      {!item.read && <Span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                      <P className={`text-base font-semibold ${item.read ? 'text-slate-600' : 'text-slate-900'}`}>{item?.title || 'Notification'}</P>
                    </Div>
                    <P className={`text-sm mt-1 ${item.read ? 'text-slate-500' : 'text-slate-600'}`}>{item?.message || '-'}</P>
                    <Div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                      <UiIcon as={Clock} className="w-3.5 h-3.5" />
                      <Span>{item?.timeLabel || 'N/A'}</Span>
                      {item?.metaLabel ? (
                        <>
                          <Span>•</Span>
                          <Span>{item.metaLabel}</Span>
                        </>
                      ) : null}
                      {item.read ? (
                        <>
                          <Span>•</Span>
                          <Span className="text-slate-400">Read</Span>
                        </>
                      ) : null}
                    </Div>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => dismissOne(item?.id)}
                    className="shrink-0 rounded-full p-2 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    accessibilityLabel="Remove notification"
                  >
                    <UiIcon as={X} className="w-4 h-4" />
                  </Button>
                </Div>
              </Div>
            ))}
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
}
