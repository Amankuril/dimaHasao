import React, { useEffect, useState } from 'react';
import { IndianRupee, TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, FileText, Download } from 'lucide-react';
import adminService from '../../services/adminService';
import { toast } from 'react-hot-toast';

const FinanceAndPayoutsPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: {
      adminBalance: 0,
      totalRevenue: 0,
      totalEarnings: 0,
      totalTax: 0,
      totalPayouts: 0
    },
    transactions: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await adminService.getFinanceStats();
        if (res.success) {
          setData(res);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load finance data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const { stats, transactions } = data;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // eslint-disable-next-line no-unused-vars
  const StatCard = ({ title, value, icon, colorClass, subValue }) => (
    <div className="rounded-xl border border-neutral-900/[0.08] bg-white p-5">
      <p className="text-[13px] text-neutral-500">{title}</p>
      <p className="mt-2 font-mono text-[28px] font-medium leading-9 text-neutral-900 tabular-nums">{value}</p>
      {subValue && <p className="mt-2 text-xs text-neutral-500">{subValue}</p>}
    </div>
  );

  return (
    <div className="p-6 space-y-8 bg-neutral-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Finance & payouts</h1>
          <p className="mt-1 text-sm text-neutral-500">Monitor platform earnings, wallet balance, and partner payouts</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-neutral-200 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 text-sm font-medium shadow-sm transition-colors">
          <Download size={16} />
          Export report
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Wallet balance"
          value={stats.adminBalance}
          icon={Wallet}
          colorClass="text-[#0a4d2b]"
          subValue="Available for withdrawal"
        />
        <StatCard
          title="Total commission"
          value={stats.totalEarnings}
          icon={TrendingUp}
          colorClass="text-green-600"
          subValue="Net platform income"
        />
        <StatCard
          title="Gross booking value"
          value={stats.totalRevenue}
          icon={ArrowUpRight}
          colorClass="text-neutral-900"
          subValue="Total transaction volume"
        />
        <StatCard
          title="Total payouts"
          value={stats.totalPayouts}
          icon={ArrowDownLeft}
          colorClass="text-orange-600"
          subValue="Disbursed to partners"
        />
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-white">
          <h3 className="font-medium text-neutral-800 flex items-center gap-2">
            <FileText size={18} className="text-neutral-500" />
            Recent financial transactions
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100 text-xs text-neutral-500">
                <th className="px-6 py-4">Transaction / booking ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Gross amount</th>
                <th className="px-6 py-4">Commission</th>
                <th className="px-6 py-4">Tax</th>
                <th className="px-6 py-4">Partner payout</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-neutral-500 text-sm">
                    No financial transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-neutral-700 text-sm">#{t.bookingId}</span>
                        <span className="text-xs text-neutral-500 mt-0.5">
                          {t.propertyId?.propertyName || 'Unknown property'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {new Date(t.createdAt).toLocaleDateString()} <br />
                      <span className="text-xs text-neutral-500">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      ₹{t.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-green-600">
                      +₹{t.adminCommission?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      ₹{t.taxes?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-orange-600">
                      -₹{t.partnerPayout?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium  
                                                ${t.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                                            `}>
                        {t.paymentStatus}
                      </span>
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

export default FinanceAndPayoutsPage;
