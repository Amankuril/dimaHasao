import { motion } from 'framer-motion';
import { useBooking } from '../../context/BookingContext';

export const MenuItemCard = ({ item, restaurant }) => {
  const { cart, addToCart, updateCartQuantity } = useBooking();

  const cartItem = cart.find((i) => i.id === item.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  return (
    <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#E5DDC3]/80 flex justify-between gap-3 relative overflow-hidden">
      {/* Item Text & Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Veg / Non-Veg Icon & Bestseller Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center ${
                item.isVeg ? 'border-green-600' : 'border-red-600'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  item.isVeg ? 'bg-green-600' : 'bg-red-600'
                }`}
              />
            </span>

            {item.isBestseller && (
              <span className="bg-amber-100 text-amber-900 font-bold text-[9.5px] px-1.5 py-0.2 rounded border border-amber-300">
                ★ Bestseller
              </span>
            )}

            {item.isSpicy && (
              <span className="text-[10px] text-red-600 font-semibold flex items-center gap-0.5">
                <i className="fa-solid fa-pepper-hot text-[9px]"></i>
                <span>Spicy</span>
              </span>
            )}
          </div>

          <h4 className="font-montserrat font-bold text-sm text-gray-900 leading-snug">
            {item.name}
          </h4>

          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="font-montserrat font-extrabold text-sm text-emerald-950">
              ₹{item.price}
            </span>
            {item.originalPrice && (
              <span className="text-xs text-gray-400 line-through">
                ₹{item.originalPrice}
              </span>
            )}
          </div>

          <p className="text-[11px] text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Item Image & Add / Stepper Button */}
      <div className="relative w-28 h-28 shrink-0 flex flex-col items-center justify-between">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shadow-xs border border-gray-200">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Add or Stepper Button */}
        <div className="absolute -bottom-1">
          {quantity === 0 ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => addToCart(restaurant, item)}
              className="bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-700 font-bold text-xs px-5 py-1 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              ADD
            </motion.button>
          ) : (
            <div className="flex items-center bg-[#06381e] text-amber-300 rounded-xl px-2 py-1 shadow-md font-bold text-xs gap-2.5 border border-emerald-700">
              <button
                onClick={() => updateCartQuantity(item.id, -1)}
                className="w-4 h-4 flex items-center justify-center hover:text-white cursor-pointer"
              >
                -
              </button>
              <span className="text-white text-xs">{quantity}</span>
              <button
                onClick={() => updateCartQuantity(item.id, 1)}
                className="w-4 h-4 flex items-center justify-center hover:text-white cursor-pointer"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
