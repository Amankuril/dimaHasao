import React from 'react';
import { motion } from 'framer-motion';

const COLLECTIONS = [
    {
        id: 'guys',
        title: 'For Boys',
        image: 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&q=80&w=400',
        filters: { gender: 'Boys' },
        gradient: 'from-blue-600/60 to-blue-900/80'
    },
    {
        id: 'girls',
        title: 'For Girls',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=400',
        filters: { gender: 'Girls' },
        gradient: 'from-rose-600/60 to-rose-900/80'
    },
    {
        id: 'coliving',
        title: 'Co-Living PG',
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=400',
        filters: { gender: 'Co-Living' },
        gradient: 'from-purple-600/60 to-purple-900/80'
    },
    {
        id: 'food',
        title: 'Food Available',
        image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=400',
        filters: { foodIncluded: 'true' },
        gradient: 'from-orange-600/60 to-orange-900/80'
    },
    {
        id: 'private',
        title: 'Private Room',
        image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=400',
        filters: { occupancy: 'Single' },
        gradient: 'from-emerald-600/60 to-emerald-900/80'
    }
];

const CollectionSection = ({ onFilter, activeFilters = {} }) => {

    // Check if a collection is active
    const isCollectionSelected = (itemFilters) => {
        return Object.entries(itemFilters).every(([key, value]) => {
            return activeFilters[key] === value;
        });
    };

    return (
        <div className="py-2 mb-4">
            <div className="px-5 md:px-0">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">Handpicked <span className="text-surface">Collections</span></h2>
                        <p className="text-[10px] text-gray-400 mt-0.5">Found exactly what you are looking for</p>
                    </div>
                    {Object.values(activeFilters).some(v => v !== undefined) && (
                        <button
                            onClick={() => onFilter({ gender: undefined, occupancy: undefined, foodIncluded: undefined })}
                            className="text-[10px] font-bold text-red-500 hover:underline"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-3 px-5 md:px-0 no-scrollbar md:grid md:grid-cols-5 md:overflow-visible overflow-y-visible">
                {COLLECTIONS.map((item, index) => {
                    const isSelected = isCollectionSelected(item.filters);

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            viewport={{ once: true }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onFilter(isSelected ? { gender: undefined, occupancy: undefined, foodIncluded: undefined } : item.filters)}
                            className={`relative min-w-[140px] h-24 md:h-32 rounded-xl overflow-hidden cursor-pointer group flex-shrink-0 transition-all duration-300 border-2 ${isSelected ? 'border-surface shadow-md scale-[1.02]' : 'border-transparent opacity-90 hover:opacity-100 hover:border-gray-200'}`}
                        >
                            {/* Image */}
                            <img
                                src={item.image}
                                alt={item.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />

                            {/* Overlay Gradient (static) */}
                            <div className={`absolute inset-0 bg-gradient-to-t ${item.gradient} opacity-50`} />

                            {/* Bottom Fade */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 transition-all duration-300" />

                            {/* Title */}
                            <div className="absolute inset-x-0 bottom-0 p-2.5">
                                <h3 className="text-white font-bold text-xs md:text-sm leading-tight drop-shadow-md">{item.title}</h3>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default CollectionSection;
