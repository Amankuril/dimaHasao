import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../../services/apiService';
import { Star, MapPin, ArrowRight, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LatestProjectsBanner = ({ categoryId, categoryName, theme }) => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    const accentColor = theme?.accent || '#10B981';

    useEffect(() => {
        const fetchLatest = async () => {
            if (!categoryId) return;
            setLoading(true);
            try {
                // Fetch top 5 newest properties for this category
                const res = await propertyService.getPublic({
                    type: categoryId,
                    sort: 'newest',
                    limit: 5
                });
                setProperties(res || []);
            } catch (err) {
                console.error("Failed to fetch latest projects:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLatest();
    }, [categoryId]);

    useEffect(() => {
        setCurrentIndex(0);
    }, [properties]);

    useEffect(() => {
        if (properties.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % properties.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [properties.length]);

    if (loading) {
        return (
            <div className="w-full h-[220px] md:h-[280px] bg-gray-50 rounded-2xl flex items-center justify-center border border-dashed border-gray-200">
                <Loader2 className="animate-spin text-gray-300" size={32} />
            </div>
        );
    }

    if (properties.length === 0) return null;

    const current = properties[currentIndex];
    if (!current) return null;

    return (
        <div className="relative w-full overflow-hidden mb-6 group px-5 md:px-0">
            <div className="flex items-center gap-2 mb-3">
                <div className="bg-yellow-100 text-yellow-700 p-1 rounded-md animate-pulse">
                    <Sparkles size={16} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                    Top Picks in {categoryName}
                </h2>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider flex items-center gap-1 ml-auto">
                    <TrendingUp size={12} /> Recent Added
                </span>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    onClick={() => navigate(`/hotel/${current._id}`)}
                    className="relative w-full h-[220px] md:h-[280px] rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-shadow border border-white/20"
                >
                    {/* Background Image */}
                    <img
                        src={current.coverImage}
                        alt={current.propertyName}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Gradient Overlays */}
                    <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />

                    {/* Content Container */}
                    <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end md:justify-center">
                        <div className="flex flex-col gap-2 max-w-xl">
                            {/* Tags */}
                            <div className="flex gap-2 mb-1">
                                <span className="bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">
                                    LATEST PROJECT
                                </span>
                                {current.rankingWeight > 0 && (
                                    <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-sm flex items-center gap-1">
                                        <Star size={10} className="fill-black" /> PREMIUM
                                    </span>
                                )}
                            </div>

                            {/* Title & Desc */}
                            <h3 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-md">
                                {current.propertyName}
                            </h3>

                            <p className="text-white/80 text-xs md:text-sm line-clamp-2 md:line-clamp-none max-w-md hidden sm:block">
                                {current.shortDescription || current.description || 'Experience the best living spaces in the city with premium amenities and top-rated services.'}
                            </p>

                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-white/90 text-xs md:text-sm font-medium">
                                    <MapPin size={14} className="text-white" />
                                    {current.address?.city}, {current.address?.state}
                                </div>
                                <div className="flex items-center gap-1 text-white/90 text-xs md:text-sm font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md">
                                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                    {current.avgRating?.toFixed(1) || '4.0'}
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="mt-4 flex items-center gap-3">
                                <button className="bg-white text-black px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-colors flex items-center gap-2 group/btn shadow-lg active:scale-95">
                                    View Details
                                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest hidden md:block">
                                    Click to explore
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Dots */}
                    {properties.length > 1 && (
                        <div className="absolute bottom-4 right-6 flex gap-1.5">
                            {properties.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default LatestProjectsBanner;
