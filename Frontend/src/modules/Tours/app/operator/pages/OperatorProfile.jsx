/**
 * Profile and KYC.
 *
 * Deliberately reachable while the account is still pending — approval depends
 * on the documents collected here, so gating it would be a deadlock.
 */
import React, { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

import operatorService from '../../../services/operatorService';
import { useOperator } from '../layouts/OperatorLayout';

const input = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 transition';
const label = 'block text-[13px] font-semibold text-gray-700 mb-1.5';

const OperatorProfile = () => {
  const { operator, refresh } = useOperator();
  const [form, setForm] = useState({
    name: operator?.name || '',
    agencyName: operator?.agencyName || '',
    email: operator?.email || '',
    ownerName: operator?.ownerName || '',
    aadhaarNumber: operator?.aadhaarNumber || '',
    panNumber: operator?.panNumber || '',
    gstNumber: operator?.gstNumber || '',
    street: operator?.address?.street || '',
    city: operator?.address?.city || '',
    state: operator?.address?.state || '',
    zipCode: operator?.address?.zipCode || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((c) => ({ ...c, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Your name is required');

    try {
      setSaving(true);
      await operatorService.updateProfile({
        name: form.name.trim(),
        agencyName: form.agencyName.trim(),
        email: form.email.trim(),
        ownerName: form.ownerName.trim(),
        aadhaarNumber: form.aadhaarNumber.trim(),
        panNumber: form.panNumber.trim(),
        gstNumber: form.gstNumber.trim(),
        address: {
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zipCode: form.zipCode.trim(),
        },
      });
      toast.success('Profile saved');
      await refresh();
    } catch (error) {
      toast.error(error.message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  const status = operator?.operatorApprovalStatus;

  return (
    <form onSubmit={submit} className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Profile & KYC</h1>
        <p className="text-sm text-gray-500 mt-1">
          This is what an admin checks before approving your agency.
        </p>
      </div>

      {status && (
        <div className={`px-4 py-3 rounded-xl text-sm flex items-start gap-2.5 ${
          status === 'approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
            : status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100'
              : 'bg-amber-50 text-amber-800 border border-amber-100'
        }`}>
          <ShieldCheck size={16} className="mt-0.5 shrink-0" />
          <span>
            {status === 'approved' ? 'Your agency is approved — your packages can go live.'
              : status === 'rejected' ? (operator?.rejectionReason || 'Your registration was not approved.')
                : 'An admin is reviewing your agency. Complete the fields below to speed that up.'}
          </span>
        </div>
      )}

      <section className="to-card p-6 space-y-4">
        <h2 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">Agency</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={label}>Contact name <span className="text-red-500">*</span></label>
            <input className={input} value={form.name} onChange={set('name')} /></div>
          <div><label className={label}>Agency name</label>
            <input className={input} value={form.agencyName} onChange={set('agencyName')} /></div>
          <div><label className={label}>Email</label>
            <input className={input} type="email" value={form.email} onChange={set('email')} /></div>
          <div><label className={label}>Phone</label>
            <input className={input} value={operator?.phone || ''} disabled />
            <p className="text-xs text-gray-400 mt-1.5">Your phone is your sign-in — contact support to change it.</p></div>
        </div>
      </section>

      <section className="to-card p-6 space-y-4">
        <h2 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">KYC</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={label}>Owner's name</label>
            <input className={input} value={form.ownerName} onChange={set('ownerName')} /></div>
          <div><label className={label}>Aadhaar number</label>
            <input className={input} value={form.aadhaarNumber} onChange={set('aadhaarNumber')} /></div>
          <div><label className={label}>PAN</label>
            <input className={input} value={form.panNumber} onChange={set('panNumber')} /></div>
          <div><label className={label}>GST number</label>
            <input className={input} value={form.gstNumber} onChange={set('gstNumber')} /></div>
        </div>
      </section>

      <section className="to-card p-6 space-y-4">
        <h2 className="font-bold text-gray-900 text-sm pb-3 border-b border-gray-100">Address</h2>
        <div><label className={label}>Street</label>
          <input className={input} value={form.street} onChange={set('street')} /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className={label}>City</label>
            <input className={input} value={form.city} onChange={set('city')} /></div>
          <div><label className={label}>State</label>
            <input className={input} value={form.state} onChange={set('state')} /></div>
          <div><label className={label}>PIN code</label>
            <input className={input} value={form.zipCode} onChange={set('zipCode')} /></div>
        </div>
      </section>

      <button type="submit" disabled={saving} className="to-btn">
        {saving && <Loader2 size={16} className="animate-spin" />} Save profile
      </button>
    </form>
  );
};

export default OperatorProfile;
