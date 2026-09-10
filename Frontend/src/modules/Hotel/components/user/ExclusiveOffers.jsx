import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { offerService } from '../../services/apiService';
import toast from 'react-hot-toast';

const ExclusiveOffers = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                setLoading(true);
                const data = await offerService.getActive();
                setOffers(data);
            } catch (err) {
                console.error("Fetch Offers Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchOffers();
    }, []);

    if (loading) {
        return (
            <div className="py-2 pl-5 mt-2">
                <div className="h-7 w-48 bg-gray-200/60 rounded animate-pulse mb-4"></div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="min-w-[280px] sm:min-w-[320px] h-[88px] bg-white border border-gray-200 rounded-2xl animate-pulse p-4 flex items-center gap-4">
                            <div className="w-16 h-14 bg-gray-100 rounded-xl shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 bg-gray-100 rounded"></div>
                                <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || (offers.length === 0 && !loading)) {
        return null;
    }

    return (
        <section className="py-2 pl-5 mt-2">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 tracking-tight flex items-center gap-2">
                Exclusive offers for you
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    NEW
                </span>
            </h2>

            <div className="flex gap-4 overflow-x-auto pb-4 pr-5 snap-x no-scrollbar">
                {offers.map((offer) => (
                    <motion.div
                        key={offer._id || offer.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            if (offer.code) {
                                navigator.clipboard.writeText(offer.code);
                                toast.success(`Code ${offer.code} copied!`);
                            }
                            navigate('/listings');
                        }}
                        className="
                            min-w-[260px] sm:min-w-[300px] md:min-w-[340px] 
                            bg-white 
                            border border-gray-200 
                            rounded-2xl md:rounded-[1.25rem] 
                            p-4 md:p-5 
                            flex items-center gap-4 md:gap-5 
                            cursor-pointer 
                            shadow-sm hover:shadow-md transition-all duration-200 
                            shrink-0 snap-start
                        "
                    >
                        {/* Left side Image/Logo Box */}
                        <div className="w-16 h-14 sm:w-20 sm:h-16 rounded-xl bg-gray-50/80 border border-gray-100 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                                src={offer.image}
                                alt={offer.title}
                                className="w-full h-full object-contain rounded-md"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>

                        {/* Right side Title and Details */}
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                            <h3 className="text-base sm:text-lg md:text-[20px] font-bold text-gray-900 leading-tight truncate">
                                {offer.title}
                            </h3>
                            {offer.subtitle && (
                                <p className="text-xs sm:text-sm text-gray-500 font-medium truncate mt-0.5">
                                    {offer.subtitle}
                                </p>
                            )}
                            {offer.code && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100/80 px-2 py-0.5 rounded-md">
                                        Use Code: <span className="font-bold tracking-wider">{offer.code}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default ExclusiveOffers;
