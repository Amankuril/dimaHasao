import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, StatCard, currency } from '../components/ui';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then((d) => setStats(d.stats))
      .catch((e) => toast.error(e.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  const s = stats || {};

  return (
    <div className="space-y-6">
      <PageHeader title="Tours Overview" subtitle="Operators, packages and bookings across the module." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Operators" value={s.operators ?? 0} />
        <StatCard label="Packages" value={s.packages ?? 0} />
        <StatCard label="Bookings" value={s.bookings ?? 0} />
        <StatCard label="Collected online" value={currency(s.collectedOnline)} tone="text-[#0a4d2b]" />
      </div>

      {/* Both of these are queues, so they link straight to the filtered list. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/tours/admin/operators?approvalStatus=pending"
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-amber-300 transition-colors"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Awaiting approval</p>
          <p className="text-2xl font-black mt-1 text-amber-700">{s.pendingOperators ?? 0} operators</p>
        </Link>
        <Link
          to="/tours/admin/packages?status=pending"
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-amber-300 transition-colors"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Awaiting review</p>
          <p className="text-2xl font-black mt-1 text-amber-700">{s.pendingPackages ?? 0} packages</p>
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-gray-900 text-sm mb-4">Money</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Gross booked</p>
            <p className="font-black text-gray-900 mt-1">{currency(s.gross)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Commission</p>
            <p className="font-black text-amber-700 mt-1">{currency(s.commission)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tax</p>
            <p className="font-black text-gray-900 mt-1">{currency(s.taxes)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Operator payouts</p>
            <p className="font-black text-[#0a4d2b] mt-1">{currency(s.payout)}</p>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-4">
          Gross is the full trip value. Only the advance is collected online — operators
          take the balance directly from travellers.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
