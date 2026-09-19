import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlusCircle, RefreshCw } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatusPill, currency, shortDate } from '../components/ui';
import toast from 'react-hot-toast';

const FILTERS = ['all', 'pending', 'approved', 'rejected', 'draft'];

const Packages = () => {
  const [params, setParams] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Packages"
        subtitle={`${summary.pending || 0} awaiting review`}
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/tours/admin/packages/new"
              className="flex items-center gap-2 px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-bold hover:bg-neutral-800"
            >
              <PlusCircle size={14} /> Create a package
            </Link>
            <button type="button" onClick={load} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50" aria-label="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setParams(value === 'all' ? {} : { status: value })}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors ${
              status === value ? 'bg-neutral-950 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {value}{value !== 'all' && summary[value] ? ` (${summary[value]})` : ''}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[56rem]">
            <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="p-4 font-semibold">Package</th>
                <th className="p-4 font-semibold text-right">Price</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="4"><Spinner /></td></tr>
              ) : packages.length === 0 ? (
                <tr><td colSpan="4"><EmptyState message="No packages here." /></td></tr>
              ) : (
                packages.map((pkg) => (
                  <tr key={pkg._id} className="hover:bg-gray-50/60">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{pkg.title}</p>
                      <p className="text-[10px] text-gray-400">
                        {pkg.durationDays}D/{pkg.durationNights}N · {pkg.category}
                        {pkg.createdBy === 'admin' && ' · created by admin'}
                      </p>
                    </td>
                    <td className="p-4 text-right font-bold text-gray-900">{currency(pkg.pricePerPerson)}</td>
                    <td className="p-4">
                      <StatusPill status={pkg.status} />
                      {!pkg.isActive && (
                        <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">off</span>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">{shortDate(pkg.createdAt)}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.status !== 'approved' && (
                          <button type="button" disabled={busyId === pkg._id} onClick={() => decide(pkg, 'approved')}
                            className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                            approve
                          </button>
                        )}
                        {pkg.status !== 'rejected' && (
                          <button type="button" disabled={busyId === pkg._id} onClick={() => decide(pkg, 'rejected')}
                            className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                            reject
                          </button>
                        )}
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
