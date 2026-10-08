/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/support/TicketTitle.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Edit2, Plus, Trash2 } from 'lucide-react-native';
import { adminSupportService } from '../../../shared/services/supportTicketService';
import {
  Button,
  Div,
  Form,
  H1,
  H3,
  Input,
  Label,
  Option,
  P,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
const USER_TYPES = ['user', 'driver', 'owner'];
const initialForm = {
  title: '',
  userType: 'user',
  active: true,
};
const TicketTitle = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState('');
  const [search, setSearch] = useState('');
  const loadRows = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminSupportService.listTitles();
      setRows(response?.data?.results || []);
    } catch (apiError) {
      setError(apiError?.message || 'Unable to load support ticket titles');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadRows();
  }, []);
  const resetForm = () => {
    setEditingId('');
    setForm(initialForm);
  };
  const filteredRows = useMemo(() => {
    const query = String(search || '')
      .trim()
      .toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.title, row.userType].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [rows, search]);
  const submitForm = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        userType: form.userType,
        active: form.active,
      };
      if (editingId) {
        await adminSupportService.updateTitle(editingId, payload);
      } else {
        await adminSupportService.createTitle(payload);
      }
      await loadRows();
      resetForm();
    } catch (apiError) {
      setError(apiError?.message || 'Unable to save ticket title');
    } finally {
      setSaving(false);
    }
  };
  const onEdit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title || '',
      userType: row.userType || 'user',
      active: Boolean(row.active),
    });
  };
  const onDelete = async (row) => {
    if (!(await window.confirmAsync(`Delete "${row.title}"?`))) return;
    try {
      await adminSupportService.deleteTitle(row.id);
      await loadRows();
      if (editingId === row.id) {
        resetForm();
      }
    } catch (apiError) {
      setError(apiError?.message || 'Unable to delete title');
    }
  };
  const toggleActive = async (row) => {
    try {
      await adminSupportService.updateTitle(row.id, {
        active: !row.active,
      });
      await loadRows();
    } catch (apiError) {
      setError(apiError?.message || 'Unable to update status');
    }
  };
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <Div className="mb-6">
        <Div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
          <Span>Support Management</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Ticket Title</Span>
        </Div>
        <Div className="flex items-center justify-between gap-4">
          <H1 className="text-xl text-gray-900 font-bold">Ticket Title</H1>
        </Div>
      </Div>

      {error ? <Div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</Div> : null}

      <Div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Form onSubmit={submitForm} className="rounded-xl border border-gray-200 bg-white p-6">
          <Div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
            <Div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
              <UiIcon as={Plus} size={18} />
            </Div>
            <Div>
              <H3 className="text-sm text-gray-900 font-bold">{editingId ? 'Update Ticket Title' : 'Add Ticket Title'}</H3>
              <P className="text-xs text-gray-400">Create support title for user/driver/owner flows</P>
            </Div>
          </Div>

          <Div className="space-y-4">
            <Div>
              <Label className="mb-1.5 block text-xs font-semibold text-gray-500">Title</Label>
              <Input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Ride related issue"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
              />
            </Div>

            <Div>
              <Label className="mb-1.5 block text-xs font-semibold text-gray-500">User Type</Label>
              <Select
                value={form.userType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    userType: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
              >
                {USER_TYPES.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Div>

            <Label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
              <Input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    active: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
              />
              Active
            </Label>

            <Div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              ) : null}
            </Div>
          </Div>
        </Form>

        <Div className="rounded-xl border border-gray-200 bg-white">
          <Div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
            <H3 className="text-sm text-gray-900 font-bold">Ticket Title List</H3>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title..."
              className="w-60 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </Div>

          <Div>
            <Table cols={[200, 120, 120, 96]} className="w-full">
              <Thead>
                <Tr className="border-b border-gray-100 bg-gray-50">
                  <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Title</Th>
                  <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">User Type</Th>
                  <Th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</Th>
                  <Th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                      Loading titles...
                    </Td>
                  </Tr>
                ) : filteredRows.length === 0 ? (
                  <Tr>
                    <Td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                      No support title found.
                    </Td>
                  </Tr>
                ) : (
                  filteredRows.map((row) => (
                    <Tr key={row.id} className="border-b border-gray-50 last:border-b-0">
                      <Td className="px-4 py-3 text-sm font-medium text-gray-900">{row.title}</Td>
                      <Td className="px-4 py-3 text-sm text-gray-600">{row.userType}</Td>
                      <Td className="px-4 py-3">
                        <Button
                          type="button"
                          onClick={() => toggleActive(row)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${row.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {row.active ? 'Active' : 'Inactive'}
                        </Button>
                      </Td>
                      <Td className="px-4 py-3">
                        <Div className="flex items-center justify-end gap-2">
                          <Button type="button" onClick={() => onEdit(row)} className="rounded-md border border-gray-200 p-2 text-gray-500 hover:bg-gray-50">
                            <UiIcon as={Edit2} size={14} />
                          </Button>
                          <Button type="button" onClick={() => onDelete(row)} className="rounded-md border border-rose-200 p-2 text-rose-600 hover:bg-rose-50">
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
      </Div>
    </ScrollDiv>
  );
};
export default TicketTitle;
