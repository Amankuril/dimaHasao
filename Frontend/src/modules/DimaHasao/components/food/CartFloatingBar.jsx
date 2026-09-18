import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useHostNavigate } from '../../router';
import { useBooking } from '../../context/BookingContext';

export const CartFloatingBar = () => {
  const { cart, cartRestaurant } = useBooking();
  const navigate = useNavigate();
  const hostNavigate = useHostNavigate();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (totalItems === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-3 left-0 right-0 z-50 px-3 flex justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          className="w-full max-w-[400px] bg-[#06381e] text-white rounded-2xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)] border border-amber-400/40 flex items-center justify-between pointer-events-auto backdrop-blur-md"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-black flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
              <i className="fa-solid fa-basket-shopping text-xs"></i>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-amber-300 font-montserrat">
                  {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                </span>
                <span className="text-white/40">•</span>
                <span className="font-extrabold text-sm text-white font-montserrat">
                  ₹{totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[10px] text-emerald-200 truncate max-w-[180px]">
                {cartRestaurant?.name || 'Local Restaurant'}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => hostNavigate('/food/user/cart')}
            className="bg-amber-400 hover:bg-amber-300 text-[#06381e] font-black text-xs px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>View Cart</span>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
