/**
 * Promo codes for tour packages.
 *
 * The discount is never computed here — this screen only describes a code, and
 * the server decides what it is worth when a traveller quotes a trip. That keeps
 * the figure shown at checkout and the figure charged in one place.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState } from '../components/ui';

const field = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 transition';
const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';

const BLANK = {
  code: '', title: '', description: '',
  discountType: 'percentage', discountValue: '', maxDiscount: '', minBookingAmount: '',
  startDate: '', endDate: '',
  usageLimit: 1000, userLimit: 1,
  packageIds: [],
  isActive: true,
};

/** yyyy-mm-dd for a date input, which will not accept an ISO timestamp. */
const dateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const fromOffer = (o) => (!o ? BLANK : {
  ...BLANK,
  ...Object.fromEntries(Object.entries(o).filter(([k]) => k in BLANK)),
  maxDiscount: o.maxDiscount ?? '',
  minBookingAmount: o.minBookingAmount ?? '',
  startDate: dateInput(o.startDate),
  endDate: dateInput(o.endDate),
  packageIds: (o.packageIds || []).map(String),
});

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** What a code is worth, in words — the same rule the server applies. */
const worthOf = (o) => (o.discountType === 'flat'
  ? `${rupees(o.discountValue)} off`
  : `${o.discountValue}% off${o.maxDiscount ? ` up to ${rupees(o.maxDiscount)}` : ''}`);

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list, {} = new, {...} = edit
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getOffers();
      setOffers(data.offers || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scope lists are only needed by the form; failing to load one should narrow
  // the choices, not stop an admin creating a platform-wide code.
  useEffect(() => {
    adminService.getPackages({ status: 'approved' })
      .then((d) => setPackages(d.packages || []))
      .catch(() => setPackages([]));
  }, []);

  const openNew = () => { setForm(BLANK); setEditing({}); };
  const openEdit = (o) => { setForm(fromOffer(o)); setEditing(o); };
  const closeForm = () => { setEditing(null); setConfirmingId(null); };

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleScope = (key, id) => setForm((current) => ({
    ...current,
    [key]: current[key].includes(id)
      ? current[key].filter((v) => v !== id)
      : [...current[key], id],
  }));

  const preview = useMemo(() => {
    const value = Number(form.discountValue) || 0;
    if (!value) return '';
    return worthOf({ ...form, discountValue: value, maxDiscount: Number(form.maxDiscount) || 0 });
  }, [form]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.code.trim()) return toast.error('Give the offer a code');
    if (!form.title.trim()) return toast.error('Give the offer a title');
    if (!(Number(form.discountValue) > 0)) return toast.error('Set a discount greater than zero');

    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      discountValue: Number(form.discountValue),
      maxDiscount: form.maxDiscount === '' ? undefined : Number(form.maxDiscount),
      minBookingAmount: Number(form.minBookingAmount) || 0,
      usageLimit: Number(form.usageLimit) || 0,
      userLimit: Number(form.userLimit) || 1,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    };

    try {
      setSaving(true);
      const result = editing?._id
        ? await adminService.updateOffer(editing._id, payload)
        : await adminService.createOffer(payload);
      toast.success(result.message || 'Saved');
      closeForm();
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not save this offer');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (o) => {
    try {
      setBusyId(o._id);
      await adminService.toggleOffer(o._id, !o.isActive);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this offer');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (o) => {
    // Two taps rather than a dialog — window.confirm is suppressed in the
    // embedded browser the admins use.
    if (confirmingId !== o._id) return setConfirmingId(o._id);
    try {
      setBusyId(o._id);
      await adminService.deleteOffer(o._id);
      toast.success('Offer deleted');
      setConfirmingId(null);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not delete this offer');
    } finally {
      setBusyId(null);
    }
  };

  /* ----------------------------- form ----------------------------- */
  if (editing) {
    return (
      <form onSubmit={submit} className="space-y-6 max-w-4xl">
        <PageHeader
          title={editing._id ? `Edit ${editing.code}` : 'Create an offer'}
          subtitle="Travellers enter this code on the tour booking screen."
        />

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">The code</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={label}>Code <span className="text-red-500">*</span></label>
              <input className={`${field} uppercase tracking-wide font-bold`} value={form.code}
                onChange={(e) => setForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
                placeholder="MONSOON20" /></div>
            <div><label className={label}>Title <span className="text-red-500">*</span></label>
              <input className={field} value={form.title} onChange={set('title')}
                placeholder="Monsoon 20% off" /></div>
          </div>

          <div><label className={label}>Description</label>
            <input className={field} value={form.description} onChange={set('description')}
              placeholder="Shown under the code on the booking screen" /></div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">What it is worth</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={label}>Discount type</label>
              <select className={field} value={form.discountType} onChange={set('discountType')}>
                <option value="percentage">Percentage of the fare</option>
                <option value="flat">Flat amount</option>
              </select></div>
            <div><label className={label}>
              {form.discountType === 'flat' ? 'Amount off (₹)' : 'Percent off (%)'} <span className="text-red-500">*</span>
            </label>
              <input className={field} type="number" min="0" value={form.discountValue}
                onChange={set('discountValue')} /></div>
            {form.discountType === 'percentage' && (
              <div><label className={label}>Cap the discount at (₹)</label>
                <input className={field} type="number" min="0" value={form.maxDiscount}
                  onChange={set('maxDiscount')} placeholder="Leave blank for no cap" /></div>
            )}
            <div><label className={label}>Minimum fare (₹)</label>
              <input className={field} type="number" min="0" value={form.minBookingAmount}
                onChange={set('minBookingAmount')} />
              <p className="text-xs text-gray-400 mt-1.5">Below this the code is refused.</p></div>
          </div>

          {preview && (
            <p className="text-sm font-semibold text-[#0a4d2b] bg-[#0a4d2b]/5 rounded-xl px-3 py-2.5">
              Travellers will see: <strong>{preview}</strong>
            </p>
          )}
          <p className="text-xs text-gray-400">
            The discount comes off the fare. Tax and the platform commission are still
            charged on the undiscounted fare.
          </p>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">When and how often</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={label}>Starts</label>
              <input className={field} type="date" value={form.startDate} onChange={set('startDate')} />
              <p className="text-xs text-gray-400 mt-1.5">Blank means immediately.</p></div>
            <div><label className={label}>Ends</label>
              <input className={field} type="date" value={form.endDate} onChange={set('endDate')} />
              <p className="text-xs text-gray-400 mt-1.5">Blank means it never expires.</p></div>
            <div><label className={label}>Total redemptions</label>
              <input className={field} type="number" min="0" value={form.usageLimit} onChange={set('usageLimit')} />
              <p className="text-xs text-gray-400 mt-1.5">0 means unlimited.</p></div>
            <div><label className={label}>Per traveller</label>
              <input className={field} type="number" min="1" value={form.userLimit} onChange={set('userLimit')} /></div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            <span><strong>Live</strong> — travellers can use it</span>
          </label>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">Where it applies</h3>
          <p className="text-xs text-gray-500">Select nothing to let the code work on every tour.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={label}>Packages</label>
              <div className="border border-gray-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-gray-100">
                {packages.length === 0 ? (
                  <p className="text-xs text-gray-400 p-3">No approved packages.</p>
                ) : packages.map((p) => (
                  <label key={p._id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={form.packageIds.includes(String(p._id))}
                      onChange={() => toggleScope('packageIds', String(p._id))} />
                    <span className="truncate">{p.title}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3 pb-8">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editing._id ? 'Save changes' : 'Create offer'}
          </button>
          <button type="button" onClick={closeForm}
            className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  /* ----------------------------- list ----------------------------- */
  return (
    <div className="space-y-5">
      <PageHeader
        title="Offers"
        subtitle="Promo codes travellers can use on tour bookings."
        action={
          <button type="button" onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e]">
            <Plus size={16} /> Create an offer
          </button>
        }
      />

      {loading ? (
        <Spinner />
      ) : offers.length === 0 ? (
        <EmptyState message="No offers yet — create the first one." />
      ) : (
        <div className="space-y-3">
          {offers.map((o) => {
            const expired = o.endDate && new Date(o.endDate) < new Date();
            const exhausted = o.usageLimit > 0 && o.usageCount >= o.usageLimit;
            return (
              <div key={o._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0a4d2b]/10 text-[#0a4d2b] grid place-items-center shrink-0">
                  <Tag size={20} />
                </div>

                <div className="flex-1 basis-48 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black tracking-wide text-gray-900">{o.code}</p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                      {worthOf(o)}
                    </span>
                    {!o.isActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700">paused</span>
                    )}
                    {expired && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">expired</span>
                    )}
                    {exhausted && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">used up</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{o.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Used {o.usageCount}{o.usageLimit > 0 ? ` of ${o.usageLimit}` : ''}
                    {o.minBookingAmount > 0 ? ` · min ${rupees(o.minBookingAmount)}` : ''}
                    {o.packageIds?.length ? ` · ${o.packageIds.length} package(s)` : ''}
                    {o.endDate ? ` · until ${new Date(o.endDate).toLocaleDateString('en-IN')}` : ''}
                  </p>
                </div>

                <div className="flex flex-row-reverse sm:flex-col items-center sm:items-end justify-end gap-3 sm:gap-2 w-full sm:w-auto shrink-0">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    <input type="checkbox" checked={o.isActive} disabled={busyId === o._id} onChange={() => toggle(o)} />
                    Live
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => openEdit(o)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50">
                      Edit
                    </button>
                    <button type="button" disabled={busyId === o._id} onClick={() => remove(o)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50 ${
                        confirmingId === o._id
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'text-red-600 hover:bg-red-50'
                      }`}>
                      {confirmingId === o._id ? 'Delete for good?' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Offers;
