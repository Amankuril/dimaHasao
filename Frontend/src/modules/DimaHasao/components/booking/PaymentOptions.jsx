import { useBooking } from '../../context/BookingContext';
import { motion } from 'framer-motion';

export const PaymentOptions = ({ transport, onBookNow }) => {
  const { paymentMethod, setPaymentMethod } = useBooking();

  const methods = [
    { id: 'upi', label: 'UPI', icon: 'fa-solid fa-angles-right' },
    { id: 'card', label: 'Card', icon: 'fa-regular fa-credit-card' },
    { id: 'wallet', label: 'Wallet', icon: 'fa-solid fa-wallet' },
    { id: 'cash', label: 'Cash', icon: 'fa-solid fa-money-bill-1' }
  ];

  return (
    <div className="bg-[#F1EBD7] rounded-2xl p-4 shadow-sm border border-[#E5DDC3] flex flex-col justify-between">
      {/* Fare Header */}
      <div className="text-center pb-3 border-b border-[#E5DDC3]">
        <p className="text-xs font-semibold text-gray-600">Total Fare (MRP)</p>
        <p className="text-2xl sm:text-3xl font-black text-[#1B4D2E] mt-0.5">
          {transport.fareFormatted}
        </p>
      </div>

      {/* Payment Options Grid */}
      <div className="pt-3">
        <p className="text-[11px] font-bold text-gray-700 mb-2 uppercase tracking-wide">
          Payment Options
        </p>
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {methods.map((m) => {
            const isSelected = paymentMethod === m.id;
            return (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setPaymentMethod(m.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1B4D2E] text-amber-300 border-[#1B4D2E] shadow-sm font-bold'
                    : 'bg-white/60 text-[#1B4D2E]/70 border-transparent hover:bg-white'
                }`}
              >
                <i className={`${m.icon} text-base`}></i>
                <span className="text-[10px] font-medium">{m.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={onBookNow}
          className="w-full bg-[#1B4D2E] hover:bg-emerald-900 text-white font-bold py-3 rounded-xl shadow-md text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Book {transport.name} Now</span>
          <i className="fa-solid fa-arrow-right text-xs"></i>
        </motion.button>

        <p className="text-center text-[10px] text-[#1B4D2E] mt-2 flex items-center justify-center gap-1 font-medium">
          <i className="fa-solid fa-lock text-[9px]"></i>
          <span>Secure &amp; Easy Booking</span>
        </p>
      </div>
    </div>
  );
};
