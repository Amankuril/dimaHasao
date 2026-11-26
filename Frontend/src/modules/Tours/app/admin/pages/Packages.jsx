import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Eye, Pencil, PlusCircle, Power, PowerOff, RefreshCw, Trash2, X } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatCard, StatusPill, currency, shortDate, IconAction } from '../components/ui';
import toast from 'react-hot-toast';

const FILTERS = ['all', 'pending', 'approved', 'rejected', 'draft'];

/** Everything about one package, read-only, with its booking numbers. */
const PackageDetails = ({ id, onClose, onEdit }) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    adminService.getPackage(id).then((res) => alive && setData(res)).catch((e) => {
      toast.error(e.message || 'Could not load this package');
      onClose();
    });
    return () => { alive = false; };
  }, [id, onClose]);
  const pkg = data?.package;
  const row = (label, value) => (value || value === 0 ? (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-neutral-100 last:border-0">
      <span className="text-neutral-500 shrink-0">{label}</span>
      <span className="text-neutral-900 text-right">{value}</span>
    </div>
  ) : null);
  const places = (list) => (list?.length ? list.map((p) => (typeof p === 'string' ? p : p.name)).join(' · ') : '—');
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        {!pkg ? <Spinner /> : (
          <>
            {pkg.heroImage && <img src={pkg.heroImage} alt="" className="w-full h-48 object-cover rounded-t-2xl" />}
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-medium text-neutral-900">{pkg.title}</h3>
                  {pkg.subtitle && <p className="text-sm text-neutral-500 mt-0.5">{pkg.subtitle}</p>}
                  <div className="mt-2 flex items-center gap-3"><StatusPill status={pkg.status} />{!pkg.isActive && <span className="text-xs text-neutral-500">switched off</span>}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <IconAction icon={Pencil} title="Edit" tone="edit" onClick={() => onEdit(pkg)} />
                  <IconAction icon={X} title="Close" onClick={onClose} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Bookings" value={data.stats?.bookings || 0} />
                <StatCard label="Revenue" value={currency(data.stats?.revenue)} />
                <StatCard label="Rating" value={pkg.totalReviews ? `${Number(pkg.avgRating || 0).toFixed(1)} (${pkg.totalReviews})` : '—'} />
              </div>
              {pkg.description && <p className="text-sm text-neutral-700 whitespace-pre-line">{pkg.description}</p>}
              <div>
                {row('Duration', `${pkg.durationDays} days / ${pkg.durationNights} nights`)}
                {row('Category', pkg.category)}
                {row('Difficulty', pkg.difficulty)}
                {row('Price per person', currency(pkg.pricePerPerson))}
                {pkg.originalPrice ? row('Was', currency(pkg.originalPrice)) : null}
                {row('Child price', `${pkg.childPricePercent}% of adult`)}
                {row('Paid online at booking', `${pkg.advancePercent}%`)}
                {row('Group size', `${pkg.groupSizeMin} – ${pkg.groupSizeMax}`)}
                {row('Book ahead', `${pkg.leadTimeDays} day(s)`)}
                {row('Destinations', (pkg.destinations || []).join(' · ') || '—')}
                {row('Pickup', places(pkg.pickupLocations?.length ? pkg.pickupLocations : pkg.pickupPoints))}
                {row('Drop', places(pkg.dropLocations?.length ? pkg.dropLocations : pkg.dropPoints))}
                {row('Created', shortDate(pkg.createdAt))}
              </div>
              {pkg.highlights?.length > 0 && (
                <div><p className="text-xs text-neutral-500 mb-1">Highlights</p><ul className="list-disc pl-5 text-sm text-neutral-800">{pkg.highlights.map((h) => <li key={h}>{h}</li>)}</ul></div>
              )}
              {pkg.itinerary?.length > 0 && (
                <div className="space-y-2"><p className="text-xs text-neutral-500">Itinerary</p>
                  {pkg.itinerary.map((d) => (
                    <div key={d.day} className="p-3 bg-neutral-50 rounded-xl text-sm">
                      <p className="font-medium text-neutral-900">Day {d.day}: {d.title}</p>
                      {d.activities?.length > 0 && <p className="text-neutral-600 mt-1">{d.activities.join(' · ')}</p>}
                      {d.mealPlan && <p className="text-xs text-neutral-500 mt-1">Meals: {d.mealPlan}</p>}
                    </div>
                  ))}
                </div>
              )}
              {pkg.gallery?.length > 0 && (
                <div className="grid grid-cols-4 gap-2">{pkg.gallery.map((g) => <img key={g} src={g} alt="" className="h-20 w-full object-cover rounded-lg" />)}</div>
              )}
              {pkg.rejectionReason && pkg.status === 'rejected' && <p className="text-sm text-red-700">Rejected: {pkg.rejectionReason}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Packages = () => {
  const navigate = useNavigate();
  const [viewingId, setViewingId] = useState(null);
  const closeView = useCallback(() => setViewingId(null), []);
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
      {viewingId && (
        <PackageDetails id={viewingId} onClose={closeView} onEdit={(p) => navigate(`/tours/admin/packages/${p._id}/edit`)} />
      )}
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
                <th className="p-4 font-medium">Actions</th>
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
                      <button type="button" onClick={() => setViewingId(pkg._id)} className="font-medium text-neutral-900 hover:underline text-left">{pkg.title}</button>
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <IconAction icon={Eye} title="View details" tone="view" onClick={() => setViewingId(pkg._id)} />
                        <IconAction icon={Pencil} title="Edit package" tone="edit" onClick={() => navigate(`/tours/admin/packages/${pkg._id}/edit`)} />
                        {pkg.status !== 'approved' && (
                          <IconAction icon={Check} title="Approve" tone="approve" disabled={busyId === pkg._id} onClick={() => decide(pkg, 'approved')} />
                        )}
                        {pkg.status !== 'rejected' && (
                          <IconAction icon={X} title="Reject" tone="danger" disabled={busyId === pkg._id} onClick={() => decide(pkg, 'rejected')} />
                        )}
                        <IconAction
                          icon={pkg.isActive ? PowerOff : Power}
                          title={pkg.isActive ? 'Switch off (hide from travellers)' : 'Switch on'}
                          tone={pkg.isActive ? 'neutral' : 'approve'}
                          disabled={busyId === pkg._id}
                          onClick={() => toggle(pkg)}
                        />
                        <IconAction
                          icon={Trash2}
                          title={confirmingId === pkg._id ? 'Click again to delete for good' : 'Delete'}
                          tone={confirmingId === pkg._id ? 'dangerSolid' : 'danger'}
                          busy={busyId === pkg._id}
                          onClick={() => remove(pkg)}
                        />
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
