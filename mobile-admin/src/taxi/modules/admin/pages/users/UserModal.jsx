/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/UserModal.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { X, CheckCircle2 } from 'lucide-react-native';
import { Button, Div, Form, Input, Option, Overlay, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { Field, INPUT, INPUT_ERROR, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';

const UserModal = ({ isOpen, onClose, onSubmit, editingUser = null, isLoading = false }) => {
  const { tablet } = useLayoutWidth();
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
  const cols = tablet ? 2 : 1;
  return (
    <Overlay onClose={onClose} className="flex-1 items-center justify-center p-4">
      <Div className="bg-white rounded-xl border border-slate-200 w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <Div className="flex-row items-start justify-between gap-3 px-4 pt-4">
          <Div className="flex-1 min-w-0">
            <Span className="text-base font-semibold text-slate-900">{editingUser ? 'Update Passenger' : 'Create New Passenger'}</Span>
            <Span className="text-sm text-slate-500 mt-0.5">{editingUser ? `Editing ID: #${editingUser.id.slice(-6)}` : 'Add a new customer to the platform'}</Span>
          </Div>
          <Button onClick={onClose} accessibilityLabel="Close" className="w-11 h-11 rounded-lg items-center justify-center">
            <UiIcon as={X} size={20} className="text-slate-500" />
          </Button>
        </Div>

        <ScrollDiv className="max-h-[440px]" contentStyle={{ padding: 16 }}>
          <Form onSubmit={handleSubmit} className="gap-3">
            <Div className={`grid grid-cols-${cols} gap-3`}>
              <Field label="Full Name" required error={errors.name}>
                <Input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Rahul Sharma" className={errors.name ? INPUT_ERROR : INPUT} />
              </Field>

              <Field label="Email Address" required error={errors.email}>
                <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="rahul@example.com" className={errors.email ? INPUT_ERROR : INPUT} />
              </Field>

              <Field label="Mobile Number" required error={errors.mobile}>
                <Input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="+91 9999999999" className={errors.mobile ? INPUT_ERROR : INPUT} />
              </Field>

              <Field label="Gender">
                <Select name="gender" value={formData.gender} onChange={handleChange} className={INPUT}>
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Field>

              <Field label={editingUser ? 'Update Password' : 'Password'} required={!editingUser} error={errors.password} hint={editingUser ? 'Leave empty to keep the current password' : undefined}>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={editingUser ? '••••••••' : 'Enter strong password'}
                  className={errors.password ? INPUT_ERROR : INPUT}
                />
              </Field>

              <Field label="Active Status">
                <Button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      active: !prev.active,
                    }))
                  }
                  accessibilityLabel={formData.active ? 'Deactivate this user' : 'Activate this user'}
                  className="flex-row items-center justify-between gap-3 h-11 px-3 rounded-lg border border-slate-300 bg-white"
                >
                  <Span className="text-sm text-slate-700">{formData.active ? 'Active' : 'Inactive'}</Span>
                  <Div className={`h-6 w-11 rounded-full justify-center ${formData.active ? 'bg-green-600' : 'bg-slate-300'}`}>
                    <Div className={`h-5 w-5 rounded-full bg-white ${formData.active ? 'ml-5' : 'ml-0.5'}`} />
                  </Div>
                </Button>
              </Field>
            </Div>

            <Div className="flex-row gap-2 mt-1">
              <Button type="button" onClick={onClose} className={`${BTN_SECONDARY} flex-1`}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button type="submit" disabled={isLoading} className={`${BTN_PRIMARY} flex-1 ${isLoading ? 'opacity-50' : ''}`}>
                {isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <UiIcon as={CheckCircle2} size={16} className="text-white" />}
                <Span className={BTN_TEXT_PRIMARY}>{editingUser ? 'Update' : 'Submit'}</Span>
              </Button>
            </Div>
          </Form>
        </ScrollDiv>
      </Div>
    </Overlay>
  );
};
export default UserModal;
