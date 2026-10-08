/* Ported from Frontend/src/modules/Food/pages/admin/settings/BusinessSetup.jsx (tools/port.js first pass). */
import { useState, useEffect, useMemo } from 'react';
import { Info, Phone, Upload, X, Loader2 } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import { adminAPI } from '../../../../api/food';
import { setCachedSettings, updateFavicon, updateTitle } from '../../../utils/businessSettings';
import { EMAIL_REGEX } from '../../../../lib/emailValidation';
import { Button, Div, H1, H3, Img, Input, Label, Option, P, ScrollDiv, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
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
  if (loading) {
    return (
      <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-600" />
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Page header */}
      <Div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <Div>
          <Div className="flex items-center gap-3">
            <H1 className="text-xl lg:text-2xl font-bold text-slate-900">Business setup</H1>
          </Div>
          <P className="text-xs lg:text-sm text-slate-500 mt-1">Manage your company information, general configuration and business rules.</P>
        </Div>

        {/* Note card (top-right) */}
        <Div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 max-w-md">
          <Div className="mt-0.5">
            <UiIcon as={Info} className="w-4 h-4 text-amber-500" />
          </Div>
          <Div className="text-xs lg:text-sm text-slate-700">
            <P className="font-semibold text-amber-700 mb-0.5">Note</P>
            <P>Don&apos;t forget to click the &quot;Save Information&quot; button below to save changes.</P>
          </Div>
        </Div>
      </Div>

      <Div className="space-y-4">
        {/* Company info */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200">
          {/* Company information */}
          <Div className="px-4 py-4 border-b border-slate-100">
            <H3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Span>Company Information</Span>
            </H3>

            <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company name <Span className="text-red-500">*</Span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter Your Company Name"
                  value={formData.companyName}
                  maxLength={50}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </Div>

              <Div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email <Span className="text-red-500">*</Span>
                </Label>
                <Input
                  type="email"
                  placeholder="Enter Your Email"
                  value={formData.email}
                  maxLength={100}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </Div>

              <Div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Region <Span className="text-red-500">*</Span>
                </Label>
                <Select
                  value={formData.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <Option value="India">India</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phone <Span className="text-red-500">*</Span>
                </Label>
                <Div className="flex gap-2">
                  <Div className="relative w-32">
                    <Select
                      value={formData.phoneCountryCode}
                      onChange={(e) => handleInputChange('phoneCountryCode', e.target.value)}
                      className="w-full pl-8 pr-6 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    >
                      <Option value="+91">+91 (IN)</Option>
                    </Select>
                    <UiIcon as={Phone} className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">?</Span>
                  </Div>
                  <Input
                    type="text"
                    placeholder="Enter Your Phone Number"
                    value={formData.phoneNumber}
                    maxLength={15}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      handleInputChange('phoneNumber', val);
                    }}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>

              <Div className="md:col-span-2">
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Address</Label>
                <Textarea
                  rows={2}
                  placeholder="Enter Your Addresss"
                  value={formData.address}
                  maxLength={250}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </Div>

              <Div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">State</Label>
                <Input
                  type="text"
                  placeholder="Enter Your State"
                  value={formData.state}
                  maxLength={50}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </Div>

              <Div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Pincode</Label>
                <Input
                  type="text"
                  placeholder="Enter Your Pincode"
                  value={formData.pincode}
                  maxLength={10}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    handleInputChange('pincode', val);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </Div>
            </Div>

            {/* Logo & favicon upload */}
            <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Logo</Label>
                <Div
                  onClick={handleLogoPick}
                  className="border border-dashed border-slate-300 rounded-lg bg-slate-50/60 h-28 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors relative overflow-hidden"
                >
                  {logoPreview ? (
                    <>
                      <Img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogoPreview(null);
                          setLogoFile(null);
                          setRemoveLogo(true);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <UiIcon as={X} className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <Div className="text-center">
                      <UiIcon as={Upload} className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <P className="text-xs text-slate-400">Click to upload logo</P>
                    </Div>
                  )}
                </Div>
              </Div>
              <Div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1.5">Favicon</Label>
                <Div
                  onClick={handleFaviconPick}
                  className="border border-dashed border-slate-300 rounded-lg bg-slate-50/60 h-28 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors relative overflow-hidden"
                >
                  {faviconPreview ? (
                    <>
                      <Img src={faviconPreview} alt="Favicon preview" className="w-full h-full object-contain" />
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFaviconPreview(null);
                          setFaviconFile(null);
                          setRemoveFavicon(true);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <UiIcon as={X} className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <Div className="text-center">
                      <UiIcon as={Upload} className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <P className="text-xs text-slate-400">Click to upload favicon</P>
                    </Div>
                  )}
                </Div>
              </Div>
            </Div>
          </Div>

          {/* Save Button Section */}
          <Div className="px-4 py-4 border-t border-slate-100">
            <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <P className="text-[11px] text-slate-500">
                Changes will only be applied after clicking the <Span className="font-semibold">Save Information</Span> button.
              </P>
              <Div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleReset}
                  disabled={saving || !hasChanges}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <UiIcon as={Loader2} className="w-3 h-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Information'
                  )}
                </Button>
              </Div>
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
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
