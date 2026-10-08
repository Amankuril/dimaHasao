/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/OnboardingScreens.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, X, ArrowLeft, Search, Edit, Trash2, Users, Save, LayoutList } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  StatCard,
  StatGrid,
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
import { Button, Div, Input, Option, Overlay, P, ScrollDiv, Select, Span, Textarea, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
import { window } from '../../../../../lib/webShim';
const emptyForm = {
  audience: 'user',
  order: 1,
  title: '',
  description: '',
  active: true,
};
const OnboardingScreens = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [screens, setScreens] = useState([]);
  const [entries, setEntries] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [loadError, setLoadError] = useState('');
  const { tablet } = useLayoutWidth();
  const fetchAllScreens = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [userRes, driverRes, ownerRes] = await Promise.all([
        adminService.getOnboardingScreens('user'),
        adminService.getOnboardingScreens('driver'),
        adminService.getOnboardingScreens('owner'),
      ]);
      const combined = [
        ...(userRes?.data?.results || userRes?.results || []),
        ...(driverRes?.data?.results || driverRes?.results || []),
        ...(ownerRes?.data?.results || ownerRes?.results || []),
      ];
      combined.sort((a, b) => {
        if (Number(a?.order || 0) !== Number(b?.order || 0)) {
          return Number(a?.order || 0) - Number(b?.order || 0);
        }
        return String(a?.title || '').localeCompare(String(b?.title || ''));
      });
      setScreens(combined);
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError(err?.message || 'Failed to load screens');
      toast.error('Failed to load screens');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAllScreens();
  }, []);
  const filteredScreens = useMemo(() => {
    const keyword = String(searchTerm || '')
      .trim()
      .toLowerCase();
    if (!keyword) {
      return screens;
    }
    return screens.filter((item) =>
      [item?.title, item?.description, item?.audience, item?.screen].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [screens, searchTerm]);
  const visibleScreens = filteredScreens.slice(0, Number(entries));
  const openCreateModal = () => {
    setEditingId('');
    setForm(emptyForm);
    setIsModalOpen(true);
  };
  const openEditModal = (screen) => {
    setEditingId(String(screen?._id || ''));
    setForm({
      audience: screen?.audience || screen?.screen || 'user',
      order: Number(screen?.order || 1),
      title: screen?.title || '',
      description: screen?.description || '',
      active: screen?.active !== false,
    });
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId('');
    setForm(emptyForm);
  };
  const handleSubmit = async () => {
    const payload = {
      audience: form.audience,
      order: Number(form.order || 1),
      title: String(form.title || '').trim(),
      description: String(form.description || '').trim(),
      active: form.active,
    };
    if (!payload.title) {
      toast.error('Title is required');
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await adminService.updateOnboardingScreen(editingId, payload);
        toast.success('Onboarding screen updated');
      } else {
        await adminService.createOnboardingScreen(payload);
        toast.success('Onboarding screen created');
      }
      closeModal();
      await fetchAllScreens();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save onboarding screen');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id) => {
    if (!(await window.confirmAsync('Delete this onboarding screen?'))) {
      return;
    }
    try {
      await adminService.deleteOnboardingScreen(id);
      toast.success('Onboarding screen deleted');
      await fetchAllScreens();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete onboarding screen');
    }
  };
  const COLS = [100, 70, 230, 110, 100];
  const modal = isModalOpen ? (
    <Overlay onClose={closeModal} className="absolute inset-0 z-50 items-center justify-center bg-slate-950/40 p-4">
      <ScrollDiv className="w-full max-w-xl rounded-xl border border-slate-200 bg-white" contentClassName="p-4">
        <Div className="flex-row items-start justify-between gap-3 mb-4">
          <Div className="flex-1 min-w-0">
            <P className="text-base font-semibold text-slate-900">{editingId ? 'Edit onboarding screen' : 'Add onboarding screen'}</P>
            <P className="text-sm text-slate-500">Manage the landing content shown before app sign-in.</P>
          </Div>
          <Button type="button" onClick={closeModal} accessibilityLabel="Close" className="w-11 h-11 rounded-lg border border-slate-300 bg-white items-center justify-center">
            <UiIcon as={X} size={16} className="text-slate-700" />
          </Button>
        </Div>

        <Div className="gap-4">
          <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
            <Field label="Audience" className="flex-1">
              <Select
                value={form.audience}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    audience: e.target.value,
                  }))
                }
                className={INPUT}
              >
                <Option value="user">User</Option>
                <Option value="driver">Driver</Option>
                <Option value="owner">Owner</Option>
              </Select>
            </Field>
            <Field label="Order" className="flex-1">
              <Input
                type="number"
                min="1"
                value={form.order}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    order: e.target.value,
                  }))
                }
                className={INPUT}
              />
            </Field>
          </Div>

          <Field label="Title" required>
            <Input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  title: e.target.value,
                }))
              }
              className={INPUT}
              placeholder="Enter onboarding title"
            />
          </Field>

          <Field label="Description">
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              placeholder="Enter onboarding description"
            />
          </Field>

          <Div className="flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Div className="flex-1 min-w-0">
              <P className="text-sm font-semibold text-slate-900">Show this screen in app</P>
              <P className="text-xs text-slate-500">Disable it when the screen should stay hidden.</P>
            </Div>
            <Switch
              checked={form.active}
              onCheckedChange={() =>
                setForm((current) => ({
                  ...current,
                  active: !current.active,
                }))
              }
            />
          </Div>

          <Div className="flex-row flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <Button type="button" onClick={handleSubmit} disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-60' : ''}`}>
              <UiIcon as={saving ? Loader2 : Save} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : editingId ? 'Update screen' : 'Create screen'}</Span>
            </Button>
            <Button type="button" onClick={closeModal} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
          </Div>
        </Div>
      </ScrollDiv>
    </Overlay>
  ) : null;

  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={LayoutList}
        title="Landing & Onboarding"
        subtitle="Screens shown before app sign-in"
        breadcrumb={[{ label: 'Settings' }, { label: 'App Configuration' }, { label: 'Onboarding Flow' }]}
        actions={
          <>
            <Button type="button" onClick={openCreateModal} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add screen</Span>
            </Button>
            <Button onClick={() => window.history.back()} className={BTN_SECONDARY}>
              <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>Back</Span>
            </Button>
          </>
        }
      />

      <StatGrid className="mb-4">
        {['user', 'driver', 'owner'].map((role) => (
          <StatCard
            key={role}
            label={`${role} screens`}
            value={screens.filter((s) => (s?.audience || s?.screen) === role).length}
            icon={Users}
            tone="info"
          />
        ))}
      </StatGrid>

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter onboarding content…"
              className={`${INPUT} flex-1`}
            />
          </Div>
          <Select value={entries} onChange={(e) => setEntries(Number(e.target.value))} className={INPUT}>
            <Option value={10}>Show 10</Option>
            <Option value={20}>Show 20</Option>
            <Option value={50}>Show 50</Option>
          </Select>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : loadError ? (
        <ErrorState title="Could not load screens" message={loadError} onRetry={fetchAllScreens} />
      ) : visibleScreens.length === 0 ? (
        <EmptyState
          icon={LayoutList}
          title="No onboarding screens"
          message={searchTerm ? 'No screen matches this filter.' : 'Add a screen to shape what people see before sign-in.'}
          actionLabel="Add screen"
          onAction={openCreateModal}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={['Audience', 'Order', 'Title & description', 'Status', 'Actions']} />
            <TBody>
              {visibleScreens.map((screen, i) => {
                const audience = screen?.audience || screen?.screen || 'user';
                return (
                  <Row key={screen._id} last={i === visibleScreens.length - 1}>
                    <Cell width={COLS[0]}>
                      <StatusBadge tone="info" label={audience} />
                    </Cell>
                    <Cell width={COLS[1]} align="center">{String(screen?.order || 0).padStart(2, '0')}</Cell>
                    <Cell width={COLS[2]}>
                      <Div className="gap-1">
                        <P className="text-sm font-semibold text-slate-900">{screen?.title}</P>
                        <P className="text-xs text-slate-500">{screen?.description}</P>
                      </Div>
                    </Cell>
                    <Cell width={COLS[3]}>
                      <StatusBadge status={screen?.active ? 'active' : 'disabled'} label={screen?.active ? 'Live' : 'Hidden'} />
                    </Cell>
                    <Cell width={COLS[4]}>
                      <Div className="flex-row items-center gap-1">
                        <Button
                          onClick={() => openEditModal(screen)}
                          accessibilityLabel="Edit screen"
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Edit} size={16} className="text-slate-600" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(screen._id)}
                          accessibilityLabel="Delete screen"
                          className="w-11 h-11 rounded-lg items-center justify-center"
                        >
                          <UiIcon as={Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    </Cell>
                  </Row>
                );
              })}
            </TBody>
          </DataTable>
          <P className="text-xs text-slate-500 mt-3">
            Showing {visibleScreens.length} of {filteredScreens.length} registry items
          </P>
        </>
      )}

      {modal}
    </AdminPage>
  );
};
export default OnboardingScreens;
