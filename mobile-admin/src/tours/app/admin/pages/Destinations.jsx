/* Ported from Frontend/src/modules/Tours/app/admin/pages/Destinations.jsx (tools/port.js first pass). */
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
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MapPinOff,
  Route,
  Image as ImageIcon,
  Sparkles,
  Mountain,
  Building2,
  Footprints,
  Landmark,
  Waves,
  PawPrint,
} from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import adminService from '../../../services/adminService';
import ImageField, { ImageListField } from '../components/ImageField';
import LocationPicker from '../components/LocationPicker';
import { PageHeader, Spinner, EmptyState, StatCard, StepIndicator } from '../components/ui';
import { Button, Div, Em, Form, H3, Img, Input, Label, P, ScrollDiv, Section, Span, Strong, Textarea, Icon as UiIcon } from '../../../../components/web';
const CATEGORIES = ['viewpoint', 'town', 'trek', 'temple', 'lake', 'wildlife'];
const CATEGORY_ICON = {
  viewpoint: Mountain,
  town: Building2,
  trek: Footprints,
  temple: Landmark,
  lake: Waves,
  wildlife: PawPrint,
};
const field = 'px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] transition';
const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';
const toLines = (v) =>
  String(v || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
const STEPS = [
  {
    key: 'place',
    label: 'The place',
    icon: MapPin,
  },
  {
    key: 'reach',
    label: 'Getting there',
    icon: Route,
  },
  {
    key: 'photos',
    label: 'Photos',
    icon: ImageIcon,
  },
  {
    key: 'finish',
    label: 'Visibility',
    icon: Sparkles,
  },
];
const BLANK = {
  name: '',
  subtitle: '',
  location: '',
  fullAddress: '',
  distanceFromStation: '',
  travelTime: '',
  bestTime: '',
  idealFor: '',
  description: '',
  aboutDetails: '',
  guideTips: '',
  mainImage: '',
  heroImage: '',
  insetImage: '',
  guideSunsetImage: '',
  gallery: [],
  category: 'viewpoint',
  isActive: true,
  isFeatured: false,
  sortOrder: 0,
  lat: '',
  lng: '',
};

/** A saved destination → the textarea-shaped state this form edits. */
const fromDestination = (d) =>
  !d
    ? BLANK
    : {
        ...BLANK,
        ...Object.fromEntries(
          Object.keys(BLANK)
            .filter((k) => d[k] !== undefined && d[k] !== null && !Array.isArray(d[k]))
            .map((k) => [k, d[k]]),
        ),
        aboutDetails: (d.aboutDetails || []).join('\n'),
        guideTips: (d.guideTips || []).join('\n'),
        gallery: d.gallery || [],
        lat: d.coordinates?.lat ?? '',
        lng: d.coordinates?.lng ?? '',
      };
const CategoryBadge = ({ category }) => {
  const Icon = CATEGORY_ICON[category] || MapPin;
  return (
    <Span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
      <UiIcon as={Icon} size={11} /> {category}
    </Span>
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
  useEffect(() => {
    load();
  }, [load]);
  const openNew = () => {
    setForm(BLANK);
    setTags([]);
    setStep(0);
    setEditing({});
  };
  const openEdit = (d) => {
    setForm(fromDestination(d));
    setTags(d.tags || []);
    setStep(0);
    setEditing(d);
  };
  const closeForm = () => {
    setEditing(null);
    setConfirmingId(null);
  };
  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };
  const setCoords = ({ lat, lng }) =>
    setForm((c) => ({
      ...c,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    }));
  const goNext = () => {
    if (step === 0 && !form.name.trim()) return toast.error('Give the place a name first');
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
      const result = editing?._id ? await adminService.updateDestination(editing._id, payload) : await adminService.createDestination(payload);
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
      <ScrollDiv className="p-4 pb-20">
        <Form onSubmit={submit} className="space-y-6">
          <PageHeader
            title={editing._id ? `Edit ${editing.name}` : 'Add a destination'}
            subtitle="This is what travellers see under Tourist Places in the app."
          />

          <Div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <StepIndicator steps={STEPS} current={step} />
          </Div>

          {step === 0 && (
            <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
              <H3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
                <UiIcon as={MapPin} size={15} className="text-[#0a4d2b]" /> The place
              </H3>

              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Div>
                  <Label className={label}>
                    Name <Span className="text-red-500">*</Span>
                  </Label>
                  <Input className={field} value={form.name} onChange={set('name')} placeholder="e.g. JATINGA VIEWPOINT" />
                </Div>
                <Div>
                  <Label className={label}>Subtitle</Label>
                  <Input className={field} value={form.subtitle} onChange={set('subtitle')} placeholder="JATINGA VIEW POINT & SHIVRAI TEMPLE" />
                </Div>
                <Div>
                  <Label className={label}>Short location</Label>
                  <Input className={field} value={form.location} onChange={set('location')} placeholder="Jatinga, Dima Hasao" />
                </Div>
                <Div>
                  <Label className={label}>Category</Label>
                  <Div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((c) => {
                      const Icon = CATEGORY_ICON[c];
                      const active = form.category === c;
                      return (
                        <Button
                          key={c}
                          type="button"
                          onClick={() =>
                            setForm((cur) => ({
                              ...cur,
                              category: c,
                            }))
                          }
                          className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-bold uppercase transition-colors ${active ? 'border-[#0a4d2b] bg-[#0a4d2b]/5 text-[#0a4d2b]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                          <UiIcon as={Icon} size={16} /> {c}
                        </Button>
                      );
                    })}
                  </Div>
                </Div>
              </Div>

              <Div>
                <Label className={label}>Full address</Label>
                <Input className={field} value={form.fullAddress} onChange={set('fullAddress')} />
              </Div>

              <Div>
                <Label className={label}>Description</Label>
                <Textarea className={field} rows={3} value={form.description} onChange={set('description')} />
              </Div>

              <Div>
                <Label className={label}>About — one paragraph per line</Label>
                <Textarea className={field} rows={4} value={form.aboutDetails} onChange={set('aboutDetails')} />
              </Div>
            </Section>
          )}

          {step === 1 && (
            <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
              <H3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
                <UiIcon as={Route} size={15} className="text-[#0a4d2b]" /> Getting there
              </H3>

              <Div>
                <Label className={label}>Pin it on the map</Label>
                <P className="text-xs text-gray-400 mb-2">
                  Click anywhere on the map, or drag the pin once it&apos;s placed. This is exactly what visitors see on the place&apos;s page.
                </P>
                <LocationPicker lat={latNum} lng={lngNum} onChange={setCoords} className="h-64" />
                <Div className="grid grid-cols-2 gap-3 mt-3">
                  <Div>
                    <Label className={label}>Latitude</Label>
                    <Input className={field} type="number" step="any" value={form.lat} onChange={set('lat')} />
                  </Div>
                  <Div>
                    <Label className={label}>Longitude</Label>
                    <Input className={field} type="number" step="any" value={form.lng} onChange={set('lng')} />
                  </Div>
                </Div>
                {!latNum && (
                  <P className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-2 flex items-center gap-1.5">
                    <UiIcon as={MapPinOff} size={13} /> Not pinned yet — the app will show &quot;location not pinned&quot; instead of a map until this is set.
                  </P>
                )}
              </Div>

              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Div>
                  <Label className={label}>Distance from station</Label>
                  <Input className={field} value={form.distanceFromStation} onChange={set('distanceFromStation')} placeholder="2.0 km" />
                </Div>
                <Div>
                  <Label className={label}>Travel time</Label>
                  <Input className={field} value={form.travelTime} onChange={set('travelTime')} placeholder="15 min (Approx.)" />
                </Div>
                <Div>
                  <Label className={label}>Best time to visit</Label>
                  <Input className={field} value={form.bestTime} onChange={set('bestTime')} placeholder="October to March" />
                </Div>
                <Div>
                  <Label className={label}>Ideal for</Label>
                  <Input className={field} value={form.idealFor} onChange={set('idealFor')} placeholder="Photography, Sightseeing" />
                </Div>
              </Div>
              <Div>
                <Label className={label}>Travel tips — one per line</Label>
                <Textarea className={field} rows={3} value={form.guideTips} onChange={set('guideTips')} />
              </Div>
            </Section>
          )}

          {step === 2 && (
            <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
              <H3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
                <UiIcon as={ImageIcon} size={15} className="text-[#0a4d2b]" /> Photos
              </H3>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ImageField
                  label="Main image *"
                  value={form.mainImage}
                  onChange={(url) =>
                    setForm((c) => ({
                      ...c,
                      mainImage: url,
                    }))
                  }
                  hint="Shown on the card and at the top of the detail page."
                />
                <ImageField
                  label="Hero banner"
                  value={form.heroImage}
                  onChange={(url) =>
                    setForm((c) => ({
                      ...c,
                      heroImage: url,
                    }))
                  }
                />
                <ImageField
                  label="Inset thumbnail"
                  value={form.insetImage}
                  onChange={(url) =>
                    setForm((c) => ({
                      ...c,
                      insetImage: url,
                    }))
                  }
                />
                <ImageField
                  label="Sunset / guide image"
                  value={form.guideSunsetImage}
                  onChange={(url) =>
                    setForm((c) => ({
                      ...c,
                      guideSunsetImage: url,
                    }))
                  }
                />
              </Div>
              <ImageListField
                label="Gallery"
                value={form.gallery}
                onChange={(urls) =>
                  setForm((c) => ({
                    ...c,
                    gallery: urls,
                  }))
                }
                max={8}
              />
            </Section>
          )}

          {step === 3 && (
            <>
              <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <Div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <H3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <UiIcon as={Sparkles} size={15} className="text-[#0a4d2b]" /> Highlight tags
                  </H3>
                  <Button
                    type="button"
                    onClick={() =>
                      setTags((c) => [
                        ...c,
                        {
                          icon: 'fa-solid fa-camera',
                          text: '',
                          color: 'text-emerald-600',
                        },
                      ])
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600"
                  >
                    <UiIcon as={Plus} size={12} /> Add
                  </Button>
                </Div>
                {tags.length === 0 && <P className="text-xs text-gray-400">Small badges like &quot;Scenic View&quot; or &quot;Family friendly&quot; shown on the place&apos;s card.</P>}
                {tags.map((tag, index) => (
                  <Div key={index} className="flex items-center gap-2">
                    <Span
                      className={`w-9 h-9 shrink-0 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center ${tag.color || 'text-gray-500'}`}
                    >
                      <Em className={tag.icon || 'fa-solid fa-tag'}></Em>
                    </Span>
                    <Input
                      className={field}
                      value={tag.text}
                      placeholder="Scenic View"
                      onChange={(e) =>
                        setTags((c) =>
                          c.map((t, i) =>
                            i === index
                              ? {
                                  ...t,
                                  text: e.target.value,
                                }
                              : t,
                          ),
                        )
                      }
                    />
                    <Input
                      className={`${field} max-w-[190px]`}
                      value={tag.icon}
                      placeholder="fa-solid fa-camera"
                      onChange={(e) =>
                        setTags((c) =>
                          c.map((t, i) =>
                            i === index
                              ? {
                                  ...t,
                                  icon: e.target.value,
                                }
                              : t,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      onClick={() => setTags((c) => c.filter((_, i) => i !== index))}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      accessibilityLabel="Remove tag"
                    >
                      <UiIcon as={Trash2} size={14} />
                    </Button>
                  </Div>
                ))}
              </Section>

              <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <Div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <Div>
                    <Label className={label}>Sort order</Label>
                    <Input className={field} type="number" value={form.sortOrder} onChange={set('sortOrder')} />
                    <P className="text-xs text-gray-400 mt-1.5">Lower shows first.</P>
                  </Div>
                  <Div className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                    <Input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
                    <Span>
                      <Strong>Visible</Strong> in the app
                    </Span>
                  </Div>
                  <Div className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                    <Input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} />
                    <Span>
                      <Strong>Featured</Strong>
                    </Span>
                  </Div>
                </Div>
              </Section>

              {!form.mainImage && (
                <P className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                  A main image is required — go back to the Photos step to add one before saving.
                </P>
              )}
            </>
          )}

          <Div className="flex items-center gap-3 pb-8">
            {step > 0 && (
              <Button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50"
              >
                <UiIcon as={ChevronLeft} size={16} /> Back
              </Button>
            )}
            {!isLastStep ? (
              <Button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1.5 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e]"
              >
                Next <UiIcon as={ChevronRight} size={16} />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60"
              >
                {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={Save} size={16} />}
                {editing._id ? 'Save changes' : 'Add destination'}
              </Button>
            )}
            <Button
              type="button"
              onClick={closeForm}
              className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 ml-auto"
            >
              Cancel
            </Button>
          </Div>
        </Form>
      </ScrollDiv>
    );
  }

  /* ----------------------------- list ----------------------------- */
  const activeCount = destinations.filter((d) => d.isActive).length;
  const featuredCount = destinations.filter((d) => d.isFeatured).length;
  const unpinnedCount = destinations.filter((d) => !Number.isFinite(d.coordinates?.lat)).length;
  return (
    <ScrollDiv className="p-4 pb-20 space-y-5">
      <PageHeader
        title="Tourist Places"
        subtitle="The destination directory travellers browse in the app."
        action={
          <Button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e]"
          >
            <UiIcon as={Plus} size={16} /> Add a place
          </Button>
        }
      />

      {!loading && destinations.length > 0 && (
        <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total places" value={destinations.length} />
          <StatCard label="Visible" value={activeCount} tone="text-[#0a4d2b]" />
          <StatCard label="Featured" value={featuredCount} />
          <StatCard label="Not pinned" value={unpinnedCount} tone={unpinnedCount > 0 ? 'text-amber-600' : 'text-gray-900'} />
        </Div>
      )}

      {loading ? (
        <Spinner />
      ) : destinations.length === 0 ? (
        <EmptyState message="No destinations yet — add the first one." />
      ) : (
        <Div className="space-y-3">
          {destinations.map((d) => (
            <Div key={d._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-start gap-4">
              <Img
                src={d.mainImage}
                alt=""
                className="w-24 h-20 rounded-xl object-cover bg-gray-100 shrink-0"
                fallback={<Div className="w-24 h-20 shrink-0" />}
              />

              <Div className="flex-1 basis-48 min-w-0">
                <Div className="flex flex-wrap items-center gap-2">
                  <P className="font-bold text-gray-900">{d.name}</P>
                  <CategoryBadge category={d.category} />
                  {d.isFeatured && (
                    <Span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                      <UiIcon as={Sparkles} size={11} /> Featured
                    </Span>
                  )}
                  {!d.isActive && <Span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700">hidden</Span>}
                  {!Number.isFinite(d.coordinates?.lat) && (
                    <Span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-500">
                      <UiIcon as={MapPinOff} size={11} /> not pinned
                    </Span>
                  )}
                </Div>
                <P className="text-xs text-gray-500 mt-1">{d.location}</P>
                <P className="text-xs text-gray-400 mt-1 line-clamp-2">{d.description}</P>
              </Div>

              <Div className="flex flex-row-reverse sm:flex-col items-center sm:items-end justify-end gap-3 sm:gap-2 w-full sm:w-auto shrink-0">
                <Div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <Input type="checkbox" checked={d.isActive} disabled={busyId === d._id} onChange={() => toggle(d)} />
                  Visible
                </Div>
                <Div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => openEdit(d)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    disabled={busyId === d._id}
                    onClick={() => remove(d)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50 ${confirmingId === d._id ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-600 hover:bg-red-50'}`}
                  >
                    {confirmingId === d._id ? 'Delete for good?' : 'Delete'}
                  </Button>
                </Div>
              </Div>
            </Div>
          ))}
        </Div>
      )}
    </ScrollDiv>
  );
};
export default Destinations;
