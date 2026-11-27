import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Truck, 
  Gift, 
  ShieldCheck, 
  Save, 
  Info,
  ChevronRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';

const FormSection = ({ title, subTitle, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="px-10 py-8 border-b border-neutral-50 flex items-center gap-6 bg-neutral-50/30">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-neutral-100 text-neutral-500">
        <Icon size={28} />
      </div>
      <div>
        <h3 className="text-[17px] font-medium text-neutral-950 leading-none mb-1">{title}</h3>
        <p className="text-xs text-neutral-500">{subTitle}</p>
      </div>
    </div>
    <div className="p-10 space-y-8">
      {children}
    </div>
  </div>
);

const InputWrapper = ({ label, description, children, required }) => (
  <div className="space-y-3">
    <label className="flex items-center gap-2">
      <span className="text-[12px] font-medium text-neutral-950">{label}</span>
      {required && <span className="text-rose-500 font-medium">*</span>}
    </label>
    {children}
    {description && (
      <div className="flex items-start gap-2 px-1">
        <Info size={14} className="text-neutral-400 mt-0.5 shrink-0" />
        <p className="text-xs text-neutral-500 leading-relaxed">{description}</p>
      </div>
    )}
  </div>
);

const ToggleSwitch = ({ enabled, onChange }) => (
  <button 
    onClick={(e) => { e.preventDefault(); onChange(!enabled); }}
    className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-500 focus:outline-none shadow-inner ${enabled ? 'bg-neutral-900' : 'bg-neutral-200'}`}
  >
    <span className={`inline-block h-8 w-8 transform rounded-full bg-white transition-colors shadow-sm duration-500 border border-transparent ${enabled ? 'translate-x-11 bg-white' : 'translate-x-1'}`} />
  </button>
);

const ReferralSettings = () => {
  const [activeTab, setActiveTab] = useState('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [userSettings, setUserSettings] = useState({});
  const [driverSettings, setDriverSettings] = useState({});

  const token = localStorage.getItem('adminToken') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YzdiZTZhYmJlOTJlYjYwMGYwMmQxNiIsImVtYWlsIjoiYWRtaW5AYWRtaW4uY29tIiwibW9iaWxlIjoiOTk5OTk5OTk5OSIsInJvbGUiOiJzdXBlci1hZG1pbiIsImlhdCI6MTc3NTA0OTExNywiZXhwIjoxODA2NTg1MTE3fQ.5KJmXJwaVefWhnc97EqtArkA1z7ZOhsJwA9fbyRVPdQ';

  useEffect(() => {
    const fetchAllSettings = async () => {
      try {
        const [uRes, dRes] = await Promise.all([
          fetch(API_BASE_URL + '/admin/referral/settings/user', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(API_BASE_URL + '/admin/referral/settings/driver', { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);

        const uData = await uRes.json();
        const dData = await dRes.json();

        if (uData.success) setUserSettings(uData.data || {});
        if (dData.success) setDriverSettings(dData.data || {});
      } catch (err) {
        console.error("Settings fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllSettings();
  }, []);

  const handleUpdate = async (type) => {
    setSaving(true);
    let url = '';
    let body = {};
    
    if (type === 'user') { url = 'user'; body = userSettings; }
    if (type === 'driver') { url = 'driver'; body = driverSettings; }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/referral/settings/${url}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      alert("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
     return (
        <div className="min-h-screen flex items-center justify-center p-12">
           <Loader2 className="animate-spin text-[#0a4d2b]" size={48} />
        </div>
     );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 p-2 animate-in fade-in duration-1000 font-sans text-neutral-950">
      {/* HEADER */}
      <div className="flex items-end justify-between border-b border-neutral-100 pb-8">
        <div>
          <h1 className="text-6xl font-medium text-neutral-950 mb-3 leading-none">Rewards<span className="text-[#0a4d2b]">.</span></h1>
          <div className="flex items-center gap-3 text-[12px] text-neutral-500">
            <span className="bg-neutral-900 text-white px-3 py-1 rounded-full text-xs">Policy config</span>
            <ChevronRight size={14} />
            <span className="text-xs">Viral growth parameters</span>
          </div>
        </div>
        <div className="flex bg-neutral-100 p-1.5 rounded-[20px] transition-colors">
          {[
            { id: 'user', icon: User, label: 'Riders' },
            { id: 'driver', icon: Truck, label: 'Drivers' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-medium   transition-colors ${activeTab === tab.id ? 'bg-white text-[#0a4d2b] shadow-xl scale-105' : 'text-neutral-500 hover:text-neutral-600'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {success && (
        <div className="bg-[#0a4d2b] text-white p-6 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-500 shadow-xl">
           <div className="flex items-center gap-4">
              <CheckCircle2 size={24} />
              <p className="text-[12px] font-medium">Configuration comitted successfully to mainnet</p>
           </div>
        </div>
      )}

      {/* FORMS */}
      <div className="space-y-10">
        
        {/* USER REFERRAL SETTINGS */}
        {activeTab === 'user' && (
          <FormSection title="Rider referral policy" subTitle="Manage viral growth for standard users" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <InputWrapper label="Enable Earning" description="Allow users to earn rewards for successful invites">
                <ToggleSwitch 
                  enabled={userSettings.enable_user_referral_earnings} 
                  onChange={(val) => setUserSettings({...userSettings, enable_user_referral_earnings: val})} 
                />
              </InputWrapper>
              <InputWrapper label="Referral Amount (Flat ₹)" description="Base reward per successful activation" required>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-[#0a4d2b] transition-colors">₹</span>
                  <input 
                    type="number" 
                    value={userSettings.referral_commission_amount_for_user}
                    onChange={(e) => setUserSettings({...userSettings, referral_commission_amount_for_user: e.target.value})}
                    className="w-full pl-12 pr-6 py-5 bg-neutral-50 border-none rounded-2xl text-[15px] font-medium text-neutral-950 focus:bg-white focus:ring-4 focus:ring-[#0a4d2b]/30 outline-none transition-colors shadow-inner"
                  />
                </div>
              </InputWrapper>
              <InputWrapper label="Referral Type" description="Instant reward vs milestone based">
                <select 
                  value={userSettings.referral_type}
                  onChange={(e) => setUserSettings({...userSettings, referral_type: e.target.value})}
                  className="w-full px-6 py-5 bg-neutral-50 border-none rounded-2xl text-[13px] font-medium text-neutral-950 focus:bg-white focus:ring-4 focus:ring-[#0a4d2b]/30 outline-none transition-colors shadow-inner appearance-none"
                >
                  <option value="instant">Instant Activation</option>
                  <option value="milestone">Milestone Based</option>
                </select>
              </InputWrapper>
              <div className="p-8 bg-neutral-50/50 rounded-2xl border border-neutral-200 space-y-4">
                 <div className="flex items-center gap-3">
                    <ShieldCheck className="text-[#0a4d2b]" size={20} />
                    <span className="text-[12px] font-medium text-neutral-900">Global constraints</span>
                 </div>
                 <p className="text-xs font-medium text-neutral-400 leading-relaxed">
                   User referral policies are subject to regional fraud detection algorithms. Max referral limit per user is currently set to 50 active nodes.
                 </p>
              </div>
            </div>
            <button 
              onClick={() => handleUpdate('user')}
              disabled={saving}
              className="w-full py-6 bg-neutral-900 text-white rounded-2xl text-[13px] font-medium hover:bg-neutral-900 transition-colors shadow-2xl flex items-center justify-center gap-3"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              Commit Policy Changes
            </button>
          </FormSection>
        )}

        {/* DRIVER REFERRAL SETTINGS */}
        {activeTab === 'driver' && (
          <FormSection title="Driver fleet referral" subTitle="Manage recruitment incentives for fleet" icon={Truck}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <InputWrapper label="Enable Driver Earning" description="Toggle reward systems for driver recruits">
                  <ToggleSwitch 
                    enabled={driverSettings.enable_user_referral_earnings} 
                    onChange={(val) => setDriverSettings({...driverSettings, enable_user_referral_earnings: val})} 
                  />
                </InputWrapper>
                <InputWrapper label="Commission Rate (₹)">
                   <input 
                    type="number" 
                    value={driverSettings.referral_commission_amount_for_user}
                    onChange={(e) => setDriverSettings({...driverSettings, referral_commission_amount_for_user: e.target.value})}
                    className="w-full px-6 py-5 bg-neutral-50 border-none rounded-2xl text-[15px] font-medium text-neutral-950 focus:bg-white focus:ring-4 focus:ring-[#0a4d2b]/30 outline-none transition-colors shadow-inner"
                  />
                </InputWrapper>
             </div>
             <button 
              onClick={() => handleUpdate('driver')}
              disabled={saving}
              className="w-full py-6 bg-neutral-950 text-white rounded-2xl text-[13px] font-medium transition-colors shadow-2xl flex items-center justify-center gap-3"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              Update Fleet Incentives
            </button>
          </FormSection>
        )}

      </div>
    </div>
  );
};

export default ReferralSettings;

