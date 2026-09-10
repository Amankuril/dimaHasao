import { useNavigate } from '../../router';
import { motion } from 'framer-motion';

export const PromoBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-auto mx-3 h-[120px] rounded-2xl overflow-hidden shadow-sm border border-orange-200/40" data-purpose="promo-banner">
      {/* Background Mountain Photo */}
      <img
        alt="Discover Dima Hasao"
        className="w-full h-full object-cover"
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAu4pmPYVoooGutS4BGHL_h3AM91HWpb0p3I7_YN0nNkKK4xpIAkqN1ItQCz_Nsd7DbcowZqup9rTFIBowf5I0Jrs-It5TrdAccxzvRgaSof8HlnftQt9lj9LGKzYmk8zjtnKHKT-LCqDhuT2NBwxGfEZNfaUZp_KgB0pmGPOfzFx8k8fbx2PpkAiM0dtzfVKXnMWQIZep3NYZwMvUPV44vu4xjr9xNtuKhBw0r9VIi49A_dvZwhxmZ"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none"></div>

      {/* Left Typography & CTA */}
      <div className="absolute inset-y-0 left-0 p-3.5 flex flex-col justify-center w-3/5 z-10">
        <h3 className="text-white font-extrabold text-xs sm:text-sm leading-tight mb-2 drop-shadow-sm tracking-tight">
          DISCOVER THE<br />
          UNTOLD BEAUTY OF<br />
          <span className="text-amber-300">DIMA HASAO</span>
        </h3>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/places')}
          className="bg-[#084524] hover:bg-emerald-800 text-white text-[9px] font-bold py-1 px-3 rounded-full w-max flex items-center gap-1.5 shadow-md cursor-pointer border border-white/30"
        >
          <span>Plan Your Trip Now</span>
          <i className="fa-solid fa-arrow-right text-[7px]"></i>
        </motion.button>
      </div>

      {/* Decorative Circular Badges Overlapping on Right */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex -space-x-3 z-10 pointer-events-none">
        <div className="w-13 h-13 rounded-full border-2 border-white overflow-hidden shadow-md bg-white">
          <img
            alt="Waterfall"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC108lv_9CPfPNfOkpM5KYz_jfhw2KCYt07kDJO9hCc10qB8K4CBw33m0IYPeNQp067svXvaaUtgtWZqsYNJX2EAt0QmvJIrjhL-ek6hQlVyILxypz9DxpkYZUumfsQMkY9TWApYr6ljP1g1FD2-CREC2OFa-1Q7g8GMGvFRY5I0cwKk-ub1VaVmee3OD_xH8c37DZ2Nt0devqWwyGVP9W7rdSHzCWljEvJqszVnA4BfYJ9EBfstS3E"
          />
        </div>
        <div className="w-15 h-15 rounded-full border-2 border-white overflow-hidden shadow-lg z-10 bg-white">
          <img
            alt="Traditional Hut"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9OVQT2F4U3UCbj1R36Pf9RoO55plzYwcyG7CbP8Pl9iwOPzyhTlzMp8FofrKumbS1VqHdYenAWx-npU_pwVpwTPNlca73avPjigjhR4r1tHscXDy72auwr0VaOmDGW5r_M2rqUnfjQ-hVOtnQtR7WqQcDb_i7XYepyjk_hCJ6TytSEwLQxdaTjeLgQjN8z-X2IXY70QjQ3MDgvef0H90p4_nYvpLouewqmyA9YgX1M7HzBLAMoAxq"
          />
        </div>
      </div>
    </div>
  );
};
