import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle, ShieldCheck, Package, Clock,
    Crown, Zap, Star, Layout, MapPin, Play, Pause, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import subscriptionService from '../../../services/subscriptionService';

const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const TIER_CONFIG = {
    silver: {
        color: 'from-slate-400 to-slate-600',
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        icon: Package,
        accent: 'slate'
    },
    gold_basic: {
        color: 'from-amber-300 to-amber-500',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        icon: Star,
        accent: 'amber'
    },
    gold: {
        color: 'from-yellow-400 to-yellow-600',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        icon: Crown,
        accent: 'yellow'
    },
    platinum: {
        color: 'from-blue-400 to-blue-600',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        icon: ShieldCheck,
        accent: 'blue'
    },
    diamond: {
        color: 'from-purple-500 to-indigo-600',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        icon: Zap,
        accent: 'purple'
    }
};

const PartnerSubscriptions = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [plans, setPlans] = useState([]);
    const [currentSub, setCurrentSub] = useState(null);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [plansData, subData] = await Promise.all([
                subscriptionService.getActivePlans(),
                subscriptionService.getCurrentSubscription()
            ]);

            if (plansData.success) {
                // Sort plans by price/tier order if possible
                const tierOrder = ['silver', 'gold_basic', 'gold', 'platinum', 'diamond'];
                const sorted = plansData.plans.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
                setPlans(sorted);
            }
            if (subData.success) {
                setCurrentSub(subData.subscription);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (plan) => {
        if (processing) return;
        setProcessing(true);
        const toastId = toast.loading('Initializing payment...');

        try {
            const isLoaded = await loadRazorpay();
            if (!isLoaded) throw new Error("Razorpay SDK failed to load");

            const { order, key } = await subscriptionService.createSubscriptionOrder(plan._id);

            const options = {
                key: key,
                amount: order.amount,
                currency: order.currency,
                name: "HoomZo Partner",
                description: `Subscription: ${plan.name}`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        toast.loading('Verifying payment...', { id: toastId });
                        const verifyPayload = {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planId: plan._id
                        };

                        const verifyRes = await subscriptionService.verifySubscription(verifyPayload);
                        if (verifyRes.success) {
                            toast.success("Subscription Activated!", { id: toastId });
                            setCurrentSub(verifyRes.subscription);
                            fetchData();
                        } else {
                            toast.error("Verification Failed", { id: toastId });
                        }
                    } catch (err) {
                        toast.error("Payment verification failed", { id: toastId });
                    }
                },
                prefill: {
                    name: user.name,
                    email: user.email,
                    contact: user.phone
                },
                theme: { color: "#0d9488" }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (r) => toast.error(r.error.description || "Payment Failed", { id: toastId }));
            rzp.open();

        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to initiate purchase", { id: toastId });
        } finally {
            setProcessing(false);
        }
    };

    const handleTogglePause = async () => {
        try {
            const res = await subscriptionService.togglePause();
            if (res.success) {
                toast.success(res.message);
                setCurrentSub({ ...currentSub, isPaused: res.subscription.isPaused, expiryDate: res.subscription.expiryDate });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Action failed");
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const isExpired = currentSub?.status === 'expired' || (currentSub?.expiryDate && new Date(currentSub.expiryDate) < new Date());
    const isActive = currentSub?.status === 'active' && !isExpired;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Expand Your Business</h1>
                <p className="text-gray-500 mt-1">Choose a plan that fits your growth strategy and scale today.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-[#005CA8] rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Active Subscription Banner */}
                    {currentSub && currentSub.planId && (
                        <div className="relative overflow-hidden rounded-3xl bg-gray-900 text-white p-8 md:p-10 shadow-2xl">
                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#005CA8]/20 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                                            {isActive ? (currentSub.isPaused ? 'Paused' : 'Active Plan') : 'Expired'}
                                        </span>
                                        {currentSub.planId.tier === 'gold' && (
                                            <button
                                                onClick={handleTogglePause}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all border border-white/5"
                                            >
                                                {currentSub.isPaused ? <Play size={14} className="fill-current" /> : <Pause size={14} className="fill-current" />}
                                                {currentSub.isPaused ? 'Resume Plan' : 'Pause Plan'}
                                            </button>
                                        )}
                                    </div>
                                    <h2 className="text-4xl font-black flex items-center gap-3">
                                        {currentSub.planId.name}
                                        <ShieldCheck className="text-blue-400" />
                                    </h2>
                                    <p className="text-gray-400 max-w-md text-sm leading-relaxed">
                                        {currentSub.planId.description}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Properties</p>
                                        <p className="text-xl font-bold">{currentSub.propertiesAdded} <span className="text-gray-500 text-sm">/ {currentSub.planId.maxProperties}</span></p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Leads Used</p>
                                        <p className="text-xl font-bold">{currentSub.leadsUsedThisMonth} <span className="text-gray-500 text-sm">/ {currentSub.planId.leadCap || '∞'}</span></p>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md col-span-2">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Expiry Date</p>
                                        <p className="text-xl font-bold">{formatDate(currentSub.expiryDate)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tier Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {plans.map((plan) => {
                            const config = TIER_CONFIG[plan.tier] || TIER_CONFIG.silver;
                            const Icon = config.icon;
                            const isCurrent = currentSub?.planId?._id === plan._id && isActive;

                            return (
                                <div
                                    key={plan._id}
                                    className={`relative group bg-white rounded-[2rem] border-2 transition-all duration-500 hover:-translate-y-2 flex flex-col overflow-hidden ${isCurrent ? 'border-[#005CA8] shadow-2xl shadow-blue-100' : 'border-gray-100 hover:border-gray-200 hover:shadow-xl'}`}
                                >
                                    {/* Header Gradient */}
                                    <div className={`h-24 bg-gradient-to-br ${config.color} p-6 flex justify-between items-start`}>
                                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                            <Icon className="text-white" size={24} />
                                        </div>
                                        {isCurrent && <div className="bg-white text-[#005CA8] text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">Current</div>}
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col pt-8">
                                        <h4 className="text-lg font-black text-gray-900 mb-1 capitalize leading-none">{plan.name}</h4>
                                        <div className="flex items-baseline gap-1 mb-6">
                                            <span className="text-2xl font-black text-gray-900">₹{plan.price}</span>
                                            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">/ {plan.durationDays}d</span>
                                        </div>

                                        <div className="space-y-4 mb-8">
                                            <FeatureItem icon={Package} text={`Add ${plan.maxProperties} Properties`} />
                                            {plan.leadCap > 0 ? <FeatureItem icon={Zap} text={`${plan.leadCap} Leads / Month`} /> : <FeatureItem icon={Zap} text="Unlimited Leads" />}
                                            {plan.rankingWeight > 1 && <FeatureItem icon={Layout} text={`Ranking Boost (Lvl ${plan.rankingWeight})`} color="text-amber-600" />}
                                            {plan.hasVerifiedTag && <FeatureItem icon={ShieldCheck} text="Verified Partner Tag" color="text-blue-600" />}
                                            {plan.bannerType !== 'none' && <FeatureItem icon={MapPin} text={`${plan.bannerType.charAt(0).toUpperCase() + plan.bannerType.slice(1)} Banner`} color="text-indigo-600" />}
                                            {plan.pauseDaysAllowed > 0 && <FeatureItem icon={Clock} text={`${plan.pauseDaysAllowed} Pause Days`} color="text-orange-600" />}
                                        </div>

                                        <button
                                            onClick={() => handlePurchase(plan)}
                                            disabled={processing || isCurrent}
                                            className={`mt-auto w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 ${isCurrent
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200 hover:shadow-gray-300'
                                                }`}
                                        >
                                            {isCurrent ? 'Already Active' : 'Get Started'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Disclaimer / Info */}
                    <div className="bg-blue-50 rounded-2xl p-6 flex items-start gap-4 border border-blue-100 italic">
                        <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-blue-800 leading-relaxed font-medium">
                            Subscription plans are non-refundable. For higher tiers (Platinum & Diamond),
                            exclusive city-level banner slots are subject to availability.
                            Contact support for bulk listing packages.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

const FeatureItem = ({ icon: Icon, text, color = "text-gray-700" }) => (
    <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1 bg-gray-50 rounded border border-gray-100">
            <Icon size={12} className="text-gray-400" />
        </div>
        <span className={`text-[12px] font-bold ${color} leading-tight`}>{text}</span>
    </div>
);

export default PartnerSubscriptions;
