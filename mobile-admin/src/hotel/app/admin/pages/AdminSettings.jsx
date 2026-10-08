/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminSettings.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { Settings, Save, Globe, Wallet } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import useAdminStore from '../store/adminStore';
import adminService from '../../../services/adminService';
import { Button, Div, Input, P, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  LoadingState,
  ErrorState,
  useLayoutWidth,
  INPUT,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
} from '../../../../admin/ui';
const ToggleSwitch = ({ enabled, onChange, label }) => (
  <Button
    onClick={() => onChange(!enabled)}
    className={`w-14 h-8 flex-row items-center rounded-full p-1 shrink-0 ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
    accessibilityLabel={label}
    accessibilityRole="switch"
  >
    <Div className={`bg-white w-6 h-6 rounded-full ${enabled ? 'ml-auto' : ''}`} />
  </Button>
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
  const [loadError, setLoadError] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const { tablet } = useLayoutWidth();
  useEffect(() => {
    if (admin) {
      setProfile({
        name: admin.name || '',
        email: admin.email || '',
        phone: admin.phone || '',
      });
    }
  }, [admin]);
  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      setLoadError(null);
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
      setLoadError(error?.response?.data?.message || error?.message || 'Failed to load platform settings.');
    } finally {
      setLoadingSettings(false);
    }
  };
  useEffect(() => {
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
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={Settings}
        title="Platform Settings"
        subtitle="Configure global rules, commission rates and system preferences."
        breadcrumb={[{ label: 'Hotel' }, { label: 'Settings' }]}
      />

      {/* Admin profile */}
      <Card className="mb-4">
        <SectionTitle>Admin Profile</SectionTitle>
        <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
          <Field label="Full name" className={tablet ? 'flex-1 min-w-[260px]' : null}>
            <Input type="text" value={profile.name} onChange={(e) => handleProfileChange('name', e.target.value)} className={INPUT} placeholder="Admin name" />
          </Field>
          <Field label="Email" className={tablet ? 'flex-1 min-w-[260px]' : null}>
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              className={INPUT}
              placeholder="admin@example.com"
            />
          </Field>
          <Field label="Phone" className={tablet ? 'flex-1 min-w-[260px]' : null}>
            <Input
              type="tel"
              value={profile.phone}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
              className={INPUT}
              placeholder="10 digit number"
            />
          </Field>
        </Div>
        <Div className="flex-row justify-end mt-3">
          <Button
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className={`${BTN_PRIMARY} ${savingProfile ? 'opacity-60' : ''}`}
          >
            <UiIcon as={Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{savingProfile ? 'Saving…' : 'Save profile'}</Span>
          </Button>
        </Div>
      </Card>

      {/* General configuration */}
      {loadError ? (
        <ErrorState title="Could not load platform settings" message={loadError} onRetry={loadSettings} />
      ) : loadingSettings ? (
        <LoadingState label="Loading platform settings…" />
      ) : (
        <>
          <Card className="mb-4">
            <SectionTitle>General Configuration</SectionTitle>
            <Div className="gap-4">
              <Div className="flex-row items-center justify-between gap-3">
                <Div className="flex-1 min-w-0">
                  <P className="text-sm font-medium text-slate-900">Platform status</P>
                  <P className="text-xs text-slate-500">Enable or disable booking capability globally.</P>
                </Div>
                <ToggleSwitch enabled={platformOpen} onChange={setPlatformOpen} label="Platform status" />
              </Div>
              <Div className="flex-row items-center justify-between gap-3">
                <Div className="flex-1 min-w-0">
                  <P className="text-sm font-medium text-slate-900">Maintenance mode</P>
                  <P className="text-xs text-slate-500">Show the maintenance screen to all users.</P>
                </Div>
                <ToggleSwitch enabled={maintenance} onChange={setMaintenance} label="Maintenance mode" />
              </Div>

              <Field label="User message when booking is disabled">
                <Input
                  type="text"
                  value={bookingMessage}
                  onChange={(e) => setBookingMessage(e.target.value)}
                  className={INPUT}
                  placeholder="Bookings are temporarily disabled. Please try again later."
                />
              </Field>
              <Field label="Maintenance title">
                <Input
                  type="text"
                  value={maintenanceTitle}
                  onChange={(e) => setMaintenanceTitle(e.target.value)}
                  className={INPUT}
                  placeholder="We will be back soon."
                />
              </Field>
              <Field label="Maintenance description">
                <Textarea
                  rows={3}
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  placeholder="The platform is under scheduled maintenance. Please check back in some time."
                />
              </Field>
            </Div>
          </Card>

          <Card className="mb-4">
            <SectionTitle>
              <Div className="flex-row items-center gap-2">
                <UiIcon as={Wallet} size={18} className="text-slate-500" />
                <Span className="text-base font-semibold text-slate-900">Financial Rules</Span>
              </Div>
            </SectionTitle>
            <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
              <Field label="Default commission (%)" className={tablet ? 'flex-1 min-w-[220px]' : null}>
                <Input type="number" value={commission} onChange={(e) => setCommission(e.target.value)} className={INPUT} />
              </Field>
              <Field label="GST / tax rate (%)" className={tablet ? 'flex-1 min-w-[220px]' : null}>
                <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={INPUT} />
              </Field>
            </Div>
          </Card>

          <Div className="flex-row justify-end">
            <Button
              type="button"
              onClick={handleSavePlatformSettings}
              disabled={savingSettings || loadingSettings}
              className={`${BTN_PRIMARY} ${savingSettings || loadingSettings ? 'opacity-60' : ''}`}
            >
              <UiIcon as={Globe} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>{savingSettings || loadingSettings ? 'Saving…' : 'Save configuration'}</Span>
            </Button>
          </Div>
        </>
      )}
    </AdminPage>
  );
};
export default AdminSettings;
