/**
 * Tourist destination management.
 *
 * Scope of work section 9 — the destination directory an admin curates and
 * travellers browse at /app/places. Before this the three places were
 * hard-coded in the frontend, so adding one meant a code change.
 *
 * The add/edit form is a short wizard rather than one long page: each step
 * mirrors a section of what the visitor actually sees (the place, how to
 * reach it, its photos, then visibility) so filling it in follows the same
 * order as reading the result.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2, ChevronLeft, ChevronRight, MapPin, MapPinOff, Route, Image as ImageIcon, Sparkles, Mountain, Building2, Footprints, Landmark, Waves, PawPrint, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

import adminService from '../../../services/adminService';
import ImageField, { ImageListField } from '../components/ImageField';
import LocationPicker from '../components/LocationPicker';
import { PlaceSearch } from '../components/PlaceListField';
import { PageHeader, Spinner, EmptyState, StatCard, StepIndicator, IconAction } from '../components/ui';

const CATEGORIES = ['viewpoint', 'town', 'trek', 'temple', 'lake', 'wildlife'];
const CATEGORY_ICON = { viewpoint: Mountain, town: Building2, trek: Footprints, temple: Landmark, lake: Waves, wildlife: PawPrint };

const field = 'w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm outline-none focus:border-[#0a4d2b] focus:ring-2 focus:ring-[#0a4d2b]/20 transition-colors';
const label = 'block text-[13px] font-medium text-neutral-700 mb-1.5';

const toLines = (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);

const STEPS = [
  { key: 'place', label: 'The place', icon: MapPin },
  { key: 'reach', label: 'Getting there', icon: Route },
  { key: 'photos', label: 'Photos', icon: ImageIcon },
  { key: 'finish', label: 'Visibility', icon: Sparkles },
];

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

const CategoryBadge = ({ category }) => {
  const Icon = CATEGORY_ICON[category] || MapPin;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
      <Icon size={11} /> {category}
    </span>
  );
};

const Destinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list, {} = new, {...} = edit
  const [step, setStep] = useState(0);
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

  const openNew = () => { setForm(BLANK); setTags([]); setStep(0); setEditing({}); };
  const openEdit = (d) => { setForm(fromDestination(d)); setTags(d.tags || []); setStep(0); setEditing(d); };
  const closeForm = () => { setEditing(null); setConfirmingId(null); };

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setCoords = ({ lat, lng }) => setForm((c) => ({ ...c, lat: lat.toFixed(6), lng: lng.toFixed(6) }));

  const goNext = () => {
    if (step === 0 && !form.name.trim()) return toast.error('Give the place a name first');
    if (step === 1) {
      const lat = form.lat === '' ? null : Number(form.lat);
      const lng = form.lng === '' ? null : Number(form.lng);
      if ((lat !== null && !(lat >= -90 && lat <= 90)) || (lng !== null && !(lng >= -180 && lng <= 180))) {
        return toast.error('Latitude must be -90 to 90 and longitude -180 to 180');
      }
      if ((lat === null) !== (lng === null)) return toast.error('Set both latitude and longitude, or neither');
    }
    if (step === 2 && !form.mainImage) return toast.error('Upload a main image first');
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

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
    const latNum = form.lat === '' ? null : Number(form.lat);
    const lngNum = form.lng === '' ? null : Number(form.lng);
    const isLastStep = step === STEPS.length - 1;

    return (
      <form onSubmit={submit} className="space-y-6 max-w-4xl"
        onKeyDown={(e) => {
          // Enter in a text box used to submit the whole wizard from its first step.
          if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit' && !isLastStep) {
            e.preventDefault();
            goNext();
          }
        }}>
        <PageHeader
          title={editing._id ? `Edit ${editing.name}` : 'Add a destination'}
          subtitle="This is what travellers see under tourist places in the app"
        />

        <div className="bg-white p-5 rounded-xl border border-neutral-900/[0.08]">
          <StepIndicator steps={STEPS} current={step} />
        </div>

        {step === 0 && (
          <section className="bg-white p-6 rounded-xl border border-neutral-900/[0.08] space-y-5">
            <h3 className="font-medium text-neutral-900 text-sm pb-3 border-b border-neutral-100 flex items-center gap-2">
              <MapPin size={15} className="text-[#0a4d2b]" /> The place
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={label}>Name <span className="text-red-500">*</span></label>
                <input className={field} value={form.name} onChange={set('name')} placeholder="e.g. JATINGA VIEWPOINT" /></div>
              <div><label className={label}>Subtitle</label>
                <input className={field} value={form.subtitle} onChange={set('subtitle')} placeholder="JATINGA VIEW POINT & SHIVRAI TEMPLE" /></div>
              <div><label className={label}>Short location</label>
                <input className={field} value={form.location} onChange={set('location')} placeholder="Jatinga, Dima Hasao" /></div>
              <div><label className={label}>Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = CATEGORY_ICON[c];
                    const active = form.category === c;
                    return (
                      <button
                        key={c} type="button"
                        onClick={() => setForm((cur) => ({ ...cur, category: c }))}
                        className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium  transition-colors ${
                          active ? 'border-[#0a4d2b] bg-[#0a4d2b]/5 text-[#0a4d2b]' : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                        }`}
                      >
                        <Icon size={16} /> {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div><label className={label}>Full address</label>
              <input className={field} value={form.fullAddress} onChange={set('fullAddress')} /></div>

            <div><label className={label}>Description</label>
              <textarea className={field} rows={3} value={form.description} onChange={set('description')} /></div>

            <div><label className={label}>About — one paragraph per line</label>
              <textarea className={field} rows={4} value={form.aboutDetails} onChange={set('aboutDetails')} /></div>
          </section>
        )}

        {step === 1 && (
          <section className="bg-white p-6 rounded-xl border border-neutral-900/[0.08] space-y-5">
            <h3 className="font-medium text-neutral-900 text-sm pb-3 border-b border-neutral-100 flex items-center gap-2">
              <Route size={15} className="text-[#0a4d2b]" /> Getting there
            </h3>

            <div>
              <label className={label}>Pin it on the map</label>
              <p className="text-xs text-neutral-500 mb-2">Search the place, or click anywhere on the map and drag the pin. This is exactly what visitors see on the place's page.</p>
              <div className="mb-2">
                <PlaceSearch
                  onPick={(place) => setForm((c) => ({
                    ...c,
                    lat: place.lat.toFixed(6),
                    lng: place.lng.toFixed(6),
                    fullAddress: c.fullAddress || place.address,
                    location: c.location || place.address.split(',').slice(-3, -1).join(',').trim(),
                  }))}
                />
              </div>
              <LocationPicker lat={latNum} lng={lngNum} onChange={setCoords} className="h-64" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><label className={label}>Latitude</label>
                  <input className={field} type="number" step="any" value={form.lat} onChange={set('lat')} /></div>
                <div><label className={label}>Longitude</label>
                  <input className={field} type="number" step="any" value={form.lng} onChange={set('lng')} /></div>
              </div>
              {!latNum && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-2 flex items-center gap-1.5">
                  <MapPinOff size={13} /> Not pinned yet — the app will show "location not pinned" instead of a map until this is set
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={label}>Distance from station</label>
                <input className={field} value={form.distanceFromStation} onChange={set('distanceFromStation')} placeholder="2.0 km" /></div>
              <div><label className={label}>Travel time</label>
                <input className={field} value={form.travelTime} onChange={set('travelTime')} placeholder="15 min (approx.)" /></div>
              <div><label className={label}>Best time to visit</label>
                <input className={field} value={form.bestTime} onChange={set('bestTime')} placeholder="October to march" /></div>
              <div><label className={label}>Ideal for</label>
                <input className={field} value={form.idealFor} onChange={set('idealFor')} placeholder="Photography, sightseeing" /></div>
            </div>
            <div><label className={label}>Travel tips — one per line</label>
              <textarea className={field} rows={3} value={form.guideTips} onChange={set('guideTips')} /></div>
          </section>
        )}

        {step === 2 && (
          <section className="bg-white p-6 rounded-xl border border-neutral-900/[0.08] space-y-5">
            <h3 className="font-medium text-neutral-900 text-sm pb-3 border-b border-neutral-100 flex items-center gap-2">
              <ImageIcon size={15} className="text-[#0a4d2b]" /> Photos
            </h3>
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
        )}

        {step === 3 && (
          <>
            <section className="bg-white p-6 rounded-xl border border-neutral-900/[0.08] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="font-medium text-neutral-900 text-sm flex items-center gap-2">
                  <Sparkles size={15} className="text-[#0a4d2b]" /> Highlight tags
                </h3>
                <button type="button"
                  onClick={() => setTags((c) => [...c, { icon: 'fa-solid fa-camera', text: '', color: 'text-emerald-600' }])}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600">
                  <Plus size={12} /> Add
                </button>
              </div>
              {tags.length === 0 && <p className="text-xs text-neutral-500">Small badges like "Scenic View" or "Family friendly" shown on the place's card</p>}
              {tags.map((tag, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className={`w-9 h-9 shrink-0 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center ${tag.color || 'text-neutral-500'}`}>
                    <i className={tag.icon || 'fa-solid fa-tag'}></i>
                  </span>
                  <input className={field} value={tag.text} placeholder="Scenic view"
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

            <section className="bg-white p-6 rounded-xl border border-neutral-900/[0.08] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div><label className={label}>Sort order</label>
                  <input className={field} type="number" value={form.sortOrder} onChange={set('sortOrder')} />
                  <p className="text-xs text-neutral-500 mt-1.5">Lower shows first</p></div>
                <label className="flex items-center gap-2 text-sm text-neutral-700 pb-2">
                  <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
                  <span><strong>Visible</strong> in the app</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700 pb-2">
                  <input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} />
                  <span><strong>Featured</strong></span>
                </label>
              </div>
            </section>

            {!form.mainImage && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                A main image is required — go back to the Photos step to add one before saving
              </p>
            )}
          </>
        )}

        <div className="flex items-center gap-3 pb-8">
          {step > 0 && (
            <button type="button" onClick={goBack}
              className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {!isLastStep ? (
            <button type="button" onClick={goNext}
              className="flex items-center gap-1.5 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-medium text-sm hover:bg-[#06381e]">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-medium text-sm hover:bg-[#06381e] disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editing._id ? 'Save changes' : 'Add destination'}
            </button>
          )}
          <button type="button" onClick={closeForm}
            className="px-5 py-3 rounded-xl border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 ml-auto">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  /* ----------------------------- list ----------------------------- */
  const activeCount = destinations.filter((d) => d.isActive).length;
  const featuredCount = destinations.filter((d) => d.isFeatured).length;
  const unpinnedCount = destinations.filter((d) => !Number.isFinite(d.coordinates?.lat)).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tourist places"
        subtitle="The destination directory travellers browse in the app"
        action={
          <button type="button" onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-medium text-sm hover:bg-[#06381e]">
            <Plus size={16} /> Add a place
          </button>
        }
      />

      {!loading && destinations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total places" value={destinations.length} />
          <StatCard label="Visible" value={activeCount} tone="text-[#0a4d2b]" />
          <StatCard label="Featured" value={featuredCount} />
          <StatCard label="Not pinned" value={unpinnedCount} tone={unpinnedCount > 0 ? 'text-amber-600' : 'text-neutral-900'} />
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : destinations.length === 0 ? (
        <EmptyState message="No destinations yet — add the first one" />
      ) : (
        <div className="space-y-3">
          {destinations.map((d) => (
            <div key={d._id} className="bg-white p-4 rounded-xl border border-neutral-900/[0.08] flex flex-wrap items-start gap-4">
              <img src={d.mainImage} alt="" className="w-24 h-20 rounded-xl object-cover bg-neutral-100 shrink-0"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />

              <div className="flex-1 basis-48 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-neutral-900">{d.name}</p>
                  <CategoryBadge category={d.category} />
                  {d.isFeatured && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                      <Sparkles size={11} /> Featured
                    </span>
                  )}
                  {!d.isActive && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">hidden</span>
                  )}
                  {!Number.isFinite(d.coordinates?.lat) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-500">
                      <MapPinOff size={11} /> not pinned
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-1">{d.location}</p>
                <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{d.description}</p>
              </div>

              <div className="flex flex-row-reverse sm:flex-col items-center sm:items-end justify-end gap-3 sm:gap-2 w-full sm:w-auto shrink-0">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                  <input type="checkbox" checked={d.isActive} disabled={busyId === d._id} onChange={() => toggle(d)} />
                  Visible
                </label>
                <div className="flex items-center gap-2">
                  <IconAction icon={Pencil} title="Edit" tone="edit" onClick={() => openEdit(d)} />
                    <IconAction icon={Trash2} title={confirmingId === d._id ? 'Click again to delete for good' : 'Delete'} tone={confirmingId === d._id ? 'dangerSolid' : 'danger'} busy={busyId === d._id} onClick={() => remove(d)} />
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
