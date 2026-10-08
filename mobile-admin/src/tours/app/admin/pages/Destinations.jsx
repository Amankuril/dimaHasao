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
import { StepIndicator } from '../components/ui';
import {
  AdminPage,
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  Card,
  EmptyState,
  Field,
  INPUT,
  PageHeader,
  SectionTitle,
  StatCard,
  StatGrid,
  StatusBadge,
  TableSkeleton,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Em, Form, Img, Input, P, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
const CATEGORIES = ['viewpoint', 'town', 'trek', 'temple', 'lake', 'wildlife'];
const CATEGORY_ICON = {
  viewpoint: Mountain,
  town: Building2,
  trek: Footprints,
  temple: Landmark,
  lake: Waves,
  wildlife: PawPrint,
};
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
  return <StatusBadge status={category} tone="neutral" label={category} icon={Icon} />;
};
const Destinations = () => {
  const { tablet } = useLayoutWidth();
  const formCols = tablet ? 2 : 1;
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
      <AdminPage maxWidth={720}>
        <Form onSubmit={submit}>
          <PageHeader
            title={editing._id ? `Edit ${editing.name}` : 'Add a destination'}
            subtitle="This is what travellers see under Tourist Places in the app."
            breadcrumb={[{ label: 'Tours' }, { label: 'Tourist Places' }, { label: editing._id ? 'Edit' : 'New' }]}
          />

          <Div className="mb-4">
            <StepIndicator steps={STEPS} current={step} />
          </Div>

          {step === 0 && (
            <Card className="mb-4 gap-4">
              <SectionTitle action={<UiIcon as={MapPin} size={16} className="text-blue-600" />}>The place</SectionTitle>

              <Div className={`grid grid-cols-${formCols} gap-3`}>
                <Field label="Name" required>
                  <Input className={INPUT} value={form.name} onChange={set('name')} placeholder="e.g. JATINGA VIEWPOINT" />
                </Field>
                <Field label="Subtitle">
                  <Input className={INPUT} value={form.subtitle} onChange={set('subtitle')} placeholder="JATINGA VIEW POINT & SHIVRAI TEMPLE" />
                </Field>
                <Field label="Short location">
                  <Input className={INPUT} value={form.location} onChange={set('location')} placeholder="Jatinga, Dima Hasao" />
                </Field>
              </Div>

              <Field label="Category">
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
                        className={`items-center justify-center gap-1 py-2.5 rounded-lg border ${active ? 'border-blue-600 bg-blue-50' : 'border-slate-300 bg-white'}`}
                        style={{ minHeight: 56 }}
                      >
                        <UiIcon as={Icon} size={16} className={active ? 'text-blue-600' : 'text-slate-500'} />
                        <Span className={`text-xs font-semibold ${active ? 'text-blue-600' : 'text-slate-600'}`}>{c}</Span>
                      </Button>
                    );
                  })}
                </Div>
              </Field>

              <Field label="Full address">
                <Input className={INPUT} value={form.fullAddress} onChange={set('fullAddress')} />
              </Field>

              <Field label="Description">
                <Textarea className={`${INPUT} h-auto py-2.5`} rows={3} value={form.description} onChange={set('description')} />
              </Field>

              <Field label="About" hint="One paragraph per line.">
                <Textarea className={`${INPUT} h-auto py-2.5`} rows={4} value={form.aboutDetails} onChange={set('aboutDetails')} />
              </Field>
            </Card>
          )}

          {step === 1 && (
            <Card className="mb-4 gap-4">
              <SectionTitle action={<UiIcon as={Route} size={16} className="text-blue-600" />}>Getting there</SectionTitle>

              <Field label="Pin it on the map" hint="Tap anywhere on the map, or drag the pin once it is placed. This is exactly what visitors see.">
                <LocationPicker lat={latNum} lng={lngNum} onChange={setCoords} className="h-64" />
              </Field>

              <Div className={`grid grid-cols-${formCols} gap-3`}>
                <Field label="Latitude">
                  <Input className={INPUT} type="number" step="any" value={form.lat} onChange={set('lat')} />
                </Field>
                <Field label="Longitude">
                  <Input className={INPUT} type="number" step="any" value={form.lng} onChange={set('lng')} />
                </Field>
              </Div>

              {!latNum && (
                <Div className="flex-row items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <UiIcon as={MapPinOff} size={14} className="text-amber-700" />
                  <P className="text-xs text-amber-700 flex-1">
                    Not pinned yet — the app will show &quot;location not pinned&quot; instead of a map until this is set.
                  </P>
                </Div>
              )}

              <Div className={`grid grid-cols-${formCols} gap-3`}>
                <Field label="Distance from station">
                  <Input className={INPUT} value={form.distanceFromStation} onChange={set('distanceFromStation')} placeholder="2.0 km" />
                </Field>
                <Field label="Travel time">
                  <Input className={INPUT} value={form.travelTime} onChange={set('travelTime')} placeholder="15 min (Approx.)" />
                </Field>
                <Field label="Best time to visit">
                  <Input className={INPUT} value={form.bestTime} onChange={set('bestTime')} placeholder="October to March" />
                </Field>
                <Field label="Ideal for">
                  <Input className={INPUT} value={form.idealFor} onChange={set('idealFor')} placeholder="Photography, Sightseeing" />
                </Field>
              </Div>

              <Field label="Travel tips" hint="One per line.">
                <Textarea className={`${INPUT} h-auto py-2.5`} rows={3} value={form.guideTips} onChange={set('guideTips')} />
              </Field>
            </Card>
          )}

          {step === 2 && (
            <Card className="mb-4 gap-4">
              <SectionTitle action={<UiIcon as={ImageIcon} size={16} className="text-blue-600" />}>Photos</SectionTitle>
              <Div className={`grid grid-cols-${formCols} gap-4`}>
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
            </Card>
          )}

          {step === 3 && (
            <>
              <Card className="mb-4 gap-3">
                <SectionTitle
                  action={
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
                      className={BTN_SECONDARY}
                    >
                      <UiIcon as={Plus} size={14} className="text-slate-600" />
                      <Span className={BTN_TEXT_SECONDARY}>Add</Span>
                    </Button>
                  }
                >
                  Highlight tags
                </SectionTitle>
                {tags.length === 0 && (
                  <P className="text-sm text-slate-500">Small badges like &quot;Scenic View&quot; or &quot;Family friendly&quot; shown on the place&apos;s card.</P>
                )}
                {tags.map((tag, index) => (
                  <Div key={index} className="gap-2 pb-3 border-b border-slate-100">
                    <Div className="flex-row items-center gap-2">
                      <Span className="w-11 h-11 shrink-0 rounded-lg bg-slate-50 border border-slate-200 items-center justify-center">
                        <Em className={tag.icon || 'fa-solid fa-tag'}></Em>
                      </Span>
                      <Input
                        className={`${INPUT} flex-1`}
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
                      <Button
                        type="button"
                        onClick={() => setTags((c) => c.filter((_, i) => i !== index))}
                        className="w-11 h-11 rounded-lg items-center justify-center border border-red-200 bg-white"
                        accessibilityLabel="Remove tag"
                      >
                        <UiIcon as={Trash2} size={16} className="text-red-600" />
                      </Button>
                    </Div>
                    <Input
                      className={INPUT}
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
                  </Div>
                ))}
              </Card>

              <Card className="mb-4 gap-4">
                <Field label="Sort order" hint="Lower shows first.">
                  <Input className={INPUT} type="number" value={form.sortOrder} onChange={set('sortOrder')} />
                </Field>
                <Div className="flex-row items-center gap-3">
                  <Input type="checkbox" className="w-5 h-5" checked={form.isActive} onChange={set('isActive')} />
                  <P className="text-sm text-slate-700 flex-1">Visible in the app</P>
                </Div>
                <Div className="flex-row items-center gap-3">
                  <Input type="checkbox" className="w-5 h-5" checked={form.isFeatured} onChange={set('isFeatured')} />
                  <P className="text-sm text-slate-700 flex-1">Featured</P>
                </Div>
              </Card>

              {!form.mainImage && (
                <Div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <P className="text-xs text-amber-700">A main image is required — go back to the Photos step to add one before saving.</P>
                </Div>
              )}
            </>
          )}

          <Div className="flex-row flex-wrap items-center gap-2">
            {step > 0 && (
              <Button type="button" onClick={goBack} className={BTN_SECONDARY}>
                <UiIcon as={ChevronLeft} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Back</Span>
              </Button>
            )}
            {!isLastStep ? (
              <Button type="button" onClick={goNext} className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>Next</Span>
                <UiIcon as={ChevronRight} size={16} className="text-white" />
              </Button>
            ) : (
              <Button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Save} size={16} className="text-white" />}
                <Span className={BTN_TEXT_PRIMARY}>{editing._id ? 'Save changes' : 'Add destination'}</Span>
              </Button>
            )}
            <Button type="button" onClick={closeForm} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
          </Div>
        </Form>
      </AdminPage>
    );
  }

  /* ----------------------------- list ----------------------------- */
  const activeCount = destinations.filter((d) => d.isActive).length;
  const featuredCount = destinations.filter((d) => d.isFeatured).length;
  const unpinnedCount = destinations.filter((d) => !Number.isFinite(d.coordinates?.lat)).length;
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        title="Tourist Places"
        subtitle="The destination directory travellers browse in the app."
        breadcrumb={[{ label: 'Tours' }, { label: 'Tourist Places' }]}
        actions={
          <Button type="button" onClick={openNew} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add a place</Span>
          </Button>
        }
      />

      {!loading && destinations.length > 0 && (
        <StatGrid className="mb-4">
          <StatCard label="Total places" value={destinations.length} />
          <StatCard label="Visible" value={activeCount} tone="success" />
          <StatCard label="Featured" value={featuredCount} />
          <StatCard label="Not pinned" value={unpinnedCount} tone={unpinnedCount > 0 ? 'warning' : 'info'} />
        </StatGrid>
      )}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : destinations.length === 0 ? (
        <EmptyState
          title="No destinations yet"
          message="Add the first place travellers can browse in the app."
          actionLabel="Add a place"
          onAction={openNew}
        />
      ) : (
        <Div className="gap-3">
          {destinations.map((d) => (
            <Card key={d._id} className="gap-3">
              <Div className="flex-row items-start gap-3">
                <Img src={d.mainImage} alt="" className="w-20 h-20 rounded-lg object-cover bg-slate-100 shrink-0" fallback={<Div className="w-20 h-20 shrink-0" />} />

                <Div className="flex-1 min-w-0">
                  <P className="text-base font-semibold text-slate-900" numberOfLines={2}>
                    {d.name}
                  </P>
                  <P className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                    {d.location}
                  </P>
                  <P className="text-xs text-slate-500 mt-1" numberOfLines={2}>
                    {d.description}
                  </P>
                </Div>
              </Div>

              <Div className="flex-row flex-wrap items-center gap-2">
                <CategoryBadge category={d.category} />
                {d.isFeatured && <StatusBadge status="featured" tone="success" label="featured" icon={Sparkles} />}
                {!d.isActive && <StatusBadge status="hidden" tone="warning" label="hidden" />}
                {!Number.isFinite(d.coordinates?.lat) && <StatusBadge status="not pinned" tone="neutral" label="not pinned" icon={MapPinOff} />}
              </Div>

              <Div className="flex-row flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                <Div className="flex-row items-center gap-2 mr-auto">
                  <Input type="checkbox" className="w-5 h-5" checked={d.isActive} disabled={busyId === d._id} onChange={() => toggle(d)} />
                  <Span className="text-sm text-slate-700">Visible</Span>
                </Div>
                <Button type="button" onClick={() => openEdit(d)} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Edit</Span>
                </Button>
                <Button
                  type="button"
                  disabled={busyId === d._id}
                  onClick={() => remove(d)}
                  className={confirmingId === d._id ? BTN_DANGER : 'flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg border border-red-200 bg-white'}
                >
                  <Span className={`text-sm font-semibold ${confirmingId === d._id ? 'text-white' : 'text-red-600'}`}>
                    {confirmingId === d._id ? 'Delete for good?' : 'Delete'}
                  </Span>
                </Button>
              </Div>
            </Card>
          ))}
        </Div>
      )}
    </AdminPage>
  );
};
export default Destinations;
