import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Star, 
    BadgeCheck, 
    ChevronRight, 
    MapPin, 
    Search, 
    Calendar, 
    ArrowRight, 
    Download, 
    Smartphone, 
    QrCode, 
    Sparkles, 
    Building2, 
    User, 
    TrendingUp,
    CheckCircle2,
    Quote,
    Phone
} from 'lucide-react';

const HomeBottomSections = () => {
    // 4. Cities Filter State
    const [citySearch, setCitySearch] = useState('');

    // News & Updates Data
    const newsArticles = [
        {
            id: 1,
            title: "Why Residential Plots Are Overperforming Urban Apartments in 2026",
            description: "An in-depth market analysis revealing how smart infrastructure improvements and express highway corridors are fueling record returns in land investment.",
            date: "Jul 24, 2026",
            category: "Market Insights",
            image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80",
            readTime: "5 min read"
        },
        {
            id: 2,
            title: "Essential Legal Checklist Before Investing in Agricultural & Residential Land",
            description: "Learn the crucial title verification steps, RERA compliance check procedures, and zoning laws to ensure your property purchase is 100% secure.",
            date: "Jul 20, 2026",
            category: "Legal Guide",
            image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80",
            readTime: "7 min read"
        },
        {
            id: 3,
            title: "The Rise of Eco-Friendly Gated Plot Communities Across India's IT Hubs",
            description: "Modern homeowners are shifting towards customizable villa plots within solar-powered, green luxury townships offering resort-like amenities.",
            date: "Jul 15, 2026",
            category: "Lifestyle & Design",
            image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&q=80",
            readTime: "4 min read"
        }
    ];

    return (
        <div className="w-full text-slate-800 antialiased space-y-20 sm:space-y-28 md:space-y-32 my-20 md:my-28">
            
            {/* =========================================================
                SECTION 2: 📰 NEWS & UPDATES
            ========================================================= */}
            <section className="w-full border-t border-slate-100 pt-16 md:pt-20">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10 md:mb-14">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold tracking-wide uppercase mb-3 border border-indigo-200/60 shadow-xs">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                            Market Intelligence
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                            News & Property Updates
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
                            Stay ahead of real estate dynamics with our curated insider reports, investment strategies, and emerging corridor developments.
                        </p>
                    </div>
                    <button 
                        onClick={() => window.location.href = '#/news'} 
                        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-900 font-bold text-sm sm:text-base hover:bg-slate-900 hover:text-white hover:border-slate-900 active:scale-[0.98] transition-all shadow-xs shrink-0 group"
                    >
                        <span>View All Articles</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className="flex overflow-x-auto md:grid md:grid-cols-3 gap-5 md:gap-8 pb-4 md:pb-0 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {newsArticles.map((item) => (
                        <motion.article
                            key={item.id}
                            whileHover={{ y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="group w-[85vw] max-w-[340px] sm:max-w-[380px] md:w-auto md:max-w-none shrink-0 md:shrink snap-start bg-white rounded-3xl border border-slate-100/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_24px_54px_-12px_rgba(15,23,42,0.12)] overflow-hidden flex flex-col justify-between cursor-pointer transition-all duration-300"
                        >
                            <div>
                                {/* Thumbnail Container */}
                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                    <img 
                                        src={item.image} 
                                        alt={item.title} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent opacity-70 group-hover:opacity-50 transition-opacity" />
                                    
                                    <span className="absolute top-4 left-4 inline-flex items-center px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-slate-900 text-xs font-black tracking-wide shadow-md border border-white/40">
                                        {item.category}
                                    </span>

                                    <span className="absolute bottom-4 right-4 text-white font-bold text-xs bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
                                        {item.readTime}
                                    </span>
                                </div>

                                {/* Content Body */}
                                <div className="p-6 sm:p-7">
                                    <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 mb-3 uppercase tracking-wider">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{item.date}</span>
                                    </div>

                                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug tracking-tight line-clamp-2">
                                        {item.title}
                                    </h3>

                                    <p className="mt-3 text-sm font-medium text-slate-600 leading-relaxed line-clamp-3">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            {/* Footer Action */}
                            <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-2 flex items-center justify-between font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                                <span className="underline decoration-slate-200 group-hover:decoration-blue-500 underline-offset-4 transition-all">Read Full Report</span>
                                <div className="w-9 h-9 rounded-full bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-all shadow-xs">
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </section>


            {/* =========================================================
                SECTION 3: 📱 DOWNLOAD OUR APP
            ========================================================= */}
            <section className="w-full pt-4 pb-6">
                <div className="relative rounded-3xl sm:rounded-[36px] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 md:p-12 lg:p-14 overflow-hidden shadow-2xl border border-slate-800/80">
                    
                    {/* Subtle Glow Mesh */}
                    <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/3 -bottom-20 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12">
                        
                        {/* Left Compact Content */}
                        <div className="max-w-2xl space-y-4 sm:space-y-5">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[11px] sm:text-xs tracking-wider uppercase border border-blue-400/20">
                                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                                HomeZo On The Go
                            </div>

                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight sm:leading-snug">
                                Buy, sell & track <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-300">premium plots</span> anytime from your smartphone.
                            </h2>

                            <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium leading-relaxed max-w-xl">
                                Receive instant alerts for RERA plot launches, verified price drops, and chat directly with verified land advisors without spam.
                            </p>

                            {/* Compact Side-by-Side Store Buttons */}
                            <div className="pt-2 grid grid-cols-2 sm:flex items-center gap-3 sm:gap-4 max-w-sm sm:max-w-none">
                                <a 
                                    href="https://play.google.com" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center justify-center sm:justify-start gap-2.5 bg-white text-slate-950 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-bold shadow-lg hover:bg-slate-100 active:scale-[0.98] transition-all"
                                >
                                    <Download className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                                    <div className="text-left leading-none">
                                        <p className="text-[9px] font-extrabold uppercase text-slate-500">GET IT ON</p>
                                        <p className="text-xs sm:text-sm font-black mt-0.5">Google Play</p>
                                    </div>
                                </a>

                                <a 
                                    href="https://apple.com/app-store" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center justify-center sm:justify-start gap-2.5 bg-slate-800 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-bold shadow-lg hover:bg-slate-700/80 active:scale-[0.98] transition-all border border-slate-700/80"
                                >
                                    <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
                                    <div className="text-left leading-none">
                                        <p className="text-[9px] font-extrabold uppercase text-slate-400">DOWNLOAD ON THE</p>
                                        <p className="text-xs sm:text-sm font-black mt-0.5">App Store</p>
                                    </div>
                                </a>
                            </div>
                        </div>

                        {/* Right Desktop/Tablet QR Scanner - Hidden on mobile screens to save space and avoid redundancy */}
                        <div className="hidden lg:flex items-center gap-5 bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-inner shrink-0">
                            <div className="w-28 h-28 bg-white rounded-xl p-2 flex items-center justify-center border border-slate-100 shadow-md">
                                <div className="w-full h-full border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-1.5 text-slate-800 bg-slate-50">
                                    <QrCode className="w-12 h-12 text-slate-900 stroke-[1.5]" />
                                    <span className="text-[9px] font-black text-blue-600 tracking-tighter mt-1">FREE SCANNER</span>
                                </div>
                            </div>
                            <div className="max-w-[170px]">
                                <h4 className="font-extrabold text-white text-sm tracking-tight">Scan to install app</h4>
                                <p className="text-[11px] text-slate-300 font-medium mt-1 leading-normal">
                                    Point your phone camera here to get the official HomeZo app instantly.
                                </p>
                                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">iOS & Android</span>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

        </div>
    );
};

export default HomeBottomSections;
