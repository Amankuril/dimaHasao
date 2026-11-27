import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Plus,
  Search,
  Trash2,
  Edit2,
  ChevronDown,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';

const BASE = () => `${API_BASE_URL}/admin/payment-methods`;

const inputClass =
  'w-full border border-neutral-200 rounded-lg px-4 py-2.5 text-sm text-neutral-800 bg-white focus:border-[#0a4d2b] focus:ring-1 focus:ring-[#0a4d2b]/30 outline-none transition-colors';
const labelClass = 'block text-xs text-neutral-500 mb-1.5';

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
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
        String(field.name || '').toLowerCase().includes(term),
      );
      return nameMatch || fieldsMatch;
    });
  }, [methods, searchTerm]);

  const startAdd = () => {
    setEditingId(null);
    setFormData({ methodName: '', fields: [buildField()] });
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
    setFormData((prev) => ({ ...prev, fields: [...prev.fields, buildField()] }));
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
        field.id === id ? { ...field, [key]: value } : field,
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
      const res = await fetch(
        editingId ? `${BASE()}/${editingId}` : BASE(),
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        },
      );
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ active: !method.active }),
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
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await fetchMethods();
    } catch (err) {
      console.error('Delete method error:', err);
    }
  };

  if (view === 'form') {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 lg:p-6 font-sans text-neutral-900">
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
            <span>Driver management</span>
            <ChevronRight size={12} />
            <span className="text-neutral-700">Payment methods</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-xl text-neutral-900 font-medium">
              {editingId ? 'Edit Payment Method' : 'Add Payment Method'}
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('list')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleAddField}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white font-medium bg-[#0a4d2b] border border-[#0a4d2b] rounded-lg hover:bg-[#06381e] shadow-sm transition-colors"
              >
                <Plus size={16} /> Add new field
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
          <div className="max-w-lg">
            <label className={labelClass}>Method Name *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Method name"
              value={formData.methodName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, methodName: e.target.value }))
              }
            />
          </div>

          <div className="space-y-4">
            {formData.fields.map((field) => (
              <div
                key={field.id}
                className="bg-neutral-50 border border-neutral-200 rounded-xl p-4"
              >
                <div className="flex flex-wrap items-end gap-4">
                  <div className="w-full md:w-48">
                    <label className={labelClass}>Input field type</label>
                    <div className="relative">
                      <select
                        value={field.type}
                        onChange={(e) =>
                          handleFieldChange(field.id, 'type', e.target.value)
                        }
                        className={`${inputClass} pr-8`}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="file">File</option>
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-56">
                    <label className={labelClass}>Input field name</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Input field name"
                      value={field.name}
                      onChange={(e) =>
                        handleFieldChange(field.id, 'name', e.target.value)
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className={labelClass}>Placeholder</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Enter your placeholder"
                      value={field.placeholder}
                      onChange={(e) =>
                        handleFieldChange(field.id, 'placeholder', e.target.value)
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-neutral-600">
                    <input
                      type="checkbox"
                      checked={field.isRequired}
                      onChange={() =>
                        handleFieldChange(field.id, 'isRequired', !field.isRequired)
                      }
                      className="h-4 w-4 text-[#0a4d2b] border-neutral-300 rounded focus:ring-[#0a4d2b]/30"
                    />
                    Is Required?
                  </label>
                  <button
                    onClick={() => handleRemoveField(field.id)}
                    className="ml-auto text-rose-500 hover:text-rose-600 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setView('list')}
              className="px-5 py-2.5 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#0a4d2b] rounded-lg shadow-sm hover:bg-[#06381e] transition-colors disabled:opacity-70"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 lg:p-6 font-sans text-neutral-900">
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
          <span>Driver management</span>
          <ChevronRight size={12} />
          <span className="text-neutral-700">Payment methods</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-neutral-900 font-medium">Payment methods</h1>
          <button
            onClick={startAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0a4d2b] shadow-sm rounded-lg hover:bg-[#06381e] transition-colors"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Show</span>
            <select
              className="border border-neutral-200 rounded px-2 py-1 text-xs bg-white"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(e.target.value)}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <span>entries</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg w-56 focus:border-[#0a4d2b] focus:ring-1 focus:ring-[#0a4d2b]/30 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
                <th className="px-6 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Fields</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm text-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0a4d2b] mx-auto" />
                  </td>
                </tr>
              ) : filteredMethods.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-neutral-500">
                    No payment methods found
                  </td>
                </tr>
              ) : (
                filteredMethods.map((method) => (
                  <tr key={method._id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-3 font-medium">{method.name}</td>
                    <td className="px-4 py-3 text-neutral-500">
                      {(method.fields || [])
                        .map((field) => field.name)
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={method.active !== false}
                          onChange={() => handleToggleStatus(method)}
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                      </label>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => startEdit(method)}
                          className="p-2 rounded-lg border border-neutral-200 text-[#0a4d2b] hover:bg-amber-50"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(method._id)}
                          className="p-2 rounded-lg border border-neutral-200 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethods;
