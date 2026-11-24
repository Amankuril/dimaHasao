import React, { useEffect, useState } from 'react';
import {
    Settings, Shield, Bell, CreditCard, ToggleLeft,
    ToggleRight, Save, Globe, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAdminStore from '../store/adminStore';
import adminService from '../../../services/adminService';

const ToggleSwitch = ({ enabled, onChange }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${enabled ? 'bg-neutral-900' : 'bg-neutral-300'}`}
    >
        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
    </button>
);

const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white border border-neutral-900/[0.08] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-4">
            <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-700">
                <Icon size={18} />
            </div>
            <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
        </div>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

const AdminSettings = () => {
    const admin = useAdminStore(state => state.admin);
    const checkAuth = useAdminStore(state => state.checkAuth);

    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: ''
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
                phone: admin.phone || ''
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
        setProfile(prev => ({
            ...prev,
            [field]: value
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
                taxRate: Number(taxRate)
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
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div>
                <h2 className="text-2xl font-medium text-neutral-900">Platform settings</h2>
                <p className="mt-1 text-sm text-neutral-500">Booking rules, commission and admin preferences</p>
            </div>

            <Section title="Admin profile" icon={Settings}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Full name</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => handleProfileChange('name', e.target.value)}
                            className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 text-sm"
                            placeholder="Admin name"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
                        <input
                            type="email"
                            value={profile.email}
                            onChange={(e) => handleProfileChange('email', e.target.value)}
                            className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 text-sm"
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={profile.phone}
                            onChange={(e) => handleProfileChange('phone', e.target.value)}
                            className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 text-sm"
                            placeholder="10 digit number"
                        />
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl shadow-sm hover:bg-neutral-900 disabled:opacity-60"
                    >
                        <Save size={16} />
                        {savingProfile ? 'Saving...' : 'Save profile'}
                    </button>
                </div>
            </Section>

            <Section title="General configuration" icon={Globe}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-neutral-900">Platform status</p>
                        <p className="text-sm text-neutral-500">Enable or disable booking capability globally.</p>
                    </div>
                    <ToggleSwitch enabled={platformOpen} onChange={setPlatformOpen} />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-neutral-900">Maintenance mode</p>
                        <p className="text-sm text-neutral-500">Show maintenance screen to all users.</p>
                    </div>
                    <ToggleSwitch enabled={maintenance} onChange={setMaintenance} />
                </div>
                <div className="grid grid-cols-1 gap-4 pt-2">
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">User message when booking is disabled</label>
                        <input
                            type="text"
                            value={bookingMessage}
                            onChange={(e) => setBookingMessage(e.target.value)}
                            className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 text-sm"
                            placeholder="Bookings are temporarily disabled. Please try again later."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Maintenance title</label>
                        <input
                            type="text"
                            value={maintenanceTitle}
                            onChange={(e) => setMaintenanceTitle(e.target.value)}
                            className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 text-sm"
                            placeholder="We will be back soon."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Maintenance description</label>
                        <textarea
                            rows={3}
                            value={maintenanceMessage}
                            onChange={(e) => setMaintenanceMessage(e.target.value)}
                            className="w-full p-2.5 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 text-sm resize-none"
                            placeholder="The platform is under scheduled maintenance. Please check back in some time."
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <div className="pb-4 font-medium text-lg flex items-center gap-4"><Globe size={18} />Financial rule</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Default Commission (%)</label>
                            <input
                                type="number"
                                value={commission}
                                onChange={(e) => setCommission(e.target.value)}
                                className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">GST / Tax Rate (%)</label>
                            <input
                                type="number"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                            />
                        </div>
                    </div>
                    {/* <div className="flex items-center justify-between pt-2">
                    <div>
                        <p className="font-medium text-neutral-900">Automatic payouts</p>
                        <p className="text-sm text-neutral-500">Automatically release payments to hotels every Monday.</p>
                    </div>
                    <ToggleSwitch enabled={autoPayout} onChange={setAutoPayout} />
                </div> */}
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSavePlatformSettings}
                        disabled={savingSettings || loadingSettings}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl shadow-sm hover:bg-neutral-900 disabled:opacity-60"
                    >
                        <Save size={16} />
                        {savingSettings || loadingSettings ? 'Saving...' : 'Save configuration'}
                    </button>
                </div>
            </Section>

            {/* <Section title="Security & access" icon={Shield}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-neutral-900">Two-Factor Auth (Admin)</p>
                        <p className="text-sm text-neutral-500">Force 2FA for all admin accounts.</p>
                    </div>
                    <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded">Enabled</span>
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Admin session timeout (minutes)</label>
                    <select className="w-full p-2 border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 bg-white">
                        <option>15 minutes</option>
                        <option>30 minutes</option>
                        <option>1 hour</option>
                    </select>
                </div>
            </Section> */}

        </div>
    );
};

export default AdminSettings;
