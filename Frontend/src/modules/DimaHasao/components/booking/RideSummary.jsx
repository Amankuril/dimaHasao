import { useBooking } from '../../context/BookingContext';

export const RideSummary = ({ place, transport }) => {
  const { pickupLocation } = useBooking();

  return (
    <div className="bg-[#F1EBD7] rounded-2xl p-4 shadow-sm border border-[#E5DDC3] text-xs">
      <ul className="space-y-2.5">
        <li className="flex items-start">
          <i className="fa-solid fa-location-dot w-5 text-[#1B4D2E] mt-0.5 text-sm"></i>
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-semibold">From</span>
            <span className="font-semibold text-gray-900">{pickupLocation || 'Haflong Station'}</span>
          </div>
        </li>

        <li className="flex items-start">
          <i className="fa-solid fa-location-dot w-5 text-[#1B4D2E] mt-0.5 text-sm"></i>
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-semibold">To</span>
            <span className="font-semibold text-gray-900">{place.name}</span>
          </div>
        </li>

        <li className="flex items-center pt-1 border-t border-amber-900/10">
          <i className="fa-solid fa-route w-5 text-gray-500 text-xs"></i>
          <span className="text-gray-500 w-20">Distance</span>
          <span className="font-semibold text-gray-900">{place.distanceFromStation}</span>
        </li>

        <li className="flex items-center">
          <i className="fa-regular fa-clock w-5 text-gray-500 text-xs"></i>
          <span className="text-gray-500 w-20">Travel Time</span>
          <span className="font-semibold text-gray-900">
            {place.travelTime}
          </span>
        </li>

        <li className="flex items-center">
          <i className="fa-solid fa-car-side w-5 text-gray-500 text-xs"></i>
          <span className="text-gray-500 w-20">Transport</span>
          <span className="font-semibold text-gray-900">{transport.name}</span>
        </li>

        <li className="flex items-center">
          <i className="fa-solid fa-indian-rupee-sign w-5 text-gray-500 text-xs"></i>
          <span className="text-gray-500 w-20">Fare (MRP)</span>
          <span className="font-bold text-gray-900 text-sm">{transport.fareFormatted}</span>
        </li>
      </ul>

      {/* Safety Badge Container */}
      <div className="mt-3.5 bg-[#E8F3ED] p-2.5 rounded-xl text-[10px] flex items-start gap-2 border border-[#C5E1D4]">
        <i className="fa-solid fa-shield-halved text-[#4A7C59] mt-0.5 text-xs"></i>
        <ul className="list-disc pl-3 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[#4A7C59] font-semibold">
          <li>Safe &amp; Reliable</li>
          <li>Verified Drivers</li>
          <li>Clean Vehicles</li>
          <li>Best Prices</li>
        </ul>
      </div>
    </div>
  );
};
