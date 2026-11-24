import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, Calendar, MapPin, Shield, CreditCard,
    History, AlertTriangle, Ban, CheckCircle, Lock, Unlock, Loader2,
    Building, FileText, CheckSquare, XSquare, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import walletService from '../../../services/walletService';
import toast from 'react-hot-toast';
import StatusDot from '../components/StatusDot';

const PartnerPropertiesTab = ({ properties }) => (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
                <tr>
                    <th className="p-4 font-medium text-neutral-600">Property name</th>
                    <th className="p-4 font-medium text-neutral-600">Location</th>
                    <th className="p-4 font-medium text-neutral-600">Type</th>
                    <th className="p-4 font-medium text-neutral-600">Status</th>
                    <th className="p-4 font-medium text-neutral-600 text-right">Added on</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
                {properties && properties.length > 0 ? (
                    properties.map((property, i) => (
                        <tr key={i} className="hover:bg-neutral-50">
                            <td className="p-4 font-medium text-neutral-900">
                                <Link to={`/hotel/admin/properties/${property._id}`} className="hover:text-[#0a4d2b] hover:underline">
                                    {property.propertyName}
                                </Link>
                            </td>
                            <td className="p-4 text-xs text-neutral-500">{property.address?.city}, {property.address?.state}</td>
                            <td className="p-4 text-xs text-neutral-500 capitalize">{property.propertyType}</td>
                            <td className="p-4">
                                <StatusDot status={property.status} />
                            </td>
                            <td className="p-4 text-right text-xs text-neutral-500">
                                {new Date(property.createdAt).toLocaleDateString()}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="p-8 text-center text-neutral-500 text-xs">No properties listed</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const PartnerDocumentsTab = ({ partner }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 border border-neutral-200 rounded-xl">
            <h3 className="text-sm text-neutral-500 mb-4 flex items-center gap-2">
                <FileText size={16} /> Identity proof (Aadhaar)
            </h3>
            <div className="space-y-4">
                <div>
                    <span className="text-xs text-neutral-500 block">Aadhaar number</span>
                    <span className="text-sm font-medium text-neutral-900">{partner.aadhaarNumber || 'Not provided'}</span>
                </div>
                <div className="flex gap-4">
                    {partner.aadhaarFront ? (
                        <a href={partner.aadhaarFront} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 hover:opacity-90 transition-opacity">
                            <img src={partner.aadhaarFront} alt="Aadhaar Front" className="w-full h-full object-cover" />
                        </a>
                    ) : (
                        <div className="w-full h-32 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center text-xs text-neutral-500">
                            Front missing
                        </div>
                    )}
                    {partner.aadhaarBack ? (
                        <a href={partner.aadhaarBack} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 hover:opacity-90 transition-opacity">
                            <img src={partner.aadhaarBack} alt="Aadhaar Back" className="w-full h-full object-cover" />
                        </a>
                    ) : (
                        <div className="w-full h-32 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center text-xs text-neutral-500">
                            Back missing
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-white p-6 border border-neutral-200 rounded-xl">
            <h3 className="text-sm text-neutral-500 mb-4 flex items-center gap-2">
                <FileText size={16} /> Tax proof (PAN)
            </h3>
            <div className="space-y-4">
                <div>
                    <span className="text-xs text-neutral-500 block">PAN number</span>
                    <span className="text-sm font-medium text-neutral-900">{partner.panNumber || 'Not provided'}</span>
                </div>
                <div>
                    {partner.panCardImage ? (
                        <a href={partner.panCardImage} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 hover:opacity-90 transition-opacity">
                            <img src={partner.panCardImage} alt="PAN Card" className="w-full h-full object-cover" />
                        </a>
                    ) : (
                        <div className="w-full h-32 bg-neutral-50 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center text-xs text-neutral-500">
                            PAN image missing
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const PartnerTransactionsTab = ({ partnerId }) => {
    const [wallet, setWallet] = useState(null);
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWalletData = async () => {
            try {
                setLoading(true);
                const [wRes, sRes, tRes] = await Promise.all([
                    walletService.getWallet({ ownerId: partnerId, viewAs: 'partner' }),
                    walletService.getWalletStats({ ownerId: partnerId, viewAs: 'partner' }),
                    walletService.getTransactions({ ownerId: partnerId, viewAs: 'partner', limit: 50 })
                ]);
                if (wRes.success) setWallet(wRes.wallet);
                if (sRes.success) setStats(sRes.stats);
                if (tRes.success) setTransactions(tRes.transactions);
            } catch (error) {
                console.error('Error fetching partner wallet:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWalletData();
    }, [partnerId]);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-neutral-300" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <p className="text-xs text-neutral-500 mb-1">Available balance</p>
                    <h3 className="text-xl font-medium text-neutral-900">₹{wallet?.balance?.toLocaleString() || 0}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <p className="text-xs text-neutral-500 mb-1">Total earnings</p>
                    <h3 className="text-xl font-medium text-green-600">₹{stats?.totalEarnings?.toLocaleString() || 0}</h3>
                    <p className="text-xs text-neutral-500 mt-1">+₹{stats?.thisMonthEarnings?.toLocaleString() || 0} this month</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <p className="text-xs text-neutral-500 mb-1">Total payouts</p>
                    <h3 className="text-xl font-medium text-orange-600">₹{stats?.totalWithdrawals?.toLocaleString() || 0}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <p className="text-xs text-neutral-500 mb-1">Pending clearance</p>
                    <h3 className="text-xl font-medium text-[#0a4d2b]">₹{stats?.pendingClearance?.toLocaleString() || 0}</h3>
                </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <h3 className="text-xs text-neutral-500 mb-4">Recent transactions</h3>
                <div className="space-y-3">
                    {transactions && transactions.length > 0 ? (
                        transactions.map((txn, i) => {
                            const isDebit = txn.type === 'debit';
                            const isBooking = txn.category?.includes('booking');

                            return (
                                <div key={i} className="flex items-center justify-between p-4 border border-neutral-100 rounded-2xl hover:bg-neutral-50 transition-colors bg-white">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${isBooking ? 'bg-orange-50 text-orange-500' :
                                            !isDebit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                                            }`}>
                                            {isBooking ? <Calendar size={20} /> :
                                                !isDebit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-neutral-900 truncate pr-2">{txn.description}</p>
                                            <p className="text-xs text-neutral-500 mt-1">
                                                {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })} • {new Date(txn.createdAt).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-lg font-medium  ${isDebit ? 'text-neutral-900' : 'text-green-600'}`}>
                                            {isDebit ? '-' : '+'}₹{txn.amount?.toLocaleString()}
                                        </p>
                                        <StatusDot status={txn.status} />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-10 text-center border-2 border-dashed border-neutral-100 rounded-xl">
                            <CreditCard size={32} className="mx-auto text-neutral-300 mb-2" />
                            <p className="text-xs text-neutral-500">No transactions history</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminPartnerDetail = () => {
    const { id } = useParams();
    const [partner, setPartner] = useState(null);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('properties');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchPartnerDetails = async () => {
        try {
            setLoading(true);
            const data = await adminService.getPartnerDetails(id);
            if (data.success) {
                setPartner(data.partner);
                setProperties(data.properties);
            }
        } catch (error) {
            console.error('Error fetching partner details:', error);
            toast.error('Failed to load partner information');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartnerDetails();
    }, [id]);

    const handleBlockToggle = async () => {
        const isBlocked = partner.isBlocked;
        setModalConfig({
            isOpen: true,
            title: isBlocked ? 'Unblock partner?' : 'Block partner?',
            message: isBlocked
                ? `Partner ${partner.name} will regain access to their dashboard.`
                : `Blocking ${partner.name} will prevent them from managing properties.`,
            type: isBlocked ? 'success' : 'danger',
            confirmText: isBlocked ? 'Unblock' : 'Block',
            onConfirm: async () => {
                try {
                    const res = await adminService.updatePartnerStatus(partner._id, !isBlocked);
                    if (res.success) {
                        toast.success(`Partner ${isBlocked ?'blocked' : 'unblocked'} successfully`);
                        fetchPartnerDetails();
                    }
                } catch {
                    toast.error('Failed to update partner status');
                }
            }
        });
    };

    const handleApproval = async (status) => {
        setModalConfig({
            isOpen: true,
            title: `${status === 'approved' ? 'Approve' : 'Reject'} Partner?`,
            message: `Are you sure you want to ${status} ${partner.name}?`,
            type: status === 'approved' ? 'success' : 'danger',
            confirmText: status === 'approved' ? 'Approve' : 'Reject',
            onConfirm: async () => {
                try {
                    const res = await adminService.updatePartnerApproval(partner._id, status);
                    if (res.success) {
                        toast.success(`Partner ${status} successfully`);
                        fetchPartnerDetails();
                    }
                } catch {
                    toast.error(`Failed to ${status} partner`);
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-neutral-400" size={24} strokeWidth={1.5} />
                <p className="mt-1 text-sm text-neutral-500">Loading partner</p>
            </div>
        );
    }

    if (!partner) {
        return (
            <div className="text-center py-20">
                <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
                <h2 className="text-2xl font-medium text-neutral-900">Partner not found</h2>
                <p className="text-neutral-500 mt-2">The partner you're looking for doesn't exist or has been deleted.</p>
                <Link to="/hotel/admin/partners" className="mt-6 inline-block text-black font-medium text-xs border-b-2 border-black pb-1">Back to partners</Link>
            </div>
        );
    }

    const tabs = [
        { id: 'properties', label: 'Properties', icon: Building },
        { id: 'transactions', label: 'Transactions', icon: CreditCard },
        { id: 'documents', label: 'Documents', icon: FileText },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                <Link to="/hotel/admin/partners" className="hover:text-black transition-colors">Partners</Link>
                <span>/</span>
                <span className="text-black">{partner.name}</span>
            </div>

            <div className={`rounded-2xl p-8 border shadow-sm flex flex-col md:flex-row gap-8 transition-colors ${partner.isBlocked ? 'bg-red-50 border-red-200' : 'bg-white border-neutral-200'}`}>
                <div className="flex flex-col items-center md:items-start gap-4 min-w-[200px]">
                    <div className="w-24 h-24 rounded-full bg-neutral-900 text-white flex items-center justify-center text-3xl font-medium border-4 border-white shadow-sm relative">
                        {partner.profileImage ? (
                            <img src={partner.profileImage} alt={partner.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            partner.name.charAt(0)
                        )}
                        {partner.isBlocked && (
                            <div className="absolute -bottom-2 -right-2 bg-red-600 text-white p-1.5 rounded-full border-4 border-white">
                                <Ban size={16} />
                            </div>
                        )}
                        {partner.partnerApprovalStatus === 'approved' && !partner.isBlocked && (
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white">
                                <CheckCircle size={16} />
                            </div>
                        )}
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-2xl font-medium text-neutral-900">{partner.name}</h1>
                        <p className="text-xs text-neutral-500">ID: #{partner._id.slice(-6)}</p>
                        <div className="flex flex-col gap-1 mt-2">
                            {partner.isBlocked && <span className="text-xs font-medium text-red-600">Account blocked</span>}
                            <StatusDot status={partner.partnerApprovalStatus} />
                        </div>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <Mail size={16} className="text-neutral-500" />
                            <span className="text-neutral-900 font-medium">{partner.email || '—'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Phone size={16} className="text-neutral-500" />
                            <span className="text-neutral-900 font-medium">{partner.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <User size={16} className="text-neutral-500" />
                            <span className="text-neutral-900 font-medium">{partner.ownerName || 'Owner name not provided'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin size={16} className="text-neutral-500" />
                            <span className="text-neutral-900 font-medium">
                                {[partner.address?.city, partner.address?.state, partner.address?.country].filter(Boolean).join(', ') || 'Address N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="p-3 bg-white/50 rounded-lg border border-neutral-200/50 flex justify-between items-center">
                            <span className="text-xs text-neutral-500">Total properties</span>
                            <span className="text-lg font-medium text-neutral-900">{properties.length}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[160px]">
                    <button
                        onClick={handleBlockToggle}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-xs font-medium  transition-colors ${partner.isBlocked
                            ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                    >
                        {partner.isBlocked ? <Unlock size={16} /> : <Ban size={16} />}
                        {partner.isBlocked ? 'Unblock' : 'Block'}
                    </button>

                    {partner.partnerApprovalStatus === 'pending' && (
                        <>
                            <button
                                onClick={() => handleApproval('approved')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-medium transition-colors"
                            >
                                <CheckSquare size={16} /> Approve
                            </button>
                            <button
                                onClick={() => handleApproval('rejected')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-medium transition-colors"
                            >
                                <XSquare size={16} /> Reject
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div>
                <div className="flex border-b border-neutral-200 mb-6 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-medium  transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-black' : 'text-neutral-500 hover:text-neutral-600'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabBadgePartner"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900"
                                />
                            )}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                    >
                        {activeTab === 'properties' && <PartnerPropertiesTab properties={properties} />}
                        {activeTab === 'transactions' && <PartnerTransactionsTab partnerId={id} />}
                        {activeTab === 'documents' && <PartnerDocumentsTab partner={partner} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminPartnerDetail;