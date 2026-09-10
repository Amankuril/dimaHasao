import { useParams, useNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { OrderStatusStepper } from '../components/food/OrderStatusStepper';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const OrderTrackingScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { foodOrders, showToast } = useBooking();

  const order = foodOrders.find((o) => o.id === id) || foodOrders[0];

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-24 relative font-poppins">
      <Header
        title="LIVE ORDER TRACKING"
        subtitle={`Order ID: ${order?.id || id}`}
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <main className="p-3.5 space-y-4">
        {/* Estimated Delivery Time Header Card */}
        <div className="bg-gradient-to-r from-[#06381e] to-[#0a4d2b] rounded-2xl p-4 text-white shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
              Live Delivery Status
            </span>
            <span className="bg-emerald-800 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
              {order?.status || 'Preparing'}
            </span>
          </div>

          <h2 className="font-montserrat font-extrabold text-xl text-white pt-1">
            Arriving in ~25 mins
          </h2>

          <p className="text-xs text-emerald-100 flex items-center gap-1">
            <i className="fa-solid fa-store text-amber-300"></i>
            <span>From: {order?.restaurantName}</span>
          </p>
        </div>

        {/* Live Status Stepper */}
        <OrderStatusStepper currentStep={2} />

        {/* Live Delivery Partner Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#06381e]/10 text-emerald-900 border border-emerald-300 flex items-center justify-center text-xl shrink-0 font-black">
                <i className="fa-solid fa-helmet-safety text-emerald-800"></i>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">
                  Delivery Partner
                </span>
                <h4 className="font-bold text-sm text-gray-900">{order?.deliveryPartner}</h4>
                <p className="text-[11px] text-gray-500">Haflong Fast Rider (AS-09-E-2104)</p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => showToast(`Calling driver at ${order?.partnerPhone}`)}
              className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-200 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            >
              <i className="fa-solid fa-phone text-sm"></i>
            </motion.button>
          </div>

          {/* Delivery Address */}
          <div className="bg-[#FAF6ED] p-2.5 rounded-xl border border-[#E5DDC3]/60 text-xs text-gray-700">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Delivery To:</span>
            <p className="font-semibold text-gray-900 mt-0.5">{order?.deliveryAddress}</p>
          </div>
        </div>

        {/* Order Items Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
          <h3 className="font-montserrat font-bold text-sm text-gray-900">Order Items</h3>

          <div className="space-y-2 text-xs">
            {order?.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-gray-700">
                <span className="font-medium">
                  {item.quantity} × {item.name}
                </span>
                <span className="font-bold text-gray-900 font-montserrat">
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100 flex justify-between items-baseline text-xs">
            <span className="font-bold text-gray-900">Total Paid:</span>
            <span className="font-black text-sm text-emerald-950 font-montserrat">
              ₹{order?.totalAmount?.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => showToast('Help desk connected: 03673-236224')}
            className="w-full py-3 bg-white border border-[#E5DDC3] hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-2xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-headset text-emerald-800"></i>
            <span>Need Help with Order?</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-[#06381e] hover:bg-emerald-900 text-amber-300 font-bold text-xs rounded-2xl shadow-md transition-colors cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </main>
    </div>
  );
};
