import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  ChevronRight,
  Loader2,
  X,
  ArrowLeft,
  Search,
  CheckCircle2,
  Edit,
  Trash2,
  Users,
  Save,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

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
    const keyword = String(searchTerm || '').trim().toLowerCase();
    if (!keyword) {
      return screens;
    }

    return screens.filter((item) =>
      [item?.title, item?.description, item?.audience, item?.screen]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
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
    if (!window.confirm('Delete this onboarding screen?')) {
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
    <div className="min-h-screen bg-neutral-50 p-6 lg:p-8 font-sans">
      <div className="mb-8">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
          <span>Settings</span>
          <ChevronRight size={12} />
          <span>App configuration</span>
          <ChevronRight size={12} />
          <span className="text-neutral-700">Onboarding flow</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-neutral-900 font-medium">Landing & onboarding</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <Plus size={16} /> Add screen
            </button>
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm"
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['user', 'driver', 'owner'].map((role) => (
            <div key={role} className="bg-white rounded-xl border border-neutral-200 p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${role === 'user' ? 'bg-neutral-50 text-[#0a4d2b]' : role === 'driver' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                <Users size={20} />
              </div>
              <div>
                <h4 className="text-xs text-neutral-500">{role} screens</h4>
                <p className="text-xl font-medium text-neutral-900">
                  {screens.filter((s) => (s?.audience || s?.screen) === role).length}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter onboarding content"
                className="w-full pl-11 pr-4 py-2.5 bg-neutral-50/50 border border-neutral-200 rounded-lg text-sm focus:bg-white focus:border-neutral-400 outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500 mr-2">Show</label>
              <select
                value={entries}
                onChange={(e) => setEntries(Number(e.target.value))}
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-700 outline-none focus:border-neutral-400"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-xs text-neutral-500">
                  <th className="px-6 py-4">Audience</th>
                  <th className="px-6 py-4 text-center">Order</th>
                  <th className="px-6 py-4">Title & description</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="5" className="px-6 py-10"><div className="h-4 bg-neutral-50 rounded w-full" /></td>
                    </tr>
                  ))
                ) : visibleScreens.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center text-neutral-500 text-sm">No onboarding screens found in the registry</td>
                  </tr>
                ) : (
                  visibleScreens.map((screen) => {
                    const audience = screen?.audience || screen?.screen || 'user';
                    return (
                      <tr key={screen._id} className="group hover:bg-neutral-50/70 transition-colors">
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-medium   border ${audience === 'driver' ? 'bg-amber-50 text-amber-600 border-amber-100' : audience === 'owner' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-neutral-50 text-[#0a4d2b] border-neutral-200'}`}>
                            {audience}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-xs text-neutral-500">{String(screen?.order || 0).padStart(2, '0')}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div>
                            <p className="text-sm font-medium text-neutral-900 mb-0.5">{screen?.title}</p>
                            <p className="text-xs text-neutral-500 leading-relaxed max-w-md">{screen?.description}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {screen?.active ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                              <CheckCircle2 size={10} /> Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-50 text-neutral-500 text-xs">
                              Hidden
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditModal(screen)} className="p-2.5 text-neutral-500 hover:text-[#0a4d2b] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-neutral-200"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(screen._id)} className="p-2.5 text-neutral-500 hover:text-red-500 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-red-100"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
            <div className="text-xs text-neutral-500">
              Showing {visibleScreens.length ? 1 : 0} to {visibleScreens.length} of {filteredScreens.length} Registry Items
            </div>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-neutral-900/[0.08] bg-white">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <div>
                <h2 className="text-lg text-neutral-900 font-medium">{editingId ? 'Edit Onboarding Screen' : 'Add Onboarding Screen'}</h2>
                <p className="text-sm text-neutral-500">Manage the landing content shown before app sign-in</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:bg-neutral-50">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 px-6 py-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-neutral-500">Audience</label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm((current) => ({ ...current, audience: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400 focus:ring-1 focus:ring-[#0a4d2b]/30"
                >
                  <option value="user">User</option>
                  <option value="driver">Driver</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-neutral-500">Order</label>
                <input
                  type="number"
                  min="1"
                  value={form.order}
                  onChange={(e) => setForm((current) => ({ ...current, order: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400 focus:ring-1 focus:ring-[#0a4d2b]/30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium text-neutral-500">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400 focus:ring-1 focus:ring-[#0a4d2b]/30"
                  placeholder="Enter onboarding title"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium text-neutral-500">Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400 focus:ring-1 focus:ring-[#0a4d2b]/30"
                  placeholder="Enter onboarding description"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Show this screen in app</p>
                  <p className="text-xs text-neutral-500">Disable it when the screen should stay hidden</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, active: !current.active }))}
                  className={`relative h-7 w-12 rounded-full transition-colors ${form.active ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-colors ${form.active ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4">
              <button type="button" onClick={closeModal} className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : editingId ? 'Update Screen' : 'Create Screen'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OnboardingScreens;
