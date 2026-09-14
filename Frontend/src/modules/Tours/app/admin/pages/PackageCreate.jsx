/**
 * Admin creates a package on behalf of an operator.
 *
 * The operator picker is the point of this screen — it posts `operatorId` in
 * the body, which is what the admin endpoint reads instead of the caller's own
 * id. Only approved operators are offered, because the server refuses the rest.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, currency } from '../components/ui';
import toast from 'react-hot-toast';

const CATEGORIES = ['sightseeing', 'trekking', 'adventure', 'cultural', 'nature', 'family', 'couple', 'group'];
const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging'];

const BLANK = {
  operatorId: '',
  publishImmediately: true,
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

const field = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 transition';
const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';

/** Textarea lines → a trimmed array, the shape the API expects for list fields. */
const toLines = (value) => String(value || '').split('\n').map((s) => s.trim()).filter(Boolean);

const PackageCreate = () => {
  const navigate = useNavigate();
  const [operators, setOperators] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [includes, setIncludes] = useState([{ id: 'guide', label: 'Local guide', included: true }]);
  const [itinerary, setItinerary] = useState([{ day: 1, title: '', activities: '', mealPlan: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService.getOperators({ approvalStatus: 'approved', minimal: 1 })
      .then((d) => setOperators(d.operators || []))
      .catch((e) => toast.error(e.message || 'Failed to load operators'));
  }, []);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  // Mirrors the server's split so the admin can see what the traveller pays now.
  const advancePreview = useMemo(() => {
    const price = Number(form.pricePerPerson) || 0;
    if (!price) return null;
    const advance = Math.ceil((price * Number(form.advancePercent || 100)) / 100);
    return { advance, balance: price - advance };
  }, [form.pricePerPerson, form.advancePercent]);

  const submit = async (event) => {
    event.preventDefault();

    if (!form.operatorId) return toast.error('Choose which operator this package belongs to');
    if (!form.title.trim()) return toast.error('The package needs a title');
    if (!form.heroImage.trim()) return toast.error('A cover image URL is required');
    if (!Number(form.pricePerPerson)) return toast.error('Set a price per person');

    const payload = {
      operatorId: form.operatorId,
      publishImmediately: form.publishImmediately,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      description: form.description.trim(),
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
      heroImage: form.heroImage.trim(),
      destinations: toLines(form.destinations),
      highlights: toLines(form.highlights),
      exclusions: toLines(form.exclusions),
      pickupPoints: toLines(form.pickupPoints),
      cancellationPolicy: form.cancellationPolicy.trim(),
      includes: includes.filter((i) => i.label.trim()),
      itinerary: itinerary
        .filter((d) => d.title.trim())
        .map((d, index) => ({
          day: index + 1,
          title: d.title.trim(),
          activities: toLines(d.activities),
          mealPlan: d.mealPlan.trim(),
        })),
    };

    try {
      setSaving(true);
      const result = await adminService.createPackageForOperator(payload);
      toast.success(result.message || 'Package created');
      navigate('/tours/admin/packages');
    } catch (error) {
      toast.error(error.message || 'Could not create this package');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-4xl">
      <PageHeader
        title="Create a package"
        subtitle="Built on behalf of an operator — it appears in their panel as if they had made it."
      />

      <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">Operator</h3>

        <div>
          <label className={label} htmlFor="operatorId">Which operator is this for? <span className="text-red-500">*</span></label>
          <select id="operatorId" value={form.operatorId} onChange={set('operatorId')} className={field}>
            <option value="">Select an operator…</option>
            {operators.map((operator) => (
              <option key={operator._id} value={operator._id}>
                {operator.agencyName || operator.name} · {operator.phone}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1.5">
            {operators.length === 0
              ? 'No approved operators yet — approve one first.'
              : 'Only approved operators can have packages sold under their name.'}
          </p>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-gray-700">
          <input type="checkbox" checked={form.publishImmediately} onChange={set('publishImmediately')} className="mt-0.5" />
          <span>
            <strong>Publish immediately</strong>
            <span className="block text-xs text-gray-400">
              Turn this off to leave it pending so the operator can review it before it goes live.
            </span>
          </span>
        </label>
      </section>

      <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">The package</h3>

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
            <input type="number" min="1" value={form.durationDays} onChange={set('durationDays')} className={field} /></div>
          <div><label className={label}>Nights</label>
            <input type="number" min="0" value={form.durationNights} onChange={set('durationNights')} className={field} /></div>
        </div>

        <div><label className={label}>Cover image URL <span className="text-red-500">*</span></label>
          <input value={form.heroImage} onChange={set('heroImage')} placeholder="https://…" className={field} /></div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><label className={label}>Destinations</label>
            <textarea value={form.destinations} onChange={set('destinations')} rows={3} placeholder="One per line" className={field} /></div>
          <div><label className={label}>Highlights</label>
            <textarea value={form.highlights} onChange={set('highlights')} rows={3} placeholder="One per line" className={field} /></div>
          <div><label className={label}>Not included</label>
            <textarea value={form.exclusions} onChange={set('exclusions')} rows={3} placeholder="One per line" className={field} /></div>
        </div>

        <div><label className={label}>Pickup points</label>
          <textarea value={form.pickupPoints} onChange={set('pickupPoints')} rows={2} placeholder="One per line" className={field} /></div>
      </section>

      <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h3 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">Pricing</h3>

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
                <> and <strong>{currency(advancePreview.balance)}</strong> to the operator on the day</>
              )}.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Commission and tax are charged on the full trip value either way — the advance only
              decides who is holding the cash.
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

      <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">What's included</h3>
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

      <div className="flex items-center gap-3 pb-8">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {form.publishImmediately ? 'Create and publish' : 'Create as pending'}
        </button>
        <button type="button" onClick={() => navigate('/tours/admin/packages')}
          className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default PackageCreate;
