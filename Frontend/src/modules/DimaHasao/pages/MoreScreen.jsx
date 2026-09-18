import { useNavigate, useHostNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { ModuleAccordion } from '../components/layout/ModuleAccordion';
import { MODULE_SECTIONS } from '@/shared/components/app/moduleSections';
import { motion } from 'framer-motion';

export const MoreScreen = () => {
  const { user, logout, showToast } = useBooking();
  const navigate = useNavigate();
  // Module tabs live outside this mount, so they need unprefixed paths.
  const hostNavigate = useHostNavigate();

  const services = [
    {
      title: 'Tourist Attractions',
      desc: 'Jatinga, Haflong, Silaikul & hidden waterfalls',
      icon: 'fa-solid fa-mountain-sun',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      path: '/places'
    },
    {
      title: 'Hotels & Homestays',
      desc: 'Scenic resorts, traditional cottages & lodges',
      icon: 'fa-solid fa-hotel',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      path: '/hotels'
    },
    {
      title: 'Food & Dining Delivery',
      desc: 'Authentic Dimasa smoked delicacies & cafes',
      icon: 'fa-solid fa-utensils',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      path: '/food'
    },
    {
      title: 'Taxi & Auto Booking',
      desc: 'Verified drivers, fixed MRP & instant confirmation',
      icon: 'fa-solid fa-taxi',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      path: '/book-ride'
    },
    {
      title: 'Tour & Trek Packages',
      desc: 'All-inclusive guided expeditions & camps',
      icon: 'fa-solid fa-suitcase-rolling',
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      path: '/packages'
    },
    {
      title: 'Falcon Festival & Events',
      desc: 'Official government passes & music gala',
      icon: 'fa-solid fa-ticket',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      path: '/festivals'
    },
    {
      title: 'Help & Support (SOS)',
      desc: 'Emergency hotlines, ticket raising & FAQs',
      icon: 'fa-solid fa-headset',
      color: 'text-red-600',
      bg: 'bg-red-50',
      path: '/support'
    },
    {
      title: 'Rate & Review',
      desc: 'Share verified feedback for rides and stays',
      icon: 'fa-solid fa-star',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      path: '/review'
    }
  ];

  const culturalServices = [
    {
      title: 'Local Certified Guides',
      desc: 'Expert local Dimasa eco-guides & trekking experts',
      icon: 'fa-solid fa-user-tie',
      color: 'text-green-600',
      action: () => showToast('Connecting to Certified Dimasa Guides Desk (+91 94350 12345)')
    },
    {
      title: 'Events & Falcon Festival',
      desc: 'Annual wildlife festival & cultural passes',
      icon: 'fa-solid fa-calendar-days',
      color: 'text-orange-500',
      action: () => navigate('/festivals')
    },
    {
      title: 'Curated Tour Packages',
      desc: 'All-inclusive 2-Day & 3-Day scenic nature treks',
      icon: 'fa-solid fa-suitcase-rolling',
      color: 'text-teal-600',
      action: () => navigate('/packages')
    },
    {
      title: 'Authentic Dimasa Cuisine',
      desc: 'Judima rice brew, smoked meat & organic herbs',
      icon: 'fa-solid fa-utensils',
      color: 'text-red-500',
      action: () => navigate('/food')
    }
  ];

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-20 relative font-poppins">
      <Header
        title="MORE & SERVICES"
        subtitle="Explore all Dima Hasao services"
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <main className="p-4 space-y-4">
        {/* User Card */}
        <div className="bg-gradient-to-br from-[#0a2e12] to-[#186a43] rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-full border-2 border-amber-400 p-0.5 overflow-hidden shrink-0 shadow">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHxXjaqg_p2_vshVQlQARltQKITPTxRdxMMlP-3QyFF5y8e2b25l5rewGDv8hjTJT1mIeodoXkQyW5Q5DbamrNM5Wqkn9zC5hXH-uNiaqjmuWSf0eYIG090j8R2skAqbm4nCA9jzMl8Rca5t2ANsI31UQDQpgiAqnjiXgjeFcP5hsy0iTh8orLvaeTNhXhfOJY7K7F6qam7R85TVEaEb8naGgso3oEml2Ix6YFyN-Jua917AHlmZIs"
                alt="Avatar"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-amber-300 truncate">{user.name}</h3>
              <p className="text-[11px] text-emerald-200 truncate">{user.phone || '+91 98765 43210'}</p>
              <span className="inline-block mt-0.5 text-[9px] bg-amber-400/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-400/30">
                Logged In
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            View Profile →
          </button>
        </div>

        {/* Primary Travel Modules */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5DDC3]">
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 mb-3 flex items-center gap-1.5">
            <i className="fa-solid fa-compass text-emerald-700"></i>
            <span>Travel Modules</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {services.map((item, idx) => (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all text-left cursor-pointer bg-gray-50/50"
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center text-lg shrink-0 shadow-xs`}>
                  <i className={item.icon}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-gray-900 leading-tight truncate">{item.title}</h5>
                  <p className="text-[10px] text-gray-500 truncate leading-snug mt-0.5">{item.desc}</p>
                </div>
                <i className="fa-solid fa-chevron-right text-gray-400 text-xs shrink-0"></i>
              </motion.button>
            ))}
          </div>
        </section>

        {/*
          Each module's own navigation.

          Food used to carry Delivery/Takeaway/Under-250/Dining in its own
          bottom bar and taxi carried Ride/Bus/Support in its own — one app, but
          a different bar depending on where you stood. The five anchors are
          shared now, and what was specific to a module lives here instead of
          being dropped.
        */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
              <i className="fa-solid fa-compass text-emerald-700"></i>
              <span>Inside Each Service</span>
            </h4>
            <span className="text-[9px] text-gray-500">Every module&rsquo;s own tabs</span>
          </div>

          {MODULE_SECTIONS.map((section) => (
            <ModuleAccordion
              key={section.id}
              section={section}
              rows={section.services}
              onNavigate={hostNavigate}
            />
          ))}
        </div>

        {/* Cultural & Tourism Services */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5DDC3]">
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 mb-3 flex items-center gap-1.5">
            <i className="fa-solid fa-leaf text-emerald-700"></i>
            <span>Tourism &amp; Culture</span>
          </h4>

          <div className="space-y-2">
            {culturalServices.map((item, idx) => (
              <div
                key={idx}
                onClick={item.action}
                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-xs shrink-0">
                    <i className={`${item.icon} ${item.color} text-sm`}></i>
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-gray-900 truncate">{item.title}</h5>
                    <p className="text-[10px] text-gray-500 truncate">{item.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-800 font-bold shrink-0">Inquire →</span>
              </div>
            ))}
          </div>
        </section>

        {/* Emergency Helplines */}
        <section className="bg-red-50/80 rounded-2xl p-4 shadow-sm border border-red-200">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-shield-heart text-red-600 text-base"></i>
              <h4 className="font-bold text-xs uppercase tracking-wider text-red-900">Emergency Numbers</h4>
            </div>
            <span className="text-[10px] text-red-700 font-semibold">24x7 Assistance</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:112"
              className="p-2.5 rounded-xl bg-white border border-red-200 text-center hover:bg-red-100/50 transition-colors"
            >
              <span className="text-[10px] text-gray-500 block">Police SOS</span>
              <strong className="text-sm font-bold text-red-600">112</strong>
            </a>

            <a
              href="tel:03673236222"
              className="p-2.5 rounded-xl bg-white border border-red-200 text-center hover:bg-red-100/50 transition-colors"
            >
              <span className="text-[10px] text-gray-500 block">Civil Hospital</span>
              <strong className="text-xs font-bold text-red-600">03673-236222</strong>
            </a>
          </div>
        </section>

        {/* About & Logout */}
        <div className="space-y-2">
          {user.isLoggedIn ? (
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-200 cursor-pointer"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
              <span>Log Out</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-[#0a3a22] hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              <span>Sign In / Register</span>
            </button>
          )}

          <p className="text-center text-[10px] text-gray-400 font-medium pt-2">
            Dima Hasao Tourism Official Web App • v2.0
          </p>
        </div>
      </main>
    </div>
  );
};
