import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Save, 
  Loader2,
  ChevronUp
} from 'lucide-react';
import api from '../../../../shared/api/axiosInstance';
import toast from 'react-hot-toast';

const InputField = ({ label, name, value, onChange, placeholder, type = "text" }) => (
  <div className="space-y-1.5 w-full">
    <label className="text-sm font-medium text-neutral-700 block ml-0.5">
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white border border-neutral-200 rounded-lg py-2.5 px-4 text-sm text-neutral-900 focus:border-[#0a4d2b] focus:ring-1 focus:ring-[#0a4d2b]/30 transition-colors outline-none shadow-sm"
    />
  </div>
);

const TransportRideSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/general-settings/transport-ride');
      setSettings(res.data?.settings || res.settings || {});
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load transport parameters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async () => {
    try {
      setSaving(true);
      await api.patch('/admin/general-settings/transport-ride', { settings });
      toast.success('Transport settings updated successfully');
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#0a4d2b] animate-spin" />
          <p className="text-xs text-neutral-500">Loading Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8 font-sans pb-32">
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
        
        {/* Header Breadcrumb */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-end gap-4">
           <div className="flex items-center gap-1.5 text-xs text-neutral-500">
             <span>Transport ride settings</span>
             <ChevronRight size={14} />
             <span className="text-neutral-900">Transport ride settings</span>
           </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
           <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3 bg-neutral-50/30">
              <div className="w-1 h-5 bg-[#0a4d2b] rounded-full text-white"></div>
              <h3 className="text-[13px] font-medium text-neutral-700">Transport ride settings</h3>
           </div>
           
           <div className="p-6 pb-8">
             <div className="mb-8 rounded-xl border border-neutral-200 bg-neutral-50/50 px-5 py-4">
               <p className="text-sm font-medium text-neutral-900">Regular ride search behavior is controlled from this page</p>
               <p className="mt-1 text-sm text-neutral-500">
                 Only the settings below are currently wired into the live dispatch flow
               </p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                {/* Left Column */}
                <div className="space-y-6">
                   <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 block ml-0.5">Trip dispatch type</label>
                      <select 
                       value={settings.trip_dispatch_type || '1'} 
                       onChange={(e) => handleChange('trip_dispatch_type', e.target.value)}
                       className="w-full bg-white border border-neutral-200 rounded-lg py-2.5 px-4 text-sm text-neutral-900 focus:border-[#0a4d2b] focus:ring-1 focus:ring-[#0a4d2b]/30 transition-colors outline-none shadow-sm"
                      >
                         <option value="1">One By One</option>
                         <option value="2">Broadcast</option>
                      </select>
                   </div>

                   <InputField 
                      label="Maximum Time For Find Drivers For Regular Ride" 
                      name="maximum_time_for_find_drivers_for_regular_ride" 
                      value={settings.maximum_time_for_find_drivers_for_regular_ride} 
                      onChange={handleChange} 
                      type="number" 
                   />

                   <InputField 
                      label="Trip Accept/Reject Duration For Driver in Seconds" 
                      name="trip_accept_reject_duration_for_driver" 
                      value={settings.trip_accept_reject_duration_for_driver} 
                      onChange={handleChange} 
                      type="number" 
                   />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                   <InputField 
                      label="Driver Search Radius in Kilometer" 
                      name="driver_search_radius" 
                      value={settings.driver_search_radius} 
                      onChange={handleChange} 
                      type="number" 
                   />

                   <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-700 block ml-0.5">Require admin approval to end rental</label>
                      <select 
                       value={settings.require_admin_approval_to_end_rental || '0'} 
                       onChange={(e) => handleChange('require_admin_approval_to_end_rental', e.target.value)}
                       className="w-full bg-white border border-neutral-200 rounded-lg py-2.5 px-4 text-sm text-neutral-900 focus:border-[#0a4d2b] focus:ring-1 focus:ring-[#0a4d2b]/30 transition-colors outline-none shadow-sm"
                      >
                         <option value="0">No (Auto-complete ride)</option>
                         <option value="1">Yes (Awaiting confirmation)</option>
                      </select>
                   </div>
                </div>
             </div>

             <div className="mt-10 flex justify-end pt-6 border-t border-neutral-100">
                <button 
                  onClick={handleUpdate}
                  disabled={saving}
                  className="bg-[#0a4d2b] text-white px-8 py-2.5 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 hover:bg-[#06381e] transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Saving...' : 'Update Settings'}
                </button>
             </div>
           </div>
        </div>
      </div>

      {/* Floating Scroll Top */}
      <button
         onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
         className="fixed bottom-10 right-10 bg-white text-neutral-600 border border-neutral-200 w-12 h-12 rounded-full flex items-center justify-center shadow-sm hover:bg-neutral-50 hover:text-black transition-colors z-50 hover:-translate-y-1"
      >
         <ChevronUp size={20} />
      </button>
    </div>
  );
};

export default TransportRideSettings;
