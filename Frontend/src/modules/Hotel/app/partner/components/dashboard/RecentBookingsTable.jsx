
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const RecentBookingsTable = ({ bookings }) => {
  const navigate = useNavigate();

  if (!bookings || bookings.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center">
        <p className="text-gray-400 text-sm">No recent bookings found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 text-lg">Recent Activity</h3>
        <button
          onClick={() => navigate('/hotel/bookings')}
          className="text-xs font-semibold text-[#005CA8] hover:text-[#004b8a] flex items-center gap-1 hover:gap-2 transition-all"
        >
          View All <ChevronRight size={14} />
        </button>
      </div>

      {/* Mobile View: Compact Cards */}
      <div className="md:hidden">
        {bookings.map((booking) => {
          const pType = (booking.propertyId?.propertyType || booking.propertyType || '').toLowerCase();
          return (
            <div
              key={booking._id}
              onClick={() => navigate(`/hotel/bookings/${booking._id}`)}
              className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {booking.userId?.name || booking.guestName || "Guest"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {booking.userId?.phone || booking.guestPhone?.substring(0, 10) || 'No Phone'}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                    ${booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'checked_in' ? 'bg-green-100 text-green-700' : ''}
                    ${booking.bookingStatus === 'pending' || booking.bookingStatus === 'awaiting_payment' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                    ${booking.bookingStatus === 'completed' || booking.bookingStatus === 'checked_out' ? 'bg-blue-100 text-blue-700' : ''}
                `}>
                  {booking.bookingStatus === 'checked_in' ? 'ONGOING' :
                    booking.bookingStatus === 'checked_out' ? 'COMPLETED' :
                      booking.bookingStatus}
                </span>
              </div>

              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-700 line-clamp-1">
                    {booking.propertyId?.propertyName || booking.property?.name || "Property"}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded inline-block mb-1 border border-gray-100 uppercase">
                    {pType}
                  </p>
                  <div className="text-[10px] text-gray-400 font-medium">
                    <span>
                      {new Date(booking.checkInDate || booking.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {' - '}
                      {new Date(booking.checkOutDate || booking.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-black text-gray-900">
                  ₹{(booking.totalAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          );
        })}
      </div>


      {/* Desktop View: Details Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-[#005CA8]/5 text-gray-700">
            <tr>
              <th className="px-6 py-3 font-semibold">Guest</th>
              <th className="px-6 py-3 font-semibold">Property</th>
              <th className="px-6 py-3 font-semibold">Activity Info</th>
              <th className="px-6 py-3 font-semibold">Budget/Amount</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map((booking) => {
              const pType = (booking.propertyId?.propertyType || booking.propertyType || '').toLowerCase();
                  return (
                <tr key={booking._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {booking.userId?.name || booking.guestName || "Guest"}
                    <div className="text-xs text-gray-400 font-normal">{booking.userId?.phone || booking.guestPhone}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-[150px]">
                    <div className="flex flex-col">
                      <span>{booking.propertyId?.propertyName || booking.property?.name || "Unknown Property"}</span>
                      <span className="text-[10px] uppercase font-bold text-gray-400">{pType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold">Stay Duration</span>
                      <span>
                        {new Date(booking.checkInDate || booking.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        {' - '}
                        {new Date(booking.checkOutDate || booking.checkOut).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <span>₹{(booking.totalAmount || 0).toLocaleString('en-IN')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold
                                          ${booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'checked_in' ? 'bg-green-100 text-green-700' : ''}
                                          ${booking.bookingStatus === 'pending' || booking.bookingStatus === 'awaiting_payment' ? 'bg-yellow-100 text-yellow-700' : ''}
                                          ${booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                                          ${booking.bookingStatus === 'completed' || booking.bookingStatus === 'checked_out' ? 'bg-blue-100 text-blue-700' : ''}
                                      `}>
                      {booking.bookingStatus === 'checked_in' ? 'ONGOING' :
                        booking.bookingStatus === 'checked_out' ? 'COMPLETED' :
                          (booking.bookingStatus || 'unknown').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/hotel/bookings/${booking._id}`)}
                      className="text-[#005CA8] hover:text-[#004b8a] font-medium text-xs border border-[#005CA8]/20 px-3 py-1.5 rounded-lg hover:bg-[#005CA8]/5 transition"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default RecentBookingsTable;
