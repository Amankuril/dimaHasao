import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Send, Trash2, CheckCircle,
  Circle, Users, Building2, Globe, Search
} from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

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
          const received = data.notifications.filter(n => n.type !== 'broadcast_log');
          setNotifications(received);
        } else {
          // Show ONLY broadcast logs
          const sent = data.notifications.filter(n => n.type === 'broadcast_log');
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
        targetAudience
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
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n._id));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} notifications?`)) return;

    try {
      await adminService.deleteNotifications(selectedIds);
      toast.success('Deleted successfully');
      setNotifications(notifications.filter(n => !selectedIds.includes(n._id)));
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Notifications</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage system alerts and broadcasts</p>
        </div>

        <div className="flex bg-white rounded-lg p-1 border shadow-sm self-start">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'received' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500 hover:text-black'}`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'sent' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500 hover:text-black'}`}
          >
            Sent (broadcasts)
          </button>
        </div>
      </div>

      {/* Broadcast Creation Form (Only visible in Sent tab) */}
      <AnimatePresence>
        {activeTab === 'sent' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="bg-white rounded-xl p-6 border border-neutral-900/[0.08] overflow-hidden"
          >
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Send size={20} className="text-[#0a4d2b]" />
              Send new broadcast
            </h2>
            <form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-neutral-500">Target audience</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetAudience('users')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-colors ${targetAudience === 'users' ? 'border-[#0a4d2b] bg-[#e8f2ec] text-[#0a4d2b]' : 'border-neutral-200 hover:border-neutral-300'}`}
                    >
                      <Users size={20} />
                      <span className="text-xs font-medium">Users</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetAudience('partners')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-colors ${targetAudience === 'partners' ? 'border-[#0a4d2b] bg-[#e8f2ec] text-[#0a4d2b]' : 'border-neutral-200 hover:border-neutral-300'}`}
                    >
                      <Building2 size={20} />
                      <span className="text-xs font-medium">Partners</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetAudience('all')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-colors ${targetAudience === 'all' ? 'border-green-500 bg-green-50 text-green-700' : 'border-neutral-200 hover:border-neutral-300'}`}
                    >
                      <Globe size={20} />
                      <span className="text-xs font-medium">Everyone</span>
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Title</label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="Notification title"
                      className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-[#0a4d2b]/30 outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Message body</label>
                    <textarea
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="Type your message here"
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-[#0a4d2b]/30 outline-none transition-colors resize-none"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sending}
                      className="px-6 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send size={18} />
                      {sending ? 'Sending...' : 'Send broadcast'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/30">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-neutral-500 hover:text-black transition-colors">
              {selectedIds.length > 0 && selectedIds.length === notifications.length ? <CheckCircle size={20} className="text-black" /> : <Circle size={20} />}
            </button>
            <span className="text-sm font-medium text-neutral-600">
              {selectedIds.length > 0 ? `${selectedIds.length} Selected` : `${notifications.length} Messages`}
            </span>
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={handleDelete}
              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-neutral-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">No notifications found</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`p-4 flex gap-4 hover:bg-neutral-50 transition-colors group cursor-pointer ${selectedIds.includes(notif._id) ? 'bg-[#e8f2ec]/50' : ''}`}
                onClick={() => toggleSelect(notif._id)}
              >
                <div onClick={(e) => { e.stopPropagation(); toggleSelect(notif._id); }}>
                  {selectedIds.includes(notif._id) ?
                    <CheckCircle size={20} className="text-black mt-1" /> :
                    <Circle size={20} className="text-neutral-300 group-hover:text-neutral-500 mt-1" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-medium text-neutral-900 truncate ${!notif.isRead && activeTab === 'received' ? 'text-black' : 'text-neutral-700'}`}>
                      {notif.title}
                      {!notif.isRead && activeTab === 'received' && <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full"></span>}
                    </h3>
                    <span className="text-xs text-neutral-500 whitespace-nowrap ml-4">
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-neutral-600 text-sm leading-relaxed">{notif.body}</p>

                  {/* Additional Data Display for Broadcast Logs */}
                  {activeTab === 'sent' && notif.data && (
                    <div className="mt-2 text-xs text-neutral-500 bg-neutral-50 p-2 rounded inline-block">
                      Target: <span className="font-medium text-neutral-600">{notif.data.targetAudience}</span> •
                      Recipients: <span className="font-medium text-neutral-600">{notif.data.recipientCount}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;
