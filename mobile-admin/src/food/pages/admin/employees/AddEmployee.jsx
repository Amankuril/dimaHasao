/* Ported from Frontend/src/modules/Food/pages/admin/employees/AddEmployee.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { UserPlus, User, Eye, EyeOff, Upload, ChevronDown } from 'lucide-react-native';
import { Button, Div, Form, H1, H2, Input, Label, Option, P, ScrollDiv, Select, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
import { pickImage } from '../../../../lib/files';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function AddEmployee() {
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3 mb-4">
            <Div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <UiIcon as={UserPlus} className="w-5 h-5 text-white" />
            </Div>
            <H1 className="text-2xl font-bold text-slate-900">Add New Employee</H1>
          </Div>
        </Div>

        <Form onSubmit={handleSubmit}>
          {/* General Information */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <Div className="flex items-center gap-3 mb-6">
              <UiIcon as={User} className="w-5 h-5 text-slate-600" />
              <H2 className="text-lg font-semibold text-slate-900">General Information</H2>
            </Div>

            <Div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side - Form Fields */}
              <Div className="lg:col-span-2 space-y-6">
                <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">First name</Label>
                    <Input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Ex: John"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </Div>

                  {/* Last Name */}
                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">Last name</Label>
                    <Input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Ex: Doe"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </Div>
                </Div>

                <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Zone */}
                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">Zone</Label>
                    <Div className="relative">
                      <Select
                        value={formData.zone}
                        onChange={(e) => handleInputChange('zone', e.target.value)}
                        className="w-full px-4 py-2.5 pr-8 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none cursor-pointer"
                      >
                        <Option value="All">All</Option>
                        <Option value="Zone 1">Zone 1</Option>
                        <Option value="Zone 2">Zone 2</Option>
                        <Option value="Zone 3">Zone 3</Option>
                      </Select>
                      <UiIcon as={ChevronDown} className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </Div>
                  </Div>

                  {/* Role */}
                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">Role</Label>
                    <Div className="relative">
                      <Select
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full px-4 py-2.5 pr-8 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none cursor-pointer"
                      >
                        <Option value="">Select Role</Option>
                        <Option value="manager">Manager</Option>
                        <Option value="customer-care">Customer Care Executive</Option>
                        <Option value="admin">Admin</Option>
                      </Select>
                      <UiIcon as={ChevronDown} className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </Div>
                  </Div>
                </Div>

                {/* Phone */}
                <Div>
                  <Label className="block text-sm font-semibold text-slate-700 mb-2">Phone</Label>
                  <Div className="flex items-center gap-2">
                    <Div className="relative">
                      <Select
                        value={formData.phoneCode}
                        onChange={(e) => handleInputChange('phoneCode', e.target.value)}
                        className="px-4 py-2.5 pr-8 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none cursor-pointer"
                      >
                        <Option value="+91">🇮🇳 +91</Option>
                      </Select>
                      <UiIcon as={ChevronDown} className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </Div>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Phone number"
                      className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </Div>
                </Div>
              </Div>

              {/* Right Side - Employee Image */}
              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Employee image</Label>
                <Div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
                  onClick={handlePickEmployeeImage}
                >
                  <UiIcon as={Upload} className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <P className="text-sm font-medium text-slate-700 mb-1">Upload Image</P>
                  <Div className="text-xs text-slate-500 space-y-1 mt-2">
                    <P>Image format - jpg png jpeg gif</P>
                    <P>Image Size - maximum size 2 MB</P>
                    <P>Image Ratio - 1:1</P>
                  </Div>
                </Div>
              </Div>
            </Div>
          </Div>

          {/* Account Info */}
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <Div className="flex items-center gap-3 mb-6">
              <UiIcon as={User} className="w-5 h-5 text-slate-600" />
              <H2 className="text-lg font-semibold text-slate-900">Account Info</H2>
            </Div>

            <Div className="space-y-6">
              {/* Email */}
              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Ex: ex@gmail.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </Div>

              {/* Password */}
              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Password</Label>
                <Div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Password length 8+"
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

              {/* Confirm Password */}
              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</Label>
                <Div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Password length 8+"
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

          {/* Action Buttons */}
          <Div className="flex items-center justify-end gap-4 mb-6">
            <Button
              type="button"
              onClick={handleReset}
              className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
            >
              Reset
            </Button>
            <Button type="submit" className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md">
              Submit
            </Button>
          </Div>
        </Form>
      </Div>
    </ScrollDiv>
  );
}
