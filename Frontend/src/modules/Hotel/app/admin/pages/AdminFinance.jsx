import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, TrendingUp, Download, ArrowUpRight, ArrowDownRight,
    CreditCard, Calendar, CheckCircle, Clock, Loader2, Building2, Users
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const currency = (n) => `₹${(n || 0).toLocaleString()}`;

const FinanceStatCard = ({ title, value, subtext, color, icon: Icon }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
        <div>
            <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            {subtext && <p className={`text-xs mt-1 ${color}`}>{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '50')} ${color}`}>
            <Icon size={24} />
        </div>
    </div>
);

const AdminFinance = () => {
    const [stats, setStats] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'success', onConfirm: () => { } });
    const commissionRate = 0.20;

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('adminToken');
            if (!token) return;
            try {
                setLoading(true);
                const [dash, reqs] = await Promise.all([
                    adminService.getDashboardStats(),
                    adminService.getPropertyRequests()
                ]);
                if (dash.success) setStats(dash.stats);
                if (reqs.success) setRequests(reqs.hotels || []);
            } catch (error) {
                if (error.response?.status !== 401) {
                    toast.error('Failed to load finance data');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter Logic
    const filteredRequests = useMemo(() => {
        if (statusFilter === 'All Status') return requests;
        return requests.filter(s => (statusFilter === 'Active' ? s.status === 'approved' : s.status !== 'approved'));
    }, [requests, statusFilter]);

    return (
        <div className="space-y-6">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Revenue Overview</h2>
                    <p className="text-gray-500 text-sm">Track subscription income and booking commissions.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg">
                    <Download size={16} /> Export Report
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FinanceStatCard
                    title="Total Revenue"
                    value={currency(stats?.totalRevenue)}
                    subtext=""
                    color="text-green-600"
                    icon={TrendingUp}
                />
                <FinanceStatCard
                    title="Platform Subs"
                    value={currency(0)}
                    subtext=""
                    color="text-blue-600"
                    icon={Building2}
                />
                <FinanceStatCard
                    title="Market Price Subs"
                    value={currency(0)}
                    subtext=""
                    color="text-orange-600"
                    icon={TrendingUp}
                />
                <FinanceStatCard
                    title="Commissions (20%)"
                    value={currency(Math.round((stats?.totalRevenue || 0) * commissionRate))}
                    subtext={`From ${stats?.confirmedBookings || 0} bookings`}
                    color="text-purple-600"
                    icon={Wallet}
                />
            </div>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Platform Access Revenue */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <Building2 size={16} className="text-blue-600" />
                                Platform Access
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">Core subscription revenue</p>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-bold text-gray-900">Premium</p>
                                <p className="text-xs font-bold text-blue-600">₹0</p>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-bold text-gray-900">Basic</p>
                                <p className="text-xs font-bold text-blue-600">₹0</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Market Intelligence Revenue */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-orange-50">
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <TrendingUp size={16} className="text-orange-600" />
                                Market Intelligence
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">Plans to see market prices</p>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-bold text-gray-900">Market Pro</p>
                                <p className="text-xs font-bold text-orange-600">₹0</p>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-bold text-gray-900">Market Lite</p>
                                <p className="text-xs font-bold text-orange-600">₹0</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Booking Commission Revenue */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-purple-50">
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <Wallet size={16} className="text-purple-600" />
                                Commissions
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">20% on confirmed bookings</p>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-bold text-gray-900">Bookings</p>
                                <p className="text-xs font-bold text-purple-600">{stats?.totalBookings || 0}</p>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-bold text-gray-900">Earnings</p>
                                <p className="text-xs font-bold text-purple-600">{currency(Math.round((stats?.totalRevenue || 0) * commissionRate))}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Property Requests */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[300px]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 text-lg">Pending Property Requests</h3>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm border border-gray-200 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-black"
                    >
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Pending</option>
                    </select>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Property Name</th>
                            <th className="p-4 font-semibold text-gray-600">Owner</th>
                            <th className="p-4 font-semibold text-gray-600">City</th>
                            <th className="p-4 font-semibold text-gray-600">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <AnimatePresence>
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i}>
                                        <td colSpan="4" className="p-4">
                                            <div className="h-10 bg-gray-50 animate-pulse rounded-lg"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredRequests.map((h) => (
                                <motion.tr
                                    key={h._id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="hover:bg-gray-50"
                                >
                                    <td className="p-4 font-medium text-gray-900">{h.name}</td>
                                    <td className="p-4">{h.ownerId?.name || 'Partner'}</td>
                                    <td className="p-4">{h.address?.city || '—'}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                            {h.status}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                        {(!loading && filteredRequests.length === 0) && (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-400">No pending requests found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <TrendingUp size={18} />
                    Subscription Model Details
                </h4>
                <div className="text-sm text-blue-800 space-y-3">
                    <div className="p-3 bg-white/50 rounded-lg border border-blue-100">
                        <p><strong>1. Platform Access Plans:</strong> Core entry fee for hotels to list and take bookings. (Basic/Premium)</p>
                    </div>
                    <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                        <p className="text-orange-900"><strong>2. Market Intelligence Plans:</strong> <span className="font-black">REQUIRED TO VIEW MARKET PRICES.</span> Hotels can subscribe separately to see competitor rates.</p>
                    </div>
                    <p><strong>Booking Commission:</strong> Platform earns 20% commission on every confirmed room booking.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminFinance;
