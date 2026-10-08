/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/GeneralSettings.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Save, Loader2, Upload, X, Settings } from 'lucide-react-native';
import api from '../../../../shared/api/axiosInstance';
import { toast } from '../../../../../lib/notify';
import { useSettings } from '../../../../shared/context/SettingsContext';
import { AdminPage, PageHeader, Card, SectionTitle, Field, LoadingState, ErrorState, INPUT, BTN_PRIMARY, BTN_TEXT_PRIMARY, useLayoutWidth } from '../../../../../admin/ui';
import { Button, Div, Img, Input, P, Span, Icon as UiIcon } from '../../../../../components/web';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { pickImage } from '../../../../../lib/files';
const DEFAULT_ADMIN_THEME_COLOR = '#405189';
const DEFAULT_LANDING_THEME_COLOR = '#0AB39C';
const DEFAULT_SIDEBAR_TEXT_COLOR = '#CBD5E1';
const DEFAULT_DISPATCHER_SIDEBAR_COLOR = '#000000';
const DEFAULT_DISPATCHER_TEXT_COLOR = '#000000';
const normalizeHexColor = (value, fallback = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return fallback;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const shortHexMatch = withHash.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^#([0-9a-fA-F]{6})$/.test(withHash)) {
    return withHash.toUpperCase();
  }
  return fallback;
};
const InputField = ({ label, name, value, onChange, placeholder, info }) => (
  <Field
    label={label}
    hint={info ? `Example: ${info.prefix} ${value || info.default}` : undefined}
    className="flex-1"
  >
    <Input type="text" name={name} value={value || ''} onChange={(e) => onChange(name, e.target.value)} placeholder={placeholder} className={INPUT} />
  </Field>
);
const ColorField = ({ label, name, value, onChange, placeholder, defaultValue }) => {
  const normalizedValue = normalizeHexColor(value, normalizeHexColor(defaultValue, '#000000'));
  return (
    <Field label={label} hint="Type a hex colour." className="flex-1">
      <Div className="flex-row items-center gap-2">
        <Div className="h-11 w-11 rounded-lg border border-slate-300 shrink-0" style={{ backgroundColor: normalizedValue }} />
        <Input
          type="text"
          name={name}
          value={value || ''}
          onChange={(event) => onChange(name, event.target.value)}
          placeholder={placeholder}
          className={`${INPUT} flex-1`}
        />
      </Div>
    </Field>
  );
};
const ImageUploadBox = ({ title, size, preview, onUpload, onClear }) => {
  const openPicker = async () => {
    const file = await pickImage();
    if (file) onUpload(file);
  };
  return (
    <Field label={`${title} (${size})`} className="flex-1">
      <Div
        className="h-40 rounded-lg border border-dashed border-slate-300 bg-slate-50 items-center justify-center overflow-hidden"
        onClick={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`Upload ${title}`}
      >
        {preview ? (
          <Img src={preview} alt={title} className="w-full h-full" contentFit="contain" />
        ) : (
          <Div className="items-center gap-2">
            <UiIcon as={Upload} size={22} className="text-slate-400" />
            <P className="text-sm font-medium text-slate-500">Upload image</P>
          </Div>
        )}
      </Div>
      <Div className="flex-row gap-2">
        <Button
          onClick={openPicker}
          accessibilityLabel={`Choose ${title}`}
          className="flex-row items-center justify-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1"
        >
          <UiIcon as={Upload} size={14} className="text-slate-700" />
          <Span className="text-sm font-semibold text-slate-700">Choose</Span>
        </Button>
        {preview ? (
          <Button
            onClick={onClear}
            accessibilityLabel={`Remove ${title}`}
            className="flex-row items-center justify-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white"
          >
            <UiIcon as={X} size={14} className="text-red-600" />
            <Span className="text-sm font-semibold text-red-600">Remove</Span>
          </Button>
        ) : null}
      </Div>
    </Field>
  );
};
const fileToDataUrl = async (file) => {
  const type = file.type || 'image/png';
  return `data:${type};base64,${await new File(file.uri).base64()}`;
};
/* The web resized the favicon on a 64x64 canvas; expo-image-manipulator does the same here. */
const resizeImageFileToDataUrl = async (file, size = 64) => {
  const ctx = ImageManipulator.manipulate(file.uri);
  ctx.resize({ width: size, height: size });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: SaveFormat.PNG });
  return `data:image/png;base64,${await new File(out.uri).base64()}`;
};
const GeneralSettings = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const { refreshSettings } = useSettings();
  const { tablet } = useLayoutWidth();
  const [settings, setSettings] = useState({
    general: {},
    customization: {},
  });
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [genRes, cusRes] = await Promise.all([api.get('/admin/general-settings/general'), api.get('/admin/general-settings/customize')]);
      setSettings({
        general: genRes.data?.settings || {},
        customization: cusRes.data?.settings || {},
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load settings');
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSettings();
  }, []);
  const handleUpdate = async () => {
    try {
      setSaving(true);
      const customizationPayload = {
        ...settings.customization,
        admin_theme_color: normalizeHexColor(settings.customization?.admin_theme_color, DEFAULT_ADMIN_THEME_COLOR),
        landing_theme_color: normalizeHexColor(settings.customization?.landing_theme_color, DEFAULT_LANDING_THEME_COLOR),
        sidebar_text_color: normalizeHexColor(settings.customization?.sidebar_text_color, DEFAULT_SIDEBAR_TEXT_COLOR),
        disp_sidebar_bg: normalizeHexColor(settings.customization?.disp_sidebar_bg, DEFAULT_DISPATCHER_SIDEBAR_COLOR),
        disp_side_text: normalizeHexColor(settings.customization?.disp_side_text, DEFAULT_DISPATCHER_TEXT_COLOR),
      };
      await Promise.all([
        api.patch('/admin/general-settings/general', {
          settings: settings.general,
        }),
        api.patch('/admin/general-settings/customize', {
          settings: customizationPayload,
        }),
      ]);
      await refreshSettings();
      toast.success('Configuration saved successfully!');
    } catch (err) {
      console.error('Update settings failed:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  const handleChange = (category, name, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [name]: value,
      },
    }));
  };
  const handleLogoUpload = async (file) => {
    const dataUrl = await fileToDataUrl(file);
    handleChange('general', 'logo', dataUrl);
  };
  const handleFaviconUpload = async (file) => {
    try {
      const resizedFavicon = await resizeImageFileToDataUrl(file, 64);
      handleChange('general', 'favicon', resizedFavicon);
      toast.success('Favicon prepared at 64x64');
    } catch (err) {
      console.error('Favicon resize failed:', err);
      toast.error('Failed to prepare favicon');
    }
  };
  const configuredAppName = String(settings.general?.app_name || '').trim() || 'App';
  const header = (
    <PageHeader
      icon={Settings}
      title="General Settings"
      subtitle="Branding, contact details and panel colours"
      breadcrumb={[{ label: 'Business Settings' }, { label: 'General Settings' }]}
      actions={
        <Button onClick={handleUpdate} disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-60' : ''}`}>
          <UiIcon as={saving ? Loader2 : Save} size={16} className="text-white" />
          <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Save settings'}</Span>
        </Button>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading settings…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Could not load settings" message={loadError} onRetry={fetchSettings} />
      </AdminPage>
    );
  }
  const row = (...kids) => <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>{kids}</Div>;
  const onCustom = (n, v) => handleChange('customization', n, v);
  const onGeneral = (n, v) => handleChange('general', n, v);
  return (
    <AdminPage maxWidth={720}>
      {header}

      <Card className="gap-4 mb-4">
        <SectionTitle>General settings</SectionTitle>
        {row(
          <ColorField key="atc" label="Admin theme colour" name="admin_theme_color" value={settings.customization.admin_theme_color} onChange={onCustom} placeholder={DEFAULT_ADMIN_THEME_COLOR} defaultValue={DEFAULT_ADMIN_THEME_COLOR} />,
          <ColorField key="ltc" label="Landing website theme colour" name="landing_theme_color" value={settings.customization.landing_theme_color} onChange={onCustom} placeholder={DEFAULT_LANDING_THEME_COLOR} defaultValue={DEFAULT_LANDING_THEME_COLOR} />,
        )}
        {row(
          <ColorField key="stc" label="Sidebar text colour" name="sidebar_text_color" value={settings.customization.sidebar_text_color} onChange={onCustom} placeholder={DEFAULT_SIDEBAR_TEXT_COLOR} defaultValue={DEFAULT_SIDEBAR_TEXT_COLOR} />,
          <InputField key="an" label="App name" name="app_name" value={settings.general.app_name} onChange={onGeneral} placeholder={configuredAppName} />,
        )}
        {row(
          <InputField key="cc" label="Currency code" name="default_currency_code_for_mobile_app" value={settings.customization.default_currency_code_for_mobile_app} onChange={onCustom} placeholder="INR" />,
          <InputField key="cs" label="Currency symbol" name="currency_symbol" value={settings.customization.currency_symbol} onChange={onCustom} placeholder="₹" />,
        )}
        {row(
          <InputField key="p1" label="Contact mobile 1" name="contact_phone_1" value={settings.general.contact_phone_1} onChange={onGeneral} placeholder="0000000000" />,
          <InputField key="p2" label="Contact mobile 2" name="contact_phone_2" value={settings.general.contact_phone_2} onChange={onGeneral} placeholder="0000000000" />,
        )}
        {row(
          <InputField key="lat" label="Default latitude" name="default_lat" value={settings.general.default_lat} onChange={onGeneral} placeholder="11.21215" />,
          <InputField key="lng" label="Default longitude" name="default_lng" value={settings.general.default_lng} onChange={onGeneral} placeholder="78.54545" />,
        )}
      </Card>

      <Card className="gap-4 mb-4">
        <SectionTitle>Images</SectionTitle>
        {row(
          <ImageUploadBox
            key="logo"
            title="Brand logo"
            size="750 × 100"
            preview={settings.general.logo || settings.customization.logo || settings.general.brand_logo}
            onUpload={(file) => handleLogoUpload(file)}
            onClear={() => handleChange('general', 'logo', '')}
          />,
          <ImageUploadBox
            key="fav"
            title="Favicon"
            size="80 × 80"
            preview={settings.general.favicon || settings.customization.favicon}
            onUpload={(file) => handleFaviconUpload(file)}
            onClear={() => handleChange('general', 'favicon', '')}
          />,
        )}
      </Card>

      <Card className="gap-4 mb-4">
        <SectionTitle>Footer</SectionTitle>
        {row(
          <InputField key="f1" label="Footer content 1" name="footer_1" value={settings.general.footer_1} onChange={onGeneral} placeholder={`2026 © ${configuredAppName}.`} />,
          <InputField key="f2" label="Footer content 2" name="footer_2" value={settings.general.footer_2} onChange={onGeneral} placeholder={`Design & Develop by ${configuredAppName}`} />,
        )}
      </Card>

      <Card className="gap-4">
        <SectionTitle>Dispatcher panel</SectionTitle>
        {row(
          <ColorField key="dsb" label="Sidebar background colour" name="disp_sidebar_bg" value={settings.customization.disp_sidebar_bg} onChange={onCustom} placeholder={DEFAULT_DISPATCHER_SIDEBAR_COLOR} defaultValue={DEFAULT_DISPATCHER_SIDEBAR_COLOR} />,
          <ColorField key="dst" label="Side menu text colour" name="disp_side_text" value={settings.customization.disp_side_text} onChange={onCustom} placeholder={DEFAULT_DISPATCHER_TEXT_COLOR} defaultValue={DEFAULT_DISPATCHER_TEXT_COLOR} />,
        )}
      </Card>
    </AdminPage>
  );
};
export default GeneralSettings;
