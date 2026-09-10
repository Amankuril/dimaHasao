import { HOTELS_DATA, RESTAURANTS_DATA } from '../../data/tourismData';
import { useBooking } from '../../context/BookingContext';

export const RecommendationGrids = () => {
  const { showToast } = useBooking();

  const handleHotelClick = (hotel) => {
    showToast(`Inquiry sent for ${hotel.name} (${hotel.priceFormatted}${hotel.period})`);
  };

  const handleRestaurantClick = (resto) => {
    showToast(`Table availability checked for ${resto.name}`);
  };

  return (
    <div className="space-y-4">
      {/* Recommended Hotels */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
            <i className="fa-solid fa-hotel text-emerald-700"></i>
            <span>RECOMMENDED HOTELS</span>
          </h3>
          <button
            onClick={() => showToast('Displaying all registered tourist hotels')}
            className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
          >
            View All &gt;
          </button>
        </div>

        <div className="space-y-3">
          {HOTELS_DATA.map((hotel) => (
            <div
              key={hotel.id}
              onClick={() => handleHotelClick(hotel)}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-emerald-50/50 transition-colors cursor-pointer"
            >
              <img
                alt={hotel.name}
                className="w-16 h-12 rounded-lg object-cover shadow-xs shrink-0"
                src={hotel.image}
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-gray-900 truncate">{hotel.name}</h4>
                <div className="flex text-amber-400 text-[10px] my-0.5">
                  {'★'.repeat(hotel.rating)}
                  {'☆'.repeat(5 - hotel.rating)}
                </div>
                <p className="text-[9px] text-gray-500 truncate">{hotel.distance}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs sm:text-sm font-bold text-emerald-800">{hotel.priceFormatted}</p>
                <p className="text-[9px] text-gray-400">{hotel.period}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended Restaurants */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
            <i className="fa-solid fa-utensils text-orange-600"></i>
            <span>RECOMMENDED RESTAURANTS</span>
          </h3>
          <button
            onClick={() => showToast('Displaying all authentic local eateries')}
            className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
          >
            View All &gt;
          </button>
        </div>

        <div className="space-y-3">
          {RESTAURANTS_DATA.map((resto) => (
            <div
              key={resto.id}
              onClick={() => handleRestaurantClick(resto)}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-orange-50/50 transition-colors cursor-pointer"
            >
              <img
                alt={resto.name}
                className="w-16 h-12 rounded-lg object-cover shadow-xs shrink-0"
                src={resto.image}
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-gray-900 truncate">{resto.name}</h4>
                <div className="flex text-amber-400 text-[10px] my-0.5">
                  {'★'.repeat(resto.rating)}
                  {'☆'.repeat(5 - resto.rating)}
                </div>
                <p className="text-[9px] text-gray-500 truncate">{resto.distance}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs sm:text-sm font-bold text-gray-900">{resto.priceFormatted}</p>
                <p className="text-[9px] text-gray-400">{resto.period}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
