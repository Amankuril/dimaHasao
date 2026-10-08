/* Ported from Frontend/src/modules/Food/pages/admin/settings/BusinessSetup.jsx (tools/port.js first pass). */
import { useState, useEffect, useMemo } from 'react';
import { Building2, Upload, X } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import { adminAPI } from '../../../../api/food';
import { setCachedSettings, updateFavicon, updateTitle } from '../../../utils/businessSettings';
import { EMAIL_REGEX } from '../../../../lib/emailValidation';
import { Button, Div, Img, Input, Option, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Field, LoadingState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
import { objectUrl, pickImage } from '../../../../lib/files';
import { CustomEvent, window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const emptyForm = {
  companyName: '',
  email: '',
  phoneCountryCode: '+91',
  phoneNumber: '',
  address: '',
  state: '',
  pincode: '',
  region: '',
};
const settingsToForm = (settings) => ({
  companyName: settings?.companyName || '',
  email: settings?.email || '',
  phoneCountryCode: settings?.phone?.countryCode || '+91',
  phoneNumber: settings?.phone?.number || '',
  address: settings?.address || '',
  state: settings?.state || '',
  pincode: settings?.pincode || '',
  region: settings?.region || 'India',
});
export default function BusinessSetup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const [savedForm, setSavedForm] = useState(emptyForm);
  const [savedLogoUrl, setSavedLogoUrl] = useState(null);
  const [savedFaviconUrl, setSavedFaviconUrl] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const hasChanges = useMemo(() => {
    const formDirty = Object.keys(emptyForm).some((key) => String(formData[key] ?? '') !== String(savedForm[key] ?? ''));
    const logoDirty = Boolean(logoFile) || (removeLogo && Boolean(savedLogoUrl));
    const faviconDirty = Boolean(faviconFile) || (removeFavicon && Boolean(savedFaviconUrl));
    return formDirty || logoDirty || faviconDirty;
  }, [formData, savedForm, logoFile, faviconFile, removeLogo, removeFavicon, savedLogoUrl, savedFaviconUrl]);

  // Fetch business settings on mount
  useEffect(() => {
    fetchBusinessSettings();
  }, []);
  const applySettingsToState = (settings) => {
    const nextForm = settingsToForm(settings);
    const nextLogo = settings?.logo?.url || null;
    const nextFavicon = settings?.favicon?.url || null;
    setFormData(nextForm);
    setSavedForm(nextForm);
    setLogoPreview(nextLogo);
    setFaviconPreview(nextFavicon);
    setSavedLogoUrl(nextLogo);
    setSavedFaviconUrl(nextFavicon);
    setRemoveLogo(false);
    setRemoveFavicon(false);
    setLogoFile(null);
    setFaviconFile(null);
  };
  const fetchBusinessSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getBusinessSettings();
      const settings = response?.data?.data || response?.data;
      if (settings) {
        applySettingsToState(settings);
      }
    } catch (error) {
      debugError('Error fetching business settings:', error);
      toast.error(error?.response?.data?.message || 'Failed to load business settings');
    } finally {
      setLoading(false);
    }
  };
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.companyName.trim()) {
        toast.error('Company name is required');
        return;
      }
      if (formData.companyName.trim().length < 2) {
        toast.error('Company name must be at least 2 characters long');
        return;
      }
      if (!formData.email.trim()) {
        toast.error('Email is required');
        return;
      }
      if (!EMAIL_REGEX.test(formData.email.trim())) {
        toast.error('Please enter a valid email address');
        return;
      }
      if (!formData.phoneNumber.trim()) {
        toast.error('Phone number is required');
        return;
      }
      const phoneRegex = /^\d{7,15}$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        toast.error('Please enter a valid phone number (7-15 digits)');
        return;
      }
      if (formData.pincode.trim() && !/^\d{4,10}$/.test(formData.pincode.trim())) {
        toast.error('Please enter a valid pincode (4-10 digits)');
        return;
      }
      setSaving(true);

      // Prepare form data
      const dataToSend = {
        companyName: formData.companyName.trim(),
        email: formData.email.trim(),
        phoneCountryCode: formData.phoneCountryCode,
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        region: formData.region,
        removeLogo: removeLogo && !logoFile,
        removeFavicon: removeFavicon && !faviconFile,
      };

      // Prepare files
      const files = {};
      if (logoFile) {
        files.logo = logoFile;
      }
      if (faviconFile) {
        files.favicon = faviconFile;
      }
      const response = await adminAPI.updateBusinessSettings(dataToSend, files);
      const updatedSettings = response?.data?.data || response?.data;
      if (updatedSettings) {
        // Update global cache immediately
        setCachedSettings(updatedSettings);
        applySettingsToState(updatedSettings);

        // Restore default site favicon when admin favicon was removed
        if (!updatedSettings.favicon?.url) {
          updateFavicon(null);
        }
      }
      toast.success('Business settings saved successfully');

      // Dispatch custom event to notify other components (like Sidebar)
      window.dispatchEvent(new CustomEvent('businessSettingsUpdated'));
    } catch (error) {
      debugError('Error saving business settings:', error);
      toast.error(error?.response?.data?.message || 'Failed to save business settings');
    } finally {
      setSaving(false);
    }
  };
  const handleLogoPick = async () => {
    const file = await pickImage();
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PNG, JPG, JPEG, or WEBP.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }
    setLogoFile(file);
    setRemoveLogo(false);
    setLogoPreview(objectUrl(file));
  };
  const handleFaviconPick = async () => {
    const file = await pickImage();
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/x-icon'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PNG, JPG, JPEG, WEBP, or ICO.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }
    setFaviconFile(file);
    setRemoveFavicon(false);
    setFaviconPreview(objectUrl(file));
  };
  const handleReset = () => {
    if (!hasChanges) return;
    setFormData(savedForm);
    setLogoPreview(savedLogoUrl);
    setFaviconPreview(savedFaviconUrl);
    setLogoFile(null);
    setFaviconFile(null);
    setRemoveLogo(false);
    setRemoveFavicon(false);
    toast.info('Form reset to saved values');
  };
  const { tablet } = useLayoutWidth();
  const TEXTAREA = 'px-3 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900';
  const header = (
    <PageHeader
      icon={Building2}
      title="Business setup"
      subtitle="Company information, branding and general configuration."
      breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'Business setup' }]}
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading business settings…" />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={720}>
      {header}

      <Card className="mb-4">
        <SectionTitle>Company information</SectionTitle>
        <Div className="gap-3">
          <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
            <Field label="Company name" required className={tablet ? 'flex-1' : null}>
              <Input
                type="text"
                placeholder="Enter your company name"
                value={formData.companyName}
                maxLength={50}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Email" required className={tablet ? 'flex-1' : null}>
              <Input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                maxLength={100}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={INPUT}
              />
            </Field>
          </Div>

          <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
            <Field label="Region" required className={tablet ? 'flex-1' : null}>
              <Select value={formData.region} onChange={(e) => handleInputChange('region', e.target.value)} className={INPUT}>
                <Option value="India">India</Option>
              </Select>
            </Field>
            <Field label="Phone" required className={tablet ? 'flex-1' : null}>
              <Div className="flex-row gap-2">
                <Div className="w-28">
                  <Select
                    value={formData.phoneCountryCode}
                    onChange={(e) => handleInputChange('phoneCountryCode', e.target.value)}
                    className={`${INPUT} w-28`}
                  >
                    <Option value="+91">+91 (IN)</Option>
                  </Select>
                </Div>
                <Input
                  type="text"
                  placeholder="Phone number"
                  value={formData.phoneNumber}
                  maxLength={15}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    handleInputChange('phoneNumber', val);
                  }}
                  className={`${INPUT} flex-1 min-w-0`}
                />
              </Div>
            </Field>
          </Div>

          <Field label="Address">
            <Textarea
              rows={3}
              placeholder="Enter your address"
              value={formData.address}
              maxLength={250}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className={TEXTAREA}
            />
          </Field>

          <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
            <Field label="State" className={tablet ? 'flex-1' : null}>
              <Input
                type="text"
                placeholder="Enter your state"
                value={formData.state}
                maxLength={50}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Pincode" className={tablet ? 'flex-1' : null}>
              <Input
                type="text"
                placeholder="Enter your pincode"
                value={formData.pincode}
                maxLength={10}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  handleInputChange('pincode', val);
                }}
                className={INPUT}
              />
            </Field>
          </Div>
        </Div>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Branding</SectionTitle>
        <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
          <Field label="Logo" hint="PNG, JPG or WEBP up to 5 MB." className={tablet ? 'flex-1' : null}>
            <Div
              onClick={handleLogoPick}
              accessibilityRole="button"
              accessibilityLabel="Upload logo"
              className="border border-dashed border-slate-300 rounded-lg bg-slate-50 h-32 items-center justify-center overflow-hidden"
            >
              {logoPreview ? (
                <>
                  <Img src={logoPreview} alt="Logo preview" className="w-full h-full" contentFit="contain" />
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLogoPreview(null);
                      setLogoFile(null);
                      setRemoveLogo(true);
                    }}
                    accessibilityLabel="Remove logo"
                    className="absolute top-1 right-1 w-11 h-11 items-center justify-center rounded-full"
                  >
                    <Div className="w-7 h-7 rounded-full bg-red-600 items-center justify-center">
                      <UiIcon as={X} size={14} className="text-white" />
                    </Div>
                  </Button>
                </>
              ) : (
                <Div className="items-center gap-1">
                  <UiIcon as={Upload} size={20} className="text-slate-400" />
                  <Span className="text-xs text-slate-500">Tap to upload a logo</Span>
                </Div>
              )}
            </Div>
          </Field>
          <Field label="Favicon" hint="PNG, JPG, WEBP or ICO up to 5 MB." className={tablet ? 'flex-1' : null}>
            <Div
              onClick={handleFaviconPick}
              accessibilityRole="button"
              accessibilityLabel="Upload favicon"
              className="border border-dashed border-slate-300 rounded-lg bg-slate-50 h-32 items-center justify-center overflow-hidden"
            >
              {faviconPreview ? (
                <>
                  <Img src={faviconPreview} alt="Favicon preview" className="w-full h-full" contentFit="contain" />
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFaviconPreview(null);
                      setFaviconFile(null);
                      setRemoveFavicon(true);
                    }}
                    accessibilityLabel="Remove favicon"
                    className="absolute top-1 right-1 w-11 h-11 items-center justify-center rounded-full"
                  >
                    <Div className="w-7 h-7 rounded-full bg-red-600 items-center justify-center">
                      <UiIcon as={X} size={14} className="text-white" />
                    </Div>
                  </Button>
                </>
              ) : (
                <Div className="items-center gap-1">
                  <UiIcon as={Upload} size={20} className="text-slate-400" />
                  <Span className="text-xs text-slate-500">Tap to upload a favicon</Span>
                </Div>
              )}
            </Div>
          </Field>
        </Div>
      </Card>

      <Card className="flex-row flex-wrap items-center justify-between gap-3">
        <Span className="text-sm text-slate-500 flex-1">Changes apply only after you save.</Span>
        <Div className="flex-row items-center gap-2">
          <Button
            type="button"
            onClick={handleReset}
            disabled={saving || !hasChanges}
            className={`${BTN_SECONDARY}${saving || !hasChanges ? ' opacity-50' : ''}`}
            accessibilityLabel="Reset the form"
          >
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`${BTN_PRIMARY}${saving || !hasChanges ? ' opacity-50' : ''}`}
            accessibilityLabel="Save business information"
          >
            <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Save information'}</Span>
          </Button>
        </Div>
      </Card>
    </AdminPage>
  );
}
function ToggleSwitch({ initial = false }) {
  const [enabled, setEnabled] = useState(initial);
  return (
    <Button
      type="button"
      onClick={() => setEnabled((prev) => !prev)}
      className={`inline-flex items-center w-10 h-5 rounded-full border transition-all ${enabled ? 'bg-blue-600 border-blue-600 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}
    >
      <Span className="h-4 w-4 rounded-full bg-white shadow-sm" />
    </Button>
  );
}
