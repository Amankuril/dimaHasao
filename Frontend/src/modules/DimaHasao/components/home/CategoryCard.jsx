import { motion } from 'framer-motion';

export const CategoryCard = ({
  title,
  subtitle,
  icon,
  image,
  buttonText,
  buttonBg = 'bg-[#044e29]',
  gradientClass = 'bg-gradient-to-b from-[#10b981] via-[#059669] to-[#044e29]',
  topOverlayColor = 'from-[#059669]',
  onClick
}) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={onClick}
      className={`group min-w-0 h-[248px] rounded-[22px] overflow-hidden relative shadow-md hover:shadow-xl cursor-pointer select-none ${gradientClass} flex flex-col justify-between transition-shadow duration-300 border border-white/20`}
    >
      {/* Top Header Content */}
      <div className="relative z-10 flex flex-col items-center text-center pt-3.5 px-1.5">
        <motion.div
          whileHover={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.4 }}
          className="w-9 h-9 rounded-full border-2 border-white/90 flex items-center justify-center mb-1.5 bg-white/20 backdrop-blur-sm shadow-xs group-hover:scale-105 transition-transform"
        >
          <i className={`${icon} text-white text-sm drop-shadow-xs`}></i>
        </motion.div>
        <h3 className="text-white font-extrabold text-[11px] leading-tight tracking-tight uppercase drop-shadow-xs font-montserrat">
          {title}
        </h3>
        <p className="text-white/90 text-[8.5px] leading-tight mt-0.5 whitespace-pre-line px-0.5 font-medium text-center drop-shadow-xs">
          {subtitle}
        </p>
      </div>

      {/* Middle Arched Image */}
      <div className="absolute inset-x-0 bottom-0 top-[34%] z-0 rounded-t-[36px] overflow-hidden">
        <img
          alt={title}
          src={image}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          style={{
            maskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 8%, black 22%, black 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 8%, black 22%, black 100%)'
          }}
        />

        {/* Top color feathering overlay */}
        <div
          className={`absolute top-0 inset-x-0 h-16 bg-gradient-to-b ${topOverlayColor} via-${topOverlayColor.replace('from-', '')}/40 to-transparent pointer-events-none opacity-90`}
        />

        {/* Bottom vignette */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Bottom Button Container */}
      <div className="relative z-10 px-2.5 pb-3">
        <div
          className={`w-full ${buttonBg} text-white rounded-full py-1.5 text-[9px] font-bold flex items-center justify-center gap-1 shadow-md transition-all group-hover:brightness-110 border border-white/25`}
        >
          <span>{buttonText}</span>
          <i className="fa-solid fa-arrow-right text-[7.5px] group-hover:translate-x-0.5 transition-transform"></i>
        </div>
      </div>
    </motion.div>
  );
};

