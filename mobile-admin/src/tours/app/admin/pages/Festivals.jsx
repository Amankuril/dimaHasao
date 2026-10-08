/* Ported from Frontend/src/modules/Tours/app/admin/pages/Festivals.jsx (tools/port.js first pass). */
/**
 * Festivals and their passes.
 *
 * These are run by the platform rather than by a vendor, which is why they sit
 * in Global instead of a module panel. A pass allocation is real inventory —
 * `soldTickets` is never editable here, only ever moved by a paid booking.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Loader2, Plus, QrCode, Save, Sparkles, Ticket, Trash2, X } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import festivalService from '../../../services/festivalService';
import FestivalDetail from './FestivalDetail';
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
import { Button, Div, Form, Img, Input, P, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
const STEPS = [
  {
    key: 'festival',
    label: 'The festival',
    icon: CalendarDays,
  },
  {
    key: 'window',
    label: 'Booking window',
    icon: Clock,
  },
  {
    key: 'passes',
    label: 'Passes & seats',
    icon: Ticket,
  },
  {
    key: 'finish',
    label: 'Visibility',
    icon: Sparkles,
  },
];
const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const toLines = (v) =>
  String(v || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
const BLANK = {
  name: '',
  tagline: '',
  dates: '',
  startDate: '',
  endDate: '',
  bookingOpensAt: '',
  bookingClosesAt: '',
  venue: '',
  location: '',
  organizer: '',
  description: '',
  highlights: '',
  heroImage: '',
  isActive: true,
  isFeatured: false,
  sortOrder: 0,
};

/** An ISO timestamp into the value a <input type="datetime-local"> wants. */
const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // Shift by the local offset so the box shows the admin's own clock rather
  // than UTC, which would read an hour or five out depending on where they are.
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
/** The festival life-cycle words, mapped onto the kit's status tones. */
const LIFECYCLE_TONE = {
  live: 'success',
  upcoming: 'info',
  ended: 'neutral',
  scheduled: 'warning',
};
const BLANK_CATEGORY = {
  name: '',
  price: 0,
  originalPrice: '',
  totalTickets: 100,
  maxPerBooking: 10,
  perks: '',
  isActive: true,
};
const fromFestival = (f) =>
  !f
    ? BLANK
    : {
        ...BLANK,
        ...Object.fromEntries(
          Object.keys(BLANK)
            .filter((k) => f[k] !== undefined && f[k] !== null && !Array.isArray(f[k]))
            .map((k) => [k, f[k]]),
        ),
        startDate: f.startDate ? String(f.startDate).slice(0, 10) : '',
        endDate: f.endDate ? String(f.endDate).slice(0, 10) : '',
        // The stored values, never `bookingWindow.*` — those carry a fallback to the
        // festival's end date, and saving that back would turn a derived value into
        // a real deadline.
        bookingOpensAt: toLocalInput(f.bookingOpensAt),
        bookingClosesAt: toLocalInput(f.bookingClosesAt),
        highlights: (f.highlights || []).join('\n'),
      };
const Festivals = () => {
  const { tablet } = useLayoutWidth();
  const formCols = tablet ? 2 : 1;
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(BLANK);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  // Which festival's seats and bookings are open, if any.
  const [viewingId, setViewingId] = useState(null);
  const [scan, setScan] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await festivalService.getFestivals();
      setFestivals(data.festivals || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load festivals');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const openNew = () => {
    setForm(BLANK);
    setCategories([
      {
        ...BLANK_CATEGORY,
      },
    ]);
    setStep(0);
    setEditing({});
  };
  const openEdit = (f) => {
    setForm(fromFestival(f));
    setCategories(
      (f.ticketCategories || []).map((c) => ({
        ...c,
        perks: (c.perks || []).join('\n'),
        originalPrice: c.originalPrice ?? '',
      })),
    );
    setStep(0);
    setEditing(f);
  };
  const closeForm = () => {
    setEditing(null);
    setConfirmingId(null);
  };
  const set = (key) => (e) =>
    setForm((c) => ({
      ...c,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  const goNext = () => {
    if (step === 0 && !form.name.trim()) return toast.error('Give the festival a name first');
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const setCategory = (index, key, value) =>
    setCategories((c) =>
      c.map((x, i) =>
        i === index
          ? {
              ...x,
              [key]: value,
            }
          : x,
      ),
    );
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Give the festival a name');
    if (!form.heroImage.trim()) return toast.error('A hero image URL is required');
    if (!categories.some((c) => c.name.trim())) return toast.error('Add at least one pass');
    const payload = {
      ...form,
      name: form.name.trim(),
      highlights: toLines(form.highlights),
      sortOrder: Number(form.sortOrder) || 0,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      // '' is the clear signal, not null: app.js strips every null from every
      // request body before a controller sees it.
      bookingOpensAt: form.bookingOpensAt || '',
      bookingClosesAt: form.bookingClosesAt || '',
      ticketCategories: categories
        .filter((c) => c.name.trim())
        .map((c) => ({
          ...(c._id
            ? {
                _id: c._id,
              }
            : {}),
          name: c.name.trim(),
          price: Number(c.price) || 0,
          originalPrice: c.originalPrice === '' ? undefined : Number(c.originalPrice),
          totalTickets: Number(c.totalTickets) || 0,
          maxPerBooking: Number(c.maxPerBooking) || 10,
          perks: toLines(c.perks),
          isActive: c.isActive !== false,
        })),
    };
    try {
      setSaving(true);
      const result = editing?._id ? await festivalService.updateFestival(editing._id, payload) : await festivalService.createFestival(payload);
      toast.success(result.message || 'Saved');
      closeForm();
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not save this festival');
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (f) => {
    try {
      setBusyId(f._id);
      await festivalService.toggleFestival(f._id, !f.isActive);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this festival');
    } finally {
      setBusyId(null);
    }
  };
  const remove = async (f) => {
    if (confirmingId !== f._id) return setConfirmingId(f._id);
    try {
      setBusyId(f._id);
      await festivalService.deleteFestival(f._id);
      toast.success('Festival deleted');
      setConfirmingId(null);
      await load();
    } catch (error) {
      // The server refuses when passes have been sold — say so plainly.
      toast.error(error.message || 'Could not delete this festival');
      setConfirmingId(null);
    } finally {
      setBusyId(null);
    }
  };
  const verifyPass = async (event) => {
    event.preventDefault();
    if (!scan.trim()) return;
    try {
      setScanning(true);
      const result = await festivalService.verifyFestivalPass(scan.trim().toUpperCase());
      setScanResult({
        ok: true,
        ...result,
      });
      setScan('');
    } catch (error) {
      setScanResult({
        ok: false,
        message: error.message || 'Could not verify that pass',
      });
    } finally {
      setScanning(false);
    }
  };

  /* --------------------- one festival's seats ---------------------- */
  // Reloads the list on the way out, so a booking taken while the detail was
  // open is reflected in the card behind it.
  if (viewingId) {
    return (
      <FestivalDetail
        festivalId={viewingId}
        onBack={() => {
          setViewingId(null);
          load();
        }}
      />
    );
  }

  /* ----------------------------- form ----------------------------- */
  if (editing) {
    const isLastStep = step === STEPS.length - 1;
    return (
      <AdminPage maxWidth={720}>
        <Form onSubmit={submit}>
          <PageHeader
            title={editing._id ? `Edit ${editing.name}` : 'Add a festival'}
            subtitle="Passes go on sale as soon as it is visible."
            breadcrumb={[{ label: 'Tours' }, { label: 'Festivals' }, { label: editing._id ? 'Edit' : 'New' }]}
          />

          <Div className="mb-4">
            <StepIndicator steps={STEPS} current={step} />
          </Div>

          {step === 0 && (
            <Card className="mb-4 gap-4">
              <SectionTitle action={<UiIcon as={CalendarDays} size={16} className="text-blue-600" />}>The festival</SectionTitle>
              <Div className={`grid grid-cols-${formCols} gap-3`}>
                <Field label="Name" required>
                  <Input className={INPUT} value={form.name} onChange={set('name')} />
                </Field>
                <Field label="Tagline">
                  <Input className={INPUT} value={form.tagline} onChange={set('tagline')} />
                </Field>
                <Field label="Dates (as shown)">
                  <Input className={INPUT} value={form.dates} onChange={set('dates')} placeholder="Nov 14 - Nov 17, 2026" />
                </Field>
                <Field label="Organizer">
                  <Input className={INPUT} value={form.organizer} onChange={set('organizer')} />
                </Field>
                <Field label="Starts">
                  <Input className={INPUT} type="date" value={form.startDate} onChange={set('startDate')} />
                </Field>
                <Field label="Ends" hint="Used to hide past festivals; the label above is what people read.">
                  <Input className={INPUT} type="date" value={form.endDate} onChange={set('endDate')} />
                </Field>
                <Field label="Venue">
                  <Input className={INPUT} value={form.venue} onChange={set('venue')} />
                </Field>
                <Field label="Location">
                  <Input className={INPUT} value={form.location} onChange={set('location')} />
                </Field>
              </Div>

              <Field label="Hero image URL" required>
                <Input className={INPUT} value={form.heroImage} onChange={set('heroImage')} placeholder="https://…" />
              </Field>

              <Field label="Description">
                <Textarea className={`${INPUT} h-auto py-2.5`} rows={3} value={form.description} onChange={set('description')} />
              </Field>

              <Field label="Highlights" hint="One per line.">
                <Textarea className={`${INPUT} h-auto py-2.5`} rows={4} value={form.highlights} onChange={set('highlights')} />
              </Field>
            </Card>
          )}

          {step === 1 && (
            <Card className="mb-4 gap-4">
              <SectionTitle action={<UiIcon as={Clock} size={16} className="text-blue-600" />}>Booking window</SectionTitle>
              <P className="text-sm text-slate-500">When people may buy passes. Both are optional and both can be changed later.</P>

              <Div className={`grid grid-cols-${formCols} gap-3`}>
                <Field label="Bookings open" hint="Blank opens as soon as the festival is visible.">
                  <Input className={INPUT} type="datetime-local" value={form.bookingOpensAt} onChange={set('bookingOpensAt')} />
                </Field>
                <Field label="Bookings close" hint="Blank closes when the festival ends.">
                  <Input className={INPUT} type="datetime-local" value={form.bookingClosesAt} onChange={set('bookingClosesAt')} />
                </Field>
              </Div>

              {editing?._id && editing?.bookingWindow && (
                <Div className={`rounded-lg px-3 py-2.5 border ${editing.bookingWindow.isOpen ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <P className={`text-sm font-semibold ${editing.bookingWindow.isOpen ? 'text-green-700' : 'text-amber-700'}`}>
                    {editing.bookingWindow.isOpen
                      ? `Open for booking now${editing.bookingWindow.closesAt ? ` — closes ${new Date(editing.bookingWindow.closesAt).toLocaleString('en-IN')}` : ''}`
                      : editing.bookingWindow.reason}
                  </P>
                </Div>
              )}
            </Card>
          )}

          {step === 2 && (
            <Card className="mb-4 gap-4">
              <SectionTitle
                action={
                  <Button
                    type="button"
                    onClick={() =>
                      setCategories((c) => [
                        ...c,
                        {
                          ...BLANK_CATEGORY,
                        },
                      ])
                    }
                    className={BTN_SECONDARY}
                  >
                    <UiIcon as={Plus} size={14} className="text-slate-600" />
                    <Span className={BTN_TEXT_SECONDARY}>Add a pass</Span>
                  </Button>
                }
              >
                Pass categories &amp; seats
              </SectionTitle>
              <P className="text-sm text-slate-500">Seats can be raised but never dropped below what has been booked.</P>

              {categories.map((cat, index) => (
                <Div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-lg gap-3">
                  <Div className="flex-row items-center gap-2">
                    <Input
                      className={`${INPUT} flex-1`}
                      value={cat.name}
                      placeholder="e.g. 3-Day Season Pass"
                      onChange={(e) => setCategory(index, 'name', e.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={() => setCategories((c) => c.filter((_, i) => i !== index))}
                      className="w-11 h-11 rounded-lg items-center justify-center border border-red-200 bg-white"
                      accessibilityLabel="Remove pass"
                    >
                      <UiIcon as={Trash2} size={16} className="text-red-600" />
                    </Button>
                  </Div>

                  <Div className={`grid grid-cols-${formCols} gap-3`}>
                    <Field label="Price">
                      <Input className={INPUT} type="number" min="0" value={cat.price} onChange={(e) => setCategory(index, 'price', e.target.value)} />
                    </Field>
                    <Field label="Was">
                      <Input
                        className={INPUT}
                        type="number"
                        min="0"
                        value={cat.originalPrice}
                        onChange={(e) => setCategory(index, 'originalPrice', e.target.value)}
                      />
                    </Field>
                    <Field
                      label="Seats"
                      hint={
                        cat.soldTickets > 0
                          ? `${cat.soldTickets} booked · ${Math.max(0, (Number(cat.totalTickets) || 0) - cat.soldTickets)} available`
                          : undefined
                      }
                    >
                      <Input
                        className={INPUT}
                        type="number"
                        min={cat.soldTickets || 0}
                        value={cat.totalTickets}
                        onChange={(e) => setCategory(index, 'totalTickets', e.target.value)}
                      />
                    </Field>
                    <Field label="Max per order">
                      <Input
                        className={INPUT}
                        type="number"
                        min="1"
                        value={cat.maxPerBooking}
                        onChange={(e) => setCategory(index, 'maxPerBooking', e.target.value)}
                      />
                    </Field>
                  </Div>

                  <Field label="What it includes" hint="One per line.">
                    <Textarea className={`${INPUT} h-auto py-2.5`} rows={2} value={cat.perks} onChange={(e) => setCategory(index, 'perks', e.target.value)} />
                  </Field>

                  <Div className="flex-row items-center gap-3">
                    <Input
                      type="checkbox"
                      className="w-5 h-5"
                      checked={cat.isActive !== false}
                      onChange={(e) => setCategory(index, 'isActive', e.target.checked)}
                    />
                    <Span className="text-sm text-slate-700 flex-1">On sale</Span>
                  </Div>
                </Div>
              ))}
            </Card>
          )}

          {step === 3 && (
            <Card className="mb-4 gap-4">
              <SectionTitle action={<UiIcon as={Sparkles} size={16} className="text-blue-600" />}>Visibility</SectionTitle>
              <Field label="Sort order" hint="Lower shows first in the list.">
                <Input className={INPUT} type="number" value={form.sortOrder} onChange={set('sortOrder')} />
              </Field>
              <Div className="flex-row items-center gap-3">
                <Input type="checkbox" className="w-5 h-5" checked={form.isActive} onChange={set('isActive')} />
                <P className="text-sm text-slate-700 flex-1">Visible in the app</P>
              </Div>
              <Div className="flex-row items-start gap-3">
                <Input type="checkbox" className="w-5 h-5" checked={form.isFeatured} onChange={set('isFeatured')} />
                <P className="text-sm text-slate-700 flex-1">Featured — shows this festival as the top banner on the Festivals page</P>
              </Div>
              <P className="text-xs text-slate-500">
                Only one festival should be marked Featured at a time. Leave all unchecked to hide the banner entirely.
              </P>
            </Card>
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
                <Span className={BTN_TEXT_PRIMARY}>{editing._id ? 'Save changes' : 'Add festival'}</Span>
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
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        title="Festivals"
        subtitle="Events the platform runs, and the passes they sell."
        breadcrumb={[{ label: 'Tours' }, { label: 'Festivals' }]}
        actions={
          <Button type="button" onClick={openNew} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add a festival</Span>
          </Button>
        }
      />

      {!loading && festivals.length > 0 && (
        <StatGrid className="mb-4">
          <StatCard label="Festivals" value={festivals.length} />
          <StatCard label="Live now" value={festivals.filter((f) => f.status === 'live').length} tone="success" />
          <StatCard label="Seats booked" value={festivals.reduce((n, f) => n + (f.ticketCategories || []).reduce((s, c) => s + (c.soldTickets || 0), 0), 0)} />
          <StatCard
            label="Revenue"
            value={currency(festivals.reduce((n, f) => n + (f.ticketCategories || []).reduce((s, c) => s + (c.soldTickets || 0) * (c.price || 0), 0), 0))}
            tone="success"
          />
        </StatGrid>
      )}

      <Card className="mb-4 gap-3">
        <Form onSubmit={verifyPass}>
          <SectionTitle action={<UiIcon as={QrCode} size={16} className="text-blue-600" />}>Gate check-in</SectionTitle>
          <Div className="flex-row flex-wrap items-center gap-2">
            <Input
              className={`${INPUT} flex-1`}
              style={{ minWidth: 180 }}
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              placeholder="Scan or type a pass code, e.g. DH-PASS-…"
            />
            <Button type="submit" disabled={scanning || !scan.trim()} className={BTN_PRIMARY}>
              {scanning ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>Check in</Span>
            </Button>
          </Div>
          {scanResult && (
            <Div
              className={`flex-row items-start gap-2 mt-3 p-3 rounded-lg border ${scanResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
            >
              <Span className={`text-sm font-semibold ${scanResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                {scanResult.valid ? 'Accepted' : 'Refused'}
              </Span>
              <Span className={`text-sm flex-1 ${scanResult.valid ? 'text-green-700' : 'text-red-700'}`}>— {scanResult.message}</Span>
              <Button type="button" onClick={() => setScanResult(null)} className="w-11 h-11 items-center justify-center" accessibilityLabel="Dismiss">
                <UiIcon as={X} size={16} className="text-slate-500" />
              </Button>
            </Div>
          )}
        </Form>
      </Card>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : festivals.length === 0 ? (
        <EmptyState title="No festivals yet" message="Add the first festival and the passes it sells." actionLabel="Add a festival" onAction={openNew} />
      ) : (
        <Div className="gap-3">
          {festivals.map((f) => {
            const sold = (f.ticketCategories || []).reduce((n, c) => n + (c.soldTickets || 0), 0);
            const total = (f.ticketCategories || []).reduce((n, c) => n + (c.totalTickets || 0), 0);
            const revenue = (f.ticketCategories || []).reduce((n, c) => n + (c.soldTickets || 0) * (c.price || 0), 0);
            return (
              <Card key={f._id} className="gap-3">
                <Div className="flex-row items-start gap-3" onClick={() => setViewingId(f._id)}>
                  <Img src={f.heroImage} alt="" className="w-20 h-20 rounded-lg object-cover bg-slate-100 shrink-0" fallback={<Div className="w-20 h-20 shrink-0" />} />

                  <Div className="flex-1 min-w-0">
                    <P className="text-base font-semibold text-slate-900" numberOfLines={2}>
                      {f.name}
                    </P>
                    <P className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                      {f.dates} · {f.venue}
                    </P>
                    <P className="text-sm text-slate-700 mt-1.5" numberOfLines={2}>
                      {sold} of {total} seats booked · {Math.max(0, total - sold)} available · {currency(revenue)} taken
                    </P>
                    <P className="text-sm font-semibold text-blue-600 mt-1.5">View seats &amp; bookings →</P>
                  </Div>
                </Div>

                <Div className="flex-row flex-wrap items-center gap-2">
                  {f.status ? <StatusBadge status={f.status} tone={LIFECYCLE_TONE[f.status] || 'neutral'} label={f.status} /> : null}
                  {!f.isActive && <StatusBadge status="hidden" tone="warning" label="hidden" />}
                  {f.bookingOpen === false && <StatusBadge status="booking shut" tone="danger" label="booking shut" />}
                </Div>

                <Div className="flex-row flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  <Div className="flex-row items-center gap-2 mr-auto">
                    <Input type="checkbox" className="w-5 h-5" checked={f.isActive} disabled={busyId === f._id} onChange={() => toggle(f)} />
                    <Span className="text-sm text-slate-700">Visible</Span>
                  </Div>
                  <Button type="button" onClick={() => openEdit(f)} className={BTN_SECONDARY}>
                    <Span className={BTN_TEXT_SECONDARY}>Edit</Span>
                  </Button>
                  <Button
                    type="button"
                    disabled={busyId === f._id}
                    onClick={() => remove(f)}
                    className={
                      confirmingId === f._id ? BTN_DANGER : 'flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg border border-red-200 bg-white'
                    }
                  >
                    <Span className={`text-sm font-semibold ${confirmingId === f._id ? 'text-white' : 'text-red-600'}`}>
                      {confirmingId === f._id ? 'Delete for good?' : 'Delete'}
                    </Span>
                  </Button>
                </Div>
              </Card>
            );
          })}
        </Div>
      )}
    </AdminPage>
  );
};
export default Festivals;
