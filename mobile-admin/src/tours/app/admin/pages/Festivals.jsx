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
import { StatCard, StepIndicator } from '../components/ui';
import { Button, Div, Form, H2, H3, Img, Input, Label, P, ScrollDiv, Section, Span, Strong, Textarea, Icon as UiIcon } from '../../../../components/web';
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
const field = 'px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] transition';
const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';
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
const LIFECYCLE_TONE = {
  live: 'bg-emerald-100 text-emerald-700',
  upcoming: 'bg-sky-100 text-sky-700',
  ended: 'bg-gray-200 text-gray-600',
  scheduled: 'bg-gray-100 text-gray-500',
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
      <ScrollDiv className="p-4 pb-20">
        <Form onSubmit={submit} className="space-y-6">
          <Div>
            <H2 className="text-2xl font-bold text-gray-900">{editing._id ? `Edit ${editing.name}` : 'Add a festival'}</H2>
            <P className="text-gray-500 text-sm mt-0.5">Passes go on sale as soon as it is visible.</P>
          </Div>

          <Div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <StepIndicator steps={STEPS} current={step} />
          </Div>

          {step === 0 && (
            <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
              <H3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
                <UiIcon as={CalendarDays} size={15} className="text-[#0a4d2b]" /> The festival
              </H3>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Div>
                  <Label className={label}>
                    Name <Span className="text-red-500">*</Span>
                  </Label>
                  <Input className={field} value={form.name} onChange={set('name')} />
                </Div>
                <Div>
                  <Label className={label}>Tagline</Label>
                  <Input className={field} value={form.tagline} onChange={set('tagline')} />
                </Div>
                <Div>
                  <Label className={label}>Dates (as shown)</Label>
                  <Input className={field} value={form.dates} onChange={set('dates')} placeholder="Nov 14 - Nov 17, 2026" />
                </Div>
                <Div>
                  <Label className={label}>Organizer</Label>
                  <Input className={field} value={form.organizer} onChange={set('organizer')} />
                </Div>
                <Div>
                  <Label className={label}>Starts</Label>
                  <Input className={field} type="date" value={form.startDate} onChange={set('startDate')} />
                </Div>
                <Div>
                  <Label className={label}>Ends</Label>
                  <Input className={field} type="date" value={form.endDate} onChange={set('endDate')} />
                  <P className="text-xs text-gray-400 mt-1.5">Used to hide past festivals; the label above is what people read.</P>
                </Div>
                <Div>
                  <Label className={label}>Venue</Label>
                  <Input className={field} value={form.venue} onChange={set('venue')} />
                </Div>
                <Div>
                  <Label className={label}>Location</Label>
                  <Input className={field} value={form.location} onChange={set('location')} />
                </Div>
              </Div>

              <Div>
                <Label className={label}>
                  Hero image URL <Span className="text-red-500">*</Span>
                </Label>
                <Input className={field} value={form.heroImage} onChange={set('heroImage')} placeholder="https://…" />
              </Div>

              <Div>
                <Label className={label}>Description</Label>
                <Textarea className={field} rows={3} value={form.description} onChange={set('description')} />
              </Div>

              <Div>
                <Label className={label}>Highlights — one per line</Label>
                <Textarea className={field} rows={4} value={form.highlights} onChange={set('highlights')} />
              </Div>
            </Section>
          )}

          {step === 1 && (
            <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <Div className="pb-3 border-b border-gray-100">
                <H3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <UiIcon as={Clock} size={15} className="text-[#0a4d2b]" /> Booking window
                </H3>
                <P className="text-xs text-gray-400 mt-0.5">When people may buy passes. Both are optional and both can be changed later.</P>
              </Div>

              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Div>
                  <Label className={label}>Bookings open</Label>
                  <Input className={field} type="datetime-local" value={form.bookingOpensAt} onChange={set('bookingOpensAt')} />
                  <P className="text-xs text-gray-400 mt-1.5">Blank opens as soon as the festival is visible.</P>
                </Div>
                <Div>
                  <Label className={label}>Bookings close</Label>
                  <Input className={field} type="datetime-local" value={form.bookingClosesAt} onChange={set('bookingClosesAt')} />
                  <P className="text-xs text-gray-400 mt-1.5">Blank closes when the festival ends.</P>
                </Div>
              </Div>

              {editing?._id && editing?.bookingWindow && (
                <P
                  className={`text-xs font-semibold rounded-xl px-3 py-2.5 ${editing.bookingWindow.isOpen ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
                >
                  {editing.bookingWindow.isOpen
                    ? `Open for booking now${editing.bookingWindow.closesAt ? ` — closes ${new Date(editing.bookingWindow.closesAt).toLocaleString('en-IN')}` : ''}`
                    : editing.bookingWindow.reason}
                </P>
              )}
            </Section>
          )}

          {step === 2 && (
            <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <Div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <Div>
                  <H3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <UiIcon as={Ticket} size={15} className="text-[#0a4d2b]" /> Pass categories &amp; seats
                  </H3>
                  <P className="text-xs text-gray-400 mt-0.5">Seats can be raised but never dropped below what has been booked.</P>
                </Div>
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600"
                >
                  <UiIcon as={Plus} size={12} /> Add a pass
                </Button>
              </Div>

              {categories.map((cat, index) => (
                <Div key={index} className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <Div className="flex items-center gap-2">
                    <Input
                      className={`${field} flex-1`}
                      value={cat.name}
                      placeholder="e.g. 3-Day Season Pass"
                      onChange={(e) => setCategory(index, 'name', e.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={() => setCategories((c) => c.filter((_, i) => i !== index))}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      accessibilityLabel="Remove pass"
                    >
                      <UiIcon as={Trash2} size={14} />
                    </Button>
                  </Div>

                  <Div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Div>
                      <Label className={label}>Price</Label>
                      <Input className={field} type="number" min="0" value={cat.price} onChange={(e) => setCategory(index, 'price', e.target.value)} />
                    </Div>
                    <Div>
                      <Label className={label}>Was</Label>
                      <Input
                        className={field}
                        type="number"
                        min="0"
                        value={cat.originalPrice}
                        onChange={(e) => setCategory(index, 'originalPrice', e.target.value)}
                      />
                    </Div>
                    <Div>
                      <Label className={label}>Seats</Label>
                      <Input
                        className={field}
                        type="number"
                        min={cat.soldTickets || 0}
                        value={cat.totalTickets}
                        onChange={(e) => setCategory(index, 'totalTickets', e.target.value)}
                      />
                      {cat.soldTickets > 0 && (
                        <P className="text-xs text-amber-700 mt-1.5 font-semibold">
                          {cat.soldTickets} booked · {Math.max(0, (Number(cat.totalTickets) || 0) - cat.soldTickets)} available
                        </P>
                      )}
                    </Div>
                    <Div>
                      <Label className={label}>Max per order</Label>
                      <Input
                        className={field}
                        type="number"
                        min="1"
                        value={cat.maxPerBooking}
                        onChange={(e) => setCategory(index, 'maxPerBooking', e.target.value)}
                      />
                    </Div>
                  </Div>

                  <Div>
                    <Label className={label}>What it includes — one per line</Label>
                    <Textarea className={field} rows={2} value={cat.perks} onChange={(e) => setCategory(index, 'perks', e.target.value)} />
                  </Div>

                  <Div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    <Input type="checkbox" checked={cat.isActive !== false} onChange={(e) => setCategory(index, 'isActive', e.target.checked)} />
                    On sale
                  </Div>
                </Div>
              ))}
            </Section>
          )}

          {step === 3 && (
            <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <H3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 mb-4 flex items-center gap-2">
                <UiIcon as={Sparkles} size={15} className="text-[#0a4d2b]" /> Visibility
              </H3>
              <Div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Div>
                  <Label className={label}>Sort order</Label>
                  <Input className={field} type="number" value={form.sortOrder} onChange={set('sortOrder')} />
                  <P className="text-xs text-gray-400 mt-1.5">Lower shows first in the list.</P>
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
                    <Strong>Featured</Strong> — shows this festival as the top banner on the Festivals page
                  </Span>
                </Div>
              </Div>
              <P className="text-xs text-gray-400 mt-2">
                Only one festival should be marked Featured at a time. Leave all unchecked to hide the banner entirely.
              </P>
            </Section>
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
                {editing._id ? 'Save changes' : 'Add festival'}
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
  return (
    <ScrollDiv className="p-4 pb-20 space-y-5">
      <Div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Div>
          <H2 className="text-2xl font-bold text-gray-900">Festivals</H2>
          <P className="text-gray-500 text-sm mt-0.5">Events the platform runs, and the passes they sell.</P>
        </Div>
        <Button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e]"
        >
          <UiIcon as={Plus} size={16} /> Add a festival
        </Button>
      </Div>

      {!loading && festivals.length > 0 && (
        <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Festivals" value={festivals.length} />
          <StatCard label="Live now" value={festivals.filter((f) => f.status === 'live').length} tone="text-[#0a4d2b]" />
          <StatCard label="Seats booked" value={festivals.reduce((n, f) => n + (f.ticketCategories || []).reduce((s, c) => s + (c.soldTickets || 0), 0), 0)} />
          <StatCard
            label="Revenue"
            value={currency(festivals.reduce((n, f) => n + (f.ticketCategories || []).reduce((s, c) => s + (c.soldTickets || 0) * (c.price || 0), 0), 0))}
            tone="text-[#0a4d2b]"
          />
        </Div>
      )}

      <Form onSubmit={verifyPass} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <H3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <UiIcon as={QrCode} size={16} className="text-[#0a4d2b]" /> Gate check-in
        </H3>
        <Div className="flex gap-2">
          <Input className={`${field} flex-1`} value={scan} onChange={(e) => setScan(e.target.value)} placeholder="Scan or type a pass code, e.g. DH-PASS-…" />
          <Button
            type="submit"
            disabled={scanning || !scan.trim()}
            className="px-5 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60 shrink-0"
          >
            {scanning ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : 'Check in'}
          </Button>
        </Div>
        {scanResult && (
          <Div
            className={`flex items-start gap-2 p-3 rounded-xl text-sm ${scanResult.valid ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
          >
            <Span className="font-bold">{scanResult.valid ? 'Accepted' : 'Refused'}</Span>
            <Span className="flex-1">— {scanResult.message}</Span>
            <Button type="button" onClick={() => setScanResult(null)} className="text-gray-400">
              <UiIcon as={X} size={14} />
            </Button>
          </Div>
        )}
      </Form>

      {loading ? (
        <Div className="p-12 text-center text-gray-400">
          <UiIcon as={Loader2} size={22} className="animate-spin inline" />
        </Div>
      ) : festivals.length === 0 ? (
        <Div className="p-10 text-center text-gray-400 text-xs">No festivals yet — add the first one.</Div>
      ) : (
        <Div className="space-y-3">
          {festivals.map((f) => {
            const sold = (f.ticketCategories || []).reduce((n, c) => n + (c.soldTickets || 0), 0);
            const total = (f.ticketCategories || []).reduce((n, c) => n + (c.totalTickets || 0), 0);
            const revenue = (f.ticketCategories || []).reduce((n, c) => n + (c.soldTickets || 0) * (c.price || 0), 0);
            return (
              <Div key={f._id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-start gap-4">
                <Img
                  src={f.heroImage}
                  alt=""
                  className="w-24 h-20 rounded-xl object-cover bg-gray-100 shrink-0"
                  fallback={<Div className="w-24 h-20 shrink-0" />}
                />

                <Button type="button" onClick={() => setViewingId(f._id)} className="flex-1 basis-56 min-w-0 text-left cursor-pointer">
                  <Div className="flex flex-wrap items-center gap-2">
                    <P className="font-bold text-gray-900">{f.name}</P>
                    {f.status && (
                      <Span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${LIFECYCLE_TONE[f.status] || 'bg-gray-100 text-gray-500'}`}>
                        {f.status}
                      </Span>
                    )}
                    {!f.isActive && <Span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700">hidden</Span>}
                    {f.bookingOpen === false && (
                      <Span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">booking shut</Span>
                    )}
                  </Div>
                  <P className="text-xs text-gray-500 mt-1">
                    {f.dates} · {f.venue}
                  </P>
                  <P className="text-xs text-gray-700 mt-2 font-semibold">
                    {sold} of {total} seats booked
                    <Span className="font-medium text-emerald-700"> · {Math.max(0, total - sold)} available</Span>
                    <Span className="font-medium text-gray-400"> · {currency(revenue)} taken</Span>
                  </P>
                  <P className="text-[11px] text-[#0a4d2b] mt-1.5 font-bold">View seats &amp; bookings →</P>
                </Button>

                <Div className="flex flex-row-reverse sm:flex-col items-center sm:items-end justify-end gap-3 sm:gap-2 w-full sm:w-auto shrink-0">
                  <Div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    <Input type="checkbox" checked={f.isActive} disabled={busyId === f._id} onChange={() => toggle(f)} />
                    Visible
                  </Div>
                  <Div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => openEdit(f)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      disabled={busyId === f._id}
                      onClick={() => remove(f)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50 ${confirmingId === f._id ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-600 hover:bg-red-50'}`}
                    >
                      {confirmingId === f._id ? 'Delete for good?' : 'Delete'}
                    </Button>
                  </Div>
                </Div>
              </Div>
            );
          })}
        </Div>
      )}
    </ScrollDiv>
  );
};
export default Festivals;
