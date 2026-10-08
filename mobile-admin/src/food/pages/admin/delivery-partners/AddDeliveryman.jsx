/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/AddDeliveryman.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Upload, Eye, EyeOff, UserPlus } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { EMAIL_REGEX } from '../../../../lib/emailValidation';
import { pickDocument } from '../../../../lib/files';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  INPUT,
  INPUT_ERROR,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Form, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
export default function AddDeliveryman() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    deliverymanType: '',
    zone: '',
    vehicle: '',
    identityType: 'Passport',
    identityNumber: '',
    age: '',
    birthdate: '',
    phone: '+1',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [licenseFile, setLicenseFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tablet } = useLayoutWidth();
  const col = tablet ? 'flex-1 min-w-[260px]' : undefined;
  const rowClass = tablet ? 'flex-row flex-wrap gap-3' : 'gap-3';
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };
  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.deliverymanType) errors.deliverymanType = 'Deliveryman type is required';
    if (!formData.zone) errors.zone = 'Zone is required';
    if (!formData.vehicle) errors.vehicle = 'Vehicle is required';
    if (!formData.identityNumber.trim()) errors.identityNumber = 'Identity number is required';
    if (!formData.age || parseInt(formData.age) < 18) errors.age = 'Age must be at least 18';
    if (!formData.birthdate) errors.birthdate = 'Birthdate is required';
    if (!formData.phone || formData.phone.length < 10) errors.phone = 'Valid phone number is required';
    if (!formData.password || formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setShowSuccessDialog(true);
    handleReset();
  };
  const handlePickLicense = async () => {
    const file = await pickDocument();
    if (file) setLicenseFile(file);
  };
  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      deliverymanType: '',
      zone: '',
      vehicle: '',
      identityType: 'Passport',
      identityNumber: '',
      age: '',
      birthdate: '',
      phone: '+1',
      password: '',
      confirmPassword: '',
    });
  };
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={UserPlus}
        title="Add New Deliveryman"
        subtitle="Register a delivery partner and create their account"
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery partners' }, { label: 'Add deliveryman' }]}
      />

      <Form onSubmit={handleSubmit} className="gap-4">
        {/* 1. General info */}
        <Card>
          <SectionTitle>1. General info</SectionTitle>
          <Div className={rowClass}>
            <Field label="First Name" required error={formErrors.firstName} className={col}>
              <Input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Ex: Jhone"
                className={formErrors.firstName ? INPUT_ERROR : INPUT}
              />
            </Field>

            <Field label="Last Name" required error={formErrors.lastName} className={col}>
              <Input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Ex: Joe"
                className={formErrors.lastName ? INPUT_ERROR : INPUT}
              />
            </Field>

            <Field label="Email" required error={formErrors.email} className={col}>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Ex: ex@example.com"
                className={formErrors.email ? INPUT_ERROR : INPUT}
              />
            </Field>

            <Field label="Deliveryman Type" required error={formErrors.deliverymanType} className={col}>
              <Select value={formData.deliverymanType} onChange={(e) => handleInputChange('deliverymanType', e.target.value)} className={INPUT}>
                <Option value="">Delivery man type</Option>
                <Option value="full-time">Full Time</Option>
                <Option value="part-time">Part Time</Option>
              </Select>
            </Field>

            <Field label="Zone" required error={formErrors.zone} className={col}>
              <Select value={formData.zone} onChange={(e) => handleInputChange('zone', e.target.value)} className={INPUT}>
                <Option value="">Select Zone</Option>
                <Option value="asia">Asia</Option>
                <Option value="europe">Europe</Option>
              </Select>
            </Field>

            <Field label="Image" required hint="JPG, JPEG, PNG or GIF · max 2 MB · square (1:1)" className={col}>
              <Div className="border border-dashed border-slate-300 rounded-lg p-4 items-center gap-1">
                <UiIcon as={Upload} size={24} className="text-slate-400" />
                <P className="text-sm font-medium text-blue-600">Click to upload</P>
              </Div>
            </Field>
          </Div>
        </Card>

        {/* 2. Identification Information */}
        <Card>
          <SectionTitle>2. Identification Information</SectionTitle>
          <Div className={rowClass}>
            <Field label="Vehicle" required error={formErrors.vehicle} className={col}>
              <Select value={formData.vehicle} onChange={(e) => handleInputChange('vehicle', e.target.value)} className={INPUT}>
                <Option value="">Select Vehicle</Option>
                <Option value="car">Car</Option>
                <Option value="motorcycle">Motorcycle</Option>
              </Select>
            </Field>

            <Field label="Identity Type" required className={col}>
              <Select value={formData.identityType} onChange={(e) => handleInputChange('identityType', e.target.value)} className={INPUT}>
                <Option value="Passport">Passport</Option>
                <Option value="Driving License">Driving License</Option>
                <Option value="National ID">National ID</Option>
              </Select>
            </Field>

            <Field label="Identity Number" required error={formErrors.identityNumber} className={col}>
              <Input
                type="text"
                value={formData.identityNumber}
                onChange={(e) => handleInputChange('identityNumber', e.target.value)}
                placeholder="Ex: DH-23434-LS"
                className={formErrors.identityNumber ? INPUT_ERROR : INPUT}
              />
            </Field>

            <Field label="Identity Image" hint="PDF, DOC or JPG · max 2 MB" className={col}>
              <Div className="border border-dashed border-slate-300 rounded-lg p-4 items-center gap-1">
                <UiIcon as={Upload} size={24} className="text-slate-400" />
                <P className="text-sm font-medium text-blue-600">Select a file</P>
              </Div>
            </Field>
          </Div>
        </Card>

        {/* 3. Additional Data */}
        <Card>
          <SectionTitle>3. Additional Data</SectionTitle>
          <Div className={rowClass}>
            <Field label="Enter your age" required error={formErrors.age} className={col}>
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                placeholder="Enter Age"
                className={formErrors.age ? INPUT_ERROR : INPUT}
              />
            </Field>

            <Field label="Enter your birthdate" required error={formErrors.birthdate} className={col}>
              <Input
                type="date"
                value={formData.birthdate}
                onChange={(e) => handleInputChange('birthdate', e.target.value)}
                className={formErrors.birthdate ? INPUT_ERROR : INPUT}
              />
            </Field>

            <Field label="Driving license" hint={licenseFile ? 'File attached' : 'PDF, DOC or JPG'} className={col}>
              <Button type="button" onClick={handlePickLicense} className={BTN_SECONDARY}>
                <UiIcon as={Upload} size={16} className="text-slate-500" />
                <Span className={BTN_TEXT_SECONDARY} numberOfLines={1}>
                  {licenseFile ? licenseFile.name : 'Choose file'}
                </Span>
              </Button>
            </Field>
          </Div>
        </Card>

        {/* 4. Account info */}
        <Card>
          <SectionTitle>4. Account info</SectionTitle>
          <Div className={rowClass}>
            <Field label="Phone" required error={formErrors.phone} className={col}>
              <Div className="flex-row items-center gap-2">
                <Div className="h-11 px-3 rounded-lg border border-slate-300 bg-slate-50 justify-center">
                  <Span className="text-sm text-slate-700">+1</Span>
                </Div>
                <Input
                  type="tel"
                  value={formData.phone.replace('+1', '')}
                  onChange={(e) => handleInputChange('phone', '+1' + e.target.value)}
                  placeholder="Enter phone number"
                  className={`${formErrors.phone ? INPUT_ERROR : INPUT} flex-1`}
                />
              </Div>
            </Field>

            <Field label="Password" required error={formErrors.password} className={col}>
              <Div className="flex-row items-center gap-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Ex: 8+ Character"
                  className={`${formErrors.password ? INPUT_ERROR : INPUT} flex-1`}
                />
                <Button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center"
                >
                  <UiIcon as={showPassword ? EyeOff : Eye} size={16} className="text-slate-500" />
                </Button>
              </Div>
            </Field>

            <Field label="Confirm Password" required error={formErrors.confirmPassword} className={col}>
              <Div className="flex-row items-center gap-2">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Ex: 8+ Character"
                  className={`${formErrors.confirmPassword ? INPUT_ERROR : INPUT} flex-1`}
                />
                <Button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center"
                >
                  <UiIcon as={showConfirmPassword ? EyeOff : Eye} size={16} className="text-slate-500" />
                </Button>
              </Div>
            </Field>
          </Div>
        </Card>

        <Div className="flex-row flex-wrap items-center justify-end gap-2">
          <Button type="button" onClick={handleReset} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
          <Button type="submit" disabled={isSubmitting} className={`${BTN_PRIMARY} ${isSubmitting ? 'opacity-50' : ''}`}>
            <Span className={BTN_TEXT_PRIMARY}>{isSubmitting ? 'Submitting…' : 'Submit'}</Span>
          </Button>
        </Div>
      </Form>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md bg-white p-5 gap-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-semibold text-slate-900">Deliveryman added</DialogTitle>
          </DialogHeader>
          <P className="text-sm text-slate-700">Deliveryman added successfully!</P>
          <DialogFooter className="flex-row justify-end">
            <Button onClick={() => setShowSuccessDialog(false)} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>OK</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
