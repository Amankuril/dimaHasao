/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/support/TicketTitle.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Tag, Trash2 } from 'lucide-react-native';
import { adminSupportService } from '../../../shared/services/supportTicketService';
import { Button, Div, Form, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { window } from '../../../../../lib/webShim';
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
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';

const USER_TYPES = ['user', 'driver', 'owner'];
const COLS = [190, 120, 120, 104];
const LABELS = ['Title', 'User Type', 'Status', ''];
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
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Tag}
        title="Ticket Title"
        subtitle="The support subjects riders, drivers and owners can pick"
        breadcrumb={[{ label: 'Support Management' }, { label: 'Ticket Title' }]}
      />

      {error ? <ErrorState title="Ticket titles error" message={error} onRetry={loadRows} className="mb-4" /> : null}

      <Form onSubmit={submitForm} className="mb-4">
        <Card>
          <SectionTitle>{editingId ? 'Update Ticket Title' : 'Add Ticket Title'}</SectionTitle>

          <Div className="gap-3">
            <Field label="Title" required hint="Shown to the customer when they raise a ticket">
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
                className={INPUT}
              />
            </Field>

            <Field label="User Type">
              <Select
                value={form.userType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    userType: event.target.value,
                  }))
                }
                className={INPUT}
              >
                {USER_TYPES.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Field>

            <Div className="flex-row items-center gap-2 h-11">
              <Input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    active: event.target.checked,
                  }))
                }
                className="w-5 h-5"
                accessibilityLabel="Active"
              />
              <Span className="text-sm text-slate-700">Active</Span>
            </Div>

            <Div className="flex-row gap-2">
              <Button type="submit" disabled={saving} className={`${BTN_PRIMARY} flex-1 ${saving ? 'opacity-50' : ''}`}>
                <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create'}</Span>
              </Button>
              {editingId ? (
                <Button type="button" onClick={resetForm} className={`${BTN_SECONDARY} flex-1`}>
                  <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                </Button>
              ) : null}
            </Div>
          </Div>
        </Card>
      </Form>

      <Card className="mb-4">
        <SectionTitle>Ticket Title List</SectionTitle>
        <Toolbar className="mb-0">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title" className={`${INPUT} flex-1 min-w-[180px]`} />
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={search ? 'No matching title' : 'No support title yet'}
          message={search ? 'No title matches that search.' : 'Add a title above so customers have something to pick.'}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredRows.map((row, i) => (
              <Row key={row.id} last={i === filteredRows.length - 1}>
                <Cell width={COLS[0]}>
                  <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                    {row.title}
                  </Span>
                </Cell>
                <Cell width={COLS[1]}>{row.userType}</Cell>
                <Cell width={COLS[2]}>
                  <Button
                    type="button"
                    onClick={() => toggleActive(row)}
                    accessibilityLabel={row.active ? `Deactivate ${row.title}` : `Activate ${row.title}`}
                    className="h-11 justify-center"
                  >
                    <StatusBadge status={row.active ? 'active' : 'inactive'} label={row.active ? 'Active' : 'Inactive'} />
                  </Button>
                </Cell>
                <Cell width={COLS[3]}>
                  <Div className="flex-row items-center gap-1">
                    <Button type="button" onClick={() => onEdit(row)} accessibilityLabel={`Edit ${row.title}`} className="w-11 h-11 items-center justify-center rounded-lg">
                      <UiIcon as={Edit2} size={18} className="text-slate-500" />
                    </Button>
                    <Button type="button" onClick={() => onDelete(row)} accessibilityLabel={`Delete ${row.title}`} className="w-11 h-11 items-center justify-center rounded-lg">
                      <UiIcon as={Trash2} size={18} className="text-red-600" />
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
export default TicketTitle;
