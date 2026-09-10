import { useNavigate } from '../router';
import { FESTIVALS_DATA } from '../data/festivalData';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const FestivalListScreen = () => {
  const navigate = useNavigate();

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
          onClick={() => navigate(`/festivals/${FESTIVALS_DATA[0].id}`)}
          className="relative rounded-3xl overflow-hidden shadow-md bg-black cursor-pointer group"
        >
          <img
            src={FESTIVALS_DATA[0].heroImage}
            alt={FESTIVALS_DATA[0].name}
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
              {FESTIVALS_DATA[0].dates}
            </span>
            <h2 className="font-montserrat font-bold text-base text-white leading-tight">
              {FESTIVALS_DATA[0].name}
            </h2>
            <p className="text-xs text-gray-200 line-clamp-1">{FESTIVALS_DATA[0].venue}</p>

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

          {FESTIVALS_DATA.map((fest, idx) => (
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
                    <span>{fest.venue.split(',')[0]}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                  <span className="text-xs font-bold text-emerald-950 font-montserrat">
                    From ₹{fest.ticketCategories[0].price}
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
