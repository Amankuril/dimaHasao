/* Ported from Frontend/src/modules/Tours/components/PackageForm.jsx (tools/port.js first pass). */
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
import { ChevronLeft, ChevronRight, IndianRupee, ListChecks, Loader2, Package, Plus, Route, Save, Trash2 } from 'lucide-react-native';
import { StepIndicator } from '../app/admin/components/ui';
import { Button, Div, Form, H3, Input, Label, Option, P, Section, Select, Span, Strong, Textarea, Icon as UiIcon } from '../../components/web';
export const CATEGORIES = ['sightseeing', 'trekking', 'adventure', 'cultural', 'nature', 'family', 'couple', 'group'];
export const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging'];
export const field =
  'px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] transition';
export const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';
const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const STEPS = [
  {
    key: 'package',
    label: 'The package',
    icon: Package,
  },
  {
    key: 'route',
    label: 'Route & highlights',
    icon: Route,
  },
  {
    key: 'pricing',
    label: 'Pricing',
    icon: IndianRupee,
  },
  {
    key: 'itinerary',
    label: 'Included & itinerary',
    icon: ListChecks,
  },
];

/** Textarea lines → a trimmed array, the shape the API expects for list fields. */
export const toLines = (value) =>
  String(value || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
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
  if (!pkg)
    return {
      form: BLANK,
      includes: [
        {
          id: 'guide',
          label: 'Local guide',
          included: true,
        },
      ],
      itinerary: [
        {
          day: 1,
          title: '',
          activities: '',
          mealPlan: '',
        },
      ],
    };
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
    includes: pkg.includes?.length
      ? pkg.includes.map((i) => ({
          ...i,
        }))
      : [
          {
            id: 'guide',
            label: 'Local guide',
            included: true,
          },
        ],
    itinerary: pkg.itinerary?.length
      ? pkg.itinerary.map((d, index) => ({
          day: d.day ?? index + 1,
          title: d.title || '',
          activities: lines(d.activities),
          mealPlan: d.mealPlan || '',
        }))
      : [
          {
            day: 1,
            title: '',
            activities: '',
            mealPlan: '',
          },
        ],
  };
};
const PackageForm = ({ initial, onSubmit, saving = false, submitLabel = 'Save package', onCancel, children, error }) => {
  const seed = useMemo(() => fromPackage(initial), [initial]);
  const [form, setForm] = useState(seed.form);
  const [includes, setIncludes] = useState(seed.includes);
  const [itinerary, setItinerary] = useState(seed.itinerary);
  const [step, setStep] = useState(0);
  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  // Mirrors the server's split so the price is not a surprise at booking time.
  const advancePreview = useMemo(() => {
    const price = Number(form.pricePerPerson) || 0;
    if (!price) return null;
    const advance = Math.ceil((price * Number(form.advancePercent || 100)) / 100);
    return {
      advance,
      balance: price - advance,
    };
  }, [form.pricePerPerson, form.advancePercent]);
  const goNext = () => {
    if (step === 0 && !form.title.trim()) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const submit = (event) => {
    event.preventDefault();
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
      destinations: toLines(form.destinations),
      highlights: toLines(form.highlights),
      exclusions: toLines(form.exclusions),
      pickupPoints: toLines(form.pickupPoints),
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
    <Form onSubmit={submit} className="space-y-6">
      {children}

      <Div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <StepIndicator steps={STEPS} current={step} />
      </Div>

      {step === 0 && (
        <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <H3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
            <UiIcon as={Package} size={15} className="text-[#0a4d2b]" /> The package
          </H3>

          <Div>
            <Label className={label}>
              Title <Span className="text-red-500">*</Span>
            </Label>
            <Input value={form.title} onChange={set('title')} placeholder="e.g. Haflong & Jatinga Bird Phenomenon Tour" className={field} />
          </Div>

          <Div>
            <Label className={label}>Subtitle</Label>
            <Input value={form.subtitle} onChange={set('subtitle')} placeholder="Misty hilltops, sunset viewpoints & sacred temples" className={field} />
          </Div>

          <Div>
            <Label className={label}>Description</Label>
            <Textarea value={form.description} onChange={set('description')} rows={3} className={field} />
          </Div>

          <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Div>
              <Label className={label}>Category</Label>
              <Select value={form.category} onChange={set('category')} className={field}>
                {CATEGORIES.map((c) => (
                  <Option key={c} value={c}>
                    {c}
                  </Option>
                ))}
              </Select>
            </Div>
            <Div>
              <Label className={label}>Difficulty</Label>
              <Select value={form.difficulty} onChange={set('difficulty')} className={field}>
                {DIFFICULTIES.map((d) => (
                  <Option key={d} value={d}>
                    {d}
                  </Option>
                ))}
              </Select>
            </Div>
            <Div>
              <Label className={label}>Days</Label>
              <Input type="number" min="1" value={form.durationDays} onChange={set('durationDays')} className={field} />
            </Div>
            <Div>
              <Label className={label}>Nights</Label>
              <Input type="number" min="0" value={form.durationNights} onChange={set('durationNights')} className={field} />
            </Div>
          </Div>

          <Div>
            <Label className={label}>
              Cover image URL <Span className="text-red-500">*</Span>
            </Label>
            <Input value={form.heroImage} onChange={set('heroImage')} placeholder="https://…" className={field} />
          </Div>
        </Section>
      )}

      {step === 1 && (
        <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <H3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
            <UiIcon as={Route} size={15} className="text-[#0a4d2b]" /> Route & highlights
          </H3>

          <Div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Div>
              <Label className={label}>Destinations</Label>
              <Textarea value={form.destinations} onChange={set('destinations')} rows={4} placeholder="One per line" className={field} />
            </Div>
            <Div>
              <Label className={label}>Highlights</Label>
              <Textarea value={form.highlights} onChange={set('highlights')} rows={4} placeholder="One per line" className={field} />
            </Div>
            <Div>
              <Label className={label}>Not included</Label>
              <Textarea value={form.exclusions} onChange={set('exclusions')} rows={4} placeholder="One per line" className={field} />
            </Div>
          </Div>

          <Div>
            <Label className={label}>Pickup points</Label>
            <Textarea value={form.pickupPoints} onChange={set('pickupPoints')} rows={2} placeholder="One per line" className={field} />
          </Div>
        </Section>
      )}

      {step === 2 && (
        <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <H3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
            <UiIcon as={IndianRupee} size={15} className="text-[#0a4d2b]" /> Pricing
          </H3>

          <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Div>
              <Label className={label}>
                Per person <Span className="text-red-500">*</Span>
              </Label>
              <Input type="number" min="0" value={form.pricePerPerson} onChange={set('pricePerPerson')} className={field} />
            </Div>
            <Div>
              <Label className={label}>Was (struck through)</Label>
              <Input type="number" min="0" value={form.originalPrice} onChange={set('originalPrice')} className={field} />
            </Div>
            <Div>
              <Label className={label}>Child price %</Label>
              <Input type="number" min="0" max="100" value={form.childPricePercent} onChange={set('childPricePercent')} className={field} />
            </Div>
            <Div>
              <Label className={label}>Advance %</Label>
              <Input type="number" min="1" max="100" value={form.advancePercent} onChange={set('advancePercent')} className={field} />
            </Div>
          </Div>

          {advancePreview && (
            <Div className="p-4 bg-[#0a4d2b]/5 border border-[#0a4d2b]/15 rounded-xl text-sm">
              <P className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Per adult</P>
              <P className="text-gray-800">
                Traveller pays <Strong>{currency(advancePreview.advance)}</Strong> online
                {advancePreview.balance > 0 && (
                  <>
                    {' '}
                    and <Strong>{currency(advancePreview.balance)}</Strong> on the day
                  </>
                )}
                .
              </P>
              <P className="text-xs text-gray-500 mt-1">Tax is charged on the full trip value either way.</P>
            </Div>
          )}

          <Div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Div>
              <Label className={label}>Min group size</Label>
              <Input type="number" min="1" value={form.groupSizeMin} onChange={set('groupSizeMin')} className={field} />
            </Div>
            <Div>
              <Label className={label}>Max group size</Label>
              <Input type="number" min="1" value={form.groupSizeMax} onChange={set('groupSizeMax')} className={field} />
            </Div>
            <Div>
              <Label className={label}>Book this many days ahead</Label>
              <Input type="number" min="0" value={form.leadTimeDays} onChange={set('leadTimeDays')} className={field} />
            </Div>
          </Div>

          <Div>
            <Label className={label}>Cancellation policy</Label>
            <Textarea value={form.cancellationPolicy} onChange={set('cancellationPolicy')} rows={2} className={field} />
          </Div>
        </Section>
      )}

      {step === 3 && (
        <>
          <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <Div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <H3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <UiIcon as={ListChecks} size={15} className="text-[#0a4d2b]" /> {"What's included"}
              </H3>
              <Button
                type="button"
                onClick={() =>
                  setIncludes((c) => [
                    ...c,
                    {
                      id: `item-${c.length + 1}`,
                      label: '',
                      included: true,
                    },
                  ])
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600"
              >
                <UiIcon as={Plus} size={12} /> Add
              </Button>
            </Div>
            {includes.map((item, index) => (
              <Div key={index} className="flex items-center gap-2">
                <Input
                  value={item.label}
                  onChange={(e) =>
                    setIncludes((c) =>
                      c.map((x, i) =>
                        i === index
                          ? {
                              ...x,
                              label: e.target.value,
                            }
                          : x,
                      ),
                    )
                  }
                  placeholder="e.g. Certified local guide"
                  className={`${field} flex-1`}
                />
                <Button
                  type="button"
                  onClick={() => setIncludes((c) => c.filter((_, i) => i !== index))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  accessibilityLabel="Remove"
                >
                  <UiIcon as={Trash2} size={14} />
                </Button>
              </Div>
            ))}
          </Section>

          <Section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <Div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <H3 className="font-bold text-gray-900 text-sm">Itinerary</H3>
              <Button
                type="button"
                onClick={() =>
                  setItinerary((c) => [
                    ...c,
                    {
                      day: c.length + 1,
                      title: '',
                      activities: '',
                      mealPlan: '',
                    },
                  ])
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600"
              >
                <UiIcon as={Plus} size={12} /> Add day
              </Button>
            </Div>
            {itinerary.map((day, index) => (
              <Div key={index} className="p-4 bg-gray-50 rounded-xl space-y-3">
                <Div className="flex items-center gap-2">
                  <Span className="text-xs font-bold text-gray-500 w-12 shrink-0">Day {index + 1}</Span>
                  <Input
                    value={day.title}
                    onChange={(e) =>
                      setItinerary((c) =>
                        c.map((x, i) =>
                          i === index
                            ? {
                                ...x,
                                title: e.target.value,
                              }
                            : x,
                        ),
                      )
                    }
                    placeholder="Title for the day"
                    className={`${field} flex-1`}
                  />
                  <Button
                    type="button"
                    onClick={() => setItinerary((c) => c.filter((_, i) => i !== index))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    accessibilityLabel="Remove day"
                  >
                    <UiIcon as={Trash2} size={14} />
                  </Button>
                </Div>
                <Textarea
                  value={day.activities}
                  onChange={(e) =>
                    setItinerary((c) =>
                      c.map((x, i) =>
                        i === index
                          ? {
                              ...x,
                              activities: e.target.value,
                            }
                          : x,
                      ),
                    )
                  }
                  rows={3}
                  placeholder="One activity per line"
                  className={field}
                />
                <Input
                  value={day.mealPlan}
                  onChange={(e) =>
                    setItinerary((c) =>
                      c.map((x, i) =>
                        i === index
                          ? {
                              ...x,
                              mealPlan: e.target.value,
                            }
                          : x,
                      ),
                    )
                  }
                  placeholder="Meals included, e.g. Breakfast & dinner"
                  className={field}
                />
              </Div>
            ))}
          </Section>
        </>
      )}

      {error && <P className="px-4 py-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</P>}

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
            {submitLabel}
          </Button>
        )}
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 ml-auto"
          >
            Cancel
          </Button>
        )}
      </Div>
    </Form>
  );
};
export default PackageForm;
