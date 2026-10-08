/* Ported from Frontend/src/modules/Food/pages/admin/AdminProfile.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { adminAPI, uploadAPI } from '../../../api/food';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '../../../components/shadcn';
import { objectUrl, pickImage } from '../../../lib/files';
import { toast } from '../../../lib/notify';
import { User, Mail, Phone, Save, Upload, X, Pencil, Eye, EyeOff } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { Button as HtmlButton, Div, Form, H1, Img, P, ScrollDiv, Span, Icon as UiIcon } from '../../../components/web';
import { window } from '../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function AdminProfile() {
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
      <Div className="flex items-center justify-center h-64">
        <ActivityIndicator size="large" color="#525252" />
      </Div>
    );
  }
  if (!profile) {
    return (
      <ScrollDiv className="flex-1 p-6">
        <Card>
          <CardContent className="pt-6">
            <P className="text-neutral-600">Failed to load profile data</P>
          </CardContent>
        </Card>
      </ScrollDiv>
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
  return (
    <ScrollDiv className="flex-1 p-6 space-y-6">
      <Div>
        <H1 className="text-3xl font-bold text-neutral-900">Profile</H1>
        <P className="text-neutral-600 mt-1">Manage your admin profile information</P>
      </Div>

      <Card>
        <CardHeader>
          <Div className="flex flex-row flex-wrap items-center justify-between gap-4 w-full">
            <Div className="flex-1">
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>{isEditMode ? 'Update your profile details below' : 'View your admin profile details'}</CardDescription>
            </Div>
            {!isEditMode ? (
              <Button type="button" onClick={handleStartEditing} className="bg-black text-white hover:bg-neutral-900">
                <UiIcon as={Pencil} className="w-4 h-4 mr-2" />
                Edit
              </Button>
            ) : (
              <Div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={handleCancelEditing} disabled={saving || uploading} className="h-10 px-6">
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit({ preventDefault() {} })}
                  disabled={saving || uploading}
                  className="bg-black text-white hover:bg-neutral-900 h-10 px-6"
                >
                  {uploading ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                      Uploading image...
                    </>
                  ) : saving ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <UiIcon as={Save} className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </Div>
            )}
          </Div>
        </CardHeader>
        <CardContent>
          <Form nativeID="admin-profile-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Section */}
            <Div className="flex items-center gap-6 pb-6 border-b border-neutral-200">
              <Div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden border-2 border-neutral-300">
                {profile.profileImage ? (
                  <Img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <Span className="text-2xl font-semibold text-neutral-600">{getInitials(profile.name)}</Span>
                )}
              </Div>
              <Div className="flex-1">
                <P className="text-sm font-medium text-neutral-900">{profile.name}</P>
                <P className="text-xs text-neutral-500 mt-1">{maskEmail(profile.email)}</P>
                <P className="text-xs text-neutral-500 mt-1">
                  Role: <Span className="font-medium capitalize">{profile.role || 'admin'}</Span>
                </P>
              </Div>
            </Div>

            {/* Form Fields */}
            <Div className="grid gap-6 md:grid-cols-2">
              <Div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <UiIcon as={User} className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  required
                  disabled={!isEditMode || saving || uploading}
                  className={`h-11 ${!isEditMode ? 'bg-neutral-50 cursor-not-allowed' : ''}`}
                />
              </Div>

              <Div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <UiIcon as={Mail} className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email address"
                  required
                  disabled={!isEditMode || saving || uploading}
                  className={`h-11 ${!isEditMode ? 'bg-neutral-50 cursor-not-allowed' : ''}`}
                />
                <P className="text-xs text-neutral-500">Email can be changed</P>
              </Div>

              <Div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <UiIcon as={Phone} className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number (optional)"
                  disabled={!isEditMode || saving || uploading}
                  className={`h-11 ${!isEditMode ? 'bg-neutral-50 cursor-not-allowed' : ''}`}
                />
              </Div>

              <Div className="space-y-2 md:col-span-2">
                <Label htmlFor="profileImage">Profile Image</Label>
                {imagePreview || profile.profileImage ? (
                  <Div className="relative w-48 h-48 border-2 border-neutral-300 rounded-lg overflow-hidden">
                    <Img src={imagePreview || profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    {isEditMode && (
                      <>
                        {/* Hover reveals "Change Image" on the web; on touch it is always shown. */}
                        <Div className="absolute inset-0 bg-black/40 flex items-center justify-center" onClick={handleFileSelect}>
                          <Span className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium overflow-hidden">Change Image</Span>
                        </Div>
                        <HtmlButton
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full shadow-lg z-10"
                          accessibilityLabel="Remove image"
                        >
                          <UiIcon as={X} className="w-4 h-4 text-white" />
                        </HtmlButton>
                      </>
                    )}
                  </Div>
                ) : (
                  <Div
                    onClick={isEditMode && !saving && !uploading ? handleFileSelect : undefined}
                    className={`flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-neutral-300 rounded-lg bg-neutral-50 ${isEditMode ? '' : 'opacity-70'}`}
                  >
                    <UiIcon as={Upload} className="w-8 h-8 text-neutral-400 mb-2" />
                    <P className="text-sm text-neutral-600">{isEditMode ? 'Click to upload' : 'No profile image'}</P>
                    <P className="text-xs text-neutral-500 mt-1">PNG, JPG, WEBP (max 5MB)</P>
                  </Div>
                )}
                {isEditMode && imagePreview && <P className="text-xs text-green-600 mt-1">New image selected. Click &quot;Save Changes&quot; to upload.</P>}
                {isEditMode && profile.profileImage && !imagePreview && <P className="text-xs text-neutral-500 mt-1">Tap the image to change it</P>}
              </Div>

              <Div className="space-y-2">
                <Label htmlFor="currentPassword">Old Password</Label>
                <Div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.currentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter old password"
                    disabled={!isEditMode || saving || uploading}
                    className={`h-11 pr-11 ${!isEditMode ? 'bg-neutral-50 cursor-not-allowed' : ''}`}
                  />
                  <HtmlButton
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        currentPassword: !prev.currentPassword,
                      }))
                    }
                    disabled={!isEditMode || saving || uploading}
                    className="absolute right-3 top-0 bottom-0 justify-center disabled:opacity-50"
                    accessibilityLabel={showPasswords.currentPassword ? 'Hide old password' : 'Show old password'}
                  >
                    {showPasswords.currentPassword ? (
                      <UiIcon as={EyeOff} className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <UiIcon as={Eye} className="w-4 h-4 text-neutral-500" />
                    )}
                  </HtmlButton>
                </Div>
              </Div>

              <Div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.newPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter new password"
                    disabled={!isEditMode || saving || uploading}
                    className={`h-11 pr-11 ${!isEditMode ? 'bg-neutral-50 cursor-not-allowed' : ''}`}
                  />
                  <HtmlButton
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        newPassword: !prev.newPassword,
                      }))
                    }
                    disabled={!isEditMode || saving || uploading}
                    className="absolute right-3 top-0 bottom-0 justify-center disabled:opacity-50"
                    accessibilityLabel={showPasswords.newPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showPasswords.newPassword ? (
                      <UiIcon as={EyeOff} className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <UiIcon as={Eye} className="w-4 h-4 text-neutral-500" />
                    )}
                  </HtmlButton>
                </Div>
              </Div>

              <Div className="space-y-2 md:col-span-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Confirm new password"
                    disabled={!isEditMode || saving || uploading}
                    className={`h-11 pr-11 ${!isEditMode ? 'bg-neutral-50 cursor-not-allowed' : ''}`}
                  />
                  <HtmlButton
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        confirmPassword: !prev.confirmPassword,
                      }))
                    }
                    disabled={!isEditMode || saving || uploading}
                    className="absolute right-3 top-0 bottom-0 justify-center disabled:opacity-50"
                    accessibilityLabel={showPasswords.confirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showPasswords.confirmPassword ? (
                      <UiIcon as={EyeOff} className="w-4 h-4 text-neutral-500" />
                    ) : (
                      <UiIcon as={Eye} className="w-4 h-4 text-neutral-500" />
                    )}
                  </HtmlButton>
                </Div>
              </Div>
            </Div>

            {/* Additional Info */}
            <Div className="pt-4 border-t border-neutral-200 space-y-2">
              <Div className="flex items-center justify-between text-sm">
                <Span className="text-neutral-600">Account Status</Span>
                <Span className={`font-medium ${profile.isActive !== false ? 'text-green-600' : 'text-red-600'}`}>
                  {profile.isActive !== false ? 'Active' : 'Inactive'}
                </Span>
              </Div>
              {profile.lastLogin && (
                <Div className="flex items-center justify-between text-sm">
                  <Span className="text-neutral-600">Last Login</Span>
                  <Span className="text-neutral-900">{new Date(profile.lastLogin).toLocaleString()}</Span>
                </Div>
              )}
              {profile.loginCount !== undefined && (
                <Div className="flex items-center justify-between text-sm">
                  <Span className="text-neutral-600">Total Logins</Span>
                  <Span className="text-neutral-900">{profile.loginCount}</Span>
                </Div>
              )}
              {profile.createdAt && (
                <Div className="flex items-center justify-between text-sm">
                  <Span className="text-neutral-600">Member Since</Span>
                  <Span className="text-neutral-900">{new Date(profile.createdAt).toLocaleDateString()}</Span>
                </Div>
              )}
            </Div>
          </Form>
        </CardContent>
      </Card>
    </ScrollDiv>
  );
}
