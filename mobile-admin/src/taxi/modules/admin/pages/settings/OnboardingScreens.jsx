/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/settings/OnboardingScreens.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, ChevronRight, Loader2, X, ArrowLeft, Search, CheckCircle2, Edit, Trash2, Users, Save } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import {
  Button,
  Div,
  H1,
  H2,
  H4,
  Input,
  Label,
  Option,
  Overlay,
  P,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../../components/web';
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
  const fetchAllScreens = async () => {
    try {
      setLoading(true);
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
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8 font-sans">
      <Div className="mb-8">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Settings</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span>App Configuration</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Onboarding Flow</Span>
        </Div>
        <Div className="flex items-center justify-between">
          <H1 className="text-xl text-gray-900 font-bold">Landing & Onboarding</H1>
          <Div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <UiIcon as={Plus} size={16} /> Add Screen
            </Button>
            <Button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <UiIcon as={ArrowLeft} size={16} /> Back
            </Button>
          </Div>
        </Div>
      </Div>

      <Div className="space-y-6">
        <Div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['user', 'driver', 'owner'].map((role) => (
            <Div key={role} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <Div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${role === 'user' ? 'bg-indigo-50 text-indigo-600' : role === 'driver' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}
              >
                <UiIcon as={Users} size={20} />
              </Div>
              <Div>
                <H4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{role} screens</H4>
                <P className="text-xl font-black text-gray-900">{screens.filter((s) => (s?.audience || s?.screen) === role).length}</P>
              </Div>
            </Div>
          ))}
        </Div>

        <Div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <Div className="relative flex-1 max-w-sm">
              <UiIcon as={Search} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter onboarding content..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
            </Div>
            <Div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-gray-400 uppercase mr-2">Show</Label>
              <Select
                value={entries}
                onChange={(e) => setEntries(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500"
              >
                <Option value={10}>10</Option>
                <Option value={20}>20</Option>
                <Option value={50}>50</Option>
              </Select>
            </Div>
          </Div>

          <Div>
            <Table cols={[130, 90, 240, 120, 132]} className="w-full text-left border-collapse">
              <Thead>
                <Tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <Th className="px-6 py-4">Audience</Th>
                  <Th className="px-6 py-4 text-center">Order</Th>
                  <Th className="px-6 py-4">Title & Description</Th>
                  <Th className="px-6 py-4 text-center">Status</Th>
                  <Th className="px-6 py-4 text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody className="divide-y divide-gray-100 font-medium">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <Tr key={i} className="animate-pulse">
                      <Td colSpan="5" className="px-6 py-10">
                        <Div className="h-4 bg-gray-50 rounded w-full" />
                      </Td>
                    </Tr>
                  ))
                ) : visibleScreens.length === 0 ? (
                  <Tr>
                    <Td colSpan="5" className="px-6 py-20 text-center text-gray-400 text-sm italic">
                      No onboarding screens found in the registry.
                    </Td>
                  </Tr>
                ) : (
                  visibleScreens.map((screen) => {
                    const audience = screen?.audience || screen?.screen || 'user';
                    return (
                      <Tr key={screen._id} className="group hover:bg-gray-50/70 transition-colors">
                        <Td className="px-6 py-5">
                          <Span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${audience === 'driver' ? 'bg-amber-50 text-amber-600 border-amber-100' : audience === 'owner' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}
                          >
                            {audience}
                          </Span>
                        </Td>
                        <Td className="px-6 py-5 text-center">
                          <Span className="text-xs font-black text-gray-400">{String(screen?.order || 0).padStart(2, '0')}</Span>
                        </Td>
                        <Td className="px-6 py-5">
                          <Div>
                            <P className="text-sm font-bold text-gray-900 mb-0.5">{screen?.title}</P>
                            <P className="text-[11px] text-gray-400 font-medium leading-relaxed max-w-md">{screen?.description}</P>
                          </Div>
                        </Td>
                        <Td className="px-6 py-5 text-center">
                          {screen?.active ? (
                            <Span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">
                              <UiIcon as={CheckCircle2} size={10} /> Live
                            </Span>
                          ) : (
                            <Span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-400 text-[10px] font-bold uppercase">
                              Hidden
                            </Span>
                          )}
                        </Td>
                        <Td className="px-6 py-5 text-right">
                          <Div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => openEditModal(screen)}
                              className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-indigo-100"
                            >
                              <UiIcon as={Edit} size={16} />
                            </Button>
                            <Button
                              onClick={() => handleDelete(screen._id)}
                              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all border border-transparent hover:border-red-100"
                            >
                              <UiIcon as={Trash2} size={16} />
                            </Button>
                          </Div>
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </Div>

          <Div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <Div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
              Showing {visibleScreens.length ? 1 : 0} to {visibleScreens.length} of {filteredScreens.length} Registry Items
            </Div>
          </Div>
        </Div>
      </Div>

      {isModalOpen ? (
        <Overlay onClose={closeModal} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <ScrollDiv className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <Div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <Div>
                <H2 className="text-lg text-slate-900 font-bold">{editingId ? 'Edit Onboarding Screen' : 'Add Onboarding Screen'}</H2>
                <P className="text-sm text-slate-500">Manage the landing content shown before app sign-in.</P>
              </Div>
              <Button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <UiIcon as={X} size={16} />
              </Button>
            </Div>

            <Div className="grid grid-cols-1 gap-5 px-6 py-5 md:grid-cols-2">
              <Div>
                <Label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Audience</Label>
                <Select
                  value={form.audience}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      audience: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <Option value="user">User</Option>
                  <Option value="driver">Driver</Option>
                  <Option value="owner">Owner</Option>
                </Select>
              </Div>

              <Div>
                <Label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Order</Label>
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </Div>

              <Div className="md:col-span-2">
                <Label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Title</Label>
                <Input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      title: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter onboarding title"
                />
              </Div>

              <Div className="md:col-span-2">
                <Label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Description</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter onboarding description"
                />
              </Div>

              <Div className="md:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Div>
                  <P className="text-sm font-semibold text-slate-900">Show this screen in app</P>
                  <P className="text-xs text-slate-500">Disable it when the screen should stay hidden.</P>
                </Div>
                <Button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      active: !current.active,
                    }))
                  }
                  className={`relative h-7 w-12 rounded-full transition-colors ${form.active ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <Span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${form.active ? 'right-1' : 'left-1'}`} />
                </Button>
              </Div>
            </Div>

            <Div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <Button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={Save} size={16} />}
                {saving ? 'Saving...' : editingId ? 'Update Screen' : 'Create Screen'}
              </Button>
            </Div>
          </ScrollDiv>
        </Overlay>
      ) : null}
    </ScrollDiv>
  );
};
export default OnboardingScreens;
