import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { reelService } from '../../services/reelService';

const ReelItem = ({ reel, navigate }) => {
    const videoRef = useRef(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
            },
            { threshold: 0.7 } // Play when 70% of the card is visible
        );

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            if (isIntersecting) {
                videoRef.current.play().catch(err => console.log("Autoplay blocked", err));
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isIntersecting]);

    return (
        <div
            onClick={() => navigate(`/reels?reel=${reel._id}`)}
            className="group flex-shrink-0 w-[125px] md:w-[150px] cursor-pointer snap-start"
        >
            {/* Thumbnail/Video Card */}
            <div className="relative aspect-[9/16] rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow bg-gray-200">
                {/* Auto-playing Video */}
                <video
                    ref={videoRef}
                    src={reel.videoUrl}
                    poster={reel.thumbnailUrl}
                    muted
                    loop
                    playsInline
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isIntersecting ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Fallback Static Thumbnail */}
                <img
                    src={reel.thumbnailUrl || 'https://via.placeholder.com/150x266?text=Reel'}
                    alt={reel.caption}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isIntersecting ? 'opacity-0' : 'opacity-100'}`}
                />

                {/* subtle bottom overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-40" />

                {/* Play Icon - Only shows when not playing */}
                {!isIntersecting && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/20 backdrop-blur-md p-2 rounded-full">
                            <Play size={20} className="text-white fill-white" />
                        </div>
                    </div>
                )}
            </div>

            {/* Info Below Card */}
            <div className="mt-2.5 px-0.5">
                <h3 className="text-gray-900 text-[11px] md:text-xs font-bold line-clamp-2 leading-[1.3] group-hover:text-emerald-700 transition-colors">
                    {reel.caption || 'Property Tour'}
                </h3>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] md:text-[10px] text-gray-400 font-medium">
                        {reel.viewsCount || 0} views • #{reel.category?.toLowerCase() || 'general'}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReelSection = ({ category }) => {
    const navigate = useNavigate();
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);

    const normalizedCategory = (cat) => {
        if (!cat || cat === 'All') return 'All';
        if (cat.toLowerCase().includes('pg')) return 'PG';
        if (cat.toLowerCase().includes('rent')) return 'Rent';
        if (cat.toLowerCase().includes('buy')) return 'Buy';
        if (cat.toLowerCase().includes('plot')) return 'Plot';
        return 'General';
    };

    useEffect(() => {
        const fetchReels = async () => {
            setLoading(true);
            try {
                const cat = normalizedCategory(category);
                const res = await reelService.getFeed({ category: cat, limit: 10 });
                setReels(res.reels || []);
            } catch (err) {
                console.error("Failed to fetch reels for section:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReels();
    }, [category]);

    if (loading) {
        return (
            <div className="py-8 flex justify-center items-center">
                <Loader2 className="animate-spin text-surface" size={24} />
            </div>
        );
    }

    if (reels.length === 0) return null;

    return (
        <div className="py-6 border-b border-gray-100 bg-gray-50/30">
            <div className="px-5 md:px-0 mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="bg-red-600 p-1 rounded-lg">
                            <Play size={16} className="text-white fill-white" />
                        </span>
                        Reels
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Short video tours and updates</p>
                </div>
                <button
                    onClick={() => navigate('/reels')}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
                >
                    View All
                </button>
            </div>

            <div className="flex overflow-x-auto gap-2 pb-2 px-5 no-scrollbar snap-x snap-mandatory">
                {reels.map((reel) => (
                    <ReelItem key={reel._id} reel={reel} navigate={navigate} />
                ))}
                <div className="w-1 shrink-0" />
            </div>
        </div>
    );
};

export default ReelSection;
