/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminSettings.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { Settings, Shield, Bell, CreditCard, ToggleLeft, ToggleRight, Save, Globe, Lock } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import useAdminStore from '../store/adminStore';
import adminService from '../../../services/adminService';
import { Button, Div, H2, H3, Input, Label, P, ScrollDiv, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
const ToggleSwitch = ({ enabled, onChange }) => (
  <Button
    onClick={() => onChange(!enabled)}
    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${enabled ? 'bg-black' : 'bg-gray-300'}`}
  >
    <Div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}></Div>
  </Button>
);
const Section = ({ title, icon: Icon, children }) => (
  <Div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
    <Div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
      <Div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-700">
        <UiIcon as={Icon} size={18} />
      </Div>
      <H3 className="text-lg font-bold text-gray-900">{title}</H3>
    </Div>
    <Div className="space-y-6">{children}</Div>
  </Div>
);
const AdminSettings = () => {
  const admin = useAdminStore((state) => state.admin);
  const checkAuth = useAdminStore((state) => state.checkAuth);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [platformOpen, setPlatformOpen] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [commission, setCommission] = useState(10);
  const [taxRate, setTaxRate] = useState(12);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [autoPayout, setAutoPayout] = useState(false);
  useEffect(() => {
    if (admin) {
      setProfile({
        name: admin.name || '',
        email: admin.email || '',
        phone: admin.phone || '',
      });
    }
  }, [admin]);
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true);
        const res = await adminService.getPlatformSettings();
        if (res.settings) {
          setPlatformOpen(res.settings.platformOpen);
          setMaintenance(res.settings.maintenanceMode);
          setBookingMessage(res.settings.bookingDisabledMessage || '');
          setMaintenanceTitle(res.settings.maintenanceTitle || '');
          setMaintenanceMessage(res.settings.maintenanceMessage || '');
          setCommission(res.settings.defaultCommission || 10);
          setTaxRate(res.settings.taxRate || 12);
        }
      } catch (error) {
        toast.error('Failed to load platform settings');
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);
  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await adminService.updateAdminProfile(profile);
      toast.success('Admin profile updated');
      if (checkAuth) {
        await checkAuth();
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };
  const handleSavePlatformSettings = async () => {
    try {
      setSavingSettings(true);
      await adminService.updatePlatformSettings({
        platformOpen,
        maintenanceMode: maintenance,
        bookingDisabledMessage: bookingMessage,
        maintenanceTitle,
        maintenanceMessage,
        defaultCommission: Number(commission),
        taxRate: Number(taxRate),
      });
      toast.success('Platform settings updated');
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update platform settings';
      toast.error(message);
    } finally {
      setSavingSettings(false);
    }
  };
  return (
    <ScrollDiv className="space-y-8 pb-20">
      <Div>
        <H2 className="text-2xl font-bold text-gray-900">Platform Settings</H2>
        <P className="text-gray-500 text-sm">Configure global rules, commission rates, and system preferences.</P>
      </Div>

      <Section title="Admin Profile" icon={Settings}>
        <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">Full Name</Label>
            <Input
              type="text"
              value={profile.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
              placeholder="Admin Name"
            />
          </Div>
          <Div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">Email</Label>
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
              placeholder="admin@example.com"
            />
          </Div>
          <Div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">Phone</Label>
            <Input
              type="tel"
              value={profile.phone}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
              placeholder="10 digit number"
            />
          </Div>
        </Div>
        <Div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="flex flex-row items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-xl shadow-md hover:bg-gray-900 active:scale-95 disabled:opacity-60"
          >
            <UiIcon as={Save} size={16} />
            <Span>{savingProfile ? 'Saving...' : 'Save Profile'}</Span>
          </Button>
        </Div>
      </Section>

      <Section title="General Configuration" icon={Globe}>
        <Div className="flex items-center justify-between gap-3">
          <Div className="flex-1">
            <P className="font-medium text-gray-900">Platform Status</P>
            <P className="text-sm text-gray-500">Enable or disable booking capability globally.</P>
          </Div>
          <ToggleSwitch enabled={platformOpen} onChange={setPlatformOpen} />
        </Div>
        <Div className="flex items-center justify-between gap-3">
          <Div className="flex-1">
            <P className="font-medium text-gray-900">Maintenance Mode</P>
            <P className="text-sm text-gray-500">Show maintenance screen to all users.</P>
          </Div>
          <ToggleSwitch enabled={maintenance} onChange={setMaintenance} />
        </Div>
        <Div className="grid grid-cols-1 gap-4 pt-2">
          <Div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">User message when booking is disabled</Label>
            <Input
              type="text"
              value={bookingMessage}
              onChange={(e) => setBookingMessage(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
              placeholder="Bookings are temporarily disabled. Please try again later."
            />
          </Div>
          <Div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">Maintenance title</Label>
            <Input
              type="text"
              value={maintenanceTitle}
              onChange={(e) => setMaintenanceTitle(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm"
              placeholder="We will be back soon."
            />
          </Div>
          <Div>
            <Label className="block text-xs font-medium text-gray-600 mb-1">Maintenance description</Label>
            <Textarea
              rows={3}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black text-sm resize-none"
              placeholder="The platform is under scheduled maintenance. Please check back in some time."
            />
          </Div>
        </Div>
        <Div className="mt-4">
          <Div className="pb-4 font-bold text-lg flex items-center gap-4">
            <UiIcon as={Globe} size={18} />
            Financial Rule
          </Div>
          <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Default Commission (%)</Label>
              <Input
                type="number"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black"
              />
            </Div>
            <Div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">GST / Tax Rate (%)</Label>
              <Input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black"
              />
            </Div>
          </Div>
          {/* <div className="flex items-center justify-between pt-2">
                     <div>
                        <p className="font-medium text-gray-900">Automatic Payouts</p>
                        <p className="text-sm text-gray-500">Automatically release payments to hotels every Monday.</p>
                     </div>
                     <ToggleSwitch enabled={autoPayout} onChange={setAutoPayout} />
                     </div> */}
        </Div>

        <Div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleSavePlatformSettings}
            disabled={savingSettings || loadingSettings}
            className="flex flex-row items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-bold rounded-xl shadow-md hover:bg-gray-900 active:scale-95 disabled:opacity-60"
          >
            <UiIcon as={Save} size={16} />
            <Span>{savingSettings || loadingSettings ? 'Saving...' : 'Save Configuration'}</Span>
          </Button>
        </Div>
      </Section>

      {/* <Section title="Security & Access" icon={Shield}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-gray-900">Two-Factor Auth (Admin)</p>
                        <p className="text-sm text-gray-500">Force 2FA for all admin accounts.</p>
                    </div>
                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">ENABLED</span>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Session Timeout (Minutes)</label>
                    <select className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-black bg-white">
                        <option>15 Minutes</option>
                        <option>30 Minutes</option>
                        <option>1 Hour</option>
                    </select>
                </div>
             </Section> */}
    </ScrollDiv>
  );
};
export default AdminSettings;
