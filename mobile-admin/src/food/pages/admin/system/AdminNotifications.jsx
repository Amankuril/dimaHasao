/* Ported from Frontend/src/modules/Food/pages/admin/system/AdminNotifications.jsx (tools/port.js first pass). */
import { Bell, CheckCheck, Clock, Trash2, X } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, LoadingState, EmptyState, StatusBadge, BTN_SECONDARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';
import { useNavigate } from '../../../../lib/webRouter';
import useAdminNotifications from '../../../hooks/useAdminNotifications';
import { Button, Div, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
export default function AdminNotifications() {
  const navigate = useNavigate();
  const { items, loading, unreadCount, refresh, markAsRead, markAllAsRead, dismissOne, clearAll } = useAdminNotifications();
  const handleOpen = (item) => {
    if (item?.id) markAsRead(item.id);
    if (item?.path) navigate(item.path);
  };
  return (
    <AdminPage>
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle={`Approval and support alerts that need admin attention.${unreadCount > 0 ? ` ${unreadCount} unread.` : items.length > 0 ? ' All caught up.' : ''}`}
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Notifications' }]}
        actions={
          items.length > 0 ? (
            <>
              {unreadCount > 0 ? (
                <Button type="button" onClick={markAllAsRead} className={BTN_SECONDARY}>
                  <UiIcon as={CheckCheck} size={16} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>Read all</Span>
                </Button>
              ) : null}
              <Button type="button" onClick={clearAll} className={`${BTN_SECONDARY} border-red-200`}>
                <UiIcon as={Trash2} size={16} className="text-red-600" />
                <Span className="text-sm font-semibold text-red-600">Clear all</Span>
              </Button>
            </>
          ) : null
        }
      />

      {loading ? (
        <LoadingState label="Loading notifications…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          message="Approval requests and support alerts will appear here as they come in."
          actionLabel="Refresh"
          onAction={refresh}
        />
      ) : (
        <Div className="gap-3">
          {items.map((item) => (
            <Card key={item?.id} className={`flex-row items-start gap-3 ${item.read ? '' : 'bg-amber-50 border-amber-200'}`}>
              <Button type="button" onClick={() => handleOpen(item)} className="flex-1 min-w-0 gap-1">
                <Div className="flex-row items-center gap-2">
                  {!item.read ? <Span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> : null}
                  <Text style={tw`text-base font-semibold ${item.read ? 'text-slate-700' : 'text-slate-900'} flex-1`} numberOfLines={2}>
                    {item?.title || 'Notification'}
                  </Text>
                </Div>
                <Text style={tw`text-sm text-slate-500`} numberOfLines={3}>
                  {item?.message || '-'}
                </Text>
                <Div className="flex-row flex-wrap items-center gap-2 mt-1">
                  <Div className="flex-row items-center gap-1">
                    <UiIcon as={Clock} size={12} className="text-slate-400" />
                    <Span className="text-xs text-slate-500">{item?.timeLabel || 'N/A'}</Span>
                  </Div>
                  {item?.metaLabel ? <Span className="text-xs text-slate-500">{item.metaLabel}</Span> : null}
                  {item.read ? <StatusBadge status="read" label="Read" /> : null}
                </Div>
              </Button>
              <Button
                type="button"
                onClick={() => dismissOne(item?.id)}
                className="w-11 h-11 -mt-2 -mr-2 rounded-lg items-center justify-center shrink-0"
                accessibilityLabel="Remove notification"
              >
                <UiIcon as={X} size={16} className="text-slate-400" />
              </Button>
            </Card>
          ))}
        </Div>
      )}
    </AdminPage>
  );
}
