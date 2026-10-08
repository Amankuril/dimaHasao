/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/PaymentMethods.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus, Search, Trash2, Edit2, ChevronDown, Loader2, ArrowLeft } from 'lucide-react-native';
import { Button, Div, H1, Input, Label, Option, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
const BASE = () => `${API_BASE_URL}/admin/payment-methods`;
const inputClass =
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors';
const labelClass = 'block text-xs font-semibold text-gray-500 mb-1.5';
const buildField = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  type: 'text',
  name: '',
  placeholder: '',
  isRequired: false,
});
const PaymentMethods = () => {
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [methods, setMethods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    methodName: '',
    fields: [buildField()],
  });
  const fetchMethods = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(BASE(), {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMethods(data.data?.results || []);
      }
    } catch (err) {
      console.error('Payment methods fetch error:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchMethods();
  }, []);
  const filteredMethods = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return methods;
    return methods.filter((method) => {
      const nameMatch = method.name?.toLowerCase().includes(term);
      const fieldsMatch = (method.fields || []).some((field) =>
        String(field.name || '')
          .toLowerCase()
          .includes(term),
      );
      return nameMatch || fieldsMatch;
    });
  }, [methods, searchTerm]);
  const startAdd = () => {
    setEditingId(null);
    setFormData({
      methodName: '',
      fields: [buildField()],
    });
    setView('form');
  };
  const startEdit = (method) => {
    setEditingId(method._id);
    setFormData({
      methodName: method.name || '',
      fields: (method.fields || []).map((field) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: field.type || 'text',
        name: field.name || '',
        placeholder: field.placeholder || '',
        isRequired: Boolean(field.is_required),
      })),
    });
    setView('form');
  };
  const handleAddField = () => {
    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, buildField()],
    }));
  };
  const handleRemoveField = (id) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.id !== id),
    }));
  };
  const handleFieldChange = (id, key, value) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === id
          ? {
              ...field,
              [key]: value,
            }
          : field,
      ),
    }));
  };
  const handleSubmit = async () => {
    if (!formData.methodName.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const payload = {
        method_name: formData.methodName.trim(),
        fields: formData.fields
          .map((field) => ({
            type: field.type,
            name: field.name.trim(),
            placeholder: field.placeholder.trim(),
            is_required: field.isRequired,
          }))
          .filter((field) => field.name),
      };
      const res = await fetch(editingId ? `${BASE()}/${editingId}` : BASE(), {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setView('list');
        await fetchMethods();
      }
    } catch (err) {
      console.error('Payment method save error:', err);
    } finally {
      setSaving(false);
    }
  };
  const handleToggleStatus = async (method) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${BASE()}/${method._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: JSON.stringify({
          active: !method.active,
        }),
      });
      await fetchMethods();
    } catch (err) {
      console.error('Status update error:', err);
    }
  };
  const handleDelete = async (methodId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${BASE()}/${methodId}`, {
        method: 'DELETE',
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
      await fetchMethods();
    } catch (err) {
      console.error('Delete method error:', err);
    }
  };
  if (view === 'form') {
    return (
      <ScrollDiv className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 font-sans text-gray-900">
        <Div className="mb-6">
          <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <Span>Driver Management</Span>
            <UiIcon as={ChevronRight} size={12} />
            <Span className="text-gray-700">Payment Methods</Span>
          </Div>
          <Div className="flex flex-wrap items-center justify-between gap-4">
            <H1 className="text-xl text-gray-900 font-bold">{editingId ? 'Edit Payment Method' : 'Add Payment Method'}</H1>
            <Div className="flex items-center gap-3">
              <Button
                onClick={() => setView('list')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <UiIcon as={ArrowLeft} size={16} /> Back
              </Button>
              <Button
                onClick={handleAddField}
                className="flex items-center gap-2 px-4 py-2 text-sm text-black font-bold bg-yellow-400 border border-yellow-400 rounded-lg hover:bg-yellow-500 shadow-sm transition-colors"
              >
                <UiIcon as={Plus} size={16} /> Add New Field
              </Button>
            </Div>
          </Div>
        </Div>

        <Div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <Div className="max-w-lg">
            <Label className={labelClass}>Method Name *</Label>
            <Input
              type="text"
              className={inputClass}
              placeholder="Method Name"
              value={formData.methodName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  methodName: e.target.value,
                }))
              }
            />
          </Div>

          <Div className="space-y-4">
            {formData.fields.map((field) => (
              <Div key={field.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <Div className="flex flex-wrap items-end gap-4">
                  <Div className="w-full md:w-48">
                    <Label className={labelClass}>Input Field Type</Label>
                    <Div className="relative">
                      <Select value={field.type} onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)} className={`${inputClass} pr-8`}>
                        <Option value="text">Text</Option>
                        <Option value="number">Number</Option>
                        <Option value="email">Email</Option>
                        <Option value="file">File</Option>
                      </Select>
                      <UiIcon as={ChevronDown} size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </Div>
                  </Div>
                  <Div className="w-full md:w-56">
                    <Label className={labelClass}>Input Field Name</Label>
                    <Input
                      type="text"
                      className={inputClass}
                      placeholder="Input Field Name"
                      value={field.name}
                      onChange={(e) => handleFieldChange(field.id, 'name', e.target.value)}
                    />
                  </Div>
                  <Div className="flex-1 min-w-[200px]">
                    <Label className={labelClass}>Placeholder</Label>
                    <Input
                      type="text"
                      className={inputClass}
                      placeholder="Enter Your Placeholder"
                      value={field.placeholder}
                      onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                    />
                  </Div>
                  <Label className="flex items-center gap-2 text-sm text-gray-600">
                    <Input
                      type="checkbox"
                      checked={field.isRequired}
                      onChange={() => handleFieldChange(field.id, 'isRequired', !field.isRequired)}
                      className="h-4 w-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400"
                    />
                    Is Required?
                  </Label>
                  <Button onClick={() => handleRemoveField(field.id)} className="ml-auto text-rose-500 hover:text-rose-600 p-2">
                    <UiIcon as={Trash2} size={16} />
                  </Button>
                </Div>
              </Div>
            ))}
          </Div>

          <Div className="flex justify-end gap-3">
            <Button
              onClick={() => setView('list')}
              className="px-5 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="px-6 py-2.5 text-sm font-bold text-black bg-yellow-400 rounded-lg shadow-sm hover:bg-yellow-500 transition-colors disabled:opacity-70"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Submit'}
            </Button>
          </Div>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 font-sans text-gray-900">
      <Div className="mb-6">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Driver Management</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Payment Methods</Span>
        </Div>
        <Div className="flex items-center justify-between">
          <H1 className="text-xl text-gray-900 font-bold">Payment Methods</H1>
          <Button
            onClick={startAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black bg-yellow-400 shadow-sm rounded-lg hover:bg-yellow-500 transition-colors"
          >
            <UiIcon as={Plus} size={16} /> Add
          </Button>
        </Div>
      </Div>

      <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <Div className="flex items-center gap-2 text-xs text-gray-500">
            <Span>Show</Span>
            <Select
              className="border border-gray-200 rounded px-2 py-1 text-xs bg-white"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(e.target.value)}
            >
              <Option value={10}>10</Option>
              <Option value={25}>25</Option>
            </Select>
            <Span>entries</Span>
          </Div>
          <Div className="flex items-center gap-3">
            <Div className="relative">
              <UiIcon as={Search} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-56 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors"
              />
            </Div>
          </Div>
        </Div>

        <Div>
          <Table cols={[180, 220, 120, 132]} className="w-full">
            <Thead>
              <Tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <Th className="px-6 py-3 text-left">Method</Th>
                <Th className="px-4 py-3 text-left">Fields</Th>
                <Th className="px-4 py-3 text-center">Status</Th>
                <Th className="px-4 py-3 text-center">Action</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {loading ? (
                <Tr>
                  <Td colSpan="4" className="py-10 text-center">
                    <UiIcon as={Loader2} className="w-6 h-6 animate-spin text-yellow-500 mx-auto" />
                  </Td>
                </Tr>
              ) : filteredMethods.length === 0 ? (
                <Tr>
                  <Td colSpan="4" className="py-10 text-center text-gray-400">
                    No payment methods found.
                  </Td>
                </Tr>
              ) : (
                filteredMethods.map((method) => (
                  <Tr key={method._id} className="hover:bg-gray-50/50">
                    <Td className="px-6 py-3 font-medium">{method.name}</Td>
                    <Td className="px-4 py-3 text-gray-500">
                      {(method.fields || [])
                        .map((field) => field.name)
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </Td>
                    <Td className="px-4 py-3 text-center">
                      <Switch checked={method.active !== false} onCheckedChange={() => handleToggleStatus(method)} className={method.active !== false ? 'bg-emerald-500' : 'bg-gray-200'} />
                    </Td>
                    <Td className="px-4 py-3 text-center">
                      <Div className="inline-flex items-center gap-2">
                        <Button onClick={() => startEdit(method)} className="p-2 rounded-lg border border-gray-200 text-amber-500 hover:bg-amber-50">
                          <UiIcon as={Edit2} size={14} />
                        </Button>
                        <Button onClick={() => handleDelete(method._id)} className="p-2 rounded-lg border border-gray-200 text-rose-500 hover:bg-rose-50">
                          <UiIcon as={Trash2} size={14} />
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default PaymentMethods;
