import { useNavigate } from '../../router';
import { motion, AnimatePresence } from 'framer-motion';

export const BookingConfirmationModal = ({ isOpen, booking, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen || !booking) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl z-10 w-full max-w-sm border border-emerald-200 relative overflow-hidden"
        >
          {/* Top Decorative Header */}
          <div className="text-center pb-4 border-b border-gray-100">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
              className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner"
            >
              <i className="fa-solid fa-check text-2xl"></i>
            </motion.div>
            <h3 className="text-lg font-bold text-gray-900">Ride Confirmed!</h3>
            <p className="text-xs text-gray-500 mt-0.5">Booking ID: <strong className="text-emerald-800">{booking.id}</strong></p>
          </div>

          {/* Booking Summary Box */}
          <div className="py-4 space-y-2.5 text-xs text-gray-700">
            <div className="bg-[#FAF6ED] p-3 rounded-2xl border border-[#E5DDC3] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Destination:</span>
                <span className="font-bold text-gray-900">{booking.placeName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Pickup Point:</span>
                <span className="font-semibold text-gray-800">{booking.pickup}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Vehicle &amp; Type:</span>
                <span className="font-bold text-emerald-800">{booking.transport} ({booking.vehicleNo})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Assigned Driver:</span>
                <span className="font-semibold text-gray-900">{booking.driverName}</span>
              </div>
            </div>

            {/* OTP Badge */}
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-amber-800 uppercase font-bold">Start Ride OTP</p>
                <p className="text-sm font-black text-amber-900 tracking-widest">{booking.otp}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase">Total Fare</p>
                <p className="text-sm font-bold text-emerald-800">₹{booking.fare}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onClose();
                navigate('/bookings');
              }}
              className="w-full py-3 bg-[#0a3a22] hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fa-regular fa-calendar-check"></i>
              <span>View in My Bookings</span>
            </motion.button>

            <button
              onClick={() => {
                onClose();
                navigate('/');
              }}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              Return to Home
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
