import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '../router';
import { fetchFestivals } from '../services/festivalApi';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const FestivalListScreen = () => {
  const navigate = useNavigate();

  /*
   * Cached by React Query, so returning to this screen paints from cache with
   * no spinner and refreshes quietly behind it. Error text is unchanged.
   */
  const {
    data: festivals = [],
    isPending: loading,
    error,
  } = useQuery({ queryKey: ['festivals'], queryFn: () => fetchFestivals() });

  const loadError = error ? error?.response?.data?.message || 'We could not load festivals just now.' : '';


  // The banner spotlights whichever festival an admin sorted first, rather
  // than a hard-coded index into a fixture file.
  const featured = festivals[0] || null;

  /** Cheapest live pass, so "From ₹x" cannot quote a sold-out tier. */
  const cheapestPrice = (fest) => {
    const live = fest.ticketCategories.filter((c) => !c.isSoldOut);
    const pool = live.length ? live : fest.ticketCategories;
    return pool.length ? Math.min(...pool.map((c) => c.price)) : 0;
  };

  if (loading) {
    return (
      <div className="bg-[#FAF6ED] min-h-screen pb-28 font-poppins">
        <Header title="FESTIVALS & EVENTS" subtitle="Loading what's on" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <main className="p-3.5 space-y-4">
          <div className="h-48 rounded-3xl bg-gray-200 animate-pulse" />
          {[0, 1].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-3.5 border border-[#E5DDC3] flex gap-3.5 animate-pulse">
              <div className="w-24 h-24 rounded-xl bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  if (loadError || !festivals.length) {
    return (
      <div className="bg-[#FAF6ED] min-h-screen pb-28 font-poppins">
        <Header title="FESTIVALS & EVENTS" subtitle="Government tourism galas & music fests" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <div className="p-6 text-center space-y-3 mt-10">
          <i className="fa-solid fa-ticket text-4xl text-gray-300"></i>
          <h3 className="font-bold text-gray-800 text-sm">
            {loadError ? "Couldn't load festivals" : 'No festivals on sale right now'}
          </h3>
          <p className="text-xs text-gray-500">
            {loadError || 'Check back when the next one is announced.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-28 relative font-poppins">
      <Header
        title="FESTIVALS & EVENTS"
        subtitle="Government tourism galas, harvest carnivals & music fests"
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <main className="p-3.5 space-y-4">
        {/* Featured Falcon Festival Top Banner */}
        <div
          onClick={() => navigate(`/festivals/${featured.id}`)}
          className="relative rounded-3xl overflow-hidden shadow-md bg-black cursor-pointer group"
        >
          <img
            src={featured.heroImage}
            alt={featured.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
              <i className="fa-solid fa-fire-flame-curved"></i>
              <span>Official Tourism Mega Event</span>
            </span>
          </div>

          <div className="absolute bottom-3 left-3.5 right-3.5 text-white space-y-1">
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
              <i className="fa-regular fa-calendar text-xs"></i>
              {featured.dates}
            </span>
            <h2 className="font-montserrat font-bold text-base text-white leading-tight">
              {featured.name}
            </h2>
            <p className="text-xs text-gray-200 line-clamp-1">{featured.venue}</p>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">Passes from ₹250</span>
              <span className="bg-amber-400 text-emerald-950 font-black text-xs px-3 py-1 rounded-xl shadow-xs">
                Book Tickets →
              </span>
            </div>
          </div>
        </div>

        {/* All Festivals List */}
        <div className="space-y-3">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 px-1">
            Official Dima Hasao Festivals
          </h3>

          {festivals.map((fest, idx) => (
            <motion.div
              key={fest.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => navigate(`/festivals/${fest.id}`)}
              className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#E5DDC3] flex gap-3.5 cursor-pointer hover:border-emerald-500 transition-all group"
            >
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                <img
                  src={fest.heroImage}
                  alt={fest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>

              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-700 font-bold">
                    <i className="fa-regular fa-calendar"></i>
                    <span>{fest.dates}</span>
                  </div>

                  <h4 className="font-montserrat font-bold text-xs text-gray-900 truncate mt-0.5 group-hover:text-emerald-800">
                    {fest.name}
                  </h4>

                  <p className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                    <i className="fa-solid fa-location-dot text-emerald-700"></i>
                    <span>{(fest.venue || '').split(',')[0]}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                  <span className="text-xs font-bold text-emerald-950 font-montserrat">
                    From ₹{cheapestPrice(fest).toLocaleString('en-IN')}
                  </span>

                  <button className="bg-[#06381e] text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                    Book Passes
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};
