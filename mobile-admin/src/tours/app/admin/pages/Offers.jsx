/* Ported from Frontend/src/modules/Tours/app/admin/pages/Offers.jsx (tools/port.js first pass). */
/**
 * Promo codes for tour packages.
 *
 * The discount is never computed here — this screen only describes a code, and
 * the server decides what it is worth when a traveller quotes a trip. That keeps
 * the figure shown at checkout and the figure charged in one place.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, IndianRupee, Loader2, Package, Plus, Save, Tag } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import adminService from '../../../services/adminService';
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
import { Button, Div, Form, Input, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
const STEPS = [
  {
    key: 'code',
    label: 'The code',
    icon: Tag,
  },
  {
    key: 'worth',
    label: "What it's worth",
    icon: IndianRupee,
  },
  {
    key: 'window',
    label: 'When & how often',
    icon: Clock,
  },
  {
    key: 'scope',
    label: 'Where it applies',
    icon: Package,
  },
];
const BLANK = {
  code: '',
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscount: '',
  minBookingAmount: '',
  startDate: '',
  endDate: '',
  usageLimit: 1000,
  userLimit: 1,
  packageIds: [],
  isActive: true,
};

/** yyyy-mm-dd for a date input, which will not accept an ISO timestamp. */
const dateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const fromOffer = (o) =>
  !o
    ? BLANK
    : {
        ...BLANK,
        ...Object.fromEntries(Object.entries(o).filter(([k]) => k in BLANK)),
        maxDiscount: o.maxDiscount ?? '',
        minBookingAmount: o.minBookingAmount ?? '',
        startDate: dateInput(o.startDate),
        endDate: dateInput(o.endDate),
        packageIds: (o.packageIds || []).map(String),
      };
const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** What a code is worth, in words — the same rule the server applies. */
const worthOf = (o) =>
  o.discountType === 'flat' ? `${rupees(o.discountValue)} off` : `${o.discountValue}% off${o.maxDiscount ? ` up to ${rupees(o.maxDiscount)}` : ''}`;
const Offers = () => {
  const { tablet } = useLayoutWidth();
  const formCols = tablet ? 2 : 1;
  const [offers, setOffers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list, {} = new, {...} = edit
  const [step, setStep] = useState(0);
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
  useEffect(() => {
    load();
  }, [load]);

  // Scope lists are only needed by the form; failing to load one should narrow
  // the choices, not stop an admin creating a platform-wide code.
  useEffect(() => {
    adminService
      .getPackages({
        status: 'approved',
      })
      .then((d) => setPackages(d.packages || []))
      .catch(() => setPackages([]));
  }, []);
  const openNew = () => {
    setForm(BLANK);
    setStep(0);
    setEditing({});
  };
  const openEdit = (o) => {
    setForm(fromOffer(o));
    setStep(0);
    setEditing(o);
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
  const goNext = () => {
    if (step === 0 && !form.code.trim()) return toast.error('Give the offer a code first');
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const toggleScope = (key, id) =>
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((v) => v !== id) : [...current[key], id],
    }));
  const preview = useMemo(() => {
    const value = Number(form.discountValue) || 0;
    if (!value) return '';
    return worthOf({
      ...form,
      discountValue: value,
      maxDiscount: Number(form.maxDiscount) || 0,
    });
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
      const result = editing?._id ? await adminService.updateOffer(editing._id, payload) : await adminService.createOffer(payload);
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
    const isLastStep = step === STEPS.length - 1;
    return (
      <AdminPage maxWidth={720}>
        <Form onSubmit={submit}>
          <PageHeader
            title={editing._id ? `Edit ${editing.code}` : 'Create an offer'}
            subtitle="Travellers enter this code on the tour booking screen."
            breadcrumb={[{ label: 'Tours' }, { label: 'Offers' }, { label: editing._id ? 'Edit' : 'New' }]}
          />

          <Div className="mb-4">
            <StepIndicator steps={STEPS} current={step} />
          </Div>

          {step === 0 && (
            <Card className="mb-4 gap-4">
              <SectionTitle action={<UiIcon as={Tag} size={16} className="text-blue-600" />}>The code</SectionTitle>

              <Div className={`grid grid-cols-${formCols} gap-3`}>
                <Field label="Code" required>
                  <Input
                    className={`${INPUT} font-semibold`}
                    value={form.code}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="MONSOON20"
                  />
                </Field>
                <Field label="Title" required>
                  <Input className={INPUT} value={form.title} onChange={set('title')} placeholder="Monsoon 20% off" />
                </Field>
              </Div>

              <Field label="Description">
                <Input className={INPUT} value={form.description} onChange={set('description')} placeholder="Shown under the code on the booking screen" />
              </Field>
            </Card>
          )}

          {step === 1 && (
            <Card className="mb-4 gap-4">
              <SectionTitle action={<UiIcon as={IndianRupee} size={16} className="text-blue-600" />}>What it is worth</SectionTitle>

              <Div className={`grid grid-cols-${formCols} gap-3`}>
                <Field label="Discount type">
                  <Select className={INPUT} value={form.discountType} onChange={set('discountType')}>
                    <Option value="percentage">Percentage of the fare</Option>
                    <Option value="flat">Flat amount</Option>
                  </Select>
                </Field>
                <Field label={form.discountType === 'flat' ? 'Amount off (₹)' : 'Percent off (%)'} required>
                  <Input className={INPUT} type="number" min="0" value={form.discountValue} onChange={set('discountValue')} />
                </Field>
                {form.discountType === 'percentage' && (
                  <Field label="Cap the discount at (₹)">
                    <Input className={INPUT} type="number" min="0" value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="Leave blank for no cap" />
                  </Field>
                )}
                <Field label="Minimum fare (₹)" hint="Below this the code is refused.">
                  <Input className={INPUT} type="number" min="0" value={form.minBookingAmount} onChange={set('minBookingAmount')} />
                </Field>
              </Div>

              {preview ? (
                <Div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                  <P className="text-sm font-semibold text-blue-700">Travellers will see: {preview}</P>
                </Div>
              ) : null}
              <P className="text-xs text-slate-500">
                The discount comes off the fare. Tax and the platform commission are still charged on the undiscounted fare.
              </P>
            </Card>
          )}

          {step === 2 && (
            <Card className="mb-4 gap-4">
              <SectionTitle action={<UiIcon as={Clock} size={16} className="text-blue-600" />}>When and how often</SectionTitle>

              <Div className={`grid grid-cols-${formCols} gap-3`}>
                <Field label="Starts" hint="Blank means immediately.">
                  <Input className={INPUT} type="date" value={form.startDate} onChange={set('startDate')} />
                </Field>
                <Field label="Ends" hint="Blank means it never expires.">
                  <Input className={INPUT} type="date" value={form.endDate} onChange={set('endDate')} />
                </Field>
                <Field label="Total redemptions" hint="0 means unlimited.">
                  <Input className={INPUT} type="number" min="0" value={form.usageLimit} onChange={set('usageLimit')} />
                </Field>
                <Field label="Per traveller">
                  <Input className={INPUT} type="number" min="1" value={form.userLimit} onChange={set('userLimit')} />
                </Field>
              </Div>

              <Div className="flex-row items-center gap-3">
                <Input type="checkbox" className="w-5 h-5" checked={form.isActive} onChange={set('isActive')} />
                <P className="text-sm text-slate-700 flex-1">Live — travellers can use it</P>
              </Div>
            </Card>
          )}

          {step === 3 && (
            <Card className="mb-4 gap-4">
              <SectionTitle action={<UiIcon as={Package} size={16} className="text-blue-600" />}>Where it applies</SectionTitle>
              <P className="text-sm text-slate-500">Select nothing to let the code work on every tour.</P>

              <Field label="Packages">
                <ScrollDiv nestedScrollEnabled className="border border-slate-200 rounded-lg" style={{ maxHeight: 240 }}>
                  {packages.length === 0 ? (
                    <P className="text-sm text-slate-500 p-3">No approved packages.</P>
                  ) : (
                    packages.map((p, i, a) => (
                      <Div
                        key={p._id}
                        onClick={() => toggleScope('packageIds', String(p._id))}
                        className={`flex-row items-center gap-3 px-3 py-3 ${i === a.length - 1 ? '' : 'border-b border-slate-100'}`}
                      >
                        <Input
                          type="checkbox"
                          className="w-5 h-5"
                          checked={form.packageIds.includes(String(p._id))}
                          onChange={() => toggleScope('packageIds', String(p._id))}
                        />
                        <Span className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                          {p.title}
                        </Span>
                      </Div>
                    ))
                  )}
                </ScrollDiv>
              </Field>
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
                <Span className={BTN_TEXT_PRIMARY}>{editing._id ? 'Save changes' : 'Create offer'}</Span>
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
        title="Offers"
        subtitle="Promo codes travellers can use on tour bookings."
        breadcrumb={[{ label: 'Tours' }, { label: 'Offers' }]}
        actions={
          <Button type="button" onClick={openNew} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Create an offer</Span>
          </Button>
        }
      />

      {!loading && offers.length > 0 && (
        <StatGrid className="mb-4">
          <StatCard label="Total offers" value={offers.length} />
          <StatCard label="Live" value={offers.filter((o) => o.isActive).length} tone="success" />
          <StatCard label="Total redemptions" value={offers.reduce((n, o) => n + (o.usageCount || 0), 0)} />
        </StatGrid>
      )}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : offers.length === 0 ? (
        <EmptyState title="No offers yet" message="Create the first promo code travellers can use." actionLabel="Create an offer" onAction={openNew} />
      ) : (
        <Div className="gap-3">
          {offers.map((o) => {
            const expired = o.endDate && new Date(o.endDate) < new Date();
            const exhausted = o.usageLimit > 0 && o.usageCount >= o.usageLimit;
            return (
              <Card key={o._id} className="gap-3">
                <Div className="flex-row items-start gap-3">
                  <Div className="w-11 h-11 rounded-lg bg-blue-100 items-center justify-center shrink-0">
                    <UiIcon as={Tag} size={18} className="text-blue-600" />
                  </Div>

                  <Div className="flex-1 min-w-0">
                    <P className="text-base font-semibold text-slate-900" numberOfLines={1}>
                      {o.code}
                    </P>
                    <P className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                      {o.title}
                    </P>
                    <P className="text-xs text-slate-500 mt-1" numberOfLines={2}>
                      Used {o.usageCount}
                      {o.usageLimit > 0 ? ` of ${o.usageLimit}` : ''}
                      {o.minBookingAmount > 0 ? ` · min ${rupees(o.minBookingAmount)}` : ''}
                      {o.packageIds?.length ? ` · ${o.packageIds.length} package(s)` : ''}
                      {o.endDate ? ` · until ${new Date(o.endDate).toLocaleDateString('en-IN')}` : ''}
                    </P>
                  </Div>
                </Div>

                <Div className="flex-row flex-wrap items-center gap-2">
                  <StatusBadge status="worth" tone="info" label={worthOf(o)} />
                  {!o.isActive && <StatusBadge status="paused" tone="warning" label="paused" />}
                  {expired && <StatusBadge status="expired" label="expired" />}
                  {exhausted && <StatusBadge status="used up" tone="danger" label="used up" />}
                </Div>

                <Div className="flex-row flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  <Div className="flex-row items-center gap-2 mr-auto">
                    <Input type="checkbox" className="w-5 h-5" checked={o.isActive} disabled={busyId === o._id} onChange={() => toggle(o)} />
                    <Span className="text-sm text-slate-700">Live</Span>
                  </Div>
                  <Button type="button" onClick={() => openEdit(o)} className={BTN_SECONDARY}>
                    <Span className={BTN_TEXT_SECONDARY}>Edit</Span>
                  </Button>
                  <Button
                    type="button"
                    disabled={busyId === o._id}
                    onClick={() => remove(o)}
                    className={
                      confirmingId === o._id ? BTN_DANGER : 'flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg border border-red-200 bg-white'
                    }
                  >
                    <Span className={`text-sm font-semibold ${confirmingId === o._id ? 'text-white' : 'text-red-600'}`}>
                      {confirmingId === o._id ? 'Delete for good?' : 'Delete'}
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
export default Offers;
