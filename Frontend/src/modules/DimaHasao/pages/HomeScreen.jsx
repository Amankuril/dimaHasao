import { useState, useEffect } from 'react';
import { useNavigate, useHostNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { SearchBar } from '../components/common/SearchBar';
import { CategoryCard } from '../components/home/CategoryCard';
import { QuickLinksGrid } from '../components/home/QuickLinksGrid';
import { PromoBanner } from '../components/home/PromoBanner';
import { WhyVisitGrid } from '../components/home/WhyVisitGrid';
import { motion, AnimatePresence } from 'framer-motion';
import { CONSUMER_BRAND_LOGO, logoFallback } from "@/shared/constants/brandLogo";

const HERO_SLIDES = [
  {
    id: 1,
    image: '/carousal-2.png',
    position: 'object-[center_35%]',
    alt: 'Dima Hasao Landmark Gate'
  },
  {
    id: 2,
    image: '/carousal-3.png',
    position: 'object-[center_35%]',
    alt: 'I Love Dima Hasao Mountain Viewpoint'
  }
];

export const HomeScreen = () => {
  const navigate = useNavigate();
  const hostNavigate = useHostNavigate();
  const { setIsNotificationsOpen } = useBooking();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="text-gray-800 pb-20 relative bg-[#FDFBF7] min-h-screen"
    >
      {/* BEGIN: Grand Header Section */}
      <header
        className="relative w-full h-[340px] sm:h-[360px] overflow-hidden rounded-b-3xl shadow-md"
        data-purpose="main-header"
      >
        {/* Landscape Carousel Images */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <AnimatePresence initial={false} mode="wait">
            <motion.img
              key={HERO_SLIDES[currentHeroIndex].id}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              alt={HERO_SLIDES[currentHeroIndex].alt}
              className={`w-full h-full object-cover ${HERO_SLIDES[currentHeroIndex].position} absolute inset-0`}
              src={HERO_SLIDES[currentHeroIndex].image}
            />
          </AnimatePresence>
          {/* Subtle top/bottom contrast gradient without obstructing the image */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30 pointer-events-none z-1" />

          {/* Carousel Indicator Dots */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-1.5 z-20 pointer-events-auto">
            {HERO_SLIDES.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentHeroIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  index === currentHeroIndex
                    ? 'w-6 bg-amber-400 shadow-sm'
                    : 'w-1.5 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Top Bar Navigation Icons */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center z-20">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/more')}
            aria-label="Open Navigation Menu"
            className="w-9 h-9 bg-[#06381e]/90 text-white rounded-full flex items-center justify-center shadow-lg border border-white/30 backdrop-blur-md hover:bg-[#094c2a] transition-all cursor-pointer"
          >
            <i className="fa-solid fa-bars text-sm"></i>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsNotificationsOpen(true)}
            aria-label="View Notifications"
            className="w-9 h-9 bg-[#06381e]/90 text-white rounded-full flex items-center justify-center shadow-lg border border-white/30 backdrop-blur-md relative hover:bg-[#094c2a] transition-all cursor-pointer"
          >
            <i className="fa-solid fa-bell text-sm"></i>
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          </motion.button>
        </div>

        {/* Main Header Typography & Logo Layout */}
        <div className="absolute top-4 sm:top-5 left-3.5 right-3.5 z-10 flex items-center justify-center gap-3">
          {/* Transparent Circular Tourism Emblem */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] shrink-0 drop-shadow-[0_4px_16px_rgba(0,0,0,0.55)] cursor-pointer"
            onClick={() => navigate('/places')}
          >
            <img
              alt="Dima Hasao Tourism Logo"
              className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
              src={CONSUMER_BRAND_LOGO}
              onError={logoFallback}
            />
          </motion.div>

          {/* Festive Typography Banner */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex flex-col text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          >
            {/* JUTHAI! */}
            <div className="flex items-center font-black text-2xl sm:text-[26px] tracking-wide leading-none select-none">
              <span className="text-[#ff4d4d]">J</span>
              <span className="text-[#ffcc00]">U</span>
              <span className="text-[#33cc66]">T</span>
              <span className="text-[#3399ff]">H</span>
              <span className="text-[#9966ff]">A</span>
              <span className="text-[#cc66ff]">I</span>
              <span className="text-[#ff3399]">!</span>
            </div>

            {/* WELCOME TO */}
            <div className="flex items-center gap-1.5 my-0.5">
              <div className="h-[1.5px] bg-amber-400 w-5"></div>
              <p className="text-[9px] sm:text-[9.5px] font-black tracking-widest text-amber-200 uppercase font-cinzel">
                WELCOME TO
              </p>
              <div className="h-[1.5px] bg-amber-400 w-5"></div>
            </div>

            {/* DIMA HASAO */}
            <h1 className="font-montserrat text-2xl sm:text-[25px] font-black text-white leading-none tracking-tight">
              DIMA HASAO
            </h1>

            {/* Subtitle */}
            <p className="text-amber-100 font-serif font-semibold italic text-[11px] sm:text-xs mt-0.5">
              Explore • Experience • Discover
            </p>
          </motion.div>
        </div>
      </header>
      {/* END: Header Section */}

      {/* BEGIN: Search Bar (Overlapping) */}
      <SearchBar />
      {/* END: Search Bar */}

      {/* BEGIN: Main Content Area */}
      <main className="space-y-4 pt-3" data-purpose="main-content">
        {/* Primary 4 Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-3" data-purpose="primary-categories">
          {/* Swapped back with the quick-link row on 2026-09-24: the district's
              places are what a visitor comes looking for first, so they take
              the prime slot and packages move to the quick links. */}
          <CategoryCard
            title="TOURIST PLACES"
            subtitle={`Scenic Spots &\nHidden Trails`}
            icon="fa-solid fa-location-dot"
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDNCBOtk-v5CpAuzZ1kd7mndMkJZKKwMy00a2zicQ0HpEEfpw427eAibYCSi2nD2wHFUkrbD1pzwIzejGOFn5WqC6zu_oE1z2PO5Z2B1LMuzEvrGDcapXZ2xU8jST_VXGR9TxKd25HsrNfffLqEY_Xm1289lDT9d4F7I68sPPhKOmC33cLzcrcIo7RfCXTsf-KCLrE92u-ebldONSuUSfat64_5N4AFn8Z0bfjeYXSmC8Y2I5u8t3g1"
            buttonText="Explore Places"
            buttonBg="bg-[#044e29]"
            gradientClass="bg-gradient-to-b from-[#10b981] via-[#059669] to-[#044e29]"
            topOverlayColor="from-[#059669]"
            onClick={() => navigate('/places')}
          />

          <CategoryCard
            title="TAXI / AUTO"
            subtitle={`Book Your Ride,\nTravel with Ease`}
            icon="fa-solid fa-car"
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDCJDblprWgYBvh1_FLMSBqIvOXSdwgS_fPcH_MyWvag50_LwhLZums5qzaDWSIT0HbG0SJMToG7JpPvejlX3Qy5bLkCG38QZIqu5mBcSGP2wl3HGzM_X0PCK0xdHmNkET-dGu7TRc-monu00rabiXzQRo3EhbHNOkDMNkXrPK1awEDEd4ZGfwJUS4cVNDcKYVkqKl3pjgKMkPrLtYQA-IL07hjQc-c-KZlD6NT-lo8WH27nCiKI8JN"
            buttonText="Book Ride"
            buttonBg="bg-[#ea580c]"
            gradientClass="bg-gradient-to-b from-[#f59e0b] via-[#ea580c] to-[#c2410c]"
            topOverlayColor="from-[#ea580c]"
            onClick={() => hostNavigate('/taxi/user')}
          />

          <CategoryCard
            title="HOTELS & STAYS"
            subtitle={`Resorts, Cottages\n& Homestays`}
            icon="fa-solid fa-hotel"
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDu5Pbf3ToUuNDG3Ykr_oqb6a2-hh7vSE60pCjbagFjqrigh7ETKBYtUYP7bOC8sCPqF0oHQXdi1TbZ6LCZblOychxaZYt5SDhg9YBw8bMVPI1wmeURSYs_MNOhhGyoCRPAC9-VGTQdSfd8KZYlU0HzlecyFoFwn74vcZ8e1vWAXxYQSCHsoElObyZAiJJcMFxfV2a_b6cT4dn9fzfOO2k4ySEorPC6hLD-PnNLxB8w9sDFxhc1j9FU"
            buttonText="Book Stays"
            buttonBg="bg-[#6d28d9]"
            gradientClass="bg-gradient-to-b from-[#8b5cf6] via-[#6d28d9] to-[#4c1d95]"
            topOverlayColor="from-[#6d28d9]"
            onClick={() => navigate('/hotels')}
          />

          <CategoryCard
            title="FOOD & DINING"
            subtitle={`Authentic Dimasa\n& Local Eateries`}
            icon="fa-solid fa-utensils"
            image="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
            buttonText="Order Food"
            buttonBg="bg-[#be123c]"
            gradientClass="bg-gradient-to-b from-[#f43f5e] via-[#e11d48] to-[#9f1239]"
            topOverlayColor="from-[#e11d48]"
            onClick={() => hostNavigate('/food/user')}
          />
        </div>

        {/* Quick Links */}
        <QuickLinksGrid />

        {/* Falcon Festival Official Banner Card */}
        <div className="px-3">
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/festivals')}
            className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer border border-[#caa83e]/50 bg-black group"
          >
            <img
              src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80"
              alt="Falcon Festival"
              className="w-full h-36 object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />

            <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <span className="bg-red-600 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                  Official Gala
                </span>
                <span className="text-[10px] text-amber-300 font-bold">Nov 14 - 17, 2026</span>
              </div>

              <div>
                <h3 className="font-montserrat font-bold text-sm text-white">
                  Falcon Festival Umrangso 2026
                </h3>
                <p className="text-[10.5px] text-gray-200">
                  Live concerts, lake kayaking & Amur Falcon trails.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold text-amber-400">Passes from ₹250</span>
                <span className="bg-amber-400 text-emerald-950 font-black text-[10px] px-3 py-1 rounded-lg">
                  Book Passes →
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Curated Tour & Trekking Packages Banner */}
        <div className="px-3">
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/packages')}
            className="relative rounded-2xl overflow-hidden shadow-xs cursor-pointer border border-[#E5DDC3] bg-gradient-to-r from-[#06381e] to-[#0a4d2b] p-3.5 text-white flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                Curated Expeditions
              </span>
              <h4 className="font-montserrat font-bold text-sm text-white">
                Guided Treks & Heritage Tours
              </h4>
              <p className="text-[11px] text-emerald-100">
                All-inclusive private packages from ₹3,600/person
              </p>
            </div>

            <div className="w-10 h-10 rounded-full bg-amber-400 text-[#06381e] flex items-center justify-center font-bold shrink-0 shadow-md">
              <i className="fa-solid fa-arrow-right text-sm"></i>
            </div>
          </motion.div>
        </div>

        {/* Promotional Banner */}
        <PromoBanner />

        {/* Why Visit Section */}
        <WhyVisitGrid />
      </main>
      {/* END: Main Content Area */}
    </motion.div>
  );
};

