import { useState, useEffect } from 'react';
import { useParams, useNavigate, useHostNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { fetchDestinationById } from '../services/toursApi';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { GalleryViewer } from '../components/places/GalleryViewer';
import { TransportSelector } from '../components/places/TransportSelector';
import { RecommendationGrids } from '../components/places/RecommendationGrids';
import { motion } from 'framer-motion';

export const TouristPlaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const hostNavigate = useHostNavigate();
  const { setSelectedPlaceId, setSelectedTransportId } = useBooking();

  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    fetchDestinationById(id)
      .then((found) => { if (!cancelled) setPlace(found); })
      .catch(() => { if (!cancelled) setPlace(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  const handleBookDirect = (transportType = 'auto') => {
    setSelectedPlaceId(place.id);
    setSelectedTransportId(transportType);
    hostNavigate('/taxi/user');
  };

  if (loading) {
    return (
      <div className="bg-[#0b2e13] min-h-screen font-inter">
        <Header title="TOURIST PLACES" subtitle="Loading destination" showBack rightAction="none" />
        <PatternDivider variant="native" />
        <div className="bg-[#fdfbf7] p-4 space-y-3">
          <div className="h-52 bg-gray-200 rounded-2xl animate-pulse" />
          {[0, 1].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2 animate-pulse">
              <div className="h-3.5 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // An admin can unpublish a destination, so this has to say so rather than
  // silently fall back to whichever place happened to be first.
  if (!place) {
    return (
      <div className="bg-[#0b2e13] min-h-screen font-inter">
        <Header title="TOURIST PLACES" showBack rightAction="none" />
        <PatternDivider variant="native" />
        <div className="bg-[#fdfbf7] p-6 text-center space-y-3 min-h-[60vh]">
          <i className="fa-solid fa-mountain text-4xl text-gray-300 mt-10"></i>
          <h3 className="font-bold text-gray-800 text-sm">This destination is not available</h3>
          <button
            onClick={() => navigate('/places')}
            className="bg-[#0a3a2a] text-amber-200 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
          >
            See All Places
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0b2e13] text-gray-800 antialiased min-h-screen pb-20 font-inter">
      {/* Header */}
      <Header
        title="TOURIST PLACES"
        subtitle="Explore the Beauty of Dima Hasao"
        showBack={true}
        rightAction="favorite"
        placeId={place.id}
      />

      {/* Border Pattern */}
      <PatternDivider variant="native" />

      {/* Main Content Area */}
      <main className="bg-[#fdfbf7] mx-auto w-full relative">
        {/* Hero & Gallery */}
        <GalleryViewer place={place} />

        <div className="px-4 py-5 space-y-5">
          {/* About Section */}
          <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                About {place.name}
              </h2>
              {place.aboutDetails ? (
                place.aboutDetails.map((para, idx) => (
                  <p key={idx} className="text-xs text-gray-700 leading-relaxed mb-2 last:mb-0">
                    {para}
                  </p>
                ))
              ) : (
                <p className="text-xs text-gray-700 leading-relaxed">{place.description}</p>
              )}
            </div>

            {/* Meta Information Cards */}
            <div className="space-y-2.5 bg-orange-50/60 p-3.5 rounded-xl border border-orange-100">
              {/* Location */}
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-location-dot text-red-600 mt-0.5 text-sm shrink-0"></i>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-900">Location</p>
                  <p className="text-xs text-gray-600 leading-snug">{place.fullAddress}</p>
                </div>
              </div>

              {/* Best Time */}
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-cloud-sun text-emerald-700 mt-0.5 text-sm shrink-0"></i>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-900">Best Time to Visit</p>
                  <p className="text-xs text-gray-600">{place.bestTime}</p>
                </div>
              </div>

              {/* Ideal For */}
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-camera-retro text-teal-700 mt-0.5 text-sm shrink-0"></i>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-900">Ideal For</p>
                  <p className="text-xs text-gray-600 leading-snug">{place.idealFor}</p>
                </div>
              </div>
            </div>
          </section>

          {/* How to Reach & Transports */}
          <TransportSelector place={place} />

          {/* Tours that visit this place — matched server-side on the
              package's destinations, so it fills in on its own as operators
              publish. */}
          {place.packages?.length > 0 && (
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-suitcase-rolling text-emerald-700"></i>
                <span>Guided tours that visit here</span>
              </h3>

              <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
                {place.packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => navigate(`/packages/${pkg.id}`)}
                    className="w-44 shrink-0 text-left bg-[#fdf5e6] rounded-2xl border border-orange-200/70 overflow-hidden hover:border-emerald-600/50 transition-colors cursor-pointer"
                  >
                    <div className="h-24 bg-gray-200 overflow-hidden">
                      <img src={pkg.heroImage} alt={pkg.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-2.5 space-y-1">
                      <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">{pkg.title}</p>
                      <p className="text-[10px] text-gray-500">{pkg.duration}</p>
                      <p className="text-sm font-black text-emerald-900">
                        ₹{pkg.pricePerPerson.toLocaleString('en-IN')}
                        <span className="text-[10px] font-medium text-gray-400"> /person</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Recommended Hotels & Restaurants */}
          <RecommendationGrids />

          {/* Local Guide Advice Section */}
          <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-base font-bold mb-3 text-gray-900 flex items-center gap-2">
              <i className="fa-solid fa-leaf text-emerald-700"></i>
              <span>Local Guide Recommendations</span>
            </h3>

            <ul className="space-y-2.5 mb-4">
              {place.guideTips?.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <i className="fa-solid fa-circle-check text-emerald-600 text-sm mt-0.5 shrink-0"></i>
                  <span className="text-xs text-gray-700 leading-snug">{tip}</span>
                </li>
              ))}
            </ul>

            {/* Sunset View Card */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="rounded-xl overflow-hidden shadow-xs mb-2 h-36">
                <img
                  alt="Sunset View"
                  className="w-full h-full object-cover"
                  src={place.guideSunsetImage || place.mainImage}
                />
              </div>
              <p className="text-center text-xs text-gray-600 font-medium">
                Enjoy the view, Respect the nature<br />
                <span className="font-bold text-sm text-gray-900">Love Dima Hasao!</span>
              </p>
            </div>
          </section>

          {/* Direct Ride CTA Card */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-gradient-to-r from-[#0a3a22] to-emerald-900 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-amber-300">Ready to visit {place.name}?</p>
              <p className="text-sm font-bold">Book Auto or Cab from ₹100</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => handleBookDirect('auto')}
              className="bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold px-4 py-2 rounded-xl shadow cursor-pointer"
            >
              Book Ride →
            </motion.button>
          </motion.div>
        </div>
      </main>

      {/* Footer message */}
      <footer className="bg-[#0b2e13] text-white py-4 text-center border-t border-emerald-900">
        <p className="text-xs font-serif italic text-amber-300">
          Plan your trip, stay safe and<br />enjoy the beauty of Dima Hasao!
        </p>
      </footer>
    </div>
  );
};
