/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/UserCreate.jsx (tools/port.js first pass). */
import React, { useCallback, useState } from 'react';
import { useNavigate } from '../../../../../lib/webRouter';
import { ArrowLeft, CheckCircle2, ChevronRight, ImagePlus, Loader2, Lock, Mail, Phone, Save, User, Users } from 'lucide-react-native';
import { toast } from '../../../../../lib/notify';
import { useImageUpload } from '../../../../shared/hooks/useImageUpload';
import { adminService } from '../../services/adminService';
import { Button, Div, Form, H1, H3, Img, Input, Label, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
const initialFormData = {
  name: '',
  gender: '',
  mobile: '',
  email: '',
  password: '',
  confirmPassword: '',
  profileImage: '',
};
const inputClass =
  'admin-user-field w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors';
const labelClass = 'block text-xs font-semibold text-black mb-1.5';
const UserCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const handleUploadSuccess = useCallback((url) => {
    setFormData((current) => ({
      ...current,
      profileImage: url,
    }));
  }, []);
  const {
    uploading: imageUploading,
    preview: imagePreview,
    handleFileChange,
  } = useImageUpload({
    folder: 'user-profiles',
    onSuccess: handleUploadSuccess,
  });
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
    setError('');
  };
  const validate = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.gender) return 'Select gender';
    if (!formData.mobile.trim()) return 'Mobile number is required';
    if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) return 'Enter a valid 10-digit mobile number';
    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return 'Enter a valid email address';
    if (formData.password.length < 5) return 'Password must be at least 5 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return '';
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const payload = {
        name: formData.name.trim(),
        gender: formData.gender,
        mobile: formData.mobile.replace(/\D/g, ''),
        phone: formData.mobile.replace(/\D/g, ''),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        profileImage: formData.profileImage,
        active: true,
      };
      const response = await adminService.createUser(payload);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create user');
      }
      setSuccess(true);
      toast.success('Passenger created successfully');
      setTimeout(() => navigate('/taxi/admin/users'), 900);
    } catch (submitError) {
      setError(submitError.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <Div className="mb-6">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Users</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Create User</Span>
        </Div>

        <Div className="flex items-center justify-between">
          <H1 className="text-xl text-gray-900 font-bold">Add User</H1>
          <Button
            type="button"
            onClick={() => navigate('/taxi/admin/users')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        </Div>
      </Div>

      <Form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Div className="lg:col-span-2">
          <Div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <Div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <Div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center text-gray-900 border border-yellow-100">
                <UiIcon as={User} size={18} />
              </Div>
              <Div>
                <H3 className="text-sm text-gray-900 font-bold">User Details</H3>
                <P className="text-xs text-gray-400">Customer identity and login information</P>
              </Div>
            </Div>

            <Div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Div>
                <Label className={labelClass}>
                  <UiIcon as={User} size={12} className="inline mr-1 text-gray-400" />
                  Name *
                </Label>
                <Input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Enter name" className={inputClass} />
              </Div>

              <Div>
                <Label className={labelClass}>
                  <UiIcon as={Users} size={12} className="inline mr-1 text-gray-400" />
                  Select Gender *
                </Label>
                <Select name="gender" required value={formData.gender} onChange={handleChange} className={inputClass}>
                  <Option value="">Choose gender</Option>
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Div>

              <Div>
                <Label className={labelClass}>
                  <UiIcon as={Phone} size={12} className="inline mr-1 text-gray-400" />
                  Mobile *
                </Label>
                <Input
                  type="tel"
                  name="mobile"
                  required
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  className={inputClass}
                />
              </Div>

              <Div>
                <Label className={labelClass}>
                  <UiIcon as={Mail} size={12} className="inline mr-1 text-gray-400" />
                  Email *
                </Label>
                <Input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="Enter email" className={inputClass} />
              </Div>

              <Div>
                <Label className={labelClass}>
                  <UiIcon as={Lock} size={12} className="inline mr-1 text-gray-400" />
                  Password *
                </Label>
                <Input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className={inputClass}
                />
              </Div>

              <Div>
                <Label className={labelClass}>
                  <UiIcon as={CheckCircle2} size={12} className="inline mr-1 text-gray-400" />
                  Confirm Password *
                </Label>
                <Input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className={inputClass}
                />
              </Div>
            </Div>
          </Div>
        </Div>

        <Div className="space-y-6">
          <Div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <Div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <Div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center text-gray-900 border border-yellow-100">
                <UiIcon as={ImagePlus} size={18} />
              </Div>
              <Div>
                <H3 className="text-sm text-gray-900 font-bold">Profile Picture</H3>
                <P className="text-xs text-gray-400">Optional user photo</P>
              </Div>
            </Div>

            <Div onClick={imageUploading ? undefined : handleFileChange} className="group relative block cursor-pointer">
              <Div className="flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-200 bg-gray-50 transition-colors group-hover:border-yellow-400 group-hover:bg-yellow-50">
                {imagePreview || formData.profileImage ? (
                  <Img src={imagePreview || formData.profileImage} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <Div className="flex flex-col items-center text-gray-400">
                    <UiIcon as={ImagePlus} size={34} strokeWidth={1.5} className="mb-3" />
                    <P className="text-xs font-bold">Upload image</P>
                  </Div>
                )}
                {imageUploading && (
                  <Div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <UiIcon as={Loader2} className="animate-spin text-yellow-500" size={28} />
                  </Div>
                )}
              </Div>
            </Div>

            <P className="mt-4 text-center text-xs text-gray-400">Supported formats: JPG, PNG, WEBP</P>
          </Div>

          <Div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 shadow-sm">
            <Button
              type="submit"
              disabled={isSubmitting || imageUploading || success}
              className="w-full py-3 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <UiIcon as={Loader2} className="animate-spin" size={16} />
              ) : success ? (
                <UiIcon as={CheckCircle2} size={16} />
              ) : (
                <UiIcon as={Save} size={16} />
              )}
              {success ? 'User Created' : isSubmitting ? 'Saving...' : 'Create User'}
            </Button>

            <Button
              type="button"
              onClick={() => navigate('/taxi/admin/users')}
              className="w-full py-3 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Button>

            {error && (
              <Div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3">
                <P className="text-sm font-semibold text-rose-600">{error}</P>
              </Div>
            )}
          </Div>
        </Div>
      </Form>
    </ScrollDiv>
  );
};
export default UserCreate;
