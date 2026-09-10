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

  const StatCard = ({ title, value, icon: Icon, colorClass, subValue }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass.replace('text-', 'bg-')}`}>
        <Icon size={64} />
      </div>
      <div className="relative z-10">
        <div className={`p-3 rounded-lg w-fit mb-4 ${colorClass.replace('text-', 'bg-').replace('600', '50')}`}>
          <Icon size={24} className={colorClass} />
        </div>
        <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-1">
          <IndianRupee size={20} strokeWidth={2.5} />
          {value.toLocaleString()}
        </h3>
        {subValue && <p className="text-xs text-gray-400 mt-2">{subValue}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Payouts</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor platform earnings, wallet balance, and partner payouts.</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors">
          <Download size={16} />
          Export Report
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Wallet Balance"
          value={stats.adminBalance}
          icon={Wallet}
          colorClass="text-blue-600"
          subValue="Available for withdrawal"
        />
        <StatCard
          title="Total Commission"
          value={stats.totalEarnings}
          icon={TrendingUp}
          colorClass="text-green-600"
          subValue="Net platform income"
        />
        <StatCard
          title="Gross Booking Value"
          value={stats.totalRevenue}
          icon={ArrowUpRight}
          colorClass="text-purple-600"
          subValue="Total transaction volume"
        />
        <StatCard
          title="Total Payouts"
          value={stats.totalPayouts}
          icon={ArrowDownLeft}
          colorClass="text-orange-600"
          subValue="Disbursed to partners"
        />
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-gray-400" />
            Recent Financial Transactions
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-6 py-4">Transaction / Booking ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Gross Amount</th>
                <th className="px-6 py-4">Commission</th>
                <th className="px-6 py-4">Tax</th>
                <th className="px-6 py-4">Partner Payout</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400 text-sm">
                    No financial transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700 text-sm">#{t.bookingId}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          {t.propertyId?.propertyName || 'Unknown Property'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(t.createdAt).toLocaleDateString()} <br />
                      <span className="text-[10px] text-gray-400">{new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      ₹{t.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-green-600">
                      +₹{t.adminCommission?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      ₹{t.taxes?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-orange-600">
                      -₹{t.partnerPayout?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
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
