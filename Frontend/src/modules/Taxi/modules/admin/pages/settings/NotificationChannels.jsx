import React, { useState, useEffect } from 'react';
import { 
  ChevronRight,
  Loader2,
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Edit,
  CheckCircle2,
  ShieldCheck,
  User,
  Users
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

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
      
      setChannels(prev => prev.map(c => 
        String(c._id) === String(id) ? { ...c, [type === 'push' ? 'push_notification' : 'mail']: !currentValue } : c
      ));
      
      toast.success('Channel preference updated');
    } catch (err) {
       console.error('Toggle error:', err);
       toast.error('Failed to update toggle');
    }
  };

  const filteredChannels = channels.filter(channel => 
    activeTab === 'user' ? channel.for_user : !channel.for_user
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <Loader2 className="animate-spin text-[#0a4d2b]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6 lg:p-8 font-sans">
      
      {/* Header Block */}
      <div className="mb-8">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
          <span>Settings</span>
          <ChevronRight size={12} />
          <span>Business configuration</span>
          <ChevronRight size={12} />
          <span className="text-neutral-700">Notification channels</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-neutral-900 font-medium">Push & email channels</h1>
          <button onClick={() => window.history.back()} className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Segment Tabs */}
        <div className="flex p-1 bg-neutral-200/50 rounded-xl w-fit">
           <button 
              onClick={() => setActiveTab('user')}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'user' ? 'bg-white text-[#0a4d2b] shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
           >
              <User size={16} /> Customers
           </button>
           <button 
              onClick={() => setActiveTab('driver')}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'driver' ? 'bg-white text-[#0a4d2b] shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
           >
              <Users size={16} /> Drivers
           </button>
        </div>

        {/* Channels Card */}
        <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden min-h-[500px] flex flex-col">
           {/* Section Info */}
           <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 text-neutral-500">
                 <Bell size={20} />
              </div>
              <div>
                 <h3 className="text-sm font-medium text-neutral-900 capitalize">{activeTab} Notifications</h3>
                 <p className="text-xs text-neutral-500">Configure delivery methods for automated platform events</p>
              </div>
           </div>

           {/* Custom Table Layout */}
           <div className="flex-1 overflow-x-auto">
              <div className="min-w-[1000px]">
                 {/* Table Head */}
                 <div className="grid grid-cols-[1fr,140px,140px,280px] bg-neutral-50/50 border-b border-neutral-100 px-8 py-3.5 text-xs text-neutral-500">
                    <div>Event channel topic</div>
                    <div className="text-center">Push apps</div>
                    <div className="text-center">Email SMTP</div>
                    <div className="text-center">Templates config</div>
                 </div>

                 {/* Table Body */}
                 <div className="divide-y divide-neutral-100">
                    {filteredChannels.length === 0 ? (
                      <div className="p-20 text-center text-neutral-500">No system channels found for this segment</div>
                    ) : (
                      filteredChannels.map((channel) => (
                         <div key={channel._id} className="grid grid-cols-[1fr,140px,140px,280px] px-8 py-6 items-center hover:bg-neutral-50/30 transition-colors">
                            <div className="space-y-1 pr-10">
                               <h4 className="text-sm font-medium text-neutral-900">{channel.topic_name || channel.name}</h4>
                               <p className="text-xs text-neutral-500 leading-relaxed">
                                  {channel.description || `Automatic notifications sent to ${activeTab}s regarding system updates.`}
                               </p>
                            </div>

                            <div className="flex justify-center">
                               <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                     type="checkbox" 
                                     checked={channel.push_notification} 
                                     onChange={() => handleToggle(channel._id, 'push', channel.push_notification)}
                                     className="sr-only peer" 
                                  />
                                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900"></div>
                               </label>
                            </div>

                            <div className="flex justify-center">
                               <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                     type="checkbox" 
                                     checked={channel.mail} 
                                     onChange={() => handleToggle(channel._id, 'mail', channel.mail)}
                                     className="sr-only peer" 
                                  />
                                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                               </label>
                            </div>

                            <div className="flex justify-center gap-2">
                               <button 
                                  onClick={() => toast.success('Viewing Email Template')}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 border border-neutral-100 rounded-lg text-xs text-neutral-500 hover:bg-white hover:border-amber-200 hover:text-amber-600 transition-colors"
                               >
                                  <Edit size={12} /> Email
                               </button>
                               <button 
                                  onClick={() => toast.success('Viewing Push Template')}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 border border-neutral-100 rounded-lg text-xs text-neutral-500 hover:bg-white hover:border-amber-200 hover:text-amber-600 transition-colors"
                               >
                                  <Edit size={12} /> Push
                               </button>
                            </div>
                         </div>
                      ))
                    )}
                 </div>
              </div>
           </div>

           {/* Card Footer */}
           <div className="p-6 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-neutral-500 px-2">
                 <ShieldCheck size={12} className="text-neutral-300" />
                 Ready state
              </div>
              <p className="text-xs text-neutral-500">Total of {filteredChannels.length} active event triggers</p>
           </div>
        </div>
      </div>

    </div>
  );
};

export default NotificationChannels;
