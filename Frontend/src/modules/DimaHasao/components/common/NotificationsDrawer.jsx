import { useBooking } from '../../context/BookingContext';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationsDrawer = () => {
  const { isNotificationsOpen, setIsNotificationsOpen } = useBooking();

  const notifications = [
    {
      id: 1,
      title: 'Falcon Festival 2026 Announced!',
      desc: 'Annual wildlife and tribal music extravaganza dates released. Umrangso Lake venue confirmed.',
      time: '2 hrs ago',
      icon: 'fa-solid fa-feather-pointed',
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    {
      id: 2,
      title: 'Scenic Bird Phenomenon Season',
      desc: 'Jatinga watchtower observatory is now open for evening visitors. Best time 5:30 PM.',
      time: '1 day ago',
      icon: 'fa-solid fa-dove',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      id: 3,
      title: 'Welcome to Dima Hasao Tourism',
      desc: 'Thank you for exploring our hills! Enjoy verified taxi rides & registered eco guides.',
      time: '3 days ago',
      icon: 'fa-solid fa-leaf',
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    }
  ];

  return (
    <AnimatePresence>
      {isNotificationsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNotificationsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100]"
          />

          {/* Notifications Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 bottom-0 right-0 w-[320px] max-w-[85vw] bg-white text-gray-800 z-[101] shadow-2xl flex flex-col justify-between"
          >
            <div>
              <div className="p-4 bg-[#0a3a22] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-bell text-amber-400"></i>
                  <h3 className="font-bold text-sm">Notifications</h3>
                </div>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="p-4 space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-emerald-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full ${n.bg} ${n.color} flex items-center justify-center shrink-0 mt-0.5`}>
                        <i className={n.icon}></i>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-gray-900 leading-tight">{n.title}</h4>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-1 leading-snug">{n.desc}</p>
                        <span className="text-[9px] text-gray-400 font-medium block mt-1.5">{n.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="w-full py-2 bg-[#0a3a22] text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
