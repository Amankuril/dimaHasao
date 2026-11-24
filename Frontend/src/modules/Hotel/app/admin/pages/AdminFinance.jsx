import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, TrendingUp, Download, ArrowUpRight, ArrowDownRight,
    CreditCard, Calendar, CheckCircle, Clock, Loader2, Users
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import PayoutSettlements from '../components/PayoutSettlements';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';
import StatusDot from '../components/StatusDot';

const currency = (n) => `₹${(n || 0).toLocaleString()}`;

// Number cards: label, figure, one line of context. The icon prop is kept for callers but not drawn.
// eslint-disable-next-line no-unused-vars
const FinanceStatCard = ({ title, value, subtext, color, icon }) => (
    <div className="rounded-xl border border-neutral-900/[0.08] bg-white p-5">
        <p className="text-[13px] text-neutral-500">{title}</p>
        <p className="mt-2 font-mono text-[28px] font-medium leading-9 text-neutral-900 tabular-nums">{value}</p>
        {subtext && <p className="mt-2 text-xs text-neutral-500">{subtext}</p>}
    </div>
);

const AdminFinance = () => {
    const [stats, setStats] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('All statuses');
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
        if (statusFilter === 'All statuses') return requests;
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
                    <h2 className="text-2xl font-medium text-neutral-900">Revenue overview</h2>
                    <p className="mt-1 text-sm text-neutral-500">Commission earned on confirmed stays</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm">
                    <Download size={16} /> Export report
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FinanceStatCard
                    title="Total revenue"
                    value={currency(stats?.totalRevenue)}
                    subtext=""
                    color="text-green-600"
                    icon={TrendingUp}
                />
                <FinanceStatCard
                    title="Commissions (20%)"
                    value={currency(Math.round((stats?.totalRevenue || 0) * commissionRate))}
                    subtext={`From ${stats?.confirmedBookings || 0} bookings`}
                    color="text-neutral-900"
                    icon={Wallet}
                />
            </div>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 gap-6">
                {/* Booking Commission Revenue */}
                <div className="bg-white border border-neutral-900/[0.08] rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                        <div>
                            <h3 className="font-medium text-neutral-900 text-sm flex items-center gap-2">
                                <Wallet size={16} className="text-neutral-900" />
                                Commissions
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">20% on confirmed bookings</p>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                                <p className="text-xs font-medium text-neutral-900">Bookings</p>
                                <p className="text-xs font-medium text-neutral-900">{stats?.totalBookings || 0}</p>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                                <p className="text-xs font-medium text-neutral-900">Earnings</p>
                                <p className="text-xs font-medium text-neutral-900">{currency(Math.round((stats?.totalRevenue || 0) * commissionRate))}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PayoutSettlements />

            {/* Pending Property Requests */}
            <div className="bg-white border border-neutral-900/[0.08] rounded-xl overflow-hidden min-h-[300px]">
                <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center">
                    <h3 className="font-medium text-neutral-900 text-lg">Pending property requests</h3>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm border border-neutral-200 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-[#0a4d2b]/30"
                    >
                        <option>All statuses</option>
                        <option>Active</option>
                        <option>Pending</option>
                    </select>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                            <th className="p-4 font-medium text-neutral-600">Property name</th>
                            <th className="p-4 font-medium text-neutral-600">Owner</th>
                            <th className="p-4 font-medium text-neutral-600">City</th>
                            <th className="p-4 font-medium text-neutral-600">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        <AnimatePresence>
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i}>
                                        <td colSpan="4" className="p-4">
                                            <div className="h-10 bg-neutral-50 animate-pulse rounded-lg"></div>
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
                                    className="hover:bg-neutral-50"
                                >
                                    <td className="p-4 font-medium text-neutral-900">{h.name}</td>
                                    <td className="p-4">{h.ownerId?.name || 'Partner'}</td>
                                    <td className="p-4">{h.address?.city || '—'}</td>
                                    <td className="p-4">
                                        <StatusDot status={h.status} />
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                        {(!loading && filteredRequests.length === 0) && (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-neutral-500">No pending requests</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Info Box */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6">
                <h4 className="font-medium text-neutral-900 mb-2 flex items-center gap-2">
                    <TrendingUp size={18} />
                    Revenue model
                </h4>
                <div className="text-sm text-neutral-700 space-y-3">
                    <p><strong>Booking Commission:</strong> Platform earns 20% commission on every confirmed room booking.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminFinance;
