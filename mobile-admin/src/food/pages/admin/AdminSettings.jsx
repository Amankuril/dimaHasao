/* Ported from Frontend/src/modules/Food/pages/admin/AdminSettings.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { adminAPI } from '../../../api/food';
import { ActivityIndicator } from 'react-native';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '../../../components/shadcn';
import { toast } from '../../../lib/notify';
import { Lock, Eye, EyeOff, Save, Shield, User, Mail, Truck } from 'lucide-react-native';
import { Button as HtmlButton, Div, Form, H1, P, ScrollDiv, Span, Icon as UiIcon } from '../../../components/web';
const debugError = () => {};
export default function AdminSettings() {
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
  return (
    <ScrollDiv className="flex-1 p-6 space-y-6">
      <Div>
        <H1 className="text-3xl font-bold text-neutral-900">Settings</H1>
        <P className="text-neutral-600 mt-1">Manage your account settings and preferences</P>
      </Div>

      {/* Current account (real data) */}
      {adminInfo && (
        <Card>
          <CardHeader>
            <Div className="flex items-center gap-2">
              <UiIcon as={User} className="w-5 h-5 text-neutral-700" />
              <CardTitle>Current account</CardTitle>
            </Div>
            <CardDescription>Logged in with the following account. Use the form below to change password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Div className="flex items-center gap-2 text-sm">
              <UiIcon as={User} className="w-4 h-4 text-neutral-500" />
              <Span className="text-neutral-600">Name:</Span>
              <Span className="font-medium text-neutral-900">{adminInfo.name || '—'}</Span>
            </Div>
            <Div className="flex items-center gap-2 text-sm">
              <UiIcon as={Mail} className="w-4 h-4 text-neutral-500" />
              <Span className="text-neutral-600">Email:</Span>
              <Span className="font-medium text-neutral-900">{adminInfo.email || '—'}</Span>
            </Div>
            {adminInfo.role && (
              <Div className="flex items-center gap-2 text-sm">
                <UiIcon as={Shield} className="w-4 h-4 text-neutral-500" />
                <Span className="text-neutral-600">Role:</Span>
                <Span className="font-medium capitalize text-neutral-900">{adminInfo.role}</Span>
              </Div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <Div className="flex items-center gap-2">
            <UiIcon as={Shield} className="w-5 h-5 text-neutral-700" />
            <CardTitle>Change Password</CardTitle>
          </Div>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <Form onSubmit={handlePasswordSubmit} className="space-y-6">
            <Div className="space-y-2">
              <Label htmlFor="currentPassword" className="flex items-center gap-2">
                <UiIcon as={Lock} className="w-4 h-4" />
                Current Password
              </Label>
              <Div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                  placeholder="Enter your current password"
                  className={`h-11 pr-12 ${errors.currentPassword ? 'border-red-500' : ''}`}
                  disabled={saving}
                  required
                />
                <HtmlButton
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-0 bottom-0 justify-center"
                  disabled={saving}
                >
                  <UiIcon as={showCurrentPassword ? EyeOff : Eye} className="w-5 h-5 text-neutral-500" />
                </HtmlButton>
              </Div>
              {errors.currentPassword && <P className="text-sm text-red-600">{errors.currentPassword}</P>}
            </Div>

            <Div className="space-y-2">
              <Label htmlFor="newPassword" className="flex items-center gap-2">
                <UiIcon as={Lock} className="w-4 h-4" />
                New Password
              </Label>
              <Div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  placeholder="Enter your new password"
                  className={`h-11 pr-12 ${errors.newPassword ? 'border-red-500' : ''}`}
                  disabled={saving}
                  required
                />
                <HtmlButton
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-0 bottom-0 justify-center"
                  disabled={saving}
                >
                  <UiIcon as={showNewPassword ? EyeOff : Eye} className="w-5 h-5 text-neutral-500" />
                </HtmlButton>
              </Div>
              {errors.newPassword && <P className="text-sm text-red-600">{errors.newPassword}</P>}
              <P className="text-xs text-neutral-500">Password must be at least 6 characters long</P>
            </Div>

            <Div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <UiIcon as={Lock} className="w-4 h-4" />
                Confirm New Password
              </Label>
              <Div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your new password"
                  className={`h-11 pr-12 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  disabled={saving}
                  required
                />
                <HtmlButton
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-0 bottom-0 justify-center"
                  disabled={saving}
                >
                  <UiIcon as={showConfirmPassword ? EyeOff : Eye} className="w-5 h-5 text-neutral-500" />
                </HtmlButton>
              </Div>
              {errors.confirmPassword && <P className="text-sm text-red-600">{errors.confirmPassword}</P>}
            </Div>

            <Div className="flex justify-end pt-4 border-t border-neutral-200">
              <Button onClick={() => handlePasswordSubmit({ preventDefault() {} })} disabled={saving} className="bg-black text-white h-11 px-8">
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <UiIcon as={Save} className="w-4 h-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </Div>
          </Form>
        </CardContent>
      </Card>
    </ScrollDiv>
  );
}
