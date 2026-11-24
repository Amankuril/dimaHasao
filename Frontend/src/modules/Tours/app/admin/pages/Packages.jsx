import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlusCircle, RefreshCw } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatCard, StatusPill, currency, shortDate } from '../components/ui';
import toast from 'react-hot-toast';

const FILTERS = ['all', 'pending', 'approved', 'rejected', 'draft'];

const Packages = () => {
  const [params, setParams] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  const status = params.get('status') || 'all';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getPackages({ status });
      setPackages(data.packages || []);
      setSummary(data.summary || {});
    } catch (error) {
      toast.error(error.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const decide = async (pkg, next) => {
    let reason;
    if (next === 'rejected') {
      // The server requires this.
      reason = window.prompt('Why is this package being rejected?', '');
      if (!reason || !reason.trim()) return;
    }
    try {
      setBusyId(pkg._id);
      await adminService.updatePackageStatus(pkg._id, next, reason);
      toast.success(`Package ${next}`);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this package');
    } finally {
      setBusyId(null);
    }
  };

  /** Hide a package from travellers without deleting it. */
  const toggle = async (pkg) => {
    try {
      setBusyId(pkg._id);
      await adminService.togglePackage(pkg._id, !pkg.isActive);
      toast.success(pkg.isActive ? 'Package hidden' : 'Package is live');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this package');
    } finally {
      setBusyId(null);
    }
  };

  /*
   * The server refuses to delete a package that has bookings and says so, which
   * is the message shown here — deleting one would orphan a traveller's trip.
   * Two steps rather than `window.confirm`, which embedded browsers suppress.
   */
  const remove = async (pkg) => {
    if (confirmingId !== pkg._id) {
      setConfirmingId(pkg._id);
      toast('Press delete again to confirm', { icon: '⚠️' });
      return;
    }
    try {
      setBusyId(pkg._id);
      await adminService.deletePackage(pkg._id);
      toast.success('Package deleted');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not delete this package');
    } finally {
      setBusyId(null);
      setConfirmingId(null);
    }
  };

  const total = Object.values(summary).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Packages"
        subtitle={`${summary.pending || 0} awaiting review`}
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/tours/admin/packages/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl text-sm font-medium hover:bg-[#06381e]"
            >
              <PlusCircle size={14} /> Create a package
            </Link>
            <button type="button" onClick={load} className="p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50" aria-label="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      {total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total packages" value={total} />
          <StatCard label="Pending review" value={summary.pending || 0} tone={summary.pending ? 'text-amber-600' : 'text-neutral-900'} />
          <StatCard label="Approved" value={summary.approved || 0} tone="text-[#0a4d2b]" />
          <StatCard label="Rejected" value={summary.rejected || 0} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setParams(value === 'all' ? {} : { status: value })}
            className={`h-8 px-3 rounded-lg text-[13px] transition-colors ${
              status === value ? 'bg-[#0a4d2b] text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}{value !== 'all' && summary[value] ? ` (${summary[value]})` : ''}
          </button>
        ))}
      </div>

      <div className="bg-white border border-neutral-900/[0.08] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[56rem]">
            <thead className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
              <tr>
                <th className="p-4 font-medium">Package</th>
                <th className="p-4 font-medium text-right">Price</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr><td colSpan="4"><Spinner /></td></tr>
              ) : packages.length === 0 ? (
                <tr><td colSpan="4"><EmptyState message="No packages here" /></td></tr>
              ) : (
                packages.map((pkg) => (
                  <tr key={pkg._id} className="hover:bg-neutral-50">
                    <td className="p-4">
                      <p className="font-medium text-neutral-900">{pkg.title}</p>
                      <p className="text-xs text-neutral-500">
                        {pkg.durationDays}D/{pkg.durationNights}N · {pkg.category}
                        {pkg.createdBy === 'admin' && ' · created by admin'}
                      </p>
                    </td>
                    <td className="p-4 text-right font-medium text-neutral-900">{currency(pkg.pricePerPerson)}</td>
                    <td className="p-4">
                      <StatusPill status={pkg.status} />
                      {!pkg.isActive && (
                        <span className="ml-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">off</span>
                      )}
                      <p className="text-xs text-neutral-500 mt-1">{shortDate(pkg.createdAt)}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.status !== 'approved' && (
                          <button type="button" disabled={busyId === pkg._id} onClick={() => decide(pkg, 'approved')}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0a4d2b] text-white hover:bg-[#06381e] disabled:opacity-50">
                            approve
                          </button>
                        )}
                        {pkg.status !== 'rejected' && (
                          <button type="button" disabled={busyId === pkg._id} onClick={() => decide(pkg, 'rejected')}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
                            reject
                          </button>
                        )}
                        <button type="button" disabled={busyId === pkg._id} onClick={() => toggle(pkg)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
                          {pkg.isActive ? 'switch off' : 'switch on'}
                        </button>
                        <button type="button" disabled={busyId === pkg._id} onClick={() => remove(pkg)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50">
                          delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Packages;
