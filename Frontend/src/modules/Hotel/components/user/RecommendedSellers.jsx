import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { propertyService } from '../../services/apiService';
import { BadgeCheck, Phone, ChevronRight, User, Star, Loader2 } from 'lucide-react';

const getPackageTheme = (planTier, planName) => {
    const tier = (planTier || planName || '').toLowerCase();

    if (tier.includes('diamond')) {
        return {
            cardBg: 'bg-[radial-gradient(ellipse_at_top_left,#1C2F8F_0%,#060B2D_60%,#03051A_100%)] text-white',
            borderColor: 'border-2 border-[#7B3FFB]/80 hover:border-[#E94CFF]',
            topBarBg: 'bg-gradient-to-r from-[#1C2F8F] via-[#7B3FFB] to-[#E94CFF]',
            badgeStyle: 'bg-gradient-to-r from-[#1C2F8F] via-[#7B3FFB] to-[#E94CFF] text-white border-[#E94CFF]/50 shadow-[0_0_15px_rgba(233,76,255,0.4)]',
            badgeText: planName ? `💎 ${planName}` : '💎 ELITE DIAMOND PACK',
            buttonStyle: 'bg-gradient-to-r from-[#1C2F8F] via-[#7B3FFB] to-[#E94CFF] hover:from-[#253EC2] hover:via-[#8E54FF] hover:to-[#EF6CFF] text-white shadow-[0_6px_30px_rgba(233,76,255,0.55)] border border-[#E94CFF]/40'
        };
    }

    if (tier.includes('gold')) {
        return {
            cardBg: 'bg-gradient-to-br from-amber-50/90 via-yellow-50/40 to-amber-100/50',
            borderColor: 'border-amber-300/80 hover:border-amber-400',
            topBarBg: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600',
            badgeStyle: 'bg-amber-500/10 text-amber-900 border-amber-300/80',
            badgeText: planName || 'GOLD PACK',
            buttonStyle: 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md shadow-amber-500/20'
        };
    }

    if (tier.includes('platinum')) {
        return {
            cardBg: 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40',
            borderColor: 'border-indigo-200/90 hover:border-indigo-300',
            topBarBg: 'bg-gradient-to-r from-indigo-400 via-purple-500 to-indigo-700',
            badgeStyle: 'bg-indigo-500/10 text-indigo-900 border-indigo-200/90',
            badgeText: planName || 'PLATINUM PACK',
            buttonStyle: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20'
        };
    }

    // Default / Starter Silver Pack - Dark Glowing Blue Theme (Image 2)
    return {
        cardBg: 'bg-gradient-to-br from-[#021035] via-[#041A52] to-[#010927] text-white',
        borderColor: 'border-2 border-blue-500/80 hover:border-blue-400',
        topBarBg: 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600',
        badgeStyle: 'bg-[#0B256B] text-blue-300 border-blue-600/80',
        badgeText: planName || 'STARTER SILVER PACK',
        buttonStyle: 'bg-gradient-to-r from-[#1B55E2] via-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#1E40AF] text-white shadow-[0_4px_25px_rgba(27,85,226,0.7)] border border-blue-400/40'
    };
};

const RecommendedSellers = () => {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSellers = async () => {
            try {
                const data = await propertyService.getRecommendedSellers();
                setSellers(data || []);
            } catch (err) {
                console.error("Failed to fetch recommended sellers:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSellers();
    }, []);

    if (loading) {
        return (
            <div className="py-8 flex justify-center items-center">
                <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
        );
    }

    if (sellers.length === 0) return null;

    return (
        <div className="py-8 border-b border-gray-100 last:border-0 relative">
            <div className="flex justify-between items-end px-5 md:px-0 mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                        Recommended Sellers
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Trusted partners with complete knowledge about locality</p>
                </div>
            </div>

            <div className="flex overflow-x-auto lg:grid lg:grid-cols-3 gap-4 no-scrollbar pb-4 px-5 md:px-0">
                {sellers.map((seller) => {
                    const theme = getPackageTheme(seller.plan?.tier, seller.plan?.name);

                    return (
                        <motion.div
                            key={seller._id}
                            whileHover={{ y: -3 }}
                            className={`min-w-[250px] lg:min-w-0 ${theme.cardBg} rounded-xl border ${theme.borderColor} shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col`}
                        >
                            {/* Header with Plan Color Indicator */}
                            <div className={`h-1.5 w-full ${theme.topBarBg}`} />

                            <div className="p-3.5 flex flex-col h-full">
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                        {seller.profileImage ? (
                                            <img src={seller.profileImage} alt={seller.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="text-gray-400" size={24} />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <h3 className="font-bold text-gray-900 text-[13px] flex items-center gap-1 line-clamp-1">
                                            {seller.name}
                                            {seller.plan?.hasVerifiedTag && (
                                                <BadgeCheck size={14} className="text-blue-500 fill-blue-50 shrink-0" />
                                            )}
                                        </h3>
                                        <div className="mt-0.5">
                                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${theme.badgeStyle} tracking-wider inline-block truncate max-w-full`}>
                                                {theme.badgeText}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-2 mb-3 p-2.5 bg-white/70 backdrop-blur-xs rounded-lg border border-gray-100/80">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Experience</span>
                                        <span className="text-[12px] font-black text-gray-800 mt-0.5">
                                            {seller.experienceYears || '0.5'}+ Yrs
                                        </span>
                                    </div>
                                    <div className="flex flex-col border-l border-gray-200 pl-3">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Listings</span>
                                        <span className="text-[12px] font-black text-gray-800 mt-0.5">
                                            {seller.totalListings || 0}
                                        </span>
                                    </div>
                                </div>

                                {/* Location Tags */}
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {seller.address?.city && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/80 border border-gray-200 text-gray-600 rounded">
                                            {seller.address.city}
                                        </span>
                                    )}
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/80 border border-gray-200 text-gray-600 rounded">
                                        Top Rated
                                    </span>
                                </div>

                                {/* Action */}
                                <button
                                    onClick={() => window.location.href = `tel:${seller.phone}`}
                                    className={`w-full mt-auto py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 group ${theme.buttonStyle}`}
                                >
                                    <Phone size={14} className="group-hover:animate-bounce" />
                                    Show Contact
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
                {/* Spacer */}
                <div className="min-w-[5px] shrink-0" />
            </div>
        </div>
    );
};

export default RecommendedSellers;
