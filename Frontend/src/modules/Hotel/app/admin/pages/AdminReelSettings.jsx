import React, { useEffect, useState } from 'react';
import {
  Video,
  Plus,
  Trash2,
  Save,
  Loader2,
  IndianRupee,
  Clock,
  History,
  Users,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminService from '../../../services/adminService';

const emptyTier = (order = 0) => ({
  minDuration: '',
  maxDuration: '',
  price: '',
  enabled: true,
  order,
});

const emptyRole = () => ({
  active: true,
  freeDuration: '',
  maxDuration: '',
  paidEnabled: false,
  tiers: [],
});

function mapRoleFromApi(nested, legacy = {}) {
  if (nested && nested.freeDurationSec != null) {
    return {
      active: nested.active !== false,
      freeDuration: nested.freeDurationSec ?? '',
      maxDuration: nested.maxDurationSec ?? '',
      paidEnabled: !!nested.paidDurationEnabled,
      tiers: (nested.durationTiers || []).map((t, idx) => ({
        minDuration: t.minDuration,
        maxDuration: t.maxDuration,
        price: t.price,
        enabled: t.enabled !== false,
        order: t.order ?? idx,
      })),
    };
  }
  return {
    active: true,
    freeDuration: legacy.freeDuration ?? '',
    maxDuration: legacy.maxDuration ?? '',
    paidEnabled: !!legacy.paidEnabled,
    tiers: legacy.tiers || [],
  };
}

function toPayload(roleState) {
  return {
    active: roleState.active !== false,
    freeDurationSec: Number(roleState.freeDuration),
    maxDurationSec: Number(roleState.maxDuration),
    paidDurationEnabled: !!roleState.paidEnabled,
    durationTiers: (roleState.tiers || []).map((t, idx) => ({
      minDuration: Number(t.minDuration),
      maxDuration: Number(t.maxDuration),
      price: Number(t.price),
      enabled: t.enabled !== false,
      order: Number.isFinite(Number(t.order)) ? Number(t.order) : idx,
    })),
  };
}

function RoleEditor({ label, hint, state, setState }) {
  const updateTier = (index, field, value) => {
    setState((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border border-gray-100 rounded-xl p-4 bg-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-900">{label} settings active</p>
          <p className="text-xs text-gray-500">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => setState((p) => ({ ...p, active: !p.active }))}
          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
            state.active ? 'bg-black' : 'bg-gray-300'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              state.active ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
            <Clock size={14} /> Free Duration (seconds)
          </label>
          <input
            type="number"
            min={1}
            value={state.freeDuration}
            onChange={(e) => setState((p) => ({ ...p, freeDuration: e.target.value }))}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black"
            placeholder="Free seconds"
          />
          <p className="text-[11px] text-gray-400 mt-1">Uploads up to this length have no duration charge.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Maximum Reel Duration (seconds)
          </label>
          <input
            type="number"
            min={1}
            value={state.maxDuration}
            onChange={(e) => setState((p) => ({ ...p, maxDuration: e.target.value }))}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black"
            placeholder="Max seconds"
          />
          <p className="text-[11px] text-gray-400 mt-1">Videos longer than this are rejected.</p>
        </div>
      </div>

      <div className="flex items-center justify-between border border-gray-100 rounded-xl p-4 bg-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-900">Enable Paid Duration</p>
          <p className="text-xs text-gray-500">Charge for reels longer than the free duration using the tiers below.</p>
        </div>
        <button
          type="button"
          onClick={() => setState((p) => ({ ...p, paidEnabled: !p.paidEnabled }))}
          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
            state.paidEnabled ? 'bg-black' : 'bg-gray-300'
          }`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              state.paidEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <IndianRupee size={16} /> Duration Pricing
          </h3>
          <button
            type="button"
            onClick={() =>
              setState((p) => ({
                ...p,
                tiers: [...p.tiers, emptyTier(p.tiers.length)],
              }))
            }
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white flex items-center gap-1"
          >
            <Plus size={14} /> Add Duration Range
          </button>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2.5">From (sec)</th>
                <th className="px-3 py-2.5">To (sec)</th>
                <th className="px-3 py-2.5">Price (₹)</th>
                <th className="px-3 py-2.5">Enabled</th>
                <th className="px-3 py-2.5">Order</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100 bg-emerald-50/40">
                <td className="px-3 py-2.5 text-gray-600">0</td>
                <td className="px-3 py-2.5 text-gray-600">{state.freeDuration || '—'}</td>
                <td className="px-3 py-2.5 font-semibold text-emerald-700">FREE</td>
                <td className="px-3 py-2.5 text-gray-400">—</td>
                <td className="px-3 py-2.5 text-gray-400">—</td>
                <td />
              </tr>
              {state.tiers.length === 0 ? (
                <tr className="border-t border-gray-100">
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-xs">
                    No paid ranges yet. Add a range when paid duration is enabled.
                  </td>
                </tr>
              ) : (
                state.tiers.map((t, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={t.minDuration}
                        onChange={(e) => updateTier(idx, 'minDuration', e.target.value)}
                        className="w-24 p-1.5 border border-gray-200 rounded-md"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={t.maxDuration}
                        onChange={(e) => updateTier(idx, 'maxDuration', e.target.value)}
                        className="w-24 p-1.5 border border-gray-200 rounded-md"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={t.price}
                        onChange={(e) => updateTier(idx, 'price', e.target.value)}
                        className="w-24 p-1.5 border border-gray-200 rounded-md"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={t.enabled !== false}
                        onChange={(e) => updateTier(idx, 'enabled', e.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={t.order}
                        onChange={(e) => updateTier(idx, 'order', e.target.value)}
                        className="w-16 p-1.5 border border-gray-200 rounded-md"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setState((p) => ({ ...p, tiers: p.tiers.filter((_, i) => i !== idx) }))
                        }
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Ranges must not overlap (touching boundaries like 10–30 and 30–60 are allowed). Disabled ranges are ignored.
        </p>
      </div>
    </div>
  );
}

export default function AdminReelSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('user');
  const [userCfg, setUserCfg] = useState(emptyRole());
  const [vendorCfg, setVendorCfg] = useState(emptyRole());
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminService.getPlatformSettings();
      const s = res.settings || {};
      const legacyTiers = (s.reelDurationTiers || []).map((t, idx) => ({
        minDuration: t.minDuration,
        maxDuration: t.maxDuration,
        price: t.price,
        enabled: t.enabled !== false,
        order: t.order ?? idx,
      }));
      setUserCfg(
        mapRoleFromApi(s.reelPricing?.user, {
          freeDuration: s.reelFreeDurationSec,
          maxDuration: s.reelMaxDurationSec,
          paidEnabled: s.reelPaidDurationEnabled,
          tiers: legacyTiers,
        })
      );
      setVendorCfg(mapRoleFromApi(s.reelPricing?.vendor, {}));
    } catch (e) {
      toast.error('Failed to load Reel settings');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      setPaymentsLoading(true);
      const res = await adminService.getReelDurationPayments({ page: 1, limit: 30 });
      setPayments(res.payments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadPayments();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminService.updatePlatformSettings({
        reelPricing: {
          user: toPayload(userCfg),
          vendor: toPayload(vendorCfg),
        },
      });
      toast.success('Reel upload settings saved');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading Reel settings…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Video size={24} /> Reel Upload Settings
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Separate free duration and paid ranges for Users and Vendors/Partners. Changes apply immediately to new uploads.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('user')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'user' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Users size={16} /> Users
          </button>
          <button
            type="button"
            onClick={() => setTab('vendor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'vendor' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Building2 size={16} /> Vendors / Partners
          </button>
        </div>

        {tab === 'user' ? (
          <RoleEditor
            label="User"
            hint="Applies to regular user reel uploads."
            state={userCfg}
            setState={setUserCfg}
          />
        ) : (
          <RoleEditor
            label="Vendor/Partner"
            hint="Applies to partners, brokers, agents, sellers, and admin uploads."
            state={vendorCfg}
            setState={setVendorCfg}
          />
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full md:w-auto px-6 py-3 rounded-xl bg-black text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Settings
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
          <History size={16} /> Reel Duration Charges
        </h3>
        {paymentsLoading ? (
          <div className="py-8 flex justify-center text-gray-400">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No duration payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 uppercase border-b">
                <tr>
                  <th className="py-2 pr-3">Uploader</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Duration</th>
                  <th className="py-2 pr-3">Range</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-gray-900">{p.user?.name || 'Uploader'}</div>
                      <div className="text-[11px] text-gray-400">{p.user?.phone || p.user?.email || ''}</div>
                      {p.reel && (
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Reel {String(p.reel._id).slice(-6)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 capitalize text-xs">{p.uploaderType || p.userModel || '—'}</td>
                    <td className="py-2.5 pr-3">{p.durationSec}s</td>
                    <td className="py-2.5 pr-3 text-xs text-gray-600">
                      {p.appliedTiernapshot
                        ? `${p.appliedTiernapshot.minDuration}–${p.appliedTiernapshot.maxDuration}s`
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold">₹{p.amount}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          p.paymentStatus === 'paid' || p.paymentStatus === 'used'
                            ? 'bg-emerald-50 text-emerald-700'
                            : p.paymentStatus === 'failed'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-gray-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
