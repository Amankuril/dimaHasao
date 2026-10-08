/* Ported from Frontend/src/modules/Food/pages/admin/employees/AddEmployee.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { UserPlus, Eye, EyeOff, Upload } from 'lucide-react-native';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Form, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
import { pickImage } from '../../../../lib/files';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function AddEmployee() {
  const { tablet } = useLayoutWidth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    zone: 'All',
    role: '',
    phone: '',
    phoneCode: '+91',
    employeeImage: null,
    email: '',
    password: '',
    confirmPassword: '',
  });
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleFileUpload = (field, file) => {
    if (file) {
      setFormData((prev) => ({
        ...prev,
        [field]: file,
      }));
    }
  };
  const handlePickEmployeeImage = async () => {
    const file = await pickImage();
    handleFileUpload('employeeImage', file);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    debugLog('Form submitted:', formData);
    alert('Employee added successfully!');
  };
  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      zone: 'All',
      role: '',
      phone: '',
      phoneCode: '+91',
      employeeImage: null,
      email: '',
      password: '',
      confirmPassword: '',
    });
  };
  const grid = tablet ? 'grid grid-cols-2 gap-3' : 'gap-3';
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={UserPlus}
        title="Add New Employee"
        subtitle="Create a panel account and set its permissions"
        breadcrumb={[{ label: 'Food' }, { label: 'Employees' }, { label: 'Add employee' }]}
      />

      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <SectionTitle>General information</SectionTitle>
          <Div className={grid}>
            <Field label="First name">
              <Input type="text" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} placeholder="Ex: John" className={INPUT} />
            </Field>
            <Field label="Last name">
              <Input type="text" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} placeholder="Ex: Doe" className={INPUT} />
            </Field>
            <Field label="Zone">
              <Select value={formData.zone} onChange={(e) => handleInputChange('zone', e.target.value)} className={INPUT}>
                <Option value="All">All</Option>
                <Option value="Zone 1">Zone 1</Option>
                <Option value="Zone 2">Zone 2</Option>
                <Option value="Zone 3">Zone 3</Option>
              </Select>
            </Field>
            <Field label="Role">
              <Select value={formData.role} onChange={(e) => handleInputChange('role', e.target.value)} className={INPUT} placeholder="Select role">
                <Option value="">Select Role</Option>
                <Option value="manager">Manager</Option>
                <Option value="customer-care">Customer Care Executive</Option>
                <Option value="admin">Admin</Option>
              </Select>
            </Field>
          </Div>

          <Field label="Phone" className="mt-3">
            <Div className="flex-row items-center gap-2">
              <Select
                value={formData.phoneCode}
                onChange={(e) => handleInputChange('phoneCode', e.target.value)}
                className={`${INPUT} w-28`}
              >
                <Option value="+91">{'\u{1F1EE}\u{1F1F3}'} +91</Option>
              </Select>
              <Input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="Phone number" className={`${INPUT} flex-1`} />
            </Div>
          </Field>

          <Field label="Employee image" hint="jpg, png, jpeg or gif · max 2 MB · 1:1 ratio" className="mt-3">
            <Div className="border border-dashed border-slate-300 rounded-lg p-6 items-center gap-1 bg-white" onClick={handlePickEmployeeImage}>
              <UiIcon as={Upload} size={28} className="text-slate-400" />
              <P className="text-sm font-medium text-slate-700">Upload image</P>
              <P className="text-xs text-slate-500">{formData.employeeImage ? 'Image selected' : 'Tap to choose a file'}</P>
            </Div>
          </Field>
        </Card>

        <Card className="mb-4">
          <SectionTitle>Account info</SectionTitle>
          <Div className="gap-3">
            <Field label="Email">
              <Input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="Ex: ex@gmail.com" className={INPUT} />
            </Field>

            <Field label="Password" hint="Password length 8+">
              <Div className="flex-row items-center gap-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Password length 8+"
                  className={`${INPUT} flex-1`}
                />
                <Button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <UiIcon as={showPassword ? EyeOff : Eye} size={16} className="text-slate-600" />
                </Button>
              </Div>
            </Field>

            <Field label="Confirm password">
              <Div className="flex-row items-center gap-2">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Password length 8+"
                  className={`${INPUT} flex-1`}
                />
                <Button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <UiIcon as={showConfirmPassword ? EyeOff : Eye} size={16} className="text-slate-600" />
                </Button>
              </Div>
            </Field>
          </Div>
        </Card>

        <Div className="flex-row flex-wrap items-center justify-end gap-2">
          <Button type="button" onClick={handleReset} className={BTN_SECONDARY}>
            <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
          </Button>
          <Button type="submit" className={BTN_PRIMARY}>
            <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
          </Button>
        </Div>
      </Form>
    </AdminPage>
  );
}
