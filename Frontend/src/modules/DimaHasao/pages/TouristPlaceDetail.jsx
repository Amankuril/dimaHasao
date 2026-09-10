import { useParams, useNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { PLACES_DATA } from '../data/tourismData';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { GalleryViewer } from '../components/places/GalleryViewer';
import { TransportSelector } from '../components/places/TransportSelector';
import { RecommendationGrids } from '../components/places/RecommendationGrids';
import { motion } from 'framer-motion';

export const TouristPlaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSelectedPlaceId, setSelectedTransportId } = useBooking();

  // Look up place by ID or default to first
  const place = PLACES_DATA.find((p) => p.id === (id || '1')) || PLACES_DATA[0];

  const handleBookDirect = (transportType = 'auto') => {
    setSelectedPlaceId(place.id);
    setSelectedTransportId(transportType);
    navigate('/book-ride');
  };

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
