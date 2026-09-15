/**
 * Tourist destination management.
 *
 * Scope of work section 9 — the destination directory an admin curates and
 * travellers browse at /app/places. Before this the three places were
 * hard-coded in the frontend, so adding one meant a code change.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import adminService from '../../../services/adminService';
import ImageField, { ImageListField } from '../components/ImageField';
import { PageHeader, Spinner, EmptyState } from '../components/ui';

const CATEGORIES = ['viewpoint', 'town', 'trek', 'temple', 'lake', 'wildlife'];

const field = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 transition';
const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';

const toLines = (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);

const BLANK = {
  name: '', subtitle: '', location: '', fullAddress: '',
  distanceFromStation: '', travelTime: '', bestTime: '', idealFor: '',
  description: '', aboutDetails: '', guideTips: '',
  mainImage: '', heroImage: '', insetImage: '', guideSunsetImage: '', gallery: [],
  category: 'viewpoint', isActive: true, isFeatured: false, sortOrder: 0,
  lat: '', lng: '',
};

/** A saved destination → the textarea-shaped state this form edits. */
const fromDestination = (d) => (!d ? BLANK : {
  ...BLANK,
  ...Object.fromEntries(Object.keys(BLANK)
    .filter((k) => d[k] !== undefined && d[k] !== null && !Array.isArray(d[k]))
    .map((k) => [k, d[k]])),
  aboutDetails: (d.aboutDetails || []).join('\n'),
  guideTips: (d.guideTips || []).join('\n'),
  gallery: d.gallery || [],
  lat: d.coordinates?.lat ?? '',
  lng: d.coordinates?.lng ?? '',
});

const Destinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list, {} = new, {...} = edit
  const [form, setForm] = useState(BLANK);
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getDestinations();
      setDestinations(data.destinations || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load destinations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(BLANK); setTags([]); setEditing({}); };
  const openEdit = (d) => { setForm(fromDestination(d)); setTags(d.tags || []); setEditing(d); };
  const closeForm = () => { setEditing(null); setConfirmingId(null); };

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Give the place a name');
    if (!form.mainImage) return toast.error('Upload a main image');

    const payload = {
      ...form,
      name: form.name.trim(),
      aboutDetails: toLines(form.aboutDetails),
      guideTips: toLines(form.guideTips),
      gallery: form.gallery,
      tags: tags.filter((t) => String(t.text || '').trim()),
      sortOrder: Number(form.sortOrder) || 0,
      coordinates: {
        lat: form.lat === '' ? undefined : Number(form.lat),
        lng: form.lng === '' ? undefined : Number(form.lng),
      },
    };
    delete payload.lat;
    delete payload.lng;

    try {
      setSaving(true);
      const result = editing?._id
        ? await adminService.updateDestination(editing._id, payload)
        : await adminService.createDestination(payload);
      toast.success(result.message || 'Saved');
      closeForm();
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not save this destination');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (d) => {
    try {
      setBusyId(d._id);
      await adminService.toggleDestination(d._id, !d.isActive);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this destination');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (d) => {
    // Deletes the images with it, so it asks twice rather than via a dialog
    // the embedded browser would suppress.
    if (confirmingId !== d._id) return setConfirmingId(d._id);
    try {
      setBusyId(d._id);
      await adminService.deleteDestination(d._id);
      toast.success('Destination deleted');
      setConfirmingId(null);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not delete this destination');
    } finally {
      setBusyId(null);
    }
  };

  /* ----------------------------- form ----------------------------- */
  if (editing) {
    return (
      <form onSubmit={submit} className="space-y-6 max-w-4xl">
        <PageHeader
          title={editing._id ? `Edit ${editing.name}` : 'Add a destination'}
          subtitle="This is what travellers see under Tourist Places in the app."
        />

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">The place</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={label}>Name <span className="text-red-500">*</span></label>
              <input className={field} value={form.name} onChange={set('name')} placeholder="e.g. JATINGA VIEWPOINT" /></div>
            <div><label className={label}>Subtitle</label>
              <input className={field} value={form.subtitle} onChange={set('subtitle')} placeholder="JATINGA VIEW POINT & SHIVRAI TEMPLE" /></div>
            <div><label className={label}>Short location</label>
              <input className={field} value={form.location} onChange={set('location')} placeholder="Jatinga, Dima Hasao" /></div>
            <div><label className={label}>Category</label>
              <select className={field} value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></div>
          </div>

          <div><label className={label}>Full address</label>
            <input className={field} value={form.fullAddress} onChange={set('fullAddress')} /></div>

          <div><label className={label}>Description</label>
            <textarea className={field} rows={3} value={form.description} onChange={set('description')} /></div>

          <div><label className={label}>About — one paragraph per line</label>
            <textarea className={field} rows={4} value={form.aboutDetails} onChange={set('aboutDetails')} /></div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">Getting there</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={label}>Distance from station</label>
              <input className={field} value={form.distanceFromStation} onChange={set('distanceFromStation')} placeholder="2.0 km" /></div>
            <div><label className={label}>Travel time</label>
              <input className={field} value={form.travelTime} onChange={set('travelTime')} placeholder="15 min (Approx.)" /></div>
            <div><label className={label}>Best time to visit</label>
              <input className={field} value={form.bestTime} onChange={set('bestTime')} placeholder="October to March" /></div>
            <div><label className={label}>Ideal for</label>
              <input className={field} value={form.idealFor} onChange={set('idealFor')} placeholder="Photography, Sightseeing" /></div>
            <div><label className={label}>Latitude</label>
              <input className={field} type="number" step="any" value={form.lat} onChange={set('lat')} /></div>
            <div><label className={label}>Longitude</label>
              <input className={field} type="number" step="any" value={form.lng} onChange={set('lng')} /></div>
          </div>
          <div><label className={label}>Travel tips — one per line</label>
            <textarea className={field} rows={3} value={form.guideTips} onChange={set('guideTips')} /></div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">Photos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageField label="Main image *" value={form.mainImage}
              onChange={(url) => setForm((c) => ({ ...c, mainImage: url }))}
              hint="Shown on the card and at the top of the detail page." />
            <ImageField label="Hero banner" value={form.heroImage}
              onChange={(url) => setForm((c) => ({ ...c, heroImage: url }))} />
            <ImageField label="Inset thumbnail" value={form.insetImage}
              onChange={(url) => setForm((c) => ({ ...c, insetImage: url }))} />
            <ImageField label="Sunset / guide image" value={form.guideSunsetImage}
              onChange={(url) => setForm((c) => ({ ...c, guideSunsetImage: url }))} />
          </div>
          <ImageListField label="Gallery" value={form.gallery}
            onChange={(urls) => setForm((c) => ({ ...c, gallery: urls }))} max={8} />
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">Highlight tags</h3>
            <button type="button"
              onClick={() => setTags((c) => [...c, { icon: 'fa-solid fa-camera', text: '', color: 'text-emerald-600' }])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600">
              <Plus size={12} /> Add
            </button>
          </div>
          {tags.map((tag, index) => (
            <div key={index} className="flex items-center gap-2">
              <input className={field} value={tag.text} placeholder="Scenic View"
                onChange={(e) => setTags((c) => c.map((t, i) => (i === index ? { ...t, text: e.target.value } : t)))} />
              <input className={`${field} max-w-[190px]`} value={tag.icon} placeholder="fa-solid fa-camera"
                onChange={(e) => setTags((c) => c.map((t, i) => (i === index ? { ...t, icon: e.target.value } : t)))} />
              <button type="button" onClick={() => setTags((c) => c.filter((_, i) => i !== index))}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg" aria-label="Remove tag">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div><label className={label}>Sort order</label>
              <input className={field} type="number" value={form.sortOrder} onChange={set('sortOrder')} />
              <p className="text-xs text-gray-400 mt-1.5">Lower shows first.</p></div>
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
              <span><strong>Visible</strong> in the app</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} />
              <span><strong>Featured</strong></span>
            </label>
          </div>
        </section>

        <div className="flex items-center gap-3 pb-8">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editing._id ? 'Save changes' : 'Add destination'}
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
        title="Tourist Places"
        subtitle="The destination directory travellers browse in the app."
        action={
          <button type="button" onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e]">
            <Plus size={16} /> Add a place
          </button>
        }
      />

      {loading ? (
        <Spinner />
      ) : destinations.length === 0 ? (
        <EmptyState message="No destinations yet — add the first one." />
      ) : (
        <div className="space-y-3">
          {destinations.map((d) => (
            <div key={d._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-start gap-4">
              <img src={d.mainImage} alt="" className="w-24 h-20 rounded-xl object-cover bg-gray-100 shrink-0"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />

              <div className="flex-1 basis-48 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-gray-900">{d.name}</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">{d.category}</span>
                  {!d.isActive && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700">hidden</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{d.location}</p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{d.description}</p>
              </div>

              <div className="flex flex-row-reverse sm:flex-col items-center sm:items-end justify-end gap-3 sm:gap-2 w-full sm:w-auto shrink-0">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <input type="checkbox" checked={d.isActive} disabled={busyId === d._id} onChange={() => toggle(d)} />
                  Visible
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => openEdit(d)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50">
                    Edit
                  </button>
                  <button type="button" disabled={busyId === d._id} onClick={() => remove(d)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50 ${
                      confirmingId === d._id
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'text-red-600 hover:bg-red-50'
                    }`}>
                    {confirmingId === d._id ? 'Delete for good?' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Destinations;
