/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminNotifications.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import { Bell, Send, Trash2, CheckCircle, Circle, Users, Building2, Globe, Search } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { window } from '../../../../lib/webShim';
import { Button, Div, Form, H1, H2, H3, Input, Label, P, ScrollDiv, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
const AdminNotifications = () => {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

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
  return (
    <ScrollDiv className="space-y-6">
      <Div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Div>
          <H1 className="text-2xl font-bold text-gray-900">Notifications</H1>
          <P className="text-gray-500 text-sm">Manage system alerts and broadcasts</P>
        </Div>

        <Div className="flex bg-white rounded-lg p-1 border shadow-sm self-start">
          <Button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'received' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
          >
            Received
          </Button>
          <Button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'sent' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
          >
            Sent (Broadcasts)
          </Button>
        </Div>
      </Div>

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
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 overflow-hidden"
          >
            <Div className="mb-4 flex items-center gap-2">
              <UiIcon as={Send} size={20} className="text-blue-500" />
              <H2 className="text-lg font-bold">Send New Broadcast</H2>
            </Div>
            <Form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
              <Div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-gray-500">Target Audience</Label>
                  <Div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      onClick={() => setTargetAudience('users')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${targetAudience === 'users' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <UiIcon as={Users} size={20} />
                      <Span className="text-xs font-bold">Users</Span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setTargetAudience('partners')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${targetAudience === 'partners' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <UiIcon as={Building2} size={20} />
                      <Span className="text-xs font-bold">Partners</Span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setTargetAudience('all')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${targetAudience === 'all' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <UiIcon as={Globe} size={20} />
                      <Span className="text-xs font-bold">Everyone</Span>
                    </Button>
                  </Div>
                </Div>
                <Div className="md:col-span-2 space-y-4">
                  <Div>
                    <Label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Title</Label>
                    <Input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="Notification Title"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all"
                      required
                    />
                  </Div>
                  <Div>
                    <Label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Message Body</Label>
                    <Textarea
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="Type your message here..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                      required
                    />
                  </Div>
                  <Div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={sending}
                      className="px-6 py-2.5 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <UiIcon as={Send} size={18} />
                      <Span>{sending ? 'Sending...' : 'Send Broadcast'}</Span>
                    </Button>
                  </Div>
                </Div>
              </Div>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      <Div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <Div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <Div className="flex items-center gap-3">
            <Button onClick={selectAll} className="text-gray-400 hover:text-black transition-colors">
              {selectedIds.length > 0 && selectedIds.length === notifications.length ? (
                <UiIcon as={CheckCircle} size={20} className="text-black" />
              ) : (
                <UiIcon as={Circle} size={20} />
              )}
            </Button>
            <Span className="text-sm font-bold text-gray-600">
              {selectedIds.length > 0 ? `${selectedIds.length} Selected` : `${notifications.length} Messages`}
            </Span>
          </Div>
          {selectedIds.length > 0 && (
            <Button onClick={handleDelete} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
              <UiIcon as={Trash2} size={20} />
            </Button>
          )}
        </Div>

        {loading ? (
          <Div className="p-12 text-center text-gray-400">Loading...</Div>
        ) : notifications.length === 0 ? (
          <Div className="p-12 text-center text-gray-400 italic">No notifications found</Div>
        ) : (
          <Div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <Div
                key={notif._id}
                className={`p-4 flex gap-4 hover:bg-gray-50 transition-colors group ${selectedIds.includes(notif._id) ? 'bg-blue-50/30' : ''}`}
                onClick={() => toggleSelect(notif._id)}
              >
                <Div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(notif._id);
                  }}
                >
                  {selectedIds.includes(notif._id) ? (
                    <UiIcon as={CheckCircle} size={20} className="text-black mt-1" />
                  ) : (
                    <UiIcon as={Circle} size={20} className="text-gray-300 mt-1" />
                  )}
                </Div>
                <Div className="flex-1 min-w-0">
                  <Div className="flex justify-between items-start mb-1">
                    <Div className="flex-1 flex-row items-center">
                      <H3 className={`font-bold flex-shrink truncate ${!notif.isRead && activeTab === 'received' ? 'text-black' : 'text-gray-700'}`}>{notif.title}</H3>
                      {!notif.isRead && activeTab === 'received' && <Div className="ml-2 w-2 h-2 bg-red-500 rounded-full" />}
                    </Div>
                    <Span className="text-xs text-gray-400 ml-4">
                      {new Date(notif.createdAt).toLocaleDateString()}{' '}
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Span>
                  </Div>
                  <P className="text-gray-600 text-sm leading-relaxed">{notif.body}</P>

                  {/* Additional Data Display for Broadcast Logs */}
                  {activeTab === 'sent' && notif.data && (
                    <Div className="mt-2 text-xs text-gray-400 bg-gray-50 p-2 rounded self-start">
                      Target: <Span className="font-bold uppercase text-gray-600">{notif.data.targetAudience}</Span> • Recipients:{' '}
                      <Span className="font-bold text-gray-600">{notif.data.recipientCount}</Span>
                    </Div>
                  )}
                </Div>
              </Div>
            ))}
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
};
export default AdminNotifications;
