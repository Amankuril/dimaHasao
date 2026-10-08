/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/UserModal.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Lock, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { Button, Div, Form, H3, Input, Label, Option, Overlay, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
const UserModal = ({ isOpen, onClose, onSubmit, editingUser = null, isLoading = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    gender: 'male',
    active: true,
  });
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || '',
        email: editingUser.email || '',
        mobile: editingUser.phone || '',
        // Note: phone is mapped to mobile in UserList
        password: '',
        gender: editingUser.gender || 'male',
        active: editingUser.status === 'Active',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        mobile: '',
        password: '',
        gender: 'male',
        active: true,
      });
    }
    setErrors({});
  }, [editingUser, isOpen]);
  if (!isOpen) return null;
  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!editingUser && !formData.password) newErrors.password = 'Password is required';
    if (!formData.mobile) newErrors.mobile = 'Mobile number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  return (
    <Overlay onClose={onClose} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
      <Div
        className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <ScrollDiv className="p-8 space-y-8 max-h-[90vh]">
          <Div className="flex items-center justify-between">
            <Div>
              <H3 className="text-2xl font-bold text-gray-900 tracking-tight">{editingUser ? 'Update Passenger' : 'Create New Passenger'}</H3>
              <P className="text-sm font-medium text-gray-500 mt-1">
                {editingUser ? `Editing ID: #${editingUser.id.slice(-6)}` : 'Add a new customer to the platform'}
              </P>
            </Div>
            <Button
              onClick={onClose}
              className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 hover:bg-gray-50 transition-all"
            >
              <UiIcon as={X} size={20} />
            </Button>
          </Div>

          <Form onSubmit={handleSubmit} className="space-y-6">
            <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 block px-1">Full Name</Label>
                <Div className="relative group">
                  <UiIcon
                    as={User}
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-yellow-500 transition-colors"
                  />
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Sharma"
                    className={`w-full h-14 pl-12 pr-4 bg-gray-50 border ${errors.name ? 'border-rose-200 bg-rose-50/20' : 'border-gray-200'} rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all`}
                  />
                </Div>
                {errors.name && <P className="text-[10px] font-bold text-rose-500 px-1">{errors.name}</P>}
              </Div>

              <Div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 block px-1">Email Address</Label>
                <Div className="relative group">
                  <UiIcon
                    as={Mail}
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-yellow-500 transition-colors"
                  />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="rahul@example.com"
                    className={`w-full h-14 pl-12 pr-4 bg-gray-50 border ${errors.email ? 'border-rose-200 bg-rose-50/20' : 'border-gray-200'} rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all`}
                  />
                </Div>
                {errors.email && <P className="text-[10px] font-bold text-rose-500 px-1">{errors.email}</P>}
              </Div>

              <Div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 block px-1">Mobile Number</Label>
                <Div className="relative group">
                  <UiIcon
                    as={Phone}
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-yellow-500 transition-colors"
                  />
                  <Input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="+91 9999999999"
                    className={`w-full h-14 pl-12 pr-4 bg-gray-50 border ${errors.mobile ? 'border-rose-200 bg-rose-50/20' : 'border-gray-200'} rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all`}
                  />
                </Div>
                {errors.mobile && <P className="text-[10px] font-bold text-rose-500 px-1">{errors.mobile}</P>}
              </Div>

              <Div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 block px-1">Gender</Label>
                <Div className="relative">
                  <UiIcon as={ChevronDown} size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <Select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full h-14 pl-4 pr-10 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
                  >
                    <Option value="male">Male</Option>
                    <Option value="female">Female</Option>
                    <Option value="other">Other</Option>
                  </Select>
                </Div>
              </Div>

              <Div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 block px-1">{editingUser ? 'Update Password (Optional)' : 'Password'}</Label>
                <Div className="relative group">
                  <UiIcon
                    as={Lock}
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-yellow-500 transition-colors"
                  />
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={editingUser ? '••••••••' : 'Enter strong password'}
                    className={`w-full h-14 pl-12 pr-4 bg-gray-50 border ${errors.password ? 'border-rose-200 bg-rose-50/20' : 'border-gray-200'} rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all`}
                  />
                </Div>
                {errors.password && <P className="text-[10px] font-bold text-rose-500 px-1">{errors.password}</P>}
              </Div>

              <Div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-200 mt-auto h-14">
                <Span className="text-sm font-bold text-gray-700">Active Status</Span>
                <Button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      active: !prev.active,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                >
                  <Span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.active ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </Button>
              </Div>
            </Div>

            <Div className="flex gap-4 pt-4">
              <Button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-4 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-900 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></Div>
                ) : (
                  <>
                    <UiIcon as={CheckCircle2} size={16} />
                    {editingUser ? 'Update Passenger' : 'Submit Passenger'}
                  </>
                )}
              </Button>
            </Div>
          </Form>
        </ScrollDiv>
      </Div>
    </Overlay>
  );
};
export default UserModal;
