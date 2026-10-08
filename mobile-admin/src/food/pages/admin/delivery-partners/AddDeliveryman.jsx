/* Ported from Frontend/src/modules/Food/pages/admin/delivery-partners/AddDeliveryman.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Upload, Calendar, Eye, EyeOff, Settings } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/shadcn';
import { EMAIL_REGEX } from '../../../../lib/emailValidation';
import { pickDocument } from '../../../../lib/files';
import { Button, Div, Form, H1, H2, Input, Label, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
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
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-5xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
          {/* Settings Icon */}
          <Button className="absolute top-6 right-6 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
            <UiIcon as={Settings} className="w-5 h-5 text-slate-600" />
          </Button>

          <H1 className="text-2xl font-bold text-slate-900 mb-6">Add New Deliveryman</H1>

          <Form onSubmit={handleSubmit}>
            {/* 1. General info */}
            <Div className="mb-8">
              <H2 className="text-lg font-semibold text-slate-900 mb-4">1. General info</H2>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    First Name <Span className="text-red-500">*</Span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Ex: Jhone"
                    className={`w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${formErrors.firstName ? 'border-red-500' : 'border-slate-300'}`}
                  />
                  {formErrors.firstName && <P className="text-xs text-red-500 mt-1">{formErrors.firstName}</P>}
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Last Name <Span className="text-red-500">*</Span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Ex: Joe"
                    className={`w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${formErrors.lastName ? 'border-red-500' : 'border-slate-300'}`}
                  />
                  {formErrors.lastName && <P className="text-xs text-red-500 mt-1">{formErrors.lastName}</P>}
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email <Span className="text-red-500">*</Span>
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Ex: ex@example.com"
                    className={`w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${formErrors.email ? 'border-red-500' : 'border-slate-300'}`}
                  />
                  {formErrors.email && <P className="text-xs text-red-500 mt-1">{formErrors.email}</P>}
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Deliveryman Type <Span className="text-red-500">*</Span>
                  </Label>
                  <Select
                    value={formData.deliverymanType}
                    onChange={(e) => handleInputChange('deliverymanType', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <Option value="">Delivery man type</Option>
                    <Option value="full-time">Full Time</Option>
                    <Option value="part-time">Part Time</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Zone <Span className="text-red-500">*</Span>
                  </Label>
                  <Select
                    value={formData.zone}
                    onChange={(e) => handleInputChange('zone', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <Option value="">Select Zone</Option>
                    <Option value="asia">Asia</Option>
                    <Option value="europe">Europe</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Image <Span className="text-red-500">*</Span>
                  </Label>
                  <Div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    <UiIcon as={Upload} className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <P className="text-sm font-medium text-blue-600 mb-1">Click to upload Or drag and drop</P>
                    <P className="text-xs text-slate-500">JPG, JPEG, PNG, Gif Image size: Max 2 MB (1:1)</P>
                  </Div>
                </Div>
              </Div>
            </Div>

            {/* 2. Identification Information */}
            <Div className="mb-8">
              <H2 className="text-lg font-semibold text-slate-900 mb-4">2. Identification Information</H2>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Vehicle <Span className="text-red-500">*</Span>
                  </Label>
                  <Select
                    value={formData.vehicle}
                    onChange={(e) => handleInputChange('vehicle', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <Option value="">Select Vehicle</Option>
                    <Option value="car">Car</Option>
                    <Option value="motorcycle">Motorcycle</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Identity Type <Span className="text-red-500">*</Span>
                  </Label>
                  <Select
                    value={formData.identityType}
                    onChange={(e) => handleInputChange('identityType', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <Option value="Passport">Passport</Option>
                    <Option value="Driving License">Driving License</Option>
                    <Option value="National ID">National ID</Option>
                  </Select>
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Identity Number <Span className="text-red-500">*</Span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.identityNumber}
                    onChange={(e) => handleInputChange('identityNumber', e.target.value)}
                    placeholder="Ex: DH-23434-LS"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">Identity Image</Label>
                  <Div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    <UiIcon as={Upload} className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <P className="text-sm font-medium text-blue-600 mb-1">Select a file or Drag & Drop here</P>
                    <P className="text-xs text-slate-500">Pdf, doc, jpg. File size: max 2 MB</P>
                  </Div>
                </Div>
              </Div>
            </Div>

            {/* 3. Additional Data */}
            <Div className="mb-8">
              <H2 className="text-lg font-semibold text-slate-900 mb-4">3. Additional Data</H2>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Enter your age <Span className="text-red-500">*</Span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    placeholder="Enter Age"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Enter your birthdate <Span className="text-red-500">*</Span>
                  </Label>
                  <Div className="relative">
                    <Input
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => handleInputChange('birthdate', e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <UiIcon as={Calendar} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </Div>
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">Driving license</Label>
                  <Div className="flex items-center gap-2">
                    <Div className="relative flex-1">
                      <Button
                        type="button"
                        onClick={handlePickLicense}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-sm flex items-center gap-2"
                      >
                        <UiIcon as={Upload} className="w-4 h-4 text-slate-400" />
                        <Span className="text-sm text-slate-600 truncate">
                          {licenseFile ? licenseFile.name : 'Choose file'}
                        </Span>
                      </Button>
                    </Div>
                  </Div>
                </Div>
              </Div>
            </Div>

            {/* 4. Account info */}
            <Div className="mb-8">
              <H2 className="text-lg font-semibold text-slate-900 mb-4">4. Account info</H2>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone <Span className="text-red-500">*</Span>
                  </Label>
                  <Div className="flex items-center gap-2">
                    <Div className="px-3 py-2.5 border border-slate-300 rounded-l-lg bg-slate-50 text-sm">+1</Div>
                    <Input
                      type="tel"
                      value={formData.phone.replace('+1', '')}
                      onChange={(e) => handleInputChange('phone', '+1' + e.target.value)}
                      placeholder="Enter phone number"
                      className="flex-1 px-4 py-2.5 border border-slate-300 border-l-0 rounded-r-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </Div>
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password <Span className="text-red-500">*</Span>
                  </Label>
                  <Div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Ex: 8+ Character"
                      className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <Button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <UiIcon as={EyeOff} className="w-4 h-4" /> : <UiIcon as={Eye} className="w-4 h-4" />}
                    </Button>
                  </Div>
                </Div>

                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">
                    Confirm Password <Span className="text-red-500">*</Span>
                  </Label>
                  <Div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Ex: 8+ Character"
                      className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <Button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <UiIcon as={EyeOff} className="w-4 h-4" /> : <UiIcon as={Eye} className="w-4 h-4" />}
                    </Button>
                  </Div>
                </Div>
              </Div>
            </Div>

            <Div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </Div>
          </Form>
        </Div>
      </Div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-green-600">Success!</DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6">
            <P className="text-sm text-slate-700">Deliveryman added successfully!</P>
          </Div>
          <DialogFooter className="px-6 pb-6">
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
