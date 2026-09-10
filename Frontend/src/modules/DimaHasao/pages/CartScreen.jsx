import { useState } from 'react';
import { useNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const CartScreen = () => {
  const { cart, cartRestaurant, updateCartQuantity, removeFromCart, clearCart, createFoodOrder, showToast } =
    useBooking();
  const navigate = useNavigate();

  const [deliveryMode, setDeliveryMode] = useState('delivery'); // 'delivery', 'pickup'
  const [deliveryAddress, setDeliveryAddress] = useState('Circuit House Road, Upper Bagetar, Haflong');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [cookingInstructions, setCookingInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryMode === 'delivery' ? (subtotal > 300 ? 0 : 35) : 0;
  const packagingFee = 20;
  const discountAmount = discount > 0 ? Math.round(subtotal * (discount / 100)) : 0;
  const gst = Math.round((subtotal - discountAmount) * 0.05);
  const totalAmount = subtotal - discountAmount + deliveryFee + packagingFee + gst;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'HUNGRY' || code === 'WELCOME') {
      setDiscount(15);
      setAppliedCode(code);
      showToast(`Promo ${code} applied! 15% OFF 😋`);
    } else {
      showToast('Invalid promo code. Try HUNGRY');
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      showToast('Your cart is empty');
      return;
    }

    const newOrder = await createFoodOrder({
      deliveryMode,
      deliveryAddress: deliveryMode === 'delivery' ? deliveryAddress : 'Pickup from Restaurant',
      cookingInstructions,
      subtotal,
      deliveryFee,
      packagingFee,
      discountAmount,
      gst,
      totalAmount,
      paymentMethod:
        paymentMethod === 'upi'
          ? 'UPI (Instant)'
          : paymentMethod === 'cod'
          ? 'Cash on Delivery'
          : 'Card / Net Banking',
      paymentStatus: paymentMethod === 'cod' ? 'Pending (COD)' : 'Paid Online'
    });

    showToast('Order Placed Successfully! 🛵');
    navigate(`/food/orders/${newOrder.id}`);
  };

  if (cart.length === 0) {
    return (
      <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-20 relative font-poppins">
        <Header title="YOUR CART" subtitle="Food & Dining" showBack={true} rightAction="none" />
        <PatternDivider variant="green-gold" />
        <div className="text-center py-24 p-6 space-y-3">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm text-gray-400 border border-[#E5DDC3]">
            <i className="fa-solid fa-basket-shopping"></i>
          </div>
          <h3 className="font-montserrat font-bold text-base text-gray-900">Your Cart is Empty</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Explore authentic local Dimasa restaurants and add delicious meals to your cart.
          </p>
          <button
            onClick={() => navigate('/food')}
            className="bg-[#06381e] text-amber-300 text-xs font-bold px-5 py-2.5 rounded-xl shadow-md hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            Explore Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-32 relative font-poppins">
      <Header
        title="YOUR CART"
        subtitle={cartRestaurant?.name || 'Local Restaurant'}
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <main className="p-3.5 space-y-4">
        {/* Delivery / Pickup Toggle */}
        <div className="flex bg-white rounded-2xl p-1 shadow-xs border border-[#E5DDC3]">
          <button
            type="button"
            onClick={() => setDeliveryMode('delivery')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              deliveryMode === 'delivery'
                ? 'bg-[#06381e] text-amber-300 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <i className="fa-solid fa-motorcycle text-xs"></i>
            <span>Doorstep Delivery</span>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMode('pickup')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              deliveryMode === 'pickup'
                ? 'bg-[#06381e] text-amber-300 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <i className="fa-solid fa-person-walking text-xs"></i>
            <span>Takeaway Pickup</span>
          </button>
        </div>

        {/* Delivery Address Card */}
        {deliveryMode === 'delivery' && (
          <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#E5DDC3] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                <i className="fa-solid fa-location-dot text-emerald-800"></i>
                <span>Delivering To</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingAddress((p) => !p)}
                className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                {isEditingAddress ? 'Save' : 'Change'}
              </button>
            </div>

            {isEditingAddress ? (
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-600"
              />
            ) : (
              <p className="text-xs font-semibold text-gray-900">{deliveryAddress}</p>
            )}
          </div>
        )}

        {/* Cart Items List */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h3 className="font-montserrat font-bold text-sm text-gray-900">
              {cartRestaurant?.name}
            </h3>
            <button
              onClick={clearCart}
              className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
            >
              Clear Cart
            </button>
          </div>

          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={`w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 ${
                      item.isVeg ? 'border-green-600' : 'border-red-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.isVeg ? 'bg-green-600' : 'bg-red-600'
                      }`}
                    />
                  </span>
                  <span className="font-semibold text-gray-900 truncate">{item.name}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Stepper */}
                  <div className="flex items-center bg-[#FAF6ED] rounded-lg px-2 py-0.5 border border-[#E5DDC3] text-xs font-bold gap-2">
                    <button
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="text-gray-600 hover:text-red-600 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="text-gray-600 hover:text-emerald-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-bold text-gray-900 w-14 text-right font-montserrat">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Cooking Instructions */}
          <div className="pt-2 border-t border-gray-100">
            <input
              type="text"
              placeholder="Cooking instructions (e.g. less spicy, extra lemon)..."
              value={cookingInstructions}
              onChange={(e) => setCookingInstructions(e.target.value)}
              className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Promo Code Box */}
        <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#E5DDC3]">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Promo Code (e.g. HUNGRY)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-1.5 text-xs uppercase font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
            />
            <button
              onClick={handleApplyPromo}
              className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs hover:bg-[#0a4d2b] transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
          {discount > 0 && (
            <p className="text-[11px] font-semibold text-emerald-700 mt-2 flex items-center gap-1">
              <i className="fa-solid fa-tag"></i>
              <span>Coupon {appliedCode} applied ({discount}% Discount)</span>
            </p>
          )}
        </div>

        {/* Payment Method Selector */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-credit-card text-emerald-800"></i>
            <span>Payment Option</span>
          </h3>

          <div className="space-y-1.5">
            {[
              { id: 'upi', label: 'UPI / QR (Google Pay, PhonePe)', icon: 'fa-solid fa-qrcode' },
              { id: 'cod', label: 'Cash on Delivery (COD)', icon: 'fa-solid fa-hand-holding-dollar' },
              { id: 'card', label: 'Credit / Debit Cards & Net Banking', icon: 'fa-solid fa-credit-card' }
            ].map((m) => (
              <label
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  paymentMethod === m.id
                    ? 'border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-600'
                    : 'border-[#E5DDC3] bg-[#FAF6ED]/40 hover:bg-[#FAF6ED]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="foodPayment"
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                    className="accent-emerald-800 w-3.5 h-3.5"
                  />
                  <i className={`${m.icon} text-xs text-emerald-900`}></i>
                  <span className="text-xs font-semibold text-gray-900">{m.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Bill Breakdown */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2">
          <h3 className="font-montserrat font-bold text-sm text-gray-900">Bill Details</h3>

          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Item Total</span>
              <span className="font-semibold text-gray-900">₹{subtotal}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Coupon Discount ({discount}%)</span>
                <span>- ₹{discountAmount}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Delivery Partner Fee</span>
              <span className="font-semibold text-gray-900">
                {deliveryFee === 0 ? <span className="text-emerald-700 font-bold">FREE</span> : `₹${deliveryFee}`}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Restaurant Packaging</span>
              <span className="font-semibold text-gray-900">₹{packagingFee}</span>
            </div>

            <div className="flex justify-between">
              <span>GST & Restaurant Taxes (5%)</span>
              <span className="font-semibold text-gray-900">₹{gst}</span>
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline text-gray-900">
              <span className="font-bold text-sm">To Pay</span>
              <span className="font-black text-lg text-emerald-950 font-montserrat">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Place Order CTA */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePlaceOrder}
          className="w-full bg-[#06381e] hover:bg-[#0a4d2b] text-amber-300 font-bold text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="fa-solid fa-shield-halved text-xs"></i>
          <span>Place Order (₹{totalAmount.toLocaleString('en-IN')})</span>
        </motion.button>
      </main>
    </div>
  );
};
