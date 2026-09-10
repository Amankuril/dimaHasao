import { useState } from 'react';
import { useParams, useNavigate } from '../router';
import { TOUR_PACKAGES_DATA } from '../data/tourPackageData';
import { ItineraryTimeline } from '../components/tour/ItineraryTimeline';
import { InclusionsGrid } from '../components/tour/InclusionsGrid';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const TourPackageDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const pkg = TOUR_PACKAGES_DATA.find((p) => p.id === id) || TOUR_PACKAGES_DATA[0];
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary', 'includes', 'destinations'

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-32 relative font-poppins">
      <Header
        title={pkg.title}
        subtitle={`${pkg.duration} • ${pkg.type}`}
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      {/* Hero Banner */}
      <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-gray-200">
        <img src={pkg.heroImage} alt={pkg.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

        <div className="absolute bottom-3 left-3.5 right-3.5 text-white space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
              {pkg.duration}
            </span>
            <span className="bg-[#06381e]/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400/40">
              {pkg.type}
            </span>
            <span className="bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded backdrop-blur-xs">
              {pkg.groupSize}
            </span>
          </div>

          <h1 className="font-montserrat font-bold text-lg text-white leading-tight">
            {pkg.title}
          </h1>

          <p className="text-xs text-gray-200 truncate">{pkg.destinations.join(' • ')}</p>
        </div>
      </div>

      <main className="p-3.5 space-y-4">
        {/* Quick Highlights Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-sparkles text-amber-500"></i>
            <span>Package Highlights</span>
          </h3>

          <div className="space-y-2">
            {pkg.highlights.map((hl, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                <i className="fa-solid fa-circle-check text-emerald-600 text-xs mt-0.5 shrink-0"></i>
                <span className="leading-relaxed">{hl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        {(() => {
          const tourTabs = [
            { id: 'itinerary', label: 'Itinerary', icon: 'fa-solid fa-route' },
            { id: 'includes', label: 'Inclusions', icon: 'fa-solid fa-list-check' },
            { id: 'destinations', label: 'Destinations', icon: 'fa-solid fa-map-pin' }
          ];
          const activeIndex = tourTabs.findIndex((t) => t.id === activeTab);

          return (
            <div className="bg-[#ede8dc] p-1 rounded-2xl relative flex items-center border border-[#dfd6c4] shadow-xs">
              {/* Smooth Horizontal Sliding Active Pill */}
              <div
                className="absolute top-1 bottom-1 rounded-xl bg-white shadow-xs border border-[#dfd6c4]/80 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                style={{
                  left: '4px',
                  width: 'calc((100% - 8px) / 3)',
                  transform: `translateX(${activeIndex * 100}%)`
                }}
              />

              {tourTabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 px-1 text-xs rounded-xl transition-colors duration-200 flex items-center justify-center gap-1.5 relative z-10 cursor-pointer ${
                      isActive
                        ? 'text-[#06381e] font-extrabold'
                        : 'text-stone-600 hover:text-stone-900 font-semibold'
                    }`}
                  >
                    <i
                      className={`${tab.icon} text-[10.5px] transition-colors duration-200 ${
                        isActive ? 'text-[#06381e]' : 'text-stone-400'
                      }`}
                    ></i>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* TAB 1: ITINERARY */}
        {activeTab === 'itinerary' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-montserrat font-bold text-sm text-gray-900">
                Complete Day-by-Day Plan
              </h3>
              <span className="text-xs text-gray-500">{pkg.itinerary.length} Days</span>
            </div>

            <ItineraryTimeline itinerary={pkg.itinerary} />
          </div>
        )}

        {/* TAB 2: INCLUSIONS */}
        {activeTab === 'includes' && (
          <InclusionsGrid includes={pkg.includes} exclusions={pkg.exclusions} />
        )}

        {/* TAB 3: DESTINATIONS */}
        {activeTab === 'destinations' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
              <h3 className="font-montserrat font-bold text-sm text-gray-900">
                Key Destinations in this Tour
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {pkg.destinations.map((dest, idx) => (
                  <span
                    key={idx}
                    className="bg-[#FAF6ED] text-emerald-900 font-bold text-xs px-3 py-1.5 rounded-xl border border-[#E5DDC3] flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-location-dot text-emerald-700 text-[10px]"></i>
                    <span>{dest}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Photo Gallery preview */}
            <div className="grid grid-cols-2 gap-2">
              {pkg.gallery.map((img, idx) => (
                <div key={idx} className="h-32 rounded-2xl overflow-hidden shadow-xs bg-gray-200">
                  <img src={img} alt={`Destination ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Booking Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5DDC3] p-3 shadow-lg flex justify-center">
        <div className="w-full max-w-[430px] flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">All-Inclusive Tour</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold text-emerald-950 font-montserrat">
                ₹{pkg.pricePerPerson.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-gray-400">/ person</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate(`/packages/${pkg.id}/book`)}
            className="bg-[#06381e] hover:bg-[#0a4d2b] text-amber-300 text-xs font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>Book Package</span>
            <i className="fa-solid fa-arrow-right text-xs"></i>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
