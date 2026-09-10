import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const SplashScreen = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress bar animation from 0 to 100% over 2 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (onFinish) onFinish();
          }, 300);
          return 100;
        }
        return prev + 5;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] w-full h-full bg-gradient-to-b from-[#04170d] via-[#072f1a] to-[#03130a] text-white flex flex-col justify-between items-center p-6 select-none overflow-hidden"
    >
      {/* Background Decorative Traditional Radial Glow */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 40%, rgba(212, 175, 55, 0.4) 0%, rgba(10, 58, 34, 0.2) 50%, transparent 80%)',
          backgroundSize: '100% 100%'
        }}
      />

      {/* Subtle Ethnic Geometric Pattern Layer */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #d4af37 0, #d4af37 1px, transparent 0, transparent 20px)'
        }}
      />

      {/* Top Leaf Accent */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="pt-6 flex items-center gap-2 z-10"
      >
        <i className="fa-solid fa-leaf text-amber-400 text-xs"></i>
        <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-amber-300/90 font-cinzel">
          Govt. of Assam Tourism
        </span>
        <i className="fa-solid fa-leaf text-amber-400 text-xs"></i>
      </motion.div>

      {/* Center Hero Logo & Typography */}
      <div className="flex flex-col items-center text-center z-10 my-auto">
        {/* Animated Emblem with Golden Aura */}
        <div className="relative mb-6">
          {/* Pulsing Aura Rings */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute -inset-3 rounded-full bg-gradient-to-r from-amber-400/30 to-emerald-400/20 blur-md pointer-events-none"
          />

          {/* Seal Logo */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              duration: 0.8
            }}
            className="w-32 h-32 sm:w-36 sm:h-36 drop-shadow-[0_0_35px_rgba(212,175,55,0.4)] relative z-10 flex items-center justify-center"
          >
            <img
              alt="Dima Hasao Tourism Emblem"
              className="w-full h-full object-contain"
              src="/logo.png"
            />
          </motion.div>
        </div>

        {/* Festive JUTHAI Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex items-center justify-center font-black text-3xl sm:text-4xl tracking-widest leading-none mb-1 drop-shadow-md"
        >
          <span className="text-[#ff4d4d]">J</span>
          <span className="text-[#ffcc00]">U</span>
          <span className="text-[#33cc66]">T</span>
          <span className="text-[#3399ff]">H</span>
          <span className="text-[#9966ff]">A</span>
          <span className="text-[#cc66ff]">I</span>
          <span className="text-[#ff3399]">!</span>
        </motion.div>

        {/* WELCOME TO */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex items-center justify-center gap-2 my-1.5"
        >
          <div className="h-[1px] bg-amber-400/60 w-8"></div>
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-200/90">
            Welcome To
          </span>
          <div className="h-[1px] bg-amber-400/60 w-8"></div>
        </motion.div>

        {/* Main Title: DIMA HASAO */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="font-montserrat font-black text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#ffd97d] via-[#ffffff] to-[#ffd97d] tracking-wider leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
        >
          DIMA HASAO
        </motion.h1>

        {/* Slogan */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="font-playfair italic font-medium text-xs text-amber-200/80 mt-1 tracking-wide"
        >
          Explore • Experience • Discover
        </motion.p>
      </div>

      {/* Bottom Progress Bar & Skip Option */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="w-full max-w-xs flex flex-col items-center gap-3 z-10 pb-4"
      >
        {/* Dimasa Pattern Line */}
        <div className="w-48 h-1 pattern-border rounded-full opacity-80 mb-1" />

        {/* Sleek Progress Bar */}
        <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden backdrop-blur-xs p-[1px] border border-amber-400/20">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut' }}
          />
        </div>

        {/* Status text with Skip option */}
        <div className="w-full flex justify-between items-center text-[10px] text-amber-200/70 font-medium px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Loading scenic hills...
          </span>

          <button
            onClick={() => onFinish && onFinish()}
            className="text-amber-400 hover:text-amber-200 font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Skip →
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
