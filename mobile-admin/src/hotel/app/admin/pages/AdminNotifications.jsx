/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminNotifications.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import { Bell, Send, Trash2, CheckCircle, Circle, Users, Building2, Globe } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { window } from '../../../../lib/webShim';
import { Button, Div, Form, Input, P, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  Field,
  LoadingState,
  EmptyState,
  ErrorState,
  useLayoutWidth,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
const AdminNotifications = () => {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const { tablet } = useLayoutWidth();

  // Broadcast Form State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [targetAudience, setTargetAudience] = useState('users'); // 'users', 'partners', 'all'
  const [sending, setSending] = useState(false);
  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);
  const fetchNotifications = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Mark all as read if viewing Received tab
      if (activeTab === 'received') {
        try {
          await adminService.markAllNotificationsRead();
        } catch (err) {
          console.error('Failed to mark notifications read', err);
        }
      }

      // Re-using getNotifications. For 'received', we use default.
      // For 'sent', strictly speaking we need to filter by type='broadcast_log'.
      // Currently backend returns all admin notifications.
      // Ideally we filter client side or add type param to backend.
      // Let's fetch all and filter client side for now as volume is low.
      const data = await adminService.getNotifications(1, 100);
      if (data.success) {
        if (activeTab === 'received') {
          // Show everything EXCEPT broadcast logs
          const received = data.notifications.filter((n) => n.type !== 'broadcast_log');
          setNotifications(received);
        } else {
          // Show ONLY broadcast logs
          const sent = data.notifications.filter((n) => n.type === 'broadcast_log');
          setNotifications(sent);
        }
      }
    } catch (error) {
      toast.error('Failed to load notifications');
      setLoadError(error?.response?.data?.message || error?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) return;
    setSending(true);
    try {
      await adminService.sendNotification({
        title: broadcastTitle,
        body: broadcastBody,
        targetAudience,
      });
      toast.success('Broadcast sent successfully');
      setBroadcastTitle('');
      setBroadcastBody('');
      // Refresh list if on Sent tab
      if (activeTab === 'sent') fetchNotifications();
    } catch (error) {
      toast.error(error.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };
  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };
  const selectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n._id));
    }
  };
  const handleDelete = async () => {
    if (!(await window.confirmAsync(`Delete ${selectedIds.length} notifications?`))) return;
    try {
      await adminService.deleteNotifications(selectedIds);
      toast.success('Deleted successfully');
      setNotifications(notifications.filter((n) => !selectedIds.includes(n._id)));
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };
  const AUDIENCES = [
    { key: 'users', label: 'Users', icon: Users },
    { key: 'partners', label: 'Partners', icon: Building2 },
    { key: 'all', label: 'Everyone', icon: Globe },
  ];
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle="Manage system alerts and broadcasts."
        breadcrumb={[{ label: 'Hotel' }, { label: 'Notifications' }]}
        actions={
          <>
            <Button onClick={() => setActiveTab('received')} className={activeTab === 'received' ? BTN_PRIMARY : BTN_SECONDARY}>
              <Span className={activeTab === 'received' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Received</Span>
            </Button>
            <Button onClick={() => setActiveTab('sent')} className={activeTab === 'sent' ? BTN_PRIMARY : BTN_SECONDARY}>
              <Span className={activeTab === 'sent' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Sent (broadcasts)</Span>
            </Button>
          </>
        }
      />

      {/* Broadcast Creation Form (Only visible in Sent tab) */}
      <AnimatePresence>
        {activeTab === 'sent' && (
          <motion.div
            initial={{
              opacity: 0,
              height: 0,
            }}
            animate={{
              opacity: 1,
              height: 'auto',
            }}
            exit={{
              opacity: 0,
              height: 0,
            }}
            className="mb-4 overflow-hidden"
          >
            <Card>
              <SectionTitle>Send a new broadcast</SectionTitle>
              <Form onSubmit={handleSendBroadcast} className="gap-3">
                <Field label="Target audience" required>
                  <Div className="flex-row gap-2">
                    {AUDIENCES.map(({ key, label, icon: Icon }) => (
                      <Button
                        key={key}
                        type="button"
                        onClick={() => setTargetAudience(key)}
                        className={`flex-1 h-11 flex-row items-center justify-center gap-2 rounded-lg border ${targetAudience === key ? 'border-blue-600 bg-blue-100' : 'border-slate-300 bg-white'}`}
                      >
                        <UiIcon as={Icon} size={16} className={targetAudience === key ? 'text-blue-700' : 'text-slate-500'} />
                        <Span className={`text-sm font-semibold ${targetAudience === key ? 'text-blue-700' : 'text-slate-700'}`}>{label}</Span>
                      </Button>
                    ))}
                  </Div>
                </Field>
                <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
                  <Field label="Title" required className={tablet ? 'flex-1 min-w-[260px]' : null}>
                    <Input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="Notification title"
                      className={INPUT}
                      required
                    />
                  </Field>
                  <Field label="Message body" required className={tablet ? 'flex-1 min-w-[260px]' : null}>
                    <Textarea
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="Type your message here…"
                      rows={3}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                      required
                    />
                  </Field>
                </Div>
                <Div className="flex-row justify-end">
                  <Button type="submit" disabled={sending} className={`${BTN_PRIMARY} ${sending ? 'opacity-60' : ''}`}>
                    <UiIcon as={Send} size={16} className="text-white" />
                    <Span className={BTN_TEXT_PRIMARY}>{sending ? 'Sending…' : 'Send broadcast'}</Span>
                  </Button>
                </Div>
              </Form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      {loadError ? (
        <ErrorState title="Could not load notifications" message={loadError} onRetry={fetchNotifications} />
      ) : loading ? (
        <LoadingState label="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={activeTab === 'sent' ? 'No broadcasts sent yet' : 'No notifications'}
          message={activeTab === 'sent' ? 'Broadcasts you send appear here with their reach.' : 'System alerts will show up here.'}
        />
      ) : (
        <Card padded={false}>
          <Toolbar className="mb-0 px-4 py-3 border-b border-slate-200 justify-between">
            <Div className="flex-row items-center gap-2">
              <Button
                onClick={selectAll}
                className="w-11 h-11 rounded-lg items-center justify-center"
                accessibilityLabel={selectedIds.length === notifications.length ? 'Clear selection' : 'Select all'}
              >
                <UiIcon
                  as={selectedIds.length > 0 && selectedIds.length === notifications.length ? CheckCircle : Circle}
                  size={20}
                  className={selectedIds.length > 0 && selectedIds.length === notifications.length ? 'text-blue-600' : 'text-slate-400'}
                />
              </Button>
              <Span className="text-sm text-slate-700">
                {selectedIds.length > 0 ? `${selectedIds.length} selected` : `${notifications.length} messages`}
              </Span>
            </Div>
            {selectedIds.length > 0 ? (
              <Button onClick={handleDelete} className={BTN_SECONDARY} accessibilityLabel="Delete selected notifications">
                <UiIcon as={Trash2} size={16} className="text-red-600" />
                <Span className="text-sm font-semibold text-red-600">Delete</Span>
              </Button>
            ) : null}
          </Toolbar>

          <Div>
            {notifications.map((notif, i) => (
              <Div
                key={notif._id}
                className={`flex-row gap-3 p-4 ${i < notifications.length - 1 ? 'border-b border-slate-100' : ''} ${selectedIds.includes(notif._id) ? 'bg-blue-50' : ''}`}
                onClick={() => toggleSelect(notif._id)}
              >
                <Div className="pt-0.5">
                  <UiIcon
                    as={selectedIds.includes(notif._id) ? CheckCircle : Circle}
                    size={20}
                    className={selectedIds.includes(notif._id) ? 'text-blue-600' : 'text-slate-300'}
                  />
                </Div>
                <Div className="flex-1 min-w-0">
                  <Div className="flex-row items-start justify-between gap-2 mb-1">
                    <Div className="flex-1 min-w-0 flex-row items-center gap-2">
                      <P numberOfLines={2} className="text-base font-semibold text-slate-900 flex-1 min-w-0">
                        {notif.title}
                      </P>
                      {!notif.isRead && activeTab === 'received' ? <Div className="w-2 h-2 rounded-full bg-red-600 shrink-0" /> : null}
                    </Div>
                    <Span className="text-xs text-slate-500 shrink-0">
                      {new Date(notif.createdAt).toLocaleDateString()}{' '}
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Span>
                  </Div>
                  <P className="text-sm text-slate-700">{notif.body}</P>

                  {/* Additional Data Display for Broadcast Logs */}
                  {activeTab === 'sent' && notif.data ? (
                    <Div className="mt-2 self-start rounded-lg bg-slate-100 px-2 py-1">
                      <Span className="text-xs text-slate-600">
                        Target: {notif.data.targetAudience} · Recipients: {notif.data.recipientCount}
                      </Span>
                    </Div>
                  ) : null}
                </Div>
              </Div>
            ))}
          </Div>
        </Card>
      )}
    </AdminPage>
  );
};
export default AdminNotifications;
