/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/PaymentMethods.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Edit2, ArrowLeft, CreditCard, Save } from 'lucide-react-native';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  Field,
  TableSkeleton,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
const BASE = () => `${API_BASE_URL}/admin/payment-methods`;
const LIST_COLS = [160, 220, 110, 100];
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
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const { tablet } = useLayoutWidth();
  const [formData, setFormData] = useState({
    methodName: '',
    fields: [buildField()],
  });
  const fetchMethods = async () => {
    setLoading(true);
    setLoadError('');
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
      } else {
        setLoadError(data?.message || 'Could not load payment methods');
      }
    } catch (err) {
      console.error('Payment methods fetch error:', err);
      setLoadError(err?.message || 'Could not load payment methods');
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
      <AdminPage maxWidth={720}>
        <PageHeader
          icon={CreditCard}
          title={editingId ? 'Edit Payment Method' : 'Add Payment Method'}
          subtitle="Name the method and the fields drivers must fill"
          breadcrumb={[{ label: 'Driver Management' }, { label: 'Payment Methods', onPress: () => setView('list') }, { label: editingId ? 'Edit' : 'Add' }]}
          actions={
            <Button onClick={() => setView('list')} className={BTN_SECONDARY}>
              <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>Back</Span>
            </Button>
          }
        />

        <Card className="gap-4">
          <Field label="Method name" required>
            <Input
              type="text"
              className={INPUT}
              placeholder="Method name"
              value={formData.methodName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  methodName: e.target.value,
                }))
              }
            />
          </Field>

          <SectionTitle
            action={
              <Button onClick={handleAddField} className={BTN_SECONDARY}>
                <UiIcon as={Plus} size={14} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY}>Add field</Span>
              </Button>
            }
          >
            Fields
          </SectionTitle>

          {formData.fields.length === 0 ? (
            <EmptyState title="No fields yet" message="Add at least one field drivers must fill in." actionLabel="Add field" onAction={handleAddField} className="py-8" />
          ) : (
            formData.fields.map((field) => (
              <Div key={field.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 gap-3">
                <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
                  <Field label="Field type" className="flex-1">
                    <Select value={field.type} onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)} className={INPUT}>
                      <Option value="text">Text</Option>
                      <Option value="number">Number</Option>
                      <Option value="email">Email</Option>
                      <Option value="file">File</Option>
                    </Select>
                  </Field>
                  <Field label="Field name" className="flex-1">
                    <Input
                      type="text"
                      className={INPUT}
                      placeholder="Field name"
                      value={field.name}
                      onChange={(e) => handleFieldChange(field.id, 'name', e.target.value)}
                    />
                  </Field>
                </Div>
                <Field label="Placeholder">
                  <Input
                    type="text"
                    className={INPUT}
                    placeholder="Enter your placeholder"
                    value={field.placeholder}
                    onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                  />
                </Field>
                <Div className="flex-row items-center justify-between gap-3">
                  <Div className="flex-row items-center gap-2 flex-1 min-w-0">
                    <Switch checked={field.isRequired} onCheckedChange={() => handleFieldChange(field.id, 'isRequired', !field.isRequired)} />
                    <Span className="text-sm text-slate-700">Required</Span>
                  </Div>
                  <Button
                    onClick={() => handleRemoveField(field.id)}
                    accessibilityLabel="Remove field"
                    className="w-11 h-11 rounded-lg items-center justify-center border border-slate-300 bg-white"
                  >
                    <UiIcon as={Trash2} size={16} className="text-red-600" />
                  </Button>
                </Div>
              </Div>
            ))
          )}

          <Div className="flex-row flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <Button onClick={handleSubmit} disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-60' : ''}`}>
              <UiIcon as={Save} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Submit'}</Span>
            </Button>
            <Button onClick={() => setView('list')} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
          </Div>
        </Card>
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={CreditCard}
        title="Payment Methods"
        subtitle="How drivers receive their payouts"
        breadcrumb={[{ label: 'Driver Management' }, { label: 'Payment Methods' }]}
        actions={
          <Button onClick={startAdd} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add method</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search methods or fields"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${INPUT} flex-1`}
            />
          </Div>
          <Select className={INPUT} value={itemsPerPage} onChange={(e) => setItemsPerPage(e.target.value)}>
            <Option value={10}>Show 10</Option>
            <Option value={25}>Show 25</Option>
          </Select>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : loadError ? (
        <ErrorState title="Could not load payment methods" message={loadError} onRetry={fetchMethods} />
      ) : filteredMethods.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment methods"
          message={searchTerm ? 'No method matches this search.' : 'Add a method so drivers can be paid out.'}
          actionLabel="Add method"
          onAction={startAdd}
        />
      ) : (
        <DataTable cols={LIST_COLS}>
          <THead cols={LIST_COLS} labels={['Method', 'Fields', 'Status', 'Actions']} />
          <TBody>
            {filteredMethods.map((method, i) => (
              <Row key={method._id} last={i === filteredMethods.length - 1}>
                <Cell width={LIST_COLS[0]}>
                  <Span className="text-sm font-semibold text-slate-900">{method.name}</Span>
                </Cell>
                <Cell width={LIST_COLS[1]}>
                  <P className="text-sm text-slate-500">
                    {(method.fields || [])
                      .map((field) => field.name)
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </P>
                </Cell>
                <Cell width={LIST_COLS[2]}>
                  <Switch checked={method.active !== false} onCheckedChange={() => handleToggleStatus(method)} />
                </Cell>
                <Cell width={LIST_COLS[3]}>
                  <Div className="flex-row items-center gap-1">
                    <Button onClick={() => startEdit(method)} accessibilityLabel={`Edit ${method.name}`} className="w-11 h-11 rounded-lg items-center justify-center">
                      <UiIcon as={Edit2} size={16} className="text-slate-600" />
                    </Button>
                    <Button onClick={() => handleDelete(method._id)} accessibilityLabel={`Delete ${method.name}`} className="w-11 h-11 rounded-lg items-center justify-center">
                      <UiIcon as={Trash2} size={16} className="text-red-600" />
                    </Button>
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
    </AdminPage>
  );
};
export default PaymentMethods;
