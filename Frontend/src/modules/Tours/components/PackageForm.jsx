/**
 * The one package form.
 *
 * Create and edit both render this, so the
 * fields cannot drift apart — the same reasoning as `createPackage` on the
 * server, where both entry points share one document builder.
 *
 * Callers own whatever is specific to them (the create screen's page header and
 * publish toggle) by passing it as `children`, rendered above every step, and
 * merge it into the payload in their own `onSubmit`.
 *
 * The fields are grouped into a short wizard rather than one long scroll —
 * the same reasoning as the destinations form: filling it in step by step
 * mirrors the order a traveller actually reads the result in.
 */
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, IndianRupee, ListChecks, Loader2, Package, Plus, Route, Save, Trash2 } from 'lucide-react';
import { StepIndicator } from '../app/admin/components/ui';
import ImageField, { ImageListField } from '../app/admin/components/ImageField';
import PlaceListField from '../app/admin/components/PlaceListField';

export const CATEGORIES = ['sightseeing', 'trekking', 'adventure', 'cultural', 'nature', 'family', 'couple', 'group'];
export const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging'];

export const field =
  'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 transition';
export const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STEPS = [
  { key: 'package', label: 'The package', icon: Package },
  { key: 'route', label: 'Route & highlights', icon: Route },
  { key: 'pricing', label: 'Pricing', icon: IndianRupee },
  { key: 'itinerary', label: 'Included & itinerary', icon: ListChecks },
];

/** Textarea lines → a trimmed array, the shape the API expects for list fields. */
export const toLines = (value) => String(value || '').split('\n').map((s) => s.trim()).filter(Boolean);

const BLANK = {
  title: '',
  subtitle: '',
  description: '',
  category: 'sightseeing',
  difficulty: 'Easy',
  durationDays: 2,
  durationNights: 1,
  groupSizeMin: 2,
  groupSizeMax: 10,
  pricePerPerson: '',
  originalPrice: '',
  childPricePercent: 60,
  advancePercent: 100,
  leadTimeDays: 2,
  heroImage: '',
  destinations: '',
  highlights: '',
  exclusions: '',
  pickupPoints: '',
  cancellationPolicy: '',
};

/** A saved package → the textarea-shaped state this form edits. */
export const fromPackage = (pkg) => {
  if (!pkg) return { form: BLANK, gallery: [], pickupLocations: [], dropLocations: [], includes: [{ id: 'guide', label: 'Local guide', included: true }], itinerary: [{ day: 1, title: '', activities: '', mealPlan: '' }] };

  const lines = (arr) => (Array.isArray(arr) ? arr.join('\n') : '');
  return {
    form: {
      ...BLANK,
      ...Object.fromEntries(
        Object.keys(BLANK)
          .filter((key) => pkg[key] !== undefined && pkg[key] !== null && !Array.isArray(pkg[key]))
          .map((key) => [key, pkg[key]]),
      ),
      destinations: lines(pkg.destinations),
      highlights: lines(pkg.highlights),
      exclusions: lines(pkg.exclusions),
      pickupPoints: lines(pkg.pickupPoints),
    },
    gallery: Array.isArray(pkg.gallery) ? pkg.gallery.filter(Boolean) : [],
    // Older packages only have names; show them as places without a pin.
    pickupLocations: pkg.pickupLocations?.length ? pkg.pickupLocations : (pkg.pickupPoints || []).map((name) => ({ name })),
    dropLocations: pkg.dropLocations?.length ? pkg.dropLocations : (pkg.dropPoints || []).map((name) => ({ name })),
    includes: pkg.includes?.length ? pkg.includes.map((i) => ({ ...i })) : [{ id: 'guide', label: 'Local guide', included: true }],
    itinerary: pkg.itinerary?.length
      ? pkg.itinerary.map((d, index) => ({
          day: d.day ?? index + 1,
          title: d.title || '',
          activities: lines(d.activities),
          mealPlan: d.mealPlan || '',
        }))
      : [{ day: 1, title: '', activities: '', mealPlan: '' }],
  };
};

const PackageForm = ({ initial, onSubmit, saving = false, submitLabel = 'Save package', onCancel, children, error }) => {
  const seed = useMemo(() => fromPackage(initial), [initial]);
  const [form, setForm] = useState(seed.form);
  const [includes, setIncludes] = useState(seed.includes);
  const [itinerary, setItinerary] = useState(seed.itinerary);
  const [gallery, setGallery] = useState(seed.gallery);
  const [pickupLocations, setPickupLocations] = useState(seed.pickupLocations);
  const [dropLocations, setDropLocations] = useState(seed.dropLocations);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState('');

  /** What is wrong with a step, or '' — checked on Next and again on save. */
  const problemsIn = (index) => {
    const n = (v) => Number(v);
    if (index === 0) {
      if (!String(form.title).trim()) return 'Give the package a title.';
      if (String(form.title).trim().length < 5) return 'The title is too short.';
      if (!(n(form.durationDays) >= 1 && n(form.durationDays) <= 60)) return 'Days must be between 1 and 60.';
      if (!(n(form.durationNights) >= 0 && n(form.durationNights) <= n(form.durationDays))) return 'Nights must be between 0 and the number of days.';
      if (!String(form.heroImage).trim()) return 'Upload a cover image.';
    }
    if (index === 2) {
      if (!(n(form.pricePerPerson) > 0)) return 'Set a price per person.';
      if (form.originalPrice && !(n(form.originalPrice) > n(form.pricePerPerson))) return 'The "was" price must be higher than the price per person.';
      if (!(n(form.childPricePercent) >= 0 && n(form.childPricePercent) <= 100)) return 'Child price % must be 0 to 100.';
      if (!(n(form.advancePercent) >= 1 && n(form.advancePercent) <= 100)) return 'Advance % must be 1 to 100.';
      if (!(n(form.groupSizeMin) >= 1)) return 'Minimum group size must be at least 1.';
      if (!(n(form.groupSizeMax) >= n(form.groupSizeMin))) return 'Maximum group size cannot be below the minimum.';
      if (!(n(form.leadTimeDays) >= 0 && n(form.leadTimeDays) <= 90)) return 'Book-ahead days must be 0 to 90.';
    }
    return '';
  };

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  // Mirrors the server's split so the price is not a surprise at booking time.
  const advancePreview = useMemo(() => {
    const price = Number(form.pricePerPerson) || 0;
    if (!price) return null;
    const advance = Math.ceil((price * Number(form.advancePercent || 100)) / 100);
    return { advance, balance: price - advance };
  }, [form.pricePerPerson, form.advancePercent]);

  const goNext = () => {
    const problem = problemsIn(step);
    setStepError(problem);
    if (problem) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => {
    setStepError('');
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = (event) => {
    event.preventDefault();
    for (let i = 0; i < STEPS.length; i += 1) {
      const problem = problemsIn(i);
      if (problem) {
        setStep(i);
        setStepError(problem);
        return;
      }
    }
    setStepError('');

    onSubmit({
      title: String(form.title).trim(),
      subtitle: String(form.subtitle).trim(),
      description: String(form.description).trim(),
      category: form.category,
      difficulty: form.difficulty,
      durationDays: Number(form.durationDays),
      durationNights: Number(form.durationNights),
      groupSizeMin: Number(form.groupSizeMin),
      groupSizeMax: Number(form.groupSizeMax),
      pricePerPerson: Number(form.pricePerPerson),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      childPricePercent: Number(form.childPricePercent),
      advancePercent: Number(form.advancePercent),
      leadTimeDays: Number(form.leadTimeDays),
      heroImage: String(form.heroImage).trim(),
      gallery,
      destinations: toLines(form.destinations),
      highlights: toLines(form.highlights),
      exclusions: toLines(form.exclusions),
      pickupLocations: pickupLocations.filter((p) => String(p.name || '').trim()),
      dropLocations: dropLocations.filter((p) => String(p.name || '').trim()),
      cancellationPolicy: String(form.cancellationPolicy).trim(),
      includes: includes.filter((i) => String(i.label || '').trim()),
      itinerary: itinerary
        .filter((d) => String(d.title || '').trim())
        .map((d, index) => ({
          day: index + 1,
          title: String(d.title).trim(),
          activities: toLines(d.activities),
          mealPlan: String(d.mealPlan || '').trim(),
        })),
    });
  };

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
      {children}

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {step === 0 && (
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
            <Package size={15} className="text-[#0a4d2b]" /> The package
          </h3>

          <div><label className={label}>Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={set('title')} placeholder="e.g. Haflong & Jatinga Bird Phenomenon Tour" className={field} /></div>

          <div><label className={label}>Subtitle</label>
            <input value={form.subtitle} onChange={set('subtitle')} placeholder="Misty hilltops, sunset viewpoints & sacred temples" className={field} /></div>

          <div><label className={label}>Description</label>
            <textarea value={form.description} onChange={set('description')} rows={3} className={field} /></div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className={label}>Category</label>
              <select value={form.category} onChange={set('category')} className={field}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className={label}>Difficulty</label>
              <select value={form.difficulty} onChange={set('difficulty')} className={field}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <div><label className={label}>Days</label>
              <input type="number" min="1" max="60" value={form.durationDays} onChange={set('durationDays')} className={field} /></div>
            <div><label className={label}>Nights</label>
              <input type="number" min="0" value={form.durationNights} onChange={set('durationNights')} className={field} /></div>
          </div>

          <ImageField
            label={<>Cover image <span className="text-red-500">*</span></>}
            value={form.heroImage}
            onChange={(url) => setForm((current) => ({ ...current, heroImage: url }))}
            folder="tours/packages"
            hint="Upload from your device. Shown on the package card and at the top of its page."
          />
          <ImageListField label="Gallery (optional)" value={gallery} onChange={setGallery} folder="tours/packages" max={8} />
        </section>
      )}

      {step === 1 && (
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
            <Route size={15} className="text-[#0a4d2b]" /> Route & highlights
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className={label}>Destinations</label>
              <textarea value={form.destinations} onChange={set('destinations')} rows={4} placeholder="One per line" className={field} /></div>
            <div><label className={label}>Highlights</label>
              <textarea value={form.highlights} onChange={set('highlights')} rows={4} placeholder="One per line" className={field} /></div>
            <div><label className={label}>Not included</label>
              <textarea value={form.exclusions} onChange={set('exclusions')} rows={4} placeholder="One per line" className={field} /></div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <PlaceListField
              label="Pickup points"
              value={pickupLocations}
              onChange={setPickupLocations}
              placeholder="Search e.g. Haflong bus stand"
              hint="Where travellers can be picked up. Leave empty if they reach the start on their own."
            />
            <PlaceListField
              label="Drop points"
              value={dropLocations}
              onChange={setDropLocations}
              placeholder="Search e.g. Lumding railway station"
              hint="Where the trip ends. Leave empty if it ends at the start."
            />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
            <IndianRupee size={15} className="text-[#0a4d2b]" /> Pricing
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className={label}>Per person <span className="text-red-500">*</span></label>
              <input type="number" min="0" value={form.pricePerPerson} onChange={set('pricePerPerson')} className={field} /></div>
            <div><label className={label}>Was (struck through)</label>
              <input type="number" min="0" value={form.originalPrice} onChange={set('originalPrice')} className={field} /></div>
            <div><label className={label}>Child price %</label>
              <input type="number" min="0" max="100" value={form.childPricePercent} onChange={set('childPricePercent')} className={field} /></div>
            <div><label className={label}>Advance %</label>
              <input type="number" min="1" max="100" value={form.advancePercent} onChange={set('advancePercent')} className={field} /></div>
          </div>

          {advancePreview && (
            <div className="p-4 bg-[#0a4d2b]/5 border border-[#0a4d2b]/15 rounded-xl text-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Per adult</p>
              <p className="text-gray-800">
                Traveller pays <strong>{currency(advancePreview.advance)}</strong> online
                {advancePreview.balance > 0 && (
                  <> and <strong>{currency(advancePreview.balance)}</strong> on the day</>
                )}.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Tax is charged on the full trip value either way.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className={label}>Min group size</label>
              <input type="number" min="1" value={form.groupSizeMin} onChange={set('groupSizeMin')} className={field} /></div>
            <div><label className={label}>Max group size</label>
              <input type="number" min="1" value={form.groupSizeMax} onChange={set('groupSizeMax')} className={field} /></div>
            <div><label className={label}>Book this many days ahead</label>
              <input type="number" min="0" value={form.leadTimeDays} onChange={set('leadTimeDays')} className={field} /></div>
          </div>

          <div><label className={label}>Cancellation policy</label>
            <textarea value={form.cancellationPolicy} onChange={set('cancellationPolicy')} rows={2} className={field} /></div>
        </section>
      )}

      {step === 3 && (
        <>
          <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <ListChecks size={15} className="text-[#0a4d2b]" /> What's included
              </h3>
              <button type="button" onClick={() => setIncludes((c) => [...c, { id: `item-${c.length + 1}`, label: '', included: true }])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600">
                <Plus size={12} /> Add
              </button>
            </div>
            {includes.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={item.label}
                  onChange={(e) => setIncludes((c) => c.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)))}
                  placeholder="e.g. Certified local guide"
                  className={field}
                />
                <button type="button" onClick={() => setIncludes((c) => c.filter((_, i) => i !== index))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg" aria-label="Remove">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </section>

          <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Itinerary</h3>
              <button type="button" onClick={() => setItinerary((c) => [...c, { day: c.length + 1, title: '', activities: '', mealPlan: '' }])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600">
                <Plus size={12} /> Add day
              </button>
            </div>
            {itinerary.map((day, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-12 shrink-0">Day {index + 1}</span>
                  <input
                    value={day.title}
                    onChange={(e) => setItinerary((c) => c.map((x, i) => (i === index ? { ...x, title: e.target.value } : x)))}
                    placeholder="Title for the day"
                    className={field}
                  />
                  <button type="button" onClick={() => setItinerary((c) => c.filter((_, i) => i !== index))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg" aria-label="Remove day">
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  value={day.activities}
                  onChange={(e) => setItinerary((c) => c.map((x, i) => (i === index ? { ...x, activities: e.target.value } : x)))}
                  rows={3} placeholder="One activity per line" className={field}
                />
                <input
                  value={day.mealPlan}
                  onChange={(e) => setItinerary((c) => c.map((x, i) => (i === index ? { ...x, mealPlan: e.target.value } : x)))}
                  placeholder="Meals included, e.g. Breakfast & dinner" className={field}
                />
              </div>
            ))}
          </section>
        </>
      )}

      {(stepError || error) && (
        <p className="px-4 py-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{stepError || error}</p>
      )}

      <div className="flex items-center gap-3 pb-8">
        {step > 0 && (
          <button type="button" onClick={goBack}
            className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50">
            <ChevronLeft size={16} /> Back
          </button>
        )}
        {!isLastStep ? (
          <button type="button" onClick={goNext}
            className="flex items-center gap-1.5 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e]">
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {submitLabel}
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 ml-auto">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default PackageForm;
