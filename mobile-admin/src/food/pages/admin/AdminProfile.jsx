/* Ported from Frontend/src/modules/Food/pages/admin/AdminProfile.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { adminAPI, uploadAPI } from '../../../api/food';
import { objectUrl, pickImage } from '../../../lib/files';
import { toast } from '../../../lib/notify';
import { User, Save, Upload, X, Pencil, Eye, EyeOff } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { Button as HtmlButton, Div, Form, Img, Input, P, Span, Icon as UiIcon } from '../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatusBadge,
  Field,
  LoadingState,
  ErrorState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../admin/ui';
import { window } from '../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function AdminProfile() {
  const { tablet } = useLayoutWidth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    profileImage: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  useEffect(() => {
    fetchProfile();
  }, []);
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAdminProfile();
      const adminData = response?.data?.data?.admin || response?.data?.admin;
      if (adminData) {
        setProfile(adminData);
        setFormData({
          name: adminData.name || '',
          email: adminData.email || '',
          phone: adminData.phone || '',
          profileImage: adminData.profileImage || '',
        });
        return;
      }
      throw new Error('No admin data in response');
    } catch (error) {
      debugError('Error fetching admin profile:', error);
      // Fallback: show data from localStorage (login) so page still shows real name/email
      try {
        const adminUserStr = localStorage.getItem('admin_user');
        if (adminUserStr) {
          const localAdmin = JSON.parse(adminUserStr);
          const fallback = {
            name: localAdmin.name || 'Admin User',
            email: localAdmin.email || '',
            phone: localAdmin.phone || '',
            profileImage: localAdmin.profileImage || '',
            role: localAdmin.role || 'admin',
            isActive: localAdmin.isActive !== false,
          };
          setProfile(fallback);
          setFormData({
            name: fallback.name || '',
            email: fallback.email || '',
            phone: fallback.phone || '',
            profileImage: fallback.profileImage || '',
          });
          toast.info('Showing saved profile. Backend disconnected — updates may not persist.');
          return;
        }
      } catch (_) {}
      toast.error(error?.response?.data?.message || 'Failed to load profile');
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
  // The web's hidden <input type="file">: the image picker, with the same checks.
  const handleFileSelect = async () => {
    if (!isEditMode || saving || uploading) return;
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

    // Set file and create preview
    setSelectedFile(file);
    setImagePreview(objectUrl(file));
  };
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
  };
  const resetPasswordFields = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowPasswords({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const currentPassword = String(passwordData.currentPassword || '').trim();
      const newPassword = String(passwordData.newPassword || '').trim();
      const confirmPassword = String(passwordData.confirmPassword || '').trim();
      const wantsPasswordChange = !!currentPassword || !!newPassword || !!confirmPassword;
      if (wantsPasswordChange) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          toast.error('Please fill Old, New, and Confirm password fields.');
          return;
        }
        if (newPassword.length < 6) {
          toast.error('New password must be at least 6 characters.');
          return;
        }
        if (newPassword !== confirmPassword) {
          toast.error('New password and Confirm password do not match.');
          return;
        }
      }
      setSaving(true);
      let profileImageUrl = formData.profileImage;

      // Upload image if a new file is selected
      if (selectedFile) {
        try {
          setUploading(true);
          const uploadResponse = await uploadAPI.uploadMedia(selectedFile, {
            folder: 'admin-profiles',
          });
          profileImageUrl = uploadResponse?.data?.data?.url || uploadResponse?.data?.url;
          if (!profileImageUrl) {
            throw new Error('Failed to get uploaded image URL');
          }
        } catch (uploadError) {
          debugError('Error uploading image:', uploadError);
          toast.error(uploadError?.response?.data?.message || 'Failed to upload image');
          setUploading(false);
          setSaving(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      // Update profile with uploaded image URL
      const response = await adminAPI.updateAdminProfile({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        profileImage: profileImageUrl || undefined,
      });
      const updatedAdmin = response?.data?.data?.user ?? response?.data?.data?.admin ?? response?.data?.admin;
      if (updatedAdmin) {
        setProfile(updatedAdmin);
        setFormData({
          name: updatedAdmin.name || '',
          email: updatedAdmin.email || '',
          phone: updatedAdmin.phone || '',
          profileImage: updatedAdmin.profileImage || '',
        });
        // Clear selected file and preview
        setSelectedFile(null);
        setImagePreview(null);
        // Update localStorage with new admin data
        localStorage.setItem('admin_user', JSON.stringify(updatedAdmin));
        // Dispatch event to notify other components
        window.dispatchEvent({ type: 'adminAuthChanged' });
        if (wantsPasswordChange) {
          try {
            await adminAPI.changePassword(currentPassword, newPassword);
            resetPasswordFields();
            toast.success('Profile and password updated successfully');
            setIsEditMode(false);
          } catch (passwordError) {
            debugError('Error updating admin password:', passwordError);
            toast.error(passwordError?.response?.data?.message || 'Profile updated, but password change failed');
            return;
          }
        } else {
          resetPasswordFields();
          toast.success('Profile updated successfully');
          setIsEditMode(false);
        }
      }
    } catch (error) {
      debugError('Error updating profile:', error);
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
  const handleStartEditing = () => {
    setFormData({
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      profileImage: profile?.profileImage || '',
    });
    setSelectedFile(null);
    setImagePreview(null);
    resetPasswordFields();
    setIsEditMode(true);
  };
  const handleCancelEditing = () => {
    setFormData({
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      profileImage: profile?.profileImage || '',
    });
    setSelectedFile(null);
    setImagePreview(null);
    resetPasswordFields();
    setIsEditMode(false);
  };
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        <PageHeader title="Profile" subtitle="Manage your admin profile information" breadcrumb={[{ label: 'Food' }, { label: 'Profile' }]} />
        <LoadingState label="Loading your profile…" />
      </AdminPage>
    );
  }
  if (!profile) {
    return (
      <AdminPage maxWidth={720}>
        <PageHeader title="Profile" subtitle="Manage your admin profile information" breadcrumb={[{ label: 'Food' }, { label: 'Profile' }]} />
        <ErrorState title="Failed to load profile data" message="Your admin profile could not be fetched. Check the connection and try again." onRetry={fetchProfile} />
      </AdminPage>
    );
  }

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Mask email for display
  const maskEmail = (email) => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return email;
    const masked = localPart[0] + '*'.repeat(Math.min(localPart.length - 1, 5)) + '@' + domain;
    return masked;
  };
  const fieldsDisabled = !isEditMode || saving || uploading;
  const inputClass = `${INPUT} ${fieldsDisabled ? 'bg-slate-50 text-slate-500' : ''}`;
  const passwordRow = (id, label, value, onChangeText, visibleKey) => (
    <Field label={label} className={tablet ? 'flex-1 min-w-[260px]' : null}>
      <Div className="relative">
        <Input
          nativeID={id}
          type={showPasswords[visibleKey] ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={label === 'Old Password' ? 'Enter old password' : label === 'New Password' ? 'Enter new password' : 'Confirm new password'}
          disabled={fieldsDisabled}
          className={`${inputClass} pr-12`}
        />
        <HtmlButton
          type="button"
          onClick={() =>
            setShowPasswords((prev) => ({
              ...prev,
              [visibleKey]: !prev[visibleKey],
            }))
          }
          disabled={fieldsDisabled}
          className="absolute right-0 top-0 bottom-0 w-11 items-center justify-center"
          accessibilityLabel={showPasswords[visibleKey] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <UiIcon as={showPasswords[visibleKey] ? EyeOff : Eye} size={18} className="text-slate-500" />
        </HtmlButton>
      </Div>
    </Field>
  );
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={User}
        title="Profile"
        subtitle={isEditMode ? 'Update your profile details below' : 'View and manage your admin profile'}
        breadcrumb={[{ label: 'Food' }, { label: 'Profile' }]}
        actions={
          !isEditMode ? (
            <HtmlButton type="button" onClick={handleStartEditing} className={BTN_PRIMARY}>
              <UiIcon as={Pencil} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Edit profile</Span>
            </HtmlButton>
          ) : (
            <>
              <HtmlButton
                type="button"
                onClick={() => handleSubmit({ preventDefault() {} })}
                disabled={saving || uploading}
                className={BTN_PRIMARY}
                style={saving || uploading ? { opacity: 0.7 } : null}
              >
                {saving || uploading ? <ActivityIndicator size="small" color="#fff" /> : <UiIcon as={Save} size={16} className="text-white" />}
                <Span className={BTN_TEXT_PRIMARY}>{uploading ? 'Uploading image…' : saving ? 'Saving…' : 'Save changes'}</Span>
              </HtmlButton>
              <HtmlButton type="button" onClick={handleCancelEditing} disabled={saving || uploading} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </HtmlButton>
            </>
          )
        }
      />

      <Card className="mb-4">
        <Div className="flex-row items-center gap-4">
          <Div className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center overflow-hidden border border-slate-200 shrink-0">
            {profile.profileImage ? (
              <Img src={profile.profileImage} alt={profile.name} className="w-full h-full" contentFit="cover" />
            ) : (
              <Span className="text-xl font-semibold text-slate-600">{getInitials(profile.name)}</Span>
            )}
          </Div>
          <Div className="flex-1 min-w-0 gap-0.5">
            <P className="text-base font-semibold text-slate-900" numberOfLines={1}>
              {profile.name}
            </P>
            <P className="text-sm text-slate-500" numberOfLines={1}>
              {maskEmail(profile.email)}
            </P>
            <Div className="flex-row items-center gap-2 mt-1">
              <Span className="text-xs text-slate-500 capitalize">{profile.role || 'admin'}</Span>
              <StatusBadge status={profile.isActive !== false ? 'active' : 'inactive'} label={profile.isActive !== false ? 'Active' : 'Inactive'} />
            </Div>
          </Div>
        </Div>
      </Card>

      <Form nativeID="admin-profile-form" onSubmit={handleSubmit}>
        <Card className="mb-4">
          <SectionTitle>Account details</SectionTitle>
          <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
            <Field label="Full Name" required className={tablet ? 'flex-1 min-w-[260px]' : null}>
              <Input
                nativeID="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={fieldsDisabled}
                className={inputClass}
              />
            </Field>
            <Field label="Email Address" required hint="Email can be changed" className={tablet ? 'flex-1 min-w-[260px]' : null}>
              <Input
                nativeID="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={fieldsDisabled}
                className={inputClass}
              />
            </Field>
            <Field label="Phone Number" hint="Optional" className={tablet ? 'flex-1 min-w-[260px]' : null}>
              <Input
                nativeID="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number (optional)"
                disabled={fieldsDisabled}
                className={inputClass}
              />
            </Field>
          </Div>
        </Card>

        <Card className="mb-4">
          <SectionTitle>Profile image</SectionTitle>
          {imagePreview || profile.profileImage ? (
            <Div className="relative w-40 h-40 border border-slate-200 rounded-xl overflow-hidden">
              <Img src={imagePreview || profile.profileImage} alt="Profile" className="w-full h-full" contentFit="cover" />
              {isEditMode && (
                <>
                  {/* Hover reveals "Change Image" on the web; on touch it is always shown. */}
                  <Div className="absolute inset-0 bg-black/40 items-center justify-center" onClick={handleFileSelect} accessibilityRole="button" accessibilityLabel="Change image">
                    <Span className="bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold">Change image</Span>
                  </Div>
                  <HtmlButton type="button" onClick={handleRemoveImage} className="absolute top-1 right-1 w-11 h-11 items-center justify-center" accessibilityLabel="Remove image">
                    <Div className="w-7 h-7 rounded-full bg-red-600 items-center justify-center">
                      <UiIcon as={X} size={14} className="text-white" />
                    </Div>
                  </HtmlButton>
                </>
              )}
            </Div>
          ) : (
            <Div
              onClick={isEditMode && !saving && !uploading ? handleFileSelect : undefined}
              accessibilityRole={isEditMode ? 'button' : undefined}
              accessibilityLabel={isEditMode ? 'Upload a profile image' : undefined}
              className={`items-center justify-center w-40 h-40 border border-dashed border-slate-300 rounded-xl bg-slate-50 ${isEditMode ? '' : 'opacity-70'}`}
            >
              <UiIcon as={Upload} size={28} className="text-slate-400 mb-2" />
              <P className="text-sm text-slate-600">{isEditMode ? 'Tap to upload' : 'No profile image'}</P>
              <P className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP (max 5MB)</P>
            </Div>
          )}
          {isEditMode && imagePreview ? <P className="text-xs text-slate-500 mt-2">New image selected. Tap &quot;Save changes&quot; to upload.</P> : null}
          {isEditMode && profile.profileImage && !imagePreview ? <P className="text-xs text-slate-500 mt-2">Tap the image to change it</P> : null}
        </Card>

        <Card className="mb-4">
          <SectionTitle>Change password</SectionTitle>
          <P className="text-sm text-slate-500 -mt-2 mb-3">Leave these empty to keep your current password.</P>
          <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
            {passwordRow('currentPassword', 'Old Password', passwordData.currentPassword, (v) => setPasswordData((prev) => ({ ...prev, currentPassword: v })), 'currentPassword')}
            {passwordRow('newPassword', 'New Password', passwordData.newPassword, (v) => setPasswordData((prev) => ({ ...prev, newPassword: v })), 'newPassword')}
            {passwordRow('confirmPassword', 'Confirm Password', passwordData.confirmPassword, (v) => setPasswordData((prev) => ({ ...prev, confirmPassword: v })), 'confirmPassword')}
          </Div>
        </Card>

        <Card>
          <SectionTitle>Account activity</SectionTitle>
          <Div className="gap-2.5">
            <Div className="flex-row items-center justify-between gap-3">
              <Span className="text-sm text-slate-500">Account status</Span>
              <StatusBadge status={profile.isActive !== false ? 'active' : 'inactive'} label={profile.isActive !== false ? 'Active' : 'Inactive'} />
            </Div>
            {profile.lastLogin ? (
              <Div className="flex-row items-start justify-between gap-3">
                <Span className="text-sm text-slate-500">Last login</Span>
                <Span className="flex-1 text-sm text-slate-900 text-right">{new Date(profile.lastLogin).toLocaleString()}</Span>
              </Div>
            ) : null}
            {profile.loginCount !== undefined ? (
              <Div className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-500">Total logins</Span>
                <Span className="text-sm text-slate-900">{profile.loginCount}</Span>
              </Div>
            ) : null}
            {profile.createdAt ? (
              <Div className="flex-row items-start justify-between gap-3">
                <Span className="text-sm text-slate-500">Member since</Span>
                <Span className="flex-1 text-sm text-slate-900 text-right">{new Date(profile.createdAt).toLocaleDateString()}</Span>
              </Div>
            ) : null}
          </Div>
        </Card>
      </Form>
    </AdminPage>
  );
}
