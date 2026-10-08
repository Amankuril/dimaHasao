/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/NotificationChannels.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ChevronRight, Loader2, ArrowLeft, Bell, Mail, Smartphone, Edit, CheckCircle2, ShieldCheck, User, Users } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { Button, Div, H1, H3, H4, HScroll, Input, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
import { window } from '../../../../../lib/webShim';
const NotificationChannels = () => {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'driver'

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminService.getNotificationChannels();
      setChannels(res.data?.results || []);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load notification channels');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleToggle = async (id, type, currentValue) => {
    try {
      if (type === 'push') {
        await adminService.toggleChannelPush(id, !currentValue);
      } else {
        await adminService.toggleChannelMail(id, !currentValue);
      }
      setChannels((prev) =>
        prev.map((c) =>
          String(c._id) === String(id)
            ? {
                ...c,
                [type === 'push' ? 'push_notification' : 'mail']: !currentValue,
              }
            : c,
        ),
      );
      toast.success('Channel preference updated');
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Failed to update toggle');
    }
  };
  const filteredChannels = channels.filter((channel) => (activeTab === 'user' ? channel.for_user : !channel.for_user));
  if (loading) {
    return (
      <ScrollDiv className="flex items-center justify-center min-h-screen bg-gray-50">
        <UiIcon as={Loader2} className="animate-spin text-indigo-600" size={32} />
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8 font-sans">
      {/* Header Block */}
      <Div className="mb-8">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Settings</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span>Business Configuration</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Notification Channels</Span>
        </Div>
        <Div className="flex items-center justify-between">
          <H1 className="text-xl text-gray-900 font-bold">Push & Email Channels</H1>
          <Button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        </Div>
      </Div>

      <Div className="space-y-6 max-w-7xl mx-auto">
        {/* Segment Tabs */}
        <Div className="flex p-1 bg-gray-200/50 rounded-xl w-fit">
          <Button
            onClick={() => setActiveTab('user')}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'user' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <UiIcon as={User} size={16} /> Customers
          </Button>
          <Button
            onClick={() => setActiveTab('driver')}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'driver' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <UiIcon as={Users} size={16} /> Drivers
          </Button>
        </Div>

        {/* Channels Card */}
        <Div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          {/* Section Info */}
          <Div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UiIcon as={Bell} size={20} />
            </Div>
            <Div>
              <H3 className="text-sm font-bold text-gray-900 capitalize">{activeTab} Notifications</H3>
              <P className="text-xs text-gray-400">Configure delivery methods for automated platform events</P>
            </Div>
          </Div>

          {/* Custom Table Layout */}
          <HScroll className="flex-1" contentClassName="w-[1000px]">
            <Div className="w-[1000px]">
              {/* Table Head */}
              <Div className="flex bg-gray-50/50 border-b border-gray-100 px-8 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                <Div className="flex-1">Event Channel Topic</Div>
                <Div className="w-[140px] text-center">Push Apps</Div>
                <Div className="w-[140px] text-center">Email SMTP</Div>
                <Div className="w-[280px] text-center">Templates Config</Div>
              </Div>

              {/* Table Body */}
              <Div className="divide-y divide-gray-100">
                {filteredChannels.length === 0 ? (
                  <Div className="p-20 text-center text-gray-400 italic font-medium">No system channels found for this segment</Div>
                ) : (
                  filteredChannels.map((channel) => (
                    <Div key={channel._id} className="flex px-8 py-6 items-center hover:bg-gray-50/30 transition-all">
                      <Div className="flex-1 space-y-1 pr-10">
                        <H4 className="text-sm font-bold text-gray-900 tracking-tight">{channel.topic_name || channel.name}</H4>
                        <P className="text-[11px] font-medium text-gray-400 leading-relaxed italic">
                          {channel.description || `Automatic notifications sent to ${activeTab}s regarding system updates.`}
                        </P>
                      </Div>

                      <Div className="w-[140px] flex justify-center">
                        <Switch checked={channel.push_notification} onCheckedChange={() => handleToggle(channel._id, 'push', channel.push_notification)} className={channel.push_notification ? 'bg-indigo-600' : 'bg-gray-200'} />
                      </Div>

                      <Div className="w-[140px] flex justify-center">
                        <Switch checked={channel.mail} onCheckedChange={() => handleToggle(channel._id, 'mail', channel.mail)} className={channel.mail ? 'bg-emerald-600' : 'bg-gray-200'} />
                      </Div>

                      <Div className="w-[280px] flex justify-center gap-2">
                        <Button
                          onClick={() => toast.success('Viewing Email Template')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-extrabold text-gray-500 hover:bg-white hover:border-amber-200 hover:text-amber-600 transition-all uppercase tracking-tighter"
                        >
                          <UiIcon as={Edit} size={12} /> Email
                        </Button>
                        <Button
                          onClick={() => toast.success('Viewing Push Template')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-extrabold text-gray-500 hover:bg-white hover:border-amber-200 hover:text-amber-600 transition-all uppercase tracking-tighter"
                        >
                          <UiIcon as={Edit} size={12} /> Push
                        </Button>
                      </Div>
                    </Div>
                  ))
                )}
              </Div>
            </Div>
          </HScroll>

          {/* Card Footer */}
          <Div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <Div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold uppercase tracking-widest px-2">
              <UiIcon as={ShieldCheck} size={12} className="text-gray-300" />
              Ready State
            </Div>
            <P className="text-[10px] font-bold text-gray-400 italic">Total of {filteredChannels.length} active event triggers</P>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default NotificationChannels;
