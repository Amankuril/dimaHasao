import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Pencil, PlusCircle } from 'lucide-react';
import operatorService from '../../../services/operatorService';
import toast from 'react-hot-toast';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STATUS_TONES = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
};

const OperatorPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await operatorService.getMyPackages();
      setPackages(data.packages || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load your packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (pkg) => {
    try {
      setBusyId(pkg._id);
      await operatorService.togglePackage(pkg._id, !pkg.isActive);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this package');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Your packages</h1>
          <p className="text-sm text-gray-500 mt-1">New packages go live once an admin approves them.</p>
        </div>
        <Link to="/tours/operator/packages/new" className="to-btn">
          <PlusCircle size={16} /> New package
        </Link>
      </div>

      {loading ? (
        <p className="text-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin inline" /></p>
      ) : packages.length === 0 ? (
        <div className="to-card p-10 text-center">
          <p className="text-sm text-gray-500">You have not created a package yet.</p>
          <Link to="/tours/operator/packages/new" className="to-btn mt-4">
            <PlusCircle size={16} /> Create your first package
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <div key={pkg._id} className="to-card p-4 flex flex-wrap items-start gap-4">
              <img
                src={pkg.heroImage}
                alt=""
                className="w-24 h-20 rounded-xl object-cover bg-gray-100 shrink-0"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
              {/* basis-48 gives this block a floor width, so on a phone the
                  actions wrap to their own row instead of squeezing the title. */}
              <div className="flex-1 basis-48 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-gray-900">{pkg.title}</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_TONES[pkg.status] || 'bg-gray-100 text-gray-600'}`}>
                    {pkg.status}
                  </span>
                  {pkg.createdBy === 'admin' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                      added by admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {pkg.durationDays}D/{pkg.durationNights}N · {pkg.category} · {pkg.difficulty}
                </p>
                {pkg.rejectionReason && (
                  <p className="text-xs text-red-600 mt-1">Rejected: {pkg.rejectionReason}</p>
                )}
                <p className="text-sm font-bold text-gray-900 mt-2">
                  {currency(pkg.pricePerPerson)}
                  <span className="text-xs font-medium text-gray-400"> per person · {pkg.advancePercent}% advance</span>
                </p>
              </div>

              <div className="flex flex-row-reverse sm:flex-col items-center sm:items-end justify-end gap-3 sm:gap-2 w-full sm:w-auto shrink-0">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <input type="checkbox" checked={pkg.isActive} disabled={busyId === pkg._id} onChange={() => toggle(pkg)} />
                  Bookable
                </label>
                <Link to={`/tours/operator/packages/${pkg._id}/edit`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50">
                  <Pencil size={12} /> Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OperatorPackages;
