import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Package, Wallet } from 'lucide-react';
import operatorService from '../../../services/operatorService';
import { useOperator } from '../layouts/OperatorLayout';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const OperatorDashboard = () => {
  const { operator } = useOperator();
  const [data, setData] = useState({ packages: [], bookings: [], wallet: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      operatorService.getMyPackages().catch(() => ({ packages: [] })),
      operatorService.getBookings().catch(() => ({ bookings: [] })),
      operatorService.getWallet().catch(() => ({ wallet: null })),
    ])
      .then(([p, b, w]) => setData({ packages: p.packages || [], bookings: b.bookings || [], wallet: w.wallet }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-400 py-12 text-center">Loading…</p>;

  const live = data.packages.filter((p) => p.status === 'approved' && p.isActive).length;
  const upcoming = data.bookings.filter((b) => b.bookingStatus === 'confirmed').length;
  const balanceOwed = data.bookings
    .filter((b) => b.paymentStatus === 'advance_paid')
    .reduce((sum, b) => sum + (b.balanceDue || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">
          Welcome back{operator?.agencyName ? `, ${operator.agencyName}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here's where your tours stand today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Live packages', live, Package, '/tours/operator/packages'],
          ['Upcoming trips', upcoming, Calendar, '/tours/operator/bookings'],
          ['Wallet', currency(data.wallet?.balance), Wallet, '/tours/operator/wallet'],
          ['To collect on the day', currency(balanceOwed), Calendar, '/tours/operator/bookings'],
        ].map(([label, value, Icon, to]) => (
          <Link key={label} to={to} className="to-card p-4 hover:border-[#0a4d2b]/30 transition-colors">
            <Icon size={18} className="text-[#0a4d2b] mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
            <p className="text-xl font-black text-gray-900 mt-0.5">{value}</p>
          </Link>
        ))}
      </div>

      <div className="to-card p-5">
        <h2 className="font-bold text-gray-900 text-sm mb-3">How you get paid</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Travellers pay the advance online and that lands in your wallet, less the platform's
          commission and tax. The remaining balance you collect from them directly on the day —
          mark it collected on the booking so your records match.
        </p>
      </div>
    </div>
  );
};

export default OperatorDashboard;
