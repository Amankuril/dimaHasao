import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, AlertCircle, CheckCircle, Package, Zap, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import subscriptionService from '../../../services/subscriptionService';

const PlanModal = ({ plan, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        maxProperties: 1,
        price: 0,
        durationDays: 30,
        description: '',
        isActive: true,
        tier: 'silver',
        leadCap: 0,
        hasVerifiedTag: false,
        bannerType: 'none',
        rankingWeight: 1,
        pauseDaysAllowed: 0
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (plan) {
            setFormData({
                name: plan.name || '',
                maxProperties: plan.maxProperties || 1,
                price: plan.price || 0,
                durationDays: plan.durationDays || 30,
                description: plan.description || '',
                isActive: plan.isActive !== undefined ? plan.isActive : true,
                tier: plan.tier || 'silver',
                leadCap: plan.leadCap || 0,
                hasVerifiedTag: plan.hasVerifiedTag || false,
                bannerType: plan.bannerType || 'none',
                rankingWeight: plan.rankingWeight || 1,
                pauseDaysAllowed: plan.pauseDaysAllowed || 0
            });
        }
    }, [plan]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (plan) {
                await subscriptionService.updatePlan(plan._id, formData);
                toast.success('Plan updated successfully');
            } else {
                await subscriptionService.createPlan(formData);
                toast.success('Plan created successfully');
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save plan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-hidden">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">
                        {plan ? 'Edit Subscription Plan' : 'Add New Plan'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                    <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                                placeholder="e.g. Starter Pack"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Properties Allowed</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.maxProperties}
                                    onChange={(e) => setFormData({ ...formData, maxProperties: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Validity (Days)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.durationDays}
                                    onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                    className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tier Type</label>
                                <select
                                    value={formData.tier}
                                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                                >
                                    <option value="silver">Silver</option>
                                    <option value="gold_basic">Gold Basic</option>
                                    <option value="gold">Gold</option>
                                    <option value="platinum">Platinum</option>
                                    <option value="diamond">Diamond</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Type</label>
                                <select
                                    value={formData.bannerType}
                                    onChange={(e) => setFormData({ ...formData, bannerType: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                                >
                                    <option value="none">None</option>
                                    <option value="locality">Locality</option>
                                    <option value="city">City</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Cap (0=Inf)</label>
                                <input
                                    type="number"
                                    value={formData.leadCap}
                                    onChange={(e) => setFormData({ ...formData, leadCap: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ranking Weight</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={formData.rankingWeight}
                                    onChange={(e) => setFormData({ ...formData, rankingWeight: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pause Days</label>
                                <input
                                    type="number"
                                    value={formData.pauseDaysAllowed}
                                    onChange={(e) => setFormData({ ...formData, pauseDaysAllowed: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                                />
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.hasVerifiedTag}
                                        onChange={(e) => setFormData({ ...formData, hasVerifiedTag: e.target.checked })}
                                        className="w-4 h-4 text-black rounded focus:ring-black"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Verified Tag</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 text-black rounded focus:ring-black"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                                Active (Visible to partners)
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 p-6 border-t bg-gray-50 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Plan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminSubscriptions = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const data = await subscriptionService.getAllPlans();
            if (data.success) {
                setPlans(data.plans);
            }
        } catch (error) {
            toast.error('Failed to fetch subscription plans');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingPlan(null);
        setShowModal(true);
    };

    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to deactivate this plan?')) return;

        try {
            await subscriptionService.deletePlan(id);
            toast.success('Plan deactivated');
            fetchPlans();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Subscription Plans</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage partner tiers, limits, and pricing strategy</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95 shrink-0"
                >
                    <Plus size={20} />
                    Add New Plan
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-lg font-medium">No plans found</p>
                        <p className="text-sm">Create a subscription plan to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] table-auto">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Plan & Tier</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Price</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Limits & Features</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Validity</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {plans.map((plan) => (
                                    <tr key={plan._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-black text-gray-900">{plan.name}</div>
                                            <div className="flex gap-1 mt-1">
                                                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-bold uppercase text-gray-500">{plan.tier}</span>
                                                {plan.hasVerifiedTag && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">Verified</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {formatCurrency(plan.price)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-xs text-gray-700">
                                                <div className="flex items-center gap-1">
                                                    <Package size={12} className="text-gray-400" />
                                                    <span className="font-bold">{plan.maxProperties} Properties</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Zap size={12} className="text-gray-400" />
                                                    <span>{plan.leadCap > 0 ? `${plan.leadCap} Leads` : 'Unlimited Leads'}</span>
                                                </div>
                                                {plan.bannerType !== 'none' && (
                                                    <div className="flex items-center gap-1 text-indigo-600">
                                                        <MapPin size={12} />
                                                        <span className="font-medium capitalize">{plan.bannerType} Banner</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {plan.durationDays} Days
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.isActive
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-red-50 text-red-700'
                                                }`}>
                                                {plan.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(plan)}
                                                    className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors border border-transparent"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(plan._id)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent"
                                                    title="Deactivate"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <PlanModal
                    plan={editingPlan}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        fetchPlans();
                    }}
                />
            )}
        </div>
    );
};

export default AdminSubscriptions;
