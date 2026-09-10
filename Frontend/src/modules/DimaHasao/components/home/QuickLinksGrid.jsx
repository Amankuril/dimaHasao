import { useState } from 'react';
import { useNavigate } from '../../router';
import { motion, AnimatePresence } from 'framer-motion';
import { useBooking } from '../../context/BookingContext';

export const QuickLinksGrid = () => {
  const [activeModal, setActiveModal] = useState(null);
  const { showToast } = useBooking();
  const navigate = useNavigate();

  const links = [
    {
      id: 'guide',
      label: 'Local Guide',
      icon: 'fa-solid fa-user-tie',
      color: 'text-white',
      bg: 'bg-[#10B981]'
    },
    {
      id: 'events',
      label: 'Events &\nFestivals',
      icon: 'fa-solid fa-calendar-days',
      color: 'text-white',
      bg: 'bg-[#F97316]'
    },
    {
      id: 'packages',
      label: 'Travel\nPackages',
      icon: 'fa-solid fa-suitcase-rolling',
      color: 'text-white',
      bg: 'bg-[#3B82F6]'
    },
    {
      id: 'food',
      label: 'Food &\nCuisine',
      icon: 'fa-solid fa-bowl-food',
      color: 'text-white',
      bg: 'bg-[#F43F5E]'
    },
    {
      id: 'emergency',
      label: 'Emergency\nHelp',
      icon: 'fa-solid fa-phone-volume',
      color: 'text-white',
      bg: 'bg-[#EF4444]'
    }
  ];

  const modalDetails = {
    guide: {
      title: 'Local Certified Guides',
      desc: 'Connect with registered Dimasa eco-guides who know the secret trails, waterfalls, and folklore.',
      items: ['Government Certified Guides', 'Trekking & Forest Expeditions', 'Dimasa & English speaking', 'Nominal daily rates from ₹800/day'],
      actionText: 'Contact Tourism Desk',
      actionLink: 'tel:+919435012345'
    },
    events: {
      title: 'Events & Festivals',
      desc: 'Experience the colorful cultural heritage of Dima Hasao.',
      items: ['Falcon Festival (Umrangso) - Nov/Dec', 'Busu Dima (Harvest Festival) - Jan', 'Judima Tribal Festival - Dec', 'Haflong Hills Music Fest - Spring'],
      actionText: 'Explore Festival Calendar'
    },
    packages: {
      title: 'Curated Travel Packages',
      desc: 'Tailored 2-day, 3-day, and weekend itineraries for nature & adventure lovers.',
      items: ['Haflong & Jatinga Weekend Escapade (2N/3D)', 'Silaikul Summit Trek & Camping (1N/2D)', 'Umrangso Lake & Golf View Tour (2N/3D)', 'Complete Dimasa Heritage Trail (4N/5D)'],
      actionText: 'Inquire Packages'
    },
    food: {
      title: 'Authentic Dimasa Cuisine',
      desc: 'Savor traditional ethnic delicacies prepared with organic local herbs.',
      items: ['Judima (Traditional Dimasa Rice Wine - GI Tagged)', 'Muri (Smoked Meat in Bamboo)', 'Mai-ju (Sticky Rice in Leaves)', 'Khar & Dry Fish with Bamboo Shoot'],
      actionText: 'View Food Spots'
    },
    emergency: {
      title: 'Emergency Help & SOS',
      desc: 'Direct emergency hotlines for visitors in Dima Hasao district.',
      items: ['Police Control Room: 112 / 03673-236224', 'Haflong Civil Hospital: 03673-236222', 'Tourist Police Helpline: +91 94350 99999', 'Disaster Management: 1077'],
      actionText: 'Call Emergency: 112',
      actionLink: 'tel:112',
      isEmergency: true
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100/90 py-1.5 px-2 mx-2.5" data-purpose="quick-links">
        <div className="grid grid-cols-5 gap-1">
          {links.map((item, index) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (item.id === 'events') {
                  navigate('/festivals');
                } else if (item.id === 'packages') {
                  navigate('/packages');
                } else if (item.id === 'food') {
                  navigate('/food');
                } else {
                  setActiveModal(item.id);
                }
              }}
              className={`flex flex-col items-center justify-center p-0.5 hover:bg-gray-50/80 rounded-xl transition-colors cursor-pointer ${
                index > 0 ? 'border-l border-gray-100 pl-1' : ''
              }`}
            >
              <div className={`w-7 h-7 rounded-full ${item.bg} flex items-center justify-center ${item.color} shadow-xs`}>
                <i className={`${item.icon} text-[11px]`}></i>
              </div>
              <span className="text-[7.5px] font-semibold text-center leading-tight text-gray-800 whitespace-pre-line mt-0.5">
                {item.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Modal Dialog for Quick Links */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-white rounded-3xl p-5 shadow-2xl z-10 w-full max-w-sm border border-emerald-100 relative"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>

              <h3 className="font-bold text-base text-gray-900 mb-1">
                {modalDetails[activeModal]?.title}
              </h3>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                {modalDetails[activeModal]?.desc}
              </p>

              <div className="space-y-1.5 mb-4 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/60">
                {modalDetails[activeModal]?.items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-800">
                    <i className="fa-solid fa-circle-check text-emerald-600 text-xs shrink-0"></i>
                    <span>{it}</span>
                  </div>
                ))}
              </div>

              {modalDetails[activeModal]?.actionLink ? (
                <a
                  href={modalDetails[activeModal]?.actionLink}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-white ${
                    modalDetails[activeModal]?.isEmergency ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0a3a22] hover:bg-emerald-800'
                  } transition-colors shadow-md`}
                >
                  <i className="fa-solid fa-phone"></i>
                  <span>{modalDetails[activeModal]?.actionText}</span>
                </a>
              ) : (
                <button
                  onClick={() => {
                    const modalId = activeModal;
                    setActiveModal(null);
                    if (modalId === 'events') {
                      navigate('/festivals');
                    } else if (modalId === 'food') {
                      navigate('/food');
                    } else if (modalId === 'packages') {
                      navigate('/packages');
                    } else {
                      showToast(`Opening ${modalDetails[modalId]?.title}`);
                    }
                  }}
                  className="w-full py-2.5 bg-[#0a3a22] hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition-colors shadow-md cursor-pointer"
                >
                  {modalDetails[activeModal]?.actionText || 'Close'}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
