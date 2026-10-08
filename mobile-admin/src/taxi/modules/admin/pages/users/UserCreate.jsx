/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/UserCreate.jsx (tools/port.js first pass). */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { ArrowLeft, CheckCircle2, ImagePlus, Save, UserPlus } from 'lucide-react-native';
import { toast } from '../../../../../lib/notify';
import { useImageUpload } from '../../../../shared/hooks/useImageUpload';
import { adminService } from '../../services/adminService';
import { Button, Div, Form, Img, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';

const initialFormData = {
  name: '',
  gender: '',
  mobile: '',
  email: '',
  password: '',
  confirmPassword: '',
  profileImage: '',
};
const UserCreate = () => {
  const navigate = useNavigate();
  const { tablet } = useLayoutWidth();
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
  const cols = tablet ? 2 : 1;
  const saveDisabled = isSubmitting || imageUploading || success;
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={UserPlus}
        title="Add User"
        subtitle="Create a passenger account and its login"
        breadcrumb={[{ label: 'Users' }, { label: 'Create User' }]}
        actions={
          <Button type="button" onClick={() => navigate('/taxi/admin/users')} className={BTN_SECONDARY} accessibilityLabel="Back to users">
            <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Back</Span>
          </Button>
        }
      />

      <Form onSubmit={handleSubmit} className="gap-4">
        <Card>
          <SectionTitle>User Details</SectionTitle>
          <Div className={`grid grid-cols-${cols} gap-3`}>
            <Field label="Name" required>
              <Input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Enter name" className={INPUT} />
            </Field>

            <Field label="Select Gender" required>
              <Select name="gender" required value={formData.gender} onChange={handleChange} className={INPUT} placeholder="Choose gender">
                <Option value="">Choose gender</Option>
                <Option value="male">Male</Option>
                <Option value="female">Female</Option>
                <Option value="other">Other</Option>
              </Select>
            </Field>

            <Field label="Mobile" required hint="10 digits, no country code">
              <Input type="tel" name="mobile" required value={formData.mobile} onChange={handleChange} placeholder="Enter mobile number" className={INPUT} />
            </Field>

            <Field label="Email" required>
              <Input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="Enter email" className={INPUT} />
            </Field>

            <Field label="Password" required hint="At least 5 characters">
              <Input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="Enter password" className={INPUT} />
            </Field>

            <Field label="Confirm Password" required>
              <Input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" className={INPUT} />
            </Field>
          </Div>
        </Card>

        <Card>
          <SectionTitle>Profile Picture</SectionTitle>
          <Button
            type="button"
            onClick={imageUploading ? undefined : handleFileChange}
            disabled={imageUploading}
            accessibilityLabel="Upload a profile picture"
            className="h-40 rounded-lg border border-dashed border-slate-300 bg-slate-50 items-center justify-center overflow-hidden"
          >
            {imagePreview || formData.profileImage ? (
              <Img src={imagePreview || formData.profileImage} alt="Profile preview" className="w-full h-40" contentFit="cover" />
            ) : imageUploading ? (
              <ActivityIndicator size="small" color="#155DFC" />
            ) : (
              <Div className="items-center gap-2">
                <UiIcon as={ImagePlus} size={28} className="text-slate-400" />
                <Span className="text-sm font-medium text-slate-500">Upload image</Span>
              </Div>
            )}
          </Button>
          <Span className="text-xs text-slate-500 mt-2">Optional. JPG, PNG or WEBP.</Span>
        </Card>

        {error ? (
          <Card className="border-red-200 bg-red-50">
            <Span className="text-sm font-medium text-red-600">{error}</Span>
          </Card>
        ) : null}

        <Div className="flex-row gap-2">
          <Button type="submit" disabled={saveDisabled} className={`${BTN_PRIMARY} flex-1 ${saveDisabled ? 'opacity-50' : ''}`}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : success ? (
              <UiIcon as={CheckCircle2} size={16} className="text-white" />
            ) : (
              <UiIcon as={Save} size={16} className="text-white" />
            )}
            <Span className={BTN_TEXT_PRIMARY}>{success ? 'User Created' : isSubmitting ? 'Saving…' : 'Create User'}</Span>
          </Button>
          <Button type="button" onClick={() => navigate('/taxi/admin/users')} className={`${BTN_SECONDARY} flex-1`}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
        </Div>
      </Form>
    </AdminPage>
  );
};
export default UserCreate;
