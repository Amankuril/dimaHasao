import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Filter, MoreVertical, Ban, CheckCircle,
    Mail, Phone, Shield, Trash2, Unlock, Eye,
    ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';
import StatusDot from '../components/StatusDot';

const StatusBadge = ({ label, type }) => <StatusDot status={type} label={label} />;

const AdminPartners = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalUsers, setTotalUsers] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    // Force role to 'partner'
    const [filters, setFilters] = useState({
        search: '',
        role: 'partner',
        status: '',
        approvalStatus: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchUsers = useCallback(async (page, currentFilters) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            setLoading(true);
            const params = {
                page,
                limit,
                search: currentFilters.search,
                status: currentFilters.status,
                approvalStatus: currentFilters.approvalStatus
            };
            const data = await adminService.getPartners(params);
            if (data.success) {
                setUsers(data.partners);
                setTotalUsers(data.total);
                setTotalPages(Math.ceil(data.total / limit));
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Error fetching partners:', error);
                toast.error('Failed to load partners');
            }
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(currentPage, filters);
        }, 300); // 300ms debounce for search
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchUsers]);

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleUpdateStatus = async (userId, isBlocked) => {
        try {
            const res = await adminService.updatePartnerStatus(userId, isBlocked);
            if (res.success) {
                toast.success(`Partner ${isBlocked ?'blocked' : 'unblocked'} successfully`);
                fetchUsers(currentPage, filters);
            }
        } catch {
            toast.error('Failed to update partner status');
        }
    };

    const handleApproval = async (userId, status) => {
        try {
            const res = await adminService.updatePartnerApproval(userId, status);
            if (res.success) {
                toast.success(`Partner ${status}`);
                fetchUsers(currentPage, filters);
            }
        } catch {
            toast.error('Failed to update approval status');
        }
    };

    const handleAction = (action, user) => {
        setActiveDropdown(null);
        if (action === 'block') {
            setModalConfig({
                isOpen: true,
                title: 'Block partner?',
                message: `Are you sure you want to block ${user.name}? They will not be able to login or manage properties.`,
                type: 'danger',
                confirmText: 'Block partner',
                onConfirm: () => handleUpdateStatus(user._id, true)
            });
        } else if (action === 'unblock') {
            setModalConfig({
                isOpen: true,
                title: 'Unblock partner?',
                message: `Are you sure you want to unblock ${user.name}?`,
                type: 'success',
                confirmText: 'Unblock partner',
                onConfirm: () => handleUpdateStatus(user._id, false)
            });
        } else if (action === 'approve') {
            setModalConfig({
                isOpen: true,
                title: 'Approve partner?',
                message: `Approve ${user.name} to access partner app.`,
                type: 'success',
                confirmText: 'Approve',
                onConfirm: () => handleApproval(user._id, 'approved')
            });
        } else if (action === 'reject') {
            setModalConfig({
                isOpen: true,
                title: 'Reject partner?',
                message: `Reject ${user.name} partner access.`,
                type: 'danger',
                confirmText: 'Reject',
                onConfirm: () => handleApproval(user._id, 'rejected')
            });
        } else if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete partner?',
                message: `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
                type: 'danger',
                confirmText: 'Delete partner',
                onConfirm: async () => {
                    try {
                        const res = await adminService.deletePartner(user._id);
                        if (res.success) {
                            toast.success('Partner deleted successfully');
                            fetchUsers(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to delete partner');
                    }
                }
            });
        }
    };

    const handleExportCSV = () => {
        if (users.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Name', 'Email', 'Phone', 'Status', 'Joined Date'];
        const csvContent = [
            headers.join(','),
            ...users.map(u => [
                u._id,
                `"${u.name}"`,
                u.email,
                u.phone,
                u.isBlocked ? 'Blocked' : 'Active',
                new Date(u.createdAt).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `partners-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    return (
        <div className="space-y-6 relative" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-medium text-neutral-900">Partner management ({totalUsers})</h2>
                    <p className="mt-1 text-sm text-neutral-500">Owners and operators who list stays on the platform</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 border border-neutral-900/[0.08] rounded-xl flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search via name, email or phone"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-neutral-400 outline-none transition-colors"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {/* Role select removed as this is strictly for Partners */}
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-neutral-50 border border-transparent rounded-lg text-sm outline-none focus:bg-white focus:border-neutral-400 transition-colors"
                    >
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                    </select>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white border border-neutral-900/[0.08] rounded-xl overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
                                <th className="p-4">Partner details</th>
                                <th className="p-4">Contact info</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Account status</th>
                                <th className="p-4">Approval</th>
                                <th className="p-4">Joined date</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-4"><div className="h-10 bg-neutral-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {users.length > 0 ? (
                                        users.map((user, index) => (
                                            <motion.tr
                                                key={user._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.18 }}
                                                className="hover:bg-neutral-50 transition-colors group relative"
                                            >
                                                <td className="p-4">
                                                    <Link to={`/hotel/admin/partners/${user._id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                        <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 border border-white shadow-sm font-medium text-xs overflow-hidden">
                                                            {user.profileImage ? (
                                                                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                user.name?.charAt(0) || 'P'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                                                            <p className="text-xs text-neutral-500">ID: {user._id.slice(-6)}</p>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center text-xs font-medium text-neutral-600">
                                                            <Mail size={12} className="mr-1.5 text-neutral-500" />
                                                            {user.email || '—'}
                                                        </div>
                                                        <div className="flex items-center text-xs font-medium text-neutral-600">
                                                            <Phone size={12} className="mr-1.5 text-neutral-500" />
                                                            {user.phone}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[13px] text-neutral-600">Partner</span>
                                                </td>
                                                <td className="p-4">
                                                    <StatusBadge label={user.isBlocked ? 'Blocked' : 'Active'} type={user.isBlocked ? 'blocked' : 'active'} />
                                                </td>
                                                <td className="p-4">
                                                    <StatusBadge type={user.partnerApprovalStatus || 'pending'} />
                                                </td>
                                                <td className="p-4 text-xs text-neutral-500">
                                                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === user._id ? null : user._id); }}
                                                        className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === user._id && (
                                                        <div className="absolute right-8 top-8 w-40 bg-white border border-neutral-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <Link to={`/hotel/admin/partners/${user._id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 text-xs font-medium text-neutral-700">
                                                                <Eye size={14} /> View details
                                                            </Link>
                                                            {user.partnerApprovalStatus !== 'approved' && (
                                                                <button onClick={() => handleAction('approve', user)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-xs font-medium text-green-700">
                                                                    <CheckCircle size={14} /> Approve
                                                                </button>
                                                            )}
                                                            {user.partnerApprovalStatus !== 'rejected' && (
                                                                <button onClick={() => handleAction('reject', user)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-medium text-red-700">
                                                                    <Ban size={14} /> Reject
                                                                </button>
                                                            )}
                                                            {user.isBlocked ? (
                                                                <button onClick={() => handleAction('unblock', user)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-xs font-medium text-green-700">
                                                                    <Unlock size={14} /> Unblock partner
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handleAction('block', user)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-medium text-red-700">
                                                                    <Ban size={14} /> Block partner
                                                                </button>
                                                            )}
                                                            <div className="h-px bg-neutral-100 my-1"></div>
                                                            <button onClick={() => handleAction('delete', user)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-xs font-medium text-red-700">
                                                                <Trash2 size={14} /> Delete partner
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-neutral-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Users size={32} className="text-neutral-300" />
                                                    <p className="text-xs font-medium">No partners found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-neutral-100 flex items-center justify-between">
                        <p className="text-xs text-neutral-500">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPartners;
