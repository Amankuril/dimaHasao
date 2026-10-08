/* Ported from Frontend/src/modules/Food/pages/admin/AdminSettings.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { adminAPI } from '../../../api/food';
import { ActivityIndicator } from 'react-native';
import { toast } from '../../../lib/notify';
import { Eye, EyeOff, Save, Shield, User, Mail } from 'lucide-react-native';
import { Button as HtmlButton, Div, Form, Input, P, Span, Icon as UiIcon } from '../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  LoadingState,
  INPUT,
  INPUT_ERROR,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
  useLayoutWidth,
} from '../../../admin/ui';
const debugError = () => {};
export default function AdminSettings() {
  const { tablet } = useLayoutWidth();
  const [adminInfo, setAdminInfo] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Single API: getAdminProfile (GET /auth/me) for current account display
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await adminAPI.getAdminProfile();
        const admin = res?.data?.data?.admin ?? res?.data?.admin;
        if (!cancelled && admin) {
          setAdminInfo({
            name: admin.name,
            email: admin.email,
            role: admin.role,
          });
          return;
        }
      } catch (_) {}
      if (!cancelled) {
        try {
          const adminUserStr = localStorage.getItem('admin_user');
          if (adminUserStr) {
            const local = JSON.parse(adminUserStr);
            setAdminInfo({
              name: local.name || 'Admin User',
              email: local.email || '',
              role: local.role || 'admin',
            });
          }
        } catch (_) {}
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = {
          ...prev,
        };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  const validatePasswordForm = () => {
    const newErrors = {};
    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters long';
    }
    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) {
      return;
    }
    try {
      setSaving(true);
      await adminAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);

      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Password changed successfully');
    } catch (error) {
      debugError('Error changing password:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to change password';

      // Set specific error for current password
      if (errorMessage.includes('current password') || errorMessage.includes('incorrect')) {
        setErrors({
          currentPassword: errorMessage,
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };
  const passwordField = (key, label, visible, setVisible, placeholder, hint) => (
    <Field label={label} required error={errors[key]} hint={hint} className={tablet ? 'flex-1 min-w-[260px]' : null}>
      <Div className="relative">
        <Input
          nativeID={key}
          type={visible ? 'text' : 'password'}
          value={passwordForm[key]}
          onChange={(e) => handlePasswordChange(key, e.target.value)}
          placeholder={placeholder}
          className={`${errors[key] ? INPUT_ERROR : INPUT} pr-12`}
          disabled={saving}
          required
        />
        <HtmlButton
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-0 top-0 bottom-0 w-11 items-center justify-center"
          disabled={saving}
          accessibilityLabel={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <UiIcon as={visible ? EyeOff : Eye} size={18} className="text-slate-500" />
        </HtmlButton>
      </Div>
    </Field>
  );
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={Shield}
        title="Settings"
        subtitle="Manage your account settings and preferences"
        breadcrumb={[{ label: 'Food' }, { label: 'Settings' }]}
      />

      {/* Current account (real data) */}
      {adminInfo ? (
        <Card className="mb-4">
          <SectionTitle>Current account</SectionTitle>
          <P className="text-sm text-slate-500 -mt-2 mb-3">Signed in with the account below. Use the form to change its password.</P>
          <Div className="gap-2.5">
            <Div className="flex-row items-center gap-2">
              <UiIcon as={User} size={16} className="text-slate-400" />
              <Span className="text-sm text-slate-500">Name</Span>
              <Span className="flex-1 text-sm font-medium text-slate-900 text-right">{adminInfo.name || '\u2014'}</Span>
            </Div>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Mail} size={16} className="text-slate-400" />
              <Span className="text-sm text-slate-500">Email</Span>
              <Span className="flex-1 text-sm font-medium text-slate-900 text-right">{adminInfo.email || '\u2014'}</Span>
            </Div>
            {adminInfo.role ? (
              <Div className="flex-row items-center gap-2">
                <UiIcon as={Shield} size={16} className="text-slate-400" />
                <Span className="text-sm text-slate-500">Role</Span>
                <Span className="flex-1 text-sm font-medium capitalize text-slate-900 text-right">{adminInfo.role}</Span>
              </Div>
            ) : null}
          </Div>
        </Card>
      ) : (
        <LoadingState className="mb-4" label={'Loading your account\u2026'} />
      )}

      {/* Password Change Card */}
      <Card>
        <SectionTitle>Change password</SectionTitle>
        <P className="text-sm text-slate-500 -mt-2 mb-3">Update your password to keep your account secure</P>
        <Form onSubmit={handlePasswordSubmit}>
          <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
            {passwordField('currentPassword', 'Current Password', showCurrentPassword, setShowCurrentPassword, 'Enter your current password')}
            {passwordField('newPassword', 'New Password', showNewPassword, setShowNewPassword, 'Enter your new password', 'At least 6 characters long')}
            {passwordField('confirmPassword', 'Confirm New Password', showConfirmPassword, setShowConfirmPassword, 'Confirm your new password')}
          </Div>
          <Div className="flex-row justify-end mt-4 pt-4 border-t border-slate-200">
            <HtmlButton
              type="button"
              onClick={() => handlePasswordSubmit({ preventDefault() {} })}
              disabled={saving}
              className={BTN_PRIMARY}
              style={saving ? { opacity: 0.7 } : null}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <UiIcon as={Save} size={16} className="text-white" />}
              <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Changing password\u2026' : 'Change password'}</Span>
            </HtmlButton>
          </Div>
        </Form>
      </Card>
    </AdminPage>
  );
}
